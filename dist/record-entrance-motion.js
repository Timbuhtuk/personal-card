(function (root, factory)
{
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.RecordEntranceMotion = api;
})(typeof globalThis === 'object' ? globalThis : this, function ()
{
    const modes = ['cue', 'spin', 'roll', 'trace', 'camera', 'scan'];
    const clamp = value => Math.max(0, Math.min(1, value));
    const range = (p, from, to) => clamp((p - from) / (to - from));
    function sample(mode, progress, width, height)
    {
        const p = clamp(progress), q = 1 - p;
        const state = { angle: -18 * q, x: 0, y: 0, scale: 1, opacity: .45 + p * .55, armAngle: -8 * q, armOpacity: range(p, .2, 1), textOpacity: 1, textureOpacity: 1, grooves: 1, zoom: 1, scan: null };
        if (mode === 'spin')
        {
            const back = 1 + 2.4 * Math.pow(p - 1, 3) + 1.4 * Math.pow(p - 1, 2);
            state.angle = -110 * (1 - back); state.opacity = clamp(p * 3);
            state.armAngle = -14 * q; state.armOpacity = range(p, .5, 1);
        }
        if (mode === 'roll')
        {
            state.x = -width * .6 * q; state.y = height * .8 * q; state.angle = -52 * q;
            state.scale = .94 + .06 * p; state.opacity = clamp(p * 2);
            state.armAngle = 18 * q; state.armOpacity = range(p, .45, 1);
        }
        if (mode === 'trace')
        {
            state.angle = 0; state.opacity = 1; state.grooves = p;
            state.textureOpacity = range(p, .25, .75); state.textOpacity = range(p, .55, .95);
            state.armAngle = -6 * q; state.armOpacity = clamp(p * 3);
        }
        if (mode === 'camera')
        {
            state.angle = -5 * q; state.opacity = clamp(p * 3); state.zoom = 1 + .65 * q;
            state.armOpacity = range(p, .15, 1); state.textOpacity = range(p, .25, .9);
        }
        if (mode === 'scan')
        {
            state.angle = 0; state.opacity = 1; state.scan = p;
            state.armOpacity = range(p, .65, 1);
        }
        return state;
    }
    function cueKeyframes(scene, from, target, rotation, armTrack, count = 64)
    {
        const frames = { rotor: [], arrival: [], hardware: [], arm: [], controls: [] };
        for (let q = 0; q <= count; q++)
        {
            const offset = q / count, ease = offset * offset * (3 - 2 * offset);
            const progress = from + (target - from) * ease;
            const state = sample('cue', progress, scene.width, scene.height);
            frames.rotor.push({ offset, transform: `translate(${scene.cx}px, ${scene.cy}px) rotate(${rotation + state.angle}deg) translate(${-scene.cx}px, ${-scene.cy}px)` });
            frames.arrival.push({ offset, opacity: state.opacity });
            frames.hardware.push({ offset, opacity: state.armOpacity });
            frames.controls.push({ offset, opacity: progress });
            if (scene.arm)
            {
                const arm = scene.arm;
                frames.arm.push({ offset, transform: `translate(${arm.x}px, ${arm.y}px) rotate(${arm.angle + armTrack * (arm.trackSweep || 2) + state.armAngle}deg) scale(${arm.scale || 1})` });
            }
        }
        return frames;
    }
    return { modes, sample, cueKeyframes };
});
