import { compare } from "compare-versions";

type Software = {
  software: "lemmy" | "piefed" | undefined;
  softwareVersion: string | undefined;
};

function compareVersions(a: string, b: string) {
  const [aBase] = a.split("-");
  return aBase && compare(aBase, b, ">=");
}

export function supportsFeeds({ software, softwareVersion }: Software) {
  return (
    software === "piefed" ||
    (softwareVersion && compareVersions(softwareVersion, "1.0.0"))
  );
}
