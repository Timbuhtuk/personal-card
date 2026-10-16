(() => {
    const root = document.documentElement;
    const status = document.querySelector('#entrance-status');
    EntranceAnimation.ready().then(() => {
        const variants = [...document.querySelectorAll('[data-variant]')];
        const replay = document.querySelector('#entrance-replay');
        const play = document.querySelector('#entrance-play');
        const slow = document.querySelector('#entrance-slow');
        const scrubber = document.querySelector('#entrance-seek');
        const timeLabel = document.querySelector('#entrance-time');
        const description = document.querySelector('#entrance-description');
        const animation = new EntranceAnimation({
            replayable: true,
            onStart(mode) {
                for (const button of variants) button.setAttribute('aria-pressed', String(button.dataset.variant === mode));
                description.textContent = EntranceMotion.variants[mode].description;
                const url = new URL(location.href);
                url.searchParams.set('variant', mode);
                history.replaceState(null, '', url);
                status.textContent = 'Preparing';
            },
            onUpdate(scene) {
                scrubber.value = String(Math.round(scene.time / scene.duration * 1000));
                timeLabel.value = `${(scene.time / 1000).toFixed(2)} / ${(scene.duration / 1000).toFixed(2)} s`;
                const action = scene.playing ? 'Pause' : 'Play';
                const state = scene.playing ? 'Playing' : scene.time >= scene.duration ? 'Ready' : 'Paused';
                if (play.textContent !== action) play.textContent = action;
                if (status.textContent !== state) status.textContent = state;
            }
        });
        for (const button of variants) button.addEventListener('click', () => animation.start(button.dataset.variant));
        replay.addEventListener('click', () => animation.start(animation.mode));
        play.addEventListener('click', () => animation.togglePlay());
        slow.addEventListener('click', () => {
            animation.rate = animation.rate === 1 ? .5 : 1;
            slow.setAttribute('aria-pressed', String(animation.rate === .5));
        });
        scrubber.addEventListener('input', () => animation.seek(Number(scrubber.value) / 1000));
        for (const control of document.querySelectorAll('.entrance-controls button, .entrance-controls input')) control.disabled = false;
        const requested = new URLSearchParams(location.search).get('variant');
        animation.start(Object.hasOwn(EntranceMotion.variants, requested) ? requested : 'impulse');
    }).catch(error => {
        root.classList.remove('entrance-pending', 'entrance-running');
        status.textContent = 'Preview unavailable';
        console.warn('Entrance preview unavailable', error);
    });
})();
