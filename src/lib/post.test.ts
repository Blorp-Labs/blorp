import { describe, test, expect } from "vitest";
import { getPostEmbed } from "./post";
import * as api from "@/test-utils/api";

// ─── imgur ────────────────────────────────────────────────────────────────────
//
// Imgur posts arrive with inconsistent data: the url field may hold an image or
// a video (mp4/gifv), and embedVideoUrl may or may not be set independently.
// urlContentType can also disagree with the actual file extension. These tests
// document how getPostEmbed resolves each combination.

describe("imgur", () => {
  describe("url only", () => {
    test("url=.png → image, embedUrl unchanged", () => {
      const url = "https://i.imgur.com/abc123.png";
      const { post } = api.getPost({ post: { url } });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("image");
      expect(embed.embedUrl).toBe(url);
    });

    test("url=.jpg → image, embedUrl unchanged", () => {
      const url = "https://i.imgur.com/abc123.jpg";
      const { post } = api.getPost({ post: { url } });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("image");
      expect(embed.embedUrl).toBe(url);
    });

    test("url=.gif → image, embedUrl unchanged (treated as static/animated image, not video)", () => {
      const url = "https://i.imgur.com/abc123.gif";
      const { post } = api.getPost({ post: { url } });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("image");
      expect(embed.embedUrl).toBe(url);
    });

    test("url=.mp4 → video, embedUrl unchanged", () => {
      const url = "https://i.imgur.com/abc123.mp4";
      const { post } = api.getPost({ post: { url } });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("video");
      expect(embed.embedUrl).toBe(url);
    });

    test("url=.gifv → video, embedUrl normalized to .mp4", () => {
      const { post } = api.getPost({
        post: { url: "https://i.imgur.com/abc123.gifv" },
      });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("video");
      expect(embed.embedUrl).toBe("https://i.imgur.com/abc123.mp4");
    });

    test("non-imgur .gifv url is not normalized", () => {
      const url = "https://example.com/clip.gifv";
      const { post } = api.getPost({ post: { url } });
      expect(getPostEmbed(post).embedUrl).toBe(url);
    });
  });

  describe("embedVideoUrl only (no url)", () => {
    test("embedVideoUrl=.mp4 → video, embedUrl set to embedVideoUrl", () => {
      const embedVideoUrl = "https://i.imgur.com/abc123.mp4";
      const { post } = api.getPost({ post: { url: null, embedVideoUrl } });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("video");
      expect(embed.embedUrl).toBe(embedVideoUrl);
    });

    test("embedVideoUrl=.gifv → video, embedUrl normalized to .mp4", () => {
      const { post } = api.getPost({
        post: { url: null, embedVideoUrl: "https://i.imgur.com/abc123.gifv" },
      });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("video");
      expect(embed.embedUrl).toBe("https://i.imgur.com/abc123.mp4");
    });
  });

  describe("url and embedVideoUrl both set", () => {
    // When embedVideoUrl holds a video file, it is checked before the url-based
    // video check, so embedVideoUrl wins and becomes the embedUrl.
    test("url=.gifv + embedVideoUrl=.mp4 → embedVideoUrl wins, type=video", () => {
      const embedVideoUrl = "https://i.imgur.com/abc123.mp4";
      const { post } = api.getPost({
        post: { url: "https://i.imgur.com/abc123.gifv", embedVideoUrl },
      });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("video");
      expect(embed.embedUrl).toBe(embedVideoUrl);
    });

    test("url=.mp4 + embedVideoUrl=.mp4 → embedVideoUrl wins", () => {
      const embedVideoUrl = "https://i.imgur.com/other.mp4";
      const { post } = api.getPost({
        post: { url: "https://i.imgur.com/abc123.mp4", embedVideoUrl },
      });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("video");
      expect(embed.embedUrl).toBe(embedVideoUrl);
    });

    // Image extensions in the url are detected before the embedVideoUrl video
    // check, so a .gif url beats an .mp4 embedVideoUrl.
    test("url=.gif + embedVideoUrl=.mp4 → url wins, type=image", () => {
      const url = "https://i.imgur.com/abc123.gif";
      const { post } = api.getPost({
        post: { url, embedVideoUrl: "https://i.imgur.com/abc123.mp4" },
      });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("image");
      expect(embed.embedUrl).toBe(url);
    });

    test("url=.png + embedVideoUrl=.mp4 → url wins, type=image", () => {
      const url = "https://i.imgur.com/abc123.png";
      const { post } = api.getPost({
        post: { url, embedVideoUrl: "https://i.imgur.com/abc123.mp4" },
      });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("image");
      expect(embed.embedUrl).toBe(url);
    });
  });

  describe("urlContentType disagrees with url extension", () => {
    // urlContentType="image/gif" forces image detection before any extension
    // check, but normalizeVideoUrl still rewrites .gifv → .mp4 on the embedUrl.
    // This produces type=image with an .mp4 embedUrl — a mismatch that stems
    // from bad upstream data.
    test("urlContentType=image/gif + url=.gifv → type=image, embedUrl normalized to .mp4", () => {
      const { post } = api.getPost({
        post: {
          url: "https://i.imgur.com/abc123.gifv",
          urlContentType: "image/gif",
        },
      });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("image");
      expect(embed.embedUrl).toBe("https://i.imgur.com/abc123.mp4");
    });

    // urlContentType="video/mp4" correctly routes a .gifv url through video
    // detection, and the url still gets normalized.
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
});

// ─── text ────────────────────────────────────────────────────────────────────

describe("getPostEmbed — text", () => {
  test("post with no url and no embedVideoUrl returns text type", () => {
    const { post } = api.getPost({ post: { url: null, embedVideoUrl: null } });
    const embed = getPostEmbed(post);
    expect(embed.type).toBe("text");
    expect(embed.embedUrl).toBeNull();
  });
});

// ─── article ─────────────────────────────────────────────────────────────────

describe("getPostEmbed — article", () => {
  test("post with an unrecognized url returns article type", () => {
    const { post } = api.getPost({
      post: { url: "https://example.com/some-article" },
    });
    const embed = getPostEmbed(post);
    expect(embed.type).toBe("article");
    expect(embed.embedUrl).toBe(post.url);
  });
});

// ─── image ───────────────────────────────────────────────────────────────────

describe("getPostEmbed — image", () => {
  test("urlContentType image/jpeg yields image type", () => {
    const { post } = api.getPost({
      post: { url: "https://example.com/photo", urlContentType: "image/jpeg" },
    });
    const embed = getPostEmbed(post);
    expect(embed.type).toBe("image");
  });

  test("urlContentType image/png yields image type", () => {
    const { post } = api.getPost({
      post: { url: "https://example.com/photo", urlContentType: "image/png" },
    });
    expect(getPostEmbed(post).type).toBe("image");
  });

  test(".jpeg extension yields image type", () => {
    const { post } = api.getPost({
      post: { url: "https://example.com/photo.jpeg" },
    });
    expect(getPostEmbed(post).type).toBe("image");
  });

  test(".jpg extension yields image type", () => {
    const { post } = api.getPost({
      post: { url: "https://example.com/photo.jpg" },
    });
    expect(getPostEmbed(post).type).toBe("image");
  });

  test(".png extension yields image type", () => {
    const { post } = api.getPost({
      post: { url: "https://example.com/photo.png" },
    });
    expect(getPostEmbed(post).type).toBe("image");
  });

  test(".webp extension yields image type", () => {
    const { post } = api.getPost({
      post: { url: "https://example.com/photo.webp" },
    });
    expect(getPostEmbed(post).type).toBe("image");
  });

  test(".gif extension yields image type", () => {
    const { post } = api.getPost({
      post: { url: "https://example.com/anim.gif" },
    });
    expect(getPostEmbed(post).type).toBe("image");
  });

  test("query string after image extension is ignored during extension check", () => {
    const { post } = api.getPost({
      post: { url: "https://example.com/photo.jpg?size=large" },
    });
    expect(getPostEmbed(post).type).toBe("image");
  });

  test("fullResThumbnail is set when url differs from thumbnailUrl", () => {
    const url = "https://example.com/full.jpg";
    const thumbnailUrl = "https://example.com/thumb.jpg";
    const { post } = api.getPost({
      post: { url, thumbnailUrl, urlContentType: "image/jpeg" },
    });
    const embed = getPostEmbed(post);
    expect(embed.type).toBe("image");
    expect(embed.fullResThumbnail).toBe(url);
  });

  test("fullResThumbnail is null when url equals thumbnailUrl", () => {
    const url = "https://example.com/photo.jpg";
    const { post } = api.getPost({
      post: { url, thumbnailUrl: url, urlContentType: "image/jpeg" },
    });
    const embed = getPostEmbed(post);
    expect(embed.type).toBe("image");
    expect(embed.fullResThumbnail).toBeNull();
  });

  test("fullResThumbnail is null for non-image types", () => {
    const { post } = api.getPost({
      post: { url: "https://www.youtube.com/watch?v=LDU_Txk06tM" },
    });
    expect(getPostEmbed(post).fullResThumbnail).toBeNull();
  });
});

// ─── video ───────────────────────────────────────────────────────────────────

describe("getPostEmbed — video via url", () => {
  test(".mp4 url extension yields video type", () => {
    const { post } = api.getPost({
      post: { url: "https://www.w3schools.com/html/mov_bbb.mp4" },
    });
    const embed = getPostEmbed(post);
    expect(embed.type).toBe("video");
    expect(embed.embedUrl).toBe(post.url);
  });

  test(".gifv url extension yields video type", () => {
    const { post } = api.getPost({
      post: { url: "https://example.com/clip.gifv" },
    });
    const embed = getPostEmbed(post);
    expect(embed.type).toBe("video");
  });

  test("urlContentType video/mp4 yields video type", () => {
    const { post } = api.getPost({
      post: { url: "https://example.com/clip", urlContentType: "video/mp4" },
    });
    expect(getPostEmbed(post).type).toBe("video");
  });
});

describe("getPostEmbed — video via embedVideoUrl", () => {
  test(".mp4 embedVideoUrl yields video type and sets embedUrl", () => {
    const embedVideoUrl = "https://example.com/clip.mp4";
    const { post } = api.getPost({
      post: { embedVideoUrl },
    });
    const embed = getPostEmbed(post);
    expect(embed.type).toBe("video");
    expect(embed.embedUrl).toBe(embedVideoUrl);
  });

  test(".m3u8 embedVideoUrl yields video type", () => {
    const embedVideoUrl = "https://example.com/stream.m3u8";
    const { post } = api.getPost({
      post: { embedVideoUrl },
    });
    const embed = getPostEmbed(post);
    expect(embed.type).toBe("video");
    expect(embed.embedUrl).toBe(embedVideoUrl);
  });

  test(".gifv embedVideoUrl yields video type", () => {
    const embedVideoUrl = "https://example.com/anim.gifv";
    const { post } = api.getPost({
      post: { embedVideoUrl },
    });
    const embed = getPostEmbed(post);
    expect(embed.type).toBe("video");
    expect(embed.embedUrl).toBe(embedVideoUrl);
  });
});

// ─── youtube ─────────────────────────────────────────────────────────────────
//
// YouTube URLs come in many forms. The regex matches /watch?v=, /embed/,
// /live/, /shorts/, and bare / (for youtu.be). The video ID must be exactly
// 11 characters. Query params are safe — the ID capture stops at & or ?.

describe("youtube", () => {
  describe("URL formats", () => {
    test("standard /watch?v= url", () => {
      const { post } = api.getPost({
        post: { url: "https://www.youtube.com/watch?v=LDU_Txk06tM" },
      });
      expect(getPostEmbed(post).type).toBe("youtube");
    });

    test("youtube.com without www", () => {
      const { post } = api.getPost({
        post: { url: "https://youtube.com/watch?v=LDU_Txk06tM" },
      });
      expect(getPostEmbed(post).type).toBe("youtube");
    });

    test("youtu.be short url", () => {
      const { post } = api.getPost({
        post: { url: "https://youtu.be/LDU_Txk06tM" },
      });
      expect(getPostEmbed(post).type).toBe("youtube");
    });

    test("/shorts/ url", () => {
      const { post } = api.getPost({
        post: { url: "https://www.youtube.com/shorts/LDU_Txk06tM" },
      });
      expect(getPostEmbed(post).type).toBe("youtube");
    });

    test("/embed/ url", () => {
      const { post } = api.getPost({
        post: { url: "https://www.youtube.com/embed/LDU_Txk06tM" },
      });
      expect(getPostEmbed(post).type).toBe("youtube");
    });

    test("/live/ url", () => {
      const { post } = api.getPost({
        post: { url: "https://www.youtube.com/live/LDU_Txk06tM" },
      });
      expect(getPostEmbed(post).type).toBe("youtube");
    });
  });

  describe("query params", () => {
    test("watch url with start time (t=) param", () => {
      const { post } = api.getPost({
        post: { url: "https://www.youtube.com/watch?v=LDU_Txk06tM&t=90s" },
      });
      expect(getPostEmbed(post).type).toBe("youtube");
    });

    test("youtu.be with start time (t=) param", () => {
      const { post } = api.getPost({
        post: { url: "https://youtu.be/LDU_Txk06tM?t=90" },
      });
      expect(getPostEmbed(post).type).toBe("youtube");
    });

    test("watch url with playlist context (v= + list=)", () => {
      const { post } = api.getPost({
        post: {
          url: "https://www.youtube.com/watch?v=LDU_Txk06tM&list=PLrEnWoR732-BHrPp_Pm8_VleD68f9s14-",
        },
      });
      expect(getPostEmbed(post).type).toBe("youtube");
    });
  });

  describe("non-matching urls", () => {
    test("channel page (no video ID) does not yield youtube type", () => {
      const { post } = api.getPost({
        post: {
          url: "https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx",
        },
      });
      expect(getPostEmbed(post).type).not.toBe("youtube");
    });

    test("playlist page without video ID does not yield youtube type", () => {
      const { post } = api.getPost({
        post: {
          url: "https://www.youtube.com/playlist?list=PLrEnWoR732-BHrPp_Pm8_VleD68f9s14-",
        },
      });
      expect(getPostEmbed(post).type).not.toBe("youtube");
    });
  });
});

// ─── vimeo ───────────────────────────────────────────────────────────────────

describe("vimeo", () => {
  describe("matching urls", () => {
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

  describe("non-matching urls", () => {
    test("channel index page (no video id) does not yield vimeo type", () => {
      const { post } = api.getPost({
        post: { url: "https://vimeo.com/channels/staffpicks" },
      });
      expect(getPostEmbed(post).type).not.toBe("vimeo");
    });
  });
});

// ─── soundcloud ──────────────────────────────────────────────────────────────

describe("getPostEmbed — soundcloud", () => {
  test("soundcloud url yields soundcloud type", () => {
    const { post } = api.getPost({
      post: {
        url: "https://soundcloud.com/tomvalbyrotary/youre-making-my-teeth-grow",
      },
    });
    expect(getPostEmbed(post).type).toBe("soundcloud");
  });
});

// ─── spotify ─────────────────────────────────────────────────────────────────

describe("spotify", () => {
  describe("matching urls", () => {
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

    // Albums and episodes are embeddable content on Spotify but the regex only
    // allows playlist|track, so these currently fall through to article.
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

  describe("non-matching urls", () => {
    test("artist page does not yield spotify type", () => {
      const { post } = api.getPost({
        post: { url: "https://open.spotify.com/artist/0TnOYISbd1XYRBk9myaseg" },
      });
      expect(getPostEmbed(post).type).not.toBe("spotify");
    });
  });
});

// ─── bandcamp ────────────────────────────────────────────────────────────────

describe("bandcamp", () => {
  const EMBED_URL_1 =
    "https://bandcamp.com/EmbeddedPlayer/v=2/track=2978997260/size=large/tracklist=false/artwork=small/";
  const EMBED_URL_2 =
    "https://bandcamp.com/EmbeddedPlayer/v=2/track=1111111111/size=large/tracklist=false/artwork=small/";

  describe("via embedVideoUrl", () => {
    test("EmbeddedPlayer embedVideoUrl → bandcamp, embedUrl set to embedVideoUrl", () => {
      const { post } = api.getPost({ post: { embedVideoUrl: EMBED_URL_1 } });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("bandcamp");
      expect(embed.embedUrl).toBe(EMBED_URL_1);
    });
  });

  describe("via url", () => {
    // Detection should work regardless of which field carries the EmbeddedPlayer
    // URL. Currently only embedVideoUrl is checked, so this fails.
    test("EmbeddedPlayer url → bandcamp, embedUrl set to url", () => {
      const { post } = api.getPost({ post: { url: EMBED_URL_1 } });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("bandcamp");
      expect(embed.embedUrl).toBe(EMBED_URL_1);
    });
  });

  describe("embedVideoUrl takes priority over url", () => {
    test("EmbeddedPlayer in both fields → embedVideoUrl wins", () => {
      const { post } = api.getPost({
        post: { url: EMBED_URL_1, embedVideoUrl: EMBED_URL_2 },
      });
      const embed = getPostEmbed(post);
      expect(embed.type).toBe("bandcamp");
      expect(embed.embedUrl).toBe(EMBED_URL_2);
    });
  });
});

// ─── loops ───────────────────────────────────────────────────────────────────

describe("getPostEmbed — loops", () => {
  test("loops.video url yields loops type", () => {
    const { post } = api.getPost({
      post: { url: "https://loops.video/v/60Sa-5oVYT" },
    });
    expect(getPostEmbed(post).type).toBe("loops");
  });
});

// ─── redgifs ─────────────────────────────────────────────────────────────────

describe("getPostEmbed — redgifs", () => {
  test("www.redgifs.com/watch url yields redgif type", () => {
    const { post } = api.getPost({
      post: { url: "https://www.redgifs.com/watch/testredgifid" },
    });
    expect(getPostEmbed(post).type).toBe("redgif");
  });

  test("redgifs.com/watch url (no www) yields redgif type", () => {
    const { post } = api.getPost({
      post: { url: "https://redgifs.com/watch/testredgifid" },
    });
    expect(getPostEmbed(post).type).toBe("redgif");
  });

  test("redgif via embedVideoUrl sets embedUrl", () => {
    const embedVideoUrl = "https://www.redgifs.com/watch/someothergif";
    const { post } = api.getPost({
      post: { embedVideoUrl },
    });
    const embed = getPostEmbed(post);
    expect(embed.type).toBe("redgif");
    expect(embed.embedUrl).toBe(embedVideoUrl);
  });

  test("redgif via embedVideoUrl (no www) sets embedUrl", () => {
    const embedVideoUrl = "https://redgifs.com/watch/someothergif";
    const { post } = api.getPost({
      post: { embedVideoUrl },
    });
    const embed = getPostEmbed(post);
    expect(embed.type).toBe("redgif");
    expect(embed.embedUrl).toBe(embedVideoUrl);
  });
});

// ─── peertube ────────────────────────────────────────────────────────────────

describe("getPostEmbed — peertube", () => {
  test("peertube /videos/watch/ UUID url yields peertube type", () => {
    const { post } = api.getPost({
      post: {
        url: "https://lone.earth/videos/watch/d1616b46-8935-438d-80f9-10def00416dd",
      },
    });
    expect(getPostEmbed(post).type).toBe("peertube");
  });

  test("peertube /w/ short url yields peertube type", () => {
    const { post } = api.getPost({
      post: { url: "https://video.blahaj.zone/w/abc123xyz" },
    });
    expect(getPostEmbed(post).type).toBe("peertube");
  });

  test("url with /videos/watch/ but invalid UUID does not yield peertube type", () => {
    const { post } = api.getPost({
      post: { url: "https://example.com/videos/watch/not-a-uuid" },
    });
    expect(getPostEmbed(post).type).not.toBe("peertube");
  });
});

// ─── generic-video ───────────────────────────────────────────────────────────

describe("getPostEmbed — generic-video", () => {
  test("unrecognized embedVideoUrl yields generic-video type and sets embedUrl", () => {
    const embedVideoUrl = "https://example.com/some-video-embed";
    const { post } = api.getPost({
      post: { url: null, embedVideoUrl },
    });
    const embed = getPostEmbed(post);
    expect(embed.type).toBe("generic-video");
    expect(embed.embedUrl).toBe(embedVideoUrl);
  });
});

// ─── thumbnail passthrough ────────────────────────────────────────────────────

describe("getPostEmbed — thumbnail passthrough", () => {
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
