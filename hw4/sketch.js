let showCircles = false;
function setup() {
  createCanvas(1024, 1024);
  noLoop();
}
function draw() {
  background(15, 25, 55);
  let tileSize = 128;
  for (let x = 0; x < width; x += tileSize) {
    for (let y = 0; y < height; y += tileSize) {
      let isPurple = false;
      if ((x + y) % 256 === 0) {
        fill(170, 210, 235);
      } else {
        fill(190, 180, 220);
        isPurple = true;
      }
      noStroke();
      rect(x, y, tileSize, tileSize);
      if (showCircles && isPurple) {
        fill(235, 245, 250);
        ellipse(x + tileSize / 2, y + tileSize / 2, tileSize / 2);
      }
    }
  }
}
function keyPressed() {
  if (key === " ") {
    showCircles = !showCircles;
    redraw();
  }
  if (key == 'S' || key == 's') {
    saveCanvas("assignment[4]_pattern_Forrest_nick");
  }
}
