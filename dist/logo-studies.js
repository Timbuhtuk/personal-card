class LogoStudies
{
    static logos = [
        ['csharp', 'C#'], ['cplusplus', 'C++'], ['python', 'Python'], ['wpf-unofficial', 'WPF', 'wide'],
        ['unreal-engine', 'Unreal Engine'], ['react', 'React'], ['postman', 'Postman'], ['typescript', 'TypeScript'],
        ['github', 'GitHub'], ['javascript', 'JavaScript'], ['dotnet', '.NET'], ['visual-studio', 'Visual Studio'],
        ['git', 'Git'], ['microsoft-sql-server', 'Microsoft SQL Server', 'tall']
    ];

    static async ready()
    {
        await Promise.all(this.logos.map(async logo => {
            const image = new Image();
            image.src = this.source(logo);
            await image.decode();
        }));
    }

    static source(logo) { return `assets/technology-logos/svg/${logo[0]}.svg`; }

    static image(logo)
    {
        const image = document.createElement('img');
        image.className = `technology-icon${logo[2] ? ' technology-icon--' + logo[2] : ''}`;
        image.src = this.source(logo);
        image.alt = logo[1];
        image.width = image.height = 44;
        image.draggable = false;
        return image;
    }

    constructor(surface, copy)
    {
        this.surface = surface;
        this.copy = copy;
        this.stack = document.createElement('ul');
        this.stack.className = 'technology-stack';
        this.stack.setAttribute('aria-label', 'Technologies');
        this.stack.hidden = true;
        copy.append(this.stack);
        this.sides = document.createElement('div');
        this.sides.className = 'technology-ribbons';
        this.sides.hidden = true;
        surface.append(this.sides);
        this.dock = document.createElement('div');
        this.dock.className = 'technology-ribbons-dock';
        this.dock.hidden = true;
        copy.append(this.dock);
        this.loops = [];
        this.looping = false;
        this.ribbonTime = 0;
        this.resizeFrame = 0;
        window.addEventListener('resize', () => {
            if (this.mode !== 'logoRails') return;
            cancelAnimationFrame(this.resizeFrame);
            this.resizeFrame = requestAnimationFrame(() => {
                this.resizeFrame = 0;
                if (this.mode === 'logoRails') this.buildRibbons();
            });
        });
        document.addEventListener('visibilitychange', () => {
            for (const loop of this.loops)
                if (this.looping && !document.hidden) loop.play();
                else loop.pause();
        });
    }

    reset()
    {
        cancelAnimationFrame(this.resizeFrame);
        this.resizeFrame = 0;
        this.looping = false;
        for (const loop of this.loops) loop.cancel();
        this.loops = [];
        this.ribbonTime = 0;
        this.sides.style.opacity = this.dock.style.opacity = 0;
        this.copy.classList.remove('technology-drop-active');
        for (const slot of this.stack.children)
        {
            slot.style.opacity = 0;
            slot.style.removeProperty('transform');
        }
    }

    configure(mode)
    {
        this.reset();
        this.stack.hidden = mode !== 'logoDrop';
        this.sides.hidden = this.dock.hidden = mode !== 'logoRails';
        this.mode = mode;
        if (mode === 'logoDrop')
        {
            this.stack.replaceChildren();
            const ranks = LogoMotion.shuffle(Array.from({ length: LogoStudies.logos.length }, (_, q) => q));
            const logos = LogoMotion.shuffle(LogoStudies.logos);
            for (let q = 0; q < logos.length; q++)
            {
                const slot = document.createElement('li');
                slot.className = 'technology-slot';
                slot.dataset.rank = ranks[q];
                slot.dataset.turn = (Math.random() - .5) * 130;
                slot.append(LogoStudies.image(logos[q]));
                this.stack.append(slot);
            }
        }
        if (mode === 'logoRails')
        {
            this.sides.replaceChildren();
            this.dock.replaceChildren();
            const logos = LogoMotion.shuffle(LogoStudies.logos);
            for (const container of [this.sides, this.dock])
                for (let q = 0; q < 2; q++)
                {
                    const ribbon = document.createElement('div');
                    ribbon.className = `technology-ribbon technology-ribbon--${q ? 'right' : 'left'}`;
                    const track = document.createElement('div');
                    track.className = 'technology-track';
                    track.dataset.axis = container === this.sides ? 'Y' : 'X';
                    track.dataset.duration = q ? 22000 : 18000;
                    for (let repeat = 0; repeat < 2; repeat++)
                    {
                        const sequence = document.createElement('div');
                        sequence.className = 'technology-sequence';
                        if (repeat) sequence.setAttribute('aria-hidden', 'true');
                        for (const logo of logos.slice(q * 7, q * 7 + 7)) sequence.append(LogoStudies.image(logo));
                        track.append(sequence);
                    }
                    ribbon.append(track);
                    container.append(ribbon);
                }
        }
    }

    measure()
    {
        const stack = this.stack.getBoundingClientRect();
        this.slots = [...this.stack.children].map(slot => {
            const rect = slot.getBoundingClientRect();
            return { slot, rank: Number(slot.dataset.rank), turn: Number(slot.dataset.turn),
                offset: { x: stack.x + stack.width / 2 - rect.x - rect.width / 2,
                    y: stack.y - 38 - rect.y - rect.height / 2 } };
        });
    }

    drop(time)
    {
        this.copy.classList.add('technology-drop-active');
        for (const { slot, rank, turn, offset } of this.slots)
        {
            const pose = LogoMotion.drop(time, rank, offset, turn);
            slot.style.opacity = pose.opacity * .78;
            slot.style.transform = `translate(${pose.x}px,${pose.y}px) rotate(${pose.rotation}deg) scale(${pose.scale})`;
        }
    }

    buildRibbons()
    {
        const time = this.loops[0]?.currentTime ?? this.ribbonTime;
        for (const loop of this.loops) loop.cancel();
        this.loops = [];
        for (const track of [...this.sides.querySelectorAll('.technology-track'), ...this.dock.querySelectorAll('.technology-track')])
        {
            const axis = track.dataset.axis;
            const sequence = track.firstElementChild;
            const bounds = sequence.getBoundingClientRect();
            const period = axis === 'Y' ? bounds.height : bounds.width;
            const viewport = axis === 'Y' ? track.parentElement.clientHeight : track.parentElement.clientWidth;
            if (!period || !viewport) continue;
            const copies = LogoMotion.ribbonCopies(viewport, period);
            while (track.children.length < copies)
            {
                const clone = sequence.cloneNode(true);
                clone.setAttribute('aria-hidden', 'true');
                track.append(clone);
            }
            while (track.children.length > copies) track.lastElementChild.remove();
            const loop = track.animate([{ transform: `translate${axis}(-${period}px)` }, { transform: `translate${axis}(0)` }],
                { duration: Number(track.dataset.duration), iterations: Infinity, easing: 'linear' });
            loop.pause();
            loop.playbackRate = this.rate || 1;
            loop.currentTime = time;
            if (this.looping && !document.hidden) loop.play();
            this.loops.push(loop);
        }
    }

    ribbons(time)
    {
        if (!this.loops.length) this.buildRibbons();
        const reveal = EntranceMotion.smooth(time, 2920, 3550);
        this.sides.style.opacity = this.dock.style.opacity = reveal * .5;
        this.ribbonTime = Math.max(0, time - 3000);
        for (const loop of this.loops) loop.currentTime = this.ribbonTime;
    }

    toggleLoop()
    {
        if (reducedMotion.matches) return;
        this.looping = !this.looping;
        for (const loop of this.loops)
            if (this.looping && !document.hidden) loop.play();
            else loop.pause();
    }

    setRate(rate)
    {
        this.rate = rate;
        for (const loop of this.loops) loop.playbackRate = rate;
    }

    complete(time)
    {
        if (this.mode === 'logoDrop')
        {
            for (const slot of this.stack.children)
            {
                slot.style.opacity = .78;
                slot.style.removeProperty('transform');
            }
            this.copy.classList.remove('technology-drop-active');
        }
        if (this.mode === 'logoRails')
        {
            this.ribbons(time);
            if (!reducedMotion.matches) this.toggleLoop();
        }
    }
}

// These studies extend the preview only; the published card keeps Hybrid+.
EntranceMotion.variants.logoDrop = { number: '07', title: 'Drop', duration: 4650,
    description: 'Hybrid+, then fourteen logos tumble into place below the links. Replay reshuffles them.' };
EntranceMotion.variants.logoRails = { number: '08', title: 'Ribbons', duration: 6500,
    description: 'Hybrid+, then endless side ribbons. On narrow screens, ribbons run below the links.' };

class LogoEntranceAnimation extends EntranceAnimation
{
    constructor(options)
    {
        super(options);
        this.logos = new LogoStudies(this.surface, this.heading.parentElement);
        window.removeEventListener('resize', this.onResize);
        this.onResize = () => {
            if (this.playing || document.documentElement.classList.contains('entrance-running')) this.finish();
        };
        window.addEventListener('resize', this.onResize);
    }

    async start(mode)
    {
        this.request++;
        cancelAnimationFrame(this.frame);
        this.playing = false;
        this.resetVisuals();
        this.logos.configure(mode);
        artwork.resize();
        return super.start(mode);
    }

    resetVisuals()
    {
        super.resetVisuals();
        this.logos?.reset();
        this.pageSettled = false;
    }

    measure()
    {
        super.measure();
        this.logos.measure();
    }

    render()
    {
        if (!['logoDrop', 'logoRails'].includes(this.mode)) return super.render();
        try
        {
            if (this.time < 2850)
            {
                this.context.clearRect(0, 0, this.width, this.height);
                this.hybridTrace();
            }
            else if (!this.pageSettled)
            {
                super.resetVisuals();
                document.documentElement.classList.remove('entrance-running');
                this.heading.parentElement.inert = false;
                paused = reducedMotion.matches;
                startAnimation();
                this.pageSettled = true;
            }
            if (this.mode === 'logoDrop') this.logos.drop(this.time);
            else this.logos.ribbons(this.time);
            return true;
        }
        catch (error)
        {
            this.finish();
            console.warn('Logo study skipped', error);
            return false;
        }
    }

    finish()
    {
        super.finish();
        this.logos.complete(this.duration);
        this.updateControls();
    }

    togglePlay()
    {
        if (this.mode === 'logoRails' && this.time >= this.duration)
        {
            this.logos.toggleLoop();
            this.updateControls();
        }
        else super.togglePlay();
    }
}
