// Some code copied from
// https://github.com/aeharding/voyager/blob/f123ad405d61e79e52c99241bda4cac349f92695/src/features/share/asImage/ShareAsImageModal.tsx#L19

import { Share } from "@capacitor/share";
import _ from "lodash";
import { ActionMenuProps } from "@/src/components/adaptable/action-menu";
import {
  ShareLinkType,
  SHARE_LINK_TYPE_OPTIONS,
  useSettingsStore,
} from "@/src/stores/settings";
import { useAuth } from "@/src/stores/auth";
import {
  copyToClipboard,
  downloadImage,
  getShareUrl,
  ShareEntityContext,
  shareImage,
  useCanShare,
} from "@/src/hooks/share";
import { useSelectAlert } from "@/src/hooks";

export function useShareActions(
  label: string,
  entity: ShareEntityContext | null | undefined,
) {
  const canShareNative = useCanShare();
  const shareLinkType = useSettingsStore((s) => s.shareLinkType);
  const setShareLinkType = useSettingsStore((s) => s.setShareLinkType);
  const account = useAuth((s) => s.getSelectedAccount());
  const selectAlert = useSelectAlert();

  if (!entity) {
    return [];
  }

  const getMode = async (): Promise<ShareLinkType | null> => {
    if (shareLinkType !== null) {
      return shareLinkType;
    }
    try {
      const selected = await selectAlert({
        header: "How would you like to share? Change this later in Settings.",
        message:
          '"My Instance" uses whatever account or guess account you have selected',
        options: SHARE_LINK_TYPE_OPTIONS.map((o) => ({
          text: o.label,
          value: o.value,
        })),
      });
      setShareLinkType(selected);
      return selected;
    } catch {
      return null;
    }
  };

  const doShare = async () => {
    const mode = await getMode();
    if (mode) {
      const url = getShareUrl(mode, entity, account);
      try {
        const result = await Share.canShare();
        if (result.value) {
          await Share.share({ url });
        } else if (_.isFunction(navigator.share)) {
          await navigator.share({ url });
        }
      } catch (e) {
        console.error("Error sharing URL:", e);
      }
    }
  };

  const doCopy = async () => {
    const mode = await getMode();
    if (mode) {
      const url = getShareUrl(mode, entity, account);
      copyToClipboard(url);
    }
  };

  return [
    {
      text: "Share",
      actions: [
        ...(canShareNative
          ? [
              {
                text: `Share link to ${label}`,
                onClick: doShare,
              },
            ]
          : []),
        {
          text: `Copy link to ${label}`,
          onClick: doCopy,
        },
      ],
    },
  ] satisfies ActionMenuProps["actions"];
}

export function useImageShareActions({
  imageSrc,
}: {
  imageSrc?: string;
}): ActionMenuProps<string>["actions"] {
  return [
    ...(imageSrc
      ? [
          {
            text: "Share image",
            onClick: () => shareImage(imageSrc, imageSrc),
          },
        ]
      : []),
    ...(imageSrc
      ? [
          {
            text: "Download image",
            onClick: () => downloadImage(imageSrc, imageSrc),
          },
        ]
      : []),
  ];
}
