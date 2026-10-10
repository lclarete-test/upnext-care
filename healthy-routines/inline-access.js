// Mount the shared account UI inside the public course introduction.
const language = ['en','es','pt'].includes(new URLSearchParams(location.search).get('lang'))
  ? new URLSearchParams(location.search).get('lang') : 'en';
const main = document.getElementById('account-access');
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
window.UpNextInlineAccess = true;
function render() {
  if (!hasCourseAccess()) { renderAccount(); return; }
  const copy = {
    en: ['You’re ready to learn.', 'Continue your Healthy Routines course with your UpNext account.', 'Start learning', 'Sign out'],
    es: ['Todo listo para aprender.', 'Continúa tu curso Healthy Routines con tu cuenta de UpNext.', 'Empezar a aprender', 'Cerrar sesión'],
    pt: ['Tudo pronto para aprender.', 'Continue seu curso Healthy Routines com sua conta da UpNext.', 'Começar a aprender', 'Sair']
  }[language];
  main.innerHTML = `<section class="account-shell card"><div class="eyebrow">Healthy Routines</div><h1>${esc(copy[0])}</h1><p>${esc(copy[1])}</p><a class="btn account-wide" href="../programs/?lang=${language}#course">${esc(copy[2])}</a><button class="text-btn" id="inline-signout">${esc(copy[3])}</button></section>`;
  document.getElementById('inline-signout').onclick = () => accountAction('logout');
}
