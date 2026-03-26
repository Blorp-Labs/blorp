import { twMerge } from "tailwind-merge";
import { useCommunityFromStore } from "@/src/stores/communities";
import { Skeleton } from "../ui/skeleton";
import { useState } from "react";
import { useIsCommunityBlocked, useShouldBlurNsfw } from "@/src/stores/auth";
import {
  COMMUNITY_NSFW_BANNER_BLUR_CLASS,
  COMMUNITY_NSFW_ICON_BLUR_CLASS,
} from "./utils";

export function CommunityBanner({ communityName }: { communityName?: string }) {
  const [bannerReady, setBannerReady] = useState(false);
  const [iconReady, setIconReady] = useState(false);

  const data = useCommunityFromStore(communityName);
  const isBlocked = useIsCommunityBlocked(communityName);
  const blurNsfw = useShouldBlurNsfw();

  const communityView = data?.communityView;
  const banner = data?.communityView.banner ?? undefined;

  const hideBanner = !banner || isBlocked;

  const [name, host] = communityView?.slug.split("@") ?? [];

  return (
    <div className="flex-1">
      {!hideBanner && (
        <div className="relative flex-1">
          <div className="aspect-[5] relative overflow-hidden rounded-xl">
            {!bannerReady && (
              <Skeleton className="absolute inset-0 rounded-xl" />
            )}
            <img
              src={banner}
              className={twMerge(
                "h-full w-full object-cover rounded-xl relative",
                communityView?.nsfw &&
                  blurNsfw &&
                  COMMUNITY_NSFW_BANNER_BLUR_CLASS,
              )}
              onLoad={() => setBannerReady(true)}
            />
          </div>

          {communityView?.icon && (
            <div className="absolute left-5 h-20 w-20 outline-background outline-2 -translate-y-3/5 bg-background rounded-full flex items-center justify-center overflow-hidden">
              {!iconReady && (
                <Skeleton className="absolute inset-0 rounded-full" />
              )}
              <img
                src={communityView?.icon}
                className={twMerge(
                  "h-20 w-20 object-cover rounded-full relative",
                  communityView?.nsfw &&
                    blurNsfw &&
                    COMMUNITY_NSFW_ICON_BLUR_CLASS,
                )}
                onLoad={() => setIconReady(true)}
              />
            </div>
          )}
        </div>
      )}

      <div
        className={twMerge(
          "mt-1.5 flex",
          !hideBanner && communityView?.icon && "pl-28",
          !hideBanner && "pb-3",
        )}
      >
        {communityView?.slug ? (
          <span className="font-bold text-lg h-7">
            {name}
            <span className="italic">@{host}</span>
          </span>
        ) : (
          <Skeleton className="h-7 w-52" />
        )}
      </div>
    </div>
  );
}
