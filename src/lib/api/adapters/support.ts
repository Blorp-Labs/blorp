import { compare } from "compare-versions";

type Software = {
  software: "lemmy" | "piefed" | undefined;
  softwareVersion: string | undefined;
};

function compareVersions(a: string, b: string) {
  try {
    const [aBase] = a.split("-");
    return aBase && compare(aBase, b, ">=");
  } catch {
    return undefined;
  }
}

export function supportsFeeds({ software, softwareVersion }: Software) {
  return (
    software === "piefed" ||
    (software === "lemmy" && softwareVersion?.startsWith("nightly")) ||
    (softwareVersion && compareVersions(softwareVersion, "1.0.0"))
  );
}

export function supportsMarkCommentAsAnswer({ software }: Software) {
  return software === "piefed";
}

export function supportsPollCreation({ software }: Software) {
  return software === "piefed";
}
