class ContourField
{
    constructor(width, height, random)
    {
        this.width = width;
        this.height = height;
        this.random = random;
        this.figures = [];
        this.frames = [];
        this.displayFrames = [];
        this.dragged = null;
        this.lineSpacing = 32;
        this.meshTime = -Infinity;
        this.dirty = true;
        const count = 1 + Math.floor(this.random() * 3);
        const radiusX = width < 600 ? .82 : count === 1 ? .78 : .52;
        const radiusY = count === 1 ? .62 : .60;
        for (let q = 0; q < count; q++)
        {
            let x, y;
            for (let attempt = 0; attempt < 24; attempt++)
            {
                x = width * (.08 + this.random() * .84);
                y = height * (.08 + this.random() * .84);
                if (this.figures.every(figure => Math.hypot((figure.x - x) / width, (figure.y - y) / height) >= .28)) break;
            }
            this.figures.push(this.create(x, y, radiusX, radiusY));
        }
    }

    create(x, y, radiusX = .34, radiusY = .42)
    {
        return {
            x, y, radiusX: this.width * radiusX, radiusY: this.height * radiusY,
            phase: this.random() * Math.PI * 2, frequency: 3 + Math.floor(this.random() * 3),
            rotation: (this.random() - .5) * .55
        };
    }

    resize(width, height)
    {
        for (const figure of this.figures)
        {
            figure.x *= width / this.width; figure.radiusX *= width / this.width;
            figure.y *= height / this.height; figure.radiusY *= height / this.height;
        }
        this.width = width;
        this.height = height;
        this.dragged = null;
        this.dirty = true;
    }

    add(x, y)
    {
        if (this.figures.length >= 5) return null;
        const figure = this.create(x, y);
        this.figures.push(figure);
        this.dirty = true;
        return figure;
    }

    move(figure, x, y)
    {
        figure.x = Math.max(8, Math.min(this.width - 8, x));
        figure.y = Math.max(8, Math.min(this.height - 8, y));
        this.dirty = true;
    }

    find(x, y)
    {
        let result = null;
        let distance = 30;
        for (const frame of this.displayFrames)
        {
            const current = Math.hypot(frame.center.x - x, frame.center.y - y);
            if (current >= distance) continue;
            distance = current;
            result = frame.figure;
        }
        return result;
    }

    deform(x, y, pointer)
    {
        if (!pointer?.active) return { x, y };
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const radius = Math.min(this.width, this.height) * .18;
        const force = .25 * Math.exp(-(dx * dx + dy * dy) / (radius * radius));
        return { x: x + dx * force, y: y + dy * force };
    }

    naturalRadius(figure, angle, time)
    {
        const local = angle - figure.rotation;
        const cosine = Math.cos(local), sine = Math.sin(local);
        const ellipse = 1 / Math.sqrt(cosine * cosine / (figure.radiusX * figure.radiusX) + sine * sine / (figure.radiusY * figure.radiusY));
        const wobble = 1 + Math.sin(local * figure.frequency + figure.phase + time * .00011) * .055
            + Math.cos(local * 2 + figure.phase) * .09;
        return ellipse * wobble * (1 + Math.sin(time * .00045 + figure.phase) * .013);
    }

    curve(pair, tangent)
    {
        const angle = tangent / pair.waveLength + pair.phase;
        const second = tangent * 2 / pair.waveLength + pair.phase * .7;
        return {
            value: pair.amplitude * (Math.sin(angle) - Math.sin(pair.phase) + .28 * (Math.cos(second) - Math.cos(pair.phase * .7))),
            slope: pair.amplitude / pair.waveLength * (Math.cos(angle) - .56 * Math.sin(second)),
            curvature: pair.amplitude / (pair.waveLength * pair.waveLength) * (-Math.sin(angle) - 1.12 * Math.cos(second))
        };
    }

    boundaryDistance(boundary, x, y)
    {
        const pair = boundary.pair;
        const dx = x - pair.x, dy = y - pair.y;
        const normal = dx * pair.nx + dy * pair.ny - pair.offset;
        const tangent = -dx * pair.ny + dy * pair.nx;
        if ((normal - this.curve(pair, tangent).value) * boundary.side <= 0) return 0;
        let closest = tangent;
        for (let q = 0; q < 4; q++)
        {
            const curve = this.curve(pair, closest);
            const derivative = 1 + curve.slope * curve.slope + (curve.value - normal) * curve.curvature;
            const step = ((curve.value - normal) * curve.slope + closest - tangent) / Math.max(.2, derivative);
            closest -= Math.max(-pair.waveLength * .5, Math.min(pair.waveLength * .5, step));
        }
        return Math.hypot(normal - this.curve(pair, closest).value, tangent - closest);
    }

    smoothDepth(first, second)
    {
        if (!Number.isFinite(first)) return second;
        const blend = Math.max(0, 48 - Math.abs(first - second));
        return Math.min(first, second) - blend * blend / 192;
    }

    segmentTree(segments)
    {
        const node = {
            minX: Math.min(...segments.map(segment => Math.min(segment.a.x, segment.b.x))),
            minY: Math.min(...segments.map(segment => Math.min(segment.a.y, segment.b.y))),
            maxX: Math.max(...segments.map(segment => Math.max(segment.a.x, segment.b.x))),
            maxY: Math.max(...segments.map(segment => Math.max(segment.a.y, segment.b.y)))
        };
        if (segments.length <= 6) node.segments = segments;
        else
        {
            const axis = node.maxX - node.minX > node.maxY - node.minY ? 'x' : 'y';
            segments.sort((first, second) => first.a[axis] + first.b[axis] - second.a[axis] - second.b[axis]);
            const middle = Math.floor(segments.length / 2);
            node.first = this.segmentTree(segments.slice(0, middle));
            node.second = this.segmentTree(segments.slice(middle));
        }
        return node;
    }

    boxDistance(node, x, y)
    {
        const dx = Math.max(node.minX - x, 0, x - node.maxX);
        const dy = Math.max(node.minY - y, 0, y - node.maxY);
        return dx * dx + dy * dy;
    }

    outlineDistance(node, x, y, best = Infinity)
    {
        if (this.boxDistance(node, x, y) >= best) return best;
        if (node.segments)
        {
            for (const segment of node.segments)
            {
                const dx = segment.b.x - segment.a.x, dy = segment.b.y - segment.a.y;
                const projection = Math.max(0, Math.min(1, ((x - segment.a.x) * dx + (y - segment.a.y) * dy) / (dx * dx + dy * dy)));
                const px = x - segment.a.x - projection * dx, py = y - segment.a.y - projection * dy;
                best = Math.min(best, px * px + py * py);
            }
            return best;
        }
        const first = this.boxDistance(node.first, x, y) < this.boxDistance(node.second, x, y) ? node.first : node.second;
        const second = first === node.first ? node.second : node.first;
        best = this.outlineDistance(first, x, y, best);
        return this.outlineDistance(second, x, y, best);
    }

    contours(values, columns, rows, startX, startY, step, maximum)
    {
        const layers = [];
        const firstLevel = this.lineSpacing / 2;
        const layerCount = Math.min(15, Math.floor((maximum - firstLevel) / this.lineSpacing) + 1);
        const cases = [[], [[3, 0]], [[0, 1]], [[3, 1]], [[1, 2]], null, [[0, 2]], [[3, 2]], [[2, 3]], [[0, 2]], null, [[1, 2]], [[1, 3]], [[0, 1]], [[0, 3]], []];
        for (let y = 0; y < rows - 1; y++)
            for (let x = 0; x < columns - 1; x++)
            {
                const corners = [values[y * columns + x], values[y * columns + x + 1], values[(y + 1) * columns + x + 1], values[(y + 1) * columns + x]];
                const low = Math.max(0, Math.ceil((Math.min(...corners) - firstLevel) / this.lineSpacing));
                const high = Math.min(layerCount - 1, Math.floor((Math.max(...corners) - firstLevel) / this.lineSpacing));
                for (let q = low; q <= high; q++)
                {
                    const level = firstLevel + q * this.lineSpacing;
                    let mask = 0;
                    for (let e = 0; e < 4; e++) if (corners[e] >= level) mask |= 1 << e;
                    if (mask === 0 || mask === 15) continue;
                    const centerInside = corners.reduce((sum, value) => sum + value, 0) / 4 >= level;
                    const pairs = cases[mask] || (mask === 5 ? centerInside ? [[0, 1], [2, 3]] : [[3, 0], [1, 2]] : centerInside ? [[3, 0], [1, 2]] : [[0, 1], [2, 3]]);
                    const edge = index => {
                        const end = (index + 1) % 4;
                        const ratio = (level - corners[index]) / (corners[end] - corners[index]);
                        const offsets = [[0, 0], [1, 0], [1, 1], [0, 1]];
                        const id = index === 0 ? `h${x},${y}` : index === 1 ? `v${x + 1},${y}` : index === 2 ? `h${x},${y + 1}` : `v${x},${y}`;
                        return { id, x: startX + (x + offsets[index][0] + (offsets[end][0] - offsets[index][0]) * ratio) * step,
                            y: startY + (y + offsets[index][1] + (offsets[end][1] - offsets[index][1]) * ratio) * step };
                    };
                    if (!layers[q]) layers[q] = [];
                    for (const [first, second] of pairs) layers[q].push({ a: edge(first), b: edge(second) });
                }
            }

        const paths = [];
        for (let q = 0; q < layers.length; q++)
        {
            const segments = layers[q];
            if (!segments) continue;
            const nodes = new Map();
            for (let e = 0; e < segments.length; e++)
                for (const point of [segments[e].a, segments[e].b])
                {
                    if (!nodes.has(point.id)) nodes.set(point.id, { point, edges: [] });
                    nodes.get(point.id).edges.push(e);
                }
            const used = new Uint8Array(segments.length);
            const trace = start => {
                const points = [];
                let current = start;
                let closed = false;
                while (true)
                {
                    const node = nodes.get(current);
                    points.push(node.point);
                    const next = node.edges.find(index => !used[index]);
                    if (next === undefined) break;
                    used[next] = 1;
                    const segment = segments[next];
                    current = segment.a.id === current ? segment.b.id : segment.a.id;
                    if (current === start) { closed = true; break; }
                }
                if (points.length > 1) paths.push({ points, closed, level: firstLevel + q * this.lineSpacing, opacity: .28 + Math.sin(q / Math.max(1, layerCount) * Math.PI) * .40 });
            };
            for (const [id, node] of nodes) if (node.edges.length === 1 && !used[node.edges[0]]) trace(id);
            for (let e = 0; e < segments.length; e++) if (!used[e]) trace(segments[e].a.id);
        }
        return paths;
    }

    visualCenter(paths, fallback)
    {
        let selected = null;
        let selectedArea = 0;
        let result = fallback;
        for (const path of paths)
        {
            if (!path.closed || path.points.length < 3 || selected && path.level < selected.level) continue;
            let area = 0, x = 0, y = 0;
            for (let q = 0; q < path.points.length; q++)
            {
                const first = path.points[q], second = path.points[(q + 1) % path.points.length];
                const cross = first.x * second.y - second.x * first.y;
                area += cross;
                x += (first.x + second.x) * cross;
                y += (first.y + second.y) * cross;
            }
            if (Math.abs(area) < .001 || selected && path.level === selected.level && Math.abs(area) <= selectedArea) continue;
            selected = path;
            selectedArea = Math.abs(area);
            const center = { x: x / (3 * area), y: y / (3 * area) };
            let inside = false;
            for (let q = 0, e = path.points.length - 1; q < path.points.length; e = q++)
            {
                const first = path.points[q], second = path.points[e];
                if ((first.y > center.y) !== (second.y > center.y)
                    && center.x < (second.x - first.x) * (center.y - first.y) / (second.y - first.y) + first.x) inside = !inside;
            }
            result = inside ? center : fallback;
        }
        return result;
    }

    buildMesh(time)
    {
        const frames = this.figures.map(figure => ({
            figure,
            x: figure.x + (figure === this.dragged ? 0 : Math.sin(time * .00010 + figure.phase) * this.width * .012),
            y: figure.y + (figure === this.dragged ? 0 : Math.cos(time * .00008 + figure.phase) * this.height * .025),
            boundaries: [], paths: []
        }));
        const separation = Math.max(48, Math.min(80, Math.min(this.width, this.height) * .12));
        for (let pass = 0; pass < 20; pass++)
            for (let q = 0; q < frames.length; q++)
                for (let e = q + 1; e < frames.length; e++)
                {
                    const first = frames[q], second = frames[e];
                    const dx = second.x - first.x, dy = second.y - first.y;
                    const distance = Math.hypot(dx, dy);
                    if (distance >= separation) continue;
                    const nx = distance > .001 ? dx / distance : Math.cos(e * 2.4);
                    const ny = distance > .001 ? dy / distance : Math.sin(e * 2.4);
                    const push = separation - distance;
                    const share = first.figure === this.dragged ? 0 : second.figure === this.dragged ? 1 : .5;
                    first.x -= nx * push * share; first.y -= ny * push * share;
                    second.x += nx * push * (1 - share); second.y += ny * push * (1 - share);
                }

        // Both figures use the same curved separator. Distance contours reserve half a line interval on each side.
        for (let q = 0; q < frames.length; q++)
            for (let e = q + 1; e < frames.length; e++)
            {
                const first = frames[q], second = frames[e];
                const dx = second.x - first.x, dy = second.y - first.y;
                const distance = Math.hypot(dx, dy);
                const nx = dx / distance, ny = dy / distance;
                const reach = frame => {
                    const angle = Math.atan2(ny, nx) - frame.figure.rotation;
                    return Math.hypot(frame.figure.radiusX * Math.cos(angle), frame.figure.radiusY * Math.sin(angle));
                };
                const firstReach = reach(first), secondReach = reach(second);
                const boundary = Math.max(12, Math.min(distance - 12, distance * firstReach / (firstReach + secondReach)));
                const pair = { x: first.x, y: first.y, nx, ny, offset: boundary,
                    amplitude: Math.min(distance * .25, Math.min(this.width, this.height) * .22),
                    waveLength: Math.max(120, distance * .45, Math.min(this.width, this.height) * .32),
                    phase: first.figure.phase - second.figure.phase + time * .000035 };
                first.boundaries.push({ pair, side: -1 });
                second.boundaries.push({ pair, side: 1 });
            }

        const samples = 144;
        for (const frame of frames)
        {
            const figure = frame.figure;
            const outline = [];
            for (let e = 0; e < samples; e++)
            {
                const angle = e / samples * Math.PI * 2;
                const radius = this.naturalRadius(figure, angle, time);
                outline.push({ x: frame.x + Math.cos(angle) * radius, y: frame.y + Math.sin(angle) * radius });
            }
            const tree = this.segmentTree(outline.map((point, q) => ({ a: point, b: outline[(q + 1) % samples] })));
            const step = this.width > 1100 ? 7 : 6;
            const startX = Math.max(-step, Math.floor(tree.minX / step) * step);
            const startY = Math.max(-step, Math.floor(tree.minY / step) * step);
            const endX = Math.min(this.width + step, Math.ceil(tree.maxX / step) * step);
            const endY = Math.min(this.height + step, Math.ceil(tree.maxY / step) * step);
            const columns = Math.max(2, Math.ceil((endX - startX) / step) + 1);
            const rows = Math.max(2, Math.ceil((endY - startY) / step) + 1);
            const values = new Float32Array(columns * rows);
            let maximum = 0;
            let peak = { x: frame.x, y: frame.y };
            for (let y = 0; y < rows; y++)
                for (let x = 0; x < columns; x++)
                {
                    const px = startX + x * step, py = startY + y * step;
                    const dx = px - frame.x, dy = py - frame.y;
                    if (Math.hypot(dx, dy) >= this.naturalRadius(figure, Math.atan2(dy, dx), time)) continue;
                    let depth = Infinity;
                    for (const boundary of frame.boundaries)
                    {
                        depth = this.smoothDepth(depth, this.boundaryDistance(boundary, px, py));
                        if (depth <= 0) break;
                    }
                    if (depth <= 0) continue;
                    // A farther outline can still affect the rounded transition within the blend radius.
                    const outline = Math.sqrt(this.outlineDistance(tree, px, py, (depth + 48) * (depth + 48)));
                    depth = this.smoothDepth(depth, outline);
                    if (depth <= 0) continue;
                    values[y * columns + x] = depth;
                    if (depth > maximum)
                    {
                        maximum = depth;
                        peak = { x: px, y: py };
                    }
                }
            frame.paths = this.contours(values, columns, rows, startX, startY, step, maximum);
            frame.center = this.visualCenter(frame.paths, peak);
        }
        this.frames = frames;
        this.meshTime = time;
        this.dirty = false;
    }

    build(time, pointer = null)
    {
        if (!this.frames.length || this.dirty || time - this.meshTime >= 120) this.buildMesh(time);
        this.displayFrames = !pointer?.active ? this.frames : this.frames.map(frame => ({ ...frame,
            center: this.deform(frame.center.x, frame.center.y, pointer),
            paths: frame.paths.map(path => ({ ...path, points: path.points.map(point => this.deform(point.x, point.y, pointer)) }))
        }));
        return this.displayFrames;
    }
}
