import canvasConfetti, { Shape } from "canvas-confetti";

const scalar = 2;
const CAKE = canvasConfetti.shapeFromText({ text: "🎂", scalar });
const PARTY_FACE = canvasConfetti.shapeFromText({ text: "🥳", scalar });
const MOUSE = canvasConfetti.shapeFromText({ text: "🐁", scalar });
const PIE = canvasConfetti.shapeFromText({ text: "🥧", scalar });
const PENGUIN = canvasConfetti.shapeFromText({ text: "🐧", scalar });

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
  text = text.toLowerCase().replaceAll(" ", "");
  const shapes: Shape[] = [];
  if (text.includes("happycakeday")) {
    shapes.push(CAKE, PARTY_FACE);
  }
  if (text.includes("linux")) {
    shapes.push(PENGUIN);
  }
  if (text.includes("lemmy")) {
    shapes.push(MOUSE);
  }
  if (text.includes("piefed")) {
    shapes.push(PIE);
  }
  if (shapes.length > 0) {
    canvasConfetti({
      ...CONFIG,
      shapes,
    });
  }
}
