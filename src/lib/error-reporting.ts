import { env } from "@/src/env";
import pkgJson from "@/package.json";

export const BLORP_COMMUNITY: `${string}@${string}` = "blorp@lemmy.zip";

export function buildErrorReport(
  contextFields: Record<string, string>,
  error: unknown,
): string {
  const err = error instanceof Error ? error : undefined;
  const errorMessage = err?.message ?? String(error);
  const stack = err?.stack ?? "";
  return [
    ...Object.entries(contextFields).map(([k, v]) => `**${k}:** ${v}`),
    `**App Version:** ${pkgJson.version}`,
    `**Commit:** ${env.REACT_APP_COMMIT_SHA}`,
    `**Error:** ${errorMessage}`,
    `**Stack:**\n\`\`\`\n${stack}\n\`\`\``,
  ].join("\n\n");
}

export function buildIssueUrl(title: string, body: string): string {
  return `https://github.com/Blorp-Labs/blorp/issues/new?${new URLSearchParams({
    labels: "bug",
    template: "bug_report.md",
    title,
    body,
  })}`;
}
