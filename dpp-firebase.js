import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  signOut
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAaARE8YP5NFHyTShsnu17vb9RklIcFw_0',
  authDomain: 'dpp-comunidade-brasileira.firebaseapp.com',
  projectId: 'dpp-comunidade-brasileira',
  storageBucket: 'dpp-comunidade-brasileira.firebasestorage.app',
  messagingSenderId: '857600558011',
  appId: '1:857600558011:web:08487d6e17bd0aa524ba9e'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
await setPersistence(auth, browserLocalPersistence);

export function waitForUser() {
  return new Promise(resolve => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      unsubscribe();
      resolve(user);
    });
  });
}

export async function getProfile(uid) {
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function requireParticipant() {
  const user = await waitForUser();
  if (!user) {
    location.replace('dpp-participar.html#entrar');
    return null;
  }
  if (!user.emailVerified) {
    await signOut(auth);
    location.replace('dpp-participar.html?verifique=1#entrar');
    return null;
  }
  const profile = await getProfile(user.uid);
  if (!profile || profile.status !== 'participante') {
    await signOut(auth);
    location.replace('dpp-participar.html?cadastro=1#participar');
    return null;
  }
  return { user, profile };
}

export async function createEmailAccount(email, password, name) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });
  return credential.user;
}

export function loginWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function sendVerification(user) {
  const continueUrl = new URL('dpp-participar.html?email_verificado=1#entrar', location.href).href;
  return sendEmailVerification(user, { url: continueUrl, handleCodeInApp: false });
}

export function sendReset(email) {
  const continueUrl = new URL('dpp-participar.html#entrar', location.href).href;
  return sendPasswordResetEmail(auth, email, { url: continueUrl });
}

export function logout() {
  return signOut(auth);
}

export async function saveEnrollment(user, profile, screener, registration) {
  await setDoc(doc(db, 'users', user.uid), {
    name: profile.name,
    email: user.email,
    contactEmail: profile.contactEmail || user.email,
    phone: profile.phone || '',
    zipCode: profile.zipCode,
    status: 'participante',
    consentedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp()
  }, { merge: true });
  await setDoc(doc(db, 'users', user.uid, 'screeners', screener.screener_id), {
    ...screener,
    createdAt: serverTimestamp()
  });
  await setDoc(doc(db, 'users', user.uid, 'registrations', registration.cadastro_id), {
    ...registration,
    authProvider: user.providerData[0]?.providerId || 'password',
    createdAt: serverTimestamp()
  });
}

export async function getModuleState(uid, number) {
  const snapshot = await getDoc(doc(db, 'users', uid, 'modules', String(number)));
  return snapshot.exists() ? snapshot.data() : {};
}

export async function saveModuleState(uid, number, data) {
  await setDoc(doc(db, 'users', uid, 'modules', String(number)), {
    ...data,
    module: number,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function getAllModuleStates(uid) {
  const snapshot = await getDocs(collection(db, 'users', uid, 'modules'));
  const states = new Map();
  snapshot.forEach(item => states.set(Number(item.id), item.data()));
  return states;
}

export async function addCheckin(uid, data) {
  await addDoc(collection(db, 'users', uid, 'checkins'), {
    ...data,
    createdAt: serverTimestamp()
  });
}

export async function getCheckins(uid) {
  const snapshot = await getDocs(query(collection(db, 'users', uid, 'checkins'), orderBy('date', 'asc')));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export function authMessage(error) {
  const code = error?.code || '';
  const messages = {
    'auth/email-already-in-use': 'Este e-mail já tem uma conta. Entre ou recupere sua senha.',
    'auth/invalid-email': 'Digite um e-mail válido.',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'Não encontramos uma conta com esse e-mail.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/popup-closed-by-user': 'A entrada com Google foi cancelada.',
    'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Permita pop-ups e tente novamente.',
    'auth/account-exists-with-different-credential': 'Este e-mail já usa outro método de entrada. Entre com o método usado anteriormente.',
    'auth/too-many-requests': 'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.'
  };
  return messages[code] || 'Não foi possível concluir agora. Tente novamente.';
}
