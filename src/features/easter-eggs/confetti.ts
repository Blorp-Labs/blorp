import { isProd } from "@/src/lib/device";
import canvasConfetti, { Shape } from "canvas-confetti";
import _ from "lodash";

const scalar = 2;

const getShapes = _.memoize(() => {
  const cake = canvasConfetti.shapeFromText({ text: "🎂", scalar });
  const party_face = canvasConfetti.shapeFromText({ text: "🥳", scalar });
  const mouse = canvasConfetti.shapeFromText({ text: "🐁", scalar });
  const pie = canvasConfetti.shapeFromText({ text: "🥧", scalar });
  const penguin = canvasConfetti.shapeFromText({ text: "🐧", scalar });
  return {
    cake,
    party_face,
    mouse,
    pie,
    penguin,
  };
});

const CONFIG = {
  spread: 360,
  ticks: 200,
  gravity: 0,
  decay: 0.999,
  startVelocity: 4,
  flat: true,
  scalar,
};

export function confetti(text: string) {
  if (!isProd()) {
    return;
  }
  const shapes = getShapes();
  text = text.toLowerCase().replaceAll(" ", "");
  const shapesArr: Shape[] = [];
  if (text.includes("happycakeday")) {
    shapesArr.push(shapes.cake, shapes.party_face);
  }
  if (text.includes("linux")) {
    shapesArr.push(shapes.penguin);
  }
  if (text.includes("lemmy")) {
    shapesArr.push(shapes.mouse);
  }
  if (text.includes("piefed")) {
    shapesArr.push(shapes.pie);
  }
  if (shapesArr.length > 0) {
    canvasConfetti({
      ...CONFIG,
      shapes: shapesArr,
    });
  }
}
