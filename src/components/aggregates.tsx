import _ from "lodash";
import { abbriviateNumber } from "../lib/format";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

export function AggregateBadges({
  aggregates,
  className,
  children,
}: {
  aggregates: Record<string, number | undefined | null>;
  className?: string;
  children?: React.ReactNode;
}) {
  const entries = Object.entries(aggregates);
  const isEmpty = entries.findIndex(([_key, val]) => _.isNumber(val)) < 0;

  if (isEmpty) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {children}
      {entries.map(([label, value]) =>
        _.isNumber(value) ? (
          <Badge key={label} variant="secondary">
            <span className="block" key={label}>
              {abbriviateNumber(value)} {label}
            </span>
          </Badge>
        ) : null,
      )}
    </div>
  );
}
