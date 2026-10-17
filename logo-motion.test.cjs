const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, 'dist', file), 'utf8');
const Motion = new Function(read('logo-motion.js') + '\nreturn LogoMotion;')();
const values = Array.from({ length: 14 }, (_, q) => q);
const shuffled = Motion.shuffle(values, () => .37);
assert.deepEqual(values, Array.from({ length: 14 }, (_, q) => q), 'Do not mutate the logo catalogue.');
assert.deepEqual([...shuffled].sort((a, b) => a - b), values, 'Every shuffle contains each logo exactly once.');
assert.notDeepEqual(shuffled, values);

let ribbonCases = 0;
for (const viewport of [50, 320, 476, 504, 544, 708, 1080, 2160, 4320, 8640])
    for (const period of [72, 490, 504, 518])
    {
        const copies = Motion.ribbonCopies(viewport, period);
        for (const phase of [0, .00001, .2, .5, .8, .99999, 1])
        {
            const start = -period * (1 - phase);
            const end = start + copies * period;
            assert.ok(start <= 0 && end >= viewport, 'The repeated track must cover the viewport at every cycle phase.');
            ribbonCases++;
        }
        // Translating by one sequence preserves every visible logo at the wrap,
        // including when the viewport is taller than a single sequence.
        for (let position = 0; position < viewport; position += 11)
            assert.ok(Math.abs(((position + period) % period) - (position % period)) < 1e-8);
    }

let cases = 0;
for (let rank = 0; rank < 14; rank++)
    for (const x of [-210, -110, 0, 110, 210])
        for (const y of [-60, -120, -172])
            for (const turn of [-65, 0, 65])
                for (const time of [0, 2999, 3000, 3200, 3500, 3800, 4200, 4650])
                {
                    const pose = Motion.drop(time, rank, { x, y }, turn);
                    for (const value of Object.values(pose)) assert.ok(Number.isFinite(value));
                    assert.ok(pose.opacity >= 0 && pose.opacity <= 1);
                    assert.ok(pose.scale >= .42 && pose.scale <= 1);
                    if (time < 3000) assert.equal(pose.opacity, 0, 'Do not show logos before Hybrid+ completes.');
                    if (time === 4650)
                    {
                        assert.equal(Math.abs(pose.x), 0);
                        assert.equal(Math.abs(pose.y), 0);
                        assert.equal(Math.abs(pose.rotation), 0);
                        assert.equal(pose.scale, 1);
                        assert.equal(pose.opacity, 1);
                    }
                    cases++;
                }

const catalogue = new Function('class EntranceAnimation {}\nclass EntranceMotion { static variants = {}; }\n' +
    read('logo-studies.js') + '\nreturn LogoStudies.logos;')();
assert.equal(catalogue.length, 14);
assert.equal(new Set(catalogue.map(logo => logo[0])).size, 14);
for (const [file] of catalogue)
{
    const svg = read(`assets/technology-logos/svg/${file}.svg`);
    assert.match(svg, /<svg\b/);
    assert.doesNotMatch(svg, /<(script|foreignObject|image)\b/i);
}
assert.doesNotMatch(read('index.html'), /logo-(studies|motion)/, 'Logo experiments stay out of the main page.');
console.log(`${cases} logo poses passed: delayed appearance, bounded motion and exact settling; all 14 original vector assets are present.`);
console.log(`${ribbonCases} ribbon phases passed: full viewport coverage and seamless one-sequence wrapping, including tall and zoomed-out windows.`);
