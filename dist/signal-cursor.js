class SignalCursor
{
    constructor()
    {
        this.canvas=document.createElement('canvas');this.canvas.className='signal-cursor-canvas';this.canvas.setAttribute('aria-hidden','true');
        this.context=this.canvas.getContext('2d');if(!this.context)return;
        document.body.append(this.canvas);
        this.fine=matchMedia('(any-hover: hover) and (any-pointer: fine)');this.reduce=matchMedia('(prefers-reduced-motion: reduce)');
        this.pointer={x:0,y:0,active:false};this.bursts=[];this.frame=0;this.previous=0;
        const move=event=>{
            if(event.pointerType!=='mouse'){this.stop();return;}
            this.pointer={x:event.clientX,y:event.clientY,active:!!event.target.closest('main')};
            if(!this.available()||!this.pointer.active){this.stop();return;}
            this.wake();
        };
        document.addEventListener('pointermove',move,{passive:true});
        document.addEventListener('pointerdown',event=>{
            move(event);if(!this.pointer.active||!this.available())return;
            if(!this.reduce.matches){this.bursts.push({x:this.pointer.x,y:this.pointer.y,age:0});this.bursts=this.bursts.slice(-8);}
            this.wake();
        });
        document.documentElement.addEventListener('pointerleave',()=>this.stop());window.addEventListener('blur',()=>this.stop());
        document.addEventListener('pointercancel',()=>this.stop());
        document.addEventListener('keydown',event=>{if(event.key==='Tab')this.stop();});
        document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stop();});
        window.addEventListener('resize',()=>this.resize());this.fine.addEventListener('change',()=>this.stop());
        this.reduce.addEventListener('change',()=>{this.bursts=[];if(this.pointer.active)this.wake();});
        this.resize();
    }
    available()
    {
        return this.fine.matches&&!document.hidden&&!document.documentElement.classList.contains('entrance-running')&&!document.documentElement.classList.contains('entrance-pending');
    }
    resize()
    {
        this.stop();this.width=innerWidth;this.height=innerHeight;
        const scale=Math.min(devicePixelRatio||1,2,Math.sqrt(8000000/(this.width*this.height)));
        this.canvas.width=Math.round(this.width*scale);this.canvas.height=Math.round(this.height*scale);this.context.setTransform(scale,0,0,scale,0,0);
    }
    stop()
    {
        cancelAnimationFrame(this.frame);this.frame=0;this.previous=0;this.bursts=[];this.pointer.active=false;
        document.body.classList.remove('signal-cursor-active');this.context.clearRect(0,0,this.width||0,this.height||0);
    }
    wake()
    {
        document.body.classList.add('signal-cursor-active');if(!this.frame)this.frame=requestAnimationFrame(now=>this.draw(now));
    }
    draw(now)
    {
        this.frame=0;if(!this.available()||!this.pointer.active){this.stop();return;}
        const dt=this.previous?now-this.previous:0;this.previous=now;
        const c=this.context;c.clearRect(0,0,this.width,this.height);c.globalAlpha=1;c.fillStyle='#eeeeee';
        const pattern=['1000','1100','1110','1000'];
        for(let y=0;y<4;y++)for(let x=0;x<4;x++)if(pattern[y][x]==='1')c.fillRect(this.pointer.x+x*4,this.pointer.y+y*4,3,3);
        for(const b of this.bursts)b.age+=dt;
        this.bursts=this.reduce.matches?[]:this.bursts.filter(b=>b.age<1200);
        c.strokeStyle='#eeeeee';c.lineWidth=1;
        for(const b of this.bursts){c.globalAlpha=1-b.age/1200;c.beginPath();c.arc(b.x,b.y,18+b.age*.08,0,Math.PI*2);c.stroke();}
        c.globalAlpha=1;
        if(this.bursts.length)this.frame=requestAnimationFrame(time=>this.draw(time));else this.previous=0;
    }
}
new SignalCursor();
