# Flashcards PWA (ohne Programmierkenntnisse startklar)

Dies ist eine **fertige Mini-App** als **PWA**. Du kannst sie sofort lokal testen und anschließend kostenlos hosten (z. B. GitHub Pages oder Netlify).

## Was kann die App?
- 3 Level: **Starter / Challenger / Master**
- Karteikarten mit 3 Buttons: **Gewusst / Unsicher / Falsch**
- **Spaced Repetition (Leitner)**: Box 1→1 Tag, 2→2 Tage, 3→4 Tage, 4→7 Tage, 5→14 Tage
- **Coins** (+1 pro richtiger Karte, Master +2), **Challenges** (Tagesziel 20, Wochenziel 150, 7‑Tage‑Streak)
- **Reward‑Store** (digitale Items)
- **Offline** dank Service Worker + **installierbar** (PWA)
- **Export** des aktuellen Stands als CSV

## So startest du lokal
1. Lade die ZIP herunter und entpacke sie.
2. Öffne den Ordner in deinem Browser per lokalen Webserver (wichtig wegen PWA):
   - Windows: Öffne PowerShell im Ordner und tippe: `python -m http.server 8000`
   - macOS: Öffne Terminal: `python3 -m http.server 8000`
   - Dann im Browser: http://localhost:8000
   - Alternativ mit VSCode: Erweiterung „Live Server“ → Rechtsklick auf `index.html` → „Open with Live Server“.
3. Klicke auf **„Neue Sitzung“**, lerne Karten, wechsle Level im Dropdown.
4. Öffne „Challenges“, „Belohnungen“ und „Statistik“, um die Mechaniken zu sehen.

## So lädst du eigene Begriffe
- Datei: `data/terms.json`
- Format pro Eintrag:
```json
{ "id": 123, "term": "Begriff", "definition": "Definition", "example": "Beispiel", "subject": "Fach", "topic": "Thema", "level": "starter|challenger|master" }
```
- Tipp: Du kannst deine 1.800 Begriffe in Excel/Sheets pflegen und als JSON exportieren (oder mich bitten, dir eine Konvertierung von CSV → JSON zu erstellen).

## Online veröffentlichen (kostenlos)
### Variante A: GitHub Pages
1. Erstelle auf github.com ein neues Repository, lade alle Dateien hoch.
2. In den Repository‑Einstellungen → **Pages** → Branch „main“, Ordner „/**root**“ → Speichern.
3. Nach 1–2 Minuten ist die Seite online. Die PWA kann installiert werden.

### Variante B: Netlify (Drag & Drop)
1. Gehe zu app.netlify.com → „New site from Git“ **oder** „Deploy manually“.
2. Ziehe den entpackten Ordner einfach ins Fenster. Fertig.

## Wie funktioniert die Wiederholung?
- Jede Karte hat eine Box (1–5). Richtig → Box +1, Falsch → Box = 1, Unsicher → unverändert.
- Jede Box hat ein Intervall (1,2,4,7,14 Tage). Das nächste Fälligkeitsdatum wird automatisch berechnet.
- Die App schlägt zuerst fällige Karten vor; wenn keine fällig sind, werden 20 zufällige Karten gewählt.

## Nächste Schritte / Erweiterungen
- **Firebase‑Sync & Login** (optional) → Fortschritt über Geräte hinweg.
- **Lehrer‑Dashboard** (Exports, Klassenübersicht).
- **Reale Rewards** mit Codes.
- **Bilder/Audio** pro Karte.

Wenn du willst, helfe ich dir beim Import deiner 1.800 Begriffe (CSV → JSON) oder beim Online‑Stellen per GitHub Pages/Netlify – Schritt für Schritt.
