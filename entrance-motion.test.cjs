const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Motion = new Function(fs.readFileSync(path.join(__dirname, 'dist/entrance-motion.js'), 'utf8') + '\nreturn EntranceMotion;')();

assert.deepEqual(Object.keys(Motion.variants), ['impulse', 'gravity', 'plotter', 'split', 'hybrid']);
for (const variant of Object.values(Motion.variants)) assert.ok(variant.duration > 1500 && variant.duration < 3000);
assert.equal(Motion.progress(-100, 0, 100), 0);
assert.equal(Motion.progress(200, 0, 100), 1);

let cases = 0;
for (const width of [320, 390, 768, 1280, 5120])
    for (let index = 0; index < 100; index++)
    {
        const center = { x: width / 2, y: 280 };
        const particle = { targetX: width * index / 100, targetY: 200 + index };
        for (const time of [-1, 0, 100, 600, 870, 2100])
        {
            const pose = Motion.particle(time, index, particle, center, Math.min(260, width * .32));
            for (const value of Object.values(pose)) assert.ok(Number.isFinite(value));
            assert.ok(pose.opacity >= 0 && pose.opacity <= 1);
            assert.ok(pose.scale > 0);
            if (time >= 870)
            {
                assert.ok(Math.abs(pose.x - particle.targetX) < 1e-8);
                assert.ok(Math.abs(pose.y - particle.targetY) < 1e-8);
                assert.ok(Math.abs(pose.angle) < 1e-8);
                assert.equal(pose.scale, 1);
                assert.equal(pose.opacity, 1);
            }
            cases++;
        }
        for (const progress of [0, .2, .5, .8, 1])
        {
            const pose = Motion.flight(progress, center, { x: width * .2, y: 460 }, width * .1);
            for (const value of Object.values(pose)) assert.ok(Number.isFinite(value));
            assert.ok(pose.opacity >= 0 && pose.opacity <= 1);
            if (progress === 0) assert.equal(pose.opacity, 0);
            if (progress === 1)
            {
                assert.ok(Math.abs(pose.x) < 1e-8 && Math.abs(pose.y) < 1e-8 && Math.abs(pose.rotation) < 1e-8);
                assert.equal(pose.scale, 1);
                assert.equal(pose.opacity, 1);
            }
        }
    }
console.log(`${cases} entrance particle cases passed: finite poses, bounded opacity, exact assembly and settled text positions across mobile and zoomed viewports.`);
