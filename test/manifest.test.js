'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

test('Alle im Manifest genannten Dateien existieren', () => {
  const files = [manifest.background.service_worker, manifest.action.default_popup,
    ...manifest.content_scripts.flatMap(c => c.js),
    ...manifest.web_accessible_resources.flatMap(w => w.resources),
    ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon)];
  for (const f of files) assert.ok(fs.existsSync(path.join(ROOT, f)), f);
});

test('injected.js läuft in der Seite (MAIN) vor allen Seitenskripten', () => {
  const inj = manifest.content_scripts.find(c => c.js.includes('injected.js'));
  assert.equal(inj.world, 'MAIN');
  assert.equal(inj.run_at, 'document_start');
});

test('Versionsnummer ist überall gleich', () => {
  const v = manifest.version;
  for (const f of ['content.js', 'injected.js', 'popup.js']) {
    const head = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n')[0];
    assert.match(head, new RegExp(`v${v.replace(/\./g, '\\.')}\\b`), f);
  }
});
