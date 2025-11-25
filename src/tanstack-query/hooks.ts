import { UseQueryResult } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function useQueryToast(
  query: Pick<UseQueryResult, "status">,
  msgs: {
    error?: string;
    success?: string;
    pending?: string;
  },
) {
  const toastId = useRef<string | number>(undefined);

  const errorMsg = msgs.error;
  const successMsg = msgs.success;
  const pendingMsg = msgs.pending;

  useEffect(() => {
    switch (query.status) {
      case "error": {
        if (errorMsg) {
          toastId.current = toast.error(errorMsg, {
            id: toastId.current,
          });
        } else {
          toast.dismiss(toastId.current);
        }
        break;
      }
      case "success": {
        if (successMsg) {
          toastId.current = toast.success(successMsg, {
            id: toastId.current,
          });
        } else {
          toast.dismiss(toastId.current);
        }
        break;
      }
      case "pending": {
        if (pendingMsg) {
          toastId.current = toast.loading(pendingMsg, {
            id: toastId.current,
          });
        } else {
          toast.dismiss(toastId.current);
        }
        break;
      }
    }
  }, [query.status, errorMsg, successMsg, pendingMsg]);
}
