getPostEmbed is responsible for inspecting a post's url, embedVideoUrl, and
urlContentType fields and returning a normalized embed type and URL for the UI
to render. This document records the design decisions behind how detection works.

Posts have two URL fields: url (the link the user shared) and embedVideoUrl
(an embed-ready URL the server may extract from the page). When both are
present, embedVideoUrl takes priority and becomes the embedUrl returned by
getPostEmbed. Detection logic checks both fields symmetrically — any URL
pattern recognized in embedVideoUrl should be recognized identically in url.
The field a URL arrives in is an upstream data concern, not something embed
detection should care about.

We first try and parse post.url and post.embedVideoUrl, then we fallback
to urlContentType. For that reason, the url can disagree urlContentType
and we will still likely be able to parse the data.

.gifv is not a real video format — it is a filename convention invented by
imgur to signal "this is a video meant to loop like a gif." Imgur guarantees
an .mp4 exists at the same URL with the extension swapped, so rewriting
i.imgur.com .gifv URLs to .mp4 is safe. The normalization is intentionally
scoped to i.imgur.com only; extending it to all hosts would risk swapping one
broken URL for another since we cannot know the underlying format used.

Spotify artist pages are not embeddable and are expected to fall through to
article. YouTube channel pages and standalone playlist pages (no video ID) are
likewise expected to fall through. These are documented with non-matching tests
to prevent regressions from an overly broad detection rule.
