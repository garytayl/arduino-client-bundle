const views=[...document.querySelectorAll('.view')];
let current='home',lastChapter=null;
function navigate(initial=false){
  const id=location.hash.slice(1)||'home';
  // The skip link focuses main without changing the current chapter.
  if(id==='main'){document.querySelector('#main').setAttribute('tabindex','-1');document.querySelector('#main').focus();return;}
  const target=views.find(view=>view.id===id);
  if(!target){history.replaceState(null,'','#home');return navigate(initial);}
  if(current==='home'&&id!=='home')lastChapter=document.querySelector(`.chapter[href="#${id}"]`);
  views.forEach(view=>view.hidden=view!==target);
  current=id;
  document.title=id==='home'?'Yvel’s Staircase — Project Library':`${target.querySelector('h1').textContent} — Staircase`;
  document.querySelector('.nav-home').setAttribute('aria-current',id==='home'?'page':'false');
  window.scrollTo({top:0,behavior:'instant'});
  if(!initial){if(id==='home'&&lastChapter)lastChapter.focus({preventScroll:true});else target.querySelector('h1').focus({preventScroll:true});}
}
document.querySelector('#home-title').setAttribute('tabindex','-1');
window.addEventListener('hashchange',()=>navigate());
navigate(true);
document.addEventListener('keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey)return;
  if(event.key==='Escape'&&current!=='home'){location.hash='home';return;}
  const tiles=[...document.querySelectorAll('.chapter')];
  const index=tiles.indexOf(document.activeElement);
  if(index<0)return;
  const columns=matchMedia('(max-width:760px)').matches?2:4;
  const delta={ArrowRight:1,ArrowLeft:-1,ArrowDown:columns,ArrowUp:-columns}[event.key];
  if(delta!==undefined){event.preventDefault();tiles[(index+delta+tiles.length)%tiles.length].focus();}
});

// Adapted safe patterns from LayerLane's ParticleCanvas / BrandParticleField:
// isolated, pointer-transparent backdrop; capped pixel density; subtle layered drift.
// Canvas 2D keeps this static library independent of the React/WebGL app.
const canvas=document.querySelector('#starfield'),ctx=canvas.getContext('2d');
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const toggle=document.querySelector('#motion');
let manualPause=false,frame=0,last=0,time=0,width=0,height=0,stars=[];
const metrics={frames:0,drawMs:[],starCount:0,paused:false};
// Read-only diagnostic for performance checks; contains no project or user data.
window.stairfieldMetrics=metrics;
function resize(){
  width=innerWidth;height=innerHeight;
  const dpr=Math.min(devicePixelRatio||1,1.5);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  ctx?.setTransform(dpr,0,0,dpr,0,0);
  let seed=1387;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  stars=Array.from({length:Math.min(200,Math.max(65,Math.round(width*height/6500)))},()=>({x:random()*width,y:random()*height,r:.35+random()*1.15,depth:.3+random()*.7,phase:random()*6.28}));
  metrics.starCount=stars.length;draw();
}
function draw(){
  if(!ctx)return;
  const start=performance.now();ctx.clearRect(0,0,width,height);
  for(const star of stars){
    const y=((star.y-time*star.depth*2)%height+height)%height;
    const x=star.x+Math.sin(time*.07+star.phase)*3*star.depth;
    const alpha=.25+(.5+.5*Math.sin(time*.4+star.phase))*.5;
    ctx.fillStyle=`rgba(207,178,255,${alpha})`;ctx.beginPath();ctx.arc(x,y,star.r,0,Math.PI*2);ctx.fill();
  }
  metrics.frames++;metrics.drawMs.push(performance.now()-start);if(metrics.drawMs.length>180)metrics.drawMs.shift();
}
function tick(now){
  frame=0;
  if(now-last>=1000/30){time+=Math.min((now-last)/1000,.1);last=now;draw();}
  if(!manualPause&&!motion.matches&&!document.hidden&&ctx)frame=requestAnimationFrame(tick);
}
function sync(){
  cancelAnimationFrame(frame);frame=0;last=performance.now();
  const paused=manualPause||motion.matches;
  metrics.paused=paused||document.hidden;
  document.body.classList.toggle('motion-paused',paused);
  toggle.setAttribute('aria-pressed',String(paused));
  toggle.setAttribute('aria-label',motion.matches?'Animation disabled by reduced motion preference':paused?'Resume ambient animation':'Pause ambient animation');
  toggle.querySelector('#motion-symbol').textContent=paused?'▷':'Ⅱ';
  if(!paused&&!document.hidden&&ctx)frame=requestAnimationFrame(tick);
  else draw();
}
toggle.addEventListener('click',()=>{manualPause=!manualPause;sync();});
motion.addEventListener('change',sync);
document.addEventListener('visibilitychange',sync);
let resizeFrame=0;window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(resize);},{passive:true});
resize();sync();

for(const input of document.querySelectorAll('[data-check]')){
 const key='stairs-visit-'+input.dataset.check;
 try{input.checked=localStorage.getItem(key)==='true';}catch{}
 input.addEventListener('change',()=>{try{localStorage.setItem(key,String(input.checked));}catch{}});
}
