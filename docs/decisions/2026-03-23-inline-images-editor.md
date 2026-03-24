Images in the markdown renderer are inline nodes (they can appear mid-paragraph
alongside text). To match this in the TipTap editor, the Image extension is
configured with `inline: true`. Without this, TipTap treats images as block
nodes and always breaks them out of the surrounding text regardless of the
source markdown. Tailwind's preflight sets `img { display: block }`, so
`markdown-content.css` also overrides that to `inline-block` — both changes
are required for inline images to render correctly.

When inserting images via toolbar upload, paste, or drop, we intentionally
wrap the image with hard line breaks (`<br>`) before and after. This keeps the
image visually isolated on its own line and leaves the cursor below it after
insertion. We chose hard breaks over paragraph splits (`splitBlock` /
`tr.split()`) because the paragraph splitting approach requires careful
ProseMirror position mapping after each step and proved error-prone. The
trade-off is that hard breaks serialize to `\` in markdown rather than blank
lines, but this was accepted as the simpler and more reliable solution.
