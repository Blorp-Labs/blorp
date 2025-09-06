const PIE_FED_INSTANCES = [
  "https://piefed.social",
  "https://feddit.online",
  "https://link.fossdle.org",
  "https://piefed.au",
  "https://feddit.fr",
  "https://tarte.nuage-libre.fr",
  "https://pf.korako.me",
  "https://piefed.blahaj.zone",
  "https://piefed.world",
  "https://piefed.ca",
  "https://piefed.lemmy.fan",
  "https://quokk.au",
].map((url) => ({
  url,
  baseUrl: new URL(url).host,
  score: -1,
  software: "piefed",
  desc: undefined,
  icon: undefined,
}));

const LEMMY_INSTANCES = ["https://lemmy.world"].map((url) => ({
  url,
  baseUrl: new URL(url).host,
  score: -1,
  software: "lemmy",
  desc: undefined,
  icon: undefined,
}));

export const INSTANCES = [...PIE_FED_INSTANCES, ...LEMMY_INSTANCES];
