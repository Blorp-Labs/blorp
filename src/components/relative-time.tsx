import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import updateLocale from "dayjs/plugin/updateLocale";
import {
  DetailedHTMLProps,
  TimeHTMLAttributes,
  useEffect,
  useMemo,
  useState,
} from "react";
import { cn } from "../lib/utils";
import { DateTime } from "./datetime";

dayjs.extend(relativeTime);
dayjs.extend(updateLocale);

dayjs.updateLocale("en", {
  relativeTime: {
    future: "in %s",
    past: "%s",
    s: "<1m",
    m: "1m",
    mm: "%dm",
    h: "1h",
    hh: "%dh",
    d: "1d",
    dd: "%dd",
    M: "1mo",
    MM: "%dmo",
    y: "1y",
    yy: "%dy",
  },
});

interface Props
  extends DetailedHTMLProps<
    TimeHTMLAttributes<HTMLTimeElement>,
    HTMLTimeElement
  > {
  time: string | number;
  prefix?: string;
}

/**
 * Renders a relative time that updates every second.
 * Does so in a way that won't break hydration.
 * Shows the full date/time time on hover.
 */
export function RelativeTime({ time, prefix, ...rest }: Props) {
  const dateObj = useMemo(() => dayjs(time), [time]);
  const [dateStr, setDateStr] = useState(dateObj.fromNow());

  useEffect(() => {
    const updateTime = () => {
      setDateStr(dateObj.fromNow());
    };
    requestAnimationFrame(updateTime);
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [dateObj]);

  return (
    <DateTime
      {...rest}
      className={cn("whitespace-nowrap", rest.className)}
      date={dateObj}
    >
      {prefix}
      {dateStr}
    </DateTime>
  );
}
