(() => {
    let layout = 'wide';
    function show(value, changeHistory = true)
    {
        layout = value === 'original' ? 'original' : 'wide';
        document.querySelectorAll('[data-layout]').forEach(button => button.setAttribute('aria-pressed', button.dataset.layout === layout));
        const source = 'index.html?recordPreview=1' + (layout === 'wide' ? '&recordLayout=wide' : '') + '#about';
        document.querySelector('#site-preview').src = source;
        document.querySelector('#full-frame').href = source;
        if (changeHistory)
        {
            const url = new URL(location.href); url.searchParams.set('layout', layout);
            history.pushState(null, '', url);
        }
    }
    document.querySelectorAll('[data-layout]').forEach(button => button.addEventListener('click', () => show(button.dataset.layout)));
    document.querySelector('#replay').addEventListener('click', () => show(layout, false));
    window.addEventListener('popstate', () => show(new URLSearchParams(location.search).get('layout'), false));
    show(new URLSearchParams(location.search).get('layout'), false);
})();
