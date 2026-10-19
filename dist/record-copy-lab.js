(() => {
    const descriptions = {
        labels: 'Small section labels and body text. No large titles.',
        titles: 'Large titles and body text. No small section labels.'
    };
    function show(value, changeHistory = true)
    {
        const mode = Object.hasOwn(descriptions, value) ? value : 'labels';
        document.querySelectorAll('[data-copy]').forEach(button => button.setAttribute('aria-pressed', button.dataset.copy === mode));
        document.querySelector('#study-description').textContent = descriptions[mode];
        document.title = 'Record typography / ' + mode + ' — Timbuhtuk';
        if (changeHistory)
        {
            const url = new URL(location.href); url.searchParams.set('copy', mode);
            history.pushState(null, '', url);
        }
        document.querySelector('#site-preview').src = 'record-lab.html?variant=graphic&copyPreview=1&copy=' + mode;
    }
    document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', () => show(button.dataset.copy)));
    window.addEventListener('popstate', () => show(new URLSearchParams(location.search).get('copy'), false));
    show(new URLSearchParams(location.search).get('copy'), false);
})();
