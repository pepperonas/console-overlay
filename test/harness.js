'use strict';
// Lädt injected.js in einen vm-Kontext mit nachgebautem window/console/
// XMLHttpRequest/fetch und gibt die Puffer-Einträge zurück. Kein Browser nötig.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'injected.js'), 'utf8');
const METHODS = ['log', 'warn', 'error', 'info', 'debug', 'table', 'dir', 'dirxml', 'trace', 'assert',
  'count', 'countReset', 'time', 'timeLog', 'timeEnd', 'group', 'groupCollapsed', 'groupEnd', 'clear'];

function load({ fetchImpl } = {}) {
  const native = [];                              // was die Original-Konsole bekam
  const console = {};
  for (const m of METHODS) console[m] = (...a) => native.push([m, a]);

  const listeners = {};
  const posted = [];
  class FakeXHR {
    constructor() { this.l = []; this.status = 0; this.statusText = ''; }
    open() {}
    send() {}
    addEventListener(ev, fn) { if (ev === 'loadend') this.l.push(fn); }
    finish(status, statusText = '') { this.status = status; this.statusText = statusText; this.l.forEach(f => f.call(this)); }
  }
  let now = 1000;
  const window = {
    addEventListener: (ev, fn) => { (listeners[ev] ||= []).push(fn); },
    postMessage: msg => posted.push(msg),
    fetch: fetchImpl,
  };
  const ctx = {
    window, console, XMLHttpRequest: FakeXHR,
    performance: { now: () => now },
    Error, JSON, WeakSet, Array, String, Object, Promise, parseInt, parseFloat, Symbol, Date,
  };
  window.window = window;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);

  const buffer = () => window.__consoleOverlayBuffer;
  const last = () => buffer()[buffer().length - 1];
  return {
    ctx, console, window, native, posted, listeners, FakeXHR, buffer, last,
    tick: ms => { now += ms; },
    msg: (...args) => { console.log(...args); return last().message; },
    emit: (ev, data) => (listeners[ev] || []).forEach(f => f(data)),
  };
}

module.exports = { load, SRC };
