# Console Overlay - Chrome Extension

<!-- Project -->
[![Version](https://img.shields.io/badge/version-1.4.0-blue.svg)](https://github.com/pepperonas/console-overlay/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Maintained](https://img.shields.io/badge/maintained-yes-brightgreen.svg)](https://github.com/pepperonas/console-overlay/commits/main)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-ff69b4.svg)](https://github.com/pepperonas/console-overlay/pulls)
[![GitHub Issues](https://img.shields.io/github/issues/pepperonas/console-overlay.svg)](https://github.com/pepperonas/console-overlay/issues)
[![GitHub Stars](https://img.shields.io/github/stars/pepperonas/console-overlay.svg?style=social)](https://github.com/pepperonas/console-overlay/stargazers)

<!-- Tech stack -->
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4.svg?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/develop/migrate)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E.svg?logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Dependencies](https://img.shields.io/badge/dependencies-none-success.svg)](#architektur)
[![No Build Step](https://img.shields.io/badge/build-none-lightgrey.svg)](#installation)
[![Shadow DOM](https://img.shields.io/badge/Shadow%20DOM-isolated-9c27b0.svg)](https://developer.mozilla.org/docs/Web/API/Web_components/Using_shadow_DOM)

<!-- Compatibility -->
[![Chrome](https://img.shields.io/badge/Chrome-111%2B-FFCD46.svg?logo=googlechrome&logoColor=white&labelColor=4285F4)](https://www.google.com/chrome/)
[![Edge](https://img.shields.io/badge/Edge-111%2B-0078D7.svg?logo=microsoftedge&logoColor=white)](https://www.microsoft.com/edge)
[![Brave](https://img.shields.io/badge/Brave-supported-FB542B.svg?logo=brave&logoColor=white)](https://brave.com/)
[![Opera](https://img.shields.io/badge/Opera-supported-FF1B2D.svg?logo=opera&logoColor=white)](https://www.opera.com/)
[![Platform](https://img.shields.io/badge/platform-desktop-informational.svg)](#browser-kompatibilität)

Live Console Output Overlay für Chrome/Edge — erfasst Console-Logs, Fehler, Promise-Rejections und Netzwerkfehler und zeigt sie in einem verschiebbaren, vollständig isolierten Overlay-Fenster. Kein Build, keine Dependencies, kein DevTools-Wechsel.

![Console Overlay Screenshot](https://raw.githubusercontent.com/pepperonas/console-overlay/main/icons/icon128.png)

## Features

### Live Console Monitoring
- Erfasst **alle 15 Console-Methoden**: `log`, `warn`, `error`, `info`, `debug`, `table`, `dir`, `dirxml`, `trace`, `assert`, `count`/`countReset`, `time`/`timeLog`/`timeEnd`, `group`/`groupCollapsed`/`groupEnd`, `clear`
- Zeigt unbehandelte Fehler (`window.onerror`) und Promise Rejections
- **Netzwerkfehler**: fehlgeschlagene XHR- und Fetch-Requests (HTTP 4xx/5xx)
- Timestamps für jeden Log-Eintrag
- Synchrone Injection via `world: "MAIN"` — kein Log geht verloren, auch nicht vor Overlay-Aktivierung

### DevTools-genaue Formatierung *(v1.4.0)*
- **`Error`-Objekte** zeigen Stack/Message statt `{}`
- **DOM-Nodes** werden als Tag-Selektor dargestellt (`<div#id.class>`)
- **Zirkuläre Objekte** sauber als `[Circular]` aufgelöst
- **printf-Specifier** (`%s`, `%d`, `%i`, `%f`, `%o`, `%O`, `%c`, `%%`) werden ausgewertet
- Sehr große Payloads werden bei 8000 Zeichen gekürzt (Memory-Schutz)

### Vollständige Style-Isolation *(v1.4.0)*
- Overlay läuft in einem **Shadow DOM** — Seiten-CSS kann das Overlay nicht beeinflussen, und umgekehrt
- Identisches Erscheinungsbild auf jeder Website (auch bei aggressivem globalem CSS, z. B. GitHub)

### Performance *(v1.4.0)*
- **Inkrementelles Rendering** — O(1) pro Log statt komplettem Neuaufbau
- Kein Einfrieren mehr bei hoher Log-Frequenz; DOM-Knoten auf 1000 begrenzt
- **Smart-Autoscroll** — folgt nur, wenn man bereits am Ende ist

### Vollwertiges Fenster
- **Drag & Drop** — Verschieben per Titelleiste
- **Resize** — 8 Resize-Handles an allen Kanten und Ecken (Min: 400×300px)
- **Minimieren/Maximieren** — Fenster-Controls wie bei Desktop-Apps
- **Opacity-Slider** — Transparenz von 20 % bis 100 %
- **State Persistence** — Position, Größe, Opacity, **Filter** und Min/Max-Zustand werden gespeichert
- Korrektes Wiederherstellen der Fenstergröße nach Maximieren — auch nach Reload *(v1.4.0)*

### Bedienung & Komfort
- **Keyboard-Shortcut** `Alt+Shift+L` zum Umschalten — anpassbar unter `chrome://extensions/shortcuts` *(v1.4.0)*
- Toggle per Extension-Popup; Popup zeigt den aktiv konfigurierten Shortcut

### Intelligentes Filtering
- Filter nach Log-Typ (Log, Info, Warn, Error, Debug) — Auswahl bleibt erhalten
- Farbcodierte Log-Typen für schnelle Übersicht

### Einfaches Kopieren
- Einzelne Logs per Klick kopieren (📋)
- "Copy All" für alle gefilterten Logs, inkl. Timestamps
- **Clipboard-Fallback** für HTTP-Seiten ohne `navigator.clipboard` *(v1.4.0)*

### Barrierefreiheit & Theme *(v1.4.0)*
- `aria-label`/`title` an allen Controls, `role="log"` mit `aria-live` für den Log-Bereich
- VS-Code-inspiriertes Dark Theme mit dezenten Animationen

## Installation

### Option 1: Entwicklermodus (empfohlen)

1. Repository klonen oder herunterladen:
   ```bash
   git clone https://github.com/pepperonas/console-overlay.git
   ```
2. Chrome/Edge öffnen
3. Navigiere zu `chrome://extensions/` (oder `edge://extensions/`)
4. Aktiviere **"Entwicklermodus"** (oben rechts)
5. Klicke auf **"Entpackte Erweiterung laden"**
6. Wähle den `console-overlay` Ordner aus

### Option 2: ZIP-Installation

1. Lade das Repository als ZIP herunter
2. Entpacke die Datei
3. Folge Schritten 2-6 von Option 1

## Verwendung

### Aktivierung

1. Klicke auf das Extension-Icon in der Toolbar **oder** drücke `Alt+Shift+L`
2. Aktiviere den Toggle-Switch **"Enable Overlay"** (im Popup)
3. Das Overlay erscheint auf der Seite

> Der Shortcut lässt sich unter `chrome://extensions/shortcuts` frei anpassen.

### Fenster-Bedienung

| Aktion | Beschreibung |
|--------|--------------|
| **Verschieben** | Ziehe das Fenster an der Titelleiste |
| **Größe ändern** | Ziehe an einer der 8 Kanten/Ecken (Min: 400x300px) |
| **Maximieren** | Klick auf □ oder Doppelklick auf Titelleiste |
| **Minimieren** | Klick auf − (zeigt nur Titelleiste) |
| **Schließen** | Klick auf × oder Toggle im Popup |
| **Transparenz** | Opacity-Slider in der Toolbar |

### Logs verwalten

- **Filter**: Checkboxen für Log / Info / Warn / Error / Debug
- **Kopieren**: 📋 bei einzelnen Logs oder "Copy All"
- **Löschen**: "Clear" Button

## Architektur

```
console-overlay/
├── manifest.json      # Extension-Konfiguration (Manifest V3, commands, web_accessible_resources)
├── background.js      # Service Worker (Default-State + Keyboard-Shortcut-Forwarding)
├── content.js         # Overlay-UI im Shadow DOM, inkrementelles Rendering, State-Persistenz
├── injected.js        # Console- & Netzwerk-Interception im Page Context (world: MAIN)
├── overlay.css        # Dark Theme Styling (in den Shadow Root geladen)
├── popup.html/js      # Extension-Popup (Toggle + Shortcut-Anzeige)
├── icons/             # Extension-Icons
├── demo.html          # Demo-Seite
└── CLAUDE.md          # Entwickler-Guide
```

### Datenfluss

```
Website Console → injected.js → postMessage → content.js → Overlay UI
```

### Erfasste Events

| Kategorie | Methoden |
|-----------|----------|
| **Standard** | `log`, `warn`, `error`, `info`, `debug` |
| **Inspektion** | `table`, `dir`, `dirxml`, `trace` |
| **Assertions** | `assert` (nur bei Fehlschlag) |
| **Counter** | `count`, `countReset` |
| **Timer** | `time`, `timeLog`, `timeEnd` |
| **Gruppen** | `group` (▼), `groupCollapsed` (▶), `groupEnd` |
| **Sonstige** | `clear` ("Console was cleared") |
| **Fehler** | `window.onerror`, `unhandledrejection` |
| **Netzwerk** | XHR Fehler (4xx/5xx), Fetch API Fehler |

## Browser-Kompatibilität

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 111+ | ✅ Vollständig unterstützt (benötigt `world: "MAIN"`) |
| Edge | 111+ | ✅ Vollständig unterstützt |
| Brave | Latest | ✅ Unterstützt |
| Opera | Latest | ✅ Unterstützt |

## Limitierungen

- Benötigt Chrome/Edge **111+** (wegen `world: "MAIN"` Content-Script-Injection)
- Max. 1000 Logs im Speicher (FIFO), Nachrichten >8000 Zeichen werden gekürzt
- Nicht verfügbar auf `chrome://`, `edge://`, `about:` und Extension-Seiten

## Changelog

### v1.4.0 (2026-06-13)
- **Neu**: Shadow-DOM-Isolation — Overlay-Styling bleibt auf jeder Seite identisch, kein CSS-Bleed mehr (rein/raus)
- **Neu**: Keyboard-Shortcut zum Umschalten (`Alt+Shift+L`, anpassbar unter `chrome://extensions/shortcuts`)
- **Perf**: Inkrementelles Rendering (O(1) pro Log statt Full-Rebuild) — kein Einfrieren mehr bei hoher Log-Frequenz
- **Fix**: `Error`-Objekte zeigen jetzt Stack/Message statt `{}`; DOM-Nodes, zirkuläre Objekte und printf-Specifier (`%s %d %o %c`) werden korrekt formatiert
- **Fix**: Un-Maximieren stellt nach Reload die echte vorherige Fenstergröße wieder her
- **Neu**: Filter-Zustände werden persistiert; Clipboard-Fallback für HTTP-Seiten; A11y-Labels
- **Cleanup**: Überflüssige `scripting`-Permission entfernt; `minimum_chrome_version` gesetzt; Nachrichten >8000 Zeichen werden gekürzt

### v1.3.0 (2026-02-10)
- **Neu**: Alle 15 Console-Methoden werden abgefangen (`table`, `dir`, `dirxml`, `trace`, `assert`, `count`/`countReset`, `time`/`timeLog`/`timeEnd`, `group`/`groupCollapsed`/`groupEnd`, `clear`)
- **Neu**: Synchrone Injection via Manifest V3 `world: "MAIN"` — keine Race Condition mehr, kein Page-Reload nötig
- **Fix**: Duplikate beim Overlay-Aktivieren beseitigt (Buffer als Single Source of Truth)

### v1.2.5 (2026-01-17)
- **Fix**: Minimized/Maximized State wird korrekt geladen
- **Fix**: Logs werden nach Restore korrekt angezeigt

### v1.2.4 (2026-01-17)
- Version sync across all files

### v1.2.3 (2026-01-17)
- **Neu**: Network Error Monitoring (HTTP 4xx/5xx)
- **Neu**: XMLHttpRequest Fehler werden erfasst
- **Neu**: Fetch API Fehler werden erfasst
- **Fix**: Doppelte Initialisierung verhindert

### v1.2.2 (2026-01-17)
- **Fix**: Alle 8 Resize-Handles funktionieren korrekt
- **Fix**: Separates State-Management für Minimize/Maximize
- **Fix**: Popup-Validierung für System-Seiten
- **Fix**: Fensterposition nach Maximize korrekt wiederhergestellt

### v1.2.1 (2026-01-17)
- Opacity-Slider hinzugefügt
- Verbessertes State-Management

### v1.0.0 (2026-01-17)
- Initial Release

## Roadmap

- [ ] Export als JSON/CSV
- [ ] Suchfunktion
- [ ] Regex-Filter
- [x] Keyboard Shortcuts
- [ ] Light Theme
- [ ] Network Request Logging

## Lizenz

MIT License - Frei verwendbar für private und kommerzielle Projekte.

## Autor

**Martin Pfeffer**
Senior Software Developer
[celox.io](https://celox.io)

---

Bei Fragen oder Problemen: [Issue erstellen](https://github.com/pepperonas/console-overlay/issues)
