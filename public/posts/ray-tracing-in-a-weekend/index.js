// ----------------------------------------------------------------------------
// Constants

const MaterialType = Object.freeze({
  Lambertian: 0,
  Metal: 1,
  Dielectric: 2,
});

// ----------------------------------------------------------------------------
// Utils
function glslValue(x) {
  // GLSL literal
  if (typeof x === "string") {
    return x;
  }

  // All input numbers are floats
  if (typeof x === "number") {
    return x.toFixed(8);
  }

  // Array
  if (typeof x === "object" && x.length >= 1) {
    return `vec${x.length}(${x.map(glslValue).join(",")})`;
  }

  throw new Error(`Unknown glslValue: ${typeof x}`);
}

// ----------------------------------------------------------------------------
// Globals

let gl;

// ----------------------------------------------------------------------------
// Common wrapper for building a shader program with a vertex and fragment shader
function ShaderWrapper(
  vertexSource,
  fragmentSource,
  attributeNames,
  uniformNames
) {
  this.shaderProgram = ShaderWrapper.createShaderProgram(
    vertexSource,
    fragmentSource
  );

  this.attributes = {};
  for (const attributeName of attributeNames) {
    this.attributes[attributeName] = gl.getAttribLocation(
      this.shaderProgram,
      attributeName
    );
  }

  this.uniforms = {};
  for (const uniformName of uniformNames) {
    this.uniforms[uniformName] = gl.getUniformLocation(
      this.shaderProgram,
      uniformName
    );
  }
}
ShaderWrapper.createShaderProgram = function (vertexSource, fragmentSource) {
  function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(
        "An error occurred compiling the shaders: " +
          gl.getShaderInfoLog(shader)
      );
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  // Create shaders, combine into program
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error(
      "Unable to initialize the shader program: " +
        gl.getProgramInfoLog(shaderProgram)
    );
    return null;
  }

  return shaderProgram;
};

// ----------------------------------------------------------------------------
// Program objects that implement a full program.
//   constructor: create shader wrapper and any initial data
//   update: called once every render loop before the render function
//   render: called once every render loop to produce output
//   create: optional, async constructor hook

function CoreProgram(renderWrapper, displayWrapper) {
  this.renderWrapper = renderWrapper;
  this.displayWrapper = displayWrapper;

  this.positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
  const positions = [-1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  // Create textures
  this.framebuffer = gl.createFramebuffer();

  const type = gl.getExtension("OES_texture_float")
    ? gl.FLOAT
    : gl.UNSIGNED_BYTE;
  this.textures = [];
  for (let i = 0; i < 2; i++) {
    this.textures.push(gl.createTexture());
    gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.canvas.width,
      gl.canvas.height,
      0,
      gl.RGBA,
      type,
      null
    );
  }
  gl.bindTexture(gl.TEXTURE_2D, null);
  this.samples = 0;

  // Materials
  this.uniforms
  const wrapper = this.renderWrapper;
  const uniforms = wrapper.uniforms;

  // Get UI elements
  this.sizeElement = document.querySelector("#overlay #size");
  this.fpsElement = document.querySelector("#overlay #fps");
  this.frameElement = document.querySelector("#overlay #frame");
}

CoreProgram.world = {
  params: {
    depth: 50,
  },
  materials: [
  ],
  spheres: [
    {
      center: [0, -100.5, -1],
      r: 100,
      material: {
        type: MaterialType.Lambertian,
        albedo: [0.8, 0.8, 0.0],
      },
    },
    {
      center: [0, 0, -1],
      r: 0.5,
      material: {
        type: MaterialType.Lambertian,
        albedo: [0.1, 0.2, 0.5],
      },
    },
    {
      center: [-1, 0, -1],
      r: 0.5,
      material: {
        type: MaterialType.Dielectric,
        indexOfRefraction: 1.5,
      },
    },
    {
      center: [-1, 0, -1],
      r: -0.4,
      material: {
        type: MaterialType.Metal,
        albedo: [0.8, 0.6, 0.2],
        fuzz: 0,
      },
    },
    {
      center: [1, 0, -1],
      r: 0.5,
      material: {
        type: MaterialType.Metal,
        albedo: [0.8, 0.6, 0.2],
        fuzz: 0,
      },
    },
  ],
};

CoreProgram.populateTemplate = function (shader) {

  function createMaterial(material) {
    const type = material.type;
    const albedo = glslValue(material.albedo ?? [0, 0, 0]);
    const fuzz = glslValue(material.fuzz ?? 1);
    const indexOfRefraction = glslValue(material.indexOfRefraction ?? 0);
    return `material(${type}, ${albedo}, ${fuzz}, ${indexOfRefraction})`;
  }

  // Spheres
  const sphereDefinitions = CoreProgram.world.spheres
    .map((s, i) => {
      const name = `sphere_${i}`;
      return `const sphere ${name} = sphere(${glslValue(s.center)}, ${glslValue(s.r)}, ${createMaterial(s.material)});`;
    })
    .join("\n");
  const sphereBody = CoreProgram.world.spheres
    .map((s, i) => {
      const name = `sphere_${i}`;
      return `
  if (sphere_hit(${name}, r, t_min, closest_so_far, rec)) {
    hit_anything = true;
    closest_so_far = rec.t;
  }\
    `;
    })
    .join("\n");

  return shader
    .replaceAll("{{DEPTH}}", CoreProgram.world.params.depth)
    .replaceAll("{{NUM_MATERIALS}}", CoreProgram.world.materials.length)
    .replaceAll("{{hit_world_definitions}}", sphereDefinitions)
    .replaceAll("{{hit_world_body}}", sphereBody)
};

CoreProgram.createRandomScene = function() {
  CoreProgram.world = {
    params: {},
    materials: [],
    spheres: [],
  };
  CoreProgram.world.params.depth = 50;

  // Ground material
  CoreProgram.world.spheres.push({
    center: [0, -1000, 0],
    r: 1000,
    material: {
      type: MaterialType.Lambertian,
      albedo: [0.5, 0.5, 0.5],
    }
  });

  const glassMaterial = {
    type: MaterialType.Dielectric,
    indexOfRefraction: 1.5,
  };

  function random_uniform() {
    return (2*Math.random()) - 1;
  }

  const W = 6;
  for (let a = -W; a < W; a+=1) {
    for (let b = -W; b < W; b+=2) {
      const choose_mat = random_uniform();
      const center = [a+0.8*random_uniform(), 0.2, b+0.9*random_uniform()];

      const x = center[0] - 4;
      const y = center[1] - 0.2;
      const z = center[2] - 0;
      if (Math.sqrt(x*x + y*y + z*z) > 0.9) {
        if (choose_mat < 0.8) {
          // diffuse
          const albedo = [random_uniform(), random_uniform(), random_uniform()];
          CoreProgram.world.materials.push();
          CoreProgram.world.spheres.push({
            center,
            r: 0.2,
            material: {
              type: MaterialType.Lambertian,
              albedo,
            },
          });
        } else if (choose_mat < 0.95) {
          // metal
          const albedo = [
            (Math.random() / 2) + 0.5,
            (Math.random() / 2) + 0.5,
            (Math.random() / 2) + 0.5,
          ];
          const fuzz = Math.random() / 2;
          CoreProgram.world.materials.push();
          CoreProgram.world.spheres.push({
            center,
            r: 0.2,
            material: {
              type: MaterialType.Metal,
              albedo,
              fuzz,
            },
          });
        } else {
          // glass
          CoreProgram.world.spheres.push({
            center,
            r: 0.2,
            material: glassMaterial,
          });
        }
      }
    }
  }

  CoreProgram.world.spheres.push({
    center: [0, 1, 0],
    r: 1,
    material: glassMaterial,
  });

  CoreProgram.world.spheres.push({
    center: [-4, 1, 0],
    r: 1,
    material: {
      type: MaterialType.Lambertian,
      albedo: [0.4, 0.2, 0.1],
    },
  });

  CoreProgram.world.spheres.push({
    center: [4, 1, 0],
    r: 1,
    material: {
      type: MaterialType.Metal,
      albedo: [0.7, 0.6, 0.5],
      fuzz: 0.0,
    },
  });
}

CoreProgram.create = async function () {
  CoreProgram.createRandomScene();
  const vertexSource = `
    attribute vec4 aVertexPosition;

    void main(void) {
      gl_Position = aVertexPosition;
    }
  `;

  // Moved fragment shader to a separate file loaded at runtime to make dev
  // easier. This way is inefficient but removes the need for a bundling tool.
  let renderFragmentSource = await fetch("./index.frag").then((res) =>
    res.text()
  );
  renderFragmentSource = CoreProgram.populateTemplate(renderFragmentSource);

  console.log(renderFragmentSource.split("\n").map((l, i) => `${i.toString().padStart(5)}: ${l}`).join("\n"));
  const renderProgram = new ShaderWrapper(
    vertexSource,
    renderFragmentSource,
    ["aVertexPosition"],
    ["uResolution", "uTime", "uTexture", "uSampleRatio"]
  );

  const displayFragmentSource = `
    precision highp float;
    uniform sampler2D uTexture;
    uniform vec2 uResolution;
    void main() {
      gl_FragColor = texture2D(uTexture, gl_FragCoord.xy / uResolution);
    }
  `;
  const displayProgram = new ShaderWrapper(
    vertexSource,
    displayFragmentSource,
    ["aVertexPosition"],
    ["uResolution", "uTexture"]
  );
  return new CoreProgram(renderProgram, displayProgram);
};

CoreProgram.prototype.update = function (context) {
  const wrapper = this.renderWrapper;
  const attributes = wrapper.attributes;
  const uniforms = wrapper.uniforms;

  // render to texture
  gl.useProgram(wrapper.shaderProgram);
  gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    this.textures[1],
    0
  );

  gl.vertexAttribPointer(attributes.aVertexPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(attributes.aVertexPosition);

  gl.uniform2fv(uniforms.uResolution, [gl.canvas.width, gl.canvas.height]);
  gl.uniform1f(uniforms.uTime, context.now / 1000);
  gl.uniform1f(uniforms.uSampleRatio, this.samples / (this.samples + 1));

  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.flush();
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  // ping pong textures
  this.textures.reverse();
  this.samples += 1;
};
CoreProgram.prototype.render = function (context) {
  const wrapper = this.displayWrapper;
  const attributes = wrapper.attributes;
  const uniforms = wrapper.uniforms;

  gl.useProgram(wrapper.shaderProgram);
  gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
  gl.vertexAttribPointer(attributes.aVertexPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(attributes.aVertexPosition);
  gl.uniform2fv(uniforms.uResolution, [gl.canvas.width, gl.canvas.height]);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.flush();

  this.sizeElement.innerHTML = `Size: ${gl.canvas.width}px`;
  this.fpsElement.innerHTML = `FPS: ${(1000 / context.frameTime).toFixed(3)}`;
  this.frameElement.innerHTML = `Frame: ${context.frame}`;
};

// ----------------------------------------------------------------------------

// Main draw function
function draw(gl, program, context) {
  program.update(context);
  program.render(context);

  window.requestAnimationFrame((now) => {
    context.frameTime = now - context.now;
    context.now = now;
    context.frame = context.frame + 1;
    draw(gl, program, context);
  });
}

// Entrypoint
async function main() {
  const canvas = document.querySelector("#glcanvas");
  gl = canvas.getContext("webgl");

  if (!gl) {
    console.error(
      "Unable to initialize WebGL. Your browser or machine may not support it."
    );
    return;
  }

  const program = await CoreProgram.create();
  const context = {
    now: 0,
    frameTime: 0,
    frame: 0,
  };

  draw(gl, program, context);
}

window.onload = main;
