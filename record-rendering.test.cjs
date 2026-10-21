const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const motion = require('./dist/record-entrance-motion.js');
function events(target = {})
{
    const listeners = {};
    return Object.assign(target, { addEventListener(name, fn) { (listeners[name] ||= []).push(fn); },
        fire(name, event = {}) { for (const fn of listeners[name] || []) fn(event); } });
}
function element()
{
    const attributes = {}, classes = new Set();
    return events({ children: [], dataset: {}, style: { setProperty(key, value) { this[key] = value; } },
        classList: { add: name => classes.add(name), remove: name => classes.delete(name) },
        setAttribute(key, value) { attributes[key] = String(value); if (key.startsWith('data-')) this.dataset[key.slice(5)] = String(value); },
        getAttribute: key => attributes[key] ?? null, removeAttribute(key) { delete attributes[key]; },
        append(...items) { this.children.push(...items); }, replaceChildren() { this.children = []; },
        querySelectorAll(selector) { const all = this.children.flatMap(child => [child, ...child.querySelectorAll(selector)]); return all.filter(child => selector === '[data-copy]' && child.dataset.copy !== undefined); },
        setPointerCapture() {} });
}
async function fixture(decodeFails = false)
{
    const nodes = new Map();
    for (const selector of ['#record-scene','.record-stage','#record-rotor','#disc-surface','#disc-label-rotor','#printed-sections','#deck-layer','#hardware-layer','#reflection-layer','.center-detail','#record-arrival','#record-arrival-window','#record-scan-line','#center-iris-pattern','#clip-circle','#record-announcement']) nodes.set(selector, element());
    const keys = [0,1,2].map(q => Object.assign(element(), { tagName: 'BUTTON', dataset: { section: String(q) } }));
    const stage = nodes.get('.record-stage'); stage.clientWidth = stage.clientHeight = 0;
    const body = element(), parent = {}, frames = new Map(); let id = 0, now = 0, fontsReady, textureReady;
    const document = events({ body, head: element(), hidden: false, title: '', querySelector: key => nodes.get(key),
        querySelectorAll: key => key === 'button[data-section]' ? keys : [],
        createElementNS: () => element(), createElement: name => name === 'canvas' ? { getContext: () => ({ measureText: text => ({ width: text.length * 7 }) }) } : element(),
        fonts: { load: () => fontPromise } });
    const fontPromise = new Promise(resolve => fontsReady = resolve);
    const window = events({ parent, dispatchEvent() {} });
    const reduced = events({ matches: false });
    const color = events({ matches: false });
    const location = { search: '?variant=graphic&embedded=1&copy=labels&layout=wide', href: 'https://example.test/record-lab.html?variant=graphic&embedded=1&copy=labels&layout=wide', origin: 'https://example.test' };
    const sandbox = { window, document, location, URL, URLSearchParams, RecordEntranceMotion: motion, Event: class {},
        performance: { now: () => now }, matchMedia: query => query.includes('reduced') ? reduced : color,
        getComputedStyle: () => ({ getPropertyValue: () => '#171717' }), history: {},
        requestAnimationFrame(fn) { frames.set(++id, fn); return id; }, cancelAnimationFrame: key => frames.delete(key),
        setTimeout: () => 0, clearTimeout() {}, ResizeObserver: class { observe() {} },
        Image: class { decode() { return new Promise((resolve, reject) => textureReady = () => decodeFails ? reject(new Error('Texture unavailable')) : resolve()); } } };
    vm.runInNewContext(fs.readFileSync('dist/record-lab.js','utf8'), sandbox);
    const flush = async (count = 140) => { for (let q = 0; q < count; q++) { await Promise.resolve(); now += 16; const pending = [...frames.values()]; frames.clear(); for (const fn of pending) fn(now); } };
    const message = (phase, animate = true) => window.fire('message', { source: parent, origin: location.origin, data: { type: 'personal-record-transition', phase, animate, duration: 1700 } });
    return { nodes, stage, document, window, keys, frames, flush, message, ready: async () => { fontsReady(); textureReady(); await window.RecordStudyReady; } };
}
(async () => {
    const f = await fixture();
    assert.equal(f.stage.dataset.sceneBuilds, undefined, 'Do not build with fallback fonts or inside a zero-size iframe');
    await f.ready(); assert.equal(f.stage.dataset.sceneBuilds, undefined);
    f.stage.clientWidth = 390; f.stage.clientHeight = 748;
    const prepare = f.window.RecordStudyPrepare(); await f.flush(6); await prepare;
    assert.equal(f.stage.dataset.sceneBuilds, 1);
    const surface = f.nodes.get('#disc-surface'), rotor = f.nodes.get('#record-rotor'), iris = f.nodes.get('#disc-label-rotor');
    assert.ok(surface.children.length > 20); assert.equal(iris.children.length, 1);
    const rings = [...surface.children];
    f.message('enter'); await f.flush(); f.message('visible', false);
    assert.equal(f.stage.dataset.sceneBuilds, 1, 'The entrance must reuse the prepared scene');
    assert.equal(f.stage.dataset.entranceProgress, '1.000');
    const before = rotor.getAttribute('transform');
    f.keys[1].fire('click'); await f.flush();
    assert.notEqual(rotor.getAttribute('transform'), before);
    assert.equal(iris.getAttribute('transform'), rotor.getAttribute('transform'));
    assert.deepEqual(surface.children, rings, 'Track changes keep the same circular paths');
    assert.equal(surface.getAttribute('transform'), null, 'Circular grooves are never rotated');
    assert.equal(f.stage.dataset.sceneBuilds, 1);
    f.message('leave'); await f.flush(); assert.equal(f.stage.dataset.entranceProgress, '0.000');
    f.message('enter'); await f.flush(); assert.equal(f.stage.dataset.sceneBuilds, 1);
    f.stage.clientWidth = 1280; f.stage.clientHeight = 720;
    const resize = f.window.RecordStudyPrepare(); await f.flush(6); await resize;
    assert.equal(f.stage.dataset.sceneBuilds, 2); assert.equal(f.stage.dataset.layout, 'wide');
    const missing = await fixture(true); await missing.ready();
    missing.stage.clientWidth = 390; missing.stage.clientHeight = 748;
    missing.document.hidden = true; await missing.window.RecordStudyPrepare();
    assert.equal(missing.stage.dataset.sceneBuilds, 1, 'A failed texture must not hide the text or block readiness');
    console.log('Record rendering passed: first layout readiness, single build, static grooves, rotating print/iris, return, resize and missing texture.');
})().catch(error => { console.error(error); process.exitCode = 1; });
