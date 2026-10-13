// Reuse UpNext's Firebase account, without enrolling users in the DPP.
try {
 const {auth,createEmailAccount,loginWithEmail,loginWithGoogle,logout}=await import('../dpp/dpp-firebase.js');
 const {onAuthStateChanged,sendEmailVerification,sendPasswordResetEmail,getAdditionalUserInfo}=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js');
 const settings=()=>({url:new URL('./?lang='+document.documentElement.lang.split('-')[0]+'#login',location.href).href,handleCodeInApp:false});
 window.UpNextAccount={
  login:async({email,password})=>{const result=await loginWithEmail(email.trim(),password);window.UpNextAnalytics?.identify(result.user.uid);window.UpNextAnalytics?.track('login_completed',{auth_method:'email'});return result;},
  google:async()=>{const result=await loginWithGoogle();window.UpNextAnalytics?.identify(result.user.uid);if(getAdditionalUserInfo(result)?.isNewUser)window.UpNextAnalytics?.track('account_created',{auth_method:'google'});window.UpNextAnalytics?.track('login_completed',{auth_method:'google'});return result;},
  signup:async({name,email,password})=>{const user=await createEmailAccount(email.trim(),password,name.trim());window.UpNextAnalytics?.identify(user.uid);window.UpNextAnalytics?.track('account_created',{auth_method:'email'});try{await sendEmailVerification(user,settings());}catch(error){error.message='Your account was created, but the confirmation email could not be sent. Use Send confirmation email to try again.';throw error;}await logout();},
  verify:()=>sendEmailVerification(auth.currentUser,settings()),
  reset:email=>sendPasswordResetEmail(auth,email.trim(),settings()),
  logout
 };
 onAuthStateChanged(auth,user=>{if(user?.emailVerified)window.UpNextAnalytics?.authenticated(user.uid);else if(!user)window.UpNextAnalytics?.logout();window.onUpNextSession(user);},error=>window.onUpNextSession(null,error));
} catch(error){window.onUpNextSession(null,error);}

