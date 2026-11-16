import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {JSDOM} from 'jsdom';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {doc,getDoc,getDocs,collection,query,where} from 'firebase/firestore';
const root=fileURLToPath(new URL('../../',import.meta.url));
const runtimeDir=mkdtempSync(fileURLToPath(new URL('../.test-runtime-',import.meta.url)));
const env=await initializeTestEnvironment({projectId:'demo-upnext-care',firestore:{host:'127.0.0.1',port:8080,rules:readFileSync(root+'/firebase/firestore.rules','utf8')}});
const wait=async fn=>{for(let i=0;i<200;i++){if(fn())return;await new Promise(r=>setTimeout(r,25));}throw new Error('Timed out: '+document.body.textContent.slice(-2400));};
const click=s=>document.querySelector(s).click();
const type=(name,v)=>{document.querySelector(`#editor-form [name="${name}"]`).value=v;};
async function save(){document.querySelector('#editor-form').dispatchEvent(new window.Event('submit',{cancelable:true}));await wait(()=>!document.querySelector('#editor').open||document.querySelector('#editor-error').textContent);assert.equal(document.querySelector('#editor-error').textContent,'');}
let appCounter=0;
async function open(uid,area,search=''){
 const email=uid+'@example.test',dom=new JSDOM(readFileSync(root+'/hub/index.html','utf8'),{url:`https://upnextcare.com/hub/?area=${area}${search}`});
 for(const name of ['window','document','history','location','FormData'])Object.defineProperty(globalThis,name,{value:dom.window[name],configurable:true});
 Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
 const fixture={db:env.authenticatedContext(uid,{email,email_verified:true}).firestore(),user:{uid,email,emailVerified:true,displayName:'Test '+uid,reload:async()=>{},getIdToken:async()=>"emulator-only"}};
 globalThis.hubTestFixture=fixture;const n=++appCounter;
 writeFileSync(join(runtimeDir,`fixture${n}.mjs`),`export const db=globalThis.hubTestFixture.db;export const auth={currentUser:globalThis.hubTestFixture.user};export const googleProvider={};export const waitForUser=async()=>auth.currentUser;export const getProfile=async()=>null;export const onAuthStateChanged=()=>()=>{};export const signOut=async()=>{};export const signInWithPopup=async()=>{};export const signInWithEmailAndPassword=async()=>{};export const createUserWithEmailAndPassword=async()=>{};export const updateProfile=async()=>{};export const sendEmailVerification=async()=>{};export const sendPasswordResetEmail=async()=>{};`);
 let source=readFileSync(root+'/hub/app.js','utf8').replace("'/dpp/dpp-firebase.js'",`'./fixture${n}.mjs'`).replace(/'https:\/\/www\.gstatic\.com\/firebasejs\/11\.10\.0\/firebase-auth\.js'/,`'./fixture${n}.mjs'`).replace(/'https:\/\/www\.gstatic\.com\/firebasejs\/11\.10\.0\/firebase-firestore\.js'/,"'firebase/firestore'");
 writeFileSync(join(runtimeDir,`app${n}.mjs`),source);await import(pathToFileURL(join(runtimeDir,`app${n}.mjs`)).href);click('#continue');await wait(()=>!document.querySelector('#workspace').hidden&&document.querySelector('#view').textContent.trim());return fixture;
}
test('real hub UI creates a course, invitation, enrollment, progress and attendance with Firestore permissions',async()=>{try{
 const partner=await open('flowpartner','partner');
 click('[data-action=organization]');type('name','Integration test partner');await save();assert.match(document.querySelector('#view').textContent,/Your first cohort/);
 click('[data-action=cohort]');type('title','Integration test course');type('startDate','2026-11-16');await save();assert.match(document.querySelector('#workspace-title').textContent,/Integration test course/);
 click('[data-tab=lessons]');await wait(()=>document.querySelector('[data-action=lesson]'));click('[data-action=lesson]');type('title','A safe first lesson');type('body','Learning content for a synthetic test only.');await save();assert.match(document.querySelector('#view').textContent,/A safe first lesson/);
 click('[data-tab=sessions]');await wait(()=>document.querySelector('[data-action=session]'));click('[data-action=session]');type('title','Synthetic test session');type('date','2026-11-20');type('time','14:00');await save();assert.match(document.querySelector('#view').textContent,/Synthetic test session/);
 click('[data-tab=invitations]');await wait(()=>document.querySelector('[data-action=invite]'));click('[data-action=invite]');type('email','flowpatient@example.test');await save();
 const invites=await getDocs(query(collection(partner.db,'careInvitations'),where('ownerUid','==','flowpartner')));assert.equal(invites.size,1);const invitation=invites.docs[0];
 const patient=await open('flowpatient','patient','&invite='+invitation.id);assert.match(document.querySelector('#view').textContent,/Integration test partner/);
 click('[data-action=accept]');type('patientLabel','Synthetic participant');document.querySelector('[name=consent]').checked=true;await save();assert.match(document.querySelector('#view').textContent,/Integration test course/);
 click('[data-cohort]');await wait(()=>document.querySelector('[data-action=complete]'));click('[data-action=complete]');await wait(()=>document.querySelector('[data-action=complete]')?.textContent.includes('Completed'));
 const cohortId=invitation.data().cohortId;const enrollment=await getDoc(doc(patient.db,'careEnrollments',cohortId+'_flowpatient'));assert.equal(enrollment.data().completedLessonIds.length,1);
 click('[data-tab=sessions]');await wait(()=>document.querySelector('#view').textContent.includes('Synthetic test session'));
 await open('flowpartner','partner');click('[data-cohort]');await wait(()=>document.querySelector('[data-tab=sessions]'));click('[data-tab=sessions]');await wait(()=>document.querySelector('[data-attendance]'));const select=document.querySelector('[data-attendance]');select.value='present';select.dispatchEvent(new window.Event('change'));await wait(()=>document.querySelector('#status').textContent.includes('Attendance saved'));
 const records=await getDocs(collection(partner.db,'careCohorts',cohortId,'attendance'));assert.equal(records.docs[0].data().status,'present');
 await open('flowpatient','patient');click('[data-cohort]');await wait(()=>document.querySelector('[data-tab=sessions]'));click('[data-tab=sessions]');await wait(()=>document.querySelector('#view').textContent.includes('present'));assert.match(document.querySelector('#view').textContent,/present/);
 }finally{await env.cleanup();rmSync(runtimeDir,{recursive:true,force:true});}});
