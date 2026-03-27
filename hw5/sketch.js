let circles = [];
let numCircles;
let hexSize;
function setup() {
  createCanvas(windowWidth, windowHeight);
  hexSize = width * 0.05;
  numCircles = floor(width * 0.03);
  for (let i = 0; i < numCircles; i++) {
    circles.push(new PulseCircle());
  }
  noStroke();
}
function draw() {
  drawBackground();
  for (let c of circles) {
    c.update();
    c.display();
  }
  drawClock();
}
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
function drawBackground() {
  background(60, 50, 30);
  let h = hexSize * sqrt(3);
  for (let y = -h; y < height + h; y += h * 0.75) {
    for (let x = -hexSize; x < width + hexSize; x += hexSize * 1.5) {
      let offset = floor(y / (h * 0.75)) % 2 === 0 ? 0 : hexSize * 0.75;
      let px = x + offset;
      let py = y;
      let tileColor = getTileColor(px, py);
      fill(tileColor);
      drawHex(px, py, hexSize);
    }
  }
}
function getTileColor(x, y) {
  let n = noise(x * 0.002, y * 0.002);
  if (n < 0.25) return color(210, 180, 90);
  if (n < 0.5)  return color(160, 120, 70);
  if (n < 0.7)  return color(90, 140, 70);
  if (n < 0.85) return color(130, 90, 60);
  return color(100, 100, 120);
}
function drawHex(x, y, r) {
  beginShape();
  for (let a = 0; a < TWO_PI; a += TWO_PI / 6) {
    vertex(x + cos(a) * r, y + sin(a) * r);
  }
  endShape(CLOSE);
}
class PulseCircle {
  constructor() { this.reset(); }
  reset() {
    this.x = random(width);
    this.y = random(height);
    this.baseSize = random(width * 0.02, width * 0.06);
    this.speed = random(1, 3);
    this.phase = random(TWO_PI);
    this.color = color(255, 230, 150, 140);
  }
  update() {
    this.x += this.speed;
    this.phase += 0.08;
    if (this.x > width + 50) { this.x = -50; this.y = random(height); }
  }
  display() {
    let pulse = this.baseSize + sin(this.phase) * this.baseSize * 0.4;
    fill(255, 220, 120, 40);
    ellipse(this.x, this.y, pulse * 2);
    fill(this.color);
    ellipse(this.x, this.y, pulse);
  }
}
function drawClock() {
  let h = nf(hour(), 2);
  let m = nf(minute(), 2);
  let s = nf(second(), 2);
  let timeText = h + ":" + m + ":" + s;
  let tSize = width * 0.035;
  textSize(tSize);
  textAlign(RIGHT, TOP);
  for (let i = 8; i > 0; i--) {
    fill(255, 200, 120, 20);
    text(timeText, width - 20 + i, 20 + i);
  }
  fill(255, 240, 180);
  textStyle(BOLD);
  text(timeText, width - 20, 20);
}
