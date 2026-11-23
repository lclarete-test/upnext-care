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
 if(mode==='wizard'&&draft&&stepIndex>0)preserveDraft();
 const next=event.target.value;
 try{localStorage.setItem('ancestry-language-v1',next);}catch{}
 const url=new URL(location.href);url.searchParams.set('lang',next);
 location.assign(url);
});
const tree=$('tree');
const storageKey='ancestry-family-notebook-v1';
const svgNS='http://www.w3.org/2000/svg';
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
let edges;
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
function recordPlaces(rec){const order={birth:0,past:1,current:2};return Array.isArray(rec?.places)?rec.places.filter(p=>p&&Object.hasOwn(order,p.kind)&&typeof p.name==='string'&&p.name).sort((a,b)=>order[a.kind]-order[b.kind]):[]}
function renderGeography(){
 const host=$('places-result');host.replaceChildren();
 const families=[...people.values()].map(person=>({person,rec:records[person.id],places:recordPlaces(records[person.id])})).filter(x=>x.places.length);
 host.append(el('h3','',t('mapTitle')));
 const svg=baseMap(t('mapImage'));
 if(!families.length){host.append(el('p','',t('mapEmpty')),svg);return;}
 host.append(el('p','',t('mapDesc')));
 const lists=el('ul','places-list');lists.setAttribute('aria-label',t('placeList'));
 const points=[];
 for(const {person,rec,places} of families){
  const name=rec.name?rec.name+' · '+person.role:person.role;
  const who=el('li','place-person');who.append(el('strong','',name));
  const details=el('ul','');
  let previous=null;
  const cls=person.side||'self';
  for(const place of places){
   const found=place.unmatched?null:lookupPlace(place.name);
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
 host.append(svg,el('p','source-note',t('source')));
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
 if(pickText(record,'traits')) button.append(el('span','detail trait',pickText(record,'traits')));
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
const steps=['who','birth','past','current','traits','memory','traditions','recognition'];
const choices={
 traits:['t_curious','t_caring','t_persistent','t_humor','t_independent','t_practical','t_creative','t_reserved','t_generous','t_courage'],
 memory:['m_story','m_food','m_trip','m_ritual','m_music','m_small'],
 traditions:['r_celebration','r_recipes','r_prayer','r_faith','r_community','r_story'],
 recognition:['c_way','c_value','c_custom','c_craft','c_perspective','c_change']
};
const draftKey='ancestry-guided-draft-v1', doneKey='ancestry-guided-complete-v1';
let mode='wizard', selected='self', stepIndex=0, draft=null, whoOnly=false, hasFinished=false;
try{hasFinished=localStorage.getItem(doneKey)==='yes';}catch{}
function cloneRecord(value){
 const rec=value||{}, next={};
 if(typeof rec.name==='string')next.name=rec.name;
 for(const key of Object.keys(choices)){
  if(typeof rec[key]==='string')next[key]=rec[key];
  const tokens=rec.picks?.[key];
  if(Array.isArray(tokens)){
   next.picks ||= {};next.picks[key]=tokens.filter(t=>choices[key].includes(t));
  }
 }
 const places=recordPlaces(rec);
 if(places.length)next.places=places.map(x=>({...x}));
 return next;
}
function pickNames(rec,key){return (rec?.picks?.[key]||[]).filter(x=>choices[key]?.includes(x)).map(x=>t(x));}
function pickText(rec,key){return [...pickNames(rec,key),rec?.[key]].filter(Boolean).join(' · ');}
function preserveDraft(){try{sessionStorage.setItem(draftKey,JSON.stringify({draft,stepIndex,selected,whoOnly}));}catch{}}
function clearDraft(){try{sessionStorage.removeItem(draftKey);}catch{}}
function elButton(text,cls,action){
 const b=el('button',cls,text);b.type='button';b.addEventListener('click',action);return b;
}
function setView(view,focus=true){
 mode=view;
 $('wizard-view').hidden=view!=='wizard';
 $('map-view').hidden=view!=='tree';
 $('reflection-view').hidden=view!=='portrait';
 $('notebook-nav').hidden=!Object.keys(records).length&&!hasFinished;
 $('show-reflections').setAttribute('aria-pressed',String(view==='portrait'));
 $('show-map').setAttribute('aria-pressed',String(view==='tree'));
 $('start-guided').setAttribute('aria-pressed',String(view==='wizard'));
 if(view==='portrait')renderPortrait();
 if(view==='tree')requestAnimationFrame(drawEdges);
 if(focus)(view==='portrait'?$('reflection-title'):view==='tree'?$('map-title'):$('question-title')).focus();
}
function startWizard(person=null,familyOnly=false){
 whoOnly=familyOnly;
 selected=person||(familyOnly?'mother':'self');
 stepIndex=person?1:0;
 draft=cloneRecord(records[selected]);
 $('wizard-heading').textContent=t(person&&person!=='self'?'guided':familyOnly?'addFamily':'startTitle');
 renderQuestion(false);setView('wizard');
}
function openEditor(id){startWizard(id);}
function whoName(){
 if(draft?.name?.trim())return draft.name.trim();
 const person=people.get(selected);
 if(locale==='pt'){
  const feminine=['mother','mm','fm'].includes(selected)||(selected.length===3&&selected.endsWith('m'));
  return (feminine?'sua ':'seu ')+person.role.toLocaleLowerCase(locale);
 }
 if(locale==='es')return 'tu '+person.role.toLocaleLowerCase(locale);
 return 'your '+person.role.toLocaleLowerCase(locale);
}
function setSelection(id){
 if(selected===id)return;
 selected=id;draft=cloneRecord(records[id]);renderQuestion(false);
 document.querySelector(`[data-who="${id}"]`)?.focus({preventScroll:true});
}
function drawWho(host){
 const group=el('div','who-grid');
 function tile(person){
  const chosen=selected===person.id;
  const label=records[person.id]?.name?.trim();
  const tile=elButton(label||person.role,'choice person-choice',()=>setSelection(person.id));
  tile.dataset.who=person.id;tile.setAttribute('aria-pressed',chosen);
  if(label||person.note)tile.append(el('span','choice-meta',person.note||person.role));
  if(person.id==='self')tile.classList.add('self-choice');
  return tile;
 }
 for(const person of [...people.values()].filter(p=>p.level==='self'||p.level==='parent')){
  if(!whoOnly||person.id!=='self')group.append(tile(person));
 }
 host.append(group);
 const expanded=el('details','more-people');
 expanded.open=!['self','mother','father'].includes(selected);
 expanded.append(el('summary','',t('other')));
 const relatives=el('div','who-grid relatives');
 for(const person of [...people.values()].filter(p=>p.level==='grandparent'||p.level==='greatgrandparent'))relatives.append(tile(person));
 expanded.append(relatives);host.append(expanded);
 const details=el('details','optional-note');
 const summary=el('summary','',t('includeName'));
 const label=el('label','sr',t('nameShort'));label.htmlFor='profile-name';
 const input=el('input');input.id=label.htmlFor;input.maxLength=80;input.autocomplete='off';input.value=draft.name||'';input.placeholder=t('nameShort');
 input.addEventListener('input',()=>{draft.name=input.value;});
 details.open=Boolean(draft.name);details.append(summary,label,input);host.append(details);
}
let readCity=null;
function drawPlaces(host,kind){
 const label=el('label','search-label',t('cityLabel'));label.htmlFor='city-search';
 const field=el('input','city-search');field.type='search';field.id='city-search';field.maxLength=90;field.autocomplete='off';field.placeholder=t('cityHint');
 const saved=el('ul','chosen-places');const matches=el('ul','city-matches');
 const status=el('span','sr');status.setAttribute('role','status');
 function candidates(value){
  const query=normalize(value);if(query.length<2)return [];
  const words=query.replace(/,/g,' ').split(/\s+/).filter(Boolean);
  return geo.places.map(p=>{
    const city=normalize(p[0]), whole=normalize([p[0],p[1],p[4],p[5]].join(' ').replace(/,/g,' '));
    return {p,score: city===query?3:city.startsWith(query)?2:words.every(word=>whole.includes(word))?1:0};
  }).filter(x=>x.score).sort((a,b)=>b.score-a.score).slice(0,6).map(x=>x.p);
 }
 function put(value,matched=false){
  const name=value.trim();
  if(!name)return;
  const places=recordPlaces(draft);
  const existing=places.filter(p=>p.kind===kind);
  if(kind==='past'&&existing.length>=8)return;
  const keep=kind==='past'?places:places.filter(x=>x.kind!==kind);
  if(keep.some(p=>p.kind===kind&&normalize(p.name)===normalize(name)))return;
  draft.places=[...keep,{kind,name,...(matched?{}:{unmatched:true})}];
  field.value='';paint();status.textContent=t('cityAdded');field.focus({preventScroll:true});
 }
 function paint(){
  saved.replaceChildren();matches.replaceChildren();
  const places=recordPlaces(draft).filter(x=>x.kind===kind);
  for(const place of places){
   const li=el('li','chosen-city');
   li.append(el('span','',place.name),elButton(t('cityChange'),'skip-option',()=>{
    draft.places=recordPlaces(draft).filter(p=>p!==place);paint();field.focus({preventScroll:true});
   }));saved.append(li);
  }
  if(field.value.trim().length<2)return;
  const options=candidates(field.value);
  for(const city of options){
   const li=el('li');li.append(elButton(labelCity(city),'city-option',()=>put(labelCity(city),true)));
   matches.append(li);
  }
  if(!options.length){
   const li=el('li','no-city');li.append(el('p','',t('cityNoMatch')),elButton(t('cityKeep'),'secondary',()=>commitInput()));
   matches.append(li);
  }
 }
 function commitInput(){
  const name=field.value.trim();
  if(!name)return;
  const city=candidates(name).find(x=>normalize(labelCity(x))===normalize(name));
  if(city){put(labelCity(city),true);return;}
  put(name,Boolean(lookupPlace(name)));
 }
 readCity=commitInput;
 field.addEventListener('input',paint);
 field.addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();commitInput();}
  if(e.key==='ArrowDown'&&matches.querySelector('button')){e.preventDefault();matches.querySelector('button').focus();}
 });
 paint();
 host.append(label,field,matches,saved,status);
 if(kind==='past')host.append(el('p','help-note',t('cityMore')));
}
function drawChoices(host,key){
 const group=el('div','answer-choices');
 const buttons=[];
 const opts=choices[key];
 for(const x of opts){
  const btn=elButton(t(x),'choice',()=>{
   draft.picks ||= {};
   const picked=new Set(draft.picks[key]||[]);
   const isOn=picked.has(x);
   if(isOn)picked.delete(x);else picked.add(x);
   draft.picks[key]=[...picked];btn.setAttribute('aria-pressed',String(!isOn));
   message.textContent='';
  });
  btn.setAttribute('aria-pressed',String(draft.picks?.[key]?.includes(x)||false));buttons.push(btn);group.append(btn);
 }
 const details=el('details','optional-note');details.open=!!draft[key];
 const summary=el('summary','',t('addDetail'));
 const label=el('label','sr',t('detail'));label.htmlFor='note-detail';
 const input=el('textarea');input.id=label.htmlFor;
 input.rows=2;input.maxLength=Math.max(220,(draft[key]||'').length);input.value=draft[key]||'';input.placeholder=t('detail');
 input.addEventListener('input',()=>{draft[key]=input.value;message.textContent='';});
 const message=el('p','help-note');message.setAttribute('role','status');
 details.append(summary,label,input);
 host.append(group,details);
 if(key==='traditions'){
  host.append(elButton(t('noAnswer'),'skip-option privacy-choice',()=>{
   if(draft.picks)delete draft.picks[key];
   delete draft[key];input.value='';details.open=false;buttons.forEach(btn=>btn.setAttribute('aria-pressed','false'));
   message.textContent=t('noAnswerMarked');
  }),message);
 }
}
function renderQuestion(moveFocus=true){
 const key=steps[stepIndex], self=selected==='self', who=whoName();
 const host=$('question-content');host.replaceChildren();readCity=null;
 $('save-error').hidden=true;
 $('step-count').textContent=t('stepNote',{current:stepIndex+1,total:steps.length});
 $('journey-progress').value=stepIndex+1;
 const milestones=$('milestones');milestones.replaceChildren();
 const progressIndex=stepIndex===0?0:stepIndex<4?1:2;
 ['chapterWho','chapterPlace','chapterStory'].forEach((ch,i)=>{
  const li=el('li',i===progressIndex?'milestone active':i<progressIndex?'milestone done':'milestone',t(ch));
  if(i===progressIndex)li.setAttribute('aria-current','step');
  milestones.append(li);
 });
 let promptKey,helpKey;
 if(key==='who'){promptKey='whoTitle';helpKey='whoHelp';drawWho(host);}
 else if(['birth','past','current'].includes(key)){promptKey=key+(self?'Self':'Q');helpKey='cityHelp';drawPlaces(host,key);}
 else{
  const k={traits:'traits',memory:'memo',traditions:'trad',recognition:'carry'}[key];promptKey=k+(self?'Self':'Q');helpKey=key==='traditions'?'privateChoice':'tapMany';drawChoices(host,key);
 }
 $('question-title').textContent=t(promptKey,{who});$('question-help').textContent=t(helpKey);
 $('wizard-back').hidden=stepIndex===0;
 $('wizard-skip').hidden=stepIndex===0;
 $('wizard-exit').hidden=!Object.keys(records).length&&!hasFinished;
 $('wizard-context').hidden=stepIndex>0;
 $('wizard-next').textContent=t(stepIndex===steps.length-1?'finish':'continue');
 if(moveFocus)$('question-title').focus();
}
function savePortrait(){
 const next={...records};
 const rec=cloneRecord(draft);
 for(const key of ['name',...Object.keys(choices)]){
  if(rec[key]?.trim())rec[key]=rec[key].trim();else delete rec[key];
  if(rec.picks&&!rec.picks[key]?.length)delete rec.picks[key];
 }
 if(rec.picks&&!Object.keys(rec.picks).length)delete rec.picks;
 if(Object.keys(rec).length)next[selected]=rec;else delete next[selected];
 try{localStorage.setItem(storageKey,JSON.stringify(next));localStorage.setItem(doneKey,'yes');}
 catch{$('save-error').textContent=t('saveError');$('save-error').hidden=false;return;}
 records=next;hasFinished=true;clearDraft();renderTree();setView('portrait');
 $('status').textContent=t('savedNotice');
}
function advance(skip=false){
 if(stepIndex===steps.length-1){savePortrait();return;}
 if(!skip&&readCity)readCity();
 stepIndex++;renderQuestion();
}
$('wizard-next').addEventListener('click',()=>advance());
$('wizard-skip').addEventListener('click',()=>advance(true));
$('wizard-back').addEventListener('click',()=>{if(stepIndex>0)stepIndex--;renderQuestion();});
$('wizard-exit').addEventListener('click',()=>{clearDraft();setView('portrait');});
$('show-map').addEventListener('click',()=>setView('tree'));
$('show-reflections').addEventListener('click',()=>setView('portrait'));
$('start-guided').addEventListener('click',()=>startWizard());
$('add-family').addEventListener('click',()=>startWizard(null,true));
$('edit-self').addEventListener('click',()=>startWizard('self'));
function makeFact(rec,key,labelKey){
 const text=pickText(rec,key);
 if(!text)return null;
 const pair=el('div','portrait-fact '+key);
 pair.append(el('dt','',t(labelKey)),el('dd','',text));return pair;
}
function entryFacts(rec,self){
 const list=el('dl','portrait-facts');
 for(const [key,label] of [['traits','traits'],['memory','memory'],['traditions','traditions'],['recognition',self?'legacy':'recognize']]){
  const fact=makeFact(rec,key,label);if(fact)list.append(fact);
 }
 const places=recordPlaces(rec);
 if(places.length){const pair=el('div','portrait-fact');pair.append(el('dt','',t('chapterPlace')),el('dd','',places.map(v=>v.name).join(' · ')));list.append(pair);}
 return list;
}
function renderPortrait(){
 const personal=$('profile-result'), common=$('common-result'), list=$('reflections'), totals=$('portrait-counts');
 personal.replaceChildren();common.replaceChildren();list.replaceChildren();totals.replaceChildren();
 const filled=[...people.values()].filter(p=>records[p.id]);
 const n=filled.length,m=new Set(filled.flatMap(person=>recordPlaces(records[person.id]).map(v=>normalize(v.name)))).size;
 if(n)totals.append(el('span','portrait-count',t(n===1?'onePerson':'nPeople',{n})));
 if(m)totals.append(el('span','portrait-count',t(m===1?'onePlace':'nPlaces',{n:m})));
 renderGeography();
 const card=el('section','profile-card');
 card.append(el('p','kicker',t('personal')));
 if(records.self){
   card.append(el('h2','',records.self.name||t('self')),el('p','',t('profileStory')),entryFacts(records.self,true));
 }else card.append(el('h2','',t('own')),el('p','',t('profileEmpty')));
 personal.append(card);
 const traits=choices.traits.map(token=>[token,filled.filter(p=>records[p.id]?.picks?.traits?.includes(token))]).filter(([,members])=>members.length>1);
 if(traits.length){
  const group=el('section','pattern-card');group.append(el('h2','',t('common')),el('p','',t('commonNote')));
  const items=el('ul','pattern-list');
  for(const [trait,members] of traits){
   const li=el('li','');li.append(el('strong','',t(trait)),el('span','',members.map(p=>records[p.id].name||p.role).join(' · ')));items.append(li);
  }
  group.append(items);common.append(group);
 }
 const generations={parent:'kindParent',grandparent:'kindGrand',greatgrandparent:'kindGreat'};
 for(const side of ['mother','father']){
  const members=filled.filter(p=>p.side===side);
  if(!members.length)continue;
  const group=el('section','ancestry-result-group '+side);
  group.append(el('h2','result-branch',t(side==='mother'?'material':'paternal')));
  const timeline=el('ol','result-timeline');
  for(const person of members){
   const rec=records[person.id], item=el('li','reflection-item');
   const role=person.role+(person.note?' · '+person.note:'');
   item.append(el('p','result-generation',t(generations[person.level])+' · '+role));
   if(rec.name)item.append(el('h3','result-name',rec.name));
   item.append(entryFacts(rec,false));
   const edit=elButton(t('openEntry'),'result-edit',()=>openEditor(person.id));
   edit.setAttribute('aria-label',t('openEntry')+': '+(rec.name||role));item.append(edit);timeline.append(item);
  }
  group.append(timeline);list.append(group);
 }
}
renderTree();
let savedDraft=null;
try{savedDraft=JSON.parse(sessionStorage.getItem(draftKey)||'null');}catch{}
clearDraft();
if(savedDraft&&people.has(savedDraft.selected)&&Number.isInteger(savedDraft.stepIndex)&&savedDraft.stepIndex>0&&savedDraft.stepIndex<steps.length){
 selected=savedDraft.selected;draft=cloneRecord(savedDraft.draft);stepIndex=savedDraft.stepIndex;whoOnly=Boolean(savedDraft.whoOnly);
 renderQuestion(false);setView('wizard',false);
}else if(Object.keys(records).length||hasFinished)setView('portrait',false);
else{draft=cloneRecord(records.self);renderQuestion(false);setView('wizard',false);}
