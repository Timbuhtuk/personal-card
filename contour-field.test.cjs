const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Field = new Function(fs.readFileSync(path.join(__dirname, 'dist/contour-field.js'), 'utf8') + '\nreturn ContourField;')();

function random(seed)
{
    return () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296);
}

function assertNoCrossings(frames)
{
    const cells = new Map();
    const side = (a, b, p) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    for (let q = 0; q < frames.length; q++)
        for (const contour of frames[q].paths)
            for (let e = 0; e < contour.points.length - (contour.closed ? 0 : 1); e++)
            {
                const a = contour.points[e], b = contour.points[(e + 1) % contour.points.length];
                const checked = new Set();
                for (let x = Math.floor(Math.min(a.x, b.x) / 32); x <= Math.floor(Math.max(a.x, b.x) / 32); x++)
                    for (let y = Math.floor(Math.min(a.y, b.y) / 32); y <= Math.floor(Math.max(a.y, b.y) / 32); y++)
                    {
                        const key = `${x},${y}`;
                        const bucket = cells.get(key) || [];
                        for (const other of bucket)
                        {
                            if (other.figure === q || checked.has(other)) continue;
                            checked.add(other);
                            const crosses = side(a, b, other.a) * side(a, b, other.b) < -1e-8
                                && side(other.a, other.b, a) * side(other.a, other.b, b) < -1e-8;
                            assert.equal(crosses, false, `Contours of figures ${q} and ${other.figure} crossed`);
                        }
                        bucket.push({ a, b, figure: q });
                        cells.set(key, bucket);
                    }
            }
}

function assertVisualCenters(frames)
{
    for (const frame of frames)
    {
        assert.ok(Number.isFinite(frame.center.x) && Number.isFinite(frame.center.y));
        const closed = frame.paths.filter(contour => contour.closed && contour.points.length >= 3);
        if (!closed.length) continue;
        const level = Math.max(...closed.map(contour => contour.level));
        const inside = closed.filter(contour => contour.level === level).some(contour => {
            let winding = 0;
            for (let q = 0; q < contour.points.length; q++)
            {
                const first = contour.points[q], second = contour.points[(q + 1) % contour.points.length];
                const ax = first.x - frame.center.x, ay = first.y - frame.center.y;
                const bx = second.x - frame.center.x, by = second.y - frame.center.y;
                winding += Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
            }
            return Math.abs(winding) > Math.PI;
        });
        assert.ok(inside, 'The visible marker must stay inside an innermost closed contour');
    }
}

let cases = 0;
const initialCounts = new Set();
const initialPositions = new Set();
for (let seed = 0; seed < 100; seed++)
{
    const field = new Field(1910, 774, random(seed * 49999));
    initialCounts.add(field.figures.length);
    initialPositions.add(`${field.figures[0].x},${field.figures[0].y}`);
    for (const figure of field.figures)
    {
        assert.ok(figure.x >= 1910 * .08 && figure.x <= 1910 * .92);
        assert.ok(figure.y >= 774 * .08 && figure.y <= 774 * .92);
    }
}
assert.deepEqual([...initialCounts].sort(), [1, 2, 3]);
assert.equal(initialPositions.size, 100);
for (const [width, height] of [[1910, 774], [879, 756], [390, 748], [320, 460]])
    for (const seed of [19, 7319, 990])
        for (const crowded of [false, true])
        {
            const field = new Field(width, height, random(seed));
            const initialCount = field.figures.length;
            assert.ok(initialCount >= 1 && initialCount <= 3);
            if (crowded)
            {
                while (field.figures.length < 5) field.add(width / 2, height / 2);
                assert.equal(field.add(0, 0), null);
                for (const figure of field.figures) field.move(figure, width / 2, height / 2);
                field.dragged = field.figures[0];
            }
            for (const time of [0, 5000, 45000])
                for (const pointer of [null, { x: width / 2, y: height / 2, active: true }])
                {
                    const frames = field.build(time, pointer);
                    for (const frame of frames)
                        for (const contour of frame.paths)
                            for (const point of contour.points)
                            {
                                assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
                                if (pointer) continue;
                                for (const boundary of frame.boundaries)
                                    assert.ok(field.boundaryDistance(boundary, point.x, point.y) >= field.lineSpacing / 2 - .8,
                                        'A contour escaped its curved boundary');
                            }
                    assertNoCrossings(frames);
                    assertVisualCenters(frames);
                    cases++;
                }
            const first = field.figures[0];
            const originalX = first.x;
            field.resize(width * .5, height * .5);
            assert.equal(field.figures.length, crowded ? 5 : initialCount);
            assert.equal(first.x, originalX * .5);
        }
const gapField = new Field(1200, 800, random(7319));
gapField.figures = [gapField.create(440, 400, .45, .7), gapField.create(760, 400, .45, .7)];
const gapFrames = gapField.build(0);
const pair = gapFrames[0].boundaries[0].pair;
const curveOffsets = [-300, -150, 0, 150, 300].map(tangent => gapField.curve(pair, tangent).value);
assert.ok(Math.abs(curveOffsets[0] + curveOffsets[4] - 2 * curveOffsets[2]) > 5,
    'The shared boundary must visibly curve instead of following a straight line');

function minimumGap(first, second)
{
    const segments = second.flatMap(contour => contour.points.slice(0, contour.closed ? undefined : -1)
        .map((point, q) => ({ a: point, b: contour.points[(q + 1) % contour.points.length] })));
    const tree = gapField.segmentTree(segments);
    let distance = Infinity;
    for (const contour of first)
        for (const point of contour.points)
            distance = Math.min(distance, Math.sqrt(gapField.outlineDistance(tree, point.x, point.y)));
    return distance;
}

const firstLevel = gapField.lineSpacing / 2;
const outer = gapFrames.map(frame => frame.paths.filter(contour => contour.level === firstLevel));
const secondLevel = gapFrames[0].paths.filter(contour => contour.level === firstLevel + gapField.lineSpacing);
const figureGap = minimumGap(outer[0], outer[1]);
const lineGap = minimumGap(outer[0], secondLevel);
assert.ok(Math.abs(figureGap - gapField.lineSpacing) < 1, `Figure gap was ${figureGap}px`);
assert.ok(Math.abs(lineGap - gapField.lineSpacing) < 1, `Internal gap was ${lineGap}px`);
assert.ok(Math.abs(figureGap - lineGap) < 1, 'Internal and inter-figure gaps must match');
assert.ok(gapFrames.some(frame => Math.hypot(frame.center.x - frame.x, frame.center.y - frame.y) > 24),
    'The regression scene must shift the visible center away from its construction anchor');
for (const frame of gapFrames) assert.equal(gapField.find(frame.center.x, frame.center.y), frame.figure);
const warpedFrames = gapField.build(0, { x: 520, y: 420, active: true });
for (let q = 0; q < gapFrames.length; q++)
{
    const expected = gapField.deform(gapFrames[q].center.x, gapFrames[q].center.y, { x: 520, y: 420, active: true });
    assert.deepEqual(warpedFrames[q].center, expected);
    assert.equal(gapField.find(expected.x, expected.y), gapFrames[q].figure,
        'Hit detection must follow the marker after pointer deformation');
}
console.log(`${cases} geometry scenarios passed: centered markers, curved boundaries, no crossings with pointer deformation, coincident centers and dragging. Visual-center hit detection passed. Gaps: figures ${figureGap.toFixed(2)}px, internal lines ${lineGap.toFixed(2)}px.`);
