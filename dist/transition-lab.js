class TransitionLab
{
    constructor()
    {
        this.root = document.documentElement;
        this.panel = document.querySelector('#imprint');
        this.surface = document.querySelector('.imprint-content');
        this.about = document.querySelector('#about');
        this.home = document.createElement('div');
        this.home.className = 'transition-home';
        this.surface.prepend(this.home);
        for (const element of [...this.surface.children])
            if (element.matches('.imprint-art, .imprint-name-art, .imprint-copy')) this.home.append(element);
        this.fx = document.createElement('canvas');
        this.fx.className = 'transition-fx'; this.fx.setAttribute('aria-hidden', 'true');
        this.surface.append(this.fx); this.ctx = this.fx.getContext('2d');
        if (!this.ctx) throw Error('Canvas is unavailable.');
        this.controls = document.querySelector('.transition-controls');
        this.slider = document.querySelector('#transition-seek');
        this.status = document.querySelector('#transition-status');
        this.toggle = document.querySelector('#transition-toggle');
        this.pause = document.querySelector('#transition-pause');
        this.slow = document.querySelector('#transition-slow');
        this.time = document.querySelector('#transition-time');
        this.mode = 'slash'; this.view = 'home'; this.scene = null;
        this.last = { from: 'home', target: 'about' }; this.rate = 1; this.frame = 0; this.playing = false;
        this.root.classList.add('about-enhanced');
        this.measure();
        this.choose(new URLSearchParams(location.search).get('transition'), false);
        this.settle(location.hash === '#about' ? 'about' : 'home', false);
        for (const button of this.controls.querySelectorAll('button')) button.disabled = false;
        this.slider.disabled = false;
        this.controls.addEventListener('click', event => {
            const button = event.target.closest('[data-transition]');
            if (button) this.choose(button.dataset.transition);
        });
        this.toggle.addEventListener('click', () => this.go(this.view === 'home' ? 'about' : 'home'));
        document.querySelector('#transition-replay').addEventListener('click', () => this.go(this.last.target, { from: this.last.from, history: false }));
        this.pause.addEventListener('click', () => {
            if (!this.scene) this.go(this.last.target, { from: this.last.from, history: false });
            else if (this.playing) { this.playing = false; cancelAnimationFrame(this.frame); this.update(); }
            else { this.playing = true; this.previous = 0; this.frame = requestAnimationFrame(now => this.tick(now)); this.update(); }
        });
        this.slow.addEventListener('click', () => {
            this.rate = this.rate === 1 ? .5 : 1; this.slow.setAttribute('aria-pressed', String(this.rate === .5));
        });
        this.slider.addEventListener('input', () => {
            const value = Number(this.slider.value) / 1000;
            if (!this.scene) this.prepare(this.last.from, this.last.target);
            this.playing = false; cancelAnimationFrame(this.frame);
            this.scene.time = value * this.scene.duration; this.draw(value); this.update();
        });
        for (const [selector, target] of [['.about-link', 'about'], ['.about-back', 'home']])
            document.querySelector(selector).addEventListener('click', event => {
                if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault(); this.go(target, { event });
            });
        const route = () => this.go(location.hash === '#about' ? 'about' : 'home', { history: false });
        window.addEventListener('popstate', route); window.addEventListener('hashchange', route);
        window.addEventListener('resize', () => { this.settle(this.scene?.target || this.view, false); this.measure(); });
        window.addEventListener('personal-theme-change', () => {
            if (this.scene) this.draw(this.scene.time / this.scene.duration);
        });
        reducedMotion.addEventListener('change', () => { if (this.scene) this.settle(this.scene.target, false); this.update(); });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) { this.resume = this.playing; this.playing = false; cancelAnimationFrame(this.frame); }
            else if (this.resume && this.scene) { this.resume = false; this.playing = true; this.previous = 0; this.frame = requestAnimationFrame(now => this.tick(now)); }
            this.update();
        });
    }
    measure()
    {
        const bounds = this.surface.getBoundingClientRect(); this.width = bounds.width; this.height = bounds.height;
        this.scale = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(3000000 / (this.width * this.height)));
        this.fx.width = Math.round(this.width * this.scale); this.fx.height = Math.round(this.height * this.scale);
        this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    }
    choose(id, play = true)
    {
        if (this.scene) this.settle(this.scene.target, false);
        this.mode = Object.hasOwn(TransitionMotion.variants, id) ? id : 'slash';
        for (const button of this.controls.querySelectorAll('[data-transition]')) button.setAttribute('aria-pressed', String(button.dataset.transition === this.mode));
        document.querySelector('#transition-description').textContent = TransitionMotion.variants[this.mode][2];
        const url = new URL(location.href); url.searchParams.set('transition', this.mode); history.replaceState(null, '', url);
        if (play) this.go('about', { from: 'home', history: false });
    }
    clearStyles()
    {
        this.home.removeAttribute('style'); this.about.removeAttribute('style');
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.root.classList.remove('is-about', 'transition-running');
    }
    prepare(from, target, event)
    {
        cancelAnimationFrame(this.frame); this.resume = false; this.clearStyles();
        artwork.name.pointer.active = false; artwork.name.motion?.settle(); artwork.name.render(0, false);
        this.about.hidden = false; this.home.inert = true; this.about.inert = true;
        this.about.scrollTop = 0; this.panel.dataset.view = 'transition'; this.root.classList.add('transition-running');
        const bounds = this.surface.getBoundingClientRect(), link = document.querySelector('.about-link').getBoundingClientRect();
        this.center = { x: Math.max(0, Math.min(this.width, event?.detail ? event.clientX - bounds.x : link.x + link.width / 2 - bounds.x)),
            y: Math.max(0, Math.min(this.height, event?.detail ? event.clientY - bounds.y : link.y + link.height / 2 - bounds.y)) };
        this.out = from === 'home' ? this.home : this.about;
        this.in = target === 'home' ? this.home : this.about;
        const closing = this.mode === 'tear' && target === 'home';
        this.out.style.zIndex = closing ? 2 : 1; this.in.style.zIndex = closing ? 1 : 2;
        this.scene = { from, target, duration: TransitionMotion.variants[this.mode][1], time: 0 };
        this.last = { from, target };
        this.view = target;
        this.draw(0);
    }
    go(target, { from = this.scene?.target || this.view, history: changeHistory = true, event } = {})
    {
        if (from === target) return;
        this.prepare(from, target, event);
        const url = location.pathname + location.search + (target === 'about' ? '#about' : '');
        if (changeHistory) history.pushState(null, '', url); else history.replaceState(null, '', url);
        if (reducedMotion.matches) { this.settle(target); return; }
        this.playing = true; this.previous = 0; this.update();
        this.frame = requestAnimationFrame(now => this.tick(now));
    }
    tick(now)
    {
        if (!this.playing || !this.scene) return;
        const delta = this.previous ? Math.min(50, now - this.previous) : 0; this.previous = now;
        this.scene.time = Math.min(this.scene.duration, this.scene.time + delta * this.rate);
        const t = this.scene.time / this.scene.duration; this.draw(t); this.update();
        if (t >= 1) this.settle(this.scene.target);
        else this.frame = requestAnimationFrame(time => this.tick(time));
    }
    settle(target, focus = true)
    {
        cancelAnimationFrame(this.frame); this.playing = false; this.scene = null; this.resume = false;
        this.clearStyles(); this.view = target;
        this.home.inert = target === 'about'; this.about.inert = target !== 'about'; this.about.hidden = target !== 'about';
        this.root.classList.toggle('is-about', target === 'about'); this.panel.dataset.view = target;
        this.surface.dataset.transitionProgress = '100';
        document.title = 'Timbuhtuk — Transition studies';
        const url = location.pathname + location.search + (target === 'about' ? '#about' : ''); history.replaceState(null, '', url);
        if (focus) document.querySelector(target === 'about' ? '#about-title' : '.about-link').focus({ preventScroll: true });
        this.update();
    }
    update()
    {
        this.toggle.textContent = this.view === 'home' ? 'Open About →' : '← Back to home';
        this.pause.textContent = this.playing ? 'Pause' : this.scene ? 'Play' : 'Play again';
        this.status.textContent = reducedMotion.matches ? 'Reduced motion · manual timeline available' : this.scene ? `${this.scene.from === 'home' ? 'Home → About' : 'About → Home'} · ${this.playing ? 'Playing' : 'Paused'}` : `${this.view === 'home' ? 'Home' : 'About'} · Ready`;
        this.slider.value = this.scene ? Math.round(this.scene.time / this.scene.duration * 1000) : 1000;
        const duration = TransitionMotion.variants[this.mode][1];
        this.time.value = `${((this.scene?.time ?? duration)/1000).toFixed(2)} / ${(duration/1000).toFixed(2)} s`;
    }
    draw(t)
    {
        const M = TransitionMotion, e = M.smooth(t), w = this.width, h = this.height, c = this.ctx;
        this.ctx.clearRect(0,0,w,h); this.surface.dataset.transitionProgress = String(Math.round(t*100));
        for (const node of [this.out,this.in])
            Object.assign(node.style, { opacity: '1', visibility: 'visible', transform: 'none', clipPath: 'none', maskImage: 'none', filter: 'none' });
        const direction = this.scene.target === 'about' ? 1 : -1;
        if (this.mode === 'slash')
        {
            const x=-h+(w+h)*e;
            this.in.style.clipPath=`polygon(0 0,${x+h}px 0,${x}px 100%,0 100%)`;
            c.strokeStyle=`rgba(${window.PersonalTheme?.colors.inkRgb || '241,241,241'},${Math.sin(t*Math.PI)*.8})`;c.lineWidth=2;
            c.beginPath();c.moveTo(x+h,0);c.lineTo(x,h);c.stroke();
            this.out.style.transform=`translateX(${-direction*e*25}px)`;
        }
        else if (this.mode === 'portal')
        {
            const center=this.center, max=Math.hypot(Math.max(center.x,w-center.x),Math.max(center.y,h-center.y))+60;
            const radius=max*e, points=[];
            for(let q=0;q<96;q++) {const a=q/96*Math.PI*2,r=radius+Math.sin(a*5+t*8)*22*Math.sin(t*Math.PI);points.push(`${center.x+Math.cos(a)*r}px ${center.y+Math.sin(a)*r}px`);}
            this.in.style.clipPath=`polygon(${points.join(',')})`;
            this.in.style.transform=`scale(${1.08-.08*e})`;
            for(let q=0;q<8;q++)
            {
                c.strokeStyle=`rgba(${window.PersonalTheme?.colors.inkRgb || '241,241,241'},${Math.sin(t*Math.PI)*(.65-q*.065)})`;c.lineWidth=.8;c.beginPath();
                for(let k=0;k<=96;k++){const a=k/96*Math.PI*2,r=radius+q*8+Math.sin(a*5+t*8+q*.12)*22*Math.sin(t*Math.PI);const x=center.x+Math.cos(a)*r,y=center.y+Math.sin(a)*r;k?c.lineTo(x,y):c.moveTo(x,y);}
                c.stroke();
            }
        }
        else
        {
            const closing=this.mode==='tear'&&this.scene.target==='home';
            const geometry=M.geometry(this.mode,closing?1-t:t,w,h,this.center);
            const masked=closing?this.out:this.in;
            masked.style.clipPath=`path("${geometry.masks.map(points=>M.polygon(points)).join(' ')}")`;
            for(const edge of geometry.edges)
            {
                c.strokeStyle=`rgba(${window.PersonalTheme?.colors.inkRgb || '241,241,241'},${M.clamp(edge.alpha*geometry.pulse)})`;c.lineWidth=edge.width;c.beginPath();
                edge.points.forEach((p,q)=>q?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();
            }
        }
    }
    static async ready()
    {
        await document.fonts.ready;
        await Promise.all([...document.images].map(image=>image.decode().catch(()=>{})));
        await new Promise((resolve,reject)=>{
            const deadline=performance.now()+8000;
            const check=()=>{if(artwork?.name?.motion&&artwork.drawnResult)resolve();else if(performance.now()>deadline)reject(Error('Artwork preparation timed out.'));else setTimeout(check,50);};check();
        });
    }
}
TransitionLab.ready().then(()=>new TransitionLab()).catch(error=>{
    document.querySelector('#transition-status').textContent='Preview unavailable. Reload to retry.';
    console.error(error);
});
