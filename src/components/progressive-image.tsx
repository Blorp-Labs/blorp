import React, { useState } from "react";
import { cn } from "../lib/utils";

export type ProgressiveImageProps = {
  /** Low-res URL that should be tiny and fast (~1–5KB). */
  lowSrc: string;
  /** High-res URL to upgrade to. */
  highSrc?: string | null;
  /** Accessible alt text for the image. */
  alt?: string | null;
  /** Optional intrinsic size to prevent layout shift. */
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  /** Tailwind classes for the outer container (positioned/clipped, sizing). */
  className?: string;
  /** Tailwind classes applied to both <img> tags (e.g., object-cover). */
  imgClassName?: string;
  /**
   * If true, treat as hero: eager high-res load + high fetch priority.
   * Otherwise, high-res is lazy with low priority.
   */
  priority?: boolean;
  /** Callback that receives the natural aspect ratio (w/h) of the image once known. */
  onAspectRatio?: (ratio: number) => void;

  aspectRatio?: number;

  onError?: () => void;

  onLoad?: () => void;
};

/**
 * ProgressiveImage
 * ---------------------------------
 * Minimal two-layer image: a tiny low-res paints immediately to avoid blank space,
 * and a high-res layer fades in once loaded. No IO or JS scheduling — your feed's
 * virtualization decides what gets mounted/loaded.
 */
export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  lowSrc,
  highSrc,
  alt,
  width,
  height,
  className = "",
  style,
  imgClassName = "object-cover",
  priority = false,
  aspectRatio,
  onAspectRatio,
  onError,
  onLoad,
}) => {
  const [hiVisible, setHiVisible] = useState<boolean>(priority);

  // Attributes for high-res depending on priority
  const hiAttrs: React.ImgHTMLAttributes<HTMLImageElement> = priority
    ? { loading: "eager", fetchPriority: "high", decoding: "async" }
    : { loading: "lazy", fetchPriority: "low", decoding: "async" };

  const handleAspectRatio = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!onAspectRatio) return;
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      const ratio = img.naturalWidth / img.naturalHeight;
      onAspectRatio(ratio);
    }
  };

  return (
    <div
      className={cn("relative overflow-hidden bg-neutral-100", className)}
      style={{ ...style, aspectRatio }}
    >
      {/* High-res overlay: fades in after it loads */}
      {highSrc && (
        <img
          src={highSrc}
          alt=""
          aria-hidden="true"
          width={width}
          height={height}
          onLoad={(e) => {
            setHiVisible(true);
            handleAspectRatio(e);
            onLoad?.();
          }}
          className={cn(
            "absolute inset-0 w-full h-full opacity-0 object-cover",
            imgClassName,
            hiVisible && "opacity-100",
          )}
          {...hiAttrs}
        />
      )}

      {/* Low-res base: paints immediately */}
      <img
        src={lowSrc}
        alt={alt ?? undefined}
        width={width}
        height={height}
        decoding="async"
        fetchPriority="high"
        onLoad={(e) => {
          handleAspectRatio(e);
          onLoad?.();
        }}
        onError={() => onError?.()}
        className={cn("w-full h-full", imgClassName, hiVisible && "opacity-0")}
      />
    </div>
  );
};
