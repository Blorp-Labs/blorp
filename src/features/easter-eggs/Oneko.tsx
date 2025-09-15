import { isCapacitor } from "@/src/lib/device";
import { useIsActiveRoute, useMedia } from "@/src/lib/hooks";
import { isNotNil } from "@/src/lib/utils";
import { Oneko as oneko } from "lots-o-nekos";
import { useEffect, useRef } from "react";
import _ from "lodash";

const div = document.createElement("div");
div.style = "position: absolute; inset: 0";
const cat = new oneko({
  source: `/sprints/cat.png`,
  element: div,
  skipElementInit: true,
});

export default function Oneko({
  seed,
  children,
}: {
  seed: string;
  children?: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const isActive = useIsActiveRoute();
  const media = useMedia();
  const isDesktop = media.md;

  const type = (() => {
    const normalized = seed.trim().toLowerCase();
    if (normalized.includes("dog")) {
      return "dog";
    } else if (normalized.includes("cat") || normalized.includes("aww")) {
      return "cat";
    }
    return null;
  })();

  useEffect(() => {
    const container = containerRef.current;
    if (
      container &&
      isActive &&
      isDesktop &&
      !isCapacitor() &&
      isNotNil(type)
    ) {
      container.appendChild(div);

      cat.element = null;
      cat.element = div;
      cat.source = `/sprints/${type}.png`;
      cat.onAnimationFrame(0);
      const onMouseMove = (event: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        const x = _.round(_.clamp(event.clientX - rect.left, 0, rect.width));
        const y = _.round(_.clamp(event.clientY - rect.top, 0, rect.height));
        const deltaX = cat.x ? Math.abs(x - cat.x) : 0;
        const deltaY = cat.y ? Math.abs(y - cat.y) : 0;
        if (deltaX > 20 && deltaY > 20) {
          cat.targetX = x;
          cat.targetY = y;
        }
      };
      window.addEventListener("mousemove", onMouseMove);
      return () => {
        window.removeEventListener("mousemove", onMouseMove);
      };
    }
  }, [isActive, isDesktop, type]);

  if (!isActive || !type) {
    return children;
  }

  return (
    <div className="relative" ref={containerRef}>
      {children}
    </div>
  );
}
