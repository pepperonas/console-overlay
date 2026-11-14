'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

test('Original-Konsole wird weiter aufgerufen, Eintrag landet im Puffer', () => {
  const h = load();
  h.console.warn('achtung', 1);
  assert.deepEqual(h.native.at(-1), ['warn', ['achtung', 1]]);
  assert.equal(h.last().type, 'warn');
  assert.equal(h.last().message, 'achtung 1');
  assert.ok(!Number.isNaN(Date.parse(h.last().timestamp)));
  const live = h.posted.at(-1);
  assert.equal(live.type, 'CONSOLE_OVERLAY_MESSAGE');
  assert.equal(live.source, 'console-interceptor');
});

test('Doppelte Initialisierung wird verhindert', () => {
  const h = load();
  const wrapped = h.console.log;
  require('vm').runInContext(require('./harness').SRC, h.ctx);
  assert.equal(h.console.log, wrapped);
});

test('Werte werden wie in DevTools formatiert', () => {
  const h = load();
  assert.equal(h.msg(null, undefined, true, 3), 'null undefined true 3');
  assert.equal(h.msg(10n), '10n');
  assert.equal(h.msg(Symbol('x')), 'Symbol(x)');
  assert.equal(h.msg(function foo() {}), 'ƒ foo()');
  assert.equal(h.msg(() => {}), 'ƒ (anonymous)()');
  assert.equal(h.msg({ a: 1 }), '{\n  "a": 1\n}');
  assert.equal(h.msg({ n: 5n, f() {} }), '{\n  "n": "5n",\n  "f": "ƒ f()"\n}');
});

test('Error-Objekte zeigen den Stack, der Stack geht mit', () => {
  const h = load();
  const e = new Error('kaputt');
  h.console.error(e);
  assert.match(h.last().message, /Error: kaputt/);
  assert.equal(h.last().stack, e.stack);
  const noStack = new Error('ohne'); noStack.stack = '';
  assert.equal(h.msg(noStack), 'Error: ohne');
});

test('Zirkuläre Objekte werden markiert statt zu werfen', () => {
  const h = load();
  const o = { name: 'x' }; o.self = o;
  assert.equal(h.msg(o), '{\n  "name": "x",\n  "self": "[Circular]"\n}');
});

test('Mehrfach referenzierte Objekte sind NICHT zirkulär', () => {
  const h = load();
  const shared = { v: 1 };
  const out = JSON.parse(h.msg({ a: shared, b: shared, list: [shared, shared] }));
  assert.deepEqual(out, { a: { v: 1 }, b: { v: 1 }, list: [{ v: 1 }, { v: 1 }] });
});

test('printf-Platzhalter %s %d %i %f %o %c %%', () => {
  const h = load();
  assert.equal(h.msg('%s ist %d Jahre', 'Ada', 36.9), 'Ada ist 36 Jahre');
  assert.equal(h.msg('%i/%f', '42px', '3.5x'), '42/3.5');
  assert.equal(h.msg('%o', { a: 1 }), '{\n  "a": 1\n}');
  assert.equal(h.msg('%cfarbig', 'color:red'), 'farbig');
  assert.equal(h.msg('100%%'), '100%');
  assert.equal(h.msg('%s und %s', 'eins'), 'eins und %s', 'fehlendes Argument bleibt stehen');
  assert.equal(h.msg('%s', 'a', 'rest', 2), 'a rest 2', 'übrige Argumente hängen an');
  assert.equal(h.msg('kein platzhalter', 1), 'kein platzhalter 1');
});

test('%d/%i/%f mit Symbol wirft nicht (Seiten-Code darf nicht brechen)', () => {
  const h = load();
  assert.doesNotThrow(() => h.console.log('%d', Symbol('s')));
  assert.equal(h.last().message, 'NaN');
  assert.doesNotThrow(() => h.console.log('%f', Symbol('s')));
  assert.equal(h.last().message, 'NaN');
});

test('Sehr lange Nachrichten werden gekürzt', () => {
  const h = load();
  const m = h.msg('x'.repeat(9000));
  assert.ok(m.startsWith('x'.repeat(8000) + '\n… (truncated, 1000 more chars)'));
  assert.equal(h.msg('y'.repeat(8000)).length, 8000);
});

test('Puffer ist auf 1000 Einträge begrenzt (FIFO)', () => {
  const h = load();
  for (let i = 0; i < 1100; i++) h.console.log('n' + i);
  assert.equal(h.buffer().length, 1000);
  assert.equal(h.buffer()[0].message, 'n100');
  assert.equal(h.last().message, 'n1099');
});

test('table/dir/dirxml laufen als log', () => {
  const h = load();
  for (const m of ['table', 'dir', 'dirxml']) { h.console[m]([1]); assert.equal(h.last().type, 'log', m); }
});

test('assert meldet nur bei Fehlschlag', () => {
  const h = load();
  const n = h.buffer().length;
  h.console.assert(true, 'nie');
  assert.equal(h.buffer().length, n);
  h.console.assert(false, 'Wert %d', 3);
  assert.equal(h.last().type, 'error');
  assert.equal(h.last().message, 'Assertion failed: Wert 3');
  h.console.assert(0);
  assert.equal(h.last().message, 'Assertion failed');
});

test('count / countReset zählen je Label', () => {
  const h = load();
  h.console.count(); h.console.count();
  assert.equal(h.last().message, 'default: 2');
  h.console.count('a');
  assert.equal(h.last().message, 'a: 1');
  h.console.countReset();
  h.console.count();
  assert.equal(h.last().message, 'default: 1');
});

test('time / timeLog / timeEnd messen und vergessen den Timer', () => {
  const h = load();
  h.console.time('t');
  h.tick(12.5);
  h.console.timeLog('t', 'zwischen');
  assert.equal(h.last().message, 't: 12.500ms zwischen');
  h.tick(1);
  h.console.timeEnd('t');
  assert.equal(h.last().message, 't: 13.500ms');
  const n = h.buffer().length;
  h.console.timeEnd('t');
  assert.equal(h.buffer().length, n, 'zweites timeEnd ohne Timer meldet nichts');
});

test('group zeigt Pfeile, trace und clear', () => {
  const h = load();
  h.console.group('G'); assert.equal(h.last().message, '▼ G');
  h.console.groupCollapsed(); assert.equal(h.last().message, '▶ ');
  const n = h.buffer().length;
  h.console.groupEnd(); assert.equal(h.buffer().length, n);
  h.console.trace('wo'); assert.equal(h.last().message, 'Trace: wo'); assert.ok(h.last().stack);
  h.console.clear(); assert.equal(h.last().type, 'info');
});

test('Unbehandelte Fehler und Rejections werden erfasst', () => {
  const h = load();
  h.emit('error', { message: 'boom', filename: 'a.js', lineno: 3, colno: 7, error: { stack: 'S' } });
  assert.equal(h.last().message, 'boom\n  at a.js:3:7');
  assert.equal(h.last().stack, 'S');
  h.emit('unhandledrejection', { reason: 'nein' });
  assert.equal(h.last().message, 'Unhandled Promise Rejection: nein');
  h.emit('unhandledrejection', { reason: undefined });
  assert.equal(h.last().message, 'Unhandled Promise Rejection: undefined');
});

test('XHR: nur Status >= 400 wird gemeldet', () => {
  const h = load();
  const n = h.buffer().length;
  for (const st of [200, 304, 399]) { const ok = new h.FakeXHR(); ok.open('GET', '/ok'); ok.send(); ok.finish(st); }
  assert.equal(h.buffer().length, n);
  const bad = new h.FakeXHR(); bad.open('POST', '/api'); bad.send(); bad.finish(503, 'Service Unavailable');
  assert.equal(h.last().message, 'POST /api\n503 (Service Unavailable)');
  assert.equal(h.last().type, 'error');
});

test('fetch: Fehlerstatus und Netzwerkfehler werden gemeldet, Antwort bleibt unverändert', async () => {
  const responses = [{ ok: true, status: 200 }, { ok: false, status: 404, statusText: 'Not Found' }];
  let i = 0;
  const h = load({ fetchImpl: () => Promise.resolve(responses[i++]) });
  const r = await h.window.fetch('/a');
  assert.equal(r, responses[0]);
  await h.window.fetch('/b', { method: 'DELETE' });
  assert.equal(h.last().message, 'DELETE /b\n404 (Not Found)');

  const h2 = load({ fetchImpl: () => Promise.reject(new Error('offline')) });
  await assert.rejects(h2.window.fetch({ url: '/c', method: 'PUT' }), /offline/);
  assert.equal(h2.last().message, 'PUT /c\nNetwork Error: offline');
});

test('fetch: URL-Objekt wird als Adresse angezeigt, nicht als "unknown"', async () => {
  const h = load({ fetchImpl: () => Promise.resolve({ ok: false, status: 500, statusText: 'X' }) });
  await h.window.fetch(new URL('https://example.com/x?y=1'));
  assert.equal(h.last().message, 'GET https://example.com/x?y=1\n500 (X)');
});

test('fetch: opake no-cors-Antworten (Status 0) sind kein Fehler', async () => {
  const h = load({ fetchImpl: () => Promise.resolve({ ok: false, status: 0, type: 'opaque' }) });
  const n = h.buffer().length;
  await h.window.fetch('https://cdn.example/x.js', { mode: 'no-cors' });
  assert.equal(h.buffer().length, n);
});

test('Puffer-Anfrage beantwortet nur Nachrichten vom eigenen Fenster', () => {
  const h = load();
  h.emit('message', { source: {}, data: { type: 'CONSOLE_OVERLAY_REQUEST_BUFFER', source: 'console-overlay-content' } });
  assert.ok(!h.posted.some(p => p.type === 'CONSOLE_OVERLAY_BUFFER_RESPONSE'));
  h.emit('message', { source: h.window, data: { type: 'CONSOLE_OVERLAY_REQUEST_BUFFER', source: 'console-overlay-content' } });
  const resp = h.posted.find(p => p.type === 'CONSOLE_OVERLAY_BUFFER_RESPONSE');
  assert.ok(resp);
  assert.equal(resp.buffer, h.buffer());
});
