(() => {
    const root = document.documentElement;
    if (!root.classList.contains('entrance-pending')) return;
    EntranceAnimation.ready().then(() => {
        if (root.classList.contains('entrance-pending')) return new EntranceAnimation().start('hybridTrace');
    }).catch(error => {
        root.classList.remove('entrance-pending', 'entrance-running');
        console.warn('Entrance animation skipped', error);
    });
})();
