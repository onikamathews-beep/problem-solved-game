# Problem? Solved! / 3 Fold Cord — v8

This is the GitHub Pages web app used by the Android wrapper APK.

## What changed in v8

- Rebuilt the 3 Fold Cord gameplay screen to match the approved vintage green, cream, and gold mockup.
- Added the braided three-strand bookmark logo to the header and card backs.
- Added ornate floral card frames and a compact single-screen tabletop layout.
- Added a fanned Solution Card hand:
  - Swipe left or right to browse.
  - Flick down to collapse the hand.
  - Flick up to expand it.
- Added an animation of the chosen card moving into the shared play area.
- Only the player drawing the Problem Card sees the text first and is prompted to read it aloud.
- Removed the Round Leader role and rotates the Problem drawer in player order.
- Replaced the separate round-result reveal with a small animated outcome banner.
- The share invitation contains the game-specific link and the room code in both the link and the message.
- Replaced PeerJS browser-to-browser rooms with Firebase Realtime Database rooms and Anonymous Authentication.
- Active rooms can be restored after the browser or Android app is backgrounded or reopened.

## Upload to GitHub

Upload every file from this folder to the root of the existing `problem-solved-game` repository. Allow GitHub to replace files with the same names.

Suggested commit message:

`Add vintage 3 Fold Cord table and Firebase rooms`

The website address remains:

`https://onikamathews-beep.github.io/problem-solved-game/`

The installed APK opens that address, so the APK does not need to be reinstalled for this web update.

## Important Firebase note

Firebase Anonymous Authentication and Realtime Database must remain enabled. The rules previously published for `rooms`, `meta`, `players`, `views`, `actions`, `presence`, and `private` are used by this version.


## Grow multiplayer

The Grow URL redirects to game selection unless it contains a room code. Create or join a Grow room on `index.html`; the host can manage all five decks before starting. Deck edits and audience sets are saved in that browser. Starting copies the selected set to Firebase, so edits made afterward affect future games only. Every deck must contain a question. Deleted questions can be restored in the deck manager.

`grow-room.js` authenticates the player's membership and derives host authority from room metadata. The host processes per-player action inboxes, writes a complete current-card snapshot, and supplies views for late joiners. Keep the host's game tab open during play. The host can return everyone to the lobby to change sets. The existing Firebase rules require no changes.

Run `node --test tests/grow-room.test.cjs` for simulated host/guest, refresh, late-join, and membership checks. These tests mock the Firebase transport; they do not replace a live two-device check against the deployed Firebase project.
