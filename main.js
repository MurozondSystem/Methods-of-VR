'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.

function deg2rad(angle) {
  return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
  this.name = name;
  this.iVertexBuffer = gl.createBuffer();
  this.iNormalBuffer = gl.createBuffer();
  this.count = 0;

  this.BufferData = function(vertices) {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    this.count = vertices.length / 3;
  }

  this.NormalBufferData = function(vertices) {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    this.count = vertices.length / 3;
  }

  this.Draw = function() {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
    gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribNormal);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    gl.uniform4fv(shProgram.iColor, [0, 0, 0, 1]);
    gl.drawArrays(gl.LINE_STRIP, 0, this.count);
    gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1]);
  }
}


// Constructor
function ShaderProgram(name, program) {

  this.name = name;
  this.prog = program;

  // Location of the attribute variable in the shader program.
  this.iAttribVertex = -1;
  this.iAttribNormal = -1;
  // Location of the uniform specifying a color for the primitive.
  this.iColor = -1;
  // Location of the uniform matrix representing the combined transformation.
  this.iModelViewProjectionMatrix = -1;
  this.iNormalMatrix = -1;
  this.iLightVector = -1;

  this.Use = function() {
    gl.useProgram(this.prog);
  }
}


/* Draws a colored cube, along with a set of coordinate axes.
  * (Note that the use of the above drawPrimitive function is not an efficient
  * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
  */
function draw() {
  let D = document;
  let spans = D.getElementsByClassName("slider-value");

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  /* Set the values of the projection transformation */
  let projection = m4.perspective(Math.PI / 8, 1, 8, 12);
  let conv, // convergence
    eyes, // eye separation
    ratio, // aspect ratio
    fov; // field of view
  conv = 2000.0;
  conv = D.getElementById("conv").value;
  spans[3].innerHTML = conv;
  eyes = 70.0;
  eyes = D.getElementById("eyes").value;
  spans[0].innerHTML = eyes;
  ratio = 1.0;
  fov = Math.PI / 4;
  fov = D.getElementById("fov").value;
  spans[1].innerHTML = fov;
  let top, bottom, left, right, near, far;
  near = 10.0;
  near = D.getElementById("near").value - 0.0;
  spans[2].innerHTML = near;
  far = 20000.0;

  top = near * Math.tan(fov / 2.0);
  bottom = -top;

  let a = ratio * Math.tan(fov / 2.0) * conv;

  let b = a - eyes / 2;
  let c = a + eyes / 2;

  left = -b * near / conv;
  right = c * near / conv;

  // console.log(left, right, bottom, top, near, far);

  let projectionLeft = m4.orthographic(left, right, bottom, top, near, far);

  left = -c * near / conv;
  right = b * near / conv;

  let projectionRight = m4.orthographic(left, right, bottom, top, near, far);

  /* Get the view matrix from the SimpleRotator object.*/
  let modelView = spaceball.getViewMatrix();

  let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.0);
  let translateToPointZero = m4.translation(0, 0, -35);
  let translateToLeft = m4.translation(-0.03, 0, 0);
  let translateToRight = m4.translation(0.03, 0, 0);

  let matAccum0 = m4.multiply(rotateToPointZero, modelView);
  let matAccum = m4.multiply(getRotationMatrix(sensorData), matAccum0);
  let matAccum1 = m4.multiply(translateToPointZero, matAccum0);
  let moveSound = getVector(sensorData.alpha, sensorData.beta, sensorData.gamma);
  if (p) {
    p.setPosition(moveSound[0], moveSound[1], moveSound[2]);
  }
  let matMove = m4.translation(moveSound[0], moveSound[1], moveSound[2])

  let matAccumLeft = m4.multiply(translateToLeft, matAccum1);
  let matAccumRight = m4.multiply(translateToRight, matAccum1);

  /* Multiply the projection matrix times the modelview matrix to give the
        combined transformation matrix, and send that to the shader program. */
  let modelViewProjection = m4.multiply(projection, matAccum1);

  gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

  let modelviewInv = new Float32Array(16);
  let normalmatrix = new Float32Array(16);
  mat4Invert(modelViewProjection, modelviewInv);
  mat4Transpose(modelviewInv, normalmatrix);

  gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalmatrix);

  /* Draw the six faces of a cube, with different colors. */
  gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1]);
  // Specifing Light location
  gl.uniform3fv(shProgram.iLightVector, [1, -5 + 10 * Math.sin(Date.now() * 0.003), 1]);

  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumLeft);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionLeft);
  gl.colorMask(true, false, false, false);
  surface.Draw();

  gl.clear(gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumRight);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionRight);
  gl.colorMask(false, true, true, false);
  surface.Draw();


  gl.colorMask(true, true, true, true);
  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, m4.multiply(matMove, matAccum1));
  gl.uniform4fv(shProgram.iColor, [1, 1, 1, 1]);
  sphereSurf.Draw()
}

function animate() {
  draw()
  window.requestAnimationFrame(animate)
}

let sphereSurf;

function sphereSurfun(r) {
  let vertexList = [];
  let lon = -Math.PI;
  let lat = -Math.PI * 0.5;
  const STEP = 0.1;
  while (lon < Math.PI) {
    while (lat < Math.PI * 0.5) {
      let v1 = sVert(r, lon, lat);
      let v2 = sVert(r, lon + STEP, lat);
      let v3 = sVert(r, lon, lat + STEP);
      let v4 = sVert(r, lon + STEP, lat + STEP);
      vertexList.push(v1.x, v1.y, v1.z);
      vertexList.push(v2.x, v2.y, v2.z);
      vertexList.push(v3.x, v3.y, v3.z);
      vertexList.push(v3.x, v3.y, v3.z);
      vertexList.push(v4.x, v4.y, v4.z);
      vertexList.push(v2.x, v2.y, v2.z);
      lat += STEP;
    }
    lat = -Math.PI * 0.5
    lon += STEP;
  }
  return vertexList;
}

function sVert(r, u, v) {
  let x = r * Math.sin(u) * Math.cos(v);
  let y = r * Math.sin(u) * Math.sin(v);
  let z = r * Math.cos(u);
  return { x: x, y: y, z: z };
}

function CreateSurfaceData() {
  let vertexList = [];
  const m = 6;
  const b = 6 * m;
  let u = 0;
  for (let r = 0; r <= b; r += 1) {
    for (let uGeg = 0; uGeg < 360; uGeg += 5) {
      u = deg2rad(uGeg);

      let v1 = damping(r, u)
      let v2 = damping(r + 1, u)
      let v3 = damping(r, u + deg2rad(5))
      let v4 = damping(r + 1, u + deg2rad(5))
      //One triangle
      vertexList.push(v1.x, v1.y, v1.z);
      vertexList.push(v2.x, v2.y, v2.z);
      vertexList.push(v3.x, v3.y, v3.z);
      //Another triangle
      vertexList.push(v2.x, v2.y, v2.z);
      vertexList.push(v4.x, v4.y, v4.z);
      vertexList.push(v3.x, v3.y, v3.z);
    }
  }

  return vertexList;
}
function CreateNormalData() {
  let vertexList = [];
  const m = 6;
  const b = 6 * m;
  let u = 0;
  for (let r = 0; r <= b; r += 1) {
    for (let uGeg = 0; uGeg < 360; uGeg += 5) {
      u = deg2rad(uGeg);

      let v1 = damping(r, u)
      let v2 = damping(r + 1, u)
      let v3 = damping(r, u + deg2rad(5))
      let v4 = damping(r + 1, u + deg2rad(5));
      let v21 = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z }
      let v31 = { x: v3.x - v1.x, y: v3.y - v1.y, z: v3.z - v1.z }
      let n1 = vec3Cross(v21, v31);
      vec3Normalize(n1);
      let v42 = { x: v4.x - v2.x, y: v4.y - v2.y, z: v4.z - v2.z };
      let v32 = { x: v3.x - v2.x, y: v3.y - v2.y, z: v3.z - v2.z };
      let n2 = vec3Cross(v42, v32);
      vec3Normalize(n2);
      //Normals for one triangle
      vertexList.push(n1.x, n1.y, n1.z);
      vertexList.push(n1.x, n1.y, n1.z);
      vertexList.push(n1.x, n1.y, n1.z);
      //Normals for another triangle
      vertexList.push(n2.x, n2.y, n2.z);
      vertexList.push(n2.x, n2.y, n2.z);
      vertexList.push(n2.x, n2.y, n2.z);
    }
  }

  return vertexList;
}

function damping(r, u) {
  const m = 3;
  const b = 3 * m;
  const a = 4 * m;
  const n = 0.1;
  const fi = 0;
  const omg = m * Math.PI / b;
  const c = 0.05

  let x = r * Math.cos(u);;
  let y = r * Math.sin(u);
  let z = a * Math.pow(Math.E, -n * r) * Math.sin(omg * r + fi);

  return {
    x: x * c,
    y: y * c,
    z: z * c
  }
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  shProgram = new ShaderProgram('Basic', prog);
  shProgram.Use();

  shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
  shProgram.iAttribNormal = gl.getAttribLocation(prog, "normal");
  shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
  shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
  shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");
  shProgram.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
  shProgram.iColor = gl.getUniformLocation(prog, "color");
  shProgram.iLightVector = gl.getUniformLocation(prog, "light");

  surface = new Model('Surface');
  surface.BufferData(CreateSurfaceData());
  surface.NormalBufferData(CreateNormalData());
  sphereSurf = new Model('Surface');

  sphereSurf.BufferData(sphereSurfun(0.25))
  sphereSurf.NormalBufferData(sphereSurfun(0.25))

  gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
  * identifier for that program.  If an error occurs while compiling or
  * linking the program, an exception of type Error is thrown.  The error
  * string contains the compilation or linking error.  If no error occurs,
  * the program identifier is the return value of the function.
  * The second and third parameters are strings that contain the
  * source code for the vertex shader and for the fragment shader.
  */
function createProgram(gl, vShader, fShader) {
  let vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, vShader);
  gl.compileShader(vsh);
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
  }
  let fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsh, fShader);
  gl.compileShader(fsh);
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
  }
  let prog = gl.createProgram();
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
  }
  return prog;
}


/**
  * initialization function that will be called when the page has loaded
  */
function init() {
  initAudio();
  window.addEventListener('deviceorientation', e => {
    sensorData.alpha = deg2rad(e.alpha);
    sensorData.beta = deg2rad(e.beta);
    sensorData.gamma = deg2rad(e.gamma);
  }, true);
  let canvas;
  try {
    canvas = document.getElementById("webglcanvas");
    gl = canvas.getContext("webgl");
    if (!gl) {
      throw "Browser does not support WebGL";
    }
  }
  catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not get a WebGL graphics context.</p>";
    return;
  }
  try {
    initGL();  // initialize the WebGL graphics context
  }
  catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
    return;
  }

  spaceball = new TrackballRotator(canvas, draw, 0);
  window.requestAnimationFrame(animate)
}

function mat4Transpose(a, transposed) {
  var t = 0;
  for (var i = 0; i < 4; ++i) {
    for (var j = 0; j < 4; ++j) {
      transposed[t++] = a[j * 4 + i];
    }
  }
}

function mat4Invert(m, inverse) {
  var inv = new Float32Array(16);
  inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] +
    m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
  inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] -
    m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
  inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] +
    m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
  inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] -
    m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
  inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] -
    m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
  inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] +
    m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
  inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] -
    m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
  inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] +
    m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
  inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] +
    m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
  inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] -
    m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
  inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] +
    m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
  inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] -
    m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
  inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] -
    m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
  inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] +
    m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
  inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] -
    m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
  inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] +
    m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];

  var det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
  if (det == 0) return false;
  det = 1.0 / det;
  for (var i = 0; i < 16; i++) inverse[i] = inv[i] * det;
  return true;
}

function vec3Cross(a, b) {
  let x = a.y * b.z - b.y * a.z;
  let y = a.z * b.x - b.z * a.x;
  let z = a.x * b.y - b.x * a.y;
  return { x: x, y: y, z: z }
}

function vec3Normalize(a) {
  var mag = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
  a[0] /= mag; a[1] /= mag; a[2] /= mag;
}

function getRotationMatrix(o) {
  var _x = -o.beta;
  var _y = -o.gamma;
  var _z = -o.alpha;

  var cX = Math.cos(_x);
  var cY = Math.cos(_y);
  var cZ = Math.cos(_z);
  var sX = Math.sin(_x);
  var sY = Math.sin(_y);
  var sZ = Math.sin(_z);

  //
  // ZXY rotation matrix construction.
  //

  var m11 = cZ * cY - sZ * sX * sY;
  var m12 = - cX * sZ;
  var m13 = cY * sZ * sX + cZ * sY;

  var m21 = cY * sZ + cZ * sX * sY;
  var m22 = cZ * cX;
  var m23 = sZ * sY - cZ * cY * sX;

  var m31 = - cX * sY;
  var m32 = sX;
  var m33 = cX * cY;

  return [
    m11, m12, m13, 0,
    m21, m22, m23, 0,
    m31, m32, m33, 0,
    0, 0, 0, 1
  ];

};

let sensorData = {
  alpha: 0,
  beta: 0,
  gamma: 0,
}

function getVector(alpha, beta, gamma) {
  const alphaRad = alpha;
  const betaRad = beta;
  const gammaRad = gamma;

  // Define the initial vector along the x-axis
  let v = [0, 0, 1];

  // Rotation around the z-axis (gamma)
  const rotZ = [
    [Math.cos(gammaRad), -Math.sin(gammaRad), 0],
    [Math.sin(gammaRad), Math.cos(gammaRad), 0],
    [0, 0, 1]
  ];
  v = matXvec(rotZ, v);

  // Rotation around the y-axis (beta)
  const rotY = [
    [Math.cos(betaRad), 0, Math.sin(betaRad)],
    [0, 1, 0],
    [-Math.sin(betaRad), 0, Math.cos(betaRad)]
  ];
  v = matXvec(rotY, v);

  // Rotation around the x-axis (alpha)
  const rotX = [
    [1, 0, 0],
    [0, Math.cos(alphaRad), -Math.sin(alphaRad)],
    [0, Math.sin(alphaRad), Math.cos(alphaRad)]
  ];
  v = matXvec(rotX, v);

  return v;
}

function matXvec(m, v) {
  const dst = [];
  for (let i = 0; i < m.length; i++) {
    let sum = 0;
    for (let j = 0; j < v.length; j++) {
      sum += m[i][j] * v[j];
    }
    dst.push(sum);
  }
  return dst;
}

let context;
let radioButton;
let audio = null,
  source,
  f,
  p;

function setAudioParams() {
  audio = document.getElementById('player');
  radioButton = document.getElementById('inpt');

  audio.addEventListener('play', () => {
    if (!context) {
      context = new AudioContext();
      source = context.createMediaElementSource(audio);
      p = context.createPanner();
      f = context.createBiquadFilter();

      source.connect(p);
      p.connect(f);
      f.connect(context.destination);

      f.type = 'peaking';
      f.Q.value = 1;
      f.frequency.value = 1000;
      f.gain.value = 10;
      context.resume();
    }
  })


  audio.addEventListener('pause', () => {
    console.log('pause');
    context.resume();
  })
}

function initAudio() {
  setAudioParams();
  radioButton.addEventListener('change', function() {
    if (radioButton.checked) {
      p.disconnect();
      p.connect(f);
      f.connect(context.destination);
    } else {
      p.disconnect();
      p.connect(context.destination);
    }
  });
  audio.play();
}