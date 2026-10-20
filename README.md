# Pythagoreische Saitenlängen

Eine kleine, deutschsprachige Web-Visualisierung für pythagoreische Intervalle. Die Saite wird mit nativer SVG-Grafik geteilt; alle Längen und Herleitungen werden im mathematischen Modell als gekürzte BigInt-Brüche berechnet.

**Live ausprobieren:** <https://konrad2002.github.io/pythagorean-string-visualizer/>

## Lokal starten

Im Ordner `pythagorean` ausführen:

```sh
python3 -m http.server 8000
```

Anschließend <http://localhost:8000> im Browser öffnen. Für ES-Module muss die Seite über einen lokalen Webserver und nicht als `file://`-Adresse geöffnet werden.

## Tests

Mit Node.js 20 oder neuer im Ordner `pythagorean` ausführen:

```sh
node --test
```

## Bedienung

- **Intervalle bauen** zeigt Oktave, Quinte, Quarte und den Ganzton D.
- **Pythagoreische Tonleiter** zeigt die Zielnoten und ihre exakten Längen. Wähle einen Ton aus, um seine Quintenfolge und Oktavnormalisierung zu verfolgen.
- Mit **Nächster Schritt**, **Zurück**, **Abspielen** und den Herleitungsschritten kannst du die Konstruktion steuern oder wiederholen.

Die Frequenz ist umgekehrt proportional zur Saitenlänge: Eine kürzere Saite klingt höher. Die aufsteigende Quinte multipliziert die Saitenlänge mit 2/3; nötige Oktavnormalisierungen werden ausdrücklich als Zweierpotenz gezeigt.

## Veröffentlichung

Jeder Push auf `main` veröffentlicht die statischen App-Dateien über GitHub Actions und GitHub Pages. Die Workflow-Datei liegt unter `.github/workflows/deploy-pages.yml`.
