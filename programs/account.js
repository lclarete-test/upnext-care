// Reuse UpNext's Firebase account, without enrolling users in the DPP.
try {
 const {auth,createEmailAccount,loginWithEmail,loginWithGoogle,logout}=await import('../dpp/dpp-firebase.js');
 const {onAuthStateChanged,sendEmailVerification,sendPasswordResetEmail}=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js');
 const settings=()=>({url:new URL('./?lang='+document.documentElement.lang.split('-')[0]+'#login',location.href).href,handleCodeInApp:false});
 window.UpNextAccount={
  login:({email,password})=>loginWithEmail(email.trim(),password),
  google:()=>loginWithGoogle(),
  signup:async({name,email,password})=>{const user=await createEmailAccount(email.trim(),password,name.trim());await sendEmailVerification(user,settings());await logout();},
  verify:()=>sendEmailVerification(auth.currentUser,settings()),
  reset:email=>sendPasswordResetEmail(auth,email.trim(),settings()),
  logout
 };
 onAuthStateChanged(auth,user=>window.onUpNextSession(user),error=>window.onUpNextSession(null,error));
} catch(error){window.onUpNextSession(null,error);}
