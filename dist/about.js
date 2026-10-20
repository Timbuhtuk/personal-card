class AboutNavigation
{
    constructor()
    {
        this.root = document.documentElement;
        this.panel = document.querySelector('#imprint');
        this.surface = document.querySelector('.imprint-content');
        this.home = document.querySelector('.imprint-copy');
        this.link = document.querySelector('.about-link');
        this.about = document.querySelector('#about');
        this.back = document.querySelector('.about-back');
        this.heading = document.querySelector('#about-title');
        this.aboutFrame = document.querySelector('.about-frame');
        this.recordPreview = /[?&]recordPreview=1(?:&|$)/.test(location.search);
        this.recordEntrance = this.recordPreview ? location.search.match(/[?&]recordEntrance=(cue|spin|roll|trace|camera|scan)(?:&|$)/)?.[1] || 'cue' : 'cue';
        this.transitionDuration = this.recordPreview && /[?&]recordSlow=1(?:&|$)/.test(location.search) ? LiquidSeam.duration * 2 : LiquidSeam.duration;
        this.workLink = document.querySelector('.work-link');
        this.work = document.querySelector('#work');
        this.workFrame = document.querySelector('.work-frame');
        this.homeTitle = document.title;
        this.target = 'home'; this.version = 0; this.frame = 0; this.complete = null; this.running = false;
        this.layer = this.about; this.orientation = 'vertical'; this.pendingTarget = null;
        this.fx = document.createElement('canvas'); this.fx.className = 'about-seam';
        this.fx.setAttribute('aria-hidden', 'true'); this.surface.append(this.fx); this.context = this.fx.getContext('2d');
        this.root.classList.add('about-enhanced');
        const activate = (event, target) => {
            if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            if (this.root.classList.contains('entrance-running') || this.root.classList.contains('entrance-pending')) return;
            this.go(target);
        };
        this.link.addEventListener('click', event => activate(event, 'about'));
        this.back.addEventListener('click', event => activate(event, 'home'));
        if (this.aboutFrame)
        {
            this.link.addEventListener('pointerenter', () => this.prepareAbout().catch(() => {}), { once: true });
            this.link.addEventListener('focus', () => this.prepareAbout().catch(() => {}), { once: true });
            this.aboutFrame.addEventListener('pointerenter', () => window.dispatchEvent(new Event('personal-cursor-reset')));
        }
        if (this.work && this.workFrame && this.workLink)
        {
            this.workLink.addEventListener('click', event => activate(event, 'work'));
            this.workLink.addEventListener('pointerenter', () => this.prepareWork().catch(() => {}), { once: true });
            this.workLink.addEventListener('focus', () => this.prepareWork().catch(() => {}), { once: true });
            this.workFrame.addEventListener('pointerenter', () => window.dispatchEvent(new Event('personal-cursor-reset')));
            window.addEventListener('message', event => {
                if (event.source !== this.workFrame.contentWindow || event.origin !== location.origin) return;
                if (event.data?.type !== 'personal-work-navigation' || !['home', 'about'].includes(event.data.target)) return;
                this.go(event.data.target);
            });
        }
        const route = () => this.go(location.hash === '#about' ? 'about' : this.work && location.hash === '#work' ? 'work' : 'home', { history: false });
        window.addEventListener('popstate', route); window.addEventListener('hashchange', route);
        const settle = () => { if (this.running) this.go(this.pendingTarget || this.target, { animate: false, history: false, force: true }); };
        window.addEventListener('resize', settle); reducedMotion.addEventListener('change', settle);
        window.addEventListener('personal-theme-change', settle);
        document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
        if (location.hash === '#about' || (this.work && location.hash === '#work')) this.go(location.hash.slice(1), { animate: !!this.aboutFrame && this.recordPreview, history: false });
    }
    prepareWork()
    {
        if (this.workReady) return this.workReady;
        this.work.hidden = false;
        const bounds = this.surface.getBoundingClientRect();
        this.work.style.clipPath = `path("${LiquidSeam.geometry(0, bounds.width, bounds.height, 'horizontal').path}")`;
        this.work.inert = true;
        this.workReady = new Promise((resolve, reject) => {
            let timer;
            const finish = error => {
                clearTimeout(timer);
                this.workFrame.removeEventListener('load', loaded);
                this.workFrame.removeEventListener('error', failed);
                if (error) { this.workReady = null; reject(error); }
                else resolve();
            };
            const failed = () => finish(new Error('Work preview could not be loaded.'));
            const loaded = () => {
                try
                {
                    const content = this.workFrame.contentDocument;
                    if (!content?.querySelector('.project-list')) { failed(); return; }
                    Promise.resolve(content.fonts?.ready).then(() => finish(), failed);
                }
                catch { failed(); }
            };
            this.workFrame.addEventListener('load', loaded);
            this.workFrame.addEventListener('error', failed);
            timer = setTimeout(failed, 10000);
            this.workFrame.src = this.workFrame.dataset.src;
        });
        return this.workReady;
    }
    prepareAbout()
    {
        if (!this.aboutFrame) return Promise.resolve();
        if (this.aboutReady) return this.aboutReady;
        this.aboutReady = new Promise((resolve, reject) => {
            let timer;
            const finish = error => {
                clearTimeout(timer);
                this.aboutFrame.removeEventListener('load', loaded);
                this.aboutFrame.removeEventListener('error', failed);
                if (error) { this.aboutReady = null; reject(error); }
                else { this.notifyAbout('hidden'); resolve(); }
            };
            const failed = () => finish(new Error('About record could not be loaded.'));
            const loaded = () => {
                try
                {
                    const content = this.aboutFrame.contentDocument;
                    if (!content?.querySelector('#record-scene')) { failed(); return; }
                    Promise.resolve(this.aboutFrame.contentWindow.RecordStudyReady || content.fonts?.ready).then(() => finish(), failed);
                }
                catch { failed(); }
            };
            this.aboutFrame.addEventListener('load', loaded);
            this.aboutFrame.addEventListener('error', failed);
            timer = setTimeout(failed, 10000);
            const useWideLayout = !this.recordPreview || /[?&]recordLayout=wide(?:&|$)/.test(location.search);
            const layout = useWideLayout ? '&layout=wide' : '';
            this.aboutFrame.src = this.aboutFrame.dataset.src + '&entrance=' + this.recordEntrance + layout;
        });
        return this.aboutReady;
    }
    notifyAbout(phase, animate = false)
    {
        this.aboutFrame?.contentWindow?.postMessage({ type: 'personal-record-transition', phase, animate, duration: this.transitionDuration }, location.origin);
    }
    notifyWork(visible)
    {
        this.workFrame?.contentWindow?.postMessage({ type: 'personal-work-visibility', visible }, location.origin);
    }
    measure()
    {
        const bounds = this.surface.getBoundingClientRect(); this.width = bounds.width; this.height = bounds.height;
        const scale = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(3000000 / (this.width * this.height)));
        this.fx.width = Math.round(this.width * scale); this.fx.height = Math.round(this.height * scale);
        this.context?.setTransform(scale, 0, 0, scale, 0, 0);
    }
    draw(t)
    {
        const geometry = LiquidSeam.geometry(t, this.width, this.height, this.orientation);
        this.layer.style.clipPath = `path("${geometry.path}")`;
        const c = this.context; if (!c) return;
        c.clearRect(0, 0, this.width, this.height);
        for (const edge of geometry.edges)
        {
            c.strokeStyle = `rgba(${window.PersonalTheme?.colors.inkRgb || '241,241,241'},${Math.max(0, edge.alpha * geometry.pulse)})`; c.lineWidth = edge.width; c.beginPath();
            edge.points.forEach((p, q) => q ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke();
        }
    }
    play(target)
    {
        return new Promise(resolve => {
            this.complete = resolve; let time = 0, previous = 0;
            const tick = now => {
                time += previous ? now - previous : 0; previous = now;
                const t = Math.min(1, time / this.transitionDuration); this.draw(target === 'home' ? 1 - t : t);
                if (t < 1) this.frame = requestAnimationFrame(tick);
                else { this.complete = null; resolve(); }
            };
            this.frame = requestAnimationFrame(tick);
        });
    }
    cancel()
    {
        cancelAnimationFrame(this.frame); this.frame = 0;
        const complete = this.complete; this.complete = null; complete?.();
        this.context?.clearRect(0, 0, this.width || 0, this.height || 0);
    }
    async go(target, { animate = true, history: changeHistory = true, force = false } = {})
    {
        if (target === 'work' && !this.work) return;
        if (target === this.target && !force && !this.pendingTarget) return;
        if (target !== 'home' && this.target !== 'home' && target !== this.target)
        {
            const closedVersion = this.version + 1;
            await this.go('home', { animate, history: false });
            if (this.version === closedVersion && this.target === 'home') return this.go(target, { animate, history: changeHistory, force });
            return;
        }
        const version = ++this.version; this.cancel(); this.pendingTarget = target; this.running = true;
        if (target === 'about' && this.aboutFrame)
        {
            this.link.setAttribute('aria-busy', 'true');
            try { await this.prepareAbout(); }
            catch
            {
                this.link.removeAttribute('aria-busy');
                if (version !== this.version) return;
                this.pendingTarget = null; this.running = false; this.about.hidden = true;
                location.assign('record-lab.html?variant=graphic&copy=labels'); return;
            }
            this.link.removeAttribute('aria-busy');
            if (version !== this.version) return;
        }
        if (target === 'work')
        {
            this.workLink.setAttribute('aria-busy', 'true');
            try { await this.prepareWork(); }
            catch
            {
                this.workLink.removeAttribute('aria-busy');
                if (version !== this.version) return;
                this.pendingTarget = null; this.running = false; this.work.hidden = true;
                this.workLink.removeAttribute('aria-busy'); location.assign(this.workLink.href); return;
            }
            this.workLink.removeAttribute('aria-busy');
            if (version !== this.version) return;
        }
        const from = this.target;
        this.pendingTarget = null; this.target = target;
        const view = target === 'home' ? from : target;
        this.layer = view === 'work' ? this.work : this.about;
        this.orientation = view === 'work' ? 'horizontal' : 'vertical';
        const hash = target === 'home' ? '' : '#' + target;
        if (changeHistory) history.pushState(null, '', location.pathname + location.search + hash);
        this.about.hidden = this.layer !== this.about; this.about.inert = true;
        if (this.work) { this.work.hidden = this.layer !== this.work; this.work.inert = true; }
        this.home.inert = true;
        this.panel.dataset.view = 'transition'; this.root.classList.remove('is-about', 'is-work', 'entrance-pending'); this.root.classList.add('about-transitioning');
        this.notifyWork(false); window.dispatchEvent?.(new Event('personal-cursor-reset'));
        if (artwork?.name) { artwork.name.pointer.active = false; artwork.name.motion?.settle(); artwork.name.render(0, false); }
        if (target !== 'home') this.layer.scrollTop = 0;
        this.measure(); this.draw(target === 'home' ? 1 : 0);
        this.notifyAbout(target === 'about' ? 'enter' : from === 'about' ? 'leave' : 'hidden', animate && from !== target && !reducedMotion.matches);
        if (animate && from !== target && !reducedMotion.matches && this.context)
        {
            await this.play(target); if (version !== this.version) return;
        }
        this.cancel(); this.layer.style.clipPath = 'none';
        if (target === 'about')
        {
            this.root.classList.add('is-about'); this.panel.dataset.view = 'about'; this.about.inert = false; (this.aboutFrame || this.heading).focus({ preventScroll: true });
        }
        else if (target === 'work')
        {
            this.root.classList.add('is-work'); this.panel.dataset.view = 'work'; this.work.inert = false; this.workFrame.focus({ preventScroll: true }); this.notifyWork(true);
        }
        else
        {
            this.about.hidden = true; if (this.work) this.work.hidden = true;
            this.home.inert = false; this.panel.dataset.view = 'home';
            (view === 'work' ? this.workLink : this.link).focus({ preventScroll: true });
        }
        this.root.classList.remove('about-transitioning');
        this.notifyAbout(target === 'about' ? 'visible' : 'hidden');
        document.title = target === 'about' ? 'Timbuhtuk — About' : target === 'work' ? 'Timbuhtuk — Selected work' : this.homeTitle;
        this.running = false;
    }
}
new AboutNavigation();
