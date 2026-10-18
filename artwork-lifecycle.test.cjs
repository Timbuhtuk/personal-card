const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'dist/app.js'), 'utf8');
const artworkSource = source.slice(source.indexOf('class ProceduralImprint extends Artwork'), source.indexOf('function animate(now)'));
const requests = [], nameFrames = [], lifeFrames = [];
class Base
{
    constructor(panel)
    {
        this.panel = panel;
        this.canvas = { dataset: {}, getBoundingClientRect: () => ({ width: 1200, height: 700 }) };
        this.context = { setTransform() {} };
    }
    clear() {}
}
class Scheduler
{
    constructor(field) { this.field = field; this.result = { frames: [], coordinates: new Float32Array() }; }
    resize(width, height) { this.field.resize(width, height); }
    request(time) { requests.push(time); }
}
class Field { resize() {} }
class Name { initialize() {} render(delta) { nameFrames.push(delta); } }
class Life { resize() {} render(time, delta) { lifeFrames.push({ time, delta }); } }
const profile = { seed: 1, begin() {}, end() {} };
const Imprint = new Function('Artwork', 'ContourScheduler', 'ContourField', 'TriangleName', 'LifeDivider',
    'previewProfile', 'randomGenerator', 'contourViewport', 'window', 'document', 'clock', 'paused', 'reducedMotion',
    artworkSource + '; return ProceduralImprint;')(Base, Scheduler, Field, Name, Life,
        profile, () => Math.random, (width, height) => ({ width, height, pixelWidth: width, pixelHeight: height }),
        { devicePixelRatio: 1 }, { hidden: false }, 999999, false, { matches: false });
const panel = { dataset: { view: 'home' }, classList: { add() {} }, querySelectorAll: () => [{}] };
const artwork = new Imprint(panel);
artwork.resize();
assert.equal(requests.at(-1), 0, 'Initial geometry must use its own phase, not the wall clock');
artwork.render(16, 16);
assert.equal(requests.at(-1), 16);
const namesBefore = nameFrames.length, meshesBefore = requests.length;
panel.dataset.view = 'about';
for (let q = 0; q < 3000; q++) artwork.render(50000 + q * 40, 40);
assert.equal(requests.length, meshesBefore, 'A fully hidden background should remain suspended');
assert.equal(artwork.contourTime, 16, 'Time spent on About must not accumulate into the contour phase');
assert.equal(lifeFrames.at(-1).time, 169960, 'Life bands must keep their independent timeline');
artwork.resize();
assert.equal(requests.at(-1), 16, 'Resizing on About must preserve the frozen contour phase');
panel.dataset.view = 'work';
const hiddenMeshes = requests.length;
for (let q = 0; q < 3000; q++) artwork.render(170000 + q * 40, 40);
assert.equal(requests.length, hiddenMeshes, 'Work must suspend the covered contours too');
assert.equal(artwork.contourTime, 16, 'Time spent on Work must not cause a catch-up jump');
panel.dataset.view = 'transition';
const start = requests.length;
for (let q = 0; q < 120; q++) artwork.render(180000 + q * 40, 40);
assert.equal(requests.length - start, 120, 'Visible contours must update throughout the transition');
assert.equal(requests[start], 56, 'Returning after a long About visit must advance by only one frame');
for (let q = start + 1; q < requests.length; q++) assert.equal(requests[q] - requests[q - 1], 40);
assert.equal(nameFrames.length, namesBefore, 'Transition updates must not reactivate the scattered name');
const last = requests.at(-1);
panel.dataset.view = 'home';
artwork.render(190000, 16);
assert.equal(requests.at(-1) - last, 16, 'Finishing the transition must continue the same phase');
assert.equal(nameFrames.length, namesBefore + 1);
console.log('Artwork lifecycle passed: continuous transition geometry, no catch-up after long About visits or resize, independent Life bands and uninterrupted return to home.');
