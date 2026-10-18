(() => {
    for (const project of ['tessera', 'sonar', 'btw', 'sidequest', 'kvasir'])
    {
        const template = document.querySelector(`#${project}-preview-template`);
        document.querySelectorAll(`[data-${project}-mount]`).forEach(mount => {
            mount.replaceChildren(template.content.cloneNode(true));
        });
    }
    const embedded = window.parent !== window && new URLSearchParams(location.search).get('embedded') === '1';
    const list = document.querySelector('.project-list');
    const projects = [...list.querySelectorAll('.project')];
    const preview = document.querySelector('.project-preview');
    const scenes = [...preview.querySelectorAll('.preview-art > [data-image]')];
    const fine = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 651px)');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let active = null;
    let frame = 0;
    let previous = 0;
    let current = { x: 0, y: 0 };
    let target = { x: 0, y: 0 };

    function position(x, y)
    {
        const width = preview.offsetWidth;
        const height = preview.offsetHeight;
        target.x = Math.max(16, Math.min(innerWidth - width - 22, x + 32));
        target.y = Math.max(18, Math.min(innerHeight - height - 20, y - height * .82));
        if (reduce.matches) current = { ...target };
        if (!frame) frame = requestAnimationFrame(draw);
    }

    function draw(time)
    {
        frame = 0;
        if (!active || !fine.matches || document.hidden) return;
        const dt = previous ? Math.min(time - previous, 50) : 16;
        previous = time;
        const ease = reduce.matches ? 1 : 1 - Math.exp(-dt / 65);
        current.x += (target.x - current.x) * ease;
        current.y += (target.y - current.y) * ease;
        preview.style.transform = `translate3d(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px, 0)`;
        if (Math.abs(current.x - target.x) + Math.abs(current.y - target.y) > .15)
            frame = requestAnimationFrame(draw);
        else previous = 0;
    }

    function show(project, x, y)
    {
        if (!fine.matches) return;
        const entering = !active;
        if (active !== project)
        {
            active?.classList.remove('active');
            active = project;
            project.classList.add('active');
            scenes.forEach(scene => scene.classList.toggle('active', scene.dataset.image === project.dataset.project));
            preview.dataset.project = project.dataset.project;
        }
        position(x, y);
        if (entering)
        {
            current = { ...target };
            preview.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
        }
        list.classList.add('is-exploring');
        preview.classList.add('visible');
    }

    function hide()
    {
        active?.classList.remove('active');
        scenes.forEach(scene => scene.classList.remove('active'));
        active = null;
        list.classList.remove('is-exploring');
        preview.classList.remove('visible');
        cancelAnimationFrame(frame);
        frame = 0;
        previous = 0;
    }

    if (embedded)
    {
        document.querySelector('.work-home').addEventListener('click', event => {
            if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault(); hide();
            window.parent.postMessage({ type: 'personal-work-navigation', target: 'home' }, location.origin);
        });
        window.addEventListener('message', event => {
            if (event.source !== window.parent || event.origin !== location.origin) return;
            if (event.data?.type === 'personal-work-visibility' && !event.data.visible)
            {
                hide(); window.dispatchEvent(new Event('personal-cursor-reset'));
            }
        });
    }
    projects.forEach(project => {
        project.addEventListener('pointerenter', event => {
            if (event.pointerType === 'mouse') show(project, event.clientX, event.clientY);
        });
        project.addEventListener('pointermove', event => {
            if (event.pointerType === 'mouse') show(project, event.clientX, event.clientY);
        }, { passive: true });
        project.addEventListener('focus', () => {
            const rect = project.getBoundingClientRect();
            show(project, innerWidth * .6, rect.top + rect.height / 2);
        });
    });
    list.addEventListener('pointerleave', () => {
        const focused = projects.find(project => project.matches(':focus-visible'));
        if (!focused) hide();
    });
    list.addEventListener('focusout', event => {
        if (!list.contains(event.relatedTarget)) hide();
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
    window.addEventListener('blur', hide);
    window.addEventListener('resize', hide);
    window.addEventListener('scroll', () => {
        if (active?.matches(':focus-visible'))
        {
            const rect = active.getBoundingClientRect();
            position(innerWidth * .6, rect.top + rect.height / 2);
        }
        else hide();
    }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });
    fine.addEventListener('change', hide);
    reduce.addEventListener('change', hide);
})();
