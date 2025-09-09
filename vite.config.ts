import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import vitePluginChecker from "vite-plugin-checker";
import circleDependency from "vite-plugin-circular-dependency";
import path from "path";
import legacy from "@vitejs/plugin-legacy";
import Sitemap from "vite-plugin-sitemap";
import { resolveRoute } from "./src/routing/resolve-route";

const VITE_FAST = process.env["VITE_FAST"];

const fast = VITE_FAST === "1" || VITE_FAST === "true";

const REACT_APP_HOST = process.env["REACT_APP_HOST"];
const hostname = (() => {
  let hostname = REACT_APP_HOST?.trim();
  if (!hostname) {
    return null;
  }
  if (!hostname.startsWith("http")) {
    hostname = `https://${hostname}`;
  }
  return hostname;
})();

// Used for SEO
const FEATURED_COMMUNITIES = [
  "technology@lemmy.world",
  "selfhosted@lemmy.world",
  "world@lemmy.world",
  "nostupidquestions@lemmy.world",
  "games@lemmy.world",
  "mildlyinfuriating@lemmy.world",
  "youshouldknow@lemmy.world",
  "showerthoughts@lemmy.world",
  "fediverse@lemmy.world",
  "asklemmy@lemmy.world",
  "lemmyshitpost@lemmy.world",
  "news@lemmy.world",
  "android@lemmy.world",
  "lemmyworld@lemmy.world",
  "linuxmemes@lemmy.world",
  "politics@lemmy.world",
  "aww@lemmy.world",
  "retrogaming@lemmy.world",
  "til@lemmy.world",
  "pics@lemmy.world",
  "cat@lemmy.world",
  "mildlyinteresting@lemmy.world",
  "nintendo@lemmy.world",
  "maliciouscompliance@lemmy.world",
  "science@lemmy.world",
  "reddit@lemmy.world",
  "linux_gaming@lemmy.world",
  "dadjokes@lemmy.world",
  "3dprinting@lemmy.world",
  "newcommunities@lemmy.world",
  "apple_enthusiast@lemmy.world",
  "comicstrips@lemmy.world",
  "pcmasterrace@lemmy.world",
  "foodporn@lemmy.world",
  "explainlikeimfive@lemmy.world",
  "nottheonion@lemmy.world",
  "memes@lemmy.world",
  "videos@lemmy.world",
  "sciencefiction@lemmy.world",
  "upliftingnews@lemmy.world",
  "homeassistant@lemmy.world",
  "syncforlemmy@lemmy.world",
  "starwarsmemes@lemmy.world",
  "futurama@lemmy.world",
  "aboringdystopia@lemmy.world",
  "workreform@lemmy.world",
  "general@lemmy.world",
  "outoftheloop@lemmy.world",
  "fuckcars@lemmy.world",
  "linux@lemmy.world",
] as const;

// https://vite.dev/config/
export default defineConfig({
  envPrefix: "REACT_APP_",
  plugins: [
    circleDependency(),
    vitePluginChecker({
      typescript: true,
    }),
    tailwindcss(),
    react(),
    ...(!fast
      ? [
          legacy({
            targets: ["defaults", "not IE 11"],
          }),
        ]
      : []),
    ...(hostname
      ? [
          Sitemap({
            hostname,
            dynamicRoutes: [
              resolveRoute("/home"),
              resolveRoute("/home/sidebar"),
              resolveRoute("/communities"),
              resolveRoute("/communities/sidebar"),
              resolveRoute("/inbox/sidebar"),
              ...FEATURED_COMMUNITIES.flatMap((communityName) => [
                resolveRoute("/communities/c/:communityName", {
                  communityName,
                }),
                resolveRoute("/communities/c/:communityName/sidebar", {
                  communityName,
                }),
                resolveRoute("/home/c/:communityName", {
                  communityName,
                }),
                resolveRoute("/home/c/:communityName/sidebar", {
                  communityName,
                }),
                resolveRoute("/communities/c/:communityName", {
                  communityName,
                }),
                resolveRoute("/communities/c/:communityName/sidebar", {
                  communityName,
                }),
                resolveRoute("/inbox/c/:communityName", {
                  communityName,
                }),
                resolveRoute("/inbox/c/:communityName/sidebar", {
                  communityName,
                }),
              ]),
            ],
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  publicDir: "public",
});
