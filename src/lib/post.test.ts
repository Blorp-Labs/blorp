import { describe, test, expect } from "vitest";
import { getPostEmbed } from "./post";
import * as api from "@/test-utils/api";

// ─── field priority ───────────────────────────────────────────────────────────
//
// embedVideoUrl should always win over url when both are set, regardless of
// what url looks like. The .gif/.png/.jpg cases currently fail — the image
// extension check on url fires before embedVideoUrl is considered.

describe("field priority", () => {
  test.each([
    ["https://i.imgur.com/abc123.gifv", "https://i.imgur.com/other.mp4"],
    ["https://i.imgur.com/abc123.mp4", "https://i.imgur.com/other.mp4"],
    ["https://i.imgur.com/abc123.gif", "https://i.imgur.com/other.mp4"],
    ["https://i.imgur.com/abc123.png", "https://i.imgur.com/other.mp4"],
    ["https://i.imgur.com/abc123.jpg", "https://i.imgur.com/other.mp4"],
  ])("url=%s + embedVideoUrl=%s → embedVideoUrl wins", (url, embedVideoUrl) => {
    const { post } = api.getPost({ post: { url, embedVideoUrl } });
    const embed = getPostEmbed(post);
    expect(embed.type).toBe("video");
    expect(embed.embedUrl).toBe(embedVideoUrl);
  });
});

// ─── url normalization ────────────────────────────────────────────────────────
//
// i.imgur.com .gifv URLs are rewritten to .mp4 at the end of detection,
// regardless of which field the URL arrives in. Non-imgur .gifv URLs are left
// unchanged — .gifv is imgur's convention and we can't assume other hosts
// follow the same pattern.

describe("url normalization", () => {
  test("i.imgur.com .gifv in url → rewritten to .mp4", () => {
    const { post } = api.getPost({
      post: { url: "https://i.imgur.com/abc123.gifv" },
    });
    expect(getPostEmbed(post).embedUrl).toBe("https://i.imgur.com/abc123.mp4");
  });

  test("i.imgur.com .gifv in embedVideoUrl → rewritten to .mp4", () => {
    const { post } = api.getPost({
      post: { url: null, embedVideoUrl: "https://i.imgur.com/abc123.gifv" },
    });
    expect(getPostEmbed(post).embedUrl).toBe("https://i.imgur.com/abc123.mp4");
  });

  test("non-imgur .gifv is not rewritten", () => {
    const url = "https://example.com/clip.gifv";
    const { post } = api.getPost({ post: { url } });
    expect(getPostEmbed(post).embedUrl).toBe(url);
  });
});

// ─── urlContentType ───────────────────────────────────────────────────────────
//
// urlContentType is checked before file extension, so it takes priority in
// type detection. It can disagree with the actual file — when it does, the
// declared content type wins even if it misclassifies the content.

describe("urlContentType", () => {
  test.each([["image/jpeg"], ["image/png"], ["image/gif"], ["image/webp"]])(
    "%s → image",
    (urlContentType) => {
      const { post } = api.getPost({
        post: { url: "https://example.com/photo", urlContentType },
      });
      expect(getPostEmbed(post).type).toBe("image");
    },
  );

  test.each([["video/mp4"], ["video/webm"]])("%s → video", (urlContentType) => {
    const { post } = api.getPost({
      post: { url: "https://example.com/clip", urlContentType },
    });
    expect(getPostEmbed(post).type).toBe("video");
  });

  // urlContentType=image/gif on a .gifv url forces video detection, and
  // normalizeVideoUrl still rewrites the embedUrl to .mp4 — producing a
  // type=video with an .mp4 embedUrl. This stems from bad upstream data.
  test("urlContentType=image/gif + url=.gifv → type=video, embedUrl normalized to .mp4", () => {
    const { post } = api.getPost({
      post: {
        url: "https://i.imgur.com/abc123.gifv",
        urlContentType: "image/gif",
      },
    });
    const embed = getPostEmbed(post);
    expect(embed.type).toBe("video");
    expect(embed.embedUrl).toBe("https://i.imgur.com/abc123.mp4");
  });

  test("urlContentType=video/mp4 + url=.gifv → type=video, embedUrl normalized to .mp4", () => {
    const { post } = api.getPost({
      post: {
        url: "https://i.imgur.com/abc123.gifv",
        urlContentType: "video/mp4",
      },
    });
    const embed = getPostEmbed(post);
    expect(embed.type).toBe("video");
    expect(embed.embedUrl).toBe("https://i.imgur.com/abc123.mp4");
  });
});

// ─── text ─────────────────────────────────────────────────────────────────────

describe("text", () => {
  test("no url and no embedVideoUrl → text", () => {
    const { post } = api.getPost({ post: { url: null, embedVideoUrl: null } });
    const embed = getPostEmbed(post);
    expect(embed.type).toBe("text");
    expect(embed.embedUrl).toBeNull();
  });
});

// ─── article ──────────────────────────────────────────────────────────────────

describe("article", () => {
  test("unrecognized url with no embedVideoUrl → article", () => {
    const { post } = api.getPost({
      post: { url: "https://example.com/some-article" },
    });
    const embed = getPostEmbed(post);
    expect(embed.type).toBe("article");
    expect(embed.embedUrl).toBe(post.url);
  });
});

// ─── image ────────────────────────────────────────────────────────────────────
//
// Images appear in the url field. Detection is by file extension or
// urlContentType (covered in the urlContentType section above).

describe("image", () => {
  describe("via url", () => {
    test.each([
      ["https://example.com/photo.jpeg"],
      ["https://example.com/photo.jpg"],
      ["https://example.com/photo.png"],
      ["https://example.com/photo.webp"],
      ["https://example.com/photo.gif"],
    ])("%s → image", (url) => {
      const { post } = api.getPost({ post: { url } });
      expect(getPostEmbed(post).type).toBe("image");
    });

    test("query string after extension is stripped before matching", () => {
      const { post } = api.getPost({
        post: { url: "https://example.com/photo.jpg?size=large" },
      });
      expect(getPostEmbed(post).type).toBe("image");
    });
  });

  describe("fullResThumbnail", () => {
    // urlContentType-detected image: url is the high-res source
    test("set when url differs from thumbnailUrl (urlContentType detection)", () => {
      const url = "https://example.com/full.jpg";
      const thumbnailUrl = "https://example.com/thumb.jpg";
      const { post } = api.getPost({
        post: { url, thumbnailUrl, urlContentType: "image/jpeg" },
      });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("image");
      expect(embed.fullResThumbnail).toBe(url);
    });

    // extension-detected image: same behavior, no urlContentType needed
    test("set when url differs from thumbnailUrl (extension detection)", () => {
      const url = "https://example.com/full.png";
      const thumbnailUrl = "https://example.com/thumb.jpg";
      const { post } = api.getPost({
        post: { url, thumbnailUrl, urlContentType: null },
      });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("image");
      expect(embed.fullResThumbnail).toBe(url);
    });

    test("null when url equals thumbnailUrl", () => {
      const url = "https://example.com/photo.jpg";
      const { post } = api.getPost({
        post: { url, thumbnailUrl: url, urlContentType: "image/jpeg" },
      });
      expect(getPostEmbed(post).fullResThumbnail).toBeNull();
    });

    // urlContentType makes embedType=image but url is null — no high-res source
    test("null when urlContentType=image but url is null", () => {
      const { post } = api.getPost({
        post: { url: null, urlContentType: "image/jpeg" },
      });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("image");
      expect(embed.fullResThumbnail).toBeNull();
    });

    test("null for non-image types", () => {
      const { post } = api.getPost({
        post: { url: "https://www.youtube.com/watch?v=LDU_Txk06tM" },
      });
      expect(getPostEmbed(post).fullResThumbnail).toBeNull();
    });
  });
});

// ─── video ────────────────────────────────────────────────────────────────────

describe("video", () => {
  describe("via url", () => {
    test.each([
      ["https://example.com/clip.mp4"],
      ["https://example.com/stream.m3u8"],
      ["https://example.com/clip.gifv"],
    ])("%s → video, embedUrl set to embedVideoUrl", (url) => {
      const { post } = api.getPost({ post: { url } });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("video");
      expect(embed.embedUrl).toBe(url);
    });
  });

  describe("via embedVideoUrl", () => {
    test.each([
      ["https://example.com/clip.mp4"],
      ["https://example.com/stream.m3u8"],
      ["https://example.com/clip.gifv"],
    ])("%s → video, embedUrl set to embedVideoUrl", (embedVideoUrl) => {
      const { post } = api.getPost({ post: { embedVideoUrl } });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("video");
      expect(embed.embedUrl).toBe(embedVideoUrl);
    });
  });
});

// ─── imgur ────────────────────────────────────────────────────────────────────
//
// Imgur posts may carry image or video content identified by file extension.
// .gifv normalization is covered in the url normalization section above.

describe("imgur", () => {
  describe("via url", () => {
    test(".png → image", () => {
      const url = "https://i.imgur.com/abc123.png";
      const { post } = api.getPost({ post: { url } });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("image");
      expect(embed.embedUrl).toBe(url);
    });

    test(".jpg → image", () => {
      const url = "https://i.imgur.com/abc123.jpg";
      const { post } = api.getPost({ post: { url } });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("image");
      expect(embed.embedUrl).toBe(url);
    });

    // .gif is treated as an image (not video) even though imgur gifs are often
    // animated. Users wanting video playback share .gifv or .mp4 instead.
    test(".gif → image", () => {
      const url = "https://i.imgur.com/abc123.gif";
      const { post } = api.getPost({ post: { url } });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("image");
      expect(embed.embedUrl).toBe(url);
    });

    test(".mp4 → video", () => {
      const url = "https://i.imgur.com/abc123.mp4";
      const { post } = api.getPost({ post: { url } });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("video");
      expect(embed.embedUrl).toBe(url);
    });
  });

  describe("via embedVideoUrl", () => {
    test(".mp4 → video, embedUrl set to embedVideoUrl", () => {
      const embedVideoUrl = "https://i.imgur.com/abc123.mp4";
      const { post } = api.getPost({ post: { url: null, embedVideoUrl } });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("video");
      expect(embed.embedUrl).toBe(embedVideoUrl);
    });
  });
});

// ─── youtube ──────────────────────────────────────────────────────────────────
//
// The regex matches /watch?v=, /embed/, /live/, /shorts/, and bare / (for
// youtu.be). The video ID must be exactly 11 characters. Query params are
// safe — the ID capture stops at & or ?.

describe("youtube", () => {
  describe("via url", () => {
    test.each([
      "https://www.youtube.com/watch?v=LDU_Txk06tM",
      "https://youtube.com/watch?v=LDU_Txk06tM",
      "https://youtu.be/LDU_Txk06tM",
      "https://www.youtube.com/shorts/LDU_Txk06tM",
      "https://www.youtube.com/embed/LDU_Txk06tM",
      "https://www.youtube.com/live/LDU_Txk06tM",
      "https://www.youtube.com/watch?v=LDU_Txk06tM&t=90s",
      "https://youtu.be/LDU_Txk06tM?t=90",
      "https://www.youtube.com/watch?v=LDU_Txk06tM&list=PLrEnWoR732-BHrPp_Pm8_VleD68f9s14-",
    ])("url=%s → type=youtube", (url) => {
      const { post } = api.getPost({
        post: { url },
      });
      expect(getPostEmbed(post).type).toBe("youtube");
      expect(getPostEmbed(post).embedUrl).toBe(url);
    });
  });

  describe("via embedVideoUrl", () => {
    test.each([
      "https://www.youtube.com/watch?v=LDU_Txk06tM",
      "https://youtube.com/watch?v=LDU_Txk06tM",
      "https://youtu.be/LDU_Txk06tM",
      "https://www.youtube.com/shorts/LDU_Txk06tM",
      "https://www.youtube.com/embed/LDU_Txk06tM",
      "https://www.youtube.com/live/LDU_Txk06tM",
      "https://www.youtube.com/watch?v=LDU_Txk06tM&t=90s",
      "https://youtu.be/LDU_Txk06tM?t=90",
      "https://www.youtube.com/watch?v=LDU_Txk06tM&list=PLrEnWoR732-BHrPp_Pm8_VleD68f9s14-",
    ])("url=%s → type=youtube", (embedVideoUrl) => {
      const { post } = api.getPost({
        post: { embedVideoUrl },
      });
      expect(getPostEmbed(post).type).toBe("youtube");
      expect(getPostEmbed(post).embedUrl).toBe(embedVideoUrl);
    });
  });
});

// ─── vimeo ────────────────────────────────────────────────────────────────────

describe("vimeo", () => {
  describe("via url", () => {
    test("standard numeric id url", () => {
      const { post } = api.getPost({
        post: { url: "https://vimeo.com/279580150" },
      });
      expect(getPostEmbed(post).type).toBe("vimeo");
    });

    test("url with timestamp param", () => {
      const { post } = api.getPost({
        post: { url: "https://vimeo.com/279580150?t=30s" },
      });
      expect(getPostEmbed(post).type).toBe("vimeo");
    });

    test("private video url with hash suffix", () => {
      const { post } = api.getPost({
        post: { url: "https://vimeo.com/279580150/abc123def456" },
      });
      expect(getPostEmbed(post).type).toBe("vimeo");
    });

    // Vimeo channel video URLs are real shareable links but the regex requires
    // digits immediately after vimeo.com/ — the channel name blocks the match.
    test("channel video url", () => {
      const { post } = api.getPost({
        post: { url: "https://vimeo.com/channels/staffpicks/279580150" },
      });
      expect(getPostEmbed(post).type).toBe("vimeo");
    });
  });

  describe("via embedVideoUrl", () => {
    // Detection should be field-agnostic. Currently only url is checked.
    test("vimeo url in embedVideoUrl → vimeo", () => {
      const embedVideoUrl = "https://vimeo.com/279580150";
      const { post } = api.getPost({ post: { url: null, embedVideoUrl } });
      expect(getPostEmbed(post).type).toBe("vimeo");
    });
  });

  describe("non-matching urls", () => {
    test("channel index page (no video id) does not yield vimeo type", () => {
      const { post } = api.getPost({
        post: { url: "https://vimeo.com/channels/staffpicks" },
      });
      expect(getPostEmbed(post).type).not.toBe("vimeo");
    });
  });
});

// ─── soundcloud ───────────────────────────────────────────────────────────────

describe("soundcloud", () => {
  describe("via url", () => {
    test("track url", () => {
      const { post } = api.getPost({
        post: {
          url: "https://soundcloud.com/tomvalbyrotary/youre-making-my-teeth-grow",
        },
      });
      expect(getPostEmbed(post).type).toBe("soundcloud");
    });

    test("sets/playlist url", () => {
      const { post } = api.getPost({
        post: { url: "https://soundcloud.com/tomvalbyrotary/sets/my-playlist" },
      });
      expect(getPostEmbed(post).type).toBe("soundcloud");
    });

    // on.soundcloud.com is the short link format SoundCloud generates when
    // sharing. Currently fails because detection only checks soundcloud.com/.
    test("on.soundcloud.com short url", () => {
      const { post } = api.getPost({
        post: { url: "https://on.soundcloud.com/abc123" },
      });
      expect(getPostEmbed(post).type).toBe("soundcloud");
    });
  });

  describe("via embedVideoUrl", () => {
    // Detection should be field-agnostic. Currently soundcloud only checks url,
    // so a soundcloud URL in embedVideoUrl falls through to generic-video.
    test("soundcloud url in embedVideoUrl → soundcloud, embedUrl set to embedVideoUrl", () => {
      const embedVideoUrl =
        "https://soundcloud.com/tomvalbyrotary/youre-making-my-teeth-grow";
      const { post } = api.getPost({ post: { url: null, embedVideoUrl } });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("soundcloud");
      expect(embed.embedUrl).toBe(embedVideoUrl);
    });
  });
});

// ─── spotify ──────────────────────────────────────────────────────────────────

describe("spotify", () => {
  describe("via url", () => {
    test("track url", () => {
      const { post } = api.getPost({
        post: { url: "https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh" },
      });
      expect(getPostEmbed(post).type).toBe("spotify");
    });

    test("playlist url", () => {
      const { post } = api.getPost({
        post: {
          url: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
        },
      });
      expect(getPostEmbed(post).type).toBe("spotify");
    });

    // Spotify always appends ?si= to shared URLs — this is the format that
    // actually arrives in posts when users paste a share link.
    test("track url with ?si= sharing param", () => {
      const { post } = api.getPost({
        post: {
          url: "https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh?si=abc123def456",
        },
      });
      expect(getPostEmbed(post).type).toBe("spotify");
    });

    // Albums and episodes are embeddable on Spotify but the regex only allows
    // playlist|track, so these currently fall through to article.
    test("album url", () => {
      const { post } = api.getPost({
        post: { url: "https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3" },
      });
      expect(getPostEmbed(post).type).toBe("spotify");
    });

    test("episode url", () => {
      const { post } = api.getPost({
        post: {
          url: "https://open.spotify.com/episode/5AJXaHhvHeBBkNTPYUlPJO",
        },
      });
      expect(getPostEmbed(post).type).toBe("spotify");
    });
  });

  describe("via embedVideoUrl", () => {
    // Detection should be field-agnostic. Currently only url is checked.
    test("spotify url in embedVideoUrl → spotify, embedUrl set to embedVideoUrl", () => {
      const embedVideoUrl =
        "https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh";
      const { post } = api.getPost({ post: { url: null, embedVideoUrl } });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("spotify");
      expect(embed.embedUrl).toBe(embedVideoUrl);
    });
  });

  describe("non-matching urls", () => {
    test("artist page does not yield spotify type", () => {
      const { post } = api.getPost({
        post: { url: "https://open.spotify.com/artist/0TnOYISbd1XYRBk9myaseg" },
      });
      expect(getPostEmbed(post).type).not.toBe("spotify");
    });
  });
});

// ─── bandcamp ─────────────────────────────────────────────────────────────────
//
// Bandcamp detection is entirely EmbeddedPlayer URL-based. The server is
// expected to extract a bandcamp.com/EmbeddedPlayer URL from the page.

describe("bandcamp", () => {
  const EMBED_URL_1 =
    "https://bandcamp.com/EmbeddedPlayer/v=2/track=2978997260/size=large/tracklist=false/artwork=small/";
  const EMBED_URL_2 =
    "https://bandcamp.com/EmbeddedPlayer/v=2/track=1111111111/size=large/tracklist=false/artwork=small/";

  describe("via embedVideoUrl", () => {
    test("EmbeddedPlayer url → bandcamp, embedUrl set to embedVideoUrl", () => {
      const { post } = api.getPost({ post: { embedVideoUrl: EMBED_URL_1 } });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("bandcamp");
      expect(embed.embedUrl).toBe(EMBED_URL_1);
    });

    test("embedVideoUrl wins over url when both carry EmbeddedPlayer urls", () => {
      const { post } = api.getPost({
        post: { url: EMBED_URL_1, embedVideoUrl: EMBED_URL_2 },
      });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("bandcamp");
      expect(embed.embedUrl).toBe(EMBED_URL_2);
    });
  });

  describe("via url", () => {
    // Detection should work regardless of which field carries the EmbeddedPlayer
    // URL. Currently only embedVideoUrl is checked, so this fails.
    test("EmbeddedPlayer url in url field → bandcamp, embedUrl set to url", () => {
      const { post } = api.getPost({ post: { url: EMBED_URL_1 } });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("bandcamp");
      expect(embed.embedUrl).toBe(EMBED_URL_1);
    });
  });
});

// ─── loops ────────────────────────────────────────────────────────────────────

describe("loops", () => {
  test("loops.video url → loops", () => {
    const { post } = api.getPost({
      post: { url: "https://loops.video/v/60Sa-5oVYT" },
    });
    expect(getPostEmbed(post).type).toBe("loops");
  });
});

// ─── redgifs ──────────────────────────────────────────────────────────────────

describe("redgifs", () => {
  describe("via url", () => {
    test("www.redgifs.com/watch → redgif, embedUrl set to url", () => {
      const url = "https://www.redgifs.com/watch/testredgifid";
      const { post } = api.getPost({ post: { url } });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("redgif");
      expect(embed.embedUrl).toBe(url);
    });

    test("redgifs.com/watch (no www) → redgif", () => {
      const url = "https://redgifs.com/watch/testredgifid";
      const { post } = api.getPost({ post: { url } });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("redgif");
      expect(embed.embedUrl).toBe(url);
    });
  });

  describe("via embedVideoUrl", () => {
    // redgifs checks url before embedVideoUrl in the if-else chain, so url
    // currently wins when both are set — embedVideoUrl should win instead.
    test("www.redgifs.com/watch in embedVideoUrl wins over url → redgif, embedUrl set to embedVideoUrl", () => {
      const embedVideoUrl = "https://www.redgifs.com/watch/embedgif";
      const { post } = api.getPost({
        post: { url: "https://www.redgifs.com/watch/urlgif", embedVideoUrl },
      });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("redgif");
      expect(embed.embedUrl).toBe(embedVideoUrl);
    });

    test("redgifs.com/watch (no www) in embedVideoUrl → redgif, embedUrl set to embedVideoUrl", () => {
      const embedVideoUrl = "https://redgifs.com/watch/someothergif";
      const { post } = api.getPost({ post: { url: null, embedVideoUrl } });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("redgif");
      expect(embed.embedUrl).toBe(embedVideoUrl);
    });
  });
});

// ─── peertube ─────────────────────────────────────────────────────────────────
//
// PeerTube is a federated video platform — instances run on arbitrary domains.
// Detection relies on URL path patterns rather than a known domain list.
// Two formats are supported: /videos/watch/{uuid} and /w/{shortid}.

describe("peertube", () => {
  describe("via url", () => {
    test("/videos/watch/ UUID url", () => {
      const { post } = api.getPost({
        post: {
          url: "https://lone.earth/videos/watch/d1616b46-8935-438d-80f9-10def00416dd",
        },
      });
      expect(getPostEmbed(post).type).toBe("peertube");
    });

    test("/w/ short url", () => {
      const { post } = api.getPost({
        post: { url: "https://video.blahaj.zone/w/abc123xyz" },
      });
      expect(getPostEmbed(post).type).toBe("peertube");
    });

    test("/videos/watch/ UUID url with query params", () => {
      const { post } = api.getPost({
        post: {
          url: "https://lone.earth/videos/watch/d1616b46-8935-438d-80f9-10def00416dd?start=1m30s",
        },
      });
      expect(getPostEmbed(post).type).toBe("peertube");
    });

    // PEERTUBE_REGEX allows query params via (?:[?#].*)? but PEERTUBE_REGEX2
    // is anchored with a plain $ so query params break /w/ URL matching.
    test("/w/ short url with query params", () => {
      const { post } = api.getPost({
        post: { url: "https://video.blahaj.zone/w/abc123xyz?start=1m30s" },
      });
      expect(getPostEmbed(post).type).toBe("peertube");
    });
  });

  describe("via embedVideoUrl", () => {
    // Detection should be field-agnostic. Currently only url is checked, so a
    // peertube URL in embedVideoUrl falls through to generic-video.
    test("/videos/watch/ UUID in embedVideoUrl → peertube, embedUrl set", () => {
      const embedVideoUrl =
        "https://lone.earth/videos/watch/d1616b46-8935-438d-80f9-10def00416dd";
      const { post } = api.getPost({ post: { url: null, embedVideoUrl } });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("peertube");
      expect(embed.embedUrl).toBe(embedVideoUrl);
    });
  });

  describe("non-matching urls", () => {
    test("/videos/watch/ with invalid UUID does not yield peertube type", () => {
      const { post } = api.getPost({
        post: { url: "https://example.com/videos/watch/not-a-uuid" },
      });
      expect(getPostEmbed(post).type).not.toBe("peertube");
    });
  });
});

// ─── generic-video ────────────────────────────────────────────────────────────
//
// generic-video is the embedVideoUrl catch-all — it fires when embedVideoUrl
// is set but no specific type matched. It sits above article in the chain, so
// an unrecognized embedVideoUrl always beats a url-only article post.

describe("generic-video", () => {
  test("unrecognized embedVideoUrl with no url → generic-video, embedUrl set", () => {
    const embedVideoUrl = "https://example.com/some-video-embed";
    const { post } = api.getPost({ post: { url: null, embedVideoUrl } });
    const embed = getPostEmbed(post);
    expect(embed.type).toBe("generic-video");
    expect(embed.embedUrl).toBe(embedVideoUrl);
  });

  test("unrecognized embedVideoUrl + article url → generic-video wins over article", () => {
    const embedVideoUrl = "https://example.com/some-video-embed";
    const { post } = api.getPost({
      post: { url: "https://example.com/some-article", embedVideoUrl },
    });
    const embed = getPostEmbed(post);
    expect(embed.type).toBe("generic-video");
    expect(embed.embedUrl).toBe(embedVideoUrl);
  });

  // A recognized url type is checked before generic-video in the chain, so it
  // takes priority over an unrecognized embedVideoUrl.
  test("recognized url type + unrecognized embedVideoUrl → url type wins", () => {
    const { post } = api.getPost({
      post: {
        url: "https://www.youtube.com/watch?v=LDU_Txk06tM",
        embedVideoUrl: "https://example.com/some-video-embed",
      },
    });
    expect(getPostEmbed(post).type).toBe("youtube");
  });
});

// ─── thumbnail passthrough ────────────────────────────────────────────────────

describe("thumbnail passthrough", () => {
  test("thumbnail is always passed through from post", () => {
    const thumbnailUrl = "https://example.com/thumb.jpg";
    const { post } = api.getPost({
      post: {
        url: "https://www.youtube.com/watch?v=LDU_Txk06tM",
        thumbnailUrl,
      },
    });
    expect(getPostEmbed(post).thumbnail).toBe(thumbnailUrl);
  });

  test("thumbnail is null when post has no thumbnail", () => {
    const { post } = api.getPost({
      post: { url: "https://www.youtube.com/watch?v=LDU_Txk06tM" },
    });
    expect(getPostEmbed(post).thumbnail).toBeNull();
  });
});
