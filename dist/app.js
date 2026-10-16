const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let paused = reducedMotion.matches;
let artwork = null;
let animationFrame = 0;
let previousFrame = 0;
let clock = 0;
const previewProfile = new PreviewProfile();

function randomGenerator(seed)
{
    let value = seed;
    return () => {
        value |= 0;
        value = value + 0x6D2B79F5 | 0;
        let result = Math.imul(value ^ value >>> 15, 1 | value);
        result = result + Math.imul(result ^ result >>> 7, 61 | result) ^ result;
        return ((result ^ result >>> 14) >>> 0) / 4294967296;
    };
}

class Artwork
{
    constructor(panel)
    {
        this.panel = panel;
        this.canvas = panel.querySelector('.art-surface canvas') || panel.querySelector('canvas');
        this.context = this.canvas.getContext('2d');
        this.pointer = { x: 0, y: 0, active: false };
        this.seed = 7319;
        this.random = randomGenerator(this.seed);
        this.canvas.addEventListener('pointermove', event => {
            const bounds = this.canvas.getBoundingClientRect();
            this.pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top, active: true };
            this.interact();
            if (paused) this.render(clock, 0);
        });
        this.canvas.addEventListener('pointerleave', () => {
            this.pointer.active = false;
            if (paused) this.render(clock, 0);
        });
        this.canvas.addEventListener('pointerdown', event => {
            const bounds = this.canvas.getBoundingClientRect();
            this.pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top, active: true };
            this.interact(true);
            if (paused) this.render(clock, 0);
        });

    }

    resize()
    {
        const bounds = this.canvas.getBoundingClientRect();
        this.width = bounds.width;
        this.height = bounds.height;
        const scale = this.renderScale();
        this.canvas.width = Math.round(this.width * scale);
        this.canvas.height = Math.round(this.height * scale);
        this.context.setTransform(scale, 0, 0, scale, 0, 0);
        this.initialize();
        this.render(clock, 0);
        this.panel.classList.add('ready');
    }

    renderScale()
    {
        return Math.min(window.devicePixelRatio || 1, 2);
    }

    clear()
    {
        this.context.clearRect(0, 0, this.width, this.height);
    }

    interact() {}
}

class LifeDivider extends Artwork
{
    constructor(panel, seed)
    {
        super(panel);
        this.random = randomGenerator(seed);
    }

    initialize()
    {
        const style = getComputedStyle(this.panel);
        this.backgroundColor = style.getPropertyValue('--ts-color-canvas').trim();
        this.cellColor = style.getPropertyValue('--ts-color-textSecondary').trim();
        this.step = this.width < 570 ? 4 : 5;
        this.columns = Math.ceil(this.width / this.step);
        this.rows = Math.ceil(this.height / this.step);
        this.mask = new Uint8Array(this.columns * this.rows).fill(1);
        this.cells = new Uint8Array(this.mask.length);
        this.next = new Uint8Array(this.mask.length);
        this.glow = new Float32Array(this.mask.length);
        for (let y = 1; y < this.rows - 1; y++)
            for (let x = 1; x < this.columns - 1; x++)
                this.cells[y * this.columns + x] = this.random() < .16 ? 1 : 0;
        this.accumulator = 0;
        this.reseedTime = 0;
        this.dirty = true;
    }

    interact(burst = false)
    {
        const column = Math.floor(this.pointer.x / this.step);
        const row = Math.floor(this.pointer.y / this.step);
        const radius = burst ? 7 : 3;
        for (let y = row - radius; y <= row + radius; y++)
            for (let x = column - radius; x <= column + radius; x++)
            {
                if (x < 0 || y < 0 || x >= this.columns || y >= this.rows) continue;
                const q = y * this.columns + x;
                if (this.mask[q] && this.random() > .32)
                {
                    this.cells[q] = 1;
                    this.glow[q] = 1;
                }
            }
        this.dirty = true;
    }

    generation()
    {
        this.next.fill(0);
        for (let y = 1; y < this.rows - 1; y++)
            for (let x = 1; x < this.columns - 1; x++)
            {
                const q = y * this.columns + x;
                if (!this.mask[q]) continue;
                let neighbors = 0;
                for (let f = -1; f <= 1; f++)
                    for (let e = -1; e <= 1; e++)
                        if (f !== 0 || e !== 0) neighbors += this.cells[q + f * this.columns + e];
                this.next[q] = neighbors === 3 || (this.cells[q] && neighbors === 2) ? 1 : 0;
            }
        const previous = this.cells;
        this.cells = this.next;
        this.next = previous;
    }

    render(time, delta = 0)
    {
        const simulationDelta = delta * .5;
        this.accumulator += simulationDelta;
        this.reseedTime += simulationDelta;
        if (this.accumulator >= 160)
        {
            this.generation();
            this.accumulator %= 160;
            this.dirty = true;
        }
        if (this.reseedTime > 2600)
        {
            for (let q = 0; q < 5; q++)
            {
                const column = 3 + Math.floor(this.random() * Math.max(1, this.columns - 6));
                const row = 3 + Math.floor(this.random() * Math.max(1, this.rows - 6));
                for (let f = -2; f <= 2; f++)
                    for (let e = -2; e <= 2; e++)
                        if (this.random() < .5) this.cells[(row + f) * this.columns + column + e] = 1;
            }
            this.reseedTime = 0;
            this.dirty = true;
        }
        if (!this.dirty) return;
        this.dirty = false;
        const context = this.context;
        context.fillStyle = this.backgroundColor;
        context.fillRect(0, 0, this.width, this.height);
        context.fillStyle = this.cellColor;
        for (let y = 0; y < this.rows; y++)
            for (let x = 0; x < this.columns; x++)
                if (this.cells[y * this.columns + x])
                    context.fillRect(x * this.step, y * this.step, this.step - 1, this.step - 1);
    }
}

class ProceduralImprint extends Artwork
{
    constructor(panel)
    {
        super(panel);
        this.seed = previewProfile.seed ?? Math.floor(Math.random() * 0x100000000);
        this.random = randomGenerator(this.seed);
        this.dividers = [...panel.querySelectorAll('.life-divider')].map((element, q) => new LifeDivider(element, 8201 + q * 517));
        this.name = new TriangleName(panel, () => !paused && !reducedMotion.matches);
    }

    renderScale()
    {
        // Supersample contours on standard displays; keep the full-screen buffer bounded.
        const scale = Math.max(window.devicePixelRatio || 1, 2);
        const budget = Math.sqrt(16000000 / Math.max(1, this.width * this.height));
        return Math.min(scale, 3, Math.max(1, budget));
    }

    initialize()
    {
        if (this.geometry) this.geometry.resize(this.width, this.height);
        else this.geometry = new ContourScheduler(new ContourField(this.width, this.height, this.random), () => {
            if (this.panel.hidden || document.hidden) return;
            const start = previewProfile.begin();
            this.paint();
            previewProfile.end('foreground', start);
        }, previewProfile);
        this.drawnResult = null;
        for (const divider of this.dividers) divider.resize();
        this.name.initialize();
    }

    render(time, delta = 0)
    {
        for (const divider of this.dividers) divider.render(time, delta);
        this.name.render(delta, !paused && !reducedMotion.matches);
        this.geometry.request(time);
        this.paint();
    }

    paint()
    {
        const result = this.geometry.result;
        if (!result || result === this.drawnResult) return;
        this.drawnResult = result;
        const drawStart = previewProfile.begin();
        this.clear();
        const context = this.context;
        const coordinates = result.coordinates;
        context.lineWidth = 1.3;
        context.lineJoin = 'round';
        context.lineCap = 'round';
        for (const frame of result.frames)
        {
            for (const path of frame.paths)
            {
                context.strokeStyle = `rgba(230,230,226,${path.opacity})`;
                context.beginPath();
                for (let q = path.offset; q < path.offset + path.length; q += 2)
                {
                    if (q === path.offset) context.moveTo(coordinates[q], coordinates[q + 1]);
                    else context.lineTo(coordinates[q], coordinates[q + 1]);
                }
                if (path.closed) context.closePath();
                context.stroke();
            }
            context.fillStyle = '#ff7424';
            context.fillRect(frame.center.x - 3, frame.center.y - 3, 6, 6);
        }
        this.canvas.dataset.contourThread = this.geometry.worker ? 'worker' : 'main';
        this.canvas.dataset.contourFigures = result.frames.length;
        previewProfile.end('contourDraw', drawStart);
    }
}

function animate(now)
{
    animationFrame = 0;
    const interval = previousFrame ? now - previousFrame : 16;
    const delta = previousFrame ? Math.min(now - previousFrame, 40) : 16;
    previousFrame = now;
    clock += delta;
    const renderStart = previewProfile.begin();
    artwork.render(clock, delta);
    previewProfile.end('foreground', renderStart);
    previewProfile.frame(interval);
    if (!paused && !document.hidden) animationFrame = requestAnimationFrame(animate);
}

function startAnimation()
{
    cancelAnimationFrame(animationFrame);
    previousFrame = 0;
    animationFrame = 0;
    if (!paused && !document.hidden) animationFrame = requestAnimationFrame(animate);
}

async function initialize()
{
    await document.fonts.ready;
    artwork = new ProceduralImprint(document.querySelector('#imprint'));
    artwork.resize();
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => artwork.resize(), 120);
    });
    reducedMotion.addEventListener('change', event => {
        paused = event.matches;
        startAnimation();
        if (paused) artwork.render(clock, 0);
    });
    document.addEventListener('visibilitychange', startAnimation);
    startAnimation();
}

initialize().catch(error => {
    console.error('Unable to initialize the artwork', error);
    document.querySelector('.toast').textContent = 'Interactive artwork is unavailable in this browser.';
    document.querySelector('.toast').classList.add('visible');
});
