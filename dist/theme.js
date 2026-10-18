(() => {
    const preference = matchMedia('(prefers-color-scheme: light)');
    const theme = { colors: null };
    function refresh()
    {
        const style = getComputedStyle(document.documentElement);
        const value = name => style.getPropertyValue(name).trim();
        theme.colors = {
            lineRgb: value('--pc-line-rgb'),
            inkRgb: value('--pc-ink-rgb'),
            accentRgb: value('--pc-accent-rgb'),
            background: value('--ts-color-canvas'),
            cell: value('--ts-color-textSecondary')
        };
    }
    refresh();
    window.PersonalTheme = theme;
    preference.addEventListener('change', () => {
        refresh();
        window.dispatchEvent(new Event('personal-theme-change'));
    });
})();
