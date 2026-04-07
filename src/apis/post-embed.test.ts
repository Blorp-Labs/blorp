import { describe, test, expect } from "vitest";
import { getPostEmbed } from "./post-embed";
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
      "https://example.com/photo.jpeg",
      "https://example.com/photo.jpg",
      "https://example.com/photo.png",
      "https://example.com/photo.webp",
      "https://example.com/photo.gif",
      "https://example.com/photo.jpg?size=large",
    ])("%s → image", (url) => {
      const { post } = api.getPost({ post: { url } });
      expect(getPostEmbed(post).type).toBe("image");
      expect(getPostEmbed(post).fullResThumbnail).toBe(url);
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
  const youtubeUrls = [
    "https://www.youtube.com/watch?v=LDU_Txk06tM",
    "https://youtube.com/watch?v=LDU_Txk06tM",
    "https://youtu.be/LDU_Txk06tM",
    "https://www.youtube.com/shorts/LDU_Txk06tM",
    "https://www.youtube.com/embed/LDU_Txk06tM",
    "https://www.youtube.com/live/LDU_Txk06tM",
    "https://www.youtube.com/watch?v=LDU_Txk06tM&t=90s",
    "https://youtu.be/LDU_Txk06tM?t=90",
    "https://www.youtube.com/watch?v=LDU_Txk06tM&list=PLrEnWoR732-BHrPp_Pm8_VleD68f9s14-",
  ];

  describe("via url", () => {
    test.each(youtubeUrls)("url=%s → type=youtube", (url) => {
      const { post } = api.getPost({
        post: { url },
      });
      expect(getPostEmbed(post).type).toBe("youtube");
      expect(getPostEmbed(post).embedUrl).toBe(url);
    });
  });

  describe("via embedVideoUrl", () => {
    test.each(youtubeUrls)(
      "embedVideoUrl=%s → type=youtube",
      (embedVideoUrl) => {
        const { post } = api.getPost({
          post: { embedVideoUrl },
        });
        expect(getPostEmbed(post).type).toBe("youtube");
        expect(getPostEmbed(post).embedUrl).toBe(embedVideoUrl);
      },
    );
  });
});

// ─── vimeo ────────────────────────────────────────────────────────────────────

describe("vimeo", () => {
  const vimeoUrls = [
    "https://vimeo.com/279580150",
    "https://vimeo.com/279580150?t=30s",
    // private video url with hash suffix
    "https://vimeo.com/279580150/abc123def456",
    "https://vimeo.com/channels/staffpicks/279580150",
  ];

  describe("via url", () => {
    test.each(vimeoUrls)("url=%s → type=vimeo", (url) => {
      const { post } = api.getPost({
        post: { url },
      });
      expect(getPostEmbed(post).type).toBe("vimeo");
      expect(getPostEmbed(post).embedUrl).toBe(url);
    });
  });

  describe("via embedVideoUrl", () => {
    test.each(vimeoUrls)("embedVideoUrl=%s → type=vimeo", (embedVideoUrl) => {
      const { post } = api.getPost({
        post: { embedVideoUrl },
      });
      expect(getPostEmbed(post).type).toBe("vimeo");
      expect(getPostEmbed(post).embedUrl).toBe(embedVideoUrl);
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
  const urls = [
    "https://soundcloud.com/tomvalbyrotary/youre-making-my-teeth-grow",
    "https://soundcloud.com/tomvalbyrotary/sets/my-playlist",
    // on.soundcloud.com is the short link format SoundCloud generates when sharing
    "https://on.soundcloud.com/abc123",
  ];

  describe("via url", () => {
    test.each(urls)("url=%s → type=soundcloud", (url) => {
      const { post } = api.getPost({
        post: {
          url,
        },
      });
      expect(getPostEmbed(post).type).toBe("soundcloud");
      expect(getPostEmbed(post).embedUrl).toBe(url);
    });
  });

  describe("via embedVideoUrl", () => {
    test.each(urls)("embedVideoUrl=%s → type=soundcloud", (embedVideoUrl) => {
      const { post } = api.getPost({
        post: {
          embedVideoUrl,
        },
      });
      expect(getPostEmbed(post).type).toBe("soundcloud");
      expect(getPostEmbed(post).embedUrl).toBe(embedVideoUrl);
    });
  });
});

// ─── spotify ──────────────────────────────────────────────────────────────────

describe("spotify", () => {
  const spotifyUrls = [
    "https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh",
    "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
    "https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh?si=abc123def456",
    "https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3",
    "https://open.spotify.com/episode/5AJXaHhvHeBBkNTPYUlPJO",
  ];

  describe("via url", () => {
    test.each(spotifyUrls)("url=%s → type=spotify", (url) => {
      const { post } = api.getPost({
        post: {
          url,
        },
      });
      expect(getPostEmbed(post).type).toBe("spotify");
      expect(getPostEmbed(post).embedUrl).toBe(url);
    });
  });

  describe("via embedVideoUrl", () => {
    test.each(spotifyUrls)(
      "embedVideoUrl=%s → type=spotify",
      (embedVideoUrl) => {
        const { post } = api.getPost({
          post: {
            embedVideoUrl,
          },
        });
        expect(getPostEmbed(post).type).toBe("spotify");
        expect(getPostEmbed(post).embedUrl).toBe(embedVideoUrl);
      },
    );
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
  const bandcampUrls = [
    "https://bandcamp.com/EmbeddedPlayer/v=2/track=2978997260/size=large/tracklist=false/artwork=small/",
    "https://bandcamp.com/EmbeddedPlayer/v=2/track=1111111111/size=large/tracklist=false/artwork=small/",
  ];

  describe("via url", () => {
    test.each(bandcampUrls)("url=%s → type=bandcamp", (url) => {
      const { post } = api.getPost({
        post: {
          url,
        },
      });
      expect(getPostEmbed(post).type).toBe("bandcamp");
      expect(getPostEmbed(post).embedUrl).toBe(url);
    });
  });

  describe("via embedVideoUrl", () => {
    test.each(bandcampUrls)(
      "embedVideoUrl=%s → type=bandcamp",
      (embedVideoUrl) => {
        const { post } = api.getPost({
          post: {
            embedVideoUrl,
          },
        });
        expect(getPostEmbed(post).type).toBe("bandcamp");
        expect(getPostEmbed(post).embedUrl).toBe(embedVideoUrl);
      },
    );
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
  const redgifUrls = [
    "https://www.redgifs.com/watch/testredgifid",
    "https://redgifs.com/watch/testredgifid",
  ];

  describe("via url", () => {
    test.each(redgifUrls)("url=%s → type=bandcamp", (url) => {
      const { post } = api.getPost({
        post: {
          url,
        },
      });
      expect(getPostEmbed(post).type).toBe("redgif");
      expect(getPostEmbed(post).embedUrl).toBe(url);
    });
  });

  describe("via embedVideoUrl", () => {
    test.each(redgifUrls)(
      "embedVideoUrl=%s → type=bandcamp",
      (embedVideoUrl) => {
        const { post } = api.getPost({
          post: {
            embedVideoUrl,
          },
        });
        expect(getPostEmbed(post).type).toBe("redgif");
        expect(getPostEmbed(post).embedUrl).toBe(embedVideoUrl);
      },
    );
  });
});

// ─── peertube ─────────────────────────────────────────────────────────────────
//
// PeerTube is a federated video platform — instances run on arbitrary domains.
// Detection relies on URL path patterns rather than a known domain list.
// Two formats are supported: /videos/watch/{uuid} and /w/{shortid}.

describe("peertube", () => {
  const peertubeUrls = [
    "https://lone.earth/videos/watch/d1616b46-8935-438d-80f9-10def00416dd",
    "https://video.blahaj.zone/w/abc123xyz",
    "https://lone.earth/videos/watch/d1616b46-8935-438d-80f9-10def00416dd?start=1m30s",
    "https://video.blahaj.zone/w/abc123xyz?start=1m30s",
  ];

  // TODO: given the ambiguity of peertube urls, we
  // may not want to match them from post.url if thats
  // not enough indication that the url is a video.
  describe.todo("via url", () => {
    test.each(peertubeUrls)("url=%s → type=bandcamp", (url) => {
      const { post } = api.getPost({
        post: {
          url,
        },
      });
      expect(getPostEmbed(post).type).toBe("peertube");
      expect(getPostEmbed(post).embedUrl).toBe(url);
    });
  });

  describe("via embedVideoUrl", () => {
    test.each(peertubeUrls)(
      "embedVideoUrl=%s → type=bandcamp",
      (embedVideoUrl) => {
        const { post } = api.getPost({
          post: {
            embedVideoUrl,
          },
        });
        expect(getPostEmbed(post).type).toBe("peertube");
        expect(getPostEmbed(post).embedUrl).toBe(embedVideoUrl);
      },
    );
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
