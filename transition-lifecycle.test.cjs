const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const motion = fs.readFileSync(path.join(__dirname,'dist/transition-motion.js'),'utf8');
const source = fs.readFileSync(path.join(__dirname,'dist/transition-lab.js'),'utf8').split('TransitionLab.ready().then(')[0];
function fixture(hash='')
{
    const events = {}, frames = new Map(), nodes = new Map(); let frameId=0, focused=null, drawCalls=0;
    const context = new Proxy({globalAlpha:1, createLinearGradient(){return{addColorStop(){}}},measureText(){return{fontBoundingBoxAscent:10,fontBoundingBoxDescent:3}}}, {get(target,key){if(key in target)return target[key];return (...args)=>{for(const arg of args)if(typeof arg==='number')assert.ok(Number.isFinite(arg),`${String(key)} must be finite`);drawCalls++;}},set(target,key,value){target[key]=value;return true;}});
    function element(name)
    {
        const listeners={}, classes=new Set();
        const node={name,style:{},dataset:{},children:[],hidden:false,inert:false,disabled:true,value:1000,scrollTop:0,
            classList:{add(...keys){keys.forEach(x=>classes.add(x));},remove(...keys){keys.forEach(x=>classes.delete(x));},contains(key){return classes.has(key);},toggle(key,on){on?classes.add(key):classes.delete(key);}},
            getBoundingClientRect(){return{x:0,y:0,width:971,height:600};},
            querySelectorAll(){return[];},matches(){return false;},prepend(child){this.children.unshift(child);},append(child){this.children.push(child);},
            getContext(){return context;},setAttribute(key,value){this[key]=value;},removeAttribute(key){if(key==='style')this.style={};},
            addEventListener(key,fn){listeners[key]=fn;},fire(key,event={}){listeners[key]?.(event);},focus(){focused=name;}};
        return node;
    }
    for(const selector of ['#imprint','.imprint-content','#about','.transition-controls','#transition-seek','#transition-status','#transition-toggle','#transition-pause','#transition-slow','#transition-time','#transition-replay','.about-link','.about-back','#transition-description','#about-title']) nodes.set(selector,element(selector));
    const variants=Object.keys(new Function(motion+';return TransitionMotion.variants')()).map(id=>{const n=element(id);n.dataset.transition=id;return n;});
    nodes.get('.transition-controls').querySelectorAll=selector=>selector==='[data-transition]'?variants:variants.concat([nodes.get('#transition-toggle'),nodes.get('#transition-replay'),nodes.get('#transition-pause'),nodes.get('#transition-slow')]);
    const root=element('html'), reduced={matches:false,addEventListener(key,fn){events['reduce']=fn;}};
    const location={pathname:'/transition-lab.html',search:'?transition=slash',hash,href:'http://localhost/transition-lab.html?transition=slash'+hash};
    const history={entries:[],replaceState(a,b,url){const u=new URL(url,location.href);location.pathname=u.pathname;location.search=u.search;location.hash=u.hash;location.href=u.href;},pushState(a,b,url){this.entries.push(String(url));this.replaceState(a,b,url);}};
    const document={documentElement:root,hidden:false,title:'',querySelector:selector=>nodes.get(selector),createElement:tag=>element(tag),createTreeWalker:()=>({nextNode:()=>null}),addEventListener(key,fn){events['document:'+key]=fn;}};
    const window={addEventListener(key,fn){events['window:'+key]=fn;}};
    const sandbox={console,URL,URLSearchParams,Math,document,window,location,history,devicePixelRatio:2,performance:{now:()=>0},reducedMotion:reduced,NodeFilter:{SHOW_TEXT:4},getComputedStyle:()=>({}),
        artwork:{name:{pointer:{},motion:{settle(){}},render(){}}},
        requestAnimationFrame(fn){const id=++frameId;frames.set(id,fn);return id;},cancelAnimationFrame(id){frames.delete(id);}};
    vm.createContext(sandbox);vm.runInContext(motion+'\n'+source+'\nglobalThis.Preview=TransitionLab;',sandbox);
    const lab=new sandbox.Preview();
    return {lab,nodes,events,reduced,document,window,context,frames,history,root,focused:()=>focused,drawCalls:()=>drawCalls};
}
let samples=0;
for (const mode of ['slash', 'portal', 'tear'])
{
    const f = fixture();
    f.lab.choose(mode, false); f.lab.go('about');
    f.nodes.get('#transition-seek').value = 500; f.nodes.get('#transition-seek').fire('input');
    const scene = f.lab.scene, time = scene.time;
    f.window.PersonalTheme = { colors: { inkRgb: '56,59,53' } };
    f.events['window:personal-theme-change']();
    assert.match(f.context.strokeStyle, /^rgba\(56,59,53,/);
    assert.strictEqual(f.lab.scene, scene); assert.equal(scene.time, time); assert.equal(f.frames.size, 0);
    f.window.PersonalTheme.colors.inkRgb = '241,241,241'; f.events['window:personal-theme-change']();
    assert.match(f.context.strokeStyle, /^rgba\(241,241,241,/);
}
for(const mode of Object.keys(new Function(motion+';return TransitionMotion.variants')()))
{
    const f=fixture(),lab=f.lab;
    lab.choose(mode,false);
    for(const [from,target] of [['home','about'],['about','home']])
    {
        lab.go(target,{from});assert.equal(f.nodes.get('#imprint').dataset.view,'transition');
        for(const progress of [0,.07,.25,.49,.5,.65,.9,1]){lab.draw(progress);samples++;}
        lab.settle(target);
        assert.equal(lab.view,target);assert.equal(lab.scene,null);
        assert.equal(f.nodes.get('#about').hidden,target!=='about');assert.equal(lab.home.inert,target==='about');
        assert.equal(f.frames.size,0);assert.equal(f.root.classList.contains('transition-running'),false);
        assert.equal(f.focused(),target==='about'?'#about-title':'.about-link');
    }
    // Settling after resize prevents a stale loop from repainting the old view.
    lab.go('about');f.events['window:resize']();assert.equal(lab.view,'about');assert.equal(lab.scene,null);assert.equal(f.frames.size,0);
    lab.go('home');f.reduced.matches=true;f.events.reduce();assert.equal(lab.scene,null);assert.equal(lab.view,'home');
    lab.go('about');assert.equal(lab.scene,null);assert.equal(lab.view,'about');
}
{
    const f=fixture('#about'),lab=f.lab;assert.equal(lab.view,'about');
    lab.choose('slit');lab.choose('iris');assert.equal(lab.mode,'iris');assert.equal(f.frames.size,1);
    f.document.hidden=true;f.events['document:visibilitychange']();assert.equal(f.frames.size,0);assert.equal(lab.playing,false);
    f.document.hidden=false;f.events['document:visibilitychange']();assert.equal(lab.playing,true);assert.equal(f.frames.size,1);
    f.nodes.get('#transition-pause').fire('click');assert.equal(lab.playing,false);
    f.nodes.get('#transition-seek').value=500;f.nodes.get('#transition-seek').fire('input');assert.equal(lab.scene.time,lab.scene.duration*.5);assert.equal(lab.playing,false);
    f.nodes.get('#transition-slow').fire('click');assert.equal(lab.rate,.5);
    lab.settle('about');f.document.hidden=true;f.events['document:visibilitychange']();f.document.hidden=false;f.events['document:visibilitychange']();assert.equal(f.frames.size,0);
}
{
    const f=fixture(),lab=f.lab;
    lab.choose('tear',false);
    for(const progress of [0,.1,.25,.5,.75,.9,1])
    {
        lab.go('about',{from:'home'});lab.draw(progress);
        const forward=lab.about.style.clipPath;
        lab.settle('about');lab.go('home');lab.draw(1-progress);
        assert.equal(lab.about.style.clipPath,forward,'The return must use the exact reversed About mask');
        assert.equal(lab.home.style.clipPath,'none','Home must remain fully visible below the closing About');
        assert.equal(lab.about.style.zIndex,2);assert.equal(lab.home.style.zIndex,1);
        lab.settle('home');
    }
}
console.log(`${samples} transition scene samples passed in both directions; exact reversed Liquid seam, direct About, repeated switching, focus, resize, reduced motion, hidden-tab resume, pause, timeline and half speed passed.`);
