const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'dist/signal-cursor.js'),'utf8').replace('new SignalCursor();','');
function fixture(canvas=true)
{
    const events=()=>({callbacks:{},addEventListener(type,fn){(this.callbacks[type]||=[]).push(fn);},dispatch(type,event={}){for(const fn of this.callbacks[type]||[])fn(event);}});
    const classes=new Set(),intro=new Set(),frames=new Map(),fills=[],arcs=[];let id=0,now=100;
    const context={setTransform(){},clearRect(){},fillRect(...a){fills.push(a);},beginPath(){},arc(...a){arcs.push(a);},stroke(){}};
    const document=Object.assign(events(),{hidden:false,body:{append(){},classList:{add:n=>classes.add(n),remove:n=>classes.delete(n)}},documentElement:Object.assign(events(),{classList:{contains:n=>intro.has(n)}}),createElement:()=>({style:{},setAttribute(){},getContext:()=>canvas?context:null})});
    const window=events(),fine=Object.assign(events(),{matches:true}),reduce=Object.assign(events(),{matches:false});
    const sandbox={document,window,innerWidth:1280,innerHeight:720,devicePixelRatio:2,matchMedia:query=>query.includes('reduced')?reduce:fine,requestAnimationFrame(fn){frames.set(++id,fn);return id;},cancelAnimationFrame(q){frames.delete(q);}};
    vm.createContext(sandbox);vm.runInContext(source+';this.Cursor=SignalCursor;',sandbox);const cursor=new sandbox.Cursor();
    const mouse={pointerType:'mouse',clientX:100,clientY:200,target:{closest:()=>({})}};
    function tick(elapsed=16){now+=elapsed;const active=[...frames];frames.clear();for(const [id,fn] of active)fn(now);}
    return{cursor,document,window,fine,reduce,classes,intro,frames,fills,arcs,mouse,tick};
}
const f=fixture();f.document.dispatch('pointermove',f.mouse);f.tick();assert.equal(f.fills.length,7);assert.equal(f.frames.size,0,'Stationary cursor must not run an animation loop');
assert.ok(f.cursor.canvas.width*f.cursor.canvas.height<=4096,'A stationary pointer must use a small local buffer');
f.fills.length=0;f.document.dispatch('pointermove',{...f.mouse,clientX:400});f.tick();assert.equal(f.fills.length,7);assert.ok(f.fills.every(p=>p[0]>=400),'Moving must leave no old pixels or trail');
for(let q=0;q<30;q++)f.document.dispatch('pointerdown',f.mouse);assert.equal(f.cursor.bursts.length,8);assert.equal(f.frames.size,1);f.tick();assert.equal(f.arcs.at(-1)[2],18);
assert.ok(f.cursor.canvas.width*f.cursor.canvas.height<100000,'Click echoes stay local instead of allocating a full-screen canvas');
f.tick(2000);assert.equal(f.cursor.bursts.length,0,'Click echoes must expire on time even if a frame is delayed');assert.equal(f.frames.size,0);
f.document.dispatch('keydown',{key:'Tab'});assert.equal(f.classes.has('signal-cursor-active'),false);
f.fine.matches=false;f.document.dispatch('pointermove',f.mouse);assert.equal(f.classes.has('signal-cursor-active'),false);
f.fine.matches=true;f.document.dispatch('pointermove',f.mouse);f.tick();f.document.dispatch('pointermove',{...f.mouse,pointerType:'touch'});assert.equal(f.classes.has('signal-cursor-active'),false);
f.reduce.matches=true;f.document.dispatch('pointerdown',f.mouse);f.tick();assert.equal(f.cursor.bursts.length,0);
f.document.hidden=true;f.document.dispatch('visibilitychange');assert.equal(f.frames.size,0);assert.equal(f.classes.has('signal-cursor-active'),false);
f.document.hidden=false;f.intro.add('entrance-running');f.document.dispatch('pointermove',f.mouse);assert.equal(f.classes.has('signal-cursor-active'),false);
f.intro.clear();f.document.dispatch('pointermove',f.mouse);f.tick();f.window.dispatch('blur');assert.equal(f.classes.has('signal-cursor-active'),false);
const fallback=fixture(false);assert.equal(fallback.classes.size,0);assert.equal(fallback.frames.size,0);
const wide=fixture();wide.cursor.width=7680;wide.cursor.height=4320;
for(const [x,y] of [[2,2],[7678,2],[7678,4318],[2,4318]])wide.document.dispatch('pointerdown',{...wide.mouse,clientX:x,clientY:y});
wide.tick();assert.ok(wide.cursor.canvas.width*wide.cursor.canvas.height<=2000000,'Widely separated click rings must retain a bounded backing buffer');
wide.tick(1300);assert.ok(wide.cursor.canvas.width*wide.cursor.canvas.height<=4096,'Expired rings must release the large backing buffer');
console.log('Signal cursor passed: seven original pixels, no trail, circular click echoes, bounded bursts, idle cleanup, keyboard/touch/native fallback, reduced motion and entrance safety.');
