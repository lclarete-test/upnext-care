import {
  auth,
  createEmailAccount,
  loginWithEmail,
  loginWithGoogle,
  sendVerification,
  sendReset,
  saveEnrollment,
  getProfile,
  logout,
  authMessage
} from './dpp-firebase.js';

const track = (event, parameters = {}) => window.gtag?.('event', event, parameters);

const steps = [...document.querySelectorAll('.form-step')];
const bars = [...document.querySelectorAll('.stepper span')];
let current = 0;
let lastScreen = null;

const eligibilityPanel = document.getElementById('eligibility-panel');
const loginPanel = document.getElementById('login-panel');

function showAccessMode(mode) {
  const login = mode === 'login';
  eligibilityPanel.hidden = login;
  loginPanel.hidden = !login;
  document.getElementById('participar').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('show-login').addEventListener('click', () => {
  history.replaceState(null, '', '#entrar');
  showAccessMode('login');
});
document.getElementById('show-eligibility').addEventListener('click', () => {
  history.replaceState(null, '', '#participar');
  showAccessMode('eligibility');
});
window.addEventListener('hashchange', () => showAccessMode(location.hash === '#entrar' ? 'login' : 'eligibility'));
if (location.hash === '#entrar') showAccessMode('login');

function showStep(number) {
  current = number;
  steps.forEach((step, index) => step.classList.toggle('active', index === number));
  bars.forEach((bar, index) => bar.classList.toggle('active', index <= number));
  document.getElementById('participar').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function message(id, text, good = false) {
  const element = document.getElementById(id);
  element.textContent = text;
  element.classList.toggle('show', Boolean(text));
  element.classList.toggle('good', good);
  element.classList.toggle('bad', !good);
}

function setBusy(button, busy, label) {
  if (!button.dataset.label) button.dataset.label = button.textContent;
  button.disabled = busy;
  button.textContent = busy ? label : button.dataset.label;
}

function bmi() {
  const weight = Number(document.getElementById('q-weight').value);
  const height = Number(document.getElementById('q-height').value);
  const kg = document.getElementById('q-weight-unit').value === 'lb' ? weight * .45359237 : weight;
  const meters = document.getElementById('q-height-unit').value === 'in' ? height * .0254 : height / 100;
  return kg / (meters * meters);
}

function enrollmentData(user) {
  const name = document.getElementById('q-name').value.trim();
  const contactEmail = document.getElementById('q-email').value.trim().toLowerCase();
  const zipCode = document.getElementById('q-zip').value.trim();
  const registration = {
    cadastro_id: crypto.randomUUID(),
    data_hora: new Date().toISOString(),
    screener_id: lastScreen.screener_id,
    status: 'Novo contato',
    nome_completo: name,
    email: user.email,
    email_contato: contactEmail,
    telefone: document.getElementById('q-phone').value.trim(),
    zip_code: zipCode,
    idioma_preferido: window.DPPLanguage?.language || 'pt',
    forma_contato: document.getElementById('q-phone').value.trim() ? 'E-mail e WhatsApp' : 'E-mail',
    formato_programa: 'Online',
    disponibilidade: '',
    necessidade_acessibilidade: '',
    exame_informado: document.querySelector('[name="q-lab"]:checked').value,
    tipo_exame: document.getElementById('q-lab-type').value,
    resultado_exame: document.getElementById('q-lab-result').value.trim(),
    consentimento_contato: 'Sim'
  };
  const profile = {
    name,
    contactEmail,
    phone: registration.telefone,
    zipCode
  };
  return { profile, registration };
}

function validateEnrollment(requirePassword = false) {
  message('q-error-1', '');
  const name = document.getElementById('q-name').value.trim();
  const email = document.getElementById('q-email').value.trim().toLowerCase();
  const zip = document.getElementById('q-zip').value.trim();
  const password = document.getElementById('q-password').value;
  if (!name || !email.includes('@') || !zip || !document.getElementById('q-consent').checked) {
    message('q-error-1', 'Preencha nome, e-mail e ZIP Code e confirme a autorização.');
    return false;
  }
  if (requirePassword && password.length < 6) {
    message('q-error-1', 'Crie uma senha com pelo menos 6 caracteres.');
    return false;
  }
  return true;
}

document.getElementById('calculate').addEventListener('click', () => {
  message('q-error-0', '');
  const age = Number(document.getElementById('q-age').value);
  const weight = Number(document.getElementById('q-weight').value);
  const height = Number(document.getElementById('q-height').value);
  if (!age || !weight || !height) {
    message('q-error-0', 'Preencha idade, peso e altura para continuar.');
    return;
  }
  const asian = document.querySelector('[name="q-asian"]:checked').value === 'sim';
  const value = bmi();
  const threshold = asian ? 23 : 25;
  const eligible = value >= threshold;
  lastScreen = {
    screener_id: crypto.randomUUID(),
    data_hora: new Date().toISOString(),
    idade: age,
    peso: weight,
    unidade_peso: document.getElementById('q-weight-unit').value,
    altura: height,
    unidade_altura: document.getElementById('q-height-unit').value,
    identifica_asiatico: asian ? 'Sim' : 'Não',
    imc: Number(value.toFixed(1)),
    limite_imc: threshold,
    elegivel: eligible ? 'Sim' : 'Não',
    origem: '/dpp/'
  };
  document.getElementById('bmi-result').innerHTML = `Seu IMC calculado é <strong>${value.toFixed(1)}</strong>.`;
  document.getElementById('eligible-copy').hidden = !eligible;
  document.getElementById('not-eligible-copy').hidden = eligible;
  track('dpp_screener_completed');
  showStep(1);
});

document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => showStep(0)));

document.getElementById('register').addEventListener('click', async event => {
  if (!validateEnrollment(true)) return;
  const button = event.currentTarget;
  setBusy(button, true, 'Criando acesso…');
  try {
    const name = document.getElementById('q-name').value.trim();
    const email = document.getElementById('q-email').value.trim().toLowerCase();
    const password = document.getElementById('q-password').value;
    const user = await createEmailAccount(email, password, name);
    const { profile, registration } = enrollmentData(user);
    await saveEnrollment(user, profile, lastScreen, registration);
    await window.UpNextForms?.mirrorEnrollment(lastScreen, registration);
    await sendVerification(user);
    await logout();
    track('sign_up', { method: 'email' });
    document.getElementById('registration-result').innerHTML = '<strong>Cadastro recebido.</strong><br>Enviamos um link de confirmação para o seu e-mail. Confirme o endereço e depois entre no programa.';
    showStep(2);
  } catch (error) {
    message('q-error-1', authMessage(error));
  } finally {
    setBusy(button, false, '');
  }
});

document.getElementById('register-google').addEventListener('click', async event => {
  if (!validateEnrollment(false)) return;
  const button = event.currentTarget;
  setBusy(button, true, 'Abrindo o Google…');
  try {
    const credential = await loginWithGoogle();
    const { profile, registration } = enrollmentData(credential.user);
    await saveEnrollment(credential.user, profile, lastScreen, registration);
    await window.UpNextForms?.mirrorEnrollment(lastScreen, registration);
    track('sign_up', { method: 'google' });
    location.href = 'dpp-area.html';
  } catch (error) {
    message('q-error-1', authMessage(error));
  } finally {
    setBusy(button, false, '');
  }
});

document.getElementById('login-form').addEventListener('submit', async event => {
  event.preventDefault();
  message('login-error', '');
  message('login-success', '');
  const button = event.currentTarget.querySelector('[type="submit"]');
  setBusy(button, true, 'Entrando…');
  try {
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    const credential = await loginWithEmail(email, password);
    if (!credential.user.emailVerified) {
      await sendVerification(credential.user);
      await logout();
      message('login-success', 'Confirme seu e-mail antes de entrar. Enviamos um novo link de verificação.', true);
      return;
    }
    const profile = await getProfile(credential.user.uid);
    if (!profile) {
      await logout();
      message('login-error', 'Este e-mail ainda não concluiu a pré-qualificação e o cadastro.');
      return;
    }
    track('login', { method: 'email' });
    location.href = 'dpp-area.html';
  } catch (error) {
    message('login-error', authMessage(error));
  } finally {
    setBusy(button, false, '');
  }
});

document.getElementById('login-google').addEventListener('click', async event => {
  message('login-error', '');
  const button = event.currentTarget;
  setBusy(button, true, 'Abrindo o Google…');
  try {
    const credential = await loginWithGoogle();
    const profile = await getProfile(credential.user.uid);
    if (!profile) {
      await logout();
      message('login-error', 'Faça a pré-qualificação e o cadastro antes do primeiro acesso.');
      return;
    }
    track('login', { method: 'google' });
    location.href = 'dpp-area.html';
  } catch (error) {
    message('login-error', authMessage(error));
  } finally {
    setBusy(button, false, '');
  }
});

document.getElementById('forgot-password').addEventListener('click', async () => {
  message('login-error', '');
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  if (!email.includes('@')) {
    message('login-error', 'Digite seu e-mail para receber o link de recuperação.');
    return;
  }
  try {
    await sendReset(email);
    message('login-success', 'Enviamos um link para você criar uma nova senha.', true);
  } catch (error) {
    message('login-error', authMessage(error));
  }
});

const params = new URLSearchParams(location.search);
if (params.has('verifique')) message('login-success', 'Confirme seu e-mail antes de entrar. Enviamos um novo link de verificação.', true);
if (params.has('email_verificado')) message('login-success', 'E-mail confirmado. Agora você já pode entrar.', true);
if (params.has('cadastro')) message('login-error', 'Faça a pré-qualificação e conclua o cadastro antes do primeiro acesso.');

if (auth.currentUser) {
  const profile = await getProfile(auth.currentUser.uid).catch(() => null);
  if (profile && auth.currentUser.emailVerified) location.href = 'dpp-area.html';
}
