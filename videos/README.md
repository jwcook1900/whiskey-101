# Videos

Drop Whiskey's how-to demo clips in this folder. The site looks for these
exact filenames and will automatically replace the "Video coming soon"
placeholder with a player once a file is present:

| Filename | Shows |
| --- | --- |
| `pills.mp4` | Taking my pills (down the throat) |
| `teeth.mp4` | Teeth brushing |
| `lips.mp4` | Lip washing |
| `ears.mp4` | Ear drop administration |

## Tips
- Use **MP4 (H.264)** for the widest browser/phone support.
- Keep clips short and reasonably compressed so the page loads fast — a
  phone video trimmed to 20–40 seconds is ideal.
- Filenames are case-sensitive on most web hosts; match them exactly.

To add more videos, copy one of the `<figure class="video-card">` blocks in
`index.html`, update the title/description, and point `data-file` and the
`<source src>` at your new filename.
