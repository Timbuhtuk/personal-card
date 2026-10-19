(() => {
    const svg = document.querySelector('.turntable');
    const arm = document.querySelector('#tonearm');
    const buttons = [...document.querySelectorAll('.hardware-button')];
    const label = document.querySelector('#label-copy');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const mobile = matchMedia('(max-width: 600px)');
    const sections = [
        { name: 'About me', heading: ['A little', 'about me.'], body: ["I'm Tymofii Pankovskyi.", 'I build applications,', 'tools and game systems.'] },
        { name: 'What I build', heading: ['From pixels', 'to worlds.'], body: ['Desktop tools. Music apps.', 'Procedural game systems.', 'Different ideas, built to work.'] },
        { name: 'How I think', heading: ['Made to', 'be used.'], body: ['I like understanding', 'how things work — and making', 'complex things feel simple.'] }
    ];
    const state = { section: 0, progress: 0, angle: 39, dragging: false };
    const ns = 'http://www.w3.org/2000/svg';
    let frame = 0, previous = 0, textTimer;
    const clamp = (number, min, max) => Math.max(min, Math.min(max, number));
    const trackSpan = () => mobile.matches ? 2.8 : 8;
    function lines(target, values, firstY, spacing)
    {
        const nodes = values.map((text, q) => {
            const span = document.createElementNS(ns, 'tspan');
            span.setAttribute('x', 0); span.setAttribute('y', firstY + q * spacing);
            span.textContent = text; return span;
        });
        target.replaceChildren(...nodes);
    }
    function printSection()
    {
        const section = sections[state.section];
        document.querySelector('#label-kicker').textContent = '0' + (state.section + 1) + ' / ' + section.name.toUpperCase();
        lines(document.querySelector('#label-heading'), section.heading, -95, 39);
        lines(document.querySelector('#label-body'), section.body, 54, 27);
        label.setAttribute('aria-label', section.name);
        label.classList.remove('changing');
    }
    function paintArm()
    {
        arm.setAttribute('transform', 'translate(1140 220) rotate(' + state.angle.toFixed(4) + ')');
    }
    function tick(now)
    {
        frame = 0;
        if (document.hidden || state.dragging) return;
        const delta = previous ? Math.min(now - previous, 50) : 16;
        previous = now;
        const target = 39 + state.progress * trackSpan();
        state.angle += (target - state.angle) * (1 - Math.exp(-delta / 180));
        if (Math.abs(target - state.angle) < .002) state.angle = target;
        paintArm();
        if (state.angle !== target) frame = requestAnimationFrame(tick);
    }
    function wake()
    {
        cancelAnimationFrame(frame); frame = 0; previous = 0;
        svg.dataset.spinning = !document.hidden && !reduce.matches;
        if (reduce.matches && !state.dragging) state.angle = 39 + state.progress * trackSpan();
        paintArm();
        if (!document.hidden && !state.dragging && state.angle !== 39 + state.progress * trackSpan()) frame = requestAnimationFrame(tick);
    }
    function choose(index, instant = false)
    {
        state.section = clamp(index, 0, sections.length - 1);
        state.progress = state.section / (sections.length - 1);
        buttons.forEach((button, q) => button.setAttribute('aria-pressed', q === state.section));
        arm.setAttribute('aria-valuenow', state.section + 1);
        arm.setAttribute('aria-valuetext', sections[state.section].name + ', track ' + (state.section + 1));
        clearTimeout(textTimer);
        if (instant || reduce.matches) printSection();
        else
        {
            label.classList.add('changing');
            textTimer = setTimeout(printSection, 150);
        }
        wake();
    }
    buttons.forEach((button, q) => {
        button.setAttribute('aria-label', 'Track ' + (q + 1) + ': ' + sections[q].name);
        const number = document.createElementNS(ns, 'text');
        number.classList.add('button-number');
        number.setAttribute('x', q === 2 ? 26 : 40); number.setAttribute('y', 28);
        number.textContent = '0' + (q + 1); button.append(number);
        const hit = document.createElementNS(ns, 'rect');
        hit.setAttribute('x', -5); hit.setAttribute('y', -14);
        hit.setAttribute('width', q === 2 ? 62 : 90); hit.setAttribute('height', 62);
        hit.setAttribute('fill', 'transparent'); hit.setAttribute('pointer-events', 'all');
        button.append(hit);
        button.addEventListener('click', () => choose(q));
        button.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault(); choose(q);
        });
        button.addEventListener('pointerdown', () => button.classList.add('pressed'));
        for (const name of ['pointerup', 'pointerleave', 'pointercancel', 'blur'])
            button.addEventListener(name, () => button.classList.remove('pressed'));
    });
    arm.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        event.preventDefault(); state.dragging = true;
        arm.setPointerCapture(event.pointerId); arm.classList.add('dragging');
        cancelAnimationFrame(frame); frame = 0;
    });
    arm.addEventListener('pointermove', event => {
        if (!state.dragging) return;
        const matrix = svg.getScreenCTM();
        if (!matrix) return;
        const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
        const angle = Math.atan2(1140 - point.x, point.y - 220) * 180 / Math.PI - Math.atan2(2, 607) * 180 / Math.PI;
        state.angle = clamp(angle, 39, 39 + trackSpan());
        state.progress = (state.angle - 39) / trackSpan();
        paintArm();
    });
    function endDrag()
    {
        if (!state.dragging) return;
        state.dragging = false; arm.classList.remove('dragging');
        choose(Math.round(state.progress * (sections.length - 1)));
    }
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) arm.addEventListener(name, endDrag);
    arm.addEventListener('keydown', event => {
        const directions = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 };
        if (!(event.key in directions) && event.key !== 'Home' && event.key !== 'End') return;
        event.preventDefault();
        choose(event.key === 'Home' ? 0 : event.key === 'End' ? 2 : state.section + directions[event.key]);
    });
    function resize()
    {
        svg.setAttribute('viewBox', mobile.matches ? '90 70 840 980' : '0 0 1400 980');
        document.querySelector('.controls').setAttribute('transform', mobile.matches ? 'translate(375 946)' : 'translate(996 823)');
        state.angle = 39 + state.progress * trackSpan(); paintArm();
    }
    mobile.addEventListener('change', resize);
    reduce.addEventListener('change', () => { clearTimeout(textTimer); printSection(); wake(); });
    window.addEventListener('blur', endDrag);
    document.addEventListener('visibilitychange', () => { endDrag(); wake(); });
    window.addEventListener('pagehide', () => { clearTimeout(textTimer); cancelAnimationFrame(frame); svg.dataset.spinning = 'false'; });
    window.addEventListener('pageshow', () => { printSection(); wake(); });
    resize(); choose(0, true);
})();
