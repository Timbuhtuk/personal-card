class TransitionMotion
{
    static variants = {
        slash: ['Diagonal cut', 1000, 'One sharp diagonal cut slices the new page into view.'],
        portal: ['Contour portal', 1700, 'A rippling aperture opens from the link, surrounded by living contour rings.'],
        slit: ['Twin blade', 1400, 'A diagonal seam opens in both directions, like two blades pulling the page apart.'],
        chevron: ['Chevron', 1300, 'Two slanted edges meet in a sharp point that pushes across the page.'],
        cross: ['Cross incision', 1500, 'Two intersecting diagonal cuts open together, exposing four expanding wedges.'],
        tear: ['Liquid seam', 1700, 'An irregular vertical seam stretches open with soft, flowing edges.'],
        zipper: ['Zipper', 1600, 'A serrated boundary unzips the page from left to right.'],
        eye: ['Contour eye', 1800, 'A narrow horizontal opening widens first, then stretches into a full oval portal.'],
        diamond: ['Diamond gate', 1700, 'A rotating diamond aperture expands through nested geometric contours.'],
        twins: ['Twin portals', 2000, 'Two rippling apertures grow separately, meet and fuse into a single opening.'],
        tide: ['Contour tide', 1900, 'A broad wavefront moves down the page, followed by parallel contour ripples.'],
        iris: ['Spiral iris', 2000, 'Eight rotating apertures unfold around the link and close their gaps as they expand.']
    };
    static numbers = { slash: '06', portal: '07', slit: '11', chevron: '12', cross: '13', tear: '14', zipper: '15', eye: '16', diamond: '17', twins: '18', tide: '19', iris: '20' };
    static clamp(value) { return Math.max(0, Math.min(1, value)); }
    static smooth(value) { const t = this.clamp(value); return t * t * (3 - 2 * t); }
    static range(value, start, end) { return this.smooth((value - start) / (end - start)); }
    static polygon(points) { return points.map((p,q)=>(q?'L':'M')+p.x.toFixed(3)+' '+p.y.toFixed(3)).join(' ')+' Z'; }
    static geometry(mode, t, w, h, center)
    {
        const e=this.smooth(t), pulse=Math.sin(t*Math.PI), diagonal=Math.hypot(w,h);
        const masks=[], edges=[];
        const add=(points,alpha=1,width=1)=>edges.push({points,alpha,width});
        const point=(x,y)=>({x,y});
        const circle=(cx,cy,rx,ry,rotation=0,power=1,wave=0)=>Array.from({length:97},(_,q)=>{
            const a=q/96*Math.PI*2, r=1+Math.sin(a*5+t*7)*wave;
            const x=Math.sign(Math.cos(a))*Math.pow(Math.abs(Math.cos(a)),power)*rx*r;
            const y=Math.sign(Math.sin(a))*Math.pow(Math.abs(Math.sin(a)),power)*ry*r;
            return point(cx+x*Math.cos(rotation)-y*Math.sin(rotation),cy+x*Math.sin(rotation)+y*Math.cos(rotation));
        });
        const band=angle=>{
            const u=point(Math.cos(angle)*diagonal*2,Math.sin(angle)*diagonal*2);
            const reach=(Math.abs(Math.sin(angle))*w+Math.abs(Math.cos(angle))*h)/2+12;
            const v=point(-Math.sin(angle)*reach*e,Math.cos(angle)*reach*e);
            const cx=w/2,cy=h/2;
            const a=point(cx-u.x-v.x,cy-u.y-v.y),b=point(cx+u.x-v.x,cy+u.y-v.y),c=point(cx+u.x+v.x,cy+u.y+v.y),d=point(cx-u.x+v.x,cy-u.y+v.y);
            masks.push([a,b,c,d]);add([a,b],.9,1.3);add([d,c],.9,1.3);
        };
        if(mode==='slit') band(-.58);
        else if(mode==='chevron')
        {
            const tip=point(-w+5*w*e,h/2),top=point(-3*w,-3*h),bottom=point(-3*w,4*h);
            masks.push([top,tip,bottom]);add([top,tip,bottom],.9,1.5);
        }
        else if(mode==='cross') {band(-.64);band(.64);}
        else if(mode==='tear')
        {
            const left=[],right=[];
            for(let q=0;q<=64;q++)
            {
                const y=q/64*h, wave=Math.sin(q*.19+t*4)*w*.035*pulse+Math.sin(q*.47-t*3)*w*.009*pulse;
                left.push(point(w/2+wave-(w/2+12)*e,y));right.push(point(w/2+wave+(w/2+12)*e,y));
            }
            masks.push([...left,...right.slice().reverse()]);add(left,.8,1);add(right,.8,1);
            for(let q=1;q<=4;q++){add(left.map(p=>point(p.x-q*7,p.y)),.4-q*.065,.7);add(right.map(p=>point(p.x+q*7,p.y)),.4-q*.065,.7);}
        }
        else if(mode==='zipper')
        {
            const front=-45+(w+90)*e, edge=[];
            for(let q=0;q<=40;q++)edge.push(point(front+(q%2?12:-12)*pulse,q/40*h));
            masks.push([point(-50,-1),...edge,point(-50,h+1)]);add(edge,.9,1.2);
            for(let q=1;q<=3;q++)add(edge.map(p=>point(p.x-q*8,p.y)),.45-q*.09,.7);
        }
        else if(mode==='eye')
        {
            const max=Math.hypot(Math.max(center.x,w-center.x),Math.max(center.y,h-center.y))+30;
            const rx=max*this.smooth(Math.pow(t,.6)),ry=max*Math.pow(e,1.8);
            masks.push(circle(center.x,center.y,rx,ry));
            for(let q=0;q<8;q++)add(circle(center.x,center.y,rx+q*7,ry+q*7),.8-q*.085,.8);
        }
        else if(mode==='diamond')
        {
            const radius=(Math.max(center.x,w-center.x)+Math.max(center.y,h-center.y)+40)*e,rotation=(1-e)*-.65;
            masks.push(circle(center.x,center.y,radius,radius,rotation,2));
            for(let q=0;q<7;q++)add(circle(center.x,center.y,radius+q*11,radius+q*11,rotation,2),.8-q*.1,.8);
        }
        else if(mode==='twins')
        {
            const centers=[point(w*.32,center.y),point(w*.68,center.y)];
            const radius=(Math.hypot(w*.68,Math.max(center.y,h-center.y))+40)*e;
            for(let q=0;q<2;q++)
            {
                const origin=centers[q],other=centers[1-q];
                masks.push(circle(origin.x,origin.y,radius,radius,0,1,.025*pulse));
                for(let k=0;k<7;k++)
                {
                    const ring=circle(origin.x,origin.y,radius+k*8,radius+k*8,0,1,.025*pulse);
                    let segment=[];
                    for(const p of ring)
                    {
                        if(Math.hypot(p.x-other.x,p.y-other.y)<radius*.975){if(segment.length>1)add(segment,.75-k*.09,.8);segment=[];}
                        else segment.push(p);
                    }
                    if(segment.length>1)add(segment,.75-k*.09,.8);
                }
            }
        }
        else if(mode==='tide')
        {
            const edge=[];
            for(let q=0;q<=96;q++){const x=q/96*w;edge.push(point(x,-60+(h+120)*e+Math.sin(q*.085+t*6)*32*pulse+Math.sin(q*.19-t*3)*9*pulse));}
            masks.push([point(0,-80),point(w,-80),...edge.slice().reverse()]);
            for(let q=0;q<9;q++)add(edge.map(p=>point(p.x,p.y+q*9)),.85-q*.09,.8);
        }
        else if(mode==='iris')
        {
            const radius=(Math.hypot(Math.max(center.x,w-center.x),Math.max(center.y,h-center.y))+30)*e;
            const step=Math.PI/4,rotation=(1-e)*1.8,gap=.16*Math.pow(1-e,2)-.002*e;
            for(let q=0;q<8;q++)
            {
                const arc=[];
                for(let k=0;k<=18;k++){const a=q*step+rotation+gap+(step-2*gap)*k/18;arc.push(point(center.x+Math.cos(a)*radius,center.y+Math.sin(a)*radius));}
                const blade=[point(center.x,center.y),...arc];masks.push(blade);
                add([...blade,blade[0]],.65,.8);
                for(let k=1;k<=3;k++)add(arc.map(p=>point(center.x+(p.x-center.x)*(radius?1+k*7/radius:1),center.y+(p.y-center.y)*(radius?1+k*7/radius:1))),.45-k*.1,.7);
            }
        }
        return {masks,edges,pulse};
    }
}
if (typeof module !== 'undefined') module.exports = TransitionMotion;
