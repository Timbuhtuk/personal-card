class EntranceMotion
{
    static variants = {
        impulse: { number: '01', title: 'Impulse', duration: 2100, description: 'Triangles assemble the name. A pulse releases the rest of the page.' },
        gravity: { number: '02', title: 'Gravity', duration: 2250, description: 'The name attracts the scene, then releases it along curved paths.' },
        plotter: { number: '03', title: 'Plotter', duration: 2650, description: 'Letter outlines, button frames and contour lines draw themselves into place.' },
        split: { number: '04', title: 'Split', duration: 2150, description: 'A fine slit opens the name, then separates to reveal the whole scene.' },
        hybrid: { number: '05', title: 'Hybrid', duration: 2850, description: 'Plotter draws the name. Then Split opens the background and the rest of the page.' },
        hybridTrace: { number: '06', title: 'Hybrid+', duration: 2850, description: 'Plotter draws the name and contour lines while Split opens the page.' }
    };

    static progress(time, start, end) { return Math.max(0, Math.min(1, (time - start) / (end - start))); }
    static mix(first, second, progress) { return first + (second - first) * progress; }
    static hash(value) { const result = Math.sin(value * 12.9898 + 78.233) * 43758.5453; return result - Math.floor(result); }
    static smooth(time, start, end) { const p = this.progress(time, start, end); return p * p * (3 - 2 * p); }
    static out(time, start, end) { return 1 - Math.pow(1 - this.progress(time, start, end), 3); }
    static spring(p) { return p === 0 || p === 1 ? p : 1 - Math.exp(-7 * p) * Math.cos(10 * p); }

    static flight(p, origin, target, bend = 0)
    {
        const settled = this.spring(p);
        return { x: (origin.x - target.x) * (1 - settled) + Math.sin(p * Math.PI) * bend,
            y: (origin.y - target.y) * (1 - settled), scale: .55 + settled * .45,
            opacity: Math.min(1, p * 4), rotation: Math.sin(p * Math.PI) * bend * .025 };
    }

    static particle(time, index, particle, center, spread)
    {
        const start = this.hash(index + 1) * 230;
        const p = this.out(time, start, 870);
        const angle = this.hash(index + 201) * Math.PI * 2;
        const radius = spread * (.25 + this.hash(index + 401) * .75);
        return {
            x: this.mix(center.x + Math.cos(angle) * radius, particle.targetX, p),
            y: this.mix(center.y + Math.sin(angle) * radius * .65, particle.targetY, p),
            angle: (this.hash(index + 601) - .5) * 5 * (1 - p),
            scale: .25 + p * .75,
            opacity: this.smooth(time, start, start + 120)
        };
    }
}
