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
  const sorts = _.uniq(
    _.compact(communitySorts?.map((sort) => sort.split(/(?=[A-Z])/)[0])),
  );
  return (
    <>
      {selectedSort &&
        (router.canGoBack() ? (
          <Button size="sm" variant="outline" onClick={() => router.goBack()}>
            {_.capitalize(selectedSort)}
            <X />
          </Button>
        ) : (
          <Button size="sm" variant="outline" asChild>
            <Link to="/communities" replace>
              {_.capitalize(selectedSort)}
              <X />
            </Link>
          </Button>
        ))}
      {!selectedSort &&
        sorts?.map((sort) => (
          <Button key={sort} size="sm" variant="outline" asChild>
            <Link to="/communities/sort/:sort" params={{ sort }}>
              {_.capitalize(sort)}
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
