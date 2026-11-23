'use strict';
const $=id=>document.getElementById(id);
const locale=(()=>{const params=new URLSearchParams(location.search), requested=params.get('lang');if(['en','pt','es'].includes(requested))return requested;try{const saved=localStorage.getItem('ancestry-language-v1');if(['en','pt','es'].includes(saved))return saved;}catch{}return 'pt';})();
const t=(key,values={})=>Object.entries(values).reduce((s,[k,v])=>s.replace('{'+k+'}',v),ANCESTRY_STRINGS[key][{pt:0,en:1,es:2}[locale]]);
document.documentElement.lang=locale==='pt'?'pt-BR':locale;
document.title=t('title');
document.querySelector('meta[name=description]').content=t('desc');
document.querySelectorAll('[data-t]').forEach(el=>el.textContent=t(el.dataset.t));
document.querySelectorAll('[data-aria]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.aria)));
document.querySelectorAll('[data-hint]').forEach(el=>el.placeholder=t(el.dataset.hint));
document.querySelector('.masthead .brand').href='/?lang='+locale;
$('wellbeing-return').href='/?lang='+locale+'#wellbeing';
$('ancestry-lang').value=locale;
$('ancestry-lang').addEventListener('change',event=>{
 const next=event.target.value;
 try{localStorage.setItem('ancestry-language-v1',next);}catch{}
 const url=new URL(location.href);url.searchParams.set('lang',next);
 location.assign(url);
});
const tree=$('tree'), dialog=$('editor'), form=$('entry');
const storageKey='ancestry-family-notebook-v1';
const svgNS='http://www.w3.org/2000/svg';
const fieldIds={name:'person-name',traits:'traits',memory:'memory',traditions:'traditions',recognition:'recognition'};
const entries=[
 ['self',t('self'),'self',null,2,2],
 ['mother',t('mother'),'parent','self',1,2,'mother'],
 ['father',t('father'),'parent','self',3,2,'father'],
 ['mm',t('mm'),'grandparent','mother',1,1,'mother'],
 ['mf',t('mf'),'grandparent','mother',2,1,'mother'],
 ['fm',t('fm'),'grandparent','father',3,1,'father'],
 ['ff',t('ff'),'grandparent','father',4,1,'father'],
];
for(const [id,role,, ,col, ,side] of entries.slice(3)){
 const person=role.toLocaleLowerCase(locale);
 const of=(relation)=>locale==='pt'?(relation==='motherOf'?'Mãe ':'Pai ')+(id.endsWith('m')?'da ':'do ')+person:t(relation,{person});
 entries.push([id+'m',t('greatmother'),'greatgrandparent',id,col<=2?1:3,1,side,of('motherOf')],
              [id+'f',t('greatfather'),'greatgrandparent',id,col<=2?2:4,1,side,of('fatherOf')]);
}
const people=new Map(entries.map(([id,role,level,parent,col,span,side,note])=>[id,{id,role,level,parent,col,span,side,note}]));
const scopes={mother:null,father:null};
let records={};
try{
 const stored=JSON.parse(localStorage.getItem(storageKey)||'{}');
 if(stored&&typeof stored==='object'&&!Array.isArray(stored)) records=stored;
}catch{}
let active=null, returnFocus=null, edges;
const nodes=new Map();
function el(tag,cls,txt){
 const node=document.createElement(tag);
 if(cls) node.className=cls;
 if(txt) node.textContent=txt;
 return node;
}
const geo=typeof ANCESTRY_GEO==='undefined'?{outlines:'',places:[]}:ANCESTRY_GEO;
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const labelCity=p=>p[0]+', '+p[1];
const cityAliases=new Map(), cityExact=new Map();
for(const city of geo.places){
 const countries=[city[1],...({
  Brazil:['Brasil'],Portugal:['Portugal'],'United States of America':['United States','Estados Unidos','EUA','USA','US'],Spain:['España','Espanha'],Mexico:['México'],Germany:['Alemanha','Alemania'],France:['França','Francia'],Italy:['Itália','Italia'],Japan:['Japão','Japón'],Colombia:['Colômbia'],Argentina:['Argentina']
 }[city[1]]||[])];
 for(const country of new Set(countries))for(const cityName of new Set([city[0],city[4]].filter(Boolean))) cityExact.set(normalize(cityName+', '+country),city);
 if(city[5])cityExact.set(normalize(city[0]+', '+city[5]),city);
 for(const alias of new Set([city[0],city[4]].filter(Boolean).map(normalize))){
  const matches=cityAliases.get(alias)||[];
  matches.push(city);
  cityAliases.set(alias,matches);
 }
}
const cityOptions=document.createDocumentFragment();
for(const city of geo.places){
 const option=el('option');
 option.value=labelCity(city);
 cityOptions.append(option);
}
$('city-suggestions').append(cityOptions);
let draftPlaces=[], editingPin=null;
const precision=n=>Math.round(n*4)/4;
function lookupPlace(name){
 const key=normalize(name);
 const exact=cityExact.get(key);
 if(exact)return [exact[2],exact[3]];
 const alias={lisboa:'lisbon','nova york':'new york','nueva york':'new york','londres':'london','roma':'rome'}[key]||key;
 const matches=cityAliases.get(alias);
 return matches?.length===1?[matches[0][2],matches[0][3]]:null;
}
function validPoint(x){return Array.isArray(x)&&x.length===2&&x.every(Number.isFinite)&&Math.abs(x[0])<=88&&Math.abs(x[1])<=180}
function project([lat,lon]){return [(lon+180)*2.5,(88-lat)*2.5]}
function graphic(tag,attrs={}){
 const e=document.createElementNS(svgNS,tag);
 for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));
 return e;
}
function baseMap(label){
 const svg=graphic('svg',{viewBox:'0 0 900 440',class:'geography',role:'img','aria-label':label});
 if(geo.outlines)svg.append(graphic('path',{d:geo.outlines,class:'world-outline'}));
 return svg;
}
function openPin(place,error,trigger){
 const host=$('pin-editor');host.replaceChildren();
 if(!place.name.trim()){error.textContent=t('manualRequire');return;}
 error.textContent='';
 host.hidden=false;editingPin=place;
 host.append(el('p','pin-instruction',t('manualIntro')));
 const svg=baseMap(t('manualMap'));
 svg.setAttribute('tabindex','0');
 const current=validPoint(place.pin)?place.pin:lookupPlace(place.name)||[0,0];
 let [x,y]=project(current);
 const cross=graphic('circle',{cx:x,cy:y,r:8,class:'map-pin-cursor'});
 svg.append(cross);
 function closePicker(){host.hidden=true;host.replaceChildren();editingPin=null;trigger.focus({preventScroll:true});}
 function addPin(){
  place.pin=[precision(88-y/2.5),precision(x/2.5-180)];
  error.textContent=t('manualSet');closePicker();
 }
 svg.addEventListener('click',event=>{
  const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse());
  if(point.x<0||point.x>900||point.y<0||point.y>440)return;
  x=point.x;y=point.y;addPin();
 });
 svg.addEventListener('keydown',event=>{
  const moves={ArrowLeft:[-5,0],ArrowRight:[5,0],ArrowUp:[0,-5],ArrowDown:[0,5]};
  if(moves[event.key]){
   event.preventDefault();const [dx,dy]=moves[event.key];
   x=Math.max(0,Math.min(900,x+dx));y=Math.max(0,Math.min(440,y+dy));
   cross.setAttribute('cx',x);cross.setAttribute('cy',y);
  }else if(event.key==='Enter'||event.key===' '){event.preventDefault();addPin();}
  else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closePicker();}
 });
 host.append(svg);
 const close=el('button','secondary',t('manualClose'));close.type='button';close.addEventListener('click',closePicker);host.append(close);
 host.scrollIntoView({block:'nearest'});svg.focus({preventScroll:true});
}
function renderPlaceEditor(){
 const target=$('places-editor'),picker=$('pin-editor');target.replaceChildren();picker.hidden=true;picker.replaceChildren();editingPin=null;
 draftPlaces.forEach((place,index)=>{
  const row=el('div','place-edit-row');
  const label=el('label','',t(place.kind));label.htmlFor='ancestry-place-'+index;
  const input=el('input');input.id=label.htmlFor;input.placeholder=t('hintPlace');input.maxLength=90;input.autocomplete='off';input.setAttribute('list','city-suggestions');input.value=place.name;
  const information=el('p','place-info',validPoint(place.pin)?t('manualSet'):'');information.setAttribute('role','status');
  input.addEventListener('input',()=>{
   if(place.name!==input.value){delete place.pin;information.textContent='';}
   place.name=input.value;
   if(editingPin===place){picker.hidden=true;picker.replaceChildren();editingPin=null;}
  });
  const controls=el('div','place-controls');
  const pin=el('button','secondary',t('manual'));pin.type='button';pin.addEventListener('click',()=>openPin(place,information,pin));controls.append(pin);
  if(place.kind==='past'&&draftPlaces.filter(x=>x.kind==='past').length>1){
   const remove=el('button','secondary',t('removed'));remove.type='button';remove.addEventListener('click',()=>{draftPlaces.splice(index,1);renderPlaceEditor();$('new-past').focus();});controls.append(remove);
  }
  row.append(label,input,controls,information);target.append(row);
 });
 $('new-past').disabled=draftPlaces.filter(x=>x.kind==='past').length>=8;
}
$('new-past').addEventListener('click',()=>{
 const index=draftPlaces.length-1;
 draftPlaces.splice(index,0,{kind:'past',name:''});renderPlaceEditor();$('ancestry-place-'+index).focus();
});
function loadPlaces(places){
 const stored=Array.isArray(places)?places:[];
 return ['birth','past','current'].flatMap(kind=>{
  const matching=stored.filter(x=>x?.kind===kind&&typeof x.name==='string').slice(0,kind==='past'?8:1);
  return matching.length?matching.map(x=>({kind,name:x.name,pin:validPoint(x.pin)?[...x.pin]:undefined})):[{kind,name:''}];
 });
}
function collectPlaces(){
 return draftPlaces.filter(p=>p.name.trim()).map(({name,kind,pin})=>validPoint(pin)?{name:name.trim(),kind,pin}:{name:name.trim(),kind});
}
function recordPlaces(rec){return Array.isArray(rec?.places)?rec.places.filter(p=>p&&['birth','past','current'].includes(p.kind)&&typeof p.name==='string'&&p.name):[]}
function renderGeography(){
 const host=$('places-result');host.replaceChildren();
 const families=[...people.values()].map(person=>({person,rec:records[person.id],places:recordPlaces(records[person.id])})).filter(x=>x.places.length);
 host.append(el('h3','',t('mapTitle')));
 if(!families.length){host.append(el('p','',t('mapEmpty')));return;}
 host.append(el('p','',t('mapDesc')));
 const svg=baseMap(t('mapImage'));
 const lists=el('ul','places-list');lists.setAttribute('aria-label',t('placeList'));
 const points=[];
 for(const {person,rec,places} of families){
  const name=rec.name?rec.name+' · '+person.role:person.role;
  const who=el('li','place-person');who.append(el('strong','',name));
  const details=el('ul','');
  let previous=null;
  const cls=person.side||'self';
  for(const place of places){
   const found=validPoint(place.pin)?place.pin:lookupPlace(place.name);
   details.append(el('li','',t(place.kind)+': '+place.name+(found?'':' ('+t('noPin')+')')));
   if(!found){previous=null;continue;}
   const [x,y]=project(found);
   if(previous&&Math.abs(x-previous[0])<450){
    const [oldX,oldY]=previous;
    svg.append(graphic('line',{x1:oldX,y1:oldY,x2:x,y2:y,class:'geo-line '+cls}));
   }else if(previous){
    const [oldX,oldY]=previous, forward=oldX>x, off=forward?900:0, toward=forward?x+900:x-900;
    const edgeY=toward===oldX?y:oldY+(y-oldY)*(off-oldX)/(toward-oldX);
    svg.append(graphic('line',{x1:oldX,y1:oldY,x2:off,y2:edgeY,class:'geo-line '+cls}),
               graphic('line',{x1:900-off,y1:edgeY,x2:x,y2:y,class:'geo-line '+cls}));
   }
   previous=[x,y];
   const marker=graphic('circle',{cx:x,cy:y,r:5,class:'geo-dot '+cls});
   const title=graphic('title');title.textContent=name+' · '+t(place.kind)+': '+place.name;marker.append(title);points.push(marker);
  }
  who.append(details);lists.append(who);
 }
 svg.append(...points);
 if(points.length)host.append(svg,el('p','source-note',t('source')));
 host.append(lists);
}

function rowButton(person){
 const {id,role,level,col,span,side,note}=person;
 const record=records[id]||{};
 const node=el('div',['node',level,side].filter(Boolean).join(' '));
 node.style.gridColumn=col+' / span '+span;
 const button=el('button','person');
 button.type='button';
 button.dataset.person=id;
 button.setAttribute('aria-label',note?role+', '+note:record.name?role+': '+record.name:role);
 button.append(el('span','',record.name||role));
 if(record.name) button.append(el('span','detail',role));
 if(record.traits) button.append(el('span','detail trait',record.traits));
 button.addEventListener('click',()=>openEditor(id,button));
 node.append(button);
 if(level==='grandparent'){
  const isOpen=scopes[side]===id;
  const toggle=el('button','expand');
  toggle.type='button';
  toggle.setAttribute('aria-expanded',String(isOpen));
  toggle.setAttribute('aria-label',t(isOpen?'closeBranch':'openBranch',{person:role.toLocaleLowerCase(locale)}));
  const mark=el('span','',isOpen?'−':'+');
  mark.setAttribute('aria-hidden','true');
  toggle.append(mark);
  toggle.addEventListener('click',()=>{
   scopes[side]=isOpen?null:id;
   renderTree();
   nodes.get(id).toggle.focus({preventScroll:true});
   const child=nodes.get(id+'m');
   if(child&&child.button.getBoundingClientRect().bottom>innerHeight-10){
    child.button.scrollIntoView({block:'nearest'});
   }
  });
  node.append(toggle);
  nodes.set(id,{button,toggle});
 }else nodes.set(id,{button});
 return node;
}
function renderTree(){
 nodes.clear();
 tree.replaceChildren();
 edges=document.createElementNS(svgNS,'svg');
 edges.classList.add('edges');
 edges.setAttribute('aria-hidden','true');
 tree.append(edges);
 for(const p of people.values()){
  if(p.level==='greatgrandparent'&&scopes[p.side]!==p.parent) continue;
  tree.append(rowButton(p));
 }
 const total=Object.keys(records).filter(id=>people.has(id)).length;
 $('count').textContent=total===0?t('zero'):total===1?t('one'):t('count',{n:total});
 $('tip').textContent=t(Object.values(scopes).some(Boolean)?'tipOpen':'tip');
 requestAnimationFrame(drawEdges);
}
function drawEdges(){
 if(!edges||tree.hidden||!tree.offsetWidth) return;
 const box=tree.getBoundingClientRect();
 edges.replaceChildren();
 for(const [id,item] of nodes){
  const p=people.get(id);
  if(!p.parent) continue;
  const parent=nodes.get(p.parent);
  const a=(p.level==='greatgrandparent'?parent.toggle:parent.button).getBoundingClientRect();
  const b=item.button.getBoundingClientRect();
  const x=a.left+a.width/2-box.left,y=a.bottom-box.top;
  const x2=b.left+b.width/2-box.left,y2=b.top-box.top,mid=(y+y2)/2;
  const line=document.createElementNS(svgNS,'path');
  line.classList.add(p.side);
  line.setAttribute('d','M '+x+' '+y+' C '+x+' '+mid+', '+x2+' '+mid+', '+x2+' '+y2);
  edges.append(line);
 }
}
if('ResizeObserver' in window) new ResizeObserver(drawEdges).observe(tree);
window.addEventListener('resize',drawEdges);
function openEditor(id,trigger){
 const p=people.get(id);
 const rec=records[id]||{};
 active=id;
 returnFocus=trigger;
 $('save-error').hidden=true;
 $('editor-title').textContent=p.note?p.role+' · '+p.note:p.role;
 $('prompt').textContent=id==='self'?t('promptSelf'):t('promptPerson');
 $('person-name').placeholder=id==='self'?t('nameSelf'):t('namePerson');
 $('recognition-label').textContent=id==='self'?t('legacy'):t('recognize');
 $('recognition').placeholder=id==='self'?t('hintLegacy'):t('hintRecognition');
 for(const [key,input] of Object.entries(fieldIds)) $(input).value=rec[key]||'';
 draftPlaces=loadPlaces(rec.places);renderPlaceEditor();
 dialog.showModal();
 $('close-editor').focus({preventScroll:true});
}
$('close-editor').addEventListener('click',()=>dialog.close());
$('cancel').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{
 const previous=returnFocus;
 if(previous?.isConnected) previous.focus({preventScroll:true});
 else if(active&&nodes.has(active)&&!$('map-view').hidden) nodes.get(active).button.focus({preventScroll:true});
 else if(!$('reflection-view').hidden) $('reflection-title').focus({preventScroll:true});
});
form.addEventListener('submit',event=>{
 event.preventDefault();
 if(!active) return;
 const rec=Object.fromEntries(Object.entries(fieldIds).map(([key,input])=>[key,$(input).value.trim()]));
 const next={...records};
 const places=collectPlaces();if(places.length)rec.places=places;
 if(Object.values(rec).some(Boolean)) next[active]=rec;
 else delete next[active];
 try{localStorage.setItem(storageKey,JSON.stringify(next));}
 catch{
  $('save-error').textContent=t('saveError');
  $('save-error').hidden=false;
  return;
 }
 records=next;
 renderTree();
 renderReflections();
 dialog.close();
 $('status').textContent=t('saved');
});
function renderReflections(){
 const content=$('reflections');
 content.replaceChildren();
 const filled=[...people.values()].filter(p=>{
  const record=records[p.id];
  return record && (record.traits||record.memory||record.traditions||record.recognition||recordPlaces(record).length);
 });
 renderGeography();
 if(!filled.length){
  content.append(el('p','reflection-item',t('empty')));
  return;
 }
 const sections=[
  ['mother',t('material')],['father',t('paternal')],['self',t('own')]
 ];
 const levelKeys={parent:'kindParent',grandparent:'kindGrand',greatgrandparent:'kindGreat'};
 for(const [branch,label] of sections){
  const branchEntries=filled.filter(person=>(person.side||person.id)===branch);
  if(!branchEntries.length)continue;
  const group=el('section','ancestry-result-group '+branch);
  group.append(el('h3','result-branch',label));
  const items=el('ol','result-timeline');
  for(const person of branchEntries){
   const info=records[person.id];
   const item=el('li','reflection-item');
   const generation=levelKeys[person.level]?t(levelKeys[person.level])+' · ':'';
   item.append(el('p','result-generation',generation+person.role+(person.note?' · '+person.note:'')));
   if(info.name)item.append(el('h4','result-name',info.name));
   const facts=el('dl','result-facts');
   for(const [key,labelKey] of [['traits','traits'],['memory','memory'],['traditions','traditions'],['recognition',person.id==='self'?'legacy':'recognize']]){
    if(!info[key])continue;
    const pair=el('div','result-fact '+key);
    pair.append(el('dt','',t(labelKey)),el('dd','',info[key]));facts.append(pair);
   }
   if(recordPlaces(info).length){const pair=el('div','result-fact');pair.append(el('dt','',t('placesHeading')),el('dd','',recordPlaces(info).map(place=>place.name).join(' · ')));facts.append(pair);}
   item.append(facts);
   const edit=el('button','result-edit',t('openEntry'));
   edit.type='button';
   edit.setAttribute('aria-label',t('openEntry')+': '+(info.name||person.role));
   edit.addEventListener('click',()=>openEditor(person.id,edit));item.append(edit);
   items.append(item);
  }
  group.append(items);content.append(group);
 }
}
function showView(reflection){
 $('map-view').hidden=reflection;
 $('reflection-view').hidden=!reflection;
 $('show-map').setAttribute('aria-pressed',String(!reflection));
 $('show-reflections').setAttribute('aria-pressed',String(reflection));
 if(!reflection) requestAnimationFrame(drawEdges);
}
$('show-map').addEventListener('click',()=>showView(false));
$('show-reflections').addEventListener('click',()=>showView(true));
$('edit-self').addEventListener('click',()=>openEditor('self',$('edit-self')));
renderTree();
renderReflections();
