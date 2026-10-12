// Opt-in, local diagnostics: ?profile=1&seed=2. No telemetry or visible UI.
class PreviewProfile
{
    constructor()
    {
        const query = new URLSearchParams(location.search);
        this.enabled = query.has('profile');
        this.seed = this.enabled && query.has('seed') ? Number(query.get('seed')) >>> 0 : null;
        this.samples = new Map();
        this.started = 0;
        this.finished = false;
    }

    begin()
    {
        return this.enabled && !this.finished ? performance.now() : 0;
    }

    record(name, elapsed)
    {
        if (!this.enabled || this.finished || !this.started || performance.now() - this.started < 1000) return;
        if (!this.samples.has(name)) this.samples.set(name, []);
        this.samples.get(name).push(elapsed);
    }

    end(name, start)
    {
        if (start) this.record(name, performance.now() - start);
    }

    frame(interval)
    {
        if (!this.enabled || this.finished) return;
        const now = performance.now();
        if (!this.started) this.started = now;
        this.record('frameInterval', interval);
        if (now - this.started < 9000) return;
        this.finished = true;
        const metrics = {};
        for (const [name, values] of this.samples)
        {
            values.sort((a, b) => a - b);
            const total = values.reduce((sum, value) => sum + value, 0);
            metrics[name] = { count: values.length, totalMs: +total.toFixed(2),
                meanMs: +(total / values.length).toFixed(3),
                p95Ms: +values[Math.floor((values.length - 1) * .95)].toFixed(3),
                maxMs: +values[values.length - 1].toFixed(3) };
        }
        console.info('Preview profile ' + JSON.stringify({ width: innerWidth, height: innerHeight,
            seed: this.seed, sampleMs: +(now - this.started - 1000).toFixed(1), metrics }));
    }
}
