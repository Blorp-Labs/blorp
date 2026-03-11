import { describe, test, expect } from "vitest";
import {
  scoreDisplayFromSite,
  shouldShowDownvotes,
  resolveThreshold,
} from "./utils";
import * as api from "@/test-utils/api";

// ─── scoreDisplayFromSite ────────────────────────────────────────────────────

describe("scoreDisplayFromSite — explicit app-level override", () => {
  test("'score' override always returns 'score'", () => {
    const site = api.getSite({
      showUpvotes: false,
      showDownvotes: false,
      showScores: false,
    });
    expect(scoreDisplayFromSite("score", site)).toBe("score");
  });

  test("'upvotes' override always returns 'upvotes'", () => {
    const site = api.getSite({
      showUpvotes: false,
      showDownvotes: false,
      showScores: false,
    });
    expect(scoreDisplayFromSite("upvotes", site)).toBe("upvotes");
  });

  test("'downvotes' override always returns 'downvotes'", () => {
    const site = api.getSite({
      showUpvotes: false,
      showDownvotes: false,
      showScores: false,
    });
    expect(scoreDisplayFromSite("downvotes", site)).toBe("downvotes");
  });

  test("'none' override always returns 'none'", () => {
    const site = api.getSite({
      showUpvotes: true,
      showDownvotes: true,
      showScores: true,
    });
    expect(scoreDisplayFromSite("none", site)).toBe("none");
  });
});

describe("scoreDisplayFromSite — 'account' mode derives from site flags", () => {
  // showUpvotes=true + showDownvotes=true → treated as combined score.
  test("showUpvotes=true, showDownvotes=true, enableCommentDownvotes=true → 'score'", () => {
    const site = api.getSite({
      showUpvotes: true,
      showDownvotes: true,
      enableCommentDownvotes: true,
    });
    expect(scoreDisplayFromSite("account", site)).toBe("score");
  });

  // showDownvotes=true is ignored when the server has disabled downvotes.
  test("showUpvotes=true, showDownvotes=true, enableCommentDownvotes=false → 'upvotes'", () => {
    const site = api.getSite({
      showUpvotes: true,
      showDownvotes: true,
      enableCommentDownvotes: false,
    });
    expect(scoreDisplayFromSite("account", site)).toBe("upvotes");
  });

  test("showUpvotes=true, showDownvotes=false → 'upvotes'", () => {
    const site = api.getSite({
      showUpvotes: true,
      showDownvotes: false,
      enableCommentDownvotes: true,
    });
    expect(scoreDisplayFromSite("account", site)).toBe("upvotes");
  });

  test("showUpvotes=false, showDownvotes=true, enableCommentDownvotes=true → 'downvotes'", () => {
    const site = api.getSite({
      showUpvotes: false,
      showDownvotes: true,
      enableCommentDownvotes: true,
    });
    expect(scoreDisplayFromSite("account", site)).toBe("downvotes");
  });

  // showScores=true acts as a fallback combined score when individual flags are off.
  test("showUpvotes=false, showDownvotes=false, showScores=true → 'score'", () => {
    const site = api.getSite({
      showUpvotes: false,
      showDownvotes: false,
      showScores: true,
    });
    expect(scoreDisplayFromSite("account", site)).toBe("score");
  });

  test("showUpvotes=false, showDownvotes=false, showScores=false → 'none'", () => {
    const site = api.getSite({
      showUpvotes: false,
      showDownvotes: false,
      showScores: false,
    });
    expect(scoreDisplayFromSite("account", site)).toBe("none");
  });

  // No site (logged-out guest) — all flags default to true → 'score'.
  test("no site (logged out) defaults to 'score'", () => {
    expect(scoreDisplayFromSite("account", undefined)).toBe("score");
  });
});

// ─── shouldShowDownvotes ─────────────────────────────────────────────────────

describe("shouldShowDownvotes — explicit 'none' always hides button", () => {
  test("voteDisplaySetting='none' hides downvote button even when server enables them", () => {
    expect(shouldShowDownvotes("none", true, "score")).toBe(false);
  });
});

describe("shouldShowDownvotes — explicit app-level modes respect server capability", () => {
  test("'score' + server enables downvotes → show button", () => {
    expect(shouldShowDownvotes("score", true, "score")).toBe(true);
  });

  test("'score' + server disables downvotes → hide button", () => {
    expect(shouldShowDownvotes("score", false, "score")).toBe(false);
  });

  test("'upvotes' + server enables downvotes → show button", () => {
    expect(shouldShowDownvotes("upvotes", true, "upvotes")).toBe(true);
  });

  test("'downvotes' + server enables downvotes → show button", () => {
    expect(shouldShowDownvotes("downvotes", true, "downvotes")).toBe(true);
  });

  test("'downvotes' + server disables downvotes → hide button", () => {
    expect(shouldShowDownvotes("downvotes", false, "downvotes")).toBe(false);
  });
});

describe("shouldShowDownvotes — 'account' mode", () => {
  // Key regression: score mode has showDownvotes=false on the account object
  // but the downvote button should still appear when the server supports it.
  test("account scoreDisplay='score', server enables downvotes → show button", () => {
    expect(shouldShowDownvotes("account", true, "score")).toBe(true);
  });

  test("account scoreDisplay='score', server disables downvotes → hide button", () => {
    expect(shouldShowDownvotes("account", false, "score")).toBe(false);
  });

  test("account scoreDisplay='upvotes', server enables downvotes → show button", () => {
    expect(shouldShowDownvotes("account", true, "upvotes")).toBe(true);
  });

  test("account scoreDisplay='downvotes', server enables downvotes → show button", () => {
    expect(shouldShowDownvotes("account", true, "downvotes")).toBe(true);
  });

  test("account scoreDisplay='none' → hide button even when server enables them", () => {
    expect(shouldShowDownvotes("account", true, "none")).toBe(false);
  });
});

// ─── resolveThreshold ────────────────────────────────────────────────────────

describe("resolveThreshold", () => {
  test("'account' mode returns server threshold", () => {
    expect(resolveThreshold("account", -15)).toBe(-15);
  });

  test("'account' mode returns null when site has no threshold", () => {
    expect(resolveThreshold("account", undefined)).toBe(null);
  });

  test("explicit numeric setting ignores server value", () => {
    expect(resolveThreshold(-5, -20)).toBe(-5);
  });
});
