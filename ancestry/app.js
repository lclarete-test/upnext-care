'use strict';
const $=id=>document.getElementById(id);
const tree=$('tree'), dialog=$('editor'), form=$('entry');
const storageKey='ancestry-family-notebook-v1';
const svgNS='http://www.w3.org/2000/svg';
const fieldIds={name:'person-name',traits:'traits',memory:'memory',recognition:'recognition'};
const entries=[
 ['self','Você','self',null,2,2],
 ['mother','Mãe','parent','self',1,2,'mother'],
 ['father','Pai','parent','self',3,2,'father'],
 ['mm','Avó materna','grandparent','mother',1,1,'mother'],
 ['mf','Avô materno','grandparent','mother',2,1,'mother'],
 ['fm','Avó paterna','grandparent','father',3,1,'father'],
 ['ff','Avô paterno','grandparent','father',4,1,'father'],
];
for(const [id,role,, ,col, ,side] of entries.slice(3)){
 const description=role.startsWith('Avó')?'da '+role.toLowerCase():'do '+role.toLowerCase();
 entries.push([id+'m','Bisavó','greatgrandparent',id,col<=2?1:3,1,side,'Mãe '+description],
              [id+'f','Bisavô','greatgrandparent',id,col<=2?2:4,1,side,'Pai '+description]);
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
  toggle.setAttribute('aria-label',(isOpen?'Fechar':'Abrir')+' ramo: '+role.toLowerCase());
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
 $('count').textContent=total===1?'1 ficha registrada':total+' fichas registradas';
 $('tip').lastChild.textContent=Object.values(scopes).some(Boolean)?' também permitem trocar ou fechar o ramo aberto.':' abrem os ramos dos bisavós.';
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
 $('prompt').textContent=id==='self'?'Quais traços, lembranças ou escolhas contam um pouco de quem você é hoje?':'Que detalhe você gostaria de guardar sobre essa pessoa, mesmo sem conhecer toda a história?';
 $('person-name').placeholder=id==='self'?'Como você gosta de ser chamado?':'Como você chama essa pessoa?';
 $('recognition-label').textContent=id==='self'?'O que quero levar adiante':'O que reconheço em mim';
 $('recognition').placeholder=id==='self'?'Uma escolha, um valor ou um jeito de fazer diferente…':'O que disso aparece em você?';
 for(const [key,input] of Object.entries(fieldIds)) $(input).value=rec[key]||'';
 dialog.showModal();
 $('close-editor').focus({preventScroll:true});
}
$('close-editor').addEventListener('click',()=>dialog.close());
$('cancel').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{
 const previous=returnFocus;
 if(previous?.isConnected) previous.focus({preventScroll:true});
 else if(active&&nodes.has(active)&&!$('map-view').hidden) nodes.get(active).button.focus({preventScroll:true});
});
form.addEventListener('submit',event=>{
 event.preventDefault();
 if(!active) return;
 const rec=Object.fromEntries(Object.entries(fieldIds).map(([key,input])=>[key,$(input).value.trim()]));
 const next={...records};
 if(Object.values(rec).some(Boolean)) next[active]=rec;
 else delete next[active];
 try{localStorage.setItem(storageKey,JSON.stringify(next));}
 catch{
  $('save-error').textContent='Este navegador não permitiu salvar. Suas anotações ainda estão abertas para você copiar.';
  $('save-error').hidden=false;
  return;
 }
 records=next;
 renderTree();
 renderReflections();
 dialog.close();
 $('status').textContent='Ficha salva neste navegador.';
});
function renderReflections(){
 const content=$('reflections');
 content.replaceChildren();
 const reflections=entries.filter(([id])=>records[id]?.recognition);
 if(!reflections.length){
  content.append(el('p','reflection-item','Os registros do campo “O que reconheço em mim” aparecem aqui. Você também pode escrever diretamente sobre si.'));
  return;
 }
 for(const [id,role,,,,,,note] of reflections){
  const info=records[id];
  const item=el('article','reflection-item');
  const title=id==='self'?'O que quero levar adiante':info.name?info.name+' · '+role:note?role+' · '+note:role;
  item.append(el('h3','',title),el('p','',info.recognition));
  content.append(item);
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
