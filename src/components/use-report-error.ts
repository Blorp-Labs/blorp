import { useIonRouter } from "@ionic/react";
import { useCreatePostStore } from "@/src/stores/create-post";
import { parseAccountInfo, useAuth } from "@/src/stores/auth";
import { resolveRoute } from "@/src/routing/index";
import { v4 as uuid } from "uuid";
import {
  BLORP_COMMUNITY,
  buildErrorReport,
  buildIssueUrl,
} from "@/src/lib/error-reporting";
import { useRequireAuth } from "../hooks";

export function useReportError({
  contextFields,
  reportTitle,
  error,
}: {
  contextFields: Record<string, string>;
  reportTitle: string;
  error: unknown;
}) {
  const router = useIonRouter();
  const updateDraft = useCreatePostStore((s) => s.updateDraft);
  const requireAuth = useRequireAuth();
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const instance = useAuth(
    (s) => parseAccountInfo(s.getSelectedAccount()).instance,
  );

  const body = buildErrorReport(
    { ...contextFields, "User Instance": instance },
    error,
  );
  const issueUrl = buildIssueUrl(reportTitle, body);

  const reportViaCommunity = async () => {
    try {
      await requireAuth();
    } catch {
      return;
    }
    const draftId = uuid();
    updateDraft(draftId, {
      type: "text",
      communitySlug: BLORP_COMMUNITY,
      title: reportTitle,
      body,
    });
    router.push(resolveRoute("/create_post", `?id=${draftId}`));
  };

  return { isLoggedIn, issueUrl, reportViaCommunity };
}
