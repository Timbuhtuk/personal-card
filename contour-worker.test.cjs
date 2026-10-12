const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Worker } = require('node:worker_threads');
const { once } = require('node:events');

const read = name => fs.readFileSync(path.join(__dirname, 'dist', name), 'utf8');
const source = read('contour-field.js') + '\n' + read('contour-scheduler.js');
const { ContourField, ContourScheduler, packContourFrames } = new Function(source +
    '\nreturn { ContourField, ContourScheduler, packContourFrames };')();

function random(seed)
{
    return () => {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
        value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
        return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
}

function fakeWorker()
{
    return { messages: [], postMessage(value) { this.messages.push(structuredClone(value)); },
        terminate() { this.terminated = true; },
        reply(message, result = { frames: [], coordinates: new Float32Array() })
        { this.onmessage({ data: { id: message.id, version: message.version, result, elapsed: 1 } }); } };
}

function config(field)
{
    return { width: field.width, height: field.height, lineSpacing: field.lineSpacing,
        figures: field.figures.map(figure => ({ ...figure })) };
}

function sameGeometry(actual, expected)
{
    assert.deepEqual(actual.frames, expected.frames);
    assert.equal(actual.coordinates.length, expected.coordinates.length);
    for (let q = 0; q < actual.coordinates.length; q++)
        assert.equal(actual.coordinates[q], expected.coordinates[q]);
}

async function main()
{
    const field = new ContourField(1910, 774, random(2));
    const worker = fakeWorker();
    const paints = [];
    const scheduler = new ContourScheduler(field, result => paints.push(result), null, () => worker);
    scheduler.request(0);
    const stale = worker.messages[0];
    scheduler.request(500);
    assert.equal(worker.messages.length, 1, 'At most one mesh can be in flight.');
    scheduler.resize(879, 756);
    scheduler.resize(390, 748);
    scheduler.request(520);
    worker.reply(stale);
    assert.equal(paints.length, 0, 'A result from before a resize must not be painted.');
    assert.equal(worker.messages.length, 2, 'The newest size must be requested even while paused.');
    const current = worker.messages[1];
    assert.deepEqual(current.config, config(field));
    assert.equal(current.time, 520);
    worker.reply(stale);
    assert.equal(scheduler.pending.id, current.id, 'A duplicate old reply cannot clear the current request.');
    worker.reply(current);
    assert.equal(paints.length, 1);
    assert.equal(scheduler.pending, null);

    const cadenceWorker = fakeWorker();
    const cadence = new ContourScheduler(new ContourField(390, 748, random(2)), () => {}, null, () => cadenceWorker);
    for (let q = 0; q <= 120; q++)
    {
        cadence.request(q * 1000 / 60);
        if (cadence.pending) cadenceWorker.reply(cadence.pending);
    }
    assert.ok(cadenceWorker.messages.length >= 15 && cadenceWorker.messages.length <= 17,
        'Two seconds at 60 fps must produce only about 16 new meshes.');
    assert.equal(cadenceWorker.messages.filter(message => message.config).length, 1);

    const fallbackField = new ContourField(390, 748, random(2));
    let fallbackPaints = 0;
    const fallback = new ContourScheduler(fallbackField, () => fallbackPaints++, null,
        () => { throw Error('Worker unavailable'); });
    fallback.request(0);
    fallback.request(119);
    assert.equal(fallbackPaints, 1);
    fallback.request(120);
    assert.equal(fallbackPaints, 2);
    const expectedFallback = new ContourField(390, 748, random(2));
    expectedFallback.buildMesh(120);
    sameGeometry(fallback.result, packContourFrames(expectedFallback.frames));

    const broken = fakeWorker();
    const recoveringField = new ContourField(390, 748, random(2));
    const recovering = new ContourScheduler(recoveringField, () => {}, null, () => broken);
    recovering.request(0);
    recovering.resize(320, 460);
    recovering.request(600);
    broken.onerror();
    assert.equal(broken.terminated, true);
    assert.equal(recovering.worker, null);
    recoveringField.buildMesh(600);
    sameGeometry(recovering.result, packContourFrames(recoveringField.frames));

    const sendBroken = fakeWorker();
    sendBroken.postMessage = () => { throw Error('Posting failed'); };
    const postFallback = new ContourScheduler(new ContourField(320, 460, random(2)), () => {}, null, () => sendBroken);
    postFallback.request(0);
    assert.ok(postFallback.result.coordinates.length > 0);
    assert.equal(sendBroken.terminated, true);

    // Run the actual worker body on a real thread; adapt only the browser bootstrap.
    const workerSource = source + '\nlet onmessage;\n' + read('contour-worker.js').replace(/^importScripts[^\n]*\n/, '') + '\nreturn onmessage;';
    const real = new Worker(`
        const { parentPort } = require('node:worker_threads');
        const receive = new Function('performance', 'postMessage', ${JSON.stringify(workerSource)})(performance, (message, transfer) => {
            parentPort.postMessage(message, transfer);
            if (transfer && transfer[0].byteLength !== 0) throw Error('Coordinates were copied instead of transferred.');
        });
        parentPort.on('message', data => receive({ data }));
    `, { eval: true });
    try
    {
        let id = 0;
        for (const [width, height] of [[1910, 774], [390, 748]])
        {
            const reference = new ContourField(width, height, random(2));
            for (const time of [0, 5000, 45000])
            {
                const response = once(real, 'message', { signal: AbortSignal.timeout(5000) });
                real.postMessage({ id: ++id, version: width, time, config: time === 0 ? config(reference) : null });
                const [message] = await response;
                assert.equal(message.error, undefined);
                assert.equal(message.id, id);
                assert.equal(message.version, width);
                assert.ok(message.elapsed > 0);
                reference.buildMesh(time);
                sameGeometry(message.result, packContourFrames(reference.frames));
            }
        }
    }
    finally { await real.terminate(); }
    console.log('Worker checks passed: identical geometry, transferred coordinates, one in-flight request, resize races, 120 ms cadence and failure recovery.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
