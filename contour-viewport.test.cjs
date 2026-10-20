const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, 'dist', name), 'utf8');
const viewport = new Function(read('contour-viewport.js') + '\nreturn contourViewport;')();
const Field = new Function(read('contour-field.js') + '\nreturn ContourField;')();

function random(seed)
{
    return () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296);
}

let cases = 0;
for (const [width, height] of [[390, 748], [1280, 592], [1920, 952], [3840, 2032], [7680, 4192]])
    for (const density of [1, 1.25, 1.5, 2, 3])
        for (const zoom of [.25, .33, .5, .67, 1, 1.25, 2, 4])
        {
            const result = viewport(width / zoom, height / zoom, density * zoom);
            assert.ok(result.width > 0 && result.width <= 1920 + 1e-6);
            assert.ok(result.height > 0 && result.height <= 1080 + 1e-6);
            assert.ok(result.pixelWidth > 0 && result.pixelWidth <= 4096);
            assert.ok(result.pixelHeight > 0 && result.pixelHeight <= 4096);
            assert.ok(result.pixelWidth * result.pixelHeight <= 8000000);
            assert.ok(Math.abs(result.width / result.height - width / height) < 1e-6,
                'The scene must preserve its aspect ratio.');
            cases++;
        }

const standard = viewport(1280, 592, 1);
assert.deepEqual(standard, { width: 1280, height: 592, pixelWidth: 1920, pixelHeight: 888 });
for (const zoom of [.25, .5, .8])
    assert.deepEqual(viewport(1280 / zoom, 592 / zoom, zoom), standard,
        'Zooming out must preserve the scene, line spacing and supersampling on a standard display.');

const field = new Field(standard.width, standard.height, random(7319));
const original = field.build(0);
for (const zoom of [.25, .5, .25, 1])
{
    const next = viewport(1280 / zoom, 592 / zoom, zoom);
    field.resize(next.width, next.height);
    assert.deepEqual(field.build(0), original, 'Zooming out and back must preserve figure geometry.');
}

// A large figure used to stop after 15 levels, leaving its center empty.
const large = new Field(1920, 1080, random(7319));
large.figures = [large.create(960, 540, .75, .8)];
const frame = large.build(0)[0];
assert.ok(frame.paths.length > 15);
const innermost = frame.paths.reduce((best, contour) => !best || contour.level > best.level ? contour : best, null);
assert.ok(innermost.closed, 'Contours must continue into a closed center on a large scene.');
const innerBounds = frame.paths.filter(contour => contour.closed && contour.level === innermost.level).map(contour => {
    const xs = contour.points.map(point => point.x), ys = contour.points.map(point => point.y);
    return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
});
assert.ok(innerBounds.some(bounds => frame.center.x >= bounds.left && frame.center.x <= bounds.right
    && frame.center.y >= bounds.top && frame.center.y <= bounds.bottom
    && Math.min(bounds.right - bounds.left, bounds.bottom - bounds.top) < large.lineSpacing * 2),
    'The visible marker must stay inside a narrow innermost contour.');

console.log(`${cases} viewport cases passed: 25–400% zoom, display densities 1–3, bounded buffers, stable zoom round trips and complete inner contours.`);
