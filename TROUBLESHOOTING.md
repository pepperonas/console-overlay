# Console Overlay - Troubleshooting

## Problem: Logs werden nicht live angezeigt

### Lösung 1: Seite neu laden
**Nach dem Aktivieren der Extension:**
1. Extension aktivieren (Toggle ON im Popup)
2. **Seite neu laden (F5 oder Strg+R)**
3. Jetzt sollten neue Logs erscheinen

Das ist wichtig, weil das Interceptor-Script nur beim Laden der Seite injiziert wird.

### Lösung 2: Extension neu installieren
1. `chrome://extensions/` öffnen
2. Console Overlay entfernen
3. Extension neu laden
4. Seite neu laden

### Lösung 3: Developer Tools Console prüfen
1. F12 drücken (DevTools öffnen)
2. Console Tab öffnen
3. Schauen ob Fehler erscheinen
4. Sollte sehen: `[Console Overlay] Content script initialized`
5. Sollte sehen: `[Console Overlay] Interceptor injected successfully`

### Lösung 4: Prüfen ob Extension aktiv ist
1. Klick auf Extension Icon
2. Toggle sollte AN (blau) sein
3. Status sollte "Overlay is active" sein

## Logs zum Testen

### Test-Seite verwenden
Öffne `test.html` im Browser:
- Automatische Logs nach 1, 2, 3 Sekunden
- Test-Buttons für verschiedene Log-Types
- Einfacher als die große Demo-Seite

### Console öffnen und testen
```javascript
// Im Browser Console eingeben:
console.log('Test 1');
console.warn('Test 2');
console.error('Test 3');
```

Diese sollten sofort im Overlay erscheinen.

## Häufige Probleme

### "Overlay erscheint nicht"
→ Extension aktiviert? (Klick auf Icon)
→ Seite neu geladen?

### "Erste Message erscheint, aber keine weiteren"
→ Das war der Bug in v1.0.0
→ Nutze v1.0.1 oder höher

### "Overlay verschwindet beim Scrollen"
→ Das ist normal, es ist `position: fixed`
→ Du kannst es verschieben

### "Extension funktioniert nicht auf chrome:// Seiten"
→ Das ist eine Chrome-Limitation
→ Extensions können nicht auf System-Seiten laufen

## Debug-Informationen sammeln

Wenn es nicht funktioniert:

1. Öffne DevTools (F12)
2. Console Tab
3. Suche nach Nachrichten mit `[Console Overlay]`
4. Screenshot machen
5. An martin.pfeffer@celox.io senden

### Erwartete Debug-Nachrichten

Bei korrekter Funktion solltest du sehen:
```
[Console Overlay] Content script initialized
[Console Overlay] Interceptor injected successfully
[Console Overlay] Overlay enabled, processing X queued messages
```

## Versions-Unterschiede

### v1.0.0 (Bekanntes Problem)
- Erste Message erscheint
- Weitere Messages werden nicht live angezeigt
- **Fix:** Upgrade auf v1.0.1

### v1.0.1 (Aktuell)
- Message Queue implementiert
- Robusteres Message Passing
- Live-Updates funktionieren

## Kontakt

Bei weiteren Problemen:
**Martin Pfeffer**  
martin.pfeffer@celox.io  
https://celox.io

---

**© 2026 Martin Pfeffer | celox.io**
