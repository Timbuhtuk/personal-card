class AboutNavigation
{
    static circle(width, height, x, y)
    {
        x = Math.max(0, Math.min(width, x));
        y = Math.max(0, Math.min(height, y));
        const radius = Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) + 2;
        return { x, y, radius };
    }

    constructor()
    {
        this.root = document.documentElement;
        this.panel = document.querySelector('#imprint');
        this.surface = document.querySelector('.imprint-content');
        this.home = document.querySelector('.imprint-copy');
        this.link = document.querySelector('.about-link');
        this.about = document.querySelector('#about');
        this.content = document.querySelector('.about-inner');
        this.back = document.querySelector('.about-back');
        this.heading = document.querySelector('#about-title');
        this.homeTitle = document.title;
        this.target = 'home';
        this.version = 0;
        this.animations = [];
        this.running = false;
        this.root.classList.add('about-enhanced');
        const activate = (event, target) => {
            if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            if (this.root.classList.contains('entrance-running')) return;
            this.go(target, { event });
        };
        this.link.addEventListener('click', event => activate(event, 'about'));
        this.back.addEventListener('click', event => activate(event, 'home'));
        const route = () => this.go(location.hash === '#about' ? 'about' : 'home', { history: false });
        window.addEventListener('popstate', route);
        window.addEventListener('hashchange', route);
        const settle = () => { if (this.running) this.go(this.target, { animate: false, history: false, force: true }); };
        window.addEventListener('resize', settle);
        reducedMotion.addEventListener('change', settle);
        document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
        if (location.hash === '#about') this.go('about', { animate: false, history: false });
    }

    origin(event)
    {
        const bounds = this.surface.getBoundingClientRect();
        const anchor = this.link.getBoundingClientRect();
        const x = event?.detail ? event.clientX : anchor.x + anchor.width / 2;
        const y = event?.detail ? event.clientY : anchor.y + anchor.height / 2;
        return AboutNavigation.circle(bounds.width, bounds.height, x - bounds.x, y - bounds.y);
    }

    async play(element, frames, options)
    {
        const animation = element.animate(frames, options);
        this.animations.push(animation);
        await animation.finished.catch(() => {});
    }

    cancel()
    {
        for (const animation of this.animations) animation.cancel();
        this.animations = [];
    }

    async go(target, { event, animate = true, history: changeHistory = true, force = false } = {})
    {
        if (target === this.target && !force) return;
        const version = ++this.version;
        this.cancel();
        this.target = target;
        this.running = true;
        if (changeHistory)
            history.pushState(null, '', location.pathname + location.search + (target === 'about' ? '#about' : ''));
        const circle = this.origin(event);
        const closed = `circle(0px at ${circle.x}px ${circle.y}px)`;
        const open = `circle(${circle.radius}px at ${circle.x}px ${circle.y}px)`;
        const motion = animate && !reducedMotion.matches && typeof this.about.animate === 'function';
        this.about.hidden = false;
        this.about.inert = true;
        this.home.inert = true;
        this.panel.dataset.view = 'transition';
        this.root.classList.remove('is-about', 'entrance-pending');
        this.root.classList.add('about-transitioning');
        if (artwork?.name)
        {
            artwork.name.pointer.active = false;
            artwork.name.motion?.settle();
            artwork.name.render(0, false);
        }
        this.content.style.opacity = target === 'about' ? 0 : 1;
        this.about.style.clipPath = target === 'about' ? closed : open;
        if (target === 'about') this.about.scrollTop = 0;
        if (motion)
        {
            if (target === 'home')
            {
                await this.play(this.content, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' });
                if (version !== this.version) return;
            }
            await this.play(this.about, [{ clipPath: target === 'about' ? closed : open }, { clipPath: target === 'about' ? open : closed }],
                { duration: target === 'about' ? 780 : 650, easing: 'cubic-bezier(.65,0,.18,1)', fill: 'forwards' });
            if (version !== this.version) return;
        }
        this.about.style.clipPath = 'none';
        if (target === 'about')
        {
            this.root.classList.add('is-about');
            this.panel.dataset.view = 'about';
            this.content.style.opacity = 1;
            if (motion)
            {
                await this.play(this.content, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
                    { duration: 320, easing: 'ease-out', fill: 'forwards' });
                if (version !== this.version) return;
            }
            this.about.inert = false;
            this.heading.focus({ preventScroll: true });
        }
        else
        {
            this.about.hidden = true;
            this.home.inert = false;
            this.panel.dataset.view = 'home';
            this.link.focus({ preventScroll: true });
        }
        this.cancel();
        this.content.style.removeProperty('opacity');
        this.root.classList.remove('about-transitioning');
        document.title = target === 'about' ? 'Timbuhtuk — About' : this.homeTitle;
        this.running = false;
    }
}

new AboutNavigation();
