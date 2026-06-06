# whiskey-101 🐶

A 101 guide to caring for **Whiskey Cook**, a 3-year-old English Cocker Spaniel with idiopathic epilepsy.

The site is a single static page covering Whiskey's daily routine, medication schedule, what to do in case of a seizure, and emergency contacts.

## Viewing the site

It's a plain HTML/CSS site — no build step required.

- **Locally:** open `index.html` in any browser, or run a quick server:
  ```bash
  python3 -m http.server
  ```
  then visit http://localhost:8000

- **GitHub Pages:** enable Pages on this repo (Settings → Pages → deploy from the branch root) and the site will be served from `index.html`.

Each routine is a collapsible **accordion button** — tap a heading to expand
it. There's also a **How-To Videos** section with slots for short demo clips.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page content and structure |
| `styles.css` | Styling and responsive layout |
| `script.js` | Accordion toggling + video placeholder handling |
| `videos/` | Drop how-to demo clips here (see `videos/README.md`) |

## Adding videos

The How-To Videos section has four slots: pill taking, teeth brushing, lip
washing and ear drops. Each shows a "Video coming soon" placeholder until you
add the matching file to `videos/` (`pills.mp4`, `teeth.mp4`, `lips.mp4`,
`ears.mp4`) — then the player appears automatically. See `videos/README.md`
for details.

## To do / nice-to-haves

- Add a real photo of Whiskey (currently a placeholder emoji in the hero). Drop an image in the repo and swap the `.hero__photo` block in `index.html`.
- Record and add the four how-to videos.
