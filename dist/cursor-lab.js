(() => {
    const concepts = [
        ['echo', 'Elastic', 'A spring follows your pointer. Hover a link to lock onto its outline; click for an echo.'],
        ['shards', 'Shards', 'A small triangular swarm follows your motion. Click to scatter it into fragments.'],
        ['reticle', 'Reticle', 'A precision tool with coordinates and grid snapping. Click to leave a scanning marker.'],
        ['signal', 'Signal', 'A crisp pixel cursor with no movement trail. Click for the same circular echo as Elastic.']
    ];
    const canvas = document.querySelector('.cursor-canvas');
    const ctx = canvas.getContext('2d');
    const controls = document.querySelector('.cursor-controls');
    const description = document.querySelector('#cursor-description');
    const toggle = document.querySelector('.cursor-toggle');
    const fine = matchMedia('(any-hover: hover) and (any-pointer: fine)');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = { x: 0, y: 0, active: false, down: false };
    let mode = 'echo', enabled = true, frame = 0, previous = 0, lastMove = 0, elapsed = 0;
    let width = 0, height = 0, spring = { x: 0, y: 0 }, bursts = [];
    let targetBox = null, wasActive = false;
    const white = '#eeeeee', orange = '#ff7828';
    const line = (x, y, x2, y2) => { ctx.moveTo(x, y); ctx.lineTo(x2, y2); };
    const circle = (x, y, radius, stroke = white) => {
        ctx.strokeStyle = stroke; ctx.beginPath(); ctx.arc(x, y, Math.max(.1, radius), 0, Math.PI * 2); ctx.stroke();
    };
    const core = (size = 2) => { ctx.fillStyle = orange; ctx.fillRect(pointer.x - size / 2, pointer.y - size / 2, size, size); };
    function reset()
    {
        bursts = [];
        spring = { x: pointer.x, y: pointer.y }; targetBox = null;
        ctx.clearRect(0, 0, width, height);
    }
    function resize()
    {
        width = innerWidth; height = innerHeight;
        const scale = Math.min(devicePixelRatio || 1, 2, Math.sqrt(8000000 / (width * height)));
        canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
        ctx.setTransform(scale, 0, 0, scale, 0, 0); reset(); wake();
    }
    function choose(id)
    {
        mode = concepts.some(c => c[0] === id) ? id : 'echo';
        for (const button of controls.querySelectorAll('[data-cursor]')) button.setAttribute('aria-pressed', String(button.dataset.cursor === mode));
        const url = new URL(location.href); url.searchParams.set('cursor', mode); historyReplace(url);
        description.textContent = concepts.find(c => c[0] === mode)[2]; reset(); wake();
    }
    function historyReplace(url) { window.history.replaceState(null, '', url.pathname + url.search + url.hash); }
    function available() { return enabled && fine.matches && !document.hidden; }
    function stop()
    {
        cancelAnimationFrame(frame); frame = 0; previous = 0;
        document.body.classList.remove('cursor-custom');
        ctx.clearRect(0, 0, width, height);
    }
    function wake()
    {
        if (!available() || !pointer.active) { stop(); return; }
        document.body.classList.add('cursor-custom');
        if (!frame) frame = requestAnimationFrame(render);
    }
    function move(event)
    {
        if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
        const active = !event.target.closest('.cursor-controls') && !!event.target.closest('main');
        pointer.x = event.clientX; pointer.y = event.clientY; pointer.active = active;
        if (active && !wasActive) { spring.x = pointer.x; spring.y = pointer.y; }
        wasActive = active; lastMove = performance.now();
        const target = active ? event.target.closest('a,button') : null;
        targetBox = target?.getBoundingClientRect() || null;
        wake();
    }
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerdown', event => {
        move(event); if (!pointer.active || !available()) return;
        pointer.down = true; lastMove = performance.now();
        if (!reduce.matches)
        {
            bursts.push({ x: pointer.x, y: pointer.y, age: 0 }); bursts = bursts.slice(-8);
        }
        wake();
    });
    document.addEventListener('pointerup', () => { pointer.down = false; lastMove = performance.now(); wake(); });
    const leave = () => { pointer.active = false; pointer.down = false; wasActive = false; stop(); };
    document.documentElement.addEventListener('pointerleave', leave);
    window.addEventListener('blur', leave);
    document.addEventListener('keydown', event => { if (event.key === 'Tab') leave(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) leave(); });
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', () => { targetBox = null; }, { passive: true });
    fine.addEventListener('change', () => { leave(); updateToggle(); });
    reduce.addEventListener('change', () => { reset(); wake(); });
    controls.addEventListener('click', event => { const button = event.target.closest('[data-cursor]'); if (button) choose(button.dataset.cursor); });
    function updateToggle()
    {
        toggle.textContent = enabled ? 'Use system cursor' : 'Enable custom cursor';
        toggle.setAttribute('aria-pressed', String(enabled));
        document.querySelector('.cursor-note').textContent = !fine.matches ? 'Cursor studies need a mouse or trackpad. Your normal touch controls stay available.' : reduce.matches ? 'Reduced motion: static cursor previews. Move over the card to compare.' : 'Move over the card · hover links · click empty space';
    }
    toggle.addEventListener('click', () => { enabled = !enabled; reset(); updateToggle(); wake(); });

    function render(now)
    {
        frame = 0;
        if (!available() || !pointer.active) { stop(); return; }
        const dt = Math.min(40, previous ? now - previous : 16.67); previous = now; elapsed += dt;
        const f = dt / 16.67, staticMode = reduce.matches;
        ctx.clearRect(0, 0, width, height); ctx.lineWidth = 1; ctx.globalAlpha = 1; ctx.strokeStyle = white;
        const follow = 1 - Math.pow(.79, f);
        spring.x += (pointer.x - spring.x) * follow; spring.y += (pointer.y - spring.y) * follow;
        for (const burst of bursts) burst.age += dt;
        bursts = bursts.filter(burst => burst.age < 1200);
        if (staticMode)
        {
            if (mode === 'signal') drawSignal();
            else { circle(pointer.x,pointer.y,12); core(3); }
            return;
        }
        const handlers = { echo: drawEcho, shards: drawShards, reticle: drawReticle, signal: drawSignal };
        handlers[mode](f, dt);
        ctx.globalAlpha = 1;
        // Keep the resting cursor visible, but stop idle and hidden-tab frame loops.
        if (mode === 'signal' ? bursts.length > 0 : pointer.down || now - lastMove < 1900) frame = requestAnimationFrame(render);
        else previous = 0;
    }
    function drawEcho()
    {
        const speed = Math.hypot(pointer.x-spring.x,pointer.y-spring.y);
        ctx.save(); ctx.translate(spring.x,spring.y); ctx.rotate(Math.atan2(pointer.y-spring.y,pointer.x-spring.x));
        ctx.beginPath(); ctx.ellipse(0,0,18+Math.min(18,speed*.15),18/(1+speed*.012),0,0,Math.PI*2); ctx.stroke(); ctx.restore();
        if (targetBox)
        {
            ctx.globalAlpha = .55; ctx.strokeRect(targetBox.x-5,targetBox.y-5,targetBox.width+10,targetBox.height+10); ctx.globalAlpha = 1;
        }
        drawClickEcho();
        ctx.globalAlpha = 1; core(3);
    }
    function drawClickEcho()
    {
        for (const b of bursts) { ctx.globalAlpha = 1-b.age/1200; circle(b.x,b.y,18+b.age*.08); }
        ctx.globalAlpha = 1;
    }
    function drawShards()
    {
        for (let q=0;q<9;q++)
        {
            const a=q*2.399+elapsed*.0004, burst=bursts.length ? Math.max(0,1-bursts.at(-1).age/900) : 0;
            const radius=12+q*2+Math.sin(elapsed*.003+q)*4+burst*70;
            const x=spring.x+Math.cos(a)*radius, y=spring.y+Math.sin(a)*radius;
            ctx.save(); ctx.translate(x,y); ctx.rotate(a); ctx.globalAlpha=.3+q*.07; ctx.fillStyle=q===0?orange:white;
            ctx.beginPath(); ctx.moveTo(-3,-4);ctx.lineTo(5,0);ctx.lineTo(-3,4);ctx.closePath(); q%2 ? ctx.stroke() : ctx.fill();ctx.restore();
        }
        core();
    }
    function drawReticle()
    {
        const x=targetBox?targetBox.x+targetBox.width/2:Math.round(pointer.x/12)*12,y=targetBox?targetBox.y+targetBox.height/2:Math.round(pointer.y/12)*12;
        ctx.globalAlpha=.2;ctx.beginPath();line(x-70,y,x+70,y);line(x,y-70,x,y+70);ctx.stroke();ctx.globalAlpha=.9;
        ctx.strokeRect(x-10,y-10,20,20);ctx.fillStyle=white;ctx.font='9px monospace';ctx.fillText(Math.round(pointer.x)+' / '+Math.round(pointer.y),x+17,y-18);
        for(const b of bursts) {ctx.globalAlpha=1-b.age/1200;const r=15+b.age*.05;ctx.strokeRect(b.x-r,b.y-r,r*2,r*2);}
        ctx.globalAlpha=1;core();
    }
    function drawSignal()
    {
        const pattern=['1000','1100','1110','1000'];ctx.fillStyle=white;ctx.globalAlpha=1;
        for(let y=0;y<4;y++)for(let x=0;x<4;x++)if(pattern[y][x]==='1')ctx.fillRect(pointer.x+x*4,pointer.y+y*4,3,3);
        drawClickEcho();
    }
    resize(); choose(new URLSearchParams(location.search).get('cursor')); updateToggle();
})();
