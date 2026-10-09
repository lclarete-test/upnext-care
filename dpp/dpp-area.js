import { requireParticipant, getAllModuleStates, getCheckins, addCheckin, logout } from './dpp-firebase.js';

const track = (event, parameters = {}) => window.gtag?.('event', event, parameters);
const activeLanguage = window.DPPLanguage?.language || 'pt';
const t = value => window.DPPLanguage?.t(value) || value;
const locale = { en: 'en-US', es: 'es-US', pt: 'pt-BR' }[activeLanguage];

const session = await requireParticipant();
if (!session) throw new Error('Authentication required');
const { user, profile } = session;
document.getElementById('welcome').textContent = `Olá, ${(profile.name || user.displayName || 'participante').split(' ')[0]}`;
document.getElementById('date').value = new Date().toISOString().slice(0, 10);

const moduleStates = await getAllModuleStates(user.uid);
const list = document.getElementById('modules');
const onboardingComplete = moduleStates.get(0)?.completed === true;
const item = document.createElement('a');
item.className = `module${onboardingComplete ? ' complete' : ''}`;
item.href = 'dpp-modulo-0.html';
item.innerHTML = `<span class="module-number">${onboardingComplete ? '✓' : '00'}</span><div><h3>Boas-vindas e ponto de partida</h3><small>${onboardingComplete ? 'Concluído' : 'Disponível agora'}</small></div><span class="module-status">→</span>`;
list.append(item);
if (onboardingComplete) {
  const note = document.createElement('p');
  note.className = 'intro';
  note.textContent = 'Seu cadastro inicial está concluído. A equipe entrará em contato sobre o início do programa.';
  list.after(note);
}
const percent = onboardingComplete ? 100 : 0;
document.getElementById('progress-ring').style.setProperty('--progress', percent * 3.6 + 'deg');
document.getElementById('progress-value').textContent = percent + '%';

let checkins = await getCheckins(user.uid);
const dateKey = value => value?.slice?.(0, 10) || '';
function renderSummary() {
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const recent = checkins.filter(item => new Date(dateKey(item.date) + 'T12:00:00') >= sevenDaysAgo);
  const todayRecord = [...checkins].reverse().find(item => dateKey(item.date) === todayKey && item.steps);
  const stepDays = recent.filter(item => Number(item.steps) > 0);
  const averageSteps = stepDays.length ? Math.round(stepDays.reduce((sum, item) => sum + Number(item.steps), 0) / stepDays.length) : null;
  const activity = recent.reduce((sum, item) => sum + (Number(item.activity) || 0), 0);
  document.getElementById('today-steps').textContent = todayRecord ? Number(todayRecord.steps).toLocaleString(locale) : '—';
  document.getElementById('week-steps').textContent = averageSteps ? averageSteps.toLocaleString(locale) : '—';
  document.getElementById('week-activity').textContent = activity.toLocaleString(locale);
}
function render() {
  const chart = document.getElementById('chart');
  const history = document.getElementById('history');
  if (!checkins.length) {
    chart.innerHTML = '<div class="empty">Seus registros de peso aparecerão aqui.</div>';
    history.innerHTML = '';
    renderSummary();
    return;
  }
  const weights = checkins.filter(item => item.weight).slice(-8);
  if (weights.length) {
    const values = weights.map(item => item.weight);
    const min = Math.min(...values) - 1;
    const max = Math.max(...values) + 1;
    const points = values.map((value, index) => `${weights.length === 1 ? 50 : index / (weights.length - 1) * 100},${145 - (value - min) / (max - min) * 125}`).join(' ');
    chart.innerHTML = `<svg viewBox="0 0 100 150" preserveAspectRatio="none" aria-label="Evolução do peso"><polyline points="${points}" fill="none" stroke="#148f7a" stroke-width="2" vector-effect="non-scaling-stroke"/>${points.split(' ').map(point => { const [x, y] = point.split(','); return `<circle cx="${x}" cy="${y}" r="2.4" fill="#148f7a"/>`; }).join('')}</svg>`;
  } else {
    chart.innerHTML = '<div class="empty">Adicione um peso para iniciar o gráfico.</div>';
  }
  const stepsLabel = { en: 'steps', es: 'pasos', pt: 'passos' }[activeLanguage];
  history.innerHTML = checkins.slice(-4).reverse().map(item => `<div class="history-row"><span>${new Intl.DateTimeFormat(locale).format(new Date(dateKey(item.date) + 'T12:00:00'))} · ${Number(item.steps || 0).toLocaleString(locale)} ${stepsLabel} · ${item.activity || 0} min</span><span>${item.weight ? item.weight + ' kg' : '—'}</span></div>`).join('');
  renderSummary();
}
render();

document.getElementById('save').addEventListener('click', async event => {
  const date = document.getElementById('date').value;
  const weight = Number(document.getElementById('weight').value) || null;
  const activity = Number(document.getElementById('activity').value) || 0;
  const steps = Number(document.getElementById('steps').value) || 0;
  const sleep = Number(document.getElementById('sleep').value) || null;
  const note = document.getElementById('note').value.trim();
  if (!date || (!weight && !activity && !steps && !sleep && !note)) return;
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = t('Salvando…');
  const record = { date, weight, activity, steps, sleep, note, source: 'manual' };
  try {
    await addCheckin(user.uid, record);
    track('dpp_checkin_saved');
    checkins.push(record);
    document.getElementById('saved').classList.add('show');
    document.getElementById('weight').value = '';
    document.getElementById('activity').value = '';
    document.getElementById('steps').value = '';
    document.getElementById('sleep').value = '';
    document.getElementById('note').value = '';
    render();
  } finally {
    button.disabled = false;
    button.textContent = t('Salvar registro');
  }
});

const appleDialog = document.getElementById('apple-dialog');
document.getElementById('apple-options').addEventListener('click', () => appleDialog.showModal());
document.getElementById('close-apple').addEventListener('click', () => appleDialog.close());
document.getElementById('close-apple-bottom').addEventListener('click', () => appleDialog.close());
appleDialog.addEventListener('click', event => {
  if (event.target === appleDialog) appleDialog.close();
});

document.getElementById('logout').addEventListener('click', async () => {
  await logout();
  location.href = './#entrar';
});
