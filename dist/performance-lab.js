(() => {
    const frame = document.querySelector('#site-preview'), result = document.querySelector('#result');
    const button = document.querySelector('#replay');
    let running = false;
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    async function run()
    {
        if (running) return;
        running = true; button.disabled = true; result.textContent = 'Loading…';
        await new Promise(resolve => { frame.onload = resolve; frame.src = 'index.html?seed=2&profile=1&benchmark=1'; });
        const win = frame.contentWindow, doc = frame.contentDocument;
        const samples = {}, longTasks = [];
        let peakEntrancePixels = 0;
        let phase = 'entrance', lastPhase = '', previous = 0, active = true, raf;
        const observer = typeof win.PerformanceObserver === 'function' ? new win.PerformanceObserver(list => {
            for (const entry of list.getEntries()) longTasks.push({ phase, duration: +entry.duration.toFixed(1) });
        }) : null;
        try { observer?.observe({ type: 'longtask' }); } catch {}
        const tick = now => {
            if (!active) return;
            if (phase === 'entrance')
            {
                const overlay = doc.querySelector('.entrance-fx');
                if (overlay) peakEntrancePixels = Math.max(peakEntrancePixels, overlay.width * overlay.height);
            }
            if (phase === lastPhase && previous) (samples[phase] ||= []).push(now - previous);
            lastPhase = phase; previous = now; raf = win.requestAnimationFrame(tick);
        };
        raf = win.requestAnimationFrame(tick);
        for (let q = 0; q < 200 && (!doc.querySelector('#imprint.ready') || doc.documentElement.classList.contains('entrance-pending') || doc.documentElement.classList.contains('entrance-running')); q++) await sleep(100);
        await sleep(300);
        async function step(name, action, duration)
        {
            phase = name; result.textContent = 'Measuring: ' + name; action?.(); await sleep(duration);
        }
        const record = () => doc.querySelector('.about-frame')?.contentDocument;
        await step('home', null, 1800);
        await step('openAbout', () => doc.querySelector('.about-link').click(), 2400);
        await step('recordTurn1', () => record()?.querySelector('button[data-section="1"]').click(), 1800);
        await step('recordTurn2', () => record()?.querySelector('button[data-section="2"]').click(), 1800);
        await step('closeAbout', () => doc.querySelector('.about-back').click(), 2300);
        await step('openWork', () => doc.querySelector('.work-link').click(), 2600);
        await step('closeWork', () => doc.querySelector('.work-frame')?.contentDocument?.querySelector('.work-home')?.click(), 2300);
        await step('homeAfter', null, 1200);
        active = false; win.cancelAnimationFrame(raf); observer?.disconnect();
        const metrics = {};
        for (const [name, values] of Object.entries(samples))
        {
            values.sort((a, b) => a - b);
            metrics[name] = { frames: values.length, meanMs: +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1), p95Ms: +values[Math.floor((values.length - 1) * .95)].toFixed(1), maxMs: +values.at(-1).toFixed(1), over33: values.filter(n => n > 33.5).length };
        }
        const buffers = Array.from(doc.querySelectorAll('canvas')).map(c => ({ name: c.className || c.parentElement.className, pixels: c.width * c.height }));
        const recordBuilds = record()?.querySelector('.record-stage')?.dataset.sceneBuilds || null;
        const navigation = win.performance.getEntriesByType('navigation')[0];
        const fonts = win.performance.getEntriesByType('resource').filter(e => /\.woff2(?:\?|$)/.test(e.name)).map(e => ({ name: e.name.split('/').at(-1), durationMs: +e.duration.toFixed(1), transferBytes: e.transferSize }));
        const report = { viewport: [win.innerWidth, win.innerHeight], dpr: win.devicePixelRatio, metrics, longTasks, buffers, recordBuilds, peakEntrancePixels,
            loading: { domContentLoadedMs: +navigation.domContentLoadedEventEnd.toFixed(1), loadMs: +navigation.loadEventEnd.toFixed(1), fonts } };
        result.dataset.report = JSON.stringify(report);
        result.textContent = Object.entries(metrics).map(([name, value]) => name + ': mean ' + value.meanMs + 'ms / p95 ' + value.p95Ms + 'ms / >33ms ' + value.over33 + '/' + value.frames).join('\n') + '\nLong tasks: ' + longTasks.length + '\nPeak entrance overlay: ' + peakEntrancePixels + ' pixels';
        running = false; button.disabled = false;
    }
    button.addEventListener('click', run);
})();
