import { requireParticipant, getAllModuleStates, getCheckins, addCheckin, logout } from './dpp-firebase.js';

const track = (event, parameters = {}) => window.gtag?.('event', event, parameters);
const activeLanguage = window.DPPLanguage?.language || 'pt';
const t = value => window.DPPLanguage?.t(value) || value;
const locale = { en: 'en-US', es: 'es-US', pt: 'pt-BR' }[activeLanguage];
const ui = {
  en: { locked: 'Locked until the program begins', moduleOneIntro: 'Learn how the program works, its weight and activity goals, and how to establish your starting point.', metric: 'Chart metric', steps: 'Steps', activity: 'Physical activity', weight: 'Weight', empty: 'Add records to see your progress.' },
  es: { locked: 'Bloqueado hasta el inicio del programa', moduleOneIntro: 'Conozca cómo funciona el programa, sus metas de peso y actividad, y cómo establecer su punto de partida.', metric: 'Métrica del gráfico', steps: 'Pasos', activity: 'Actividad física', weight: 'Peso', empty: 'Agregue registros para ver su progreso.' },
  pt: { locked: 'Bloqueado até o início do programa', moduleOneIntro: 'Conheça o funcionamento do programa, as metas de peso e atividade física e seu ponto de partida.', metric: 'Métrica do gráfico', steps: 'Passos', activity: 'Atividade física', weight: 'Peso', empty: 'Adicione registros para visualizar sua evolução.' }
}[activeLanguage];

const session = await requireParticipant();
if (!session) throw new Error('Authentication required');
const { user, profile } = session;
document.getElementById('welcome').textContent = `Olá, ${(profile.name || user.displayName || 'participante').split(' ')[0]}`;
document.getElementById('date').value = new Date().toISOString().slice(0, 10);

const moduleStates = await getAllModuleStates(user.uid);
const list = document.getElementById('modules');
list.closest('.panel').querySelector('.intro').textContent = {
  en: 'Module 0 is available now. You can preview the full curriculum below; upcoming modules remain locked until the program begins.',
  es: 'El Módulo 0 está disponible ahora. Puede explorar todo el currículo; los próximos módulos seguirán bloqueados hasta el inicio del programa.',
  pt: 'O Módulo 0 está disponível agora. Você pode visualizar todo o currículo abaixo; os próximos módulos permanecem bloqueados até o início do programa.'
}[activeLanguage];
const onboardingComplete = moduleStates.get(0)?.completed === true;
const item = document.createElement('a');
item.className = `module${onboardingComplete ? ' complete' : ''}`;
item.href = 'dpp-modulo-0.html';
item.innerHTML = `<span class="module-number">${onboardingComplete ? '✓' : '00'}</span><div><h3>Boas-vindas e ponto de partida</h3><small>${onboardingComplete ? 'Concluído' : 'Disponível agora'}</small></div><span class="module-status">→</span>`;
list.append(item);
const moduleOne = {
  title: t('Introdução ao programa'),
  intro: ui.moduleOneIntro
};
for (let number = 1; number <= 26; number += 1) {
  const data = number === 1 ? moduleOne : window.DPP_MODULES?.[number];
  if (!data) continue;
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'module locked';
  card.setAttribute('aria-expanded', 'false');
  card.innerHTML = `<span class="module-number">${String(number).padStart(2, '0')}</span><div><h3>${data.title}</h3><small>${ui.locked}</small><p class="module-preview">${data.intro}</p></div><span class="module-status" aria-hidden="true">🔒</span>`;
  card.addEventListener('click', () => {
    const expanded = card.getAttribute('aria-expanded') === 'true';
    card.setAttribute('aria-expanded', String(!expanded));
  });
  list.append(card);
}
const completedCount = [...moduleStates.values()].filter(state => state.completed === true).length;
const percent = Math.round(completedCount / 27 * 100);
document.getElementById('progress-ring').style.setProperty('--progress', percent * 3.6 + 'deg');
document.getElementById('progress-value').textContent = percent + '%';

let checkins = await getCheckins(user.uid);
const checkinPanel = document.querySelector('.checkin');
const applePanel = document.getElementById('apple-options')?.closest('.panel');
const summary = applePanel?.querySelector('.summary');
if (summary) checkinPanel.insertBefore(summary, checkinPanel.querySelector('.fields'));
applePanel?.remove();
document.getElementById('apple-dialog')?.remove();
const chart = document.getElementById('chart');
const metricSwitch = document.createElement('div');
metricSwitch.className = 'metric-switch';
metricSwitch.setAttribute('role', 'group');
metricSwitch.setAttribute('aria-label', ui.metric);
metricSwitch.innerHTML = `<button type="button" data-metric="steps" aria-pressed="true">${ui.steps}</button><button type="button" data-metric="activity" aria-pressed="false">${ui.activity}</button><button type="button" data-metric="weight" aria-pressed="false">${ui.weight}</button>`;
chart.before(metricSwitch);
const trackingFields = checkinPanel.querySelector('.fields');
const history = document.getElementById('history');
checkinPanel.insertBefore(metricSwitch, trackingFields);
checkinPanel.insertBefore(chart, trackingFields);
checkinPanel.insertBefore(history, trackingFields);
const entryTitle = document.createElement('h3');
entryTitle.className = 'entry-title';
entryTitle.textContent = { en: 'Add a record', es: 'Agregar un registro', pt: 'Adicionar registro' }[activeLanguage];
trackingFields.before(entryTitle);
let activeMetric = 'steps';
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
function renderChart() {
  const config = {
    steps: { key: 'steps', label: ui.steps, unit: '', color: '#148f7a' },
    activity: { key: 'activity', label: ui.activity, unit: ' min', color: '#4a6fa5' },
    weight: { key: 'weight', label: ui.weight, unit: ' kg', color: '#c26b43' }
  }[activeMetric];
  const records = checkins.filter(item => Number(item[config.key]) > 0).slice(-10);
  if (!records.length) {
    chart.innerHTML = `<div class="empty">${ui.empty}</div>`;
    return;
  }
  const values = records.map(item => Number(item[config.key]));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, Math.max(max * .08, 1));
  const points = values.map((value, index) => `${records.length === 1 ? 50 : 6 + index / (records.length - 1) * 88},${132 - (value - min) / span * 96}`).join(' ');
  const last = values.at(-1);
  chart.innerHTML = `<div class="chart-heading"><span>${config.label}</span><strong>${last.toLocaleString(locale)}${config.unit}</strong></div><svg viewBox="0 0 100 150" preserveAspectRatio="none" role="img" aria-label="${config.label}"><defs><linearGradient id="metric-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${config.color}" stop-opacity=".24"/><stop offset="1" stop-color="${config.color}" stop-opacity="0"/></linearGradient></defs><polygon points="6,140 ${points} 94,140" fill="url(#metric-fill)"/><polyline points="${points}" fill="none" stroke="${config.color}" stroke-width="2.5" vector-effect="non-scaling-stroke"/>${points.split(' ').map(point => { const [x, y] = point.split(','); return `<circle cx="${x}" cy="${y}" r="2.6" fill="${config.color}"/>`; }).join('')}</svg><div class="chart-dates"><span>${new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(dateKey(records[0].date) + 'T12:00:00'))}</span><span>${new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(dateKey(records.at(-1).date) + 'T12:00:00'))}</span></div>`;
}
function render() {
  if (!checkins.length) {
    history.innerHTML = '';
    renderSummary();
    renderChart();
    return;
  }
  const stepsLabel = { en: 'steps', es: 'pasos', pt: 'passos' }[activeLanguage];
  history.innerHTML = checkins.slice(-4).reverse().map(item => `<div class="history-row"><span>${new Intl.DateTimeFormat(locale).format(new Date(dateKey(item.date) + 'T12:00:00'))} · ${Number(item.steps || 0).toLocaleString(locale)} ${stepsLabel} · ${item.activity || 0} min</span><span>${item.weight ? item.weight + ' kg' : '—'}</span></div>`).join('');
  renderSummary();
  renderChart();
}
metricSwitch.addEventListener('click', event => {
  const button = event.target.closest('[data-metric]');
  if (!button) return;
  activeMetric = button.dataset.metric;
  metricSwitch.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  renderChart();
});
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

document.getElementById('logout').addEventListener('click', async () => {
  await logout();
  location.href = './#entrar';
});
