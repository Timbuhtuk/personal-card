(() => {
    const svg = document.querySelector('#record-scene');
    const stage = document.querySelector('.record-stage');
    const rotor = document.querySelector('#record-rotor');
    const surfaces = document.querySelector('#disc-surface');
    const labelRotor = document.querySelector('#disc-label-rotor');
    const print = document.querySelector('#printed-sections');
    const deck = document.querySelector('#deck-layer');
    const hardware = document.querySelector('#hardware-layer');
    const reflections = document.querySelector('#reflection-layer');
    const detailButton = document.querySelector('.center-detail');
    const arrival = document.querySelector('#record-arrival');
    const arrivalWindow = document.querySelector('#record-arrival-window');
    const scanLine = document.querySelector('#record-scan-line');
    const requestedEntrance = new URLSearchParams(location.search).get('entrance');
    const entranceMode = RecordEntranceMotion.modes.includes(requestedEntrance) ? requestedEntrance : 'cue';
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const mobileMotion = matchMedia('(max-width: 767px), (hover: none) and (pointer: coarse)');
    const embedded = new URLSearchParams(location.search).get('embedded') === '1';
    const copyPreview = new URLSearchParams(location.search).get('copyPreview') === '1';
    const requestedCopy = new URLSearchParams(location.search).get('copy');
    const copyMode = ['labels', 'titles'].includes(requestedCopy) ? requestedCopy : 'both';
    const wideStudy = new URLSearchParams(location.search).get('layout') === 'wide';
    stage.dataset.copyMode = copyMode;
    const colorScheme = matchMedia('(prefers-color-scheme: light)');
    if (embedded || copyPreview)
    {
        document.body.classList.add('record-embedded');
        const cursorStyle = document.createElement('link'); cursorStyle.rel = 'stylesheet'; cursorStyle.href = 'signal-cursor.css?v=perf-20261020'; document.head.append(cursorStyle);
        const cursorScript = document.createElement('script'); cursorScript.src = 'signal-cursor.js?v=perf-20261020'; document.head.append(cursorScript);
    }
    const ns = 'http://www.w3.org/2000/svg';
    const mod = (value, length) => (value % length + length) % length;
    const variants = {
        minimal: { detail: 0, zoom: 1.02, x: .36, y: .35, angle: 0, align: 'start' },
        graphic: { detail: 1, zoom: .98, x: .44, y: .35, angle: -7, align: 'middle' },
        wireframe: { detail: 2, zoom: 1.08, x: .31, y: .34, angle: 0, align: 'start' },
        studio: { detail: 3, zoom: 1.18, x: .45, y: .35, angle: 0, align: 'middle' },
        macro: { detail: 4, zoom: 1.65, x: .44, y: .30, angle: 24, align: 'middle', physicalArm: true },
        blend: { detail: 1, zoom: 1.65, x: .42, y: .30, angle: 24, align: 'middle', physicalArm: true, dark: true, grooves: 9 }
    };
    const sections = [
        { name: 'Who I Am?', title: ['A little', 'about me.'], body: ["I'm Tymofii Pankovskyi.", 'I build applications, tools', 'and game systems.'], copy: 'Hi, I’m Tymo. I’ve been doing stuff with computers since 2021. I never asked for this, but apparently getting a taste only made me hungrier. Now I’d describe it as a calling, but that would imply someone actually asked for my assistance.' },
        { name: 'What I Build?', title: ['From pixels', 'to worlds.'], body: ['Desktop tools. Music platforms.', 'Procedural game systems.', 'Different ideas, built to work.'], copy: 'Tools, games, web apps—whatever I want or you need, I can build it. I like giving good ideas somewhere to live. Preferably somewhere with buttons. Apparently, “wouldn’t it be useful if…” is all the encouragement I require.' },
        { name: 'How I Think?', title: ['Made to', 'be used.'], body: ['I like understanding how things work,', 'then making the complicated', 'feel straightforward.'], copy: 'I plan the architecture so the next feature can be added with a keyboard. No torches, excavation permits, or ancient prophecies required. I adapt proven patterns, choose suitable tools, and expect smooth performance. Civilization has to start somewhere.' }
    ];
    const copyMeasure = document.createElement('canvas').getContext('2d');
    let variant = 'minimal', selected = 0, rotation = 0, targetRotation = 0, armTrack = 0;
    let scene, armNode, frame = 0, gesture = null, resizeTimer, wheelSum = 0, wheelTime = -Infinity;
    let sceneDirty = true, sceneBuilds = 0, assetsReady = false;
    let labelNode;
    let grooveNodes = [];
    let centerDetail = new URL(location.href).searchParams.get('detail') === 'center';
    let reveal = embedded ? 0 : 1, revealFrame = 0;
    let nativeReveal = null;
    function cancelNativeReveal()
    {
        if (!nativeReveal) return;
        const current = nativeReveal; nativeReveal = null;
        const time = current.effects[0]?.currentTime;
        if (typeof time === 'number')
        {
            const t = Math.max(0, Math.min(1, time / current.duration));
            reveal = current.from + (current.target - current.from) * t * t * (3 - 2 * t);
        }
        for (const effect of current.effects) effect.cancel();
    }
    function playNativeCue(from, target, duration)
    {
        if (!embedded || entranceMode !== 'cue' || !mobileMotion.matches || scene?.wide || typeof rotor.animate !== 'function') return false;
        const frames = RecordEntranceMotion.cueKeyframes(scene, from, target, rotation, armTrack);
        const controls = document.querySelector('.track-controls');
        const items = [[rotor, frames.rotor], [labelRotor, frames.rotor], [arrival, frames.arrival], [hardware, frames.hardware], [controls, frames.controls]];
        if (armNode) items.push([armNode, frames.arm]);
        const current = { from, target, duration, effects: [] };
        try
        {
            for (const [item, keyframes] of items)
            {
                if (!item) continue;
                item.style.transformOrigin = '0px 0px'; item.style.transformBox = 'view-box';
                const effect = item.animate(keyframes, { duration, easing: 'linear', fill: 'both' });
                // Install rejection handlers immediately, including partially-created batches.
                effect.finished.catch(() => {}); current.effects.push(effect);
            }
        }
        catch { for (const effect of current.effects) effect.cancel(); return false; }
        nativeReveal = current; stage.dataset.motionEngine = 'native';
        Promise.all(current.effects.map(effect => effect.finished)).then(() => {
            if (nativeReveal === current) settleReveal(target);
        }).catch(() => {});
        return true;
    }
    function settleReveal(value)
    {
        cancelNativeReveal();
        cancelAnimationFrame(revealFrame); revealFrame = 0; reveal = value;
        stage.dataset.entrance = value ? 'visible' : 'hidden'; paint();
    }
    function animateReveal(opening, duration)
    {
        cancelAnimationFrame(revealFrame); cancelNativeReveal(); finish(); ensureScene();
        if (reduced.matches || document.hidden) { settleReveal(opening ? 1 : 0); return; }
        const from = reveal, target = opening ? 1 : 0;
        let start;
        stage.dataset.entrance = opening ? 'entering' : 'leaving';
        if (playNativeCue(from, target, duration)) return;
        stage.dataset.motionEngine = 'script';
        const tick = now => {
            if (start === undefined) start = now;
            const t = Math.min(1, (now - start) / duration);
            const ease = t * t * (3 - 2 * t);
            reveal = from + (target - from) * ease; paint();
            if (t < 1) revealFrame = requestAnimationFrame(tick);
            else settleReveal(target);
        };
        revealFrame = requestAnimationFrame(tick);
    }
    function node(name, attributes = {}, children = [])
    {
        const item = document.createElementNS(ns, name);
        for (const [key, value] of Object.entries(attributes)) item.setAttribute(key, value);
        item.append(...children); return item;
    }
    function textLine(content, x, y, size, className, anchor = 'middle')
    {
        const item = node('text', { x, y, 'font-size': size, class: className, 'text-anchor': anchor });
        item.textContent = content; return item;
    }
    function fillCopy(group, index, size, start, anchor)
    {
        const { width, height, anchorX, anchorY, alpha, cy, radius, textRadius, wide } = scene;
        const mobile = width < 600;
        const columnWidth = wide ? Math.min(620, width * .39) : Math.min(560, width * (mobile ? .60 : .52));
        const bodyX = mobile ? -width * .04 : 0;
        const bottom = Math.min(height - (mobile ? 160 : 108), cy - radius * .28 * 1.01 - 24);
        const words = sections[index].copy.split(/\s+/);
        let lines, fits;
        do
        {
            lines = [];
            let word = 0;
            copyMeasure.font = size + 'px "Cascadia Code", monospace';
            while (word < words.length)
            {
                let line = words[word], next = word + 1;
                while (next < words.length && copyMeasure.measureText(line + ' ' + words[next]).width <= columnWidth)
                    line += ' ' + words[next++];
                lines.push(line); word = next;
            }
            fits = lines.every((line, q) => {
                const y = start + q * size * 1.65;
                const length = copyMeasure.measureText(line).width;
                const left = bodyX + (anchor === 'middle' ? -length / 2 : 0);
                if (wide)
                {
                    const nearestX = Math.max(left, Math.min(left + length, 0));
                    const nearestY = Math.max(y - size, Math.min(y + size * .25, textRadius));
                    if (Math.hypot(nearestX, nearestY - textRadius) < radius * .28 + 24) return false;
                }
                const corners = [[left, y - size], [left + length, y - size], [left, y + size * .25], [left + length, y + size * .25]];
                return corners.every(([x, y]) => {
                    const px = anchorX + Math.cos(alpha) * x - Math.sin(alpha) * y;
                    const py = anchorY + Math.sin(alpha) * x + Math.cos(alpha) * y;
                    if (wide)
                    {
                        const distance = Math.hypot(x, y - textRadius);
                        return px >= 24 && px <= width - 24 && py >= 24 && py <= height - 100 && distance >= radius * .28 + 24 && distance <= radius - 24;
                    }
                    return px >= 20 && px <= width - 20 && py <= bottom;
                });
            });
            if (!fits && size > 8) size -= .5;
            else break;
        }
        while (!fits);
        lines.forEach((line, q) => group.append(textLine(line, bodyX, start + q * size * 1.65, size, 'printed-body', anchor)));
        group.dataset.bodyWords = words.length;
        group.dataset.bodyLines = lines.length;
        group.dataset.copyFits = fits;
    }
    function buildCenterPattern()
    {
        const pattern = document.querySelector('#center-iris-pattern');
        pattern.append(node('image', { href: 'assets/record/iris-eye-v3.webp', x: -100, y: -100, width: 200, height: 200, preserveAspectRatio: 'xMidYMid slice', 'clip-path': 'url(#center-iris-clip)' }));
    }
    function frameScene()
    {
        const { width, height, cx, cy, radius } = scene;
        const inspecting = !embedded && variant === 'graphic' && centerDetail;
        stage.dataset.centerDetail = inspecting;
        svg.setAttribute('aria-label', inspecting ? 'Green iris pattern on the center label of a black vinyl record' : 'Text printed on the rotating outer part of a vinyl record');
        if (inspecting)
        {
            const scale = Math.min(width, height) * .76 / (radius * .56);
            const viewWidth = width / scale, viewHeight = height / scale;
            svg.setAttribute('viewBox', [cx - viewWidth / 2, cy - viewHeight / 2, viewWidth, viewHeight].join(' '));
        }
        else svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
        detailButton.hidden = embedded || variant !== 'graphic';
        detailButton.setAttribute('aria-pressed', inspecting);
        detailButton.textContent = inspecting ? 'Back to crop ↙' : 'Center detail ↗';
    }
    function drawPhysicalArm(config, width, height)
    {
        // One physical scale for a 300 mm record and a 230 mm tonearm.
        const scale = scene.radius / 150;
        const angle = width < 600 ? 24 : 36;
        const radians = angle * Math.PI / 180;
        const length = 230;
        const tip = { x: width * (width < 600 ? .99 : .66), y: height * (width < 600 ? .85 : .78) };
        const pivot = { x: tip.x + Math.sin(radians) * length * scale, y: tip.y - Math.cos(radians) * length * scale };
        const detailed = config.detail >= 3;
        scene.arm = { ...pivot, angle, scale, trackSweep: .35 };
        svg.dataset.armToRecord = (length / 300).toFixed(3);
        svg.dataset.armScale = scale.toFixed(3);
        const mount = node('g', { transform: 'translate(' + pivot.x + ' ' + pivot.y + ') scale(' + scale + ')' });
        mount.append(node('circle', { r: 18, fill: '#252626', stroke: '#696b68', 'stroke-width': .5 }));
        mount.append(node('circle', { r: 11, fill: '#101110', stroke: '#a5aaa2', 'stroke-width': .5 }));
        hardware.append(mount);
        armNode = node('g', { class: 'needle-arm' });
        const parts = node('g');
        parts.append(node('rect', { x: -2.6, y: -24, width: 5.2, height: 226, rx: 2.6, fill: detailed ? 'url(#chrome)' : '#b6b9b2', stroke: '#646963', 'stroke-width': .25 }));
        parts.append(node('rect', { x: -8, y: -25, width: 16, height: 18, rx: 1, fill: detailed ? 'url(#chrome)' : '#bec1ba', stroke: '#777c73', 'stroke-width': .3 }));
        parts.append(node('rect', { x: -13, y: -5, width: 26, height: 14, fill: '#242724', stroke: '#6d746a', 'stroke-width': .4 }));
        parts.append(node('path', { d: 'M-9 196H8L11 220 3 228H-8L-11 219Z', fill: detailed ? 'url(#dark-metal)' : '#d1d3cc', stroke: detailed ? '#87918a' : '#6d746a', 'stroke-width': .4 }));
        parts.append(node('path', { d: 'M0 227V230', stroke: '#eceee7', 'stroke-width': .6 }));
        parts.append(node('path', { d: 'M8 207H14L17 211', fill: 'none', stroke: '#b2b7ae', 'stroke-width': 1.1, 'stroke-linecap': 'round' }));
        if (detailed)
        {
            for (const y of [203, 212]) parts.append(node('circle', { cy: y, r: 1.2, fill: 'url(#screw)' }));
            parts.append(node('path', { d: 'M-5 217H6M-4 220H5', stroke: '#080b09', 'stroke-width': .8 }));
        }
        else
            for (const y of [203, 212]) parts.append(node('circle', { cy: y, r: 1, fill: '#747b70' }));
        armNode.append(parts); hardware.append(armNode);
    }
    function drawArm(config, width, height)
    {
        armNode = null;
        svg.removeAttribute('data-arm-to-record');
        svg.removeAttribute('data-arm-scale');
        if (!config.detail) return;
        if (config.physicalArm) { drawPhysicalArm(config, width, height); return; }
        const wire = config.detail === 2, detailed = config.detail >= 3, macro = config.detail === 4;
        const pivot = scene.wide ? { x: Math.min(width - 145, scene.cx + scene.radius * 1.12), y: height * .20 } : { x: width * (macro ? 1.24 : 1.015), y: height * (macro ? -.22 : .12) };
        const tip = scene.wide ? { x: scene.cx + scene.radius * .65, y: scene.cy + scene.radius * .10 - Math.min(26, Math.max(0, (1100 - width) * .35)) } : { x: width * (width < 600 ? .94 : .85), y: height * (macro ? .70 : .69) };
        const length = Math.hypot(tip.x - pivot.x, tip.y - pivot.y);
        const angle = Math.atan2(pivot.x - tip.x, tip.y - pivot.y) * 180 / Math.PI;
        const size = Math.max(.65, Math.min(1.12, width / 1050));
        scene.arm = { ...pivot, angle };
        if (scene.wide) scene.arm.trackSweep = .8;
        const support = node('g', { transform: 'translate(' + pivot.x + ' ' + pivot.y + ') scale(' + size + ')' });
        if (wire)
        {
            support.append(node('circle', { r: 68, fill: 'none', stroke: '#87989e', 'stroke-width': 1 }));
            support.append(node('circle', { r: 52, fill: 'none', stroke: '#586b71', 'stroke-width': 1 }));
            support.append(node('path', { d: 'M-90 0H90M0-90V90', stroke: '#63777d', 'stroke-width': .8 }));
        }
        else
        {
            support.append(node('ellipse', { rx: 70, ry: 54, fill: detailed ? 'url(#dark-metal)' : '#d0d2ca', stroke: detailed ? '#6a7477' : '#151918', 'stroke-width': 2 }));
            support.append(node('ellipse', { rx: 52, ry: 39, fill: '#11171a', stroke: '#4c5659', 'stroke-width': 1 }));
        }
        support.append(node('path', { d: 'M-104-30C-90-140 102-140 115 10C127 117 18 160-74 133', fill: 'none', stroke: wire ? '#a0b0b5' : detailed ? 'url(#chrome)' : '#b8bcb5', 'stroke-width': wire ? 1 : 4 }));
        if (detailed)
        {
            const dial = node('g', { transform: 'translate(-42 102)' });
            dial.append(node('circle', { r: 28, fill: '#080d10', stroke: '#717d80' }));
            dial.append(node('circle', { cy: -2, r: 23, fill: 'url(#screw)', stroke: '#c3cccd', 'stroke-width': .7 }));
            for (let q = 0; q < 12; q++)
            {
                const a = q * Math.PI / 6;
                dial.append(node('circle', { cx: Math.cos(a) * 19, cy: Math.sin(a) * 19 - 2, r: .8, fill: '#303b3f' }));
            }
            dial.append(node('path', { d: 'M0-19V-12', stroke: '#20292d', 'stroke-width': 2 }));
            support.append(dial);
        }
        hardware.append(support);
        armNode = node('g', { class: 'needle-arm' });
        const parts = node('g', detailed ? { filter: 'url(#soft-shadow)' } : {});
        const rodWidth = (wire ? 3 : detailed ? 11 : 8) * size;
        parts.append(node('rect', { x: -rodWidth / 2, y: -100 * size, width: rodWidth, height: length + 62 * size, rx: rodWidth / 2, fill: wire ? 'none' : detailed ? 'url(#chrome)' : '#dce0d8', stroke: wire ? '#c4d0d2' : '#79868a', 'stroke-width': wire ? .9 : .5 }));
        parts.append(node('rect', { x: -22 * size, y: -96 * size, width: 44 * size, height: 51 * size, rx: wire ? 0 : 5, fill: wire ? 'none' : detailed ? 'url(#chrome)' : '#dce0d8', stroke: wire ? '#a9b8bd' : '#69787c', 'stroke-width': 1 }));
        parts.append(node('rect', { x: -40 * size, y: -24 * size, width: 80 * size, height: 48 * size, fill: wire ? 'none' : detailed ? 'url(#dark-metal)' : '#202727', stroke: wire ? '#a9b8bd' : '#687378', 'stroke-width': 1 }));
        const shell = node('g', { transform: 'translate(0 ' + (length - 51 * size) + ') scale(' + size + ')' });
        shell.append(node('path', { d: 'M-20 0H19L24 45 9 61H-20L-24 43Z', fill: wire ? 'none' : detailed ? 'url(#dark-metal)' : '#d5dad3', stroke: wire ? '#c2cfd2' : '#808d92', 'stroke-width': wire ? 1 : .8 }));
        shell.append(node('path', { d: 'M0 55V65L-2 69', fill: 'none', stroke: '#e0e5df', 'stroke-width': 1.5 }));
        if (detailed)
        {
            for (const y of [13, 27]) shell.append(node('circle', { cx: -4, cy: y, r: 3.5, fill: 'url(#screw)' }));
            for (const y of [36, 42, 48]) shell.append(node('path', { d: 'M-10 ' + y + 'H12', stroke: '#050c10', 'stroke-width': 2 }));
            parts.append(node('path', { d: 'M-2-90V' + (length - 52 * size), stroke: '#eef3ed', 'stroke-opacity': .3, 'stroke-width': .75 }));
        }
        parts.append(shell);
        armNode.append(parts); hardware.append(armNode);
    }
    function build()
    {
        cancelNativeReveal();
        finish();
        const width = stage.clientWidth, height = stage.clientHeight;
        if (!width || !height) return;
        sceneDirty = false; stage.dataset.sceneBuilds = ++sceneBuilds;
        const config = variants[variant], mobile = width < 600;
        // Frame the desktop object by height instead of enlarging it with the window width.
        const wide = wideStudy && variant === 'graphic' && width >= 1000 && width / height >= 1.3;
        const alpha = (wide ? 16 : mobile && config.angle > 0 ? 13 : config.angle) * Math.PI / 180;
        const textRadius = wide ? height * .55 : Math.max(width * .75, height * .82) * config.zoom;
        const radius = wide ? height : textRadius / .82;
        const cx = wide ? width * .33 : width * (mobile ? .45 : config.x) - Math.sin(alpha) * textRadius;
        const cy = wide ? height * .78 : height * (height < 430 ? .21 : mobile ? .36 : config.y) + Math.cos(alpha) * textRadius;
        const anchorX = cx + Math.sin(alpha) * textRadius;
        const anchorY = cy - Math.cos(alpha) * textRadius;
        scene = { width, height, cx, cy, radius, textRadius, alpha, anchorX, anchorY, wide };
        stage.dataset.layout = wide ? 'wide' : 'original';
        svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
        svg.dataset.centerOutside = cy > height ? 'true' : 'false';
        svg.dataset.recordDiameter = Math.round(radius * 2);
        for (const layer of [deck, surfaces, labelRotor, print, reflections, hardware]) layer.replaceChildren();
        labelNode = null;
        grooveNodes = [];
        const clip = document.querySelector('#clip-circle');
        clip.setAttribute('cx', cx); clip.setAttribute('cy', cy); clip.setAttribute('r', radius);
        if (config.detail >= 1)
        {
            const wire = config.detail === 2;
            const deckColor = embedded ? getComputedStyle(document.body).getPropertyValue('--record-deck').trim() : '#d6d7cd';
            deck.append(node('rect', { x: -width * .3, y: -height * .2, width: width * 1.5, height: height * 1.7, rx: 20, fill: config.dark ? '#101010' : wire ? '#0c1012' : config.detail === 1 ? deckColor : 'url(#deck-finish)', stroke: wire ? '#4c6067' : '#626966', 'stroke-width': 1 }));
            if (config.detail >= 3) deck.append(node('rect', { x: 0, y: 0, width, height, fill: '#acb2b0', filter: 'url(#surface-noise)', opacity: .28 }));
        }
        const rim = config.detail >= 3 ? '#6c7478' : config.detail === 2 ? '#83949a' : '#515651';
        surfaces.append(node('circle', { cx, cy, r: radius + (config.detail >= 3 ? 9 : 2), fill: config.detail >= 3 ? '#030708' : 'none', stroke: rim, 'stroke-width': config.detail >= 3 ? 2 : 1 }));
        surfaces.append(node('circle', { cx, cy, r: radius, fill: config.dark ? '#151515' : config.detail >= 3 ? 'url(#vinyl)' : config.detail === 1 ? '#101311' : config.detail === 2 ? '#0c1012' : '#151715', stroke: config.detail === 2 ? '#5e727a' : '#242c27', 'stroke-width': 1 }));
        const grooveCount = config.grooves || [7, 20, 27, 124, 180][config.detail];
        const grooveStep = .455 / grooveCount;
        const firstGroove = variant === 'graphic' ? Math.ceil((.28 * 1.01 - .54) / grooveStep) : 0;
        const lastGroove = variant === 'graphic' ? grooveCount : grooveCount - 1;
        for (let q = firstGroove; q <= lastGroove; q++)
        {
            const r = radius * (.54 + q * grooveStep);
            const groove = node('circle', { cx, cy, r, fill: 'none', stroke: config.detail === 2 ? '#a6bdc6' : q % 4 ? '#6c7572' : '#b0b8b2', 'stroke-width': config.detail < 3 ? .8 : q % 4 ? .45 : .65, opacity: config.detail === 2 ? .27 : config.detail < 2 ? .19 : q % 4 ? .15 : .2 });
            surfaces.append(groove); grooveNodes.push(groove);
        }
        if (variant === 'graphic')
        {
            const labelRadius = radius * .28;
            const label = node('g', { class: 'iris-center-label', 'data-radius': labelRadius, transform: 'translate(' + cx + ' ' + cy + ') scale(' + labelRadius / 100 + ')' });
            label.append(node('circle', { r: 101, fill: '#050a07', stroke: '#626b55', 'stroke-width': .45 }));
            label.append(node('use', { href: '#center-iris-pattern' }));
            label.append(node('circle', { r: 2.5, fill: '#babeb4', stroke: '#101911', 'stroke-width': .7 }));
            label.append(node('circle', { cx: -.6, cy: -.8, r: .7, fill: '#eeefe7' }));
            labelRotor.append(label); labelNode = label;
        }
        if (config.detail >= 3)
        {
            reflections.append(node('rect', { width, height, fill: 'url(#record-reflection)' }));
            reflections.append(node('path', { d: 'M' + width * .12 + ' -100L' + width * .85 + ' ' + (height + 100) + 'H' + width * .98 + 'L' + width * .22 + ' -100Z', fill: '#fff', opacity: .018 }));
        }
        const titleSize = Math.min(config.detail === 4 ? 90 : 78, Math.max(mobile ? 36 : 40, width * (config.detail === 4 ? .07 : .061)), height * .115);
        const bodySize = wide ? Math.max(18, Math.min(22, height * .025)) : variant === 'graphic' ? (mobile ? 14 : 16) : Math.min(17, Math.max(11.5, width * .014), height * .04);
        const anchor = mobile ? 'middle' : config.align;
        sections.forEach((section, index) => {
            const group = node('g', { transform: 'translate(' + cx + ' ' + cy + ') rotate(' + (index * 120 + alpha * 180 / Math.PI) + ') translate(0 ' + -textRadius + ')', 'data-copy': index, 'aria-label': section.name });
            const labelsOnly = copyMode === 'labels';
            if (copyMode !== 'titles') group.append(textLine('0' + (index + 1) + ' / ' + section.name.toUpperCase(), 0, labelsOnly ? -bodySize * 2.5 : -Math.max(42, titleSize * 1.16), Math.max(9, bodySize * .76), 'printed-kicker', anchor));
            if (!labelsOnly) section.title.forEach((line, q) => group.append(textLine(line, 0, q * titleSize * 1.08, titleSize, 'printed-title', anchor)));
            if (variant === 'graphic') fillCopy(group, index, bodySize, labelsOnly ? 0 : titleSize * 1.95, anchor);
            else section.body.forEach((line, q) => group.append(textLine(line, 0, (labelsOnly ? 0 : titleSize * 2.48) + q * bodySize * 1.8, bodySize, 'printed-body', anchor)));
            print.append(group);
        });
        drawArm(config, width, height);
        updateSelection(); paint(); frameScene();
    }
    function ensureScene()
    {
        if (!assetsReady || !stage.clientWidth || !stage.clientHeight) return;
        if (sceneDirty || !scene || scene.width !== stage.clientWidth || scene.height !== stage.clientHeight) build();
    }
    function setTransform(item, value)
    {
        if (item.getAttribute('transform') !== value) item.setAttribute('transform', value);
    }
    function paint()
    {
        if (!scene) return;
        const mode = embedded ? entranceMode : 'cue';
        const state = RecordEntranceMotion.sample(mode, reveal, scene.width, scene.height);
        const { cx, cy, width, height } = scene;
        // Circular grooves look identical at every angle: rotate only the print and the iris.
        // Keep translation/scale on their common parent for the roll and camera studies.
        setTransform(arrival, 'translate(' + state.x + ' ' + state.y + ') translate(' + cx + ' ' + cy + ') scale(' + state.scale + ') translate(' + -cx + ' ' + -cy + ')');
        const turn = 'rotate(' + (rotation + state.angle).toFixed(4) + ' ' + cx + ' ' + cy + ')';
        setTransform(rotor, turn); setTransform(labelRotor, turn);
        arrival.style.opacity = state.opacity;
        hardware.style.opacity = state.armOpacity;
        print.style.opacity = state.textOpacity;
        if (scene.wide) print.querySelectorAll('[data-copy]').forEach(group => {
            // The smaller crop exposes the next sector at the left edge; fade it before it enters the reading position.
            const angle = mod(Number(group.dataset.copy) * 120 + rotation + 180, 360) - 180;
            group.style.opacity = Math.max(0, Math.min(1, (100 - Math.abs(angle)) / 25));
        });
        if (labelNode) labelNode.style.opacity = state.textureOpacity;
        stage.dataset.entranceMode = mode;
        stage.dataset.entranceProgress = reveal.toFixed(3);
        if (mode === 'trace')
        {
            grooveNodes.forEach((groove, index) => {
                const p = Math.max(0, Math.min(1, (state.grooves - index / grooveNodes.length * .18) / .82));
                groove.setAttribute('pathLength', '1'); groove.style.strokeDasharray = '1'; groove.style.strokeDashoffset = 1 - p;
                groove.setAttribute('transform', 'rotate(-135 ' + cx + ' ' + cy + ')');
            });
        }
        if (state.scan !== null && state.scan < 1)
        {
            arrival.setAttribute('clip-path', 'url(#record-arrival-clip)');
            arrivalWindow.setAttribute('width', width); arrivalWindow.setAttribute('height', height * state.scan);
            scanLine.setAttribute('d', 'M0 ' + height * state.scan + 'H' + width);
            scanLine.setAttribute('opacity', Math.sin(Math.PI * state.scan) * .8);
        }
        else { arrival.removeAttribute('clip-path'); scanLine.setAttribute('opacity', '0'); }
        if (mode === 'camera')
        {
            const w = width / state.zoom, h = height / state.zoom;
            svg.setAttribute('viewBox', [(width - w) * .44, (height - h) * .35, w, h].join(' '));
        }
        stage.style.setProperty('--record-reveal', reveal);
        if (armNode)
        {
            const arm = scene.arm;
            armNode.setAttribute('transform', 'translate(' + arm.x + ' ' + arm.y + ') rotate(' + (arm.angle + armTrack * (arm.trackSweep || 2) + state.armAngle).toFixed(4) + ')' + (arm.scale ? ' scale(' + arm.scale + ')' : ''));
        }
    }
    function updateSelection()
    {
        document.querySelectorAll('button[data-section]').forEach(button => button.setAttribute('aria-pressed', Number(button.dataset.section) === selected));
        print.querySelectorAll('[data-copy]').forEach(group => group.setAttribute('aria-hidden', Number(group.dataset.copy) !== selected));
        document.querySelector('#record-announcement').textContent = sections[selected].name;
        svg.dataset.section = selected;
    }
    function finish()
    {
        cancelAnimationFrame(frame); frame = 0;
        rotation = targetRotation; armTrack = selected;
        paint();
    }
    function commit(index, target)
    {
        cancelAnimationFrame(frame); frame = 0;
        selected = mod(index, sections.length); targetRotation = target;
        updateSelection();
        if (reduced.matches || document.hidden) { finish(); return; }
        const from = rotation, fromArm = armTrack;
        const duration = Math.min(1700, 850 + Math.abs(target - from) * 3);
        let start = null;
        const tick = now => {
            if (start === null) start = now;
            const t = Math.min(1, (now - start) / duration);
            const ease = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            rotation = from + (target - from) * ease;
            armTrack = fromArm + (selected - fromArm) * ease;
            paint();
            if (t < 1) frame = requestAnimationFrame(tick);
            else { frame = 0; rotation = target; paint(); }
        };
        frame = requestAnimationFrame(tick);
    }
    function chooseSection(index)
    {
        index = mod(index, sections.length);
        if (index === selected) return;
        const direction = mod(index - selected, sections.length) === 2 ? -1 : 1;
        commit(index, targetRotation - direction * 120);
    }
    function chooseVariant(name, historyChange = true)
    {
        variant = variants[name] ? name : 'minimal';
        sceneDirty = true;
        document.body.dataset.variant = variant;
        document.querySelectorAll('[data-variant]').forEach(button => {
            if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed', button.dataset.variant === variant);
        });
        document.title = 'Record / ' + variant[0].toUpperCase() + variant.slice(1) + ' — Timbuhtuk';
        if (historyChange)
        {
            const url = new URL(location.href); url.searchParams.set('variant', variant);
            history.pushState(null, '', url);
        }
        ensureScene();
    }
    document.querySelectorAll('button[data-variant]').forEach(button => button.addEventListener('click', () => chooseVariant(button.dataset.variant)));
    detailButton.addEventListener('click', () => {
        centerDetail = !centerDetail;
        const url = new URL(location.href);
        if (centerDetail) url.searchParams.set('detail', 'center'); else url.searchParams.delete('detail');
        history.replaceState(null, '', url); frameScene();
    });
    document.querySelectorAll('button[data-section]').forEach(button => button.addEventListener('click', () => chooseSection(Number(button.dataset.section))));
    document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => chooseSection(selected + Number(button.dataset.step))));
    svg.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        cancelAnimationFrame(frame); frame = 0;
        gesture = { x: event.clientX, rotation };
        svg.setPointerCapture(event.pointerId); stage.classList.add('dragging');
    });
    svg.addEventListener('pointermove', event => {
        if (!gesture) return;
        rotation = gesture.rotation + (event.clientX - gesture.x) / stage.clientWidth * 220;
        paint();
    });
    function release()
    {
        if (!gesture) return;
        gesture = null; stage.classList.remove('dragging');
        const step = Math.round(rotation / 120);
        commit(mod(-step, sections.length), step * 120);
    }
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) svg.addEventListener(name, release);
    stage.addEventListener('wheel', event => {
        if (event.ctrlKey || Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
        event.preventDefault();
        if (performance.now() - wheelTime < 1300) return;
        wheelSum += event.deltaY;
        if (Math.abs(wheelSum) < 65) return;
        chooseSection(selected + Math.sign(wheelSum)); wheelSum = 0; wheelTime = performance.now();
    }, { passive: false });
    document.addEventListener('keydown', event => {
        if (event.target.closest('.study-controls')) return;
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault(); chooseSection(selected + (event.key === 'ArrowRight' ? 1 : -1));
    });
    window.addEventListener('popstate', () => {
        const params = new URLSearchParams(location.search);
        centerDetail = params.get('detail') === 'center';
        chooseVariant(params.get('variant'), false);
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { release(); finish(); settleReveal(stage.dataset.entrance === 'leaving' || stage.dataset.entrance === 'hidden' ? 0 : 1); }
    });
    window.addEventListener('blur', release);
    window.addEventListener('pagehide', finish);
    reduced.addEventListener('change', () => { finish(); if (reduced.matches) settleReveal(stage.dataset.entrance === 'leaving' || stage.dataset.entrance === 'hidden' ? 0 : 1); });
    if (embedded)
    {
        window.addEventListener('message', event => {
            if (event.source !== window.parent || event.origin !== location.origin || event.data?.type !== 'personal-record-transition') return;
            const { phase, animate, duration } = event.data;
            if (!['enter', 'leave', 'visible', 'hidden'].includes(phase)) return;
            window.dispatchEvent(new Event('personal-cursor-reset'));
            if ((phase === 'enter' || phase === 'leave') && animate) animateReveal(phase === 'enter', Math.max(100, Math.min(4000, duration || 1700)));
            else { finish(); ensureScene(); settleReveal(phase === 'visible' || phase === 'enter' ? 1 : 0); }
        });
        colorScheme.addEventListener('change', () => { sceneDirty = true; ensureScene(); });
    }
    const observer = new ResizeObserver(() => {
        clearTimeout(resizeTimer); resizeTimer = setTimeout(ensureScene, 80);
    });
    observer.observe(stage);
    buildCenterPattern();
    chooseVariant(new URLSearchParams(location.search).get('variant'), false);
    const texture = new Image(); texture.src = 'assets/record/iris-eye-v3.webp';
    // A hidden iframe has not requested the SVG text fonts yet; fonts.ready alone is too early.
    const fonts = Promise.all([document.fonts.load('14px "Cascadia Code"'), document.fonts.load('600 40px "Science Gothic"')]).catch(() => {});
    window.RecordStudyReady = Promise.all([fonts, texture.decode().catch(() => {})]).then(() => { assetsReady = true; sceneDirty = true; ensureScene(); });
    window.RecordStudyReady.catch(() => {});
    window.RecordStudyPrepare = async () => {
        await window.RecordStudyReady;
        // The parent has now exposed the iframe at its final size, behind the closed seam.
        clearTimeout(resizeTimer); ensureScene();
        if (document.hidden || reduced.matches) return;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        ensureScene();
    };
})();
