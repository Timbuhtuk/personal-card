const assert = require('node:assert/strict');
const M = require('./dist/transition-motion.js');
assert.equal(Object.keys(M.variants).length,12);
assert.deepEqual(Object.values(M.numbers),['06','07','11','12','13','14','15','16','17','18','19','20']);
for(const old of ['fade','lift','blinds','flip','pixels','crt','gravity','vortex'])assert.ok(!Object.hasOwn(M.variants,old));
function inside(point,polygon)
{
    let result=false;
    for(let q=0,e=polygon.length-1;q<polygon.length;e=q++)
    {
        const a=polygon[q],b=polygon[e];
        if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)result=!result;
    }
    return result;
}
let frames=0,points=0;
for(const [w,h] of [[320,520],[971,600],[1920,1080],[5000,2500]])
    for(const center of [{x:w*.5,y:h*.5},{x:1,y:1},{x:w-1,y:h-1}])
        for(const mode of Object.keys(M.variants).slice(2))
        {
            const corners=[{x:.1,y:.1},{x:w-.1,y:.1},{x:w-.1,y:h-.1},{x:.1,y:h-.1}];
            for(let q=0;q<=100;q++)
            {
                const geometry=M.geometry(mode,q/100,w,h,center);assert.ok(geometry.masks.length>0);
                assert.ok(geometry.pulse>=0&&geometry.pulse<=1);
                for(const path of [...geometry.masks,...geometry.edges.map(e=>e.points)])for(const p of path)
                {
                    assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
                    assert.ok(Math.abs(p.x)<Math.hypot(w,h)*10&&Math.abs(p.y)<Math.hypot(w,h)*10);points++;
                }
                const mask=geometry.masks.map(p=>M.polygon(p)).join(' ');assert.ok(!/NaN|Infinity/.test(mask));
                if(q===0)for(const corner of corners)assert.ok(!geometry.masks.some(p=>inside(corner,p)),`${mode} must start closed`);
                if(q===100)for(const corner of corners)assert.ok(geometry.masks.some(p=>inside(corner,p)),`${mode} must reveal every corner`);
                frames++;
            }
        }
console.log(`${frames} mask frames and ${points} contour points passed across four viewport sizes and three origins: closed start, full coverage, finite coordinates and removed concepts.`);
