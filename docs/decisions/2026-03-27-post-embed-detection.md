getPostEmbed is responsible for inspecting a post's url, embedVideoUrl, and
urlContentType fields and returning a normalized embed type and URL for the UI
to render. This document records the design decisions behind how detection works
and the known gaps identified during initial test authoring.

## Field priority

Posts have two URL fields: url (the link the user shared) and embedVideoUrl
(an embed-ready URL the server may extract from the page). When both are
present, embedVideoUrl takes priority and becomes the embedUrl returned by
getPostEmbed. This applies to all embed types — detection logic should check
both fields symmetrically, with embedVideoUrl winning when both match.

## Detection should be field-agnostic

Any URL pattern we detect in embedVideoUrl should be detected identically in
url, and vice versa. The field a URL arrives in is an upstream data concern,
not something embed detection should care about. The only exception is
priority: if both fields carry a recognizable URL, embedVideoUrl wins.

## urlContentType is a hint, not a guarantee

urlContentType can disagree with the actual file extension. The detection order
places urlContentType checks before extension checks, so a wrong content type
can misclassify a URL. A known case: urlContentType=image/gif on an imgur .gifv
URL causes type=image even though the embedUrl gets normalized to .mp4. This is
a consequence of bad upstream data and is documented in tests rather than
worked around in code.

## Imgur gifv normalization

.gifv is not a real video format — it is a filename convention invented by
imgur to signal "this is a video meant to loop like a gif." A .gifv file is
actually an .mp4 or .webm renamed at the server. Imgur guarantees that an .mp4
exists at the same URL with the extension swapped, so rewriting i.imgur.com
.gifv URLs to .mp4 is safe. No other host has meaningfully adopted the .gifv
convention, so the normalization is intentionally scoped to i.imgur.com only.
Extending it to all hosts would risk swapping one broken URL for another since
we cannot know the underlying format a non-imgur host used.

## Known gaps with failing tests

When url has an image extension (.gif, .png, .jpg) and embedVideoUrl holds a
video, the image check on url fires before embedVideoUrl is read, causing url
to win. embedVideoUrl should always take priority regardless of what url looks
like.


These are cases where the current implementation does not match expected
behavior. Failing tests exist for each.

Vimeo channel video URLs (e.g. vimeo.com/channels/staffpicks/279580150) are
not detected as vimeo. The regex requires digits immediately after vimeo.com/
so a channel name in the path blocks the match.

Spotify album and episode URLs are not detected as spotify. The regex only
allows playlist and track path segments, but Spotify's embed player supports
albums and episodes as well.

Bandcamp EmbeddedPlayer URLs are not detected when they appear in the url
field rather than embedVideoUrl.

## Intentional non-support

Spotify artist pages are not embeddable and are expected to fall through to
article. YouTube channel pages and standalone playlist pages (no video ID) are
likewise expected to fall through. These are documented with non-matching tests
to prevent future regressions from an overly broad detection rule.
