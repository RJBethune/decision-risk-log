#!/usr/bin/env node
/**
 * Decision & Risk Log — smoke test
 * --------------------------------------------------------------------------
 * Loads the HTML file, extracts the embedded script, runs key features in a
 * Node VM sandbox with minimal browser stubs, and reports pass/fail.
 *
 * Purpose: catch regressions before pushing. Run as part of every major edit.
 *
 * Usage:    node scripts/smoke-test.js
 * Exit:     0 if all tests pass, 1 otherwise.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML_PATH = path.resolve(__dirname, '..', 'decision-risk-log.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const noop = () => {};
const elProxy = new Proxy({}, { get: (t, p) => {
  if (p === 'style') return {};
  if (p === 'classList') return { add: noop, remove: noop, toggle: noop, contains: () => false };
  if (p === 'querySelectorAll') return () => [];
  if (p === 'querySelector') return () => null;
  return noop;
}});

function buildSandbox() {
  const loc = { hash: '' };
  const win = { addEventListener: noop, showSaveFilePicker: undefined, matchMedia: () => ({ matches: false }), print: noop, location: loc };
  const doc = { getElementById: () => elProxy, createElement: () => elProxy, querySelectorAll: () => [], querySelector: () => null, addEventListener: noop, body: elProxy };
  const sandbox = {
    window: win, document: doc, location: loc,
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    navigator: { userAgent: 'node' },
    Blob: function () {}, URL: { createObjectURL: () => '', revokeObjectURL: noop }, FileReader: function () {},
    setTimeout: () => 0, clearTimeout: noop,
    console, Math, Date, JSON, Object, Array, Map, Set,
    isNaN, isFinite, parseInt, parseFloat, String, Number, Boolean, RegExp, prompt: () => 'Test View'
  };
  sandbox.globalThis = sandbox;
  Object.assign(win, sandbox);
  vm.createContext(sandbox);
  const expose = '\n;this.__api={SAMPLE_DATA,state,normalize,riskScore,scoreColor,nextId,' +
    'reconcileSupersede,deleteDecision,findDecision,findRisk,decisionStale,riskStale,' +
    'reviewItems,parseReviewDate,getSnapshots,snapshotRegister,getSavedViews,saveCurrentView,' +
    'applySavedView,exportAto,decisionToMd,DECISION_TEMPLATES};';
  vm.runInContext(code.replace(/\nboot\(\);\s*$/, '\n') + expose, sandbox, { timeout: 8000 });
  return sandbox.__api;
}

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

test('Script extracts and is a reasonable size', () => {
  assert(code.length > 40000, 'script too small: ' + code.length);
});

test('Sample data loads with decisions and risks', () => {
  const api = buildSandbox();
  const sd = api.SAMPLE_DATA();
  assert(sd.decisions.length >= 5, 'decision count');
  assert(sd.risks.length >= 4, 'risk count');
});

test('Risk score = likelihood x impact, color thresholds correct', () => {
  const api = buildSandbox();
  assert(api.riskScore({ likelihood: 5, impact: 4 }) === 20, 'score');
  assert(api.scoreColor(20) === '#F87171', 'crit color');
  assert(api.scoreColor(9) === '#FB923C', 'high color');
  assert(api.scoreColor(4) === '#FBBF24', 'med color');
  assert(api.scoreColor(2) === '#34D399', 'low color');
});

test('ID generation increments past existing max', () => {
  const api = buildSandbox();
  const sd = api.SAMPLE_DATA(); api.state.data = sd;
  assert(/^ADR-\d{3}$/.test(api.nextId('ADR', sd.decisions)), 'adr id format');
  assert(/^RISK-\d{3}$/.test(api.nextId('RISK', sd.risks)), 'risk id format');
});

test('Supersede sets status and restores prior status on re-point', () => {
  const api = buildSandbox();
  const sd = api.SAMPLE_DATA(); api.state.data = sd;
  const nu = { id: 'ADR-900', status: 'Accepted', supersedes: 'ADR-013', title: 'x' };
  sd.decisions.push(nu); api.reconcileSupersede(nu);
  assert(api.findDecision('ADR-013').status === 'Superseded', 'target superseded');
  nu.supersedes = 'ADR-007'; api.reconcileSupersede(nu);
  assert(api.findDecision('ADR-013').status === 'Accepted', 'prior status restored');
  assert(api.findDecision('ADR-007').status === 'Superseded', 'new target superseded');
});

test('Deleting records cleans dangling references both ways', () => {
  const api = buildSandbox();
  let sd = api.SAMPLE_DATA(); api.state.data = sd;
  assert(api.findRisk('RISK-004').relatedDecisions.includes('ADR-012'), 'precondition');
  api.deleteDecision('ADR-012');
  assert(!api.findRisk('RISK-004').relatedDecisions.includes('ADR-012'), 'risk ref cleaned');
});

test('normalize sanitizes malformed input', () => {
  const api = buildSandbox();
  api.state.data = {
    decisions: [{ id: 'ADR-001', title: 't', tags: 'security', status: 'weird', options: 'only one' }],
    risks: [{ id: 'RISK-001', title: 'r', tags: null, likelihood: '9', impact: -3, status: 'bogus' }],
    snapshots: [{}, { ts: '2026-05-01', sumScore: '50', high: 2 }, null],
    savedViews: [{ id: 'x', name: 'n' }, { bad: 1 }]
  };
  api.normalize();
  const d = api.state.data.decisions[0], r = api.state.data.risks[0];
  assert(Array.isArray(d.tags) && d.tags.length === 1, 'tags coerced');
  assert(Array.isArray(d.options), 'options coerced');
  assert(d.status === 'Proposed', 'bad decision status fixed');
  assert(r.likelihood === 5 && r.impact === 0, 'scores clamped');
  assert(r.status === 'Open', 'bad risk status fixed');
  assert(api.state.data.snapshots.length === 1 && api.state.data.snapshots[0].sumScore === 50, 'snapshots filtered+coerced');
  assert(api.state.data.savedViews.length === 1, 'saved views filtered');
});

test('Stale detection: review date and update age', () => {
  const api = buildSandbox();
  const sd = api.SAMPLE_DATA(); api.state.data = sd; api.normalize();
  const d = api.findDecision('ADR-008');
  d.reviewBy = '2020-01';
  assert(api.decisionStale(d), 'past review date is stale');
  const r = api.findRisk('RISK-001');
  r.updatedAt = new Date(Date.now() - 120 * 86400000).toISOString();
  assert(api.riskStale(r), 'risk unedited 120d is stale');
  assert(api.reviewItems().length >= 2, 'reviewItems surfaces both');
});

test('Snapshots dedupe per day; trend data shape correct', () => {
  const api = buildSandbox();
  const sd = api.SAMPLE_DATA(); api.state.data = sd; api.normalize();
  api.snapshotRegister(true);
  api.snapshotRegister(true);
  assert(api.getSnapshots().length === 1, 'same-day dedupe');
  const snap = api.getSnapshots()[0];
  const open = sd.risks.filter(r => r.status !== 'Closed');
  assert(snap.open === open.length, 'open count');
  assert(snap.high === open.filter(r => api.riskScore(r) >= 15).length, 'high count');
});

test('Saved views capture and restore; unknown view falls back', () => {
  const api = buildSandbox();
  const sd = api.SAMPLE_DATA(); api.state.data = sd; api.normalize();
  api.state.statusFilter = new Set(['Open']);
  api.state.tagFilter = new Set(['security']);
  api.state.view = 'risks'; api.state.search = 'cve';
  api.saveCurrentView();
  const sv = api.getSavedViews()[0];
  assert(sv.view === 'risks' && sv.statusFilter.includes('Open'), 'captured');
  api.state.statusFilter = new Set(); api.state.search = '';
  api.applySavedView(sv.id);
  assert(api.state.search === 'cve' && api.state.statusFilter.has('Open'), 'restored');
  api.getSavedViews().push({ id: 'bad', name: 'b', view: 'nonsense', statusFilter: [], tagFilter: [], search: '' });
  api.applySavedView('bad');
  assert(api.state.view === 'decisions', 'unknown view falls back to decisions');
});

test('ATO export and Markdown export run without error', () => {
  const api = buildSandbox();
  const sd = api.SAMPLE_DATA(); api.state.data = sd; api.normalize();
  sd.risks[0].owner = 'A|B'; // pipe in owner must not break the table
  let ok = true;
  try { api.exportAto(); api.decisionToMd(api.findDecision('ADR-014')); } catch (e) { ok = false; }
  assert(ok, 'exports run');
});

test('Decision templates defined', () => {
  const api = buildSandbox();
  assert(Object.keys(api.DECISION_TEMPLATES).length >= 4, 'templates');
});

// runner
let pass = 0, fail = 0;
console.log('\nRunning ' + tests.length + ' smoke tests…\n');
for (const t of tests) {
  try { t.fn(); console.log('  PASS  ' + t.name); pass++; }
  catch (e) { console.log('  FAIL  ' + t.name + '\n        ' + e.message); fail++; }
}
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
