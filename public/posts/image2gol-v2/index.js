// Elements
const imageLoader = document.getElementById('imageInput');
const canvas = document.getElementById('imageCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

// Constants
const IMAGE_DELAY = 150;
const CANVAS_SIZE = 300;

// Track the number of images, used to ensure src is always unique
let image_counter = 0;

// Global state object, used for sharing and resetting state everywhere
let state;

// Gets the R channel at the specified 2D location from the current
// 1D imageData array
function get(y, x) {
  let a = y * (canvas.width*4) + x * 4
  return state.imageData.data[a]
}

// Each run through this function computes and displays one step of
// the Game of Life
function gol(src) {
  if (!state || state.src != src) {
    return;
  }

  let newImageData = ctx.createImageData(state.imageData);

  // Some details from my go-to GoL reference implementation:
  // https://www.assemblyscript.org/examples/game-of-life.html
  for (let i = 0; i < state.h; i++) {
    const im1 = i == 0 ? state.hm1 : i - 1;
    const ip1 = i == state.hm1 ? 0 : i + 1;
    for (let j = 0; j < state.w; j++) {
      const jm1 = j == 0 ? state.wm1 : j - 1;
      const jp1 = j == state.wm1 ? 0 : j + 1;

      const neighbors = (
        (get(im1, jm1) & 1) + (get(im1, j) & 1) + (get(im1, jp1) & 1) +
        (get(i, jm1) & 1) +                       (get(i, jp1) & 1) +
        (get(ip1, jm1) & 1) + (get(ip1, j) & 1) + (get(ip1, jp1) & 1)
      );

      const x = i * (canvas.width * 4) + j * 4;
      const c = state.imageData.data[x] & 1;
      let res = 0;
      if (c && (neighbors == 2 || neighbors == 3)) {
        res = 255;
      } else if (!c && (neighbors == 3)) {
        res = 255;
      }

      newImageData.data[x+0] = res;
      newImageData.data[x+1] = res;
      newImageData.data[x+2] = res;
      newImageData.data[x+3] = 255;
    }
  }

  ctx.putImageData(newImageData, 0, 0);
  state.imageData = newImageData

  window.requestAnimationFrame(() => gol(src))
}

// Bayer dithering based on:
//   https://www.shadertoy.com/view/7sfXDn
function fract(x) {
  return x - Math.floor(x)
}

function Bayer2(x, y) {
    x = Math.floor(x);
    y = Math.floor(y);

    return fract(x / 2. + y * y * .75);
}

const Bayer4   = (x, y) =>  Bayer2 (.5*x, .5*y) * .25 + Bayer2(x, y);
const Bayer8   = (x, y) =>  Bayer4 (.5*x, .5*y) * .25 + Bayer2(x, y);
const Bayer16  = (x, y) =>  Bayer8 (.5*x, .5*y) * .25 + Bayer2(x, y);
const Bayer32  = (x, y) =>  Bayer16(.5*x, .5*y) * .25 + Bayer2(x, y);
const Bayer64  = (x, y) =>  Bayer32(.5*x, .5*y) * .25 + Bayer2(x, y);
const Bayer128 = (x, y) =>  Bayer64(.5*x, .5*y) * .25 + Bayer2(x, y);

function dither(src) {
  if (!state || state.src != src) {
    return;
  }

  for (let i = 0; i < state.imageData.data.length; i += 4) {
    const average_value = (state.originalImageData.data[i+0] + state.originalImageData.data[i+1] + state.originalImageData.data[i+2]) / 3;
    const bx = (i/4) % canvas.width;
    const by = Math.floor((i/4) / canvas.width);
    const bayer = (Bayer128(bx, by) * 2 - 1) * 0.25;
    const adjusted_value = average_value + (255*bayer);
    let color = 0;
    if (adjusted_value > 127) {
      color = 255;
    }
    state.imageData.data[i+0] = color;
    state.imageData.data[i+1] = color;
    state.imageData.data[i+2] = color;
    state.imageData.data[i+3] = color;
  }

  ctx.putImageData(state.imageData, 0, 0);
  setTimeout(() => gol(src), IMAGE_DELAY*10)
}


// Kickoff a run
function start(src) {
  setTimeout(() => dither(src), IMAGE_DELAY)
}

// Called when the user provides an image
function handleImage(e){
  const reader = new FileReader();
  reader.onload = function(event){
    const img = new Image();
    img.onload = function(){
      // State initialization
      state = {};
      state.w = CANVAS_SIZE;
      state.h = CANVAS_SIZE;
      state.wm1 = state.w-1;
      state.hm1 = state.h-1;

      // Updates elements, draw image to canvas
      canvas.width = state.w;
      canvas.height = state.h;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, state.w, state.h);

      // Get imageData and make copy
      state.imageData = ctx.getImageData(0, 0, state.w, state.h);
      state.originalImageData = ctx.createImageData(state.imageData);
      for (let i = 0; i < state.imageData.data.length; i++) {
        state.originalImageData.data[i] = state.imageData.data[i];
      }

      // Make state.src a unique string for this run
      state.src = img.src + image_counter++;
      start(state.src);
    }

    img.src = event.target.result;
  }

  // If the user cancels the upload, don't try to start
  if (e.target.files.length == 1) {
    reader.readAsDataURL(e.target.files[0]);
  }
}

window.onload = () => {
  imageLoader.addEventListener('change', handleImage, false);
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
};
