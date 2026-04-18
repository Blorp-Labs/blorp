import { useTagUserStore } from "../stores/user-tags";
import z from "zod";
import { useConfirmationAlert } from "./alerts";

export function useTagUser() {
  const setUserTag = useTagUserStore((s) => s.setUserTag);
  const alrt = useConfirmationAlert();

  return async (userHandle: string, initValue?: string) => {
    const { tag } = await alrt({
      header: userHandle,
      message: "Tag user to identify them later",
      inputs: [
        {
          type: "text",
          name: "tag",
          id: "tag",
          value: initValue,
        },
      ],
      schema: z.object({
        tag: z.string(),
      }),
    });
    setUserTag(userHandle, tag);
  };
}
