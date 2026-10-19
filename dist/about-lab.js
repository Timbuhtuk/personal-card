(() => {
    const technologies = [
        ['csharp', 'C#', 'Application logic'],
        ['cplusplus', 'C++', 'Game systems'],
        ['python', 'Python', 'Scripts & experiments'],
        ['wpf-unofficial', 'WPF', 'Desktop interfaces', 'wide'],
        ['unreal-engine', 'Unreal Engine', 'Procedural worlds'],
        ['react', 'React', 'Web interfaces'],
        ['typescript', 'TypeScript', 'Web applications'],
        ['javascript', 'JavaScript', 'Interactive details'],
        ['dotnet', '.NET', 'Services & applications'],
        ['microsoft-sql-server', 'SQL Server', 'Structured data'],
        ['git', 'Git', 'Version control'],
        ['github', 'GitHub', 'Code & collaboration'],
        ['postman', 'Postman', 'API exploration'],
        ['visual-studio', 'Visual Studio', 'Everyday development']
    ];
    const panels = [...document.querySelectorAll('.study-panel')];
    const choices = [...document.querySelectorAll('[data-variant]')];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const fine = matchMedia('(min-width: 761px) and (hover: hover) and (pointer: fine)');
    const descriptions = {
        editorial: '01 / An editorial introduction.',
        statement: '02 / One idea, with projects between the lines.',
        living: '03 / Different tools. One connected system.'
    };
    let current = '';

    function logo(technology)
    {
        const img = document.createElement('img');
        img.src = 'assets/technology-logos/svg/' + technology[0] + '.svg';
        img.alt = ''; img.width = 27; img.height = 27; img.draggable = false;
        if (technology[3]) img.className = technology[3];
        return img;
    }
    for (const strip of document.querySelectorAll('[data-tech-strip]'))
        for (const technology of technologies)
        {
            const item = document.createElement('li');
            item.title = technology[1]; item.setAttribute('aria-label', technology[1]);
            item.append(logo(technology)); strip.append(item);
        }

    class LifeBand
    {
        constructor(canvas)
        {
            this.canvas = canvas; this.context = canvas.getContext('2d');
            this.resize();
        }
        resize()
        {
            this.width = this.canvas.clientWidth; this.height = this.canvas.clientHeight;
            this.columns = Math.max(1, Math.floor(this.width / 5)); this.rows = Math.max(1, Math.floor(this.height / 5));
            const scale = Math.min(devicePixelRatio || 1, 2);
            this.canvas.width = Math.round(this.width * scale); this.canvas.height = Math.round(this.height * scale);
            this.context?.setTransform(scale, 0, 0, scale, 0, 0);
            this.seed(); this.paint();
        }
        seed()
        {
            this.cells = new Uint8Array(this.columns * this.rows);
            const patterns = [[[0,0],[1,0],[2,0],[2,1],[1,2]], [[1,0],[2,0],[0,1],[1,1],[1,2]]];
            for (let q = 0; q < Math.max(5, this.columns / 15); q++)
            {
                const x = Math.floor(Math.random() * this.columns), y = Math.floor(Math.random() * this.rows);
                for (const [dx, dy] of patterns[q % patterns.length])
                    this.cells[((y + dy) % this.rows) * this.columns + (x + dx) % this.columns] = 1;
            }
        }
        step()
        {
            const next = new Uint8Array(this.cells.length);
            let count = 0;
            for (let y = 0; y < this.rows; y++)
                for (let x = 0; x < this.columns; x++)
                {
                    let neighbors = 0;
                    for (let dy = -1; dy <= 1; dy++)
                        for (let dx = -1; dx <= 1; dx++)
                            if (dx || dy) neighbors += this.cells[((y + dy + this.rows) % this.rows) * this.columns + (x + dx + this.columns) % this.columns];
                    const index = y * this.columns + x;
                    next[index] = neighbors === 3 || (this.cells[index] && neighbors === 2) ? 1 : 0;
                    count += next[index];
                }
            this.cells = next;
            if (count < 8) this.seed();
            this.paint();
        }
        paint()
        {
            if (!this.context) return;
            this.context.clearRect(0, 0, this.width, this.height);
            this.context.fillStyle = window.PersonalTheme.colors.cell;
            for (let q = 0; q < this.cells.length; q++)
                if (this.cells[q]) this.context.fillRect((q % this.columns) * 5, Math.floor(q / this.columns) * 5, 3, 3);
        }
    }
    const bands = [...document.querySelectorAll('.life-band canvas')].map(canvas => new LifeBand(canvas));
    let lifeTimer;
    function runLife()
    {
        clearTimeout(lifeTimer);
        if (document.hidden || reduced.matches) return;
        lifeTimer = setTimeout(() => { bands.forEach(band => band.step()); runLife(); }, 680);
    }

    const orbit = document.querySelector('.system-orbit');
    const caption = document.querySelector('.system-caption');
    const connection = document.querySelector('.system-connection line');
    const canvas = document.querySelector('.system-canvas');
    const context = canvas.getContext('2d');
    let field, geometry, width = 0, height = 0, frame = 0, last = 0, time = 0, meshTime = -Infinity;
    let targetPhase = .8;
    function paintSystem(result)
    {
        if (!context || current !== 'living' || document.hidden) return;
        context.clearRect(0, 0, width, height);
        context.lineWidth = 1.05; context.lineCap = 'round'; context.lineJoin = 'round';
        for (const figure of result.frames)
            for (const path of figure.paths)
            {
                context.strokeStyle = 'rgba(' + window.PersonalTheme.colors.lineRgb + ',' + Math.max(.2, path.opacity) + ')';
                context.beginPath();
                for (let q = path.offset; q < path.offset + path.length; q += 2)
                    q === path.offset ? context.moveTo(result.coordinates[q], result.coordinates[q + 1]) : context.lineTo(result.coordinates[q], result.coordinates[q + 1]);
                if (path.closed) context.closePath();
                context.stroke();
            }
    }
    function resizeSystem()
    {
        if (current !== 'living' || !context) return;
        width = canvas.clientWidth; height = canvas.clientHeight;
        if (!width || !height) return;
        const scale = Math.min(devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
        context.setTransform(scale, 0, 0, scale, 0, 0);
        if (!field)
        {
            field = new ContourField(width, height, () => .46);
            field.figures = [field.create(width * .5, height * .5, .34, .35)];
            field.lineSpacing = 18;
            geometry = new ContourScheduler(field, paintSystem);
        }
        else geometry.resize(width, height);
        meshTime = -Infinity; geometry.request(time);
    }
    function animate(now)
    {
        frame = 0;
        if (current !== 'living' || document.hidden || reduced.matches) return;
        time += last ? Math.min(now - last, 40) : 16; last = now;
        if (geometry && time - meshTime >= 120)
        {
            field.figures[0].phase += (targetPhase - field.figures[0].phase) * .18;
            geometry.configDirty = true; geometry.request(time); meshTime = time;
        }
        frame = requestAnimationFrame(animate);
    }
    function runSystem()
    {
        cancelAnimationFrame(frame); frame = 0; last = 0;
        if (current === 'living' && !document.hidden && !reduced.matches) frame = requestAnimationFrame(animate);
    }
    function selectTechnology(index)
    {
        const technology = technologies[index];
        caption.querySelector('strong').textContent = technology ? technology[1] : 'One connected system.';
        caption.querySelector('span').textContent = technology ? technology[2] : 'Explore a technology.';
        orbit.classList.toggle('exploring', index >= 0);
        orbit.querySelectorAll('.system-node').forEach((button, q) => button.setAttribute('aria-pressed', q === index));
        if (index >= 0)
        {
            const angle = index / technologies.length * Math.PI * 2 - Math.PI / 2;
            connection.setAttribute('x2', 50 + Math.cos(angle) * 44);
            connection.setAttribute('y2', 50 + Math.sin(angle) * 44);
            targetPhase = .8 + index * .32;
            if (reduced.matches && geometry)
            {
                field.figures[0].phase = targetPhase;
                geometry.configDirty = true; geometry.request(time);
            }
        }
    }
    technologies.forEach((technology, index) => {
        const angle = index / technologies.length * Math.PI * 2 - Math.PI / 2;
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'system-node';
        button.style.left = (50 + Math.cos(angle) * 44) + '%';
        button.style.top = (50 + Math.sin(angle) * 44) + '%';
        button.setAttribute('aria-label', technology[1] + ': ' + technology[2]);
        button.setAttribute('aria-pressed', 'false'); button.title = technology[1];
        button.append(logo(technology));
        button.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse' && fine.matches) selectTechnology(index); });
        button.addEventListener('focus', () => selectTechnology(index));
        button.addEventListener('click', () => selectTechnology(index));
        document.querySelector('.system-nodes').append(button);
    });

    const peek = document.querySelector('.project-peek');
    const peekButtons = [...document.querySelectorAll('[data-peek]')];
    const previews = {
        tools: ['assets/work/tessera/mural-pixel.png', 'Tessera'],
        systems: ['assets/work/sonar/home.jpg', 'Sonar'],
        worlds: ['assets/work/btw/gameplay.png', 'Between Two Worlds']
    };
    function hidePeek()
    {
        peek.hidden = true;
        peekButtons.forEach(button => button.setAttribute('aria-expanded', 'false'));
    }
    function showPeek(button, event)
    {
        const project = previews[button.dataset.peek];
        peek.querySelector('img').src = project[0]; peek.querySelector('img').alt = project[1];
        peek.querySelector('span').textContent = project[1]; peek.hidden = false;
        peekButtons.forEach(item => item.setAttribute('aria-expanded', item === button));
        if (fine.matches)
        {
            const bounds = button.getBoundingClientRect();
            const x = event?.clientX ?? bounds.right, y = event?.clientY ?? bounds.top;
            peek.style.left = Math.max(12, Math.min(innerWidth - peek.offsetWidth - 12, x + 24)) + 'px';
            peek.style.top = Math.max(12, Math.min(innerHeight - peek.offsetHeight - 12, y - peek.offsetHeight - 20)) + 'px';
        }
        else { peek.style.left = ''; peek.style.top = ''; }
    }
    for (const button of peekButtons)
    {
        button.addEventListener('pointerenter', event => { if (fine.matches && event.pointerType === 'mouse') showPeek(button, event); });
        button.addEventListener('pointerleave', () => { if (fine.matches) hidePeek(); });
        button.addEventListener('focus', () => { if (fine.matches) showPeek(button); });
        button.addEventListener('blur', () => { if (fine.matches) hidePeek(); });
        button.addEventListener('click', () => {
            if (fine.matches) showPeek(button);
            else if (button.getAttribute('aria-expanded') === 'true') hidePeek();
            else showPeek(button);
        });
    }
    function choose(variant, push = true)
    {
        if (!descriptions[variant]) variant = 'editorial';
        current = variant; hidePeek();
        for (const panel of panels)
        {
            panel.hidden = panel.id !== variant; panel.classList.remove('reveal');
        }
        document.querySelector('#' + variant).classList.add('reveal');
        choices.forEach(button => button.setAttribute('aria-pressed', button.dataset.variant === variant));
        document.querySelector('.study-description').textContent = descriptions[variant];
        document.title = 'About / ' + choices.find(button => button.dataset.variant === variant).textContent.trim() + ' — Timbuhtuk';
        if (push)
        {
            const url = new URL(location.href); url.searchParams.set('variant', variant);
            history.pushState(null, '', url);
        }
        window.dispatchEvent(new Event('personal-cursor-reset'));
        resizeSystem(); runSystem();
    }
    choices.forEach(button => button.addEventListener('click', () => choose(button.dataset.variant)));
    window.addEventListener('popstate', () => choose(new URLSearchParams(location.search).get('variant'), false));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') { hidePeek(); selectTechnology(-1); } });
    document.addEventListener('visibilitychange', () => { runLife(); runSystem(); if (!document.hidden && geometry?.result) paintSystem(geometry.result); });
    reduced.addEventListener('change', () => { runLife(); runSystem(); });
    fine.addEventListener('change', hidePeek);
    window.addEventListener('personal-theme-change', () => {
        bands.forEach(band => band.paint());
        if (geometry?.result) paintSystem(geometry.result);
    });
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer); hidePeek();
        resizeTimer = setTimeout(() => { bands.forEach(band => band.resize()); resizeSystem(); }, 100);
    });
    choose(new URLSearchParams(location.search).get('variant'), false); runLife();
})();
