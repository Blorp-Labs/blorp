import dayjs from "dayjs";
import { DetailedHTMLProps, TimeHTMLAttributes } from "react";

export function DateTime({
  date,
  ...rest
}: { date?: dayjs.Dayjs | null } & Omit<
  DetailedHTMLProps<TimeHTMLAttributes<HTMLTimeElement>, HTMLTimeElement>,
  "dateTime"
>) {
  if (!date) {
    return null;
  }
  return (
    <time dateTime={date.toISOString()} title={date.format("LLLL")} {...rest}>
      {rest.children ?? date.format("ll")}
    </time>
  );
}
