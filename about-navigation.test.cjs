const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'dist/about.js'),'utf8').replace('new AboutNavigation();','');
const LiquidSeam=require('./dist/liquid-seam.js');
function fixture(hash='',canvas=true)
{
    const events=()=>({callbacks:{},addEventListener(type,fn){(this.callbacks[type]||=[]).push(fn);},dispatch(type,event={}){for(const fn of this.callbacks[type]||[])fn(event);}});
    const frames=new Map();let now=100,id=0;
    const context=new Proxy({}, {get:(target,key)=>target[key]||((...args)=>{for(const value of args)if(typeof value==='number')assert.ok(Number.isFinite(value));}),set:(target,key,value)=>(target[key]=value,true)});
    const node=()=>Object.assign(events(),{style:{},dataset:{},hidden:false,inert:false,
        getBoundingClientRect:()=>({x:0,y:64,width:1280,height:720}),focus(){this.focused=true;},append(){},setAttribute(){},getContext:()=>canvas?context:null});
    const classes=new Set(),root={classList:{add:(...names)=>names.forEach(n=>classes.add(n)),remove:(...names)=>names.forEach(n=>classes.delete(n)),contains:n=>classes.has(n)}};
    const selectors=new Map(['#imprint','.imprint-content','.imprint-copy','.about-link','#about','.about-back','#about-title'].map(name=>[name,node()]));
    selectors.get('#about').hidden=true;selectors.get('#imprint').dataset.view='home';
    const document=Object.assign(events(),{title:'Card',documentElement:root,hidden:false,querySelector:n=>selectors.get(n),createElement:()=>node()});
    const location={pathname:'/',search:'',hash},pushes=[],history={pushState(a,b,url){pushes.push(url);location.hash=url.includes('#')?'#'+url.split('#')[1]:'';}};
    const reducedMotion=Object.assign(events(),{matches:false}),window=Object.assign(events(),{devicePixelRatio:2});
    const artwork={name:{pointer:{active:true},motion:{settle(){}},render(){}}};
    const sandbox={document,window,location,history,reducedMotion,artwork,LiquidSeam,requestAnimationFrame(fn){frames.set(++id,fn);return id;},cancelAnimationFrame(q){frames.delete(q);}};
    vm.createContext(sandbox);vm.runInContext(source+';this.Navigation=AboutNavigation;',sandbox);
    const navigation=new sandbox.Navigation();
    async function flush(){for(let q=0;frames.size&&q<300;q++){now+=16;const current=[...frames];frames.clear();for(const [id,fn] of current)fn(now);await Promise.resolve();}await Promise.resolve();assert.equal(frames.size,0);}
    return {navigation,selectors,document,window,location,pushes,reducedMotion,classes,frames,flush};
}
(async()=>{
    const f=fixture(),n=f.navigation;
    const open=n.go('about');assert.equal(f.selectors.get('#imprint').dataset.view,'transition');
    await f.flush();await open;assert.equal(n.running,false);assert.equal(f.selectors.get('#imprint').dataset.view,'about');
    assert.equal(f.selectors.get('.imprint-copy').inert,true);assert.equal(f.selectors.get('#about').hidden,false);assert.equal(f.selectors.get('#about-title').focused,true);
    assert.equal(f.location.hash,'#about');
    const close=n.go('home');const full=n.about.style.clipPath;assert.equal(full,`path("${LiquidSeam.geometry(1,1280,720).path}")`);
    await f.flush();await close;assert.equal(f.selectors.get('#about').hidden,true);assert.equal(f.selectors.get('.imprint-copy').inert,false);assert.equal(f.selectors.get('.about-link').focused,true);
    const stale=n.go('about');await n.go('home',{animate:false});await stale;assert.equal(n.panel.dataset.view,'home');assert.equal(n.running,false);assert.equal(f.frames.size,0);
    const resize=n.go('about');f.window.dispatch('resize');await resize;assert.equal(n.panel.dataset.view,'about');assert.equal(n.running,false);
    const hidden=n.go('home');f.document.hidden=true;f.document.dispatch('visibilitychange');await hidden;assert.equal(n.panel.dataset.view,'home');f.document.hidden=false;
    f.reducedMotion.matches=true;f.location.hash='#about';const entries=f.pushes.length;f.window.dispatch('popstate');assert.equal(n.panel.dataset.view,'about');assert.equal(f.pushes.length,entries);
    f.location.hash='';f.window.dispatch('hashchange');assert.equal(n.panel.dataset.view,'home');
    const direct=fixture('#about');assert.equal(direct.navigation.panel.dataset.view,'about');assert.equal(direct.pushes.length,0);
    const fallback=fixture('',false);await fallback.navigation.go('about');assert.equal(fallback.navigation.panel.dataset.view,'about');assert.equal(fallback.frames.size,0);
    console.log('Liquid seam navigation passed: forward, exact reverse start, cancellation, resize, hidden tabs, reduced motion, browser history, direct About, focus and canvas fallback.');
})().catch(e=>{console.error(e);process.exitCode=1;});
