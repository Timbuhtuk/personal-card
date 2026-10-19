(() => {
    const ns = 'http://www.w3.org/2000/svg';
    let seed = 58321;
    function random()
    {
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
        return (seed >>> 0) / 4294967296;
    }
    function polar(radius, angle)
    {
        return [(Math.cos(angle) * radius).toFixed(2), (Math.sin(angle) * radius).toFixed(2)];
    }
    function element(name, attributes)
    {
        const node = document.createElementNS(ns, name);
        for (const [key, attribute] of Object.entries(attributes)) node.setAttribute(key, attribute);
        return node;
    }
    const fibers = document.createDocumentFragment();
    const colors = ['#1eae32', '#47e12c', '#8df337', '#b9fc54', '#2ec64b', '#0e7037', '#0fbc6a', '#03512d', '#091a0e'];
    for (let q = 0; q < 1050; q++)
    {
        const angle = q / 1050 * Math.PI * 2 + random() * .008;
        const start = 111 + Math.pow(random(), 2) * 85;
        const end = 255 + random() * 122;
        const spread = .002 + random() * .008;
        const sections = 8;
        let path = 'M' + polar(start, angle);
        const bends = Array.from({ length: sections + 1 }, () => (random() - .5) * .025);
        for (let e = 1; e <= sections; e++)
        {
            const radius = start + (end - start) * e / sections;
            path += 'L' + polar(radius, angle + bends[e] - spread * (.3 + random()));
        }
        for (let e = sections; e >= 1; e--)
        {
            const radius = start + (end - start) * e / sections;
            path += 'L' + polar(radius, angle + bends[e] + spread * (.3 + random()));
        }
        path += 'Z';
        fibers.append(element('path', { d: path, fill: colors[Math.floor(random() * colors.length)], opacity: (.25 + random() * .66).toFixed(2) }));
    }
    for (let q = 0; q < 180; q++)
    {
        const angle = random() * Math.PI * 2, start = 123 + random() * 35, end = 225 + random() * 110;
        const path = 'M' + polar(start, angle) + 'Q' + polar((start + end) * .5, angle + .025) + ' ' + polar(end, angle + .01);
        fibers.append(element('path', { d: path, fill: 'none', stroke: q % 3 ? '#baff59' : '#ddffa0', 'stroke-width': (.3 + random() * 1.6).toFixed(2), opacity: (.12 + random() * .3).toFixed(2) }));
    }
    document.querySelector('#iris-fibers').append(fibers);
    const grooves = document.createDocumentFragment();
    for (let radius = 117, q = 0; radius < 378; radius += 1.85, q++)
        grooves.append(element('circle', { r: radius.toFixed(2), fill: 'none', stroke: q % 3 ? '#000b06' : '#b4f79d', 'stroke-width': q % 3 ? '.65' : '.4', opacity: q % 3 ? '.55' : '.24' }));
    document.querySelector('#record-grooves').append(grooves);
    const ticks = document.querySelector('#dial-ticks');
    for (let q = 0; q < 12; q++)
    {
        const angle = q / 12 * Math.PI * 2;
        const [x, y] = polar(26, angle);
        ticks.append(element('circle', { cx: x, cy: Number(y) - 3, r: '.85', fill: '#252e30' }));
    }
})();
