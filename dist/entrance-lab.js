(() => {
    const motion = EntranceMotion;
    const root = document.documentElement;
    const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));

    async function waitForScene()
    {
        if (document.readyState !== 'complete') await new Promise(resolve => window.addEventListener('load', resolve, { once: true }));
        await document.fonts.ready;
        const started = performance.now();
        while (!artwork?.drawnResult || artwork.drawnResult !== artwork.geometry?.result || !artwork.name?.atlas)
        {
            if (performance.now() - started > 8000) throw Error('The first artwork frame did not become ready.');
            await new Promise(resolve => setTimeout(resolve, 25));
        }
        await nextFrame();
    }

    class EntranceLab
    {
        constructor()
        {
            this.panel = document.querySelector('#imprint');
            this.surface = document.querySelector('.imprint-content');
            this.art = document.querySelector('.imprint-art');
            this.heading = document.querySelector('h1');
            this.eyebrow = document.querySelector('.eyebrow');
            this.caption = document.querySelector('.imprint-copy p');
            this.links = [...document.querySelectorAll('.social-links a')];
            this.life = [...document.querySelectorAll('.life-divider')];
            this.items = [this.eyebrow, this.caption, ...this.links];
            this.elements = [this.heading, this.art, artwork.canvas, ...this.life, ...this.items];
            this.variants = [...document.querySelectorAll('[data-variant]')];
            this.replayButton = document.querySelector('#entrance-replay');
            this.playButton = document.querySelector('#entrance-play');
            this.slowButton = document.querySelector('#entrance-slow');
            this.scrubber = document.querySelector('#entrance-seek');
            this.timeLabel = document.querySelector('#entrance-time');
            this.status = document.querySelector('#entrance-status');
            this.description = document.querySelector('#entrance-description');
            this.rate = 1;
            this.frame = 0;
            this.time = 0;
            this.lastTime = 0;
            this.mode = 'impulse';
            this.playing = false;
            this.request = 0;
            this.fx = document.createElement('canvas');
            this.fx.className = 'entrance-fx';
            this.fx.setAttribute('aria-hidden', 'true');
            this.surface.append(this.fx);
            this.context = this.fx.getContext('2d');
            this.plot = document.createElement('canvas');
            this.plot.className = 'entrance-contours';
            this.plot.setAttribute('aria-hidden', 'true');
            this.plot.hidden = true;
            this.art.append(this.plot);
            this.plotContext = this.plot.getContext('2d');
            this.elements.push(this.plot);
            for (const button of this.variants) button.addEventListener('click', () => this.start(button.dataset.variant));
            this.replayButton.addEventListener('click', () => this.start(this.mode));
            this.playButton.addEventListener('click', () => this.togglePlay());
            this.slowButton.addEventListener('click', () => {
                this.rate = this.rate === 1 ? .5 : 1;
                this.slowButton.setAttribute('aria-pressed', String(this.rate === .5));
            });
            this.scrubber.addEventListener('input', () => this.seek(Number(this.scrubber.value) / 1000));
            window.addEventListener('resize', () => { if (root.classList.contains('entrance-running')) this.finish(); });
            document.addEventListener('visibilitychange', () => {
                if (document.hidden && this.playing) this.togglePlay();
            });
            for (const control of document.querySelectorAll('.entrance-controls button, .entrance-controls input')) control.disabled = false;
            const requested = new URLSearchParams(location.search).get('variant');
            this.start(Object.hasOwn(motion.variants, requested) ? requested : 'impulse');
        }

        get duration() { return motion.variants[this.mode].duration; }

        resetVisuals()
        {
            for (const element of this.elements)
                for (const property of ['opacity', 'transform', 'clip-path', 'filter', 'transform-origin']) element.style.removeProperty(property);
            this.plot.hidden = true;
            this.context.clearRect(0, 0, this.width || 0, this.height || 0);
        }

        freeze()
        {
            paused = true;
            cancelAnimationFrame(animationFrame);
            animationFrame = 0;
            artwork.name.motion.settle();
            artwork.name.render(0, false);
            root.classList.add('entrance-running');
        }

        measure()
        {
            const surface = this.surface.getBoundingClientRect();
            this.width = surface.width;
            this.height = surface.height;
            const viewport = contourViewport(this.width, this.height, window.devicePixelRatio);
            this.fx.width = viewport.pixelWidth;
            this.fx.height = viewport.pixelHeight;
            this.context.setTransform(this.fx.width / this.width, 0, 0, this.fx.height / this.height, 0, 0);
            this.bounds = new Map();
            for (const element of [this.heading, ...this.items])
            {
                const rect = element.getBoundingClientRect();
                const range = document.createRange();
                range.selectNodeContents(element);
                this.bounds.set(element, { x: rect.x - surface.x, y: rect.y - surface.y, width: rect.width, height: rect.height,
                    inkWidth: element.tagName === 'A' ? rect.width : range.getBoundingClientRect().width,
                    center: { x: rect.x - surface.x + rect.width / 2, y: rect.y - surface.y + rect.height / 2 } });
            }
            this.center = this.bounds.get(this.heading).center;
            this.artOpacity = getComputedStyle(this.art).opacity;
            this.plot.style.transformOrigin = `${this.center.x}px ${this.center.y}px`;
            this.plot.width = artwork.canvas.width;
            this.plot.height = artwork.canvas.height;
            this.plotContext.setTransform(this.plot.width / artwork.width, 0, 0, this.plot.height / artwork.height, 0, 0);
            this.plotContext.save();
            this.plotContext.setTransform(1, 0, 0, 1, 0, 0);
            this.plotContext.drawImage(artwork.canvas, 0, 0);
            this.plotContext.restore();
            this.nameAtlas = artwork.name.atlas;
            this.nameParticles = artwork.name.motion.particles.map(particle => ({ ...particle }));
            this.nameTilePixels = artwork.name.tilePixels;
            this.geometry = artwork.geometry.result;
            this.lines = this.geometry.frames.flatMap(frame => frame.paths.map((path, index) => {
                const points = [];
                let length = 0;
                for (let q = path.offset; q < path.offset + path.length; q += 2)
                {
                    const point = { x: this.geometry.coordinates[q], y: this.geometry.coordinates[q + 1] };
                    if (points.length) length += Math.hypot(point.x - points.at(-1).x, point.y - points.at(-1).y);
                    points.push({ ...point, distance: length });
                }
                if (path.closed && points.length)
                {
                    length += Math.hypot(points[0].x - points.at(-1).x, points[0].y - points.at(-1).y);
                    points.push({ ...points[0], distance: length });
                }
                return { points, length, opacity: path.opacity, order: index / Math.max(1, frame.paths.length - 1) };
            }));
            this.measureLetters(surface);
        }

        measureLetters(surface)
        {
            this.letters = [];
            const walker = document.createTreeWalker(this.heading, NodeFilter.SHOW_TEXT);
            while (walker.nextNode())
            {
                const node = walker.currentNode;
                const style = getComputedStyle(node.parentElement);
                const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
                this.context.font = font;
                for (let q = 0; q < node.length; q++)
                {
                    const range = document.createRange();
                    range.setStart(node, q);
                    range.setEnd(node, q + 1);
                    const rect = range.getBoundingClientRect();
                    const metrics = this.context.measureText(node.textContent[q]);
                    const ascent = metrics.fontBoundingBoxAscent ?? parseFloat(style.fontSize) * .8;
                    const descent = metrics.fontBoundingBoxDescent ?? parseFloat(style.fontSize) * .2;
                    this.letters.push({ text: node.textContent[q], font, x: rect.x - surface.x,
                        y: rect.y - surface.y + rect.height * ascent / (ascent + descent), width: rect.width });
                }
            }
            this.nameLeft = Math.min(...this.letters.map(letter => letter.x));
            this.nameRight = Math.max(...this.letters.map(letter => letter.x + letter.width));
        }

        async start(mode)
        {
            const request = ++this.request;
            cancelAnimationFrame(this.frame);
            this.playing = false;
            this.resetVisuals();
            this.mode = mode;
            this.time = 0;
            this.lastTime = 0;
            for (const button of this.variants) button.setAttribute('aria-pressed', String(button.dataset.variant === mode));
            this.description.textContent = motion.variants[mode].description;
            const url = new URL(location.href);
            url.searchParams.set('variant', mode);
            history.replaceState(null, '', url);
            this.status.textContent = 'Preparing';
            try
            {
                await waitForScene();
                if (request !== this.request) return;
                this.freeze();
                this.measure();
            }
            catch (error)
            {
                if (request !== this.request) return;
                this.finish();
                this.status.textContent = 'Preview unavailable';
                console.error('Entrance preview failed', error);
                return;
            }
            this.render();
            root.classList.remove('entrance-pending');
            if (reducedMotion.matches)
            {
                this.finish();
                this.status.textContent = 'Reduced motion';
                return;
            }
            this.playing = true;
            this.updateControls();
            this.frame = requestAnimationFrame(now => this.tick(now));
        }

        togglePlay()
        {
            if (this.time >= this.duration) { this.start(this.mode); return; }
            this.playing = !this.playing;
            cancelAnimationFrame(this.frame);
            this.lastTime = 0;
            this.updateControls();
            if (this.playing) this.frame = requestAnimationFrame(now => this.tick(now));
        }

        seek(progress)
        {
            if (!artwork.geometry.result) { this.updateControls(); return; }
            this.request++;
            cancelAnimationFrame(this.frame);
            this.playing = false;
            if (!root.classList.contains('entrance-running'))
            {
                this.resetVisuals();
                this.freeze();
                this.measure();
            }
            this.time = progress * this.duration;
            this.render();
            this.updateControls();
            if (progress === 1) this.finish();
        }

        tick(now)
        {
            if (!this.playing) return;
            if (this.lastTime) this.time = Math.min(this.duration, this.time + Math.min(50, now - this.lastTime) * this.rate);
            this.lastTime = now;
            this.render();
            this.updateControls();
            if (this.time >= this.duration) { this.finish(); return; }
            this.frame = requestAnimationFrame(next => this.tick(next));
        }

        finish()
        {
            this.request++;
            cancelAnimationFrame(this.frame);
            this.playing = false;
            this.time = this.duration;
            this.resetVisuals();
            root.classList.remove('entrance-running', 'entrance-pending');
            paused = reducedMotion.matches;
            startAnimation();
            this.updateControls();
        }

        updateControls()
        {
            this.scrubber.value = String(Math.round(this.time / this.duration * 1000));
            this.timeLabel.value = `${(this.time / 1000).toFixed(2)} / ${(this.duration / 1000).toFixed(2)} s`;
            const action = this.playing ? 'Pause' : 'Play';
            const status = this.playing ? 'Playing' : this.time >= this.duration ? 'Ready' : 'Paused';
            if (this.playButton.textContent !== action) this.playButton.textContent = action;
            if (this.status.textContent !== status) this.status.textContent = status;
            this.panel.dataset.entranceVariant = this.mode;
            this.panel.dataset.entranceProgress = String(Math.round(this.time / this.duration * 100));
        }

        revealItem(element, progress, bend = 0)
        {
            const bounds = this.bounds.get(element);
            const flight = motion.flight(progress, this.center, bounds.center, bend);
            const halfWidth = (bounds.inkWidth * flight.scale + bounds.height * Math.abs(flight.rotation) * Math.PI / 180) / 2;
            const centerX = Math.max(8 + halfWidth, Math.min(this.width - 8 - halfWidth, bounds.center.x + flight.x));
            flight.x = centerX - bounds.center.x;
            element.style.opacity = flight.opacity;
            element.style.transform = `translate(${flight.x}px, ${flight.y}px) scale(${flight.scale}) rotate(${flight.rotation}deg)`;
        }

        revealLife(time, start, end)
        {
            for (let q = 0; q < this.life.length; q++)
            {
                const p = motion.out(time, start + q * 65, end + q * 65);
                this.life[q].style.opacity = p;
                this.life[q].style.clipPath = `inset(0 ${(1 - p) * 50}% 0 ${(1 - p) * 50}%)`;
            }
        }

        render()
        {
            this.context.clearRect(0, 0, this.width, this.height);
            this[this.mode]();
        }

        impulse()
        {
            const time = this.time;
            this.heading.style.opacity = time >= 870 ? 1 : 0;
            if (time < 870)
            {
                const spread = Math.min(260, this.width * .32);
                for (let q = 0; q < this.nameParticles.length; q++)
                {
                    const particle = this.nameParticles[q];
                    const pose = motion.particle(time, q, particle, this.center, spread);
                    this.context.save();
                    this.context.globalAlpha = pose.opacity;
                    this.context.translate(pose.x, pose.y);
                    this.context.rotate(pose.angle);
                    this.context.scale(pose.scale, pose.scale);
                    this.context.drawImage(this.nameAtlas, particle.sourceX, particle.sourceY, this.nameTilePixels, this.nameTilePixels,
                        -particle.center, -particle.center, particle.size, particle.size);
                    this.context.restore();
                }
            }
            const wave = motion.out(time, 690, 1810);
            const radius = Math.hypot(this.width, this.height) * wave;
            this.art.style.clipPath = `circle(${radius}px at ${this.center.x}px ${this.center.y}px)`;
            this.art.style.opacity = this.artOpacity * motion.smooth(time, 700, 1200);
            if (time > 690 && time < 1810)
            {
                this.context.strokeStyle = `rgba(241,241,241,${.24 * (1 - wave)})`;
                this.context.lineWidth = 1;
                this.context.beginPath();
                this.context.arc(this.center.x, this.center.y, radius, 0, Math.PI * 2);
                this.context.stroke();
            }
            this.revealItem(this.eyebrow, motion.out(time, 850, 1500));
            this.revealItem(this.caption, motion.out(time, 960, 1590));
            this.links.forEach((link, q) => this.revealItem(link, motion.out(time, 1070 + q * 65, 1760 + q * 65)));
            this.revealLife(time, 1400, 2000);
        }

        gravity()
        {
            const time = this.time;
            const title = motion.progress(time, 0, 760);
            const spring = motion.spring(title);
            this.heading.style.opacity = 0;
            this.context.save();
            this.context.globalAlpha = motion.smooth(time, 0, 220);
            this.context.translate(this.center.x, this.center.y);
            this.context.scale(.35 + spring * .65, .8 + spring * .2);
            this.context.translate(-this.center.x, -this.center.y);
            this.context.fillStyle = '#f1f1f1';
            this.context.textBaseline = 'alphabetic';
            for (const letter of this.letters)
            {
                this.context.font = letter.font;
                this.context.fillText(letter.text, letter.x, letter.y);
            }
            this.context.restore();
            const release = motion.spring(motion.progress(time, 480, 1850));
            artwork.canvas.style.opacity = 0;
            this.plot.hidden = false;
            this.plot.style.transform = `scale(${.08 + release * .92}, ${.12 + release * .88})`;
            this.art.style.opacity = this.artOpacity * motion.smooth(time, 450, 1350);
            this.items.forEach((element, q) => {
                const bend = (q % 2 ? 1 : -1) * Math.min(190, this.width * .22);
                this.revealItem(element, motion.progress(time, 680 + q * 90, 1690 + q * 90), bend);
            });
            this.revealLife(time, 1500, 2120);
        }

        drawNameOutline()
        {
            const trace = motion.out(this.time, 0, 900);
            const fill = motion.smooth(this.time, 560, 1200);
            const bounds = this.bounds.get(this.heading);
            this.context.save();
            this.context.beginPath();
            this.context.rect(this.nameLeft - 2, bounds.y - 24, (this.nameRight - this.nameLeft + 4) * trace, bounds.height + 48);
            this.context.clip();
            this.context.lineWidth = .85;
            this.context.strokeStyle = `rgba(241,241,241,${1 - fill})`;
            this.context.textBaseline = 'alphabetic';
            for (const letter of this.letters)
            {
                this.context.font = letter.font;
                this.context.strokeText(letter.text, letter.x, letter.y);
            }
            this.context.restore();
            this.context.save();
            this.context.beginPath();
            this.context.rect(this.nameLeft - 2, bounds.y + bounds.height * (1 - fill) - 16, this.nameRight - this.nameLeft + 4, (bounds.height + 32) * fill);
            this.context.clip();
            this.context.fillStyle = '#f1f1f1';
            this.context.textBaseline = 'alphabetic';
            for (const letter of this.letters)
            {
                this.context.font = letter.font;
                this.context.fillText(letter.text, letter.x, letter.y);
            }
            this.context.restore();
        }

        traceLine(context, points, distance)
        {
            if (!points.length || distance <= 0) return;
            context.beginPath();
            context.moveTo(points[0].x, points[0].y);
            for (let q = 1; q < points.length; q++)
            {
                const first = points[q - 1], second = points[q];
                if (second.distance <= distance) context.lineTo(second.x, second.y);
                else
                {
                    const p = (distance - first.distance) / Math.max(.001, second.distance - first.distance);
                    context.lineTo(motion.mix(first.x, second.x, p), motion.mix(first.y, second.y, p));
                    break;
                }
            }
            context.stroke();
        }

        plotter()
        {
            const time = this.time;
            this.heading.style.opacity = time >= 1200 ? 1 : 0;
            if (time < 1200) this.drawNameOutline();
            artwork.canvas.style.opacity = 0;
            this.plot.hidden = false;
            this.plotContext.clearRect(0, 0, artwork.width, artwork.height);
            this.plotContext.lineWidth = 1.3;
            this.plotContext.lineCap = this.plotContext.lineJoin = 'round';
            for (const line of this.lines)
            {
                const p = motion.out(time, 950 + line.order * 420, 2100 + line.order * 400);
                this.plotContext.strokeStyle = `rgba(230,230,226,${line.opacity})`;
                this.traceLine(this.plotContext, line.points, line.length * p);
            }
            this.plotContext.fillStyle = `rgba(255,116,36,${motion.smooth(time, 1900, 2400)})`;
            for (const frame of this.geometry.frames) this.plotContext.fillRect(frame.center.x - 3, frame.center.y - 3, 6, 6);
            this.eyebrow.style.opacity = motion.smooth(time, 1050, 1550);
            this.caption.style.opacity = motion.smooth(time, 1180, 1680);
            this.links.forEach((link, q) => {
                const bounds = this.bounds.get(link);
                const p = motion.out(time, 1180 + q * 110, 1830 + q * 110);
                const fade = 1 - motion.smooth(time, 1850 + q * 70, 2350 + q * 70);
                const points = [{ x: bounds.x, y: bounds.y, distance: 0 },
                    { x: bounds.x + bounds.width, y: bounds.y, distance: bounds.width },
                    { x: bounds.x + bounds.width, y: bounds.y + bounds.height, distance: bounds.width + bounds.height },
                    { x: bounds.x, y: bounds.y + bounds.height, distance: bounds.width * 2 + bounds.height },
                    { x: bounds.x, y: bounds.y, distance: (bounds.width + bounds.height) * 2 }];
                this.context.strokeStyle = `rgba(241,241,241,${.5 * fade})`;
                this.context.lineWidth = 1;
                this.traceLine(this.context, points, (bounds.width + bounds.height) * 2 * p);
                link.style.opacity = motion.smooth(time, 1590 + q * 110, 2130 + q * 110);
            });
            const connector = motion.out(time, 850, 1400);
            this.context.strokeStyle = `rgba(241,241,241,${.3 * (1 - motion.smooth(time, 1600, 2250))})`;
            this.context.lineWidth = 1;
            for (const [element, side] of [[this.eyebrow, -1], [this.caption, 1]])
            {
                const target = this.bounds.get(element).center;
                const x = this.center.x + side * Math.min(180, this.width * .25);
                this.context.beginPath();
                this.context.moveTo(x, this.center.y);
                this.context.lineTo(x, motion.mix(this.center.y, target.y, connector));
                this.context.lineTo(motion.mix(x, target.x, connector), motion.mix(this.center.y, target.y, connector));
                this.context.stroke();
            }
            this.revealLife(time, 1950, 2550);
        }

        split()
        {
            const time = this.time;
            const title = motion.out(time, 240, 850);
            this.heading.style.clipPath = `inset(${(1 - title) * 50}% 0)`;
            this.heading.style.opacity = time >= 240 ? 1 : 0;
            const opening = motion.out(time, 690, 1870);
            const top = this.center.y * (1 - opening);
            const bottom = this.center.y + (this.height - this.center.y) * opening;
            this.art.style.clipPath = `inset(${top}px 0 ${this.height - bottom}px 0)`;
            this.art.style.opacity = this.artOpacity * motion.smooth(time, 690, 1350);
            artwork.canvas.style.opacity = 0;
            this.plot.hidden = false;
            this.plot.style.transform = `scaleY(${1.08 - opening * .08})`;
            this.items.forEach((element, q) => {
                const bounds = this.bounds.get(element);
                const progress = motion.out(time, 870 + q * 70, 1500 + q * 80);
                element.style.opacity = progress;
                element.style.transform = `translateY(${(bounds.center.y < this.center.y ? 22 : -22) * (1 - progress)}px)`;
                element.style.clipPath = `inset(${(1 - progress) * 50}% 0)`;
            });
            const length = motion.out(time, 0, 600) * motion.mix(this.nameRight - this.nameLeft + 32, this.width, opening);
            const opacity = (1 - motion.smooth(time, 1350, 1900)) * .7;
            this.context.strokeStyle = `rgba(241,241,241,${opacity})`;
            this.context.lineWidth = 1;
            this.context.beginPath();
            for (const y of time < 690 ? [this.center.y] : [top, bottom])
            {
                this.context.moveTo(this.center.x - length / 2, y);
                this.context.lineTo(this.center.x + length / 2, y);
            }
            this.context.stroke();
            this.revealLife(time, 1640, 2050);
        }
    }

    waitForScene().then(() => new EntranceLab()).catch(error => {
        root.classList.remove('entrance-pending', 'entrance-running');
        document.querySelector('#entrance-status').textContent = 'Preview unavailable';
        console.error('Entrance preview failed', error);
    });
})();
