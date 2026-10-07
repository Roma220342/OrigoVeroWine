# OrigoVero Digital Product Passport: Château Fontclair (wine)

A mobile passport for Château Fontclair Saint-Émilion Grand Cru Classé 2019 (SCT-WINE-001), built from the Figma prototype `Wine / SCT-WINE-001` and the same static HTML, CSS and JavaScript as the battery passport. Open `index.html` through any static server.

Content comes only from the product page on origovero.com. The wording of the cold chain explanation and the arrow rules is ours and needs the client's approval.

## What is different from the battery passport

| Part | Wine |
|---|---|
| Key fact | Drinking window 2024–2040, peak 2026–2032 |
| Actions | Cold chain (scrolls down this page, arrow down), I need assistance and Find a retailer (other sites, arrow up-right) |
| Tasting & service | Black band with serving temperature and decanting, then Tasting, Serving, Pairings, Cellaring |
| Journey | Seven steps; four in Bordeaux are spaced on a ring around the city, then Paris, Le Havre, New York. Step 6 is placed at Le Havre, the departure port named in the step text |
| Cold chain | Closes the Journey: the flagged reading (24.5 °C, 30 Jan 2026) in a tinted card, all six readings on request |
| Specifications | Alcohol, bottle size, vintage, rows, and the EU Wine Label link |
| Spotlight | Video title and the 2019 Vintage Technical Sheet link |

## Open questions for the client

- Which temperature limit makes a reading an excursion, and what it means for the wine.
- Why the buyer should write to the brand when the brand owns the data, and what the brand can do.
- The step actor is "Château Bellefont" while the brand is "Château Fontclair".
- Coordinates of the cities are hand-entered; the map uses OpenStreetMap tiles (not for heavy production traffic) and Leaflet from unpkg.

## Behaviour and checks

Scrollspy tabs, animated accordions, map with one point per step and a camera that follows the product, Replay, full screen step viewer, language sheet. Checked with Playwright at 390 px: no console errors, no horizontal scroll.
