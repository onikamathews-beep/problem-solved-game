# 3 Fold Cord & Problem? Solved! — Multiplayer Web App

## What this version includes

- **2–6 players**, each using a separate phone, tablet, or computer
- Six-character room codes
- **3 Fold Cord** cooperative mode
- **Problem? Solved!** player-vs-player mode
- A shared **Build Together** round where every player can add Problem and Solution Cards
- Build timers of 1, 2, 3, or 5 minutes; 2 minutes is the default
- Custom decks saved in the host browser
- JSON export/import so a deck can be backed up or moved to another device
- Installable web-app files for supported phones and computers

## 3 Fold Cord rules

1. The Round Leader draws a Problem Card.
2. Every player sees the same Problem.
3. Each player privately submits a suggested solution and the principle behind it.
4. A Solution Card may be selected for inspiration.
5. When everyone submits, all ideas are revealed with player names.
6. The group discusses the ideas, then every player votes.
7. The team receives one point only when every connected player approves.
8. The team wins at **12 points**. Three Needs Work rounds end that attempt.

## Problem? Solved! rules

1. The rotating Problem Picker draws a Problem Card.
2. Every other player secretly submits one Solution Card and may explain it.
3. The Picker sees the answers anonymously.
4. The Picker selects the best response or chooses None of These Worked.
5. The chosen player receives one point.
6. The first player to **5 points** wins.

## Put the game on GitHub Pages using only a browser

1. Sign in to GitHub and create a **new public repository**.
2. A simple repository name is `three-fold-cord-game`.
3. Open the new repository and choose **Add file → Upload files**.
4. Unzip this package first. Upload the **contents inside the folder**, not the ZIP file itself:
   - `.nojekyll`
   - `index.html`
   - `3-fold-cord-logo.png`
   - `manifest.json`
   - `service-worker.js`
   - `icon-192.png` and `icon-512.png`
   - this `README.md`
5. Commit the uploaded files to the `main` branch.
6. Open **Settings → Pages**.
7. Under **Build and deployment**, choose **Deploy from a branch**.
8. Select branch **main** and folder **/(root)**, then choose **Save**.
9. GitHub will publish a website similar to:
   `https://YOUR-USERNAME.github.io/three-fold-cord-game/`
10. Open the published address on every device. One person creates a room; everyone else enters the displayed room code.

## Update the game later

1. Open the repository.
2. Choose **Add file → Upload files**.
3. Upload the newer files and allow GitHub to replace the older files.
4. Commit the changes.
5. GitHub Pages will publish the update automatically. A phone may need a refresh before the new version appears.

## Important connection notes

- The host must keep the game page open throughout the match.
- Every device needs internet access.
- The game uses PeerJS/WebRTC for direct browser-to-browser connections.
- Some restricted work, school, guest, VPN, or corporate networks may block WebRTC.
- Home Wi-Fi or ordinary cellular data is usually the best place to test.
- GitHub hosts the website files, but it does **not** store the custom decks or matches.
- Saved decks remain in the host browser unless exported as JSON.
- A match in progress is not saved online.
- The PeerJS library loads from jsDelivr, so the game requires internet access even when installed to a device.

## Files

- `index.html` — complete game
- `3-fold-cord-logo.png` — selected logo with no cross imagery
- `manifest.json`, `icon-192.png`, and `icon-512.png` — installable web-app information
- `service-worker.js` — caches the local game shell
- `.nojekyll` — tells GitHub Pages to serve the files directly
