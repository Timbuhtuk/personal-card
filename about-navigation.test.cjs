const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'dist/about.js'),'utf8').replace('new AboutNavigation();','');
const LiquidSeam=require('./dist/liquid-seam.js');
function fixture(hash='',canvas=true,work=false,record=false,search='')
{
    const events=()=>({callbacks:{},addEventListener(type,fn){(this.callbacks[type]||=[]).push(fn);},removeEventListener(type,fn){this.callbacks[type]=(this.callbacks[type]||[]).filter(x=>x!==fn);},dispatch(type,event={}){for(const fn of this.callbacks[type]||[])fn(event);}});
    const frames=new Map();let now=100,id=0;
    const context=new Proxy({}, {get:(target,key)=>target[key]||((...args)=>{for(const value of args)if(typeof value==='number')assert.ok(Number.isFinite(value));}),set:(target,key,value)=>(target[key]=value,true)});
    const node=()=>Object.assign(events(),{style:{},dataset:{},hidden:false,inert:false,
        getBoundingClientRect:()=>({x:0,y:64,width:1280,height:720}),focus(){this.focused=true;},append(){},setAttribute(name,value){this[name]=value;},removeAttribute(name){delete this[name];},getContext:()=>canvas?context:null});
    const classes=new Set(),root={classList:{add:(...names)=>names.forEach(n=>classes.add(n)),remove:(...names)=>names.forEach(n=>classes.delete(n)),contains:n=>classes.has(n)}};
    const selectors=new Map(['#imprint','.imprint-content','.imprint-copy','.about-link','#about','.about-back','#about-title'].map(name=>[name,node()]));
    if(work)
    {
        for(const name of ['#work','.work-link','.work-frame'])selectors.set(name,node());
        selectors.get('#work').hidden=true;
        selectors.get('.work-link').href='http://localhost:6007/work-lab.html';
        const frame=selectors.get('.work-frame');frame.dataset.src='work-lab.html?embedded=1';
        frame.contentDocument={querySelector:()=>({}),fonts:{ready:Promise.resolve()}};
        frame.contentWindow={postMessage(){}};
    }
    const recordMessages=[];
    if(record)
    {
        const frame=node();frame.dataset.src='record-lab.html?variant=graphic&embedded=1&copy=labels';
        frame.contentDocument={querySelector:()=>({}),fonts:{ready:Promise.resolve()}};
        frame.contentWindow={RecordStudyReady:Promise.resolve(),postMessage(message,origin){recordMessages.push({message,origin});}};
        selectors.set('.about-frame',frame);
    }
    selectors.get('#about').hidden=true;selectors.get('#imprint').dataset.view='home';
    const document=Object.assign(events(),{title:'Card',documentElement:root,hidden:false,querySelector:n=>selectors.get(n),createElement:()=>node()});
    const assigns=[],location={origin:'http://localhost:6007',pathname:'/',search,hash,assign(url){assigns.push(url);}} ,pushes=[],history={pushState(a,b,url){pushes.push(url);location.hash=url.includes('#')?'#'+url.split('#')[1]:'';}};
    const reducedMotion=Object.assign(events(),{matches:false}),window=Object.assign(events(),{devicePixelRatio:2});
    const artwork={name:{pointer:{active:true},motion:{settle(){}},render(){}}};
    const sandbox={document,window,location,history,reducedMotion,artwork,LiquidSeam,setTimeout,clearTimeout,requestAnimationFrame(fn){frames.set(++id,fn);return id;},cancelAnimationFrame(q){frames.delete(q);}};
    vm.createContext(sandbox);vm.runInContext(source+';this.Navigation=AboutNavigation;',sandbox);
    const navigation=new sandbox.Navigation();
    async function flush()
    {
        let idle=0;
        for(let q=0;q<600&&idle<8;q++)
        {
            await Promise.resolve();
            if(!frames.size){idle++;continue;}
            idle=0;now+=16;const current=[...frames];frames.clear();for(const [id,fn] of current)fn(now);
        }
        assert.equal(frames.size,0);
    }
    return {navigation,selectors,document,window,location,pushes,assigns,reducedMotion,classes,frames,recordMessages,flush};
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
    const w=fixture('',true,true),work=w.navigation,frame=w.selectors.get('.work-frame');
    const opening=work.go('work');assert.equal(work.pendingTarget,'work');assert.equal(frame.src,'work-lab.html?embedded=1');
    frame.dispatch('load');await w.flush();await opening;
    assert.equal(work.panel.dataset.view,'work');assert.equal(work.orientation,'horizontal');assert.equal(w.location.hash,'#work');
    assert.equal(w.selectors.get('#work').inert,false);assert.equal(frame.focused,true);
    const returning=work.go('home');
    assert.equal(work.work.style.clipPath,`path("${LiquidSeam.geometry(1,1280,720,'horizontal').path}")`);
    await w.flush();await returning;assert.equal(work.work.hidden,true);assert.equal(w.selectors.get('.work-link').focused,true);
    const reopen=work.go('work');await w.flush();await reopen;
    const before=w.pushes.length;
    w.window.dispatch('message',{source:{},origin:w.location.origin,data:{type:'personal-work-navigation',target:'home'}});
    assert.equal(work.panel.dataset.view,'work','Unrelated windows cannot change navigation');
    w.window.dispatch('message',{source:frame.contentWindow,origin:'https://unrelated.example',data:{type:'personal-work-navigation',target:'home'}});
    assert.equal(work.panel.dataset.view,'work','Cross-origin messages cannot change navigation');
    w.window.dispatch('message',{source:frame.contentWindow,origin:w.location.origin,data:{type:'personal-work-navigation',target:'about'}});
    await w.flush();assert.equal(work.panel.dataset.view,'about');assert.equal(w.pushes.length,before+1,'Cross-view transition adds only its destination');
    w.reducedMotion.matches=true;w.location.hash='#work';w.window.dispatch('popstate');await w.flush();
    assert.equal(work.panel.dataset.view,'work');assert.equal(w.pushes.length,before+1);
    const pending=fixture('',true,true),pendingOpen=pending.navigation.go('work');
    await pending.navigation.go('home',{animate:false});pending.selectors.get('.work-frame').dispatch('load');await pending.flush();await pendingOpen;
    assert.equal(pending.navigation.panel.dataset.view,'home');assert.equal(pending.selectors.get('#work').hidden,true);
    const directWork=fixture('#work',true,true);directWork.selectors.get('.work-frame').dispatch('load');await directWork.flush();
    assert.equal(directWork.navigation.panel.dataset.view,'work');assert.equal(directWork.pushes.length,0);
    const failed=fixture('',true,true),failedOpen=failed.navigation.go('work');failed.selectors.get('.work-frame').dispatch('error');await failedOpen;
    assert.deepEqual(failed.assigns,['http://localhost:6007/work-lab.html']);
    const workFallback=fixture('',false,true),fallbackOpen=workFallback.navigation.go('work');workFallback.selectors.get('.work-frame').dispatch('load');await workFallback.flush();await fallbackOpen;
    assert.equal(workFallback.navigation.panel.dataset.view,'work');assert.equal(workFallback.frames.size,0);
    const record=fixture('',true,false,true),recordFrame=record.selectors.get('.about-frame');
    const recordOpen=record.navigation.go('about');
    assert.match(recordFrame.src,/&layout=wide$/,'The main About uses the selected desktop framing');
    assert.equal(record.selectors.get('.about-link')['aria-busy'],'true');
    recordFrame.dispatch('load');await record.flush();await recordOpen;
    assert.equal(record.navigation.panel.dataset.view,'about');assert.equal(recordFrame.focused,true);
    assert.deepEqual(record.recordMessages.map(item=>item.message.phase),['hidden','enter','visible']);
    assert.ok(record.recordMessages.every(item=>item.origin===record.location.origin));
    assert.equal(record.recordMessages[1].message.animate,true);
    const preparing=fixture('',true,false,true),preparingFrame=preparing.selectors.get('.about-frame');
    let prepared;
    preparingFrame.contentWindow.RecordStudyPrepare=()=>new Promise(resolve=>prepared=resolve);
    const preparingOpen=preparing.navigation.go('about');preparingFrame.dispatch('load');await preparing.flush();
    assert.equal(preparing.selectors.get('#about').hidden,false,'Measure the record at its final visible layout before animating');
    assert.equal(preparing.navigation.panel.dataset.view,'transition');
    assert.deepEqual(preparing.recordMessages.map(item=>item.message.phase),['hidden'],'Do not begin the entrance until the first scene is ready');
    prepared();await preparing.flush();await preparingOpen;
    assert.deepEqual(preparing.recordMessages.map(item=>item.message.phase),['hidden','enter','visible']);
    const aborted=fixture('',true,false,true),abortedFrame=aborted.selectors.get('.about-frame');
    let completePreparation;
    abortedFrame.contentWindow.RecordStudyPrepare=()=>new Promise(resolve=>completePreparation=resolve);
    const abortedOpen=aborted.navigation.go('about');abortedFrame.dispatch('load');await aborted.flush();
    await aborted.navigation.go('home',{animate:false});completePreparation();await aborted.flush();await abortedOpen;
    assert.equal(aborted.navigation.panel.dataset.view,'home');
    assert.ok(!aborted.recordMessages.some(item=>item.message.phase==='enter'),'An obsolete warm-up cannot reopen About');
    await record.navigation.go('home',{animate:false});
    assert.deepEqual(record.recordMessages.slice(-2).map(item=>item.message.phase),['leave','hidden']);
    const staleRecord=fixture('',true,false,true),staleRecordOpen=staleRecord.navigation.go('about');
    await staleRecord.navigation.go('home',{animate:false});staleRecord.selectors.get('.about-frame').dispatch('load');
    await staleRecord.flush();await staleRecordOpen;
    assert.equal(staleRecord.navigation.panel.dataset.view,'home');
    assert.ok(!staleRecord.recordMessages.some(item=>item.message.phase==='enter'));
    const badRecord=fixture('',true,false,true),badRecordOpen=badRecord.navigation.go('about');
    badRecord.selectors.get('.about-frame').dispatch('error');await badRecordOpen;
    assert.deepEqual(badRecord.assigns,['record-lab.html?variant=graphic&copy=labels']);
    const directRecord=fixture('#about',true,false,true);directRecord.selectors.get('.about-frame').dispatch('load');
    await directRecord.flush();assert.equal(directRecord.navigation.panel.dataset.view,'about');
    assert.equal(directRecord.recordMessages.find(item=>item.message.phase==='enter').message.animate,false);
    const reducedRecord=fixture('',true,false,true);reducedRecord.reducedMotion.matches=true;
    const reducedRecordOpen=reducedRecord.navigation.go('about');reducedRecord.selectors.get('.about-frame').dispatch('load');
    await reducedRecord.flush();await reducedRecordOpen;
    assert.equal(reducedRecord.recordMessages.find(item=>item.message.phase==='enter').message.animate,false);
    const slowRecord=fixture('#about',true,false,true,'?recordEntrance=spin&recordPreview=1&recordSlow=1');
    slowRecord.selectors.get('.about-frame').dispatch('load');await slowRecord.flush();
    const slowEntrance=slowRecord.recordMessages.find(item=>item.message.phase==='enter').message;
    assert.equal(slowEntrance.animate,true);assert.equal(slowEntrance.duration,3400);
    assert.match(slowRecord.selectors.get('.about-frame').src,/entrance=spin$/);
    const selectedRecord=fixture('',true,false,true,'?recordEntrance=spin');
    assert.equal(selectedRecord.navigation.recordEntrance,'cue','The selected main-page entrance stays Cue outside laboratory previews');
    console.log('Liquid seam navigation passed, including record readiness, entrance/exit messages, focus, stale loads and record fallback.');
})().catch(e=>{console.error(e);process.exitCode=1;});
