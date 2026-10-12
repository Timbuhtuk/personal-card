const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Motion = new Function(fs.readFileSync(path.join(__dirname, 'dist/triangle-name.js'), 'utf8') + '\nreturn TriangleMagnet;')();

function particles()
{
    return Array.from({ length: 31 }, (_, q) => ({ targetX: 300 + q * 8, targetY: 180 + q % 3 * 12, spin: Math.sin(q * 2.4) }));
}

for (const delta of [8.33, 16.67, 33.34, 40])
{
    const motion = new Motion(particles());
    assert.equal(motion.step(delta, null, 95), false);
    for (let q = 0; q < 500 / delta; q++) motion.step(delta, { x: 420, y: 192, active: true }, 95);
    assert.ok(motion.particles.some(particle => Math.hypot(particle.x - particle.targetX, particle.y - particle.targetY) > 12),
        'Hovering must visibly disperse the name');
    for (let q = 0; q < 8000 / delta; q++) motion.step(delta, null, 95);
    assert.equal(motion.moving, false, 'The name must settle after the pointer leaves');
    for (const particle of motion.particles)
    {
        assert.equal(particle.x, particle.targetX);
        assert.equal(particle.y, particle.targetY);
        assert.equal(particle.angle, 0);
    }
    motion.scatter(420, 192, 180);
    assert.equal(motion.step(0, null, 95), true);
    for (let q = 0; q < 8000 / delta; q++) motion.step(delta, null, 95);
    assert.equal(motion.moving, false, 'A click burst must reassemble');
}

const motion = new Motion(particles());
for (let q = 0; q < 1500; q++)
{
    const pointer = { x: 420 + Math.sin(q * .07) * 90, y: 192 + Math.cos(q * .09) * 60, active: true };
    if (q % 10 === 0) motion.scatter(pointer.x, pointer.y, 180);
    motion.step([8.33, 16.67, 33.34, 40][q % 4], pointer, 95);
    for (const particle of motion.particles)
    {
        assert.ok([particle.x, particle.y, particle.vx, particle.vy, particle.angle].every(Number.isFinite));
        assert.ok(Math.hypot(particle.x - particle.targetX, particle.y - particle.targetY) < 300,
            'Repeated bursts must keep particles bounded');
    }
}
motion.settle();
assert.equal(motion.moving, false);
assert.ok(motion.particles.every(particle => particle.x === particle.targetX && particle.y === particle.targetY && particle.angle === 0));
console.log('Triangle motion passed: hover dispersion, click bursts, exact reassembly at four frame intervals, repeated-burst stability and immediate settling.');
