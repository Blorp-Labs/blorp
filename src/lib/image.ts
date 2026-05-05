import imageCompression from "browser-image-compression";
import isAnimated from "@frsource/is-animated";

/**
 * Returns true if the given file is an animated format we care about.
 */
export async function isAnimatedImage(file: File): Promise<boolean> {
  const arrayBuffer = await file.arrayBuffer();
  try {
    return isAnimated(arrayBuffer);
  } catch (err) {
    console.error(err);
    return false;
  }
}

function blobToFile(blob: Blob, filename: string) {
  if (blob instanceof File) {
    return blob;
  }
  return new File([blob], filename, {
    type: blob.type || "image/jpeg",
    lastModified: Date.now(),
  });
}

const libURL = new URL("/browser-image-compression.js", window.location.origin)
  .href;

export async function compressImage(file: File) {
  try {
    if (await isAnimatedImage(file)) {
      return file;
    }
    const blob = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1024,
      libURL,
    });
    return blobToFile(blob, file.name);
  } catch (err) {
    console.error(err);
    return file;
  }
}
