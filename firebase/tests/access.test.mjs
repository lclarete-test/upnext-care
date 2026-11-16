import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const rulesPath=fileURLToPath(new URL('../firestore.rules',import.meta.url));
import {test, before, after} from 'node:test';
import {initializeTestEnvironment, assertSucceeds, assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,query,where,updateDoc,writeBatch,serverTimestamp,Timestamp} from 'firebase/firestore';
let env;
const projectId='demo-upnext-care';
const context=(uid,email=uid+'@example.test',verified=true)=>env.authenticatedContext(uid,{email,email_verified:verified}).firestore();
const cohort={ownerUid:'partnerA',orgId:'orgA',title:'Test cohort',program:'DPP',language:'en',startDate:'2026-11-16',status:'active',lessons:{one:{title:'Lesson 1',body:'Test',url:''}},createdAt:Timestamp.now(),updatedAt:Timestamp.now()};
const invitation=(extra={})=>({ownerUid:'partnerA',orgId:'orgA',cohortId:'cohortA',cohortTitle:'Test cohort',orgName:'Test organization',program:'DPP',email:'patient@example.test',status:'pending',expiresAt:Timestamp.fromMillis(Date.now()+3600000),createdAt:Timestamp.now(),...extra});
const enrollment=(extra={})=>({ownerUid:'partnerA',orgId:'orgA',cohortId:'cohortA',patientUid:'patient',patientLabel:'Test participant',invitationId:'inviteA',status:'active',completedLessonIds:[],joinedAt:serverTimestamp(),updatedAt:serverTimestamp(),...extra});
before(async()=>{
 env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8080,rules:readFileSync(rulesPath,'utf8')}});
 await env.withSecurityRulesDisabled(async c=>{const db=c.firestore();
  await setDoc(doc(db,'careOrgs/orgA'),{ownerUid:'partnerA',name:'Test organization'});
  await setDoc(doc(db,'careOrgs/orgB'),{ownerUid:'partnerB',name:'Other organization'});
  await setDoc(doc(db,'careCohorts/cohortA'),cohort);
  await setDoc(doc(db,'careInvitations/inviteA'),invitation());
  await setDoc(doc(db,'careInvitations/expired'),invitation({expiresAt:Timestamp.fromMillis(Date.now()-3600000)}));
  await setDoc(doc(db,'users/patient/checkins/private'),{weight:70});
 });
});
after(async()=>{await env.cleanup();});
test('anonymous and unverified accounts cannot open partner or patient data',async()=>{
 await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'careCohorts/cohortA')));
 await assertFails(getDoc(doc(context('partnerA',undefined,false),'careCohorts/cohortA')));
});
test('owners query only their own organizations and cohorts',async()=>{
 const a=context('partnerA'),b=context('partnerB');
 await assertSucceeds(getDocs(query(collection(a,'careCohorts'),where('ownerUid','==','partnerA'))));
 await assertFails(getDocs(collection(a,'careCohorts')));
 await assertFails(getDoc(doc(b,'careCohorts/cohortA')));
 await assertFails(updateDoc(doc(a,'careCohorts/cohortA'),{ownerUid:'partnerB',updatedAt:serverTimestamp()}));
 await assertFails(setDoc(doc(b,'careCohorts/forged'),{...cohort,ownerUid:'partnerB',createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
});
test('partner cannot read legacy patient checkins',async()=>{
 await assertFails(getDoc(doc(context('partnerA'),'users/patient/checkins/private')));
 await assertSucceeds(getDoc(doc(context('patient'),'users/patient/checkins/private')));
});
test('invitation is email bound, requires verified address and cannot be listed by recipient',async()=>{
 await assertSucceeds(getDoc(doc(context('patient'),'careInvitations/inviteA')));
 await assertFails(getDoc(doc(context('outsider'),'careInvitations/inviteA')));
 await assertFails(getDocs(collection(context('patient'),'careInvitations')));
});
test('no self-enrollment or expired invitation',async()=>{
 const p=context('patient');
 await assertFails(setDoc(doc(p,'careEnrollments/cohortA_patient'),enrollment()));
 const batch=writeBatch(p);batch.set(doc(p,'careEnrollments/cohortA_patient'),enrollment({invitationId:'expired'}));batch.update(doc(p,'careInvitations/expired'),{status:'accepted',acceptedBy:'patient',acceptedAt:serverTimestamp()});
 await assertFails(batch.commit());
});
test('atomic invitation acceptance grants access only to that cohort',async()=>{
 const p=context('patient');const batch=writeBatch(p);
 batch.set(doc(p,'careEnrollments/cohortA_patient'),enrollment());batch.update(doc(p,'careInvitations/inviteA'),{status:'accepted',acceptedBy:'patient',acceptedAt:serverTimestamp()});
 await assertSucceeds(batch.commit());
 await assertSucceeds(getDoc(doc(p,'careCohorts/cohortA')));
 await assertFails(getDoc(doc(context('outsider'),'careEnrollments/cohortA_patient')));
 await assertFails(updateDoc(doc(p,'careInvitations/inviteA'),{acceptedBy:'outsider'}));
});
test('patient can record lesson progress, cannot alter ownership, roster, or provider attendance',async()=>{
 const p=context('patient'),a=context('partnerA');
 await assertSucceeds(updateDoc(doc(p,'careEnrollments/cohortA_patient'),{completedLessonIds:['one'],updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(p,'careEnrollments/cohortA_patient'),{completedLessonIds:['invented'],updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(p,'careEnrollments/cohortA_patient'),{ownerUid:'patient',updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(p,'careCohorts/cohortA'),{title:'Edited by patient',updatedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(doc(a,'careCohorts/cohortA/sessions/sessionA'),{title:'Test session',date:'2026-11-16',time:'14:00',duration:60,meetingUrl:'',timezone:'America/New_York',updatedAt:serverTimestamp()}));
 await assertFails(setDoc(doc(p,'careCohorts/cohortA/attendance/sessionA_patient'),{patientUid:'patient',sessionId:'sessionA',status:'present',updatedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(doc(a,'careCohorts/cohortA/attendance/sessionA_patient'),{patientUid:'patient',sessionId:'sessionA',status:'present',updatedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(doc(p,'careCohorts/cohortA/attendance/sessionA_patient')));
 await assertFails(getDoc(doc(context('outsider'),'careCohorts/cohortA/attendance/sessionA_patient')));
});
test('pausing enrollment revokes access to course and sessions',async()=>{
 await assertSucceeds(updateDoc(doc(context('partnerA'),'careEnrollments/cohortA_patient'),{status:'paused',updatedAt:serverTimestamp()}));
 await assertFails(getDoc(doc(context('patient'),'careCohorts/cohortA')));
 await assertFails(getDoc(doc(context('patient'),'careCohorts/cohortA/sessions/sessionA')));
 await assertFails(updateDoc(doc(context('patient'),'careEnrollments/cohortA_patient'),{status:'active',updatedAt:serverTimestamp()}));
});
