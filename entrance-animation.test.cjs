const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, 'dist', file), 'utf8');

function environment()
{
    let now = 0, sequence = 0, fontsLoaded;
    const jobs = new Map();
    const schedule = (callback, delay) => { const id = ++sequence; jobs.set(id, { callback, at: now + delay }); return id; };
    const events = () => ({
        listeners: new Map(),
        addEventListener(type, callback) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(callback); },
        removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); },
        dispatch(type) { for (const callback of [...(this.listeners.get(type) || [])]) callback(); }
    });
    const classes = new Set(['entrance-pending']);
    const root = { classList: { add: (...names) => names.forEach(name => classes.add(name)),
        remove: (...names) => names.forEach(name => classes.delete(name)), contains: name => classes.has(name) } };
    const canvasContext = { clearRect() {} };
    const element = () => ({ style: { removeProperty(property) { delete this[property]; } }, dataset: {},
        children: [], append(child) { this.children.push(child); }, setAttribute() {}, getContext: () => canvasContext,
        remove() { this.removed = true; } });
    const selectors = new Map(['#imprint', '.imprint-content', '.imprint-art', 'h1', '.eyebrow', '.imprint-copy p'].map(key => [key, element()]));
    const copy = { inert: false };
    selectors.get('h1').parentElement = copy;
    const links = [element(), element(), element()], life = [element(), element()];
    const document = Object.assign(events(), {
        documentElement: root, readyState: 'loading', hidden: false,
        fonts: { ready: new Promise(resolve => { fontsLoaded = resolve; }) },
        querySelector(selector) { assert.ok(selectors.has(selector), `Unexpected production selector: ${selector}`); return selectors.get(selector); },
        querySelectorAll(selector) { if (selector === '.social-links a') return links; if (selector === '.life-divider') return life; throw Error(`Unexpected selector: ${selector}`); },
        createElement: element
    });
    const window = events();
    const reducedMotion = Object.assign(events(), { matches: false });
    const artwork = { canvas: element(), geometry: { result: null }, drawnResult: null, name: { atlas: null, motion: { settle() {} }, render() {} } };
    const context = vm.createContext({ document, window, reducedMotion, artwork, paused: false, animationFrame: 0,
        requestAnimationFrame: callback => schedule(() => callback(now), 16), cancelAnimationFrame: id => jobs.delete(id),
        setTimeout: schedule, clearTimeout: id => jobs.delete(id), console: { warn() {} },
        startAnimation() { context.restarts = (context.restarts || 0) + 1; }
    });
    vm.runInContext(read('entrance-motion.js') + '\n' + read('entrance-animation.js') + '\nthis.Controller = EntranceAnimation;', context);
    async function advance(milliseconds)
    {
        const target = now + milliseconds;
        for (let q = 0; q < 8; q++) await Promise.resolve();
        while (true)
        {
            const pending = [...jobs].sort((a, b) => a[1].at - b[1].at)[0];
            if (!pending || pending[1].at > target) break;
            now = pending[1].at;
            jobs.delete(pending[0]);
            pending[1].callback();
            for (let q = 0; q < 8; q++) await Promise.resolve();
        }
        now = target;
    }
    function ready()
    {
        document.readyState = 'complete';
        fontsLoaded();
        artwork.drawnResult = artwork.geometry.result = {};
        artwork.name.atlas = {};
    }
    function scene()
    {
        const animation = new context.Controller();
        // Layout and canvas drawing are covered in the browser. Exercise the actual lifecycle here.
        animation.measure = () => {};
        animation.hybridTrace = () => {};
        return animation;
    }
    return { context, document, window, reducedMotion, artwork, copy, classes, jobs, fontsLoaded, ready, advance, scene, selectors };
}

(async () => {
    const waiting = environment();
    let prepared = false;
    const ready = waiting.context.Controller.ready().then(() => { prepared = true; });
    await waiting.advance(100);
    assert.equal(prepared, false, 'Do not begin before the document and fonts load.');
    waiting.document.readyState = 'complete';
    waiting.fontsLoaded();
    await waiting.advance(100);
    assert.equal(prepared, false, 'Do not begin without an atlas and the first painted geometry.');
    waiting.ready();
    waiting.artwork.drawnResult = {};
    await waiting.advance(100);
    assert.equal(prepared, false, 'A stale frame does not satisfy readiness.');
    waiting.artwork.drawnResult = waiting.artwork.geometry.result;
    await waiting.advance(60);
    await ready;
    assert.equal(prepared, true);
    assert.equal(waiting.jobs.size, 0, 'Preparation releases its poll and watchdog.');

    const scene = environment();
    scene.ready();
    const animation = scene.scene();
    const started = animation.start('hybridTrace');
    await scene.advance(80);
    await started;
    assert.equal(scene.context.paused, true, 'Freeze the original simulation during the entrance.');
    assert.equal(scene.copy.inert, true, 'Hidden links cannot receive keyboard focus.');
    assert.equal(scene.classes.has('entrance-running'), true);
    await scene.advance(600);
    scene.document.hidden = true;
    scene.document.dispatch('visibilitychange');
    const pausedTime = animation.time;
    await scene.advance(10000);
    assert.equal(animation.time, pausedTime, 'Background tabs do not advance the entrance.');
    assert.equal(scene.jobs.size, 0, 'Background tabs do not keep an entrance frame loop alive.');
    scene.document.hidden = false;
    scene.document.dispatch('visibilitychange');
    await scene.advance(3000);
    assert.equal(animation.time, 2850);
    assert.equal(scene.context.paused, false);
    assert.equal(scene.copy.inert, false);
    assert.equal(scene.classes.size, 0);
    assert.equal(scene.selectors.get('#imprint').dataset.entranceVariant, 'hybridTrace');
    assert.equal(scene.selectors.get('#imprint').dataset.entranceProgress, '100');
    for (const canvas of [animation.fx, animation.plot])
    {
        assert.equal(canvas.removed, true);
        assert.equal(canvas.width * canvas.height, 1, 'Release the temporary render buffers.');
    }
    assert.equal(scene.jobs.size, 0);
    assert.equal(scene.document.listeners.get('visibilitychange').size, 0);

    for (const interrupt of ['resize', 'reduced-motion', 'render-error'])
    {
        const fixture = environment();
        fixture.ready();
        const controller = fixture.scene();
        const start = controller.start('hybridTrace');
        await fixture.advance(80);
        await start;
        if (interrupt === 'resize') fixture.window.dispatch('resize');
        if (interrupt === 'reduced-motion') { fixture.reducedMotion.matches = true; fixture.reducedMotion.dispatch('change'); }
        if (interrupt === 'render-error') { controller.hybridTrace = () => { throw Error('Draw failed'); }; await fixture.advance(40); }
        assert.equal(fixture.classes.size, 0, `${interrupt} must reveal the card.`);
        assert.equal(fixture.copy.inert, false);
        assert.equal(controller.playing, false);
        assert.equal(controller.fx.removed, true);
        assert.equal(fixture.context.paused, interrupt === 'reduced-motion');
    }

    const failure = environment();
    vm.runInContext(read('entrance.js'), failure.context);
    await failure.advance(8100);
    assert.equal(failure.classes.size, 0, 'A preparation failure must leave the production card visible.');
    assert.equal(failure.jobs.size, 0);

    const reduced = environment();
    reduced.classes.clear();
    vm.runInContext(read('entrance.js'), reduced.context);
    assert.equal(reduced.jobs.size, 0, 'A reduced-motion visit skips preparation and entrance allocation.');

    const html = read('index.html');
    assert.equal(html.includes('entrance-controls'), false);
    assert.equal(html.includes('entrance-lab.js'), false);
    assert.equal(/<html[^>]*entrance-pending/.test(html), false, 'Without JavaScript, the page is visible immediately.');
    console.log('Entrance lifecycle passed: readiness, stale-frame rejection, hidden-tab resume, completion cleanup, resize, reduced motion, rendering failure and timeout fallback.');
})().catch(error => { console.error(error); process.exitCode = 1; });
