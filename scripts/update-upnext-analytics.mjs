import { mkdir, writeFile } from "node:fs/promises";

const apiKey = process.env.POSTHOG_API_KEY;
if (!apiKey) throw new Error("POSTHOG_UPNEXT is not configured.");

const endpoint = "https://us.posthog.com/api/projects/657387/endpoints/upnext_product_daily/run?version=1";
const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: "{}",
});

if (!response.ok) {
  throw new Error(`PostHog request failed with HTTP ${response.status}.`);
}

const payload = await response.json();
const results = Array.isArray(payload.results) ? payload.results : [];
if (results.length !== 10) {
  throw new Error(`Expected 10 aggregate series, received ${results.length}.`);
}

const keys = [
  "pageviews",
  "daily_visitors",
  "article_clicks",
  "program_views",
  "signup_opens",
  "accounts_created",
  "logins",
  "learning_sessions",
  "lessons_started",
  "lessons_completed",
];

const totals = Object.fromEntries(results.map((series, index) => [
  keys[index],
  Number(series.count || 0),
]));

const days = Array.isArray(results[0].days) ? results[0].days : [];
const daily = days.map((date, dayIndex) => {
  const row = { date };
  results.forEach((series, seriesIndex) => {
    row[keys[seriesIndex]] = Number(series.data?.[dayIndex] || 0);
  });
  return row;
});

const snapshot = {
  schema_version: 1,
  updated_at: new Date().toISOString(),
  timezone: payload.timezone || "America/New_York",
  window: "Last 30 days plus today",
  source: "PostHog aggregate endpoint",
  privacy: "Aggregate counts only; no person-level fields.",
  totals,
  daily,
};

await mkdir("analytics", { recursive: true });
await writeFile("analytics/live.json", JSON.stringify(snapshot, null, 2) + "\n");
