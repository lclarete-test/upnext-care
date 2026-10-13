import { mkdir, writeFile } from "node:fs/promises";

const apiKey = process.env.POSTHOG_API_KEY;
if (!apiKey) throw new Error("POSTHOG_UPNEXT is not configured.");

const endpoints = {
  product: "https://us.posthog.com/api/projects/657387/endpoints/upnext_product_daily/run?version=1",
  devices: "https://us.posthog.com/api/projects/657387/endpoints/upnext_device_daily/run?version=1",
};

async function runEndpoint(url) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (!response.ok) throw new Error(`PostHog request failed with HTTP ${response.status}.`);
  return response.json();
}

const [payload, devicePayload] = await Promise.all([
  runEndpoint(endpoints.product),
  runEndpoint(endpoints.devices),
]);

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

const deviceResults = Array.isArray(devicePayload.results) ? devicePayload.results : [];
const devices = deviceResults.map((series) => ({
  device: String(series.label || series.breakdown_value?.[0] || "Unknown"),
  pageviews: Number(series.count || 0),
  daily: (Array.isArray(series.days) ? series.days : []).map((date, index) => ({
    date,
    pageviews: Number(series.data?.[index] || 0),
  })),
}));

const snapshot = {
  schema_version: 2,
  updated_at: new Date().toISOString(),
  timezone: payload.timezone || "America/New_York",
  window: "Last 30 days plus today",
  source: "PostHog aggregate endpoints",
  privacy: "Aggregate counts only; no person-level fields.",
  refresh_minutes: 15,
  totals,
  daily,
  devices,
  session_replay: {
    enabled_at: "2026-10-13T13:48:06Z",
    sample_rate: 1,
    minimum_duration_seconds: 5,
    retention_days: 30,
    inputs_masked: true,
    historical_backfill: false
  }
};

await mkdir("analytics", { recursive: true });
await writeFile("analytics/live.json", JSON.stringify(snapshot, null, 2) + "\n");
