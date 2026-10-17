const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, 'dist/about.js'), 'utf8').replace('new AboutNavigation();', '');

function fixture(hash = '')
{
    const events = () => ({ callbacks: {}, addEventListener(type, callback) { (this.callbacks[type] ||= []).push(callback); },
        dispatch(type) { for (const callback of this.callbacks[type] || []) callback(); } });
    const animations = [];
    const node = () => Object.assign(events(), {
        style: { removeProperty(name) { delete this[name]; } }, dataset: {}, hidden: false, inert: false,
        getBoundingClientRect: () => ({ x: 0, y: 64, width: 1280, height: 720 }),
        focus() { this.focused = true; },
        animate(frames) {
            let cancel;
            const result = { frames, finished: new Promise((resolve, reject) => { cancel = () => reject(Error('cancelled')); }), cancel() { cancel(); } };
            animations.push(result);
            return result;
        }
    });
    const classes = new Set();
    const root = { classList: { add: (...names) => names.forEach(name => classes.add(name)), remove: (...names) => names.forEach(name => classes.delete(name)), contains: name => classes.has(name) } };
    const selectors = new Map(['#imprint','.imprint-content','.imprint-copy','.about-link','#about','.about-inner','.about-back','#about-title'].map(name => [name,node()]));
    selectors.get('#about').hidden = true;
    selectors.get('#imprint').dataset.view = 'home';
    selectors.get('.about-link').getBoundingClientRect = () => ({ x: 550, y: 420, width: 180, height: 20 });
    const document = Object.assign(events(), { title: 'Card', documentElement: root,
        querySelector(name) { assert.ok(selectors.has(name)); return selectors.get(name); } });
    const location = { pathname: '/', search: '', hash };
    const pushes = [];
    const history = { pushState(state, unused, url) { pushes.push(url); location.hash = url.includes('#') ? '#' + url.split('#')[1] : ''; } };
    const reducedMotion = Object.assign(events(), { matches: false });
    const window = events();
    const artwork = { name: { pointer: { active: true }, motion: { settle() {} }, render() {} } };
    const context = vm.createContext({ document, window, location, history, reducedMotion, artwork });
    vm.runInContext(source + '\nthis.Navigation = AboutNavigation;', context);
    const navigation = new context.Navigation();
    return { navigation, Navigation: context.Navigation, document, window, location, reducedMotion, selectors, classes, pushes, animations };
}

(async () => {
    const sample = fixture();
    let cases = 0;
    for (const [width,height] of [[320,460],[390,748],[1280,592],[1920,1080],[7680,4320]])
        for (const x of [-20,0,width*.2,width*.5,width,width+20])
            for (const y of [-20,0,height*.2,height*.5,height,height+20])
            {
                const circle = sample.Navigation.circle(width,height,x,y);
                for (const [cx,cy] of [[0,0],[width,0],[0,height],[width,height]])
                    assert.ok(Math.hypot(circle.x-cx,circle.y-cy) < circle.radius, 'The wipe must erase every corner.');
                cases++;
            }
    await sample.navigation.go('about', { animate:false });
    assert.equal(sample.selectors.get('#imprint').dataset.view,'about');
    assert.equal(sample.selectors.get('.imprint-copy').inert,true);
    assert.equal(sample.selectors.get('#about').hidden,false);
    assert.equal(sample.selectors.get('#about-title').focused,true);
    assert.equal(sample.location.hash,'#about');
    await sample.navigation.go('home', { animate:false });
    assert.equal(sample.selectors.get('#about').hidden,true);
    assert.equal(sample.selectors.get('.imprint-copy').inert,false);
    assert.equal(sample.selectors.get('.about-link').focused,true);

    const pending = sample.navigation.go('about');
    assert.equal(sample.selectors.get('#imprint').dataset.view,'transition');
    await sample.navigation.go('home', { animate:false });
    await pending;
    assert.equal(sample.selectors.get('#imprint').dataset.view,'home', 'A cancelled wipe must not reopen About.');
    assert.equal(sample.navigation.running,false);
    assert.equal(sample.classes.has('about-transitioning'),false);

    const resizing = sample.navigation.go('about');
    sample.window.dispatch('resize');
    await resizing;
    assert.equal(sample.selectors.get('#imprint').dataset.view,'about');
    assert.equal(sample.navigation.running,false);

    sample.reducedMotion.matches = true;
    sample.location.hash = '';
    const historyLength = sample.pushes.length;
    sample.window.dispatch('popstate');
    assert.equal(sample.selectors.get('#imprint').dataset.view,'home');
    assert.equal(sample.pushes.length,historyLength,'Browser history must not create another entry.');
    sample.location.hash = '#about';
    sample.window.dispatch('hashchange');
    assert.equal(sample.selectors.get('#imprint').dataset.view,'about');
    const direct = fixture('#about');
    assert.equal(direct.selectors.get('#imprint').dataset.view,'about','Direct links must open About.');
    assert.equal(direct.pushes.length,0);
    console.log(`${cases} circular wipes passed, plus cancellation, resize, reduced motion, history, direct links and focus restoration.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
