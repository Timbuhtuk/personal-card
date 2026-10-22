const assert=require('node:assert/strict');
const Seam=require('./dist/liquid-seam.js');
const Motion=require('./dist/transition-motion.js');
assert.equal(Seam.duration,Motion.variants.tear[1]);
let samples=0;
for(const [w,h] of [[320,520],[971,600],[1920,1080],[5000,2500]])for(let q=0;q<=100;q++)
{
    const t=q/100,selected=Seam.geometry(t,w,h),lab=Motion.geometry('tear',t,w,h,{x:0,y:0});
    assert.equal(selected.path,Motion.polygon(lab.masks[0]),'Production must match the selected study exactly');
    assert.deepEqual(selected.edges,lab.edges);assert.equal(selected.pulse,lab.pulse);
    assert.equal(Seam.geometry(1-(1-t),w,h).path,selected.path,'Closing must be an exact reverse');samples++;
}
console.log(`${samples} production Liquid seam frames match study 14: mask, contours, duration and exact reverse.`);

for(const [w,h] of [[320,520],[971,600],[1920,1080],[5000,2500]])for(let q=0;q<=100;q++)
{
    const t=q/100,vertical=Seam.geometry(t,h,w),horizontal=Seam.geometry(t,w,h,'horizontal');
    assert.equal(horizontal.pulse,vertical.pulse);
    for(let e=0;e<vertical.edges.length;e++)
        assert.deepEqual(horizontal.edges[e].points,vertical.edges[e].points.map(p=>({x:p.y,y:p.x})));
    assert.equal(Seam.geometry(1-(1-t),w,h,'horizontal').path,horizontal.path);
    const first=horizontal.edges[0].points,second=horizontal.edges[1].points;
    assert.equal(first[0].x,0);assert.equal(first.at(-1).x,w);
    if(q===0)assert.deepEqual(first,second,'Closed horizontal aperture has zero area');
    if(q===100){assert.ok(first.every(p=>p.y<0));assert.ok(second.every(p=>p.y>h));}
}
console.log('404 horizontal Work frames are exact transposes of the approved seam, with full coverage and exact reverse.');
for (const orientation of ['vertical','horizontal'])
{
    const forward = Seam.keyframes(390,748,orientation), reverse = Seam.keyframes(390,748,orientation,true);
    assert.equal(forward.length,65);
    for (let q=0;q<forward.length;q++)
    {
        assert.equal(forward[q].clipPath,`path("${Seam.geometry(q/64,390,748,orientation).path}")`);
        assert.equal(reverse[q].clipPath,forward[64-q].clipPath);
    }
    const points = path => path.match(/-?\d+(?:\.\d+)?/g).map(Number);
    for (let q=0;q<64;q++)
    {
        const a=points(forward[q].clipPath), b=points(forward[q+1].clipPath), actual=points(Seam.geometry((q+.5)/64,390,748,orientation).path);
        actual.forEach((value,index)=>assert.ok(Math.abs(value-(a[index]+b[index])/2)<.15,'Native interpolation must retain the mobile seam within 0.15px'));
    }
}
