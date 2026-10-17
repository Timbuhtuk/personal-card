class TriangleMagnet
{
    constructor(particles)
    {
        this.particles = particles;
        this.moving = false;
        this.settle();
    }

    settle()
    {
        for (const particle of this.particles)
        {
            particle.x = particle.targetX;
            particle.y = particle.targetY;
            particle.vx = particle.vy = particle.angle = particle.turn = 0;
        }
        this.moving = false;
    }

    scatter(x, y, radius)
    {
        for (const particle of this.particles)
        {
            const dx = particle.x - x, dy = particle.y - y;
            const distance = Math.hypot(dx, dy);
            if (distance >= radius) continue;
            const direction = distance > .01 ? Math.atan2(dy, dx) : particle.spin * Math.PI;
            const force = 18 * (1 - distance / radius);
            particle.vx += Math.cos(direction) * force;
            particle.vy += Math.sin(direction) * force;
            particle.turn += particle.spin * .18;
            this.moving = true;
        }
    }

    step(delta, pointer, radius)
    {
        if (delta <= 0 || (!this.moving && !pointer?.active)) return this.moving;
        let remaining = Math.min(delta / 16.67, 4);
        this.moving = false;
        while (remaining > 0)
        {
            const frame = Math.min(remaining, 1);
            remaining -= frame;
            const damping = Math.pow(.83, frame);
            for (const particle of this.particles)
            {
                // Spring attraction restores the name after pointer repulsion.
                particle.vx += (particle.targetX - particle.x) * .022 * frame;
                particle.vy += (particle.targetY - particle.y) * .022 * frame;
                if (pointer?.active)
                {
                    const dx = particle.x - pointer.x, dy = particle.y - pointer.y;
                    const distance = Math.hypot(dx, dy);
                    if (distance < radius)
                    {
                        const direction = distance > .01 ? Math.atan2(dy, dx) : particle.spin * Math.PI;
                        const force = (1 - distance / radius) * 2.2 * frame;
                        particle.vx += Math.cos(direction) * force;
                        particle.vy += Math.sin(direction) * force;
                        particle.turn += particle.spin * force * .012;
                    }
                }
                particle.vx *= damping;
                particle.vy *= damping;
                particle.x += particle.vx * frame;
                particle.y += particle.vy * frame;
                particle.turn = (particle.turn - particle.angle * .014 * frame) * damping;
                particle.angle += particle.turn * frame;
                const moving = Math.hypot(particle.x - particle.targetX, particle.y - particle.targetY) > .08
                    || Math.hypot(particle.vx, particle.vy) > .03 || Math.abs(particle.angle) > .003;
                if (moving) this.moving = true;
                else
                {
                    particle.x = particle.targetX;
                    particle.y = particle.targetY;
                    particle.vx = particle.vy = particle.angle = particle.turn = 0;
                }
            }
        }
        return this.moving;
    }
}

class TriangleName
{
    constructor(panel, enabled)
    {
        this.heading = panel.querySelector('.imprint-copy h1');
        this.surface = panel.querySelector('.imprint-content');
        this.enabled = enabled;
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'imprint-name-art';
        this.canvas.setAttribute('aria-hidden', 'true');
        this.surface.insertBefore(this.canvas, panel.querySelector('.imprint-copy'));
        this.context = this.canvas.getContext('2d');
        this.pointer = { x: 0, y: 0, active: false };
        const point = event => {
            const bounds = this.canvas.getBoundingClientRect();
            this.pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top, active: this.enabled() };
        };
        for (const event of ['pointerenter', 'pointermove']) this.heading.addEventListener(event, point);
        this.heading.addEventListener('pointerdown', event => {
            point(event);
            if (!this.enabled() || !this.motion) return;
            this.motion.scatter(this.pointer.x, this.pointer.y, this.radius * 1.8);
            if (event.pointerType !== 'mouse') this.heading.setPointerCapture(event.pointerId);
        });
        this.heading.addEventListener('pointerup', event => {
            if (event.pointerType !== 'mouse') this.pointer.active = false;
        });
        for (const event of ['pointerleave', 'pointercancel', 'lostpointercapture'])
            this.heading.addEventListener(event, () => { this.pointer.active = false; });
    }

    initialize()
    {
        this.heading.classList.remove('is-fragmenting');
        this.pointer.active = false;
        const bounds = this.canvas.getBoundingClientRect();
        this.width = bounds.width;
        this.height = bounds.height;
        const scale = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = Math.ceil(this.width * scale);
        this.canvas.height = Math.ceil(this.height * scale);
        this.context.setTransform(scale, 0, 0, scale, 0, 0);
        const letters = [];
        const walker = document.createTreeWalker(this.heading, NodeFilter.SHOW_TEXT);
        while (walker.nextNode())
        {
            const node = walker.currentNode;
            const style = getComputedStyle(node.parentElement);
            for (let q = 0; q < node.length; q++)
            {
                const range = document.createRange();
                range.setStart(node, q);
                range.setEnd(node, q + 1);
                const rect = range.getBoundingClientRect();
                letters.push({ text: node.textContent[q], rect, style });
            }
        }
        const left = Math.floor(Math.min(...letters.map(letter => letter.rect.left)) - bounds.left - 2);
        const top = Math.floor(Math.min(...letters.map(letter => letter.rect.top)) - bounds.top - 2);
        const right = Math.ceil(Math.max(...letters.map(letter => letter.rect.right)) - bounds.left + 2);
        const bottom = Math.ceil(Math.max(...letters.map(letter => letter.rect.bottom)) - bounds.top + 2);
        const buffer = document.createElement('canvas');
        buffer.width = Math.ceil((right - left) * scale);
        buffer.height = Math.ceil((bottom - top) * scale);
        const context = buffer.getContext('2d', { willReadFrequently: true });
        context.scale(scale, scale);
        for (const letter of letters)
        {
            const style = letter.style;
            context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
            context.fillStyle = style.color;
            context.textBaseline = 'alphabetic';
            const metrics = context.measureText(letter.text);
            const ascent = metrics.fontBoundingBoxAscent ?? parseFloat(style.fontSize) * .8;
            const descent = metrics.fontBoundingBoxDescent ?? parseFloat(style.fontSize) * .2;
            const baseline = letter.rect.top - bounds.top - top + letter.rect.height * ascent / (ascent + descent);
            context.fillText(letter.text, letter.rect.left - bounds.left - left, baseline);
        }
        const fontSize = parseFloat(getComputedStyle(this.heading).fontSize);
        const step = Math.max(6, Math.min(12, Math.round(fontSize * .12)));
        this.radius = Math.max(60, Math.min(110, fontSize * 1.25));
        const image = context.getImageData(0, 0, buffer.width, buffer.height);
        const particles = [];
        const masks = [];
        for (let y = 0; y < bottom - top; y += step)
            for (let x = 0; x < right - left; x += step)
                for (let half = 0; half < 2; half++)
                {
                    let occupied = false;
                    for (let e = 0; e < step && !occupied; e++)
                        for (let f = 0; f < step; f++)
                        {
                            if (half === 0 ? f + e >= step : f + e < step) continue;
                            const px = Math.floor((x + f + .5) * scale), py = Math.floor((y + e + .5) * scale);
                            if (px < buffer.width && py < buffer.height && image.data[(py * buffer.width + px) * 4 + 3] > 20)
                            { occupied = true; break; }
                        }
                    if (!occupied) continue;
                    masks.push({ x, y, half });
                    const center = step * (half === 0 ? 1 / 3 : 2 / 3);
                    particles.push({ targetX: left + x + center, targetY: top + y + center,
                        center, size: step, spin: Math.sin(particles.length * 2.4) });
                }
        // One texture atlas replaces hundreds of individual canvas textures.
        this.tilePixels = Math.ceil(step * scale);
        const stride = this.tilePixels + 2;
        const columns = Math.max(1, Math.ceil(Math.sqrt(particles.length)));
        this.atlas = document.createElement('canvas');
        this.atlas.width = columns * stride;
        this.atlas.height = Math.max(1, Math.ceil(particles.length / columns)) * stride;
        const tile = this.atlas.getContext('2d');
        for (let q = 0; q < particles.length; q++)
        {
            const { x, y, half } = masks[q];
            const sourceX = q % columns * stride + 1, sourceY = Math.floor(q / columns) * stride + 1;
            Object.assign(particles[q], { sourceX, sourceY });
            tile.save();
            tile.translate(sourceX, sourceY);
            tile.scale(scale, scale);
            tile.beginPath();
            if (half === 0) { tile.moveTo(0, 0); tile.lineTo(step, 0); tile.lineTo(0, step); }
            else { tile.moveTo(step, step); tile.lineTo(0, step); tile.lineTo(step, 0); }
            tile.closePath();
            tile.clip();
            tile.drawImage(buffer, -x, -y, buffer.width / scale, buffer.height / scale);
            tile.restore();
        }
        // Cache a stationary triangular mesh beneath the moving fragments.
        this.wireframe = document.createElement('canvas');
        this.wireframe.width = buffer.width;
        this.wireframe.height = buffer.height;
        this.ink = { left, top, width: buffer.width / scale, height: buffer.height / scale };
        const wire = this.wireframe.getContext('2d');
        wire.scale(scale, scale);
        const wireStep = step * 2;
        wire.strokeStyle = '#ffffff';
        wire.lineWidth = .65;
        wire.beginPath();
        for (let y = 0; y <= this.ink.height; y += wireStep)
        {
            wire.moveTo(0, y);
            wire.lineTo(this.ink.width, y);
        }
        for (let x = 0; x <= this.ink.width; x += wireStep)
        {
            wire.moveTo(x, 0);
            wire.lineTo(x, this.ink.height);
        }
        for (let y = 0; y < this.ink.height; y += wireStep)
            for (let x = 0; x < this.ink.width; x += wireStep)
            {
                wire.moveTo(x + wireStep, y);
                wire.lineTo(x, y + wireStep);
            }
        wire.stroke();
        wire.globalCompositeOperation = 'destination-in';
        wire.drawImage(buffer, 0, 0, this.ink.width, this.ink.height);
        wire.globalCompositeOperation = 'source-over';
        wire.textBaseline = 'alphabetic';
        for (const letter of letters)
        {
            const style = letter.style;
            wire.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
            const metrics = wire.measureText(letter.text);
            const ascent = metrics.fontBoundingBoxAscent ?? parseFloat(style.fontSize) * .8;
            const descent = metrics.fontBoundingBoxDescent ?? parseFloat(style.fontSize) * .2;
            const baseline = letter.rect.top - bounds.top - top + letter.rect.height * ascent / (ascent + descent);
            wire.strokeText(letter.text, letter.rect.left - bounds.left - left, baseline);
        }
        // Apply one tint after drawing so shared edges never become darker.
        wire.globalCompositeOperation = 'source-in';
        wire.fillStyle = 'rgba(241,241,241,.5)';
        wire.fillRect(0, 0, this.ink.width, this.ink.height);
        wire.globalCompositeOperation = 'source-over';
        this.motion = new TriangleMagnet(particles);
        this.visible = false;
    }

    render(delta, enabled)
    {
        if (!this.motion) return;
        if (!enabled && this.motion.moving) this.motion.settle();
        const moving = enabled && this.motion.step(delta, this.pointer, this.radius);
        if (!moving && !this.visible) return;
        this.context.clearRect(0, 0, this.width, this.height);
        this.heading.classList.toggle('is-fragmenting', moving);
        this.visible = moving;
        if (!moving) return;
        this.context.drawImage(this.wireframe, this.ink.left, this.ink.top, this.ink.width, this.ink.height);
        for (const particle of this.motion.particles)
        {
            this.context.save();
            this.context.translate(particle.x, particle.y);
            this.context.rotate(particle.angle);
            this.context.drawImage(this.atlas, particle.sourceX, particle.sourceY, this.tilePixels, this.tilePixels,
                -particle.center, -particle.center, particle.size, particle.size);
            this.context.restore();
        }
    }
}
