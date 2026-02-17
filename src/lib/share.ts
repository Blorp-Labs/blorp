// Some code copied from
// https://github.com/aeharding/voyager/blob/f123ad405d61e79e52c99241bda4cac349f92695/src/features/share/asImage/ShareAsImageModal.tsx#L19

import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { privilegedFetch } from "./privileged-fetch";
import { env } from "../env";
import _ from "lodash";
import { useEffect, useState } from "react";
import { isAndroid, isCapacitor, isFirefox, isTauri, isWeb } from "./device";
import { ActionMenuProps } from "../components/adaptable/action-menu";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { Media } from "@capacitor-community/media";
import { toast } from "sonner";
import { isErrorLike } from "./utils";
import {
  ShareLinkType,
  SHARE_LINK_TYPE_OPTIONS,
  useSettingsStore,
} from "../stores/settings";
import { Account, parseAccountInfo, useAuth } from "../stores/auth";
import { useSelectAlert } from "./hooks/index";

function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error("Unexpected result from FileReader"));
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Derive a file extension from a Blob and/or URL.
 * Falls back to "png" if nothing recognizable.
 */
export function getFileExtension(blob: Blob, url?: string): string {
  // 1. Try blob.type (MIME)
  if (blob.type) {
    const map: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/svg+xml": "svg",
      "image/bmp": "bmp",
      "image/tiff": "tiff",
    };
    if (map[blob.type]) {
      return map[blob.type] ?? "png";
    }
  }

  // 2. Try URL path
  if (url) {
    const path = new URL(url, "https://dummy.base").pathname; // base in case it's relative
    const extMatch = path.match(/\.([a-zA-Z0-9]+)(?:$|\?)/);
    if (extMatch) {
      return extMatch[1]?.toLowerCase() ?? "png";
    }
  }

  // 3. Fallback
  return "png";
}

function getFileName(blob: Blob, url: string) {
  const extension = getFileExtension(blob, url);
  const fileName = url.replace(/^https:\/\//, "").replaceAll(/\//g, "-");
  return `${fileName}.${extension}`;
}

const DEFAULT_HEADERS = {
  // lemmy.ml will reject requests if
  // User-Agent header is not present
  "User-Agent": env.REACT_APP_NAME.toLowerCase(),
};

function blobToString(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const base64String = btoa(reader.result as string);
      resolve(base64String);
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsBinaryString(blob);
  });
}

// --- album helper: find or create, then return its identifier ---
async function ensureAlbumIdentifier(
  albumName: string,
): Promise<string | undefined> {
  const { albums } = await Media.getAlbums(); // returns list of { identifier, name, type }
  const existing = albums.find((a) => a.name === albumName);
  if (existing) return existing.identifier;

  await Media.createAlbum({ name: albumName });
  const after = (await Media.getAlbums()).albums;
  const created = after.find((a) => a.name === albumName);
  return created?.identifier;
}

async function downloadImageCapacitor(imageUrl: string, fileName: string) {
  await Media.savePhoto({
    path: imageUrl,
    fileName,
    ...(isAndroid()
      ? {
          albumIdentifier: await ensureAlbumIdentifier(env.REACT_APP_NAME),
        }
      : null),
  });
}

export async function downloadImage(name: string, imageUrl: string) {
  const id = toast.loading("Saving image");

  try {
    const response = await privilegedFetch(imageUrl, {
      headers: DEFAULT_HEADERS,
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch image from ${imageUrl}`);
    }

    const blob = await response.blob();
    if (!blob) return;

    const filename = getFileName(blob, name);

    if (isTauri()) {
      const savePath = await save({
        title: "Save image",
        defaultPath: filename,
        filters: [
          { name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] },
        ],
      });
      if (savePath) {
        const bytes = await blobToUint8Array(blob);
        await writeFile(savePath, bytes);
      }
    } else if (isCapacitor()) {
      await downloadImageCapacitor(imageUrl, filename);
    } else {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename || "image.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl); // cleanup
    }

    toast.success("Image saved", { id });
  } catch (err) {
    if (isErrorLike(err)) {
      toast.error(err.message, { id });
    } else {
      toast.error("Couldn't save image", { id });
    }
  }
}

export async function shareImage(name: string, imageUrl: string) {
  const id = toast.loading("Sharing image");

  try {
    // Fetch the image as a blob.
    const response = await privilegedFetch(imageUrl, {
      headers: DEFAULT_HEADERS,
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch image from ${imageUrl}`);
    }
    const blob = await response.blob();

    if (!blob) return;

    const filename = getFileName(blob, name);

    const file = new File([blob], filename, {
      type: "image/png",
    });

    const webSharePayload: ShareData = { files: [file] };

    if (Capacitor.isNativePlatform()) {
      const data = await blobToString(blob);
      const file = await Filesystem.writeFile({
        data,
        directory: Directory.Cache,
        path: filename,
      });
      await Share.share({ files: [file.uri] });
      await Filesystem.deleteFile({ path: file.uri });
    } else if ("canShare" in navigator && navigator.canShare(webSharePayload)) {
      navigator.share(webSharePayload);
    } else {
      const link = document.createElement("a");
      link.download = filename;
      link.href = URL.createObjectURL(file);
      link.click();
      URL.revokeObjectURL(link.href);
    }

    toast.dismiss(id);
  } catch (err) {
    if (isErrorLike(err)) {
      // Don't show error if its share canceled
      if (err.message.includes("canceled")) {
        toast.dismiss(id);
      } else {
        toast.error(err.message, { id });
      }
    } else {
      toast.error("Couldn't share image", { id });
    }
  }
}

const canShare = _.memoize(async () => {
  return _.isFunction(navigator.share) || (await Share.canShare()).value;
});

const origin = isCapacitor()
  ? "https://blorpblorp.xyz"
  : window.location.origin || "https://blorpblorp.xyz";

export type ShareEntityContext =
  | {
      type: "post";
      id: number;
      apId: string;
      communitySlug: string;
      route: string;
    }
  | {
      type: "comment";
      postId: number;
      commentId: number;
      apId: string;
      communitySlug: string;
      route: string;
    }
  | { type: "community"; apId: string; slug: string; route: string }
  | { type: "person"; apId: string; slug: string; route: string }
  | { type: "multi-community-feed"; route: string };

function resolveShareUrl(
  mode: ShareLinkType,
  entity: ShareEntityContext,
  account?: Account,
): string | null {
  const instance = account ? parseAccountInfo(account).instance : null;

  switch (mode) {
    case "blorp":
      return `${origin}${entity.route}`;

    case "source":
      if (entity.type === "multi-community-feed") {
        return null;
      }
      return entity.apId;

    case "instance": {
      if (entity.type === "multi-community-feed") {
        return null;
      }
      if (!instance) return null;
      if (entity.type === "community") {
        return `https://${instance}/c/${entity.slug}`;
      }
      if (entity.type === "person") {
        return `https://${instance}/u/${entity.slug}`;
      }
      if (entity.type === "post") {
        return `https://${instance}/post/${entity.id}`;
      }
      if (entity.type === "comment") {
        return `https://${instance}/post/${entity.postId}/${entity.commentId}`;
      }
    }

    case "threadiverse.link": {
      if (entity.type === "multi-community-feed") {
        return null;
      }
      if (entity.type === "community") {
        return `https://threadiverse.link/c/${entity.slug}`;
      }
      if (entity.type === "person") {
        return `https://threadiverse.link/u/${entity.slug}`;
      }
      if (entity.type === "post") {
        return `https://threadiverse.link/${instance}/post/${entity.id}`;
      }
      if (entity.type === "comment") {
        return `https://threadiverse.link/${instance}/comment/${entity.commentId}`;
      }
    }
  }

  return null;
}

function getShareUrl(
  mode: ShareLinkType,
  entity: ShareEntityContext,
  account?: Account,
): string {
  return (
    resolveShareUrl(mode, entity, account) ??
    resolveShareUrl("source", entity, account) ??
    resolveShareUrl("blorp", entity, account)!
  );
}

export function useCanShare() {
  // Firefox doesn't typically allow sharing
  const [share, setShare] = useState(!isFirefox());
  useEffect(() => {
    canShare().then(setShare);
  }, []);
  return share;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    console.error("Error copying URL:", e);
  }
}

export async function copyRouteToClipboard(route: string) {
  const url = `${origin}${route}`;
  copyToClipboard(url);
}

export async function shareRoute(route: string) {
  const url = `${origin}${route}`;
  try {
    const canShare = await Share.canShare();
    if (canShare.value) {
      await Share.share({ url });
    } else if (_.isFunction(navigator.share)) {
      // Probably unnecessary since Share.share uses navigator.share
      await navigator.share({ url });
    }
  } catch (e) {
    console.error("Error sharing URL:", e);
  }
}

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

  const getMode = async (): Promise<ShareLinkType> => {
    if (shareLinkType !== null) return shareLinkType;
    try {
      const selected = await selectAlert({
        header: "Share link style",
        message:
          "How would you like to share links? You can change this later in Settings.",
        options: SHARE_LINK_TYPE_OPTIONS.map((o) => ({
          text: o.label,
          value: o.value,
        })),
      });
      setShareLinkType(selected);
      return selected;
    } catch {
      // cancelled — use blorp as one-time default
      return "blorp";
    }
  };

  const doShare = async () => {
    const mode = await getMode();
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
  };

  const doCopy = async () => {
    const mode = await getMode();
    const url = getShareUrl(mode, entity, account);
    copyToClipboard(url);
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
