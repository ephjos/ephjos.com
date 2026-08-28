const PI = String(Math.PI);

let spaces = 4;
let sticks = 1000;
let stick_length = 0.4;
let cx_rand = [];
let cy_rand = [];
let angle_rand = [];
let last_est = undefined;

let searching = false;

// https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
function resizeCanvasToDisplaySize(canvas) {
  // Lookup the size the browser is displaying the canvas in CSS pixels.
  const displayWidth  = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;

  // Check if the canvas is not the same size.
  const needResize = canvas.width  !== displayWidth ||
    canvas.height !== displayHeight;

  if (needResize) {
    // Make the canvas the same size
    canvas.width  = displayWidth;
    canvas.height = displayHeight;
  }

  return needResize;
}

// Returns the index where the strings first differ
function getStringStartMatches(a, b) {
  const l = Math.min(a.length,b.length);
  for (let i = 0; i < l; i++) {
    if (a[i] != b[i]) {
      return i;
    }
  }
  return l-1;
}

// Set the overlay text to display the calulcated PI value. Bold the part that matches.
function setEstimation(est) {
  if (est !== last_est) {
    last_est = est;

    const string_est = String(est);
    const m = getStringStartMatches(string_est, PI);
    const percentError = ((Math.abs(Math.PI - est) / Math.PI) * 100).toFixed(4);
    document.querySelector("#overlay").innerHTML = `<p><b>${string_est.slice(0,m)}</b>${string_est.slice(m)}</p><p>Error: ${percentError}%</p>`;
  }
}

// Initializes all listeners
function attachListeners() {
  document.querySelector("#lines-slider").addEventListener("change", function (e) {
    const lines = e.target.value;
    spaces = lines-1;
  });

  document.querySelector("#sticks-slider").addEventListener("change", function (e) {
    const power = e.target.value;
    sticks = Math.pow(10, power);
    initRands();
  });

  document.querySelector("#stick-length-slider").addEventListener("change", function (e) {
    const length = e.target.value;
    stick_length = length;
  });

  document.querySelector("#generate").addEventListener("click", function () {
    initRands();
  });

  document.querySelector("#find").addEventListener("click", function () {
    setSearching(!searching);
  });
}

function setSearching(value) {
  searching = value;
  const button = document.querySelector("#find");
  if (searching) {
    button.innerText = "Stop";
  } else {
    button.innerText = "Start";
  }
}

function main() {
  attachListeners();
  const canvas = document.querySelector('#glcanvas');
  const gl = canvas.getContext('webgl');

  // If we don't have a GL context, give up now
  if (!gl) {
    alert('Unable to initialize WebGL. Your browser or machine may not support it.');
    return;
  }

  // Vertex shader program
  const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying lowp vec4 vColor;

    void main(void) {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      vColor = aVertexColor;
    }
  `;

  // Fragment shader program
  const fsSource = `
    varying lowp vec4 vColor;

    void main(void) {
      gl_FragColor = vColor;
    }
  `;

  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
    },
  };

  // Create random buffers
  initRands();

  // Draw the scene
  draw(gl, programInfo);
}

// Set all random values to be used in draw loop. The drawn image will always be
// the same until this function is called again.
function initRands() {
  cx_rand = [];
  cy_rand = [];
  angle_rand = [];

  for (let i = 0; i < sticks; i++) {
    cx_rand.push((Math.random() * 2) - 1);
    cy_rand.push((Math.random() * 2) - 1);
    angle_rand.push((2*Math.PI) * Math.random());
  }
}

// Calculate positions and colors
function setBuffers(gl) {
  if (searching) {
    initRands();
  }

  // --------------------------------------------------------------------------
  // Positions
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  let positions = [];

  // Pre-compute needed x values
  let w = 2;
  let line_gap = w / spaces;
  let x = -1.0;
  let xs = [x];
  for (let i = 0; i < spaces+1; i++) {
    x += line_gap;
    xs.push(x);
  }

  // Sticks
  let cross_count = 0;
  for (let i = 0; i < sticks; i++) {
    let cx = cx_rand[i];
    let cy = cy_rand[i];
    let angle = angle_rand[i];
    let dx_off = Math.cos(angle)*stick_length;
    let dy_off = Math.sin(angle)*stick_length;
    let dx = cx+dx_off;
    let dy = cy+dy_off;
    positions.push(cx,cy,dx,dy);

    const l = Math.min(cx, dx);
    const h = Math.max(cx, dx);
    for (const x of xs) {
      if (l <= x && x <= h) {
        cross_count += 1;
        break;
      }
      if (h < x) {
        break;
      }
    }
  }

  // Lines to divide spaces (draw on top)
  for (const x of xs) {
    positions.push(x, -1.0);
    positions.push(x, 1.0);
  }


  const est = (2*stick_length*sticks) / (line_gap * cross_count);
  setEstimation(est);
  if (String(est).startsWith("3.1415")) {
    setSearching(false);
  }
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  // --------------------------------------------------------------------------

  // --------------------------------------------------------------------------
  // Colors
  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  let colors = [];

  for (let i = 0; i < sticks*2; i++) {
    colors.push(1.0, 0.0, 0.0, 1.0);
  }

  for (let i = 0; i < spaces+1; i++) {
    colors.push(0.2, 0.2, 0.2, 1.0);
    colors.push(0.2, 0.2, 0.2, 1.0);
  }
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  // --------------------------------------------------------------------------

  return {
    position: positionBuffer,
    color: colorBuffer,
  };
}

// Main draw loop
function draw(gl, programInfo) {
  const buffers = setBuffers(gl);

  if (resizeCanvasToDisplaySize(gl.canvas)) {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  }

  gl.clearColor(1.0, 1.0, 1.0, 1.0);  // Clear to black, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.enable(gl.DEPTH_TEST);           // Enable depth testing
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const fieldOfView = 45 * Math.PI / 180;   // in radians
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();

  mat4.perspective(projectionMatrix,
    fieldOfView,
    aspect,
    zNear,
    zFar);

  const modelViewMatrix = mat4.create();

  mat4.translate(modelViewMatrix,     // destination matrix
    modelViewMatrix,     // matrix to translate
    [-0.0, 0.0, -4.0]);  // amount to translate
  {
    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      numComponents,
      type,
      normalize,
      stride,
      offset);
    gl.enableVertexAttribArray(
      programInfo.attribLocations.vertexPosition);
  }

  {
    const numComponents = 4;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexColor,
      numComponents,
      type,
      normalize,
      stride,
      offset);
    gl.enableVertexAttribArray(
      programInfo.attribLocations.vertexColor);
  }

  gl.useProgram(programInfo.program);

  gl.uniformMatrix4fv(
    programInfo.uniformLocations.projectionMatrix,
    false,
    projectionMatrix);
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.modelViewMatrix,
    false,
    modelViewMatrix);

  let offset = 0;

  // Draw sticks
  gl.drawArrays(gl.LINES, offset, (sticks*2));
  offset += sticks*2;

  // Draw lines
  gl.drawArrays(gl.LINES, offset, (spaces+1)*2);
  offset += (spaces+1)*2;

  // Update at most 10 times a second
  setTimeout(() => {
    window.requestAnimationFrame(() => draw(gl, programInfo));
  }, 100);
}

function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

main();

