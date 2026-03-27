let pg;
let brushSize = 25;
let mode = 1;
let eraser = false;
let showHelp = true;
let hueValue = 0;
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  pg = createGraphics(width, height);
  pg.colorMode(HSB, 360, 100, 100, 100);
  pg.background(0, 0, 98);
}
function draw() {
  hueValue = (hueValue + 0.6) % 360;
  image(pg, 0, 0);
  noFill();
  stroke(0, 0, 0, 10);
  circle(mouseX, mouseY, brushSize);
  if (showHelp) { drawHelp(); }
}
function mouseDragged() {
  if (eraser) {
    pg.noStroke();
    pg.fill(0, 0, 98, 100);
    pg.circle(mouseX, mouseY, brushSize * 1.2);
    return;
  }
  let h = (hueValue + map(mouseX, 0, width, 0, 120)) % 360;
  pg.stroke(h, 80, 40, 70);
  pg.fill(h, 80, 40, 40);
  if (mode === 1) {
    pg.noStroke();
    pg.circle(mouseX, mouseY, brushSize);
  } else if (mode === 2) {
    pg.noStroke();
    pg.rectMode(CENTER);
    pg.square(mouseX, mouseY, brushSize);
  } else if (mode === 3) {
    pg.stroke(h, 80, 40, 60);
    for (let i = 0; i < 15; i++) {
      let rx = random(-brushSize, brushSize);
      let ry = random(-brushSize, brushSize);
      pg.point(mouseX + rx, mouseY + ry);
    }
  }
}
function keyPressed() {
  let k = key.toLowerCase();
  if (k === "s") saveCanvas("Assignment [6] = Drawing App", "png");
  if (k === "c") pg.background(0, 0, 98);
  if (k === "e") eraser = !eraser;
  if (k === "h") showHelp = !showHelp;
  if (key === "[") brushSize = max(5, brushSize - 5);
  if (key === "]") brushSize = min(150, brushSize + 5);
  if (key === "1") mode = 1;
  if (key === "2") mode = 2;
  if (key === "3") mode = 3;
}
function drawHelp() {
  noStroke();
  fill(0, 0, 0, 55);
  rect(15, 15, 360, 180, 12);
  fill(0, 0, 100, 95);
  textSize(14);
  textLeading(18);
  text("FUN DRAWING APP\n\nDrag mouse = draw\n[ / ] = brush size (" + brushSize + ")\n1: dots  2: squares  3: spray\nE = eraser (" + (eraser ? "ON" : "OFF") + ")\nC = clear\nS = save PNG\nH = hide help", 30, 40);
}
function windowResized() {
  let old = pg;
  resizeCanvas(windowWidth, windowHeight);
  pg = createGraphics(width, height);
  pg.colorMode(HSB, 360, 100, 100, 100);
  pg.background(0, 0, 98);
  pg.image(old, 0, 0);
}
