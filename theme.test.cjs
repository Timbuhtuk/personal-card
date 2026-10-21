const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = name => fs.readFileSync(path.join(__dirname, 'dist', name), 'utf8');
const media = { addEventListener(type, callback) { assert.equal(type, 'change'); this.change = callback; } };
const window = { events: [], dispatchEvent(event) { this.events.push(event.type); } };
let light = false;
const palette = () => light ? {
    '--pc-line-rgb': '56,59,53', '--pc-ink-rgb': '56,59,53', '--pc-accent-rgb': '56,59,53',
    '--ts-color-canvas': '#E5E2D5', '--ts-color-textSecondary': '#50534C'
} : {
    '--pc-line-rgb': '230,230,226', '--pc-ink-rgb': '241,241,241', '--pc-accent-rgb': '255,116,36',
    '--ts-color-canvas': '#0C0C0C', '--ts-color-textSecondary': '#D2D2D2'
};
vm.runInNewContext(read('theme.js'), {
    window, document: { documentElement: {} }, Event: class { constructor(type) { this.type = type; } },
    matchMedia(query) { assert.equal(query, '(prefers-color-scheme: light)'); return media; },
    getComputedStyle() { const colors = palette(); return { getPropertyValue: name => colors[name] }; }
});
assert.equal(window.PersonalTheme.colors.background, '#0C0C0C');
light = true; media.change();
assert.equal(window.PersonalTheme.colors.inkRgb, '56,59,53');
assert.equal(window.PersonalTheme.colors.background, '#E5E2D5');
assert.deepEqual(window.events, ['personal-theme-change']);

// Run the actual app listener: a preference change must repaint, not regenerate the world or Life cells.
const source = read('app.js');
const start = source.indexOf("    window.addEventListener('personal-theme-change'");
const end = source.indexOf("    reducedMotion.addEventListener", start);
let refresh;
window.addEventListener = (type, callback) => { assert.equal(type, 'personal-theme-change'); refresh = callback; };
const cells = new Uint8Array([1, 0, 1]);
const divider = { cells, dirty: false, render(time, delta) { assert.equal(time, 123); assert.equal(delta, 0); this.painted = true; } };
let names = 0, paints = 0;
const artwork = { dividers: [divider], drawnResult: {}, paint() { paints++; }, name: { initialize() { names++; } } };
new Function('window', 'artwork', 'clock', source.slice(start, end))(window, artwork, 123);
refresh();
assert.strictEqual(divider.cells, cells);
assert.equal(divider.backgroundColor, '#E5E2D5');
assert.equal(divider.cellColor, '#50534C');
assert.equal(divider.painted, true);
assert.equal(artwork.drawnResult, null);
assert.equal(names, 1);
assert.equal(paints, 1);
light = false; media.change(); refresh();
assert.equal(divider.backgroundColor, '#0C0C0C');
assert.strictEqual(divider.cells, cells);
assert.equal(window.PersonalTheme.colors.inkRgb, '241,241,241');
assert.equal(names, 2);
assert.match(read('theme.css'), /@media\s*\(prefers-color-scheme:\s*light\)/);
for (const page of ['index.html', 'work-lab.html', 'cursor-lab.html', 'entrance-lab.html', 'transition-lab.html', 'tessera-card-pier.html'])
{
    const html = read(page);
    assert.match(html, /href="theme\.css"/, `${page} must follow the browser color preference`);
    assert.match(html, /href="assets\/styles\/tokens\.css"/, `${page} must use the shared palette`);
    if (page !== 'tessera-card-pier.html')
    {
        assert.match(html, /src="theme\.js"/, `${page} must refresh artwork when the preference changes`);
        const artworkScript = html.match(/src="(?:app|work-lab)\.js(?:\?[^"\s]*)?"/);
        assert.ok(artworkScript && html.indexOf('src="theme.js"') < artworkScript.index, `${page} must initialize theme colors before artwork`);
    }
}
console.log('Theme passed: initial palette, live light/dark changes, canvas repaint and intact Life state.');
