/* Public conversion paths. Does not change eligibility, authentication or storage. */
const mountConversionUX = () => {
  const path = location.pathname;
  const lang = /\/pt\//.test(path) ? 'pt' : /\/es\//.test(path) ? 'es' : (new URLSearchParams(location.search).get('lang') || 'en');
  const t = ({
    en: {signup:'Create account',login:'Sign in',start:'Start with a short lesson',title:'Make one healthy habit easier today.',lead:'Explore practical lessons about sleep, eating, movement and stress. Preview a lesson before creating your account, or explore our free Diabetes Prevention Program.',preview:'Try a sample lesson — no account needed',sample:'A two-minute preview',example:'An everyday example',question:'Try the question',feedback:'Choose an answer to see the explanation.',next:'Create an account to continue',news:'Keep your next healthy step within reach.',newsCopy:'Get short health reads, practical habit ideas and updates when new UpNext lessons are available.',email:'Your email address',subscribe:'Get UpNext updates',consent:'By subscribing, you agree to receive UpNext emails. No health details are needed.',units:'Choose the units you use. You can switch between lb/kg and in/cm.',local:'Healthy Routines saves lesson progress in this browser. Use the same browser to return to your plan; DPP records use a separate cloud-backed system.'},
    es: {signup:'Crear cuenta',login:'Iniciar sesión',start:'Empieza con una lección breve',title:'Haz más fácil un hábito saludable hoy.',lead:'Explora lecciones prácticas sobre sueño, alimentación, movimiento y estrés. Prueba una lección antes de crear tu cuenta o conoce nuestro programa gratuito de prevención de la diabetes.',preview:'Prueba una lección — sin cuenta',sample:'Una muestra de dos minutos',example:'Un ejemplo cotidiano',question:'Prueba la pregunta',feedback:'Elige una respuesta para ver la explicación.',next:'Crear cuenta para continuar',news:'Una idea práctica para tu próximo paso.',newsCopy:'Recibe lecturas breves sobre salud, ideas para tus hábitos y novedades sobre las lecciones de UpNext.',email:'Tu correo electrónico',subscribe:'Recibir novedades',consent:'Al suscribirte, aceptas recibir correos de UpNext. No se necesitan datos de salud.',units:'Elige tus unidades: lb/kg e in/cm.',local:'Healthy Routines guarda el progreso en este navegador. Vuelve desde el mismo navegador; los registros del DPP usan un sistema separado en la nube.'},
    pt: {signup:'Criar conta',login:'Entrar',start:'Comece com uma aula curta',title:'Facilite um hábito saudável hoje.',lead:'Explore aulas práticas sobre sono, alimentação, movimento e estresse. Experimente uma aula antes de criar sua conta ou conheça nosso programa gratuito de prevenção do diabetes.',preview:'Experimente uma aula — sem conta',sample:'Uma prévia de dois minutos',example:'Um exemplo cotidiano',question:'Experimente a pergunta',feedback:'Escolha uma resposta para ver a explicação.',next:'Criar conta para continuar',news:'Uma ideia prática para seu próximo passo.',newsCopy:'Receba leituras curtas sobre saúde, ideias para seus hábitos e novidades sobre as aulas da UpNext.',email:'Seu e-mail',subscribe:'Receber novidades',consent:'Ao se inscrever, você concorda em receber e-mails da UpNext. Não é necessário informar dados de saúde.',units:'Escolha suas unidades: lb/kg e in/cm.',local:'Healthy Routines salva o progresso neste navegador. Volte pelo mesmo navegador; os registros do DPP usam um sistema separado na nuvem.'}
  })[lang] || null;
  if (!t) return;
  const account = mode => `/healthy-routines/?lang=${lang}&mode=${mode}#account-access`;
  const style = document.createElement('style');
  style.textContent = `.conversion-actions{display:flex;gap:12px;flex-wrap:wrap;margin:22px 0}.conversion-link{display:inline-flex;justify-content:center;align-items:center;min-height:44px;padding:11px 18px;background:#087b6c;color:white!important;border:1px solid #087b6c;border-radius:8px;font:600 15px/1.4 Arial,sans-serif;text-decoration:none}.conversion-link.secondary{background:white;color:#087261!important}.conversion-news,.conversion-preview{padding:28px;border:1px solid #c7dfd7;border-radius:14px;background:#f5faf8;margin:28px auto;max-width:900px;color:#142744}.conversion-news h2,.conversion-preview h2{font-size:26px;line-height:1.2;letter-spacing:-.5px;margin:0 0 14px}.conversion-news form{display:flex;gap:10px;flex-wrap:wrap}.conversion-news input{flex:1;min-width:0;width:100%;padding:13px;border:1px solid #8da99e;border-radius:8px;font:inherit}.conversion-news button,.conversion-preview button{min-height:44px;padding:12px 16px;border:1px solid #8da99e;border-radius:8px;background:#fff;color:#142744;font:inherit;cursor:pointer}.conversion-news button[type=submit]{background:#087b6c;color:white}.conversion-note{font-size:13px;color:#42536d}.conversion-preview summary{cursor:pointer;font-weight:700;min-height:44px;padding:10px 0}.conversion-answers{display:grid;gap:10px}.conversion-preview [role=status]{padding:14px;border-left:3px solid #087b6c}.conversion-news :focus-visible,.conversion-preview :focus-visible{outline:3px solid #087261;outline-offset:3px}#account-access{scroll-margin-top:140px}@media(max-width:600px){.conversion-news,.conversion-preview{padding:20px}.conversion-news form{flex-direction:column}.conversion-actions a{flex:1;min-width:130px}.topbar .unified-header nav{flex-wrap:wrap!important;overflow:visible!important;gap:4px 14px!important}.topbar .unified-header nav a{min-height:40px!important}}`;
  document.head.append(style);
  const nav = document.querySelector('header nav');
  if(nav && !path.startsWith('/programs/')) {
    for(const [label,mode] of [[t.signup,'signup'],[t.login,'login']]) {
      const a=document.createElement('a');a.href=account(mode);a.textContent=label;nav.append(a);
    }
  }
  if(path==='/') {
    document.querySelector('.hero h1').textContent=t.title;
    document.querySelector('.hero .lead').textContent=t.lead;
    const actions=document.querySelector('.hero .actions');
    actions.innerHTML='';
    for(const [label,url,secondary] of [[t.start,`/healthy-routines/?lang=${lang}#lesson-preview`,false],[t.signup,account('signup'),true]]){
      const a=document.createElement('a');a.className='conversion-link'+(secondary?' secondary':'');a.href=url;a.textContent=label;actions.append(a);
    }
    const newsletter=document.querySelector('.newsletter');
    if(newsletter){newsletter.id='newsletter';newsletter.querySelector('h2').textContent=t.news;newsletter.querySelector('h2').nextElementSibling.textContent=t.newsCopy;const note=document.createElement('p');note.className='conversion-note';note.textContent=t.consent;newsletter.querySelector('form').after(note);}
    const shortcut=document.createElement('a');shortcut.href='#newsletter';shortcut.className='conversion-link secondary';shortcut.textContent=t.subscribe;actions.append(shortcut);
  }
  if(path.startsWith('/healthy-routines/')) {
    const lesson=({en:window.COURSE_EN,es:window.COURSE_ES,pt:window.COURSE})[lang]?.[0]?.lessons?.[0];
    if(lesson){
      const box=document.createElement('section');box.className='conversion-preview';box.id='lesson-preview';
      const summary=document.createElement('details');summary.open=location.hash==='#lesson-preview';
      const label=document.createElement('summary');label.textContent=t.preview;summary.append(label);
      const add=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;summary.append(el);return el;};
      add('p',t.sample);add('h2',lesson[0]);add('p',lesson[1]);add('h3',t.example);add('p',lesson[2]);add('h3',lesson[3]);
      const answers=document.createElement('div');answers.className='conversion-answers';
      const response=document.createElement('p');response.setAttribute('role','status');response.textContent=t.feedback;
      lesson[4].forEach((answer,i)=>{const b=document.createElement('button');b.type='button';b.textContent=answer;b.onclick=()=>{response.textContent=lesson[5][i];window.gtag?.('event','lesson_preview_answer',{language:lang,answer_index:i});};answers.append(b);});summary.append(answers,response);
      add('p',lesson[7]||lesson[6]);const a=add('a',t.next);a.href=account('signup');a.className='conversion-link';box.append(summary);
      document.querySelector('.landing-intro-grid').before(box);
      // Resolve the deep link after the preview has been inserted.
      if(location.hash==='#lesson-preview')box.scrollIntoView();
    }
    const explain=document.createElement('p');explain.className='conversion-note';explain.textContent=t.local;document.querySelector('.landing-access')?.append(explain);
  }
  if(path.startsWith('/learn/')){
    const section=document.createElement('section');section.className='conversion-news';section.setAttribute('aria-label',t.news);
    const h=document.createElement('h2');h.textContent=t.news;const p=document.createElement('p');p.textContent=t.newsCopy;
    section.append(h,p);
    const form=document.createElement('form');form.setAttribute('data-upnext-newsletter','');
    const input=document.createElement('input');input.type='email';input.name='email';input.autocomplete='email';input.required=true;input.placeholder=t.email;input.setAttribute('aria-label',t.email);
    const button=document.createElement('button');button.type='submit';button.textContent=t.subscribe;form.append(input,button);
    const note=document.createElement('p');note.setAttribute('data-newsletter-note','');note.setAttribute('aria-live','polite');
    const consent=document.createElement('p');consent.className='conversion-note';consent.textContent=t.consent;section.append(form,note,consent);
    const a=document.createElement('a');a.href=`/healthy-routines/?lang=${lang}#lesson-preview`;a.className='conversion-link secondary';a.textContent=t.preview;section.append(a);
    document.querySelector('main').append(section);
    window.UPNEXT_FORMS_ENDPOINT='https://script.google.com/macros/s/AKfycbyiaO4qZfE160tF-N1zAI3M6tKvvl-0YffnxHTvCopw1DwWg-RGonG2QY2k4zCQ2f6i/exec';
    const script=document.createElement('script');script.src='/upnext-forms.js?v=20261021-conversion1';document.body.append(script);
  }
  if(path==='/dpp/'&&lang==='en') {
    const weight=document.getElementById('q-weight-unit'),height=document.getElementById('q-height-unit');
    if(weight&&!document.getElementById('q-weight').value)weight.value='lb';
    if(height&&!document.getElementById('q-height').value)height.value='in';
    const note=document.createElement('p');note.className='conversion-note';note.textContent=t.units;document.getElementById('qualification-form')?.prepend(note);
  }
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountConversionUX,{once:true});else mountConversionUX();
