import dayjs from "dayjs";
import { memo } from "react";
import { CakeSliceOutline, BabyOutline } from "./icons";

interface Props {
  date: string;
  className?: string;
  isNewAccount?: boolean;
}

function isWithinLast30Days(date: dayjs.Dayjs) {
  // true if date is after (i.e. more recent than) 30 days ago
  return dayjs(date).isAfter(dayjs().subtract(30, "days"));
}

const today = dayjs();

/**
 * Renders a relative time that updates every second.
 * Does so in a way that won't break hydration.
 * Shows the full date/time time on hover.
 */
export const CakeDay = memo(function CakeDay({
  date,
  isNewAccount,
  ...rest
}: Props) {
  const createdAt = dayjs(date);

  if (isNewAccount ?? isWithinLast30Days(createdAt)) {
    return <BabyOutline {...rest} />;
  }

  const showCake =
    today.month() === createdAt.month() && today.date() === createdAt.date();

  if (showCake) {
    return <CakeSliceOutline {...rest} />;
  }

  return null;
});
