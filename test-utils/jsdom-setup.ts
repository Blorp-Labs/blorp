import { mockViewport } from "jsdom-testing-mocks";

// Patches `window.matchMedia` so components that read responsive breakpoints
// (e.g. `useMedia` for sm/md/lg/xl) can render under jsdom. 1024×768 falls
// into Tailwind's `lg` band, matching a typical desktop viewport.
mockViewport({ width: "1024px", height: "768px" });
