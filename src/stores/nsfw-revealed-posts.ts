import { create } from "zustand";

interface State {
  revealedApIds: Set<string>;
  revealPost: (apId: string) => void;
  isRevealed: (apId: string) => boolean;
}

export const useNsfwRevealedPostsStore = create<State>()((set, get) => ({
  revealedApIds: new Set(),
  revealPost: (apId) =>
    set((s) => ({ revealedApIds: new Set([...s.revealedApIds, apId]) })),
  isRevealed: (apId) => get().revealedApIds.has(apId),
}));
