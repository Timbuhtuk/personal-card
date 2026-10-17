class LogoMotion
{
    static ribbonCopies(viewport, period)
    {
        return Math.max(2, Math.ceil(viewport / period) + 1);
    }

    static shuffle(items, random = Math.random)
    {
        const result = [...items];
        for (let q = result.length - 1; q > 0; q--)
        {
            const index = Math.floor(random() * (q + 1));
            [result[q], result[index]] = [result[index], result[q]];
        }
        return result;
    }

    static drop(time, rank, offset, turn)
    {
        const elapsed = time - 3000 - rank * 43;
        const p = Math.max(0, Math.min(1, elapsed / 650));
        const flight = 1 - Math.pow(1 - p, 3);
        const bounce = Math.max(0, Math.min(1, (elapsed - 650) / 260));
        return {
            x: offset.x * (1 - flight),
            y: elapsed < 650 ? offset.y * (1 - p * p) : -Math.sin(bounce * Math.PI) * 13 * (1 - bounce),
            rotation: turn * (1 - flight) + Math.sin(bounce * Math.PI * 2) * (1 - bounce) * 3,
            scale: .42 + .58 * flight,
            opacity: Math.max(0, Math.min(1, elapsed / 110))
        };
    }
}
