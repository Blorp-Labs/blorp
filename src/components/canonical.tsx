import { useLocation } from "react-router";

const PREFERRED_ORIGIN = "https://blorpblorp.xyz";

export function Canonical() {
  const { pathname, search } = useLocation();
  const href = PREFERRED_ORIGIN + pathname + search;
  return <link rel="canonical" href={href} />;
}
