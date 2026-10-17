class LiquidSeam
{
    static duration = 1700;
    static geometry(t, width, height)
    {
        t = Math.max(0, Math.min(1, t));
        const e = t*t*(3-2*t), pulse = Math.sin(t*Math.PI), left = [], right = [], edges = [];
        for (let q=0;q<=64;q++)
        {
            const y=q/64*height, wave=Math.sin(q*.19+t*4)*width*.035*pulse+Math.sin(q*.47-t*3)*width*.009*pulse;
            left.push({x:width/2+wave-(width/2+12)*e,y});
            right.push({x:width/2+wave+(width/2+12)*e,y});
        }
        edges.push({points:left,alpha:.8,width:1},{points:right,alpha:.8,width:1});
        for(let q=1;q<=4;q++)
        {
            edges.push({points:left.map(p=>({x:p.x-q*7,y:p.y})),alpha:.4-q*.065,width:.7});
            edges.push({points:right.map(p=>({x:p.x+q*7,y:p.y})),alpha:.4-q*.065,width:.7});
        }
        const mask=[...left,...right.slice().reverse()];
        const path=mask.map((p,q)=>(q?'L':'M')+p.x.toFixed(3)+' '+p.y.toFixed(3)).join(' ')+' Z';
        return {path,edges,pulse};
    }
}
if(typeof module!=='undefined')module.exports=LiquidSeam;
