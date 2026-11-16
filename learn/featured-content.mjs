// Editorial order for the weekly feature. Add a published article slug here
// to include it in the rotation. Weeks begin Monday in New York.
export const FEATURED_ARTICLES = [
  'a1c-test-fasting',
  'type-2-diabetes-without-symptoms',
  'what-type-2-diabetes-does-to-your-body',
  'waking-up-at-night',
  'tired-after-sleep-sleep-apnea'
];
export function featuredSlug(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric'
  }).formatToParts(date);
  const value = type => Number(parts.find(p => p.type === type).value);
  const day = Date.UTC(value('year'), value('month') - 1, value('day'));
  const week = Math.max(0, Math.floor((day - Date.UTC(2026, 10, 16)) / 604800000));
  return FEATURED_ARTICLES[week % FEATURED_ARTICLES.length];
}
export function mountFeatured(root, date = new Date()) {
  const feature = root.querySelector('[data-weekly-feature]');
  if (!feature) return;
  const cards = [...root.querySelectorAll('.library .card')];
  const slug = featuredSlug(date);
  const chosen = cards.find(card => card.querySelector('h2 a')?.getAttribute('href')?.split('/').includes(slug)) || cards[0];
  if (!chosen) return;
  const articleLink = chosen.querySelector('h2 a');
  const category = chosen.querySelector('.number')?.textContent.split('·').slice(1).join('·').trim();
  const readTime = chosen.querySelector('.read')?.textContent.split('·').slice(1).join('·').trim();
  const title = feature.querySelector('[data-feature-title]');
  title.textContent = articleLink.textContent;
  title.setAttribute('href', articleLink.getAttribute('href'));
  feature.querySelector('[data-feature-description]').textContent = chosen.querySelector('p')?.textContent || '';
  feature.querySelector('[data-feature-meta]').textContent = [category, readTime].filter(Boolean).join(' · ');
  feature.querySelector('[data-feature-read]').setAttribute('href', articleLink.getAttribute('href'));
  cards.forEach(card => { delete card.dataset.featured; });
  chosen.dataset.featured = 'true';
  const filter = root.querySelector('[data-filter][aria-pressed="true"]')?.dataset.filter;
  cards.forEach(card => {
    card.hidden = card === chosen || (!!filter && filter !== 'All articles' && card.dataset.category !== filter);
  });
}
if (typeof document !== 'undefined') mountFeatured(document);
