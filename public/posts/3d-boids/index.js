const CONTAINER = document.querySelector("#p5-container");
const FPS_CONTAINER = document.querySelector("#fps-container");
let WIDTH = CONTAINER.offsetWidth;

const SIZE = 8;
const TAIL_SIZE = 10;

const TURN_FACTOR = 0.2;
const VISIBLE_RANGE = 40;
const PROTECTED_RANGE = 8;
const CENTERING_FACTOR = 0.0005;
const MATCHING_FACTOR = 0.05;
const AVOID_FACTOR = 0.05;
const MAX_SPEED = 16;
const MIN_SPEED = 6;

const MARGIN = WIDTH / MAX_SPEED;
const LEFT_MARGIN = -(WIDTH/2) + MARGIN;
const RIGHT_MARGIN = (WIDTH/2) - MARGIN;
const TOP_MARGIN = -(WIDTH/2) + MARGIN;
const BOTTOM_MARGIN = (WIDTH/2) - MARGIN;
const FRONT_MARGIN = -(WIDTH/2) + MARGIN;
const BACK_MARGIN = (WIDTH/2) - MARGIN;

const QF = ((180-TAIL_SIZE) * (3.141592/180));
const RF = ((180+TAIL_SIZE) * (3.141592/180));

let count = 64;
let positions;
let velocities;

let colors;
let foregroundColor;
let backgroundColor;

function windowResized() {
  WIDTH = CONTAINER.offsetWidth;
  resizeCanvas(WIDTH, WIDTH);
}

function setup() {
  const documentStyle = window.getComputedStyle(document.body)
  const from_color = documentStyle.getPropertyValue('--lighest-ivy');
  const to_color = documentStyle.getPropertyValue('--darkest-ivy');
  foregroundColor = documentStyle.getPropertyValue('--text-muted');
  backgroundColor = documentStyle.getPropertyValue('--bg');

  const canvas = createCanvas(WIDTH, WIDTH, WEBGL);
  canvas.parent('p5-container');

  camera(WIDTH, -WIDTH, WIDTH);
  perspective(1);

  const from = color(from_color);
  const to = color(to_color);
  let amount = 0;
  let step = 1/count;

  positions = [];
  velocities = [];

  colors = [];

  for (let i = 0; i < count; i++) {
    positions.push(createVector(random(-WIDTH, WIDTH), random(-WIDTH, WIDTH), random(-WIDTH, WIDTH)));
    velocities.push(createVector(random(-MAX_SPEED, MAX_SPEED), random(-MAX_SPEED, MAX_SPEED), random(-MAX_SPEED, MAX_SPEED)));

    // Precalculate colors
    colors.push(lerpColor(from, to, amount + step));
    amount += step;
  }
}

document.querySelector("#colorscheme-button").addEventListener("click", () => {
  setup();
});

function drawBoid(p, v) {
  // p5.js aligns cones vertically by default, use y axis here
  const currentDirection = createVector(0, 1, 0);
  const newDirection = v.normalize();
  const rotationAxis = currentDirection.cross(newDirection).normalize();
  const rotationAngle = acos(currentDirection.dot(newDirection));

  translate(p.x, p.y, p.z);
  rotate(rotationAngle, [rotationAxis.x, rotationAxis.y, rotationAxis.z]);
  scale(2);
  cone(3, 9, 4);
}

function drawBoids() {
  fill(foregroundColor);
  stroke(foregroundColor);
  beginGeometry();
  for (let i = 0; i < count; i++) {
    push();
    fill(colors[i]);
    stroke(colors[i]);
    drawBoid(positions[i], velocities[i]);
    pop();
  }
  const shape = endGeometry();
  model(shape);
  freeGeometry(shape);
}

function drawBox() {
  noFill();
  stroke(foregroundColor);
  beginGeometry();
  box(WIDTH-MARGIN, WIDTH-MARGIN, WIDTH-MARGIN);
  const shape = endGeometry();
  model(shape);
  freeGeometry(shape);
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

      if (neighboring_boids >= 8) {
        break;
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

    // Box edges
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
    if (position.z < BACK_MARGIN) {
      velocities[i].z += TURN_FACTOR;
    }
    if (position.z > FRONT_MARGIN) {
      velocities[i].z -= TURN_FACTOR;
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

  FPS_CONTAINER.innerText = `${Math.floor(fps)} fps`
}

function draw() {
  background(backgroundColor);

  orbitControl();

  lights();

  drawFPS();
  updateBoids();
  drawBoids();
  drawBox();
}
