function packContourFrames(frames)
{
    let length = 0;
    for (const frame of frames)
        for (const path of frame.paths) length += path.points.length * 2;
    const coordinates = new Float32Array(length);
    let offset = 0;
    const packed = frames.map(frame => ({ center: { ...frame.center }, paths: frame.paths.map(path => {
        const start = offset;
        for (const point of path.points)
        {
            coordinates[offset++] = point.x;
            coordinates[offset++] = point.y;
        }
        return { offset: start, length: offset - start, closed: path.closed, opacity: path.opacity, level: path.level };
    }) }));
    return { frames: packed, coordinates };
}

class ContourScheduler
{
    constructor(field, ready, profile, createWorker = () => new Worker(new URL('contour-worker.js', document.baseURI)))
    {
        this.field = field;
        this.ready = ready;
        this.profile = profile;
        this.version = 0;
        this.requestId = 0;
        this.latestTime = 0;
        this.requestTime = -Infinity;
        this.configDirty = true;
        this.pending = null;
        this.result = null;
        try
        {
            this.worker = createWorker();
            this.worker.onmessage = event => this.receive(event.data);
            this.worker.onerror = this.worker.onmessageerror = () => this.fail();
        }
        catch { this.worker = null; }
    }

    resize(width, height)
    {
        this.field.resize(width, height);
        this.version++;
        this.configDirty = true;
        this.requestTime = -Infinity;
        this.result = null;
    }

    request(time)
    {
        this.latestTime = time;
        if (this.pending || (!this.configDirty && time - this.requestTime < 120)) return;
        this.requestTime = time;
        if (!this.worker)
        {
            const start = this.profile?.begin();
            this.field.buildMesh(time);
            this.result = packContourFrames(this.field.frames);
            this.configDirty = false;
            this.profile?.end('meshMain', start);
            this.ready(this.result);
            return;
        }
        const config = this.configDirty ? { width: this.field.width, height: this.field.height,
            lineSpacing: this.field.lineSpacing, figures: this.field.figures.map(figure => ({ ...figure })) } : null;
        const message = { id: ++this.requestId, version: this.version, time, config };
        this.pending = message;
        this.configDirty = false;
        try { this.worker.postMessage(message); }
        catch { this.fail(); }
    }

    receive(message)
    {
        if (!this.pending || message.id !== this.pending.id) return;
        this.pending = null;
        if (message.error) { this.fail(); return; }
        // A resize may finish before the previous mesh. Never paint its stale dimensions.
        if (message.version !== this.version) { this.request(this.latestTime); return; }
        this.result = message.result;
        this.profile?.record('meshWorker', message.elapsed);
        this.ready(this.result);
    }

    fail()
    {
        this.worker?.terminate();
        this.worker = null;
        this.pending = null;
        this.configDirty = true;
        this.request(this.latestTime);
    }
}
