import NumberFlowBase, { NumberFlowProps } from "@number-flow/react";
import { useReducedMotion } from "../lib/hooks/use-reduced-motion";

export function NumberFlow(props: NumberFlowProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return (
      <span className={props.className}>
        {props.value}
        {props.suffix}
      </span>
    );
  }

  return <NumberFlowBase {...props} />;
}
