const cards=[...document.querySelectorAll('.concept-card')];
const byId=new Map(cards.map(card=>[card.dataset.id,card]));
const toolbar=document.querySelector('.concept-toolbar');
const filters=[...document.querySelectorAll('[data-filter]')];
const earlier=document.querySelector('#earlier-concepts');
const dialog=document.querySelector('#concept-lightbox');
const largeImage=document.querySelector('#lightbox-image');
let category='all',activeId=null,returnFocus=null;

function applyFilter(value,{updateUrl=false}={}){
  category=filters.some(button=>button.dataset.filter===value)?value:'all';
  for(const card of cards)card.hidden=category!=='all'&&card.dataset.category!==category;
  for(const button of filters)button.setAttribute('aria-pressed',String(button.dataset.filter===category));
  const current=cards.filter(card=>!card.hidden&&card.dataset.series==='current').length;
  const old=cards.filter(card=>!card.hidden&&card.dataset.series==='earlier').length;
  document.querySelector('.concept-count').textContent=`${current} current concept${current===1?'':'s'}${earlier.open?` · ${old} earlier matching`:''}`;
  document.querySelector('#concept-empty').hidden=current!==0;
  document.querySelector('#earlier-empty').hidden=old!==0;
  if(updateUrl){const url=new URL(location.href);if(category==='all')url.searchParams.delete('category');else url.searchParams.set('category',category);history.replaceState(history.state,'',url);}
}

function navigationCards(){return cards.filter(card=>!card.hidden&&(card.dataset.series==='current'||earlier.open));}

function showImage(id,{historyMode='none',origin=null}={}){
  const card=byId.get(id);if(!card)return;
  if(card.hidden)applyFilter('all',{updateUrl:true});
  if(card.dataset.series==='earlier')earlier.open=true;
  if(origin)returnFocus=origin;
  if(!returnFocus)returnFocus=card.querySelector('.concept-zoom');
  activeId=id;
  const title=card.querySelector('h2').textContent;
  document.querySelector('#lightbox-title').textContent=title;
  document.querySelector('#lightbox-caption').textContent=card.querySelector('.concept-caption').textContent;
  document.querySelector('#lightbox-series').textContent=card.dataset.series==='earlier'?'EARLIER / ILLUSTRATIVE CONCEPT':'EXPANDED SET / ILLUSTRATIVE CONCEPT';
  largeImage.alt=card.querySelector('img').alt;
  largeImage.src=card.querySelector('.concept-zoom').href;
  const list=navigationCards(),index=list.indexOf(card);
  document.querySelector('#lightbox-position').textContent=`${index+1} / ${list.length}`;
  if(historyMode!=='none'){
    const url=new URL(location.href);url.hash='concept='+encodeURIComponent(id);
    if(historyMode==='push')history.pushState({...history.state,conceptLightbox:true},'',url);
    else history.replaceState(history.state,'',url);
  }
  if(!dialog.open){dialog.showModal();document.body.classList.add('concept-open');}
}

function syncLocation(){
  applyFilter(new URL(location.href).searchParams.get('category')||'all');
  const id=new URLSearchParams(location.hash.slice(1)).get('concept');
  if(id&&byId.has(id))showImage(id);
  else if(dialog.open)dialog.close();
}

function closeImage(){
  if(history.state?.conceptLightbox){history.back();}
  else{const url=new URL(location.href);url.hash='';history.replaceState(history.state,'',url);syncLocation();}
}

function stepImage(delta){
  const list=navigationCards(),index=list.findIndex(card=>card.dataset.id===activeId);
  if(list.length)showImage(list[(index+delta+list.length)%list.length].dataset.id,{historyMode:'replace'});
}

for(const card of cards){const anchor=card.querySelector('.concept-zoom');anchor.addEventListener('click',event=>{
  if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();showImage(card.dataset.id,{historyMode:'push',origin:anchor});
});}
for(const button of filters)button.addEventListener('click',()=>applyFilter(button.dataset.filter,{updateUrl:true}));
earlier.addEventListener('toggle',()=>applyFilter(category));
document.querySelector('.lightbox-close').addEventListener('click',closeImage);
document.querySelector('#lightbox-previous').addEventListener('click',()=>stepImage(-1));
document.querySelector('#lightbox-next').addEventListener('click',()=>stepImage(1));
dialog.addEventListener('cancel',event=>{event.preventDefault();closeImage();});
dialog.addEventListener('click',event=>{if(event.target===dialog)closeImage();});
dialog.addEventListener('keydown',event=>{
  if(event.key==='Tab'&&!event.ctrlKey&&!event.metaKey){
    const controls=[...dialog.querySelectorAll('button:not([disabled]),a[href]')];
    const index=controls.indexOf(document.activeElement);
    if(controls.length){event.preventDefault();controls[(index+(event.shiftKey?-1:1)+controls.length)%controls.length].focus();}
  }
  if(event.key==='ArrowLeft'){event.preventDefault();stepImage(-1);}
  if(event.key==='ArrowRight'){event.preventDefault();stepImage(1);}
});
dialog.addEventListener('close',()=>{document.body.classList.remove('concept-open');activeId=null;returnFocus?.focus({preventScroll:true});returnFocus=null;});
window.addEventListener('popstate',syncLocation);
window.addEventListener('hashchange',syncLocation);
toolbar.hidden=false;
syncLocation();
