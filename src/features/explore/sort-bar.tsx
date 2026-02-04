import { useAvailableSorts } from "@/src/lib/api/index";
import { ContentGutters } from "@/src/components/gutters";
import { useIonRouter } from "@ionic/react";
import { Link } from "@/src/routing/index";
import { X } from "../../components/icons";
import _ from "lodash";
import { cn } from "../../lib/utils";
import "swiper/css";
import "swiper/css/virtual";
import { Button } from "../../components/ui/button";

export function SortControlBarContent({
  selectedSort,
}: {
  selectedSort?: string;
}) {
  const router = useIonRouter();
  const { communitySorts } = useAvailableSorts();
  const sorts = _.uniqBy(
    _.compact(
      communitySorts?.map((sort) => {
        const label = sort.split(/(?=[A-Z])/)[0];
        return {
          label,
          sort,
        };
      }),
    ),
    "label",
  );
  const selectedSplit = selectedSort?.split(/(?=[A-Z])/);
  const selectedSortLabel = selectedSplit?.join(" ");
  const selectedFirstWord = selectedSplit?.[0];
  const associatedSorts = selectedFirstWord
    ? communitySorts
        ?.filter(
          (sort) => sort.startsWith(selectedFirstWord) && sort !== selectedSort,
        )
        .map((sort) => {
          const label = sort.split(/(?=[A-Z])/).join(" ");
          return {
            label,
            sort,
          };
        })
    : null;
  return (
    <>
      {selectedSort &&
        (router.canGoBack() ? (
          <Button size="sm" variant="outline" onClick={() => router.goBack()}>
            {selectedSortLabel}
            <X />
          </Button>
        ) : (
          <Button size="sm" variant="outline" asChild>
            <Link to="/communities" replace>
              {selectedSortLabel}
              <X />
            </Link>
          </Button>
        ))}
      {selectedSort &&
        associatedSorts?.map(({ sort, label }) => (
          <Button key={sort} size="sm" variant="outline" asChild>
            <Link to="/communities/sort/:sort" params={{ sort }} replace>
              {label}
            </Link>
          </Button>
        ))}
      {!selectedSort &&
        sorts?.map(({ sort, label }) => (
          <Button key={sort} size="sm" variant="outline" asChild>
            <Link to="/communities/sort/:sort" params={{ sort }}>
              {label}
            </Link>
          </Button>
        ))}
    </>
  );
}

export function SortControlBar({
  className,
  selectedSort,
}: {
  className?: string;
  selectedSort?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-row flex-wrap gap-1.5 border-b py-1.5",
        ContentGutters.mobilePadding,
        className,
      )}
    >
      <SortControlBarContent selectedSort={selectedSort} />
    </div>
  );
}
