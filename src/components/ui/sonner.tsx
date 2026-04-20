import { useMedia } from "@/src/hooks/index";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const media = useMedia();

  return (
    <Sonner
      theme={"system"}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--shad-popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--gray11": "white",
        } as React.CSSProperties
      }
      position={media.maxMd ? "top-center" : "bottom-center"}
      toastOptions={{
        duration: 2000,
        className:
          "max-md:mt-[calc(var(--ion-safe-area-top)+50px)] bg-emerald-600! data-[type=error]:bg-destructive! data-[type=warning]:bg-amber-600! text-white! rounded-lg!",
      }}
      {...props}
    />
  );
};

export { Toaster };
