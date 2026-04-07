import _ from "lodash";

const RESOLVED = {
  post_Id: undefined,
  comment_id: undefined,
  community_id: undefined,
  person_id: undefined,
  multi_community_id: undefined,
};

export function getIdFromLocalApId(apId: string) {
  try {
    const pathname = new URL(apId).pathname;
    const id = pathname.match(/^\/(post|comment)\/([0-9]+)$/)?.[2];
    if (
      id &&
      (pathname.startsWith("/post/") || pathname.startsWith("/comment/"))
    ) {
      return {
        ...RESOLVED,
        post_id: _.parseInt(id),
      };
    }
  } catch {}
  return null;
}
