import { Schemas } from "@/src/api-blueprint";
import { commentIsAnswer } from "@/src/lib/api";

export function getCommentBgClass(config: {
  commentView: Schemas.Comment | undefined;
  highlightComment: boolean | undefined;
}) {
  if (config.highlightComment) {
    return "bg-brand/10 dark:bg-brand/20";
  }
  if (config.commentView && commentIsAnswer(config?.commentView)) {
    return "bg-green-100 dark:bg-green-950";
  }
}
