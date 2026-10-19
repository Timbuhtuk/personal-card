(() => {
    const descriptions = {
        cue: 'A restrained turn; the needle gently follows. Selected for About.',
        spin: 'The record spins up, overshoots its position, then settles. The needle arrives last.',
        roll: 'The record rolls diagonally into the scene from below, carrying its text with it.',
        trace: 'Grooves draw around the disc first, followed by the iris texture and printed text.',
        camera: 'A tight macro view pulls back to reveal the final composition.',
        scan: 'A fine scanning line travels down the page and reveals the record beneath it.'
    };
    const frame = document.querySelector('#site-preview');
    let mode = 'cue';
    let slow = new URLSearchParams(location.search).get('slow') === '1';
    function show(name, changeHistory = true)
    {
        mode = Object.hasOwn(descriptions, name) ? name : 'cue';
        document.querySelectorAll('[data-entrance]').forEach(button => button.setAttribute('aria-pressed', button.dataset.entrance === mode));
        document.querySelector('#study-description').textContent = descriptions[mode];
        document.querySelector('#slow').setAttribute('aria-pressed', slow);
        document.title = 'Record entrance / ' + mode + ' — Timbuhtuk';
        if (changeHistory)
        {
            const url = new URL(location.href); url.searchParams.set('entrance', mode);
            history.pushState(null, '', url);
        }
        frame.src = 'index.html?recordEntrance=' + mode + '&recordPreview=1' + (slow ? '&recordSlow=1' : '') + '#about';
    }
    document.querySelectorAll('[data-entrance]').forEach(button => button.addEventListener('click', () => show(button.dataset.entrance)));
    document.querySelector('#replay').addEventListener('click', () => show(mode, false));
    document.querySelector('#slow').addEventListener('click', () => {
        slow = !slow;
        const url = new URL(location.href);
        if (slow) url.searchParams.set('slow', '1'); else url.searchParams.delete('slow');
        history.replaceState(null, '', url); show(mode, false);
    });
    window.addEventListener('popstate', () => {
        const params = new URLSearchParams(location.search); slow = params.get('slow') === '1'; show(params.get('entrance'), false);
    });
    show(new URLSearchParams(location.search).get('entrance'), false);
})();
