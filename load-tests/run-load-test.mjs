#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { cpus } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8080';
const TOTAL_VUS = Number(process.env.VUS || 500);
const DURATION_SECONDS = Number(process.env.DURATION_SECONDS || 60);
const RAMP_UP_SECONDS = Number(process.env.RAMP_UP_SECONDS || 30);
const USERNAME = process.env.LOAD_TEST_USER || 'admin_local';
const PASSWORD = process.env.LOAD_TEST_PASSWORD || '123456';
const OUTPUT = process.env.OUTPUT || 'load-tests/results/load-test-report.json';
const CPU_CORES = Math.max(1, cpus().length);

const PROFILE = {
  public: Math.round(TOTAL_VUS * 0.70),
  auth: Math.round(TOTAL_VUS * 0.20),
  orders: TOTAL_VUS - Math.round(TOTAL_VUS * 0.70) - Math.round(TOTAL_VUS * 0.20),
};

const results = {
  all: [],
  public: [],
  auth: [],
  orders: [],
};

const counters = {
  startedAt: new Date().toISOString(),
  requests: 0,
  errors: 0,
  byGroup: {
    public: { requests: 0, errors: 0 },
    auth: { requests: 0, errors: 0 },
    orders: { requests: 0, errors: 0 },
  },
};

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.min(Math.max(index, 0), sorted.length - 1)];
}

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function timedRequest(group, method, path, { token, body, expected = [200] } = {}) {
  const started = performance.now();
  let status = 0;
  let ok = false;
  let json = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    clearTimeout(timeout);

    status = response.status;
    ok = expected.includes(status);
    const text = await response.text();
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }
  } catch {
    ok = false;
  }

  const duration = performance.now() - started;
  results[group].push(duration);
  results.all.push(duration);
  counters.requests += 1;
  counters.byGroup[group].requests += 1;

  if (!ok) {
    counters.errors += 1;
    counters.byGroup[group].errors += 1;
  }

  return { ok, status, duration, json };
}

async function login(group) {
  const response = await timedRequest(group, 'POST', '/api/auth/login', {
    body: { loginOrEmail: USERNAME, password: PASSWORD },
    expected: [200],
  });
  return response.ok ? response.json?.token : null;
}

async function discoverFixture() {
  const eventsResponse = await timedRequest('public', 'GET', '/api/events', { expected: [200] });
  const events = Array.isArray(eventsResponse.json) ? eventsResponse.json : [];
  const eventId = events[0]?.id || 1;

  const sessionsResponse = await timedRequest('public', 'GET', `/api/sessions?eventId=${eventId}`, {
    expected: [200],
  });
  const sessions = Array.isArray(sessionsResponse.json) ? sessionsResponse.json : [];
  const sessionId = sessions[0]?.id || null;

  let ticketTypeId = null;
  if (sessionId) {
    const ticketResponse = await timedRequest('public', 'GET', `/api/sessions/${sessionId}/ticket-types`, {
      expected: [200],
    });
    const ticketTypes = Array.isArray(ticketResponse.json) ? ticketResponse.json : [];
    ticketTypeId = ticketTypes.find((item) => item.active !== false)?.id || ticketTypes[0]?.id || null;
  }

  return { eventId, sessionId, ticketTypeId };
}

async function publicScenario(deadline, fixture) {
  while (Date.now() < deadline) {
    await timedRequest('public', 'GET', '/api/events', { expected: [200] });
    await sleep(250);
    await timedRequest('public', 'GET', '/api/events?search=фестиваль', { expected: [200] });
    await sleep(250);
    await timedRequest('public', 'GET', `/api/events/${fixture.eventId}`, { expected: [200] });
    await sleep(150);
    await timedRequest('public', 'GET', `/api/sessions?eventId=${fixture.eventId}`, { expected: [200] });
    await sleep(150);
    await timedRequest('public', 'GET', '/api/events/platform-stats', { expected: [200] });
    await sleep(800 + Math.random() * 1200);
  }
}

async function authScenario(deadline) {
  while (Date.now() < deadline) {
    const token = await login('auth');
    if (token) {
      await sleep(250);
      await timedRequest('auth', 'GET', '/api/users/me', { token, expected: [200] });
      await sleep(250);
      await timedRequest('auth', 'GET', '/api/favorites/my', { token, expected: [200] });
      await sleep(150);
      await timedRequest('auth', 'GET', '/api/notifications', { token, expected: [200] });
    }
    await sleep(1000 + Math.random() * 1500);
  }
}

async function orderScenario(deadline, fixture, vuIndex) {
  let iteration = 0;
  while (Date.now() < deadline) {
    const token = await login('orders');
    if (token) {
      await sleep(250);
      await timedRequest('orders', 'GET', '/api/orders/my', { token, expected: [200] });
      await sleep(250);
      await timedRequest('orders', 'GET', '/api/tickets/my', { token, expected: [200] });
      await sleep(250);
      await timedRequest('orders', 'GET', `/api/events/${fixture.eventId}`, { token, expected: [200] });

      const shouldCreateOrder = fixture.sessionId && fixture.ticketTypeId && vuIndex < 5 && iteration === 0;
      if (shouldCreateOrder) {
        await sleep(250);
        await timedRequest('orders', 'POST', '/api/orders', {
          token,
          body: {
            sessionId: fixture.sessionId,
            items: [{ ticketTypeId: fixture.ticketTypeId, quantity: 1 }],
            currency: 'RUB',
            paymentProvider: 'mock',
          },
          expected: [201, 400],
        });
      }
    }
    iteration += 1;
    await sleep(1500 + Math.random() * 2000);
  }
}

function findServerPid() {
  try {
    const port = new URL(BASE_URL).port || '80';
    const output = execFileSync('lsof', ['-ti', `:${port}`], { encoding: 'utf8' }).trim();
    return output.split('\n')[0] || null;
  } catch {
    return null;
  }
}

function readProcessSample(pid) {
  if (!pid) return null;
  try {
    const output = execFileSync('ps', ['-p', pid, '-o', '%cpu=,%mem=,rss='], { encoding: 'utf8' }).trim();
    const [cpu, mem, rss] = output.split(/\s+/).map(Number);
    return { cpuRaw: cpu, cpu: cpu / CPU_CORES, mem, rssMb: rss / 1024 };
  } catch {
    return null;
  }
}

async function sampleProcess(pid, deadline, samples) {
  while (Date.now() < deadline) {
    const sample = readProcessSample(pid);
    if (sample) samples.push({ at: new Date().toISOString(), ...sample });
    await sleep(1000);
  }
}

async function runWithRamp(worker, startDelayMs) {
  if (startDelayMs > 0) {
    await sleep(startDelayMs);
  }
  await worker();
}

function buildStats(values) {
  return {
    count: values.length,
    avgMs: Math.round(average(values)),
    p90Ms: Math.round(percentile(values, 90)),
    p95Ms: Math.round(percentile(values, 95)),
    maxMs: Math.round(Math.max(0, ...values)),
  };
}

async function main() {
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Profile: ${TOTAL_VUS} VU = ${PROFILE.public} public / ${PROFILE.auth} auth / ${PROFILE.orders} orders`);
  console.log(`Duration: ${DURATION_SECONDS}s, ramp-up: ${RAMP_UP_SECONDS}s`);

  const fixture = await discoverFixture();
  console.log(`Fixture: event=${fixture.eventId}, session=${fixture.sessionId ?? 'n/a'}, ticketType=${fixture.ticketTypeId ?? 'n/a'}`);

  counters.requests = 0;
  counters.errors = 0;
  for (const group of Object.keys(counters.byGroup)) {
    counters.byGroup[group].requests = 0;
    counters.byGroup[group].errors = 0;
    results[group].length = 0;
  }
  results.all.length = 0;

  const pid = findServerPid();
  const processSamples = [];
  const deadline = Date.now() + DURATION_SECONDS * 1000;
  const workers = [];

  const rampMs = RAMP_UP_SECONDS * 1000;
  for (let i = 0; i < PROFILE.public; i += 1) {
    workers.push(runWithRamp(() => publicScenario(deadline, fixture), (i / Math.max(1, PROFILE.public)) * rampMs));
  }
  for (let i = 0; i < PROFILE.auth; i += 1) {
    workers.push(runWithRamp(() => authScenario(deadline), (i / Math.max(1, PROFILE.auth)) * rampMs));
  }
  for (let i = 0; i < PROFILE.orders; i += 1) {
    workers.push(runWithRamp(() => orderScenario(deadline, fixture, i), (i / Math.max(1, PROFILE.orders)) * rampMs));
  }
  workers.push(sampleProcess(pid, deadline, processSamples));

  await Promise.all(workers);

  const cpuValues = processSamples.map((sample) => sample.cpu);
  const rssValues = processSamples.map((sample) => sample.rssMb);
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    totalVus: TOTAL_VUS,
    durationSeconds: DURATION_SECONDS,
    rampUpSeconds: RAMP_UP_SECONDS,
    profile: PROFILE,
    fixture,
    requests: counters.requests,
    errorRate: counters.requests ? counters.errors / counters.requests : 0,
    groups: {
      public: { ...buildStats(results.public), ...counters.byGroup.public },
      auth: { ...buildStats(results.auth), ...counters.byGroup.auth },
      orders: { ...buildStats(results.orders), ...counters.byGroup.orders },
      all: buildStats(results.all),
    },
    serverProcess: {
      pid,
      cpuCores: CPU_CORES,
      avgCpuPercent: Math.round(average(cpuValues)),
      maxCpuPercent: Math.round(Math.max(0, ...cpuValues)),
      avgMemoryMb: Math.round(average(rssValues)),
      maxMemoryMb: Math.round(Math.max(0, ...rssValues)),
      samples: processSamples,
    },
    thresholds: {
      responseTimeMs: 2000,
      errorRate: 0.01,
      cpuPercent: 80,
      memoryMb: 2048,
    },
  };

  mkdirSync(dirname(resolve(OUTPUT)), { recursive: true });
  writeFileSync(resolve(OUTPUT), `${JSON.stringify(report, null, 2)}\n`);

  console.log(JSON.stringify({
    requests: report.requests,
    errorRatePercent: +(report.errorRate * 100).toFixed(2),
    avgMs: report.groups.all.avgMs,
    p90Ms: report.groups.all.p90Ms,
    p95Ms: report.groups.all.p95Ms,
    maxCpuPercent: report.serverProcess.maxCpuPercent,
    maxMemoryMb: report.serverProcess.maxMemoryMb,
    output: resolve(OUTPUT),
  }, null, 2));

  process.exit(report.groups.all.p95Ms < 2000 && report.errorRate < 0.01 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
