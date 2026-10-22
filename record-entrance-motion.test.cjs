const assert = require('node:assert/strict');
const { modes, sample, cueKeyframes } = require('./dist/record-entrance-motion.js');
const nativeScene={width:390,height:748,cx:225,cy:860,arm:{x:396,y:90,angle:35,trackSweep:.8}};
const forward=cueKeyframes(nativeScene,0,1,-240,2),reverse=cueKeyframes(nativeScene,1,0,-240,2);
for(let q=0;q<=64;q++)
{
    const p=q/64,ease=p*p*(3-2*p),expected=sample('cue',ease,390,748);
    assert.ok(Math.abs(forward.arrival[q].opacity-expected.opacity)<1e-12);
    assert.ok(Math.abs(forward.hardware[q].opacity-expected.armOpacity)<1e-12);
    assert.ok(Math.abs(forward.controls[q].opacity-ease)<1e-12);
    for(const name of ['rotor','arm'])
    {
        const first=forward[name][q].transform.match(/-?\d+(?:\.\d+)?/g).map(Number);
        const second=reverse[name][64-q].transform.match(/-?\d+(?:\.\d+)?/g).map(Number);
        first.forEach((value,index)=>assert.ok(Math.abs(value-second[index])<1e-8,'Native Cue must reverse the same transforms'));
    }
}
for (const [width, height] of [[320, 480], [390, 748], [1280, 592], [3840, 1800]])
    for (const mode of modes)
        for (let q = 0; q <= 100; q++)
        {
            const p = q / 100, state = sample(mode, p, width, height);
            for (const [key, value] of Object.entries(state))
                if (value !== null) assert.ok(Number.isFinite(value), mode + ' ' + key);
            for (const key of ['opacity', 'armOpacity', 'textOpacity', 'textureOpacity', 'grooves'])
                assert.ok(state[key] >= 0 && state[key] <= 1, mode + ' ' + key);
            assert.ok(state.scale > 0 && state.zoom >= 1);
            // Closing uses exactly the same pose at matching progress.
            const mirrored = sample(mode, 1 - (1 - p), width, height);
            for (const key of Object.keys(state))
                if (state[key] !== null) assert.ok(Math.abs(state[key] - mirrored[key]) < 1e-8);
        }
for (const mode of modes)
{
    const end = sample(mode, 1, 1280, 720);
    for (const key of ['angle', 'x', 'y', 'armAngle']) assert.ok(Math.abs(end[key]) < 1e-8);
    for (const key of ['scale', 'opacity', 'armOpacity', 'textOpacity', 'textureOpacity', 'grooves', 'zoom']) assert.equal(end[key], 1);
}
assert.ok(sample('spin', .65, 1280, 720).angle > 0, 'Spin overshoots before settling');
assert.equal(sample('trace', 0, 1280, 720).textOpacity, 0);
assert.equal(sample('trace', 0, 1280, 720).grooves, 0);
assert.equal(sample('scan', 0, 1280, 720).scan, 0);
assert.equal(sample('scan', 1, 1280, 720).scan, 1);
assert.equal(new Set(modes.map(mode => JSON.stringify(sample(mode, .4, 1280, 720)))).size, modes.length);
console.log('Six record entrances passed: finite poses, bounded opacity, distinct motion, common final pose and matching reverse samples.');
