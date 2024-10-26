const CONTAINER = document.querySelector("#p5-container");
let WIDTH = CONTAINER.offsetWidth;
let HEIGHT = WIDTH;

const GRAY = "#222";
const PINK = "#f64c72";
const CYAN = "#66fcf1";
const WHITE = "#fafafa";

const SIZE = 8;
const TAIL_SIZE = 10;

const TURN_FACTOR = 0.2;
const VISIBLE_RANGE = 40;
const PROTECTED_RANGE = 8;
const CENTERING_FACTOR = 0.0005;
const MATCHING_FACTOR = 0.05;
const AVOID_FACTOR = 0.05;
const MAX_SPEED = 6;
const MIN_SPEED = 3;

const MARGIN = WIDTH / MAX_SPEED;
const LEFT_MARGIN = MARGIN;
const RIGHT_MARGIN = WIDTH - MARGIN;
const TOP_MARGIN = MARGIN;
const BOTTOM_MARGIN = HEIGHT - MARGIN;

const QF = ((180-TAIL_SIZE) * (3.141592/180));
const RF = ((180+TAIL_SIZE) * (3.141592/180));

let count = 256;
let positions = [];
let velocities = [];

let colors = [];

function windowResized() {
  WIDTH = CONTAINER.offsetWidth;
  HEIGHT = WIDTH;
  resizeCanvas(WIDTH, HEIGHT);
}

function setup() {
  const canvas = createCanvas(WIDTH, HEIGHT);
  canvas.parent('p5-container');

  const from = color(PINK);
  const to = color(CYAN);
  let amount = 0;
  let step = 1/count;


  for (let i = 0; i < count; i++) {
    positions.push(createVector(random(MARGIN, WIDTH-MARGIN), random(MARGIN, HEIGHT-MARGIN)));
    velocities.push(createVector(random(-MAX_SPEED, MAX_SPEED), random(-MAX_SPEED, MAX_SPEED)));

    // Precalculate colors
    colors.push(lerpColor(from, to, amount + step));
    amount += step;
  }
}

function drawBoid(p, v) {
  const h = v.heading();

  const qh = h + QF;
  const q = createVector(cos(qh), sin(qh)).mult(SIZE).add(p);

  const rh = h + RF
  const r = createVector(cos(rh), sin(rh)).mult(SIZE).add(p);

  triangle(p.x, p.y, q.x, q.y, r.x, r.y);
}

function drawBoids() {
  for (let i = 0; i < count; i++) {
    fill(colors[i]);
    stroke(colors[i]);
    drawBoid(positions[i], velocities[i]);
  }
}

function updateBoids() {
  for (let i = 0; i < count; i++) {
    let close = createVector(0, 0);
    let vel_avg = createVector(0, 0);
    let pos_avg = createVector(0, 0);
    let neighboring_boids = 0;

    for (let j = 0; j < count; j++) {
      if (j == i) {
        continue;
      }

      const diff = p5.Vector.sub(positions[i], positions[j]);
      if (diff.mag() < PROTECTED_RANGE) {
        close.add(diff);
      }

      if (diff.mag() < VISIBLE_RANGE) {
        pos_avg.add(positions[j]);
        vel_avg.add(velocities[j]);
        neighboring_boids += 1;
      }
    }

    if (neighboring_boids > 0) {
      pos_avg.mult(1.0/neighboring_boids);
      vel_avg.mult(1.0/neighboring_boids);

      const centering = pos_avg.sub(positions[i]).mult(CENTERING_FACTOR);
      const matching = vel_avg.sub(velocities[i]).mult(MATCHING_FACTOR);

      velocities[i].add(centering.add(matching));
    }

    velocities[i].add(close.mult(AVOID_FACTOR));

    // Screen edges
    const position = positions[i];
    if (position.x < LEFT_MARGIN) {
      velocities[i].x += TURN_FACTOR;
    }
    if (position.x > RIGHT_MARGIN) {
      velocities[i].x -= TURN_FACTOR;
    }
    if (position.y < TOP_MARGIN) {
      velocities[i].y += TURN_FACTOR;
    }
    if (position.y > BOTTOM_MARGIN) {
      velocities[i].y -= TURN_FACTOR;
    }

    // Clamp speed
    let speed = velocities[i].mag();
    if (speed > MAX_SPEED) {
      velocities[i].mult(MAX_SPEED/speed);
    } 
    if (speed < MIN_SPEED) {
      velocities[i].mult(MIN_SPEED/speed);
    }

    // Update position
    positions[i].add(velocities[i]);
  }
}

let fps = 60;
let fps_acc = 0;
let fps_count = 0;
function drawFPS() {
  fps_acc += frameRate();
  fps_count += 1;

  if (fps_count % 5 == 0) {
    fps = fps_acc / fps_count;

    fps_acc = 0;
    fps_count = 0;
  }

  fill(WHITE);
  stroke(WHITE);
  text(`${Math.floor(fps)} fps`, 15, 15);
}

function draw() {
  background(GRAY);

  drawFPS();
  updateBoids();
  drawBoids();

}
