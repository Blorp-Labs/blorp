import { deflateSync } from "node:zlib";
import { test, expect } from "@playwright/test";
import { z } from "zod";

const STORYBOOK_PORT = 6006;
const BASE_URL = `http://localhost:${STORYBOOK_PORT}`;

const ANIMATION_KILL_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
`;

// Build a CRC32 lookup table once
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8)) >>> 0;
  }
  return ((c ^ 0xffffffff) >>> 0) >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBytes = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

/**
 * Returns a solid light-gray PNG of the given dimensions.
 * Having the correct size matters for components that size themselves
 * based on the image's natural width/height.
 */
function createPlaceholderPng(width: number, height: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB

  // Each scanline: 1 filter byte (0 = None) + width * 3 RGB bytes
  const row = Buffer.alloc(1 + width * 3, 0);
  row[0] = 0; // filter
  for (let x = 0; x < width; x++) {
    row[1 + x * 3] = 0xcc; // R  } light gray
    row[2 + x * 3] = 0xcc; // G  }
    row[3 + x * 3] = 0xcc; // B  }
  }
  const idat = deflateSync(
    Buffer.concat(Array.from({ length: height }, () => row)),
  );

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG sig
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Derive image dimensions from the URL where possible.
 * picsum.photos encodes size in the path: /id/N/WIDTH/HEIGHT
 * Everything else falls back to a reasonable placeholder size.
 */
function dimensionsFromUrl(url: string): { width: number; height: number } {
  const picsumMatch = url.match(/picsum\.photos\/(?:id\/\d+\/)?(\d+)\/(\d+)/);
  if (picsumMatch) {
    return { width: Number(picsumMatch[1]), height: Number(picsumMatch[2]) };
  }
  return { width: 400, height: 300 };
}

test.beforeEach(async ({ page }) => {
  // Intercept external image/embed requests so tests don't depend on the
  // network. Return a correctly-sized placeholder PNG so components that
  // lay out based on natural image dimensions look right.
  await page.route(
    /picsum\.photos|youtube\.com|youtu\.be|lemmy\.world|w3schools\.com/,
    (route) => {
      const { width, height } = dimensionsFromUrl(route.request().url());
      route.fulfill({
        status: 200,
        contentType: "image/png",
        body: createPlaceholderPng(width, height),
      });
    },
  );

  // Inject a script that runs on every navigation to detect when Storybook
  // has fully rendered a story (including async loaders).
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>)["__storyRendered"] = false;

    const attachWhenReady = () => {
      const channel = (
        window as unknown as Record<
          string,
          { on: (event: string, cb: () => void) => void }
        >
      )["__STORYBOOK_ADDONS_CHANNEL__"];
      if (channel) {
        channel.on("storyRendered", () => {
          (window as unknown as Record<string, unknown>)["__storyRendered"] =
            true;
        });
      } else {
        setTimeout(attachWhenReady, 5);
      }
    };
    attachWhenReady();
  });
});

test("visual snapshots", async ({ page }) => {
  // Give plenty of time for the full suite of stories
  test.setTimeout(300_000);

  const response = await page.goto(`${BASE_URL}/index.json`);
  const { entries } = z
    .object({ entries: z.record(z.object({ type: z.string() })) })
    .parse(await response!.json());

  const storyIds = Object.entries(entries)
    .filter(([, entry]) => entry.type === "story")
    .map(([id]) => id);

  for (const id of storyIds) {
    await test.step(id, async () => {
      await page.goto(`${BASE_URL}/iframe.html?id=${id}&viewMode=story`);

      // Wait for Storybook to finish running loaders and rendering the story
      await page.waitForFunction(
        () =>
          (window as unknown as Record<string, unknown>)["__storyRendered"] ===
          true,
        { timeout: 15_000 },
      );

      await page.addStyleTag({ content: ANIMATION_KILL_CSS });
      // Use soft assertions so all stories are captured even if some fail
      await expect.soft(page).toHaveScreenshot(`${id}.png`, {
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});
