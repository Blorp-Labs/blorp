import { describe, it, expect } from "vitest";
import { normalizeFilename, getFileName } from "./share";

describe("normalizeFilename", () => {
  it("strips https:// scheme", () => {
    expect(normalizeFilename("https://example.com/image.jpg")).toBe(
      "examplecom-imagejpg",
    );
  });

  it("strips http:// scheme", () => {
    expect(normalizeFilename("http://example.com/image.jpg")).toBe(
      "examplecom-imagejpg",
    );
  });

  it("strips query string", () => {
    expect(
      normalizeFilename("https://example.com/image.jpg?size=large&format=webp"),
    ).toBe("examplecom-imagejpg");
  });

  it("strips fragment", () => {
    expect(normalizeFilename("https://example.com/image.jpg#section")).toBe(
      "examplecom-imagejpg",
    );
  });

  it("strips query string and fragment together", () => {
    expect(normalizeFilename("https://example.com/image.jpg?foo=bar#baz")).toBe(
      "examplecom-imagejpg",
    );
  });

  it("replaces slashes with dashes", () => {
    expect(normalizeFilename("https://cdn.example.com/a/b/c/image.png")).toBe(
      "cdnexamplecom-a-b-c-imagepng",
    );
  });

  it("replaces spaces with dashes", () => {
    expect(normalizeFilename("https://example.com/my image.jpg")).toBe(
      "examplecom-my-imagejpg",
    );
  });

  it("only contains a-zA-Z0-9, dashes, and underscores", () => {
    const result = normalizeFilename(
      "https://cdn.example.com/image.jpg?foo=bar&baz=qux#anchor",
    );
    expect(result).toMatch(/^[a-zA-Z0-9\-_]+$/);
  });

  it("collapses multiple consecutive dashes into one", () => {
    expect(normalizeFilename("https://example.com//double//slash.jpg")).toBe(
      "examplecom-double-slashjpg",
    );
  });

  it("handles URL without a path", () => {
    expect(normalizeFilename("https://example.com")).toBe("examplecom");
  });

  it("does not produce a trailing dash", () => {
    const result = normalizeFilename("https://example.com/image.jpg?foo=bar");
    expect(result).not.toMatch(/-$/);
  });
});

describe("getFileName", () => {
  it("does not duplicate the extension", () => {
    const blob = new Blob([], { type: "image/jpeg" });
    expect(getFileName(blob, "https://example.com/image.jpg")).toBe(
      "examplecom-image.jpg",
    );
  });

  it("appends the correct extension from blob MIME type", () => {
    const blob = new Blob([], { type: "image/png" });
    expect(getFileName(blob, "https://example.com/photo.png")).toBe(
      "examplecom-photo.png",
    );
  });

  it("strips query string from the filename", () => {
    const blob = new Blob([], { type: "image/jpeg" });
    expect(getFileName(blob, "https://example.com/image.jpg?size=large")).toBe(
      "examplecom-image.jpg",
    );
  });
});
