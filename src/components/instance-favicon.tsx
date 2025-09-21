import { getAccountSite, useAuth } from "../stores/auth";

export function InstanceFavicon() {
  const site = useAuth((s) => getAccountSite(s.getSelectedAccount()));
  const icon = site?.icon;
  return icon ? (
    <link rel="icon" type="image/png" href={icon} />
  ) : (
    <>
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="96x96"
        href="/favicon-96x96.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/favicon-16x16.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="192x192"
        href="/android-icon-192x192.png"
      />
    </>
  );
}
