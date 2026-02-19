import { useState, useEffect, useRef, useCallback } from "react";

/* IRONMAN 70.3 WEYMOUTH — MARIO BROS STYLE v4
   Sound effects, manual nutrition, proper stats display */

// ── 8-BIT SOUND ENGINE (Web Audio API) ──
const SFX = (() => {
  let ctx = null;
  const getCtx = () => { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; };
  const play = (freq, dur, type = "square", vol = 0.15, slide = 0) => {
    try {
      const c = getCtx(), o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
      if (slide) o.frequency.linearRampToValueAtTime(freq + slide, c.currentTime + dur);
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.connect(g); g.connect(c.destination);
      o.start(c.currentTime); o.stop(c.currentTime + dur);
    } catch (e) {}
  };
  const noise = (dur, vol = 0.08) => {
    try {
      const c = getCtx(), buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * vol;
      const s = c.createBufferSource(), g = c.createGain();
      s.buffer = buf; g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      s.connect(g); g.connect(c.destination); s.start();
    } catch (e) {}
  };
  return {
    stroke: () => { noise(0.08, 0.06); play(200, 0.05, "sine", 0.04); },
    pedal: () => play(800, 0.03, "square", 0.06),
    step: () => { noise(0.04, 0.04); play(150, 0.04, "triangle", 0.03); },
    pickup: () => { play(880, 0.08, "square", 0.12); play(1320, 0.12, "square", 0.1); },
    coffee: () => { play(523, 0.1, "square", 0.13); play(659, 0.1, "square", 0.13); play(784, 0.15, "square", 0.15); play(1047, 0.2, "square", 0.12); },
    sprint: () => play(440, 0.15, "sawtooth", 0.08, 200),
    bonk: () => { play(300, 0.3, "square", 0.15, -200); play(100, 0.4, "sawtooth", 0.1); },
    transition: () => { [523,659,784,1047].forEach((f,i) => setTimeout(() => play(f, 0.15, "square", 0.12), i * 120)); },
    finish: () => { [523,659,784,1047,1319,1568].forEach((f,i) => setTimeout(() => play(f, 0.2, "square", 0.14), i * 100)); },
    warn: () => { play(220, 0.15, "square", 0.1); play(180, 0.15, "square", 0.1); },
    select: () => play(660, 0.06, "square", 0.08),
  };
})();

const DISTS = [1.2, 56, 13.1];
const TOTAL = 70.3;
const LABEL = ["SWIM", "BIKE", "RUN"];
const ICON_E = ["🏊", "🚴", "🏃"];
const PCOL = ["#0ea5e9", "#22c55e", "#ef4444"];
const SPD_BASE = [0.018, 0.28, 0.075];
const SPD_MULT = 5;
const WORLD_SCALE = [2400, 2400, 2400];

const PICKUPS = {
  water:   { icon: "💧", nm: "Water",    h: 20, e: 0,  c: 0,  m: 0 },
  gel:     { icon: "🟡", nm: "Gel",      h: 0,  e: 18, c: 0,  m: 2 },
  coffee:  { icon: "☕", nm: "COFFEE!",  h: 5,  e: 8,  c: 40, m: 15 },
  caffgel: { icon: "🟠", nm: "CaffGel",  h: 0,  e: 12, c: 25, m: 3 },
  banana:  { icon: "🍌", nm: "Banana",   h: 3,  e: 15, c: 0,  m: 3 },
  coke:    { icon: "🥤", nm: "Coke",     h: 8,  e: 12, c: 15, m: 8 },
  star:    { icon: "⭐", nm: "STAR!",    h: 10, e: 10, c: 10, m: 20 },
};
const PK_LIST = Object.keys(PICKUPS);
const RIVALS = ["Luigi M.","Toad K.","Peach D.","Yoshi T.","Bowser J.","Wario S.","Daisy R.","Rosalina","DK Kong","Shy Guy","Koopa T.","Boo G."];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const timeFmt = s => { const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sc = Math.floor(s%60); return h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(sc).padStart(2,"0")}` : `${m}:${String(sc).padStart(2,"0")}`; };
const distFmt = d => d < 0.5 ? `${(d*5280).toFixed(0)}ft` : `${d.toFixed(2)}mi`;

function makeRivals() { return Array.from({length:12},(_,i)=>({id:i,name:RIVALS[i],sk:0.5+Math.random()*0.5,dist:0,ph:0,done:false,ft:0,ef:0.45+Math.random()*0.45})); }

function makeWorld(ph) {
  const tw = DISTS[ph] * WORLD_SCALE[ph];
  const items = [], decor = [];
  const sp = ph === 0 ? 120 : ph === 1 ? 200 : 150;
  const count = Math.floor(tw / sp);
  for (let i = 0; i < count; i++) {
    const x = 300 + i * sp + Math.random() * (sp * 0.4);
    if (Math.random() < 0.25) items.push({ x, type: PK_LIST[Math.floor(Math.random()*PK_LIST.length)], got: false });
    if (ph === 0) {
      if (Math.random()<0.35) decor.push({x,k:"buoy"}); if (Math.random()<0.2) decor.push({x:x+50,k:"fish"});
      if (Math.random()<0.15) decor.push({x:x+80,k:"weed"}); if (Math.random()<0.08) decor.push({x:x+30,k:"jelly"});
      if (Math.random()<0.04) decor.push({x:x+60,k:"turtle"});
    } else if (ph === 1) {
      if (Math.random()<0.3) decor.push({x,k:"tree"}); if (Math.random()<0.08) decor.push({x:x+30,k:"sign"});
      if (Math.random()<0.06) decor.push({x:x+60,k:"house"}); if (Math.random()<0.04) decor.push({x:x+90,k:"cow"});
      if (Math.random()<0.05) decor.push({x:x+40,k:"barn"}); if (Math.random()<0.03) decor.push({x:x+70,k:"windmill"});
      if (Math.random()<0.1) decor.push({x:x+20,k:"bush"}); if (Math.random()<0.05) decor.push({x:x+50,k:"fence"});
    } else {
      if (Math.random()<0.25) decor.push({x,k:"person"}); if (Math.random()<0.08) decor.push({x:x+40,k:"flag"});
      if (Math.random()<0.08) decor.push({x:x+20,k:"bldg"}); if (Math.random()<0.06) decor.push({x:x+60,k:"lamp"});
      if (Math.random()<0.04) decor.push({x:x+30,k:"bench"}); if (Math.random()<0.15) decor.push({x:x+10,k:"cone"});
    }
  }
  return { items, decor, totalWidth: tw };
}

function pxB(ctx,x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x|0,y|0,w,h);ctx.fillStyle="rgba(255,255,255,0.18)";ctx.fillRect(x|0,y|0,w,2);ctx.fillRect(x|0,y|0,2,h);ctx.fillStyle="rgba(0,0,0,0.12)";ctx.fillRect(x|0,(y|0)+h-2,w,2);}

function GameCanvas({ ph, scroll, pwr, caff, world, isSprint, playerScreenX }) {
  const cvs = useRef(null);
  const raf = useRef(0);
  useEffect(() => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext("2d"); let alive = true;
    const render = () => {
      if (!alive) return;
      const dpr = window.devicePixelRatio||1;
      const rc = c.getBoundingClientRect();
      const W = rc.width, H = rc.height;
      if (c.width !== (W*dpr|0)){c.width=W*dpr|0;c.height=H*dpr|0;}
      ctx.setTransform(dpr,0,0,dpr,0,0); ctx.imageSmoothingEnabled=false;
      const t = Date.now()/1000;
      const px = playerScreenX;

      if (ph === 0) {
        // === SWIM - SUBMERGED ===
        const surfY = H * 0.45, seabedY = H * 0.88;
        // Sky
        const skyG = ctx.createLinearGradient(0,0,0,surfY);
        skyG.addColorStop(0,"#7dd3fc"); skyG.addColorStop(1,"#bae6fd");
        ctx.fillStyle = skyG; ctx.fillRect(0,0,W,surfY);
        // Clouds
        ctx.fillStyle="rgba(255,255,255,0.6)";
        for(let i=0;i<3;i++){const cx=((i*250-scroll*0.008)%(W+200))-80;ctx.beginPath();ctx.arc(cx,surfY*0.4+i*6,12,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(cx+12,surfY*0.4+i*6+2,9,0,Math.PI*2);ctx.fill();}
        // Water
        const wG=ctx.createLinearGradient(0,surfY,0,H);
        wG.addColorStop(0,"#0284c7");wG.addColorStop(0.3,"#0369a1");wG.addColorStop(0.7,"#075985");wG.addColorStop(1,"#0c4a6e");
        ctx.fillStyle=wG;ctx.fillRect(0,surfY,W,H-surfY);
        // Light shafts
        for(let i=0;i<7;i++){const rx=((i*180-scroll*0.03)%W+W)%W;const g=ctx.createLinearGradient(rx,surfY,rx,H);g.addColorStop(0,"rgba(56,189,248,0.08)");g.addColorStop(1,"rgba(56,189,248,0)");ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(rx-8,surfY);ctx.lineTo(rx-40,H);ctx.lineTo(rx+40,H);ctx.lineTo(rx+8,surfY);ctx.closePath();ctx.fill();}
        // Caustics
        for(let i=0;i<20;i++){const cx=((i*90+Math.sin(t*0.5+i)*20-scroll*0.15)%W+W)%W;ctx.fillStyle=`rgba(56,189,248,${0.04+Math.sin(t*2+i*1.5)*0.02})`;ctx.beginPath();ctx.arc(cx,seabedY+Math.sin(t+i)*5,15+Math.sin(t*0.7+i)*5,0,Math.PI*2);ctx.fill();}
        // Seabed
        const sbG=ctx.createLinearGradient(0,seabedY-5,0,H);sbG.addColorStop(0,"#a07850");sbG.addColorStop(1,"#8b6914");ctx.fillStyle=sbG;ctx.fillRect(0,seabedY,W,H-seabedY);
        for(let i=0;i<25;i++){const sx=((i*80-scroll*0.15)%W+W)%W;ctx.fillStyle=`rgba(160,120,80,${0.3+(i%3)*0.1})`;ctx.fillRect(sx,seabedY+2,20+(i%4)*8,2);}
        // Rocks
        for(let i=0;i<8;i++){const rx=((i*160-scroll*0.15)%W+W)%W;ctx.fillStyle="#78716c";ctx.beginPath();ctx.arc(rx,seabedY+2,5+(i%3)*3,Math.PI,0);ctx.fill();ctx.fillStyle="#a1a1aa";ctx.beginPath();ctx.arc(rx-1,seabedY,4+(i%3)*2,Math.PI,0);ctx.fill();}
        // Seaweed
        for(let i=0;i<12;i++){const sx=((i*140-scroll*0.15)%W+W)%W;ctx.fillStyle="#15803d";for(let j=0;j<4;j++){const sw=Math.sin(t*1.2+i*0.7+j*0.5)*(4+j);ctx.fillRect(sx+j*4+sw,seabedY-12-j*8,3,14-j*2);}ctx.fillStyle="#22c55e";ctx.fillRect(sx+8+Math.sin(t*1.2+i*0.7+2)*6,seabedY-36,2,5);}
        // Bubbles
        for(let i=0;i<20;i++){const bx=(i*95+t*(15+i*3))%W;const by=H-30-((t*(12+i*2)+i*50)%(H-surfY-20));ctx.beginPath();ctx.arc(bx,by,1.5+(i%4)*0.8,0,Math.PI*2);ctx.fillStyle=`rgba(186,230,253,${0.15+(i%3)*0.05})`;ctx.fill();ctx.fillStyle="rgba(255,255,255,0.2)";ctx.beginPath();ctx.arc(bx-0.5,by-0.5,0.5,0,Math.PI*2);ctx.fill();}

        // Decor
        if(world) world.decor.forEach(s=>{const sx=s.x-scroll;if(sx<-60||sx>W+60)return;
          if(s.k==="buoy"){const bob=Math.sin(t*2+s.x*0.01)*3;pxB(ctx,sx-6,surfY-10+bob,12,12,"#fbbf24");ctx.fillStyle="#ef4444";ctx.fillRect(sx-1,surfY-22+bob,2,12);ctx.fillRect(sx-6,surfY-22+bob,12,5);ctx.fillStyle="rgba(251,191,36,0.08)";ctx.fillRect(sx-6,surfY+4,12,8);}
          if(s.k==="fish"){const fy=surfY+H*0.15+Math.sin(t*2.5+s.x*0.02)*25;const d=Math.sin(s.x)>0?1:-1;ctx.fillStyle="#f97316";ctx.fillRect(sx-6*d,fy,12,5);ctx.fillRect(sx+6*d,fy-2,5*d,9);ctx.fillStyle="white";ctx.fillRect(sx+(d>0?-4:2),fy+1,2,2);}
          if(s.k==="jelly"){const jy=surfY+H*0.18+Math.sin(t*0.8+s.x*0.01)*20;ctx.fillStyle="rgba(192,132,252,0.5)";ctx.beginPath();ctx.arc(sx,jy,6,Math.PI,0);ctx.fill();for(let j=0;j<3;j++){ctx.fillStyle=`rgba(192,132,252,${0.3-j*0.08})`;ctx.fillRect(sx-3+j*3+Math.sin(t*2+j+s.x*0.01)*3,jy,1,10+j*4);}}
          if(s.k==="turtle"){const ty=surfY+H*0.1+Math.sin(t*0.6+s.x*0.005)*15;ctx.fillStyle="#15803d";ctx.fillRect(sx-5,ty,10,6);pxB(ctx,sx-7,ty-2,14,6,"#22c55e");ctx.fillStyle="#fcd9b6";ctx.fillRect(sx+6,ty,4,3);const fa=Math.sin(t*3+s.x)*2;ctx.fillStyle="#15803d";ctx.fillRect(sx-8,ty+2+fa,3,4);ctx.fillRect(sx+7,ty+2-fa,3,4);}
          if(s.k==="weed"){ctx.fillStyle="#15803d";for(let j=0;j<3;j++){const sw=Math.sin(t*1.5+s.x*0.01+j)*3;ctx.fillRect(sx+j*4+sw,seabedY-10+j*2,3,12-j*2);}}
        });

        // Surface waves BEFORE swimmer (so swimmer is ON TOP)
        for(let wl=0;wl<4;wl++){ctx.beginPath();for(let x2=0;x2<=W;x2+=2){const y=surfY+wl*3+Math.sin((x2+scroll*(0.2+wl*0.1))*0.015+t*(2.5-wl*0.3)+wl*0.8)*(4-wl*0.5)+Math.sin((x2+scroll*0.1)*0.008+t*1.5)*2;x2===0?ctx.moveTo(x2,y):ctx.lineTo(x2,y);}ctx.lineTo(W,surfY+15);ctx.lineTo(0,surfY+15);ctx.closePath();ctx.fillStyle=`rgba(14,165,233,${0.3-wl*0.06})`;ctx.fill();}
        for(let i=0;i<15;i++){const wx=((i*110+scroll*0.25)%W+W)%W;const wy=surfY+Math.sin((wx+scroll*0.2)*0.015+t*2.5)*4;ctx.fillStyle=`rgba(255,255,255,${0.15+Math.sin(t*3+i)*0.05})`;ctx.fillRect(wx-8,wy-1,16,2);}

        // Pickups (floating on surface)
        if(world) world.items.forEach(pk=>{if(pk.got)return;const ix=pk.x-scroll;if(ix<-30||ix>W+30)return;const iy=surfY-28+Math.sin(t*2.5+pk.x*0.01)*4;pxB(ctx,ix-10,iy-10,20,20,"#f59e0b");ctx.fillStyle="#92400e";ctx.font="bold 12px monospace";ctx.textAlign="center";ctx.fillText("?",ix,iy+5);ctx.font="12px sans-serif";ctx.fillText(PICKUPS[pk.type].icon,ix,iy-14);});

        // SWIMMER ON SURFACE — body half in water, head and arms above
        const swimY=surfY+2,bob=Math.sin(t*3*(0.5+pwr))*3,armA=Math.sin(t*8*(0.5+pwr));
        // Caffeine aura
        if(caff>20){const au=ctx.createRadialGradient(px,swimY-4+bob,4,px,swimY-4+bob,25+caff*0.3);au.addColorStop(0,`rgba(251,191,36,${caff*0.005})`);au.addColorStop(1,"rgba(251,191,36,0)");ctx.fillStyle=au;ctx.fillRect(px-40,swimY-35+bob,80,50);}
        // Wake/splash trail behind swimmer
        if(pwr>0.1){for(let i=0;i<Math.floor(pwr*10);i++){const wx=px-16-i*7-Math.random()*6;const wy=swimY-2+bob+Math.random()*6-3;ctx.fillStyle=`rgba(255,255,255,${0.35*pwr-i*0.025})`;ctx.fillRect(wx,wy,3+Math.random()*3,2);}
        // V-shaped wake
        ctx.strokeStyle=`rgba(255,255,255,${0.15*pwr})`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px-14,swimY+bob);ctx.lineTo(px-50-pwr*30,swimY+bob-8-pwr*4);ctx.stroke();ctx.beginPath();ctx.moveTo(px-14,swimY+bob);ctx.lineTo(px-50-pwr*30,swimY+bob+8+pwr*4);ctx.stroke();}
        // Splash particles when going fast
        if(pwr>0.3){for(let i=0;i<Math.floor(pwr*6);i++){ctx.fillStyle=`rgba(186,230,253,${0.3*pwr})`;ctx.beginPath();ctx.arc(px+12+Math.random()*12,swimY-8+bob-Math.random()*12,1.5+Math.random()*1.5,0,Math.PI*2);ctx.fill();}}
        // Sprint fire on water
        if(isSprint&&pwr>0.3){for(let i=0;i<4;i++){ctx.fillStyle=i<2?"rgba(251,191,36,0.5)":"rgba(239,68,68,0.4)";ctx.fillRect(px-14-i*6+Math.random()*3,swimY-8+bob+Math.random()*6,4,4);}}
        // Legs/body (partially submerged — draw faded below waterline)
        const kick=Math.sin(t*12*(0.3+pwr))*3;
        ctx.globalAlpha=0.35;ctx.fillStyle="#1e293b";ctx.fillRect(px-14,swimY+3+bob+kick,4,8);ctx.fillRect(px-14,swimY+3+bob-kick,4,8);ctx.fillStyle="#0ea5e9";ctx.fillRect(px-12,swimY+bob,22,6);ctx.globalAlpha=1;
        // Body on surface
        ctx.fillStyle="#0ea5e9";ctx.fillRect(px-12,swimY-4+bob,22,6);
        ctx.fillStyle="#0369a1";ctx.fillRect(px-12,swimY+bob,22,2);
        // Head (above water!)
        ctx.fillStyle="#fcd9b6";ctx.fillRect(px+10,swimY-10+bob,7,8);
        // Swim cap
        ctx.fillStyle="#ef4444";ctx.fillRect(px+10,swimY-13+bob,8,5);
        // Goggles
        ctx.fillStyle="#1e293b";ctx.fillRect(px+13,swimY-8+bob,4,2);
        ctx.fillStyle="rgba(56,189,248,0.4)";ctx.fillRect(px+13,swimY-8+bob,3,1);
        // Arms (crawl stroke — one arm rises above water, one dips below)
        const armUp=armA>0;
        // Arm going up/forward (above water)
        ctx.fillStyle="#fcd9b6";
        if(armUp){ctx.fillRect(px+2,swimY-12+bob,4,10);ctx.fillStyle="#e7c9a5";ctx.fillRect(px+1,swimY-12+bob,5,3);}
        else{ctx.fillRect(px+2,swimY-4+bob,4,8);ctx.fillStyle="#e7c9a5";ctx.fillRect(px+1,swimY+2+bob,5,3);}
        // Other arm
        ctx.fillStyle="#fcd9b6";
        if(!armUp){ctx.fillRect(px+10,swimY-12+bob,4,10);ctx.fillStyle="#e7c9a5";ctx.fillRect(px+9,swimY-12+bob,5,3);}
        else{ctx.globalAlpha=0.5;ctx.fillRect(px+10,swimY-2+bob,4,8);ctx.globalAlpha=1;}
        // Water splash at arm entry point
        if(pwr>0.2){const splashX=armUp?px+10:px+2;ctx.fillStyle="rgba(255,255,255,0.4)";for(let i=0;i<3;i++){ctx.fillRect(splashX+Math.random()*6-3,swimY-2+bob-Math.random()*6,2,2);}}

      } else if (ph === 1) {
        // === BIKE ===
        const gY = H * 0.68;
        const skyG=ctx.createLinearGradient(0,0,0,gY*0.6);skyG.addColorStop(0,"#60a5fa");skyG.addColorStop(1,"#bae6fd");ctx.fillStyle=skyG;ctx.fillRect(0,0,W,gY);
        // Sun
        const sunX=((W*0.8-scroll*0.003)%(W+100));ctx.fillStyle="#fbbf24";ctx.beginPath();ctx.arc(sunX,30,18,0,Math.PI*2);ctx.fill();ctx.fillStyle="rgba(251,191,36,0.1)";ctx.beginPath();ctx.arc(sunX,30,35,0,Math.PI*2);ctx.fill();
        // Clouds
        ctx.fillStyle="rgba(255,255,255,0.7)";for(let i=0;i<6;i++){const cx=((i*240-scroll*0.01+300)%(W+300))-100,cy=18+(i%3)*15,sz=14+(i%3)*4;ctx.beginPath();ctx.arc(cx,cy,sz,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(cx+sz*0.8,cy+2,sz*0.7,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(cx-sz*0.6,cy+2,sz*0.6,0,Math.PI*2);ctx.fill();}
        // Hills
        ctx.fillStyle="#86efac";ctx.beginPath();ctx.moveTo(0,gY-50);for(let x2=0;x2<=W;x2+=3)ctx.lineTo(x2,gY-50+Math.sin((x2+scroll*0.015)*0.004)*30+Math.sin((x2+scroll*0.015)*0.002)*20);ctx.lineTo(W,gY);ctx.lineTo(0,gY);ctx.closePath();ctx.fill();
        ctx.fillStyle="#4ade80";ctx.beginPath();ctx.moveTo(0,gY-25);for(let x2=0;x2<=W;x2+=3)ctx.lineTo(x2,gY-25+Math.sin((x2+scroll*0.04)*0.006)*18+Math.sin((x2+scroll*0.04)*0.003)*12);ctx.lineTo(W,gY);ctx.lineTo(0,gY);ctx.closePath();ctx.fill();
        // Ground
        const gG=ctx.createLinearGradient(0,gY,0,H);gG.addColorStop(0,"#4ade80");gG.addColorStop(1,"#16a34a");ctx.fillStyle=gG;ctx.fillRect(0,gY,W,H-gY);
        // Road
        ctx.fillStyle="#374151";ctx.fillRect(0,gY-2,W,H*0.14);
        for(let i=0;i<30;i++){const rx=((i*60-scroll*0.3)%W+W)%W;ctx.fillStyle="#fbbf24";ctx.fillRect(rx,gY+H*0.05,25,2);}
        ctx.fillStyle="#d1d5db";ctx.fillRect(0,gY-2,W,2);ctx.fillRect(0,gY+H*0.12,W,2);
        // Grass
        for(let i=0;i<30;i++){const gx=((i*55-scroll*0.3)%W+W)%W;ctx.fillStyle="#16a34a";ctx.fillRect(gx,gY-5,8,3);ctx.fillRect(gx+2,gY-8,3,3);}

        // Decor
        if(world) world.decor.forEach(s=>{const sx=s.x-scroll;if(sx<-60||sx>W+60)return;
          if(s.k==="tree"){ctx.fillStyle="#713f12";ctx.fillRect(sx-3,gY-40,6,40);pxB(ctx,sx-16,gY-62,32,24,"#15803d");pxB(ctx,sx-12,gY-78,24,20,"#16a34a");pxB(ctx,sx-8,gY-88,16,14,"#22c55e");if(Math.floor(s.x)%4===0){ctx.fillStyle="#ef4444";ctx.fillRect(sx-6,gY-58,3,3);ctx.fillRect(sx+4,gY-66,3,3);}}
          if(s.k==="bush"){pxB(ctx,sx-8,gY-12,16,12,"#16a34a");pxB(ctx,sx-5,gY-17,10,8,"#22c55e");}
          if(s.k==="fence"){ctx.fillStyle="#a07850";for(let j=0;j<4;j++)ctx.fillRect(sx+j*10,gY-18,2,18);ctx.fillRect(sx,gY-16,32,2);ctx.fillRect(sx,gY-8,32,2);}
          if(s.k==="sign"){ctx.fillStyle="#78716c";ctx.fillRect(sx-1,gY-36,3,36);pxB(ctx,sx-20,gY-42,40,14,"white");ctx.fillStyle="#1e293b";ctx.font="bold 7px monospace";ctx.textAlign="center";ctx.fillText(["Dorchester","King's Stag","Godmanstone","Weymouth"][Math.floor(s.x/600)%4],sx,gY-32);}
          if(s.k==="house"){const hc=["#fef3c7","#dbeafe","#fce7f3"][Math.floor(s.x)%3];pxB(ctx,sx-16,gY-36,32,36,hc);ctx.fillStyle="#dc2626";ctx.beginPath();ctx.moveTo(sx-18,gY-36);ctx.lineTo(sx,gY-52);ctx.lineTo(sx+18,gY-36);ctx.closePath();ctx.fill();ctx.fillStyle="rgba(59,130,246,0.35)";ctx.fillRect(sx-10,gY-28,7,6);ctx.fillRect(sx+3,gY-28,7,6);ctx.fillStyle="#92400e";ctx.fillRect(sx-3,gY-15,6,15);ctx.fillStyle="#78716c";ctx.fillRect(sx+8,gY-54,4,10);}
          if(s.k==="barn"){pxB(ctx,sx-18,gY-30,36,30,"#dc2626");ctx.fillStyle="#991b1b";ctx.beginPath();ctx.moveTo(sx-20,gY-30);ctx.lineTo(sx,gY-44);ctx.lineTo(sx+20,gY-30);ctx.closePath();ctx.fill();ctx.fillStyle="#713f12";ctx.fillRect(sx-6,gY-18,12,18);}
          if(s.k==="windmill"){ctx.fillStyle="#e5e7eb";ctx.fillRect(sx-5,gY-50,10,50);pxB(ctx,sx-8,gY-54,16,8,"#d1d5db");ctx.save();ctx.translate(sx,gY-50);ctx.rotate(t*1.5);ctx.fillStyle="#f5f5f4";for(let j=0;j<4;j++){ctx.save();ctx.rotate(j*Math.PI/2);ctx.fillRect(-2,0,4,20);ctx.restore();}ctx.restore();}
          if(s.k==="cow"){ctx.fillStyle="white";ctx.fillRect(sx-8,gY-16,16,9);ctx.fillStyle="#1e293b";ctx.fillRect(sx-5,gY-14,4,4);ctx.fillRect(sx+2,gY-13,3,3);ctx.fillStyle="#fcd9b6";ctx.fillRect(sx+7,gY-16,5,5);ctx.fillStyle="white";ctx.fillRect(sx-8,gY-7,3,7);ctx.fillRect(sx+5,gY-7,3,7);}
        });

        // Pickups
        if(world) world.items.forEach(pk=>{if(pk.got)return;const ix=pk.x-scroll;if(ix<-30||ix>W+30)return;const iy=gY-48+Math.sin(t*3+pk.x*0.01)*5;pxB(ctx,ix-10,iy-10,20,20,"#f59e0b");ctx.fillStyle="#92400e";ctx.font="bold 12px monospace";ctx.textAlign="center";ctx.fillText("?",ix,iy+5);ctx.font="12px sans-serif";ctx.fillText(PICKUPS[pk.type].icon,ix,iy-14);});

        // CYCLIST
        const cy=gY+H*0.02,bobC=Math.abs(Math.sin(t*6*(0.3+pwr)))*2*pwr,ped=t*8*(0.3+pwr);
        if(caff>20){const au=ctx.createRadialGradient(px,cy-14-bobC,4,px,cy-14-bobC,22+caff*0.2);au.addColorStop(0,`rgba(251,191,36,${caff*0.005})`);au.addColorStop(1,"rgba(251,191,36,0)");ctx.fillStyle=au;ctx.fillRect(px-35,cy-45-bobC,70,55);}
        if(isSprint&&pwr>0.3)for(let i=0;i<5;i++){ctx.fillStyle=i<2?"#fbbf24":"#ef4444";ctx.fillRect(px-18-i*5+Math.random()*3,cy-8-bobC+Math.random()*10,4+Math.random()*3,4+Math.random()*3);}
        if(pwr>0.4)for(let i=0;i<Math.floor(pwr*4);i++){ctx.fillStyle=`rgba(255,255,255,${0.15*pwr})`;ctx.fillRect(px-22-i*10,cy-10-bobC+i*4,7+Math.random()*5,2);}
        // Wheels
        ctx.strokeStyle="#1e293b";ctx.lineWidth=2.5;[-15,15].forEach(ox=>{ctx.beginPath();ctx.arc(px+ox,cy-bobC,9,0,Math.PI*2);ctx.stroke();ctx.strokeStyle="#6b7280";ctx.lineWidth=0.8;for(let sp=0;sp<4;sp++){const a=ped+sp*Math.PI/2;ctx.beginPath();ctx.moveTo(px+ox,cy-bobC);ctx.lineTo(px+ox+Math.cos(a)*7,cy-bobC+Math.sin(a)*7);ctx.stroke();}ctx.strokeStyle="#1e293b";ctx.lineWidth=2.5;ctx.fillStyle="#6b7280";ctx.beginPath();ctx.arc(px+ox,cy-bobC,2,0,Math.PI*2);ctx.fill();});
        // Frame
        ctx.strokeStyle="#dc2626";ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(px-15,cy-bobC);ctx.lineTo(px,cy-18-bobC);ctx.lineTo(px+15,cy-bobC);ctx.stroke();ctx.beginPath();ctx.moveTo(px-15,cy-bobC);ctx.lineTo(px+5,cy-bobC);ctx.stroke();ctx.beginPath();ctx.moveTo(px,cy-18-bobC);ctx.lineTo(px+8,cy-10-bobC);ctx.stroke();
        ctx.fillStyle="#1e293b";ctx.fillRect(px-2,cy-20-bobC,6,3);ctx.fillRect(px+6,cy-22-bobC,9,2);ctx.fillRect(px+14,cy-22-bobC,2,5);
        // Rider
        ctx.fillStyle="#fcd9b6";ctx.fillRect(px+3,cy-34-bobC,7,7);ctx.fillStyle="#ef4444";ctx.fillRect(px+2,cy-37-bobC,9,5);ctx.fillStyle="#1e293b";ctx.fillRect(px+6,cy-32-bobC,4,2);ctx.fillRect(px+1,cy-27-bobC,8,10);
        ctx.fillStyle="#dc2626";ctx.fillRect(px+2,cy-26-bobC,6,4);ctx.fillStyle="white";ctx.font="bold 3px monospace";ctx.textAlign="center";ctx.fillText("703",px+5,cy-23-bobC);
        const lx=Math.sin(ped)*5;ctx.strokeStyle="#1e293b";ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(px+3,cy-17-bobC);ctx.lineTo(px-2+lx,cy-bobC);ctx.stroke();ctx.beginPath();ctx.moveTo(px+3,cy-17-bobC);ctx.lineTo(px+7-lx,cy-bobC);ctx.stroke();
        ctx.fillStyle="#ef4444";ctx.fillRect(px-4+lx,cy-2-bobC,5,3);ctx.fillRect(px+5-lx,cy-2-bobC,5,3);

      } else {
        // === RUN ===
        const gY = H * 0.7;
        const skyG=ctx.createLinearGradient(0,0,0,gY*0.5);skyG.addColorStop(0,"#38bdf8");skyG.addColorStop(1,"#e0f2fe");ctx.fillStyle=skyG;ctx.fillRect(0,0,W,gY);
        // Sea
        ctx.fillStyle="#0ea5e9";ctx.fillRect(0,gY-75,W,55);for(let rr=0;rr<5;rr++){ctx.beginPath();for(let x2=0;x2<=W;x2+=3){const y=gY-70+rr*11+Math.sin((x2+scroll*0.08)*0.02+t*2+rr)*3;x2===0?ctx.moveTo(x2,y):ctx.lineTo(x2,y);}ctx.strokeStyle=`rgba(255,255,255,${0.12-rr*0.02})`;ctx.lineWidth=1;ctx.stroke();}
        ctx.fillStyle="#fde68a";ctx.fillRect(0,gY-22,W,22);
        // Ground
        const gG=ctx.createLinearGradient(0,gY,0,H);gG.addColorStop(0,"#d4d4d8");gG.addColorStop(1,"#a1a1aa");ctx.fillStyle=gG;ctx.fillRect(0,gY,W,H-gY);
        for(let i=0;i<35;i++){const bx=((i*42-scroll*0.3)%W+W)%W;ctx.fillStyle=i%2?"#c4c4c8":"#d4d4d8";ctx.fillRect(bx,gY,40,H-gY);}
        ctx.setLineDash([8,8]);ctx.strokeStyle="#ef4444";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,gY+6);ctx.lineTo(W,gY+6);ctx.stroke();ctx.setLineDash([]);

        // Decor
        if(world) world.decor.forEach(s=>{const sx=s.x-scroll;if(sx<-60||sx>W+60)return;
          if(s.k==="person"){const col=["#ef4444","#3b82f6","#22c55e","#a855f7","#f59e0b","#ec4899"][Math.floor(s.x)%6];const ch=Math.sin(t*4+s.x*0.1)>0.3;const ay=ch?-2:0;ctx.fillStyle="#fcd9b6";ctx.fillRect(sx-3,gY-22+ay,6,6);ctx.fillStyle=col;ctx.fillRect(sx-4,gY-16+ay,8,10);ctx.fillStyle=col;ctx.fillRect(sx-4,gY-6,3,6);ctx.fillRect(sx+1,gY-6,3,6);if(ch){ctx.fillStyle="#fcd9b6";ctx.fillRect(sx-8,gY-26,3,3);ctx.fillRect(sx+5,gY-26,3,3);}}
          if(s.k==="flag"){ctx.fillStyle="#78716c";ctx.fillRect(sx,gY-40,2,40);ctx.fillStyle="#dc2626";ctx.fillRect(sx+2,gY-40,14,9);ctx.fillStyle="white";ctx.font="bold 5px monospace";ctx.textAlign="left";ctx.fillText("IM",sx+4,gY-33);}
          if(s.k==="bldg"){const bh=40+(Math.floor(s.x*7)%22);pxB(ctx,sx-20,gY-bh,40,bh,["#fef3c7","#e0e7ff","#fce7f3","#d1fae5"][Math.floor(s.x)%4]);for(let r=0;r<Math.floor(bh/11);r++)for(let c2=0;c2<3;c2++){ctx.fillStyle="rgba(59,130,246,0.22)";ctx.fillRect(sx-16+c2*12,gY-bh+4+r*11,8,6);}}
          if(s.k==="lamp"){ctx.fillStyle="#78716c";ctx.fillRect(sx,gY-36,2,36);ctx.fillStyle="#fbbf24";ctx.fillRect(sx-3,gY-38,8,4);ctx.fillStyle="rgba(251,191,36,0.06)";ctx.beginPath();ctx.arc(sx+1,gY-36,12,0,Math.PI*2);ctx.fill();}
          if(s.k==="bench"){ctx.fillStyle="#a07850";ctx.fillRect(sx-8,gY-8,16,3);ctx.fillRect(sx-7,gY-5,2,5);ctx.fillRect(sx+5,gY-5,2,5);ctx.fillStyle="#92400e";ctx.fillRect(sx-8,gY-12,16,2);}
          if(s.k==="cone"){ctx.fillStyle="#f97316";ctx.beginPath();ctx.moveTo(sx-4,gY);ctx.lineTo(sx,gY-10);ctx.lineTo(sx+4,gY);ctx.closePath();ctx.fill();ctx.fillStyle="white";ctx.fillRect(sx-3,gY-5,6,2);}
        });

        // Pickups
        if(world) world.items.forEach(pk=>{if(pk.got)return;const ix=pk.x-scroll;if(ix<-30||ix>W+30)return;const iy=gY-44+Math.sin(t*3+pk.x*0.01)*5;pxB(ctx,ix-10,iy-10,20,20,"#f59e0b");ctx.fillStyle="#92400e";ctx.font="bold 12px monospace";ctx.textAlign="center";ctx.fillText("?",ix,iy+5);ctx.font="12px sans-serif";ctx.fillText(PICKUPS[pk.type].icon,ix,iy-14);});

        // RUNNER
        const ry=gY-2,bobR=Math.abs(Math.sin(t*9*(0.3+pwr)))*3*pwr,stride=Math.sin(t*10*(0.3+pwr))*0.8;
        if(caff>20){const au=ctx.createRadialGradient(px,ry-16-bobR,4,px,ry-16-bobR,22+caff*0.2);au.addColorStop(0,`rgba(251,191,36,${caff*0.005})`);au.addColorStop(1,"rgba(251,191,36,0)");ctx.fillStyle=au;ctx.fillRect(px-35,ry-45-bobR,70,55);}
        if(isSprint&&pwr>0.3)for(let i=0;i<5;i++){ctx.fillStyle=i<2?"#fbbf24":"#ef4444";ctx.fillRect(px-10-i*5,ry-4-bobR+Math.random()*8,4+Math.random()*3,4+Math.random()*3);}
        if(pwr>0.4)for(let i=0;i<Math.floor(pwr*4);i++){ctx.fillStyle=`rgba(255,255,255,${0.15*pwr})`;ctx.fillRect(px-16-i*10,ry-12-bobR+i*4,7,2);}
        ctx.fillStyle="rgba(0,0,0,0.12)";ctx.fillRect(px-5,ry,10,2);
        if(pwr>0.3)for(let i=0;i<4;i++){ctx.fillStyle=`rgba(180,170,150,${0.15*pwr-i*0.03})`;ctx.fillRect(px-8-i*6,ry+1,4,2);}
        ctx.fillStyle="#ef4444";ctx.fillRect(px-6-stride*7,ry-4-bobR,6,4);ctx.fillRect(px+stride*7,ry-4-bobR,6,4);
        ctx.fillStyle="#1e293b";ctx.fillRect(px-3-stride*5,ry-12-bobR,4,10);ctx.fillRect(px+stride*5,ry-12-bobR,4,10);
        ctx.fillStyle="#dc2626";ctx.fillRect(px-5,ry-25-bobR,10,14);
        ctx.fillStyle="white";ctx.fillRect(px-3,ry-23-bobR,6,5);ctx.fillStyle="#dc2626";ctx.font="bold 4px monospace";ctx.textAlign="center";ctx.fillText("703",px,ry-19-bobR);
        ctx.fillStyle="#fcd9b6";ctx.fillRect(px-7+stride*4,ry-23-bobR,3,8);ctx.fillRect(px+5-stride*4,ry-23-bobR,3,8);
        ctx.fillStyle="#fcd9b6";ctx.fillRect(px-4,ry-33-bobR,8,8);ctx.fillStyle="#dc2626";ctx.fillRect(px-5,ry-35-bobR,10,4);ctx.fillRect(px+3,ry-33-bobR,5,2);
        ctx.fillStyle="#1e293b";ctx.fillRect(px-3,ry-31-bobR,6,2);
      }
      raf.current = requestAnimationFrame(render);
    };
    raf.current = requestAnimationFrame(render);
    return () => { alive = false; cancelAnimationFrame(raf.current); };
  }, [ph, scroll, pwr, caff, world, isSprint, playerScreenX]);
  return <canvas ref={cvs} style={{width:"100%",height:"100%",display:"block",imageRendering:"pixelated"}} />;
}

function SB({v,mx,c,lbl,ic}){return(<div style={{marginBottom:2}}><div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:"#a8a29e",fontFamily:"monospace"}}><span>{ic}{lbl}</span><span>{Math.round(v)}</span></div><div style={{height:6,background:"#292524",border:"1px solid #44403c",overflow:"hidden"}}><div style={{height:"100%",width:`${clamp(v/mx*100,0,100)}%`,background:c,transition:"width .2s"}}/></div></div>);}

export default function Game() {
  const [screen,setScreen]=useState("menu");const [assist,setAssist]=useState(false);
  const [phase,setPhase]=useState(0);const [dist,setDist]=useState(0);const [gt,setGt]=useState(0);
  const [nrg,setNrg]=useState(100);const [hyd,setHyd]=useState(100);const [caf,setCaf]=useState(0);const [mor,setMor]=useState(80);
  const [pwr,setPwr]=useState(0);const [cmb,setCmb]=useState(0);const [sprt,setSprt]=useState(false);
  const [lastSide,setLastSide]=useState(null);const [flash,setFlash]=useState(null);const [rivals,setRivals]=useState([]);
  const [paused,setPaused]=useState(false);const [over,setOver]=useState(false);const [isDnf,setIsDnf]=useState(false);
  const [splits,setSplits]=useState([]);const [trans,setTrans]=useState(0);const [world,setWorld]=useState(null);
  const [scrollX,setScrollX]=useState(0);const [nutPop,setNutPop]=useState(null);const [coins,setCoins]=useState(0);
  const [playerX,setPlayerX]=useState(100);

  const loopRef=useRef(null);const ltRef=useRef(null);const sRef=useRef({});const ptRef=useRef([]);

  useEffect(()=>{sRef.current={phase,dist,gt,nrg,hyd,caf,mor,pwr,cmb,sprt,paused,over,isDnf,trans,assist,rivals,splits,lastSide,world,scrollX,coins,playerX};});

  const startGame=useCallback(()=>{setPhase(0);setDist(0);setGt(0);setNrg(100);setHyd(100);setCaf(15);setMor(80);setPwr(0);setCmb(0);setSprt(false);setLastSide(null);setRivals(makeRivals());setPaused(false);setOver(false);setIsDnf(false);setSplits([]);setTrans(0);setScrollX(0);setCoins(0);setWorld(makeWorld(0));setPlayerX(100);setScreen("race");ltRef.current=null;ptRef.current=[];},[]);

  const eatItem=useCallback((type)=>{const it=PICKUPS[type];if(!it)return;setHyd(v=>Math.min(100,v+it.h));setNrg(v=>Math.min(100,v+it.e));setCaf(v=>Math.min(100,v+it.c));setMor(v=>Math.min(100,v+it.m));setCoins(v=>v+10);setNutPop(it);setTimeout(()=>setNutPop(null),900);if(type==="coffee"||type==="star")SFX.coffee();else SFX.pickup();},[]);

  useEffect(()=>{
    const kd=e=>{if(screen!=="race")return;const S=sRef.current;if(S.over||S.isDnf)return;if(e.key==="p"||e.key==="P"||e.key==="Escape"){setPaused(v=>!v);return;}if(S.paused)return;if(e.key===" "){e.preventDefault();setSprt(true);SFX.sprint();return;}
      // Nutrition keys 1-7
      const nutKeys={"1":"water","2":"gel","3":"banana","4":"caffgel","5":"coffee","6":"coke","7":"star"};
      if(nutKeys[e.key]){e.preventDefault();eatItem(nutKeys[e.key]);return;}
      let side=null;if(e.key==="ArrowLeft"||e.key==="a"||e.key==="A")side="L";if(e.key==="ArrowRight"||e.key==="d"||e.key==="D")side="R";if(side){e.preventDefault();const now=Date.now();ptRef.current.push(now);ptRef.current=ptRef.current.filter(x=>now-x<2000);if(S.lastSide===null||S.lastSide!==side){setCmb(v=>Math.min(v+1,30));const sndFn=[SFX.stroke,SFX.pedal,SFX.step][S.phase];if(Math.random()<0.3)sndFn();}else setCmb(v=>Math.max(0,v-3));setLastSide(side);setFlash(side);setTimeout(()=>setFlash(null),80);}};
    const ku=e=>{if(e.key===" ")setSprt(false);};
    window.addEventListener("keydown",kd);window.addEventListener("keyup",ku);
    return()=>{window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku);};
  },[screen]);

  useEffect(()=>{
    if(screen!=="race")return;
    const tick=ts=>{const S=sRef.current;if(S.paused||S.over||S.isDnf){ltRef.current=null;loopRef.current=requestAnimationFrame(tick);return;}if(!ltRef.current){ltRef.current=ts;loopRef.current=requestAnimationFrame(tick);return;}const dt=Math.min((ts-ltRef.current)/1000,0.1);ltRef.current=ts;if(S.trans>0){setTrans(v=>Math.max(0,v-dt));loopRef.current=requestAnimationFrame(tick);return;}
      const now=Date.now();const recent=ptRef.current.filter(x=>now-x<1500).length;const comboB=1+S.cmb*0.02;const cafB=1+S.caf*0.003;let tgt=clamp(recent/1.5/7*comboB*cafB,0,1);if(S.sprt)tgt=Math.min(1,tgt*1.4);const np=S.pwr+(tgt-S.pwr)*Math.min(1,dt*5);setPwr(np);if(recent<1)setCmb(v=>Math.max(0,v-dt*8));
      let spd=SPD_BASE[S.phase]*(0.05+np*0.95)*(1+S.caf*0.002);spd*=(0.3+0.7*(S.nrg/100))*(0.4+0.6*(S.hyd/100))*(0.85+0.15*(S.mor/100));spd*=SPD_MULT;
      const am=S.assist?0.35:1;setNrg(v=>clamp(v-(np*2.5+(S.sprt?2:0)+(S.phase===0?0.6:0.1))*am*dt+(np<0.2?1.5:0)*dt,0,100));setHyd(v=>clamp(v-(0.9+np*0.7)*am*dt,0,100));setCaf(v=>clamp(v-0.5*dt,0,100));if(S.hyd<25){setMor(v=>clamp(v-dt*3.5,0,100));if(S.hyd<15&&Math.random()<dt*0.5)SFX.warn();}if(S.nrg<20){setMor(v=>clamp(v-dt*2.5,0,100));if(S.nrg<10&&Math.random()<dt*0.5)SFX.warn();}
      const nd=S.dist+spd*dt;setDist(nd);setGt(v=>v+dt*20);
      const targetPX=60+np*160;setPlayerX(v=>v+(targetPX-v)*Math.min(1,dt*3));
      const phStart=S.phase>0?DISTS.slice(0,S.phase).reduce((a,b)=>a+b,0):0;const phProg=clamp((nd-phStart)/DISTS[S.phase],0,1);const ww=DISTS[S.phase]*WORLD_SCALE[S.phase];setScrollX(phProg*ww-S.playerX+100);
      // ?-blocks are visual aid station markers only — player uses keys 1-7 to eat
      
      let phEnd=0;for(let i=0;i<=S.phase;i++)phEnd+=DISTS[i];if(nd>=phEnd&&S.phase<2){setSplits(v=>[...v,S.gt+dt*20]);const nph=S.phase+1;setPhase(nph);setTrans(3);setNrg(v=>Math.min(100,v+10));setPwr(0);setCmb(0);ptRef.current=[];setScrollX(0);setPlayerX(100);setWorld(makeWorld(nph));SFX.transition();}
      if(nd>=TOTAL){setSplits(v=>[...v,S.gt+dt*20]);setOver(true);setScreen("results");SFX.finish();return;}if(S.nrg<=0&&!S.assist){setIsDnf(true);setScreen("results");SFX.bonk();return;}
      setRivals(prev=>prev.map(r=>{if(r.done)return r;let rp=r.ph,ra=0;for(let i=0;i<=rp;i++)ra+=DISTS[i];const rd=r.dist+SPD_BASE[rp]*r.sk*r.ef*SPD_MULT*(0.88+Math.random()*0.24)*dt;if(rd>=ra&&rp<2)rp++;if(rd>=TOTAL)return{...r,dist:TOTAL,ph:2,done:true,ft:r.ft||(S.gt+dt*20)};return{...r,dist:rd,ph:rp};}));
      loopRef.current=requestAnimationFrame(tick);};
    loopRef.current=requestAnimationFrame(tick);return()=>cancelAnimationFrame(loopRef.current);
  },[screen,eatItem]);

  const standings=useCallback(()=>{const me={id:-1,name:"YOU",dist,done:over,ft:over?gt:null};return[me,...rivals.map(r=>({id:r.id,name:r.name,dist:r.dist,done:r.done,ft:r.ft}))].sort((a,b)=>{if(a.done&&b.done)return a.ft-b.ft;if(a.done)return-1;if(b.done)return 1;return b.dist-a.dist;});},[dist,over,gt,rivals]);

  if(screen==="menu")return(
    <div style={{height:"100vh",background:"#1c1917",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"monospace",color:"white",padding:16}}>
      <div style={{textAlign:"center",maxWidth:360,width:"100%"}}>
        <div style={{background:"#dc2626",display:"inline-block",padding:"8px 20px",marginBottom:14,border:"3px solid #fbbf24"}}><div style={{fontSize:10,letterSpacing:3,color:"#fbbf24",fontWeight:900}}>★ IRONMAN 70.3 ★</div></div>
        <h1 style={{fontSize:28,margin:"0 0 4px",color:"#fbbf24",textShadow:"3px 3px 0 #92400e"}}>WEYMOUTH</h1>
        <div style={{fontSize:8,color:"#78716c",letterSpacing:2,marginBottom:20}}>JURASSIC COAST TRIATHLON</div>
        <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:16,fontSize:9,color:"#a8a29e"}}><span>🏊 1.2mi</span><span>🚴 56mi</span><span>🏃 13.1mi</span></div>
        <div style={{background:"#292524",border:"2px solid #44403c",padding:12,marginBottom:16,textAlign:"left"}}>
          <div style={{fontSize:9,color:"#fbbf24",marginBottom:6,textAlign:"center"}}>🎮 HOW TO PLAY</div>
          <div style={{fontSize:8,color:"#d6d3d1",lineHeight:2.2}}>
            <div>⬅ ➡ or A/D — Alternate to swim/pedal/run</div><div>SPACE hold — Sprint boost 🔥</div><div>1-7 — Take nutrition (water/gel/coffee...)</div><div>☕ Key 5 = CAFFEINE SUPER POWER!</div><div>P / ESC — Pause</div><div style={{color:"#fbbf24",marginTop:4}}>⚠ Watch your Endurance & Hydration!</div>
          </div>
        </div>
        <div style={{background:"#292524",border:"2px solid #44403c",padding:8,marginBottom:16,fontSize:7,color:"#a8a29e",textAlign:"center"}}><div style={{color:"#fbbf24",marginBottom:4}}>PROPORTIONAL RACE</div>Bike is 47× longer than swim • Run is 11× longer</div>
        <button onClick={startGame} style={{display:"block",width:"100%",padding:16,border:"3px solid #fbbf24",background:"#dc2626",color:"#fbbf24",cursor:"pointer",fontSize:12,fontFamily:"monospace",letterSpacing:2,fontWeight:900}} onMouseEnter={e=>e.currentTarget.style.background="#b91c1c"} onMouseLeave={e=>e.currentTarget.style.background="#dc2626"}>START RACE!</button>
        <label style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:10,fontSize:8,color:"#78716c",cursor:"pointer"}}><input type="checkbox" checked={assist} onChange={()=>setAssist(v=>!v)} style={{accentColor:"#22c55e"}} /> 🍄 EASY MODE</label>
      </div>
    </div>
  );

  if(screen==="results"){const st=standings(),pos=st.findIndex(s=>s.id===-1)+1,won=pos===1&&over;return(
    <div style={{height:"100vh",background:"#1c1917",display:"flex",flexDirection:"column",alignItems:"center",fontFamily:"monospace",color:"white",padding:16,overflow:"auto"}}>
      <div style={{marginTop:20,textAlign:"center",marginBottom:14}}>
        {isDnf?<><div style={{fontSize:36}}>💀</div><div style={{fontSize:14,color:"#ef4444",marginTop:6}}>GAME OVER</div><div style={{fontSize:8,color:"#78716c",marginTop:4}}>YOU BONKED!</div></>:won?<><div style={{fontSize:36}}>🏆</div><div style={{fontSize:14,color:"#fbbf24",marginTop:6,textShadow:"2px 2px 0 #92400e"}}>CHAMPION!</div></>:<><div style={{fontSize:36}}>🏁</div><div style={{fontSize:14,marginTop:6}}>FINISHED #{pos}</div></>}
      </div>
      <div style={{padding:"8px 28px",background:"#292524",border:"2px solid #44403c",marginBottom:12,textAlign:"center"}}><div style={{fontSize:20,color:"#fbbf24"}}>{timeFmt(gt)}</div><div style={{fontSize:7,color:"#78716c"}}>🪙 {coins}</div></div>
      {splits.length>0&&<div style={{display:"flex",gap:5,marginBottom:12}}>{splits.map((t2,i)=><div key={i} style={{padding:"5px 10px",background:"#292524",border:"2px solid #44403c",textAlign:"center"}}><div style={{fontSize:14}}>{ICON_E[i]}</div><div style={{fontSize:10,color:"#fbbf24"}}>{timeFmt(i===0?t2:t2-splits[i-1])}</div><div style={{fontSize:7,color:"#78716c"}}>{LABEL[i]}</div></div>)}</div>}
      <div style={{width:"100%",maxWidth:300,background:"#292524",border:"2px solid #44403c",padding:8,marginBottom:12}}>{st.slice(0,8).map((s,i)=><div key={s.id} style={{display:"flex",gap:4,fontSize:8,padding:"2px 3px",background:s.id===-1?"#fbbf2412":"transparent"}}><span style={{width:14,color:i===0?"#fbbf24":"#78716c"}}>{i+1}.</span><span style={{flex:1,color:s.id===-1?"#fbbf24":"#d6d3d1"}}>{s.name}</span><span style={{color:"#78716c"}}>{s.done?timeFmt(s.ft):distFmt(s.dist)}</span></div>)}</div>
      <button onClick={()=>setScreen("menu")} style={{padding:"12px 24px",border:"3px solid #fbbf24",background:"#dc2626",color:"#fbbf24",cursor:"pointer",fontSize:9,fontFamily:"monospace",fontWeight:900}}>PLAY AGAIN</button>
    </div>
  );}

  const phStart=phase>0?DISTS.slice(0,phase).reduce((a,b)=>a+b,0):0;const pos=rivals.filter(r=>r.dist>dist).length+1;
  return(
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:"#1c1917",fontFamily:"monospace",color:"white",overflow:"hidden",position:"relative"}}>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.4}} @keyframes popUp{from{transform:translateY(-15px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      {trans>0&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.92)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:50}}><div style={{fontSize:48}}>{ICON_E[phase]}</div><div style={{fontSize:14,color:"#fbbf24",marginTop:8,textShadow:"2px 2px 0 #92400e"}}>WORLD {phase+1}: {LABEL[phase]}</div><div style={{fontSize:10,color:"#a8a29e",marginTop:4}}>{distFmt(DISTS[phase])}</div><div style={{fontSize:36,color:"#fbbf24",marginTop:12}}>{Math.ceil(trans)}</div><div style={{fontSize:8,color:"#78716c",marginTop:8}}>Alternate ⬅ ➡ to go!</div></div>}
      {paused&&trans<=0&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.85)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:50}}><div style={{fontSize:14,color:"#fbbf24",animation:"blink 1s infinite"}}>PAUSED</div><div style={{display:"flex",gap:8,marginTop:12}}><button onClick={()=>setPaused(false)} style={{padding:"8px 16px",border:"2px solid #fbbf24",background:"#dc2626",color:"#fbbf24",cursor:"pointer",fontSize:8,fontFamily:"monospace"}}>RESUME</button><button onClick={()=>setScreen("menu")} style={{padding:"8px 16px",border:"2px solid #78716c",background:"#292524",color:"#a8a29e",cursor:"pointer",fontSize:8,fontFamily:"monospace"}}>QUIT</button></div></div>}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"3px 8px",background:"#0a0a0a",borderBottom:`2px solid ${PCOL[phase]}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{background:"#dc2626",padding:"1px 5px",fontSize:6,fontWeight:900,letterSpacing:2,border:"1px solid #fbbf24"}}>IM</div><span style={{fontSize:9,color:PCOL[phase]}}>{ICON_E[phase]} {LABEL[phase]}</span></div>
        <div style={{fontSize:11,color:"#fbbf24"}}>{timeFmt(gt)}</div>
        <div style={{display:"flex",gap:8,fontSize:8}}><span style={{color:pos<=3?"#fbbf24":"#a8a29e"}}>P{pos}</span><span style={{color:"#a8a29e"}}>🪙{coins}</span></div>
        <button onClick={()=>setPaused(v=>!v)} style={{padding:"1px 7px",border:"1px solid #44403c",background:"#292524",color:"#a8a29e",cursor:"pointer",fontSize:8,fontFamily:"monospace"}}>II</button>
      </div>
      <div style={{flex:"1 1 50%",minHeight:100,padding:"2px 4px 0",flexShrink:0}}><div style={{width:"100%",height:"100%",border:`2px solid ${PCOL[phase]}44`,overflow:"hidden"}}><GameCanvas ph={phase} scroll={scrollX} pwr={pwr} caff={caf} world={world} isSprint={sprt} playerScreenX={playerX} /></div></div>
      {nutPop&&<div style={{position:"absolute",top:"42%",left:"50%",transform:"translateX(-50%)",zIndex:40,animation:"popUp .2s ease",background:"#292524",border:"2px solid #fbbf24",padding:"5px 12px",textAlign:"center"}}><span style={{fontSize:16}}>{nutPop.icon}</span><span style={{fontSize:9,color:"#fbbf24",marginLeft:6}}>{nutPop.nm}</span></div>}
      <div style={{flex:"1 1 auto",minHeight:0,padding:"3px 6px 4px",display:"flex",flexDirection:"column",gap:3,overflow:"auto"}}>
        <div style={{background:"#292524",border:"2px solid #44403c",padding:"4px 6px"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:7,color:"#78716c"}}>⚡POWER</span><span style={{fontSize:8,color:pwr>0.7?"#ef4444":pwr>0.4?"#fbbf24":"#78716c"}}>{pwr<0.1?"...":pwr<0.3?"SLOW":pwr<0.6?"GO!":pwr<0.85?"FAST!":"MAX!!"}{sprt?" 🔥":""}</span></div><div style={{height:8,background:"#1c1917",border:"1px solid #44403c",overflow:"hidden"}}><div style={{height:"100%",width:`${pwr*100}%`,background:pwr>0.7?"#ef4444":pwr>0.4?"#fbbf24":"#22c55e",transition:"width .15s"}}/></div><div style={{display:"flex",gap:1,marginTop:2}}>{Array.from({length:15},(_,i)=><div key={i} style={{flex:1,height:3,background:i<Math.floor(cmb/2)?"#fbbf24":"#44403c"}}/>)}</div></div>
        <div style={{display:"flex",gap:4,justifyContent:"center",padding:"2px 0"}}>
          {[["⬅","L","ArrowLeft"],["➡","R","ArrowRight"]].map(([ic,side,key])=><div key={side} onClick={()=>window.dispatchEvent(new KeyboardEvent("keydown",{key}))} style={{width:48,height:40,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,background:flash===side?"#dc2626":"#292524",border:flash===side?"3px solid #fbbf24":"3px solid #44403c",color:flash===side?"#fbbf24":"#78716c",cursor:"pointer",userSelect:"none",transition:"all .05s"}}>{ic}</div>)}
          <div style={{textAlign:"center",width:38,display:"flex",flexDirection:"column",justifyContent:"center"}}><div style={{fontSize:7,color:pwr>0.3?PCOL[phase]:"#44403c",animation:pwr>0.3?"blink .6s infinite":"none"}}>{["STROKE","PEDAL","RUN"][phase]}!</div></div>
          <div onMouseDown={()=>setSprt(true)} onMouseUp={()=>setSprt(false)} onMouseLeave={()=>setSprt(false)} onTouchStart={e=>{e.preventDefault();setSprt(true);}} onTouchEnd={()=>setSprt(false)} style={{height:40,padding:"0 12px",display:"flex",alignItems:"center",fontSize:8,background:sprt?"#f59e0b":"#292524",border:sprt?"3px solid #fbbf24":"3px solid #44403c",color:sprt?"#1c1917":"#78716c",cursor:"pointer",userSelect:"none",fontWeight:900}}>🔥SPRINT</div>
        </div>
        <div style={{display:"flex",gap:3}}>
          <div style={{flex:1,background:"#292524",border:"2px solid #44403c",padding:"3px 6px"}}><SB v={nrg} mx={100} c={nrg<25?"#ef4444":"#22c55e"} lbl=" Endurance" ic="💪" /><SB v={hyd} mx={100} c={hyd<25?"#ef4444":"#38bdf8"} lbl=" Hydration" ic="💧" /><SB v={caf} mx={100} c="#f59e0b" lbl=" Caffeine" ic="☕" /><SB v={mor} mx={100} c="#a855f7" lbl=" Morale" ic="⭐" /></div>
          <div style={{width:55,background:"#292524",border:"2px solid #44403c",padding:"3px 4px",textAlign:"center",display:"flex",flexDirection:"column",justifyContent:"center"}}><div style={{fontSize:14,color:PCOL[phase]}}>{(pwr*[2.1,28,8.5][phase]).toFixed(0)}</div><div style={{fontSize:6,color:"#78716c"}}>MPH</div><div style={{borderTop:"1px solid #44403c",marginTop:2,paddingTop:2}}><div style={{fontSize:7,color:"#a8a29e"}}>{distFmt(dist-phStart)}</div></div></div>
        </div>
        {/* NUTRITION - press 1-7 to consume */}
        <div style={{background:"#292524",border:"2px solid #44403c",padding:"3px 4px",flexShrink:0}}>
          <div style={{fontSize:6,color:"#78716c",textAlign:"center",marginBottom:2}}>NUTRITION (press 1-7)</div>
          <div style={{display:"flex",gap:2,justifyContent:"center"}}>
            {[["1","💧","water"],["2","🟡","gel"],["3","🍌","banana"],["4","🟠","caffgel"],["5","☕","coffee"],["6","🥤","coke"],["7","⭐","star"]].map(([k,ic,type])=>(
              <div key={k} onClick={()=>{eatItem(type);SFX.select();}} style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"2px 4px",background:"#1c1917",border:"1px solid #44403c",cursor:"pointer",minWidth:28,userSelect:"none"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor="#fbbf24"} onMouseLeave={e=>e.currentTarget.style.borderColor="#44403c"}>
                <span style={{fontSize:10}}>{ic}</span>
                <span style={{fontSize:6,color:"#fbbf24"}}>{k}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{height:8,background:"#292524",border:"2px solid #44403c",overflow:"hidden",flexShrink:0}}><div style={{height:"100%",width:`${clamp(dist/TOTAL*100,0,100)}%`,background:"linear-gradient(90deg,#0ea5e9,#22c55e,#ef4444)",transition:"width .3s"}}/></div>
        <div style={{background:"#292524",border:"2px solid #44403c",padding:"2px 6px",flexShrink:0}}>{standings().slice(0,4).map((s,i)=><div key={s.id} style={{display:"flex",gap:3,fontSize:7,padding:"1px 0",color:s.id===-1?"#fbbf24":"#a8a29e"}}><span style={{width:10,color:i===0?"#fbbf24":"#78716c"}}>{i+1}</span><span style={{flex:1}}>{s.name}</span><span style={{color:"#78716c"}}>{distFmt(s.dist)}</span></div>)}</div>
      </div>
    </div>
  );
}
