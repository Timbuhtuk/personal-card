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
        this.homeTitle = document.title;
        this.target = 'home'; this.version = 0; this.frame = 0; this.complete = null; this.running = false;
        this.fx = document.createElement('canvas'); this.fx.className = 'about-seam';
        this.fx.setAttribute('aria-hidden','true'); this.surface.append(this.fx); this.context = this.fx.getContext('2d');
        this.root.classList.add('about-enhanced');
        const activate = (event, target) => {
            if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            if (this.root.classList.contains('entrance-running') || this.root.classList.contains('entrance-pending')) return;
            this.go(target);
        };
        this.link.addEventListener('click', event => activate(event, 'about'));
        this.back.addEventListener('click', event => activate(event, 'home'));
        const route = () => this.go(location.hash === '#about' ? 'about' : 'home', { history: false });
        window.addEventListener('popstate', route); window.addEventListener('hashchange', route);
        const settle = () => { if (this.running) this.go(this.target, { animate: false, history: false, force: true }); };
        window.addEventListener('resize', settle); reducedMotion.addEventListener('change', settle);
        window.addEventListener('personal-theme-change', settle);
        document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
        if (location.hash === '#about') this.go('about', { animate: false, history: false });
    }
    measure()
    {
        const bounds=this.surface.getBoundingClientRect(); this.width=bounds.width; this.height=bounds.height;
        const scale=Math.min(window.devicePixelRatio||1,1.5,Math.sqrt(3000000/(this.width*this.height)));
        this.fx.width=Math.round(this.width*scale);this.fx.height=Math.round(this.height*scale);
        this.context?.setTransform(scale,0,0,scale,0,0);
    }
    draw(t)
    {
        const geometry=LiquidSeam.geometry(t,this.width,this.height);
        this.about.style.clipPath=`path("${geometry.path}")`;
        const c=this.context;if(!c)return;
        c.clearRect(0,0,this.width,this.height);
        for(const edge of geometry.edges)
        {
            c.strokeStyle=`rgba(${window.PersonalTheme?.colors.inkRgb || '241,241,241'},${Math.max(0,edge.alpha*geometry.pulse)})`;c.lineWidth=edge.width;c.beginPath();
            edge.points.forEach((p,q)=>q?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();
        }
    }
    play(target)
    {
        return new Promise(resolve=>{
            this.complete=resolve;let time=0,previous=0;
            const tick=now=>{
                time+=previous?now-previous:0;previous=now;
                const t=Math.min(1,time/LiquidSeam.duration);this.draw(target==='about'?t:1-t);
                if(t<1)this.frame=requestAnimationFrame(tick);
                else{this.complete=null;resolve();}
            };
            this.frame=requestAnimationFrame(tick);
        });
    }
    cancel()
    {
        cancelAnimationFrame(this.frame);this.frame=0;
        const complete=this.complete;this.complete=null;complete?.();
        this.context?.clearRect(0,0,this.width||0,this.height||0);
    }
    async go(target, { animate = true, history: changeHistory = true, force = false } = {})
    {
        if(target===this.target&&!force)return;
        const version=++this.version;this.cancel();this.target=target;this.running=true;
        if(changeHistory)history.pushState(null,'',location.pathname+location.search+(target==='about'?'#about':''));
        this.about.hidden=false;this.about.inert=true;this.home.inert=true;
        this.panel.dataset.view='transition';this.root.classList.remove('is-about','entrance-pending');this.root.classList.add('about-transitioning');
        if(artwork?.name){artwork.name.pointer.active=false;artwork.name.motion?.settle();artwork.name.render(0,false);}
        if(target==='about')this.about.scrollTop=0;
        this.measure();this.draw(target==='about'?0:1);
        if(animate&&!reducedMotion.matches&&this.context)
        {
            await this.play(target);if(version!==this.version)return;
        }
        this.cancel();this.about.style.clipPath='none';
        if(target==='about')
        {
            this.root.classList.add('is-about');this.panel.dataset.view='about';this.about.inert=false;this.heading.focus({preventScroll:true});
        }
        else
        {
            this.about.hidden=true;this.home.inert=false;this.panel.dataset.view='home';this.link.focus({preventScroll:true});
        }
        this.root.classList.remove('about-transitioning');document.title=target==='about'?'Timbuhtuk — About':this.homeTitle;this.running=false;
    }
}
new AboutNavigation();
