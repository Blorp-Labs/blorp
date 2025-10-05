import { isCapacitor } from "@/src/lib/device";
import { useElementRect, useIsActiveRoute, useMedia } from "@/src/lib/hooks";
import { Oneko as oneko } from "lots-o-nekos";
import { useEffect, useRef, useState } from "react";
import _ from "lodash";
import { rainbowCursor } from "cursor-effects";

const div = document.createElement("div");
div.style = "position: absolute; inset: 0";
const cat = new oneko({
  source: `/sprints/cat.png`,
  element: div,
  skipElementInit: true,
});

function Oneko({
  type,
  children,
}: {
  children?: React.ReactNode;
  type: "dog" | "cat";
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const isActive = useIsActiveRoute();
  const media = useMedia();
  const isDesktop = media.md;

  const rect = useElementRect(containerRef);

  useEffect(() => {
    const container = containerRef.current;
    if (container && isActive && isDesktop && !isCapacitor()) {
      container.appendChild(div);

      cat.element = null;
      cat.element = div;
      cat.source = `/sprints/${type}.png`;

      // If the container was previously unmounted
      // this is required to restart the animation loop
      cat.onAnimationFrame(0);

      const onMouseMove = (event: MouseEvent) => {
        const x = _.round(_.clamp(event.clientX - rect.left, 0, rect.width));
        const y = _.round(_.clamp(event.clientY - rect.top, 0, rect.height));
        const deltaX = cat.x ? Math.abs(x - cat.x) : 0;
        const deltaY = cat.y ? Math.abs(y - cat.y) : 0;
        if (deltaX > 20 && deltaY > 20) {
          cat.targetX = x;
          cat.targetY = y;
        }
      };
      container.addEventListener("mousemove", onMouseMove);
      return () => {
        container.removeEventListener("mousemove", onMouseMove);
      };
    }
  }, [isActive, isDesktop, type, rect]);

  return (
    <div className="relative" ref={containerRef}>
      {children}
    </div>
  );
}

function RainbowCursor({ children }: { children: React.ReactNode }) {
  const [signal, setSignal] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const div = ref.current;
    if (div) {
      const cursor = rainbowCursor({ element: div });
      return () => cursor.destroy();
    }
  }, [signal]);
  return (
    <div
      ref={ref}
      onMouseEnter={() => setSignal((s) => s + 1)}
      onMouseLeave={() => setSignal((s) => s + 1)}
    >
      {children}
    </div>
  );
}

export function EasterEggBox({
  seed,
  children,
}: {
  seed: string;
  children?: React.ReactNode;
}) {
  const isActive = useIsActiveRoute();

  const type = (() => {
    const normalized = seed.trim().toLowerCase();
    if (normalized.includes("dog")) {
      return "dog";
    } else if (normalized.includes("cat") || normalized.includes("aww")) {
      return "cat";
    } else if (normalized.includes("lgbt") || normalized.includes("queer")) {
      return "lgbt";
    }
    return null;
  })();

  if (!isActive) {
    return children;
  }

  switch (type) {
    case "cat":
      return <Oneko type="cat">{children}</Oneko>;
    case "dog":
      return <Oneko type="dog">{children}</Oneko>;
    case "lgbt":
      return <RainbowCursor>{children}</RainbowCursor>;
    default:
      return children;
  }
}
