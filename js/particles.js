import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js";

const TAU = Math.PI * 2;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(t) {
  const value = clamp(t, 0, 1);
  return value * value * (3 - 2 * value);
}

function randomGaussian() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}

export class ParticleExperience {
  constructor(canvas) {
    this.canvas = canvas;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.isMobile = window.matchMedia("(max-width: 820px)").matches;
    this.count = this.reducedMotion ? 6500 : this.isMobile ? 7600 : 22000;
    this.shapeCount = Math.floor(this.count * 0.9);
    this.pointer = new THREE.Vector2(99, 99);
    this.pointerTarget = new THREE.Vector2(99, 99);
    this.progress = 1;
    this.progressTarget = 1;
    this.intro = this.reducedMotion ? 1 : 0;
    this.introStart = performance.now();
    this.running = true;
    this.clock = new THREE.Clock();
    this.logoPixels = [];

    if (!this.canUseWebGL()) {
      document.body.classList.add("no-webgl");
      return;
    }

    try {
      this.initRenderer();
      this.loadLogo();
    } catch (error) {
      console.warn("PIKHUO particle scene unavailable:", error);
      document.body.classList.add("no-webgl");
    }
  }

  canUseWebGL() {
    try {
      const probe = document.createElement("canvas");
      return Boolean(probe.getContext("webgl2"));
    } catch (_error) {
      return false;
    }
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: false,
      powerPreference: "high-performance"
    });
    this.renderer.setClearColor(0x050308, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
    this.camera.position.set(0, 0, 14);

    this.handleResize = this.handleResize.bind(this);
    this.handlePointer = this.handlePointer.bind(this);
    this.handlePointerLeave = this.handlePointerLeave.bind(this);
    this.handleVisibility = this.handleVisibility.bind(this);
    this.animate = this.animate.bind(this);

    window.addEventListener("resize", this.handleResize, { passive: true });
    window.addEventListener("pointermove", this.handlePointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", this.handlePointerLeave);
    document.addEventListener("visibilitychange", this.handleVisibility);
    this.canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.running = false;
      document.body.classList.add("no-webgl");
    });

    this.handleResize();
  }

  async loadLogo() {
    const image = new Image();
    image.decoding = "async";
    image.src = new URL("../assets/pikhuo-mark.png", import.meta.url).href;

    await image.decode();
    this.logoPixels = this.readLogoPixels(image);

    if (!this.logoPixels.length) {
      throw new Error("Logo alpha data is empty.");
    }

    this.createParticleSystem();
    this.renderer.setAnimationLoop(this.animate);
  }

  readLogoPixels(image) {
    const surface = document.createElement("canvas");
    const context = surface.getContext("2d", { willReadFrequently: true });
    surface.width = image.naturalWidth;
    surface.height = image.naturalHeight;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, surface.width, surface.height).data;
    const samples = [];

    for (let y = 0; y < surface.height; y += 2) {
      for (let x = 0; x < surface.width; x += 2) {
        const alpha = pixels[(y * surface.width + x) * 4 + 3];
        if (alpha > 100) samples.push({ x, y, alpha });
      }
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    samples.forEach((sample) => {
      minX = Math.min(minX, sample.x);
      maxX = Math.max(maxX, sample.x);
      minY = Math.min(minY, sample.y);
      maxY = Math.max(maxY, sample.y);
    });
    this.logoBounds = {
      minX,
      maxX,
      minY,
      maxY
    };
    return samples;
  }

  createParticleSystem() {
    const geometry = new THREE.BufferGeometry();
    const targets = this.createTargets();
    const sizes = new Float32Array(this.count);
    const seeds = new Float32Array(this.count);

    for (let i = 0; i < this.count; i += 1) {
      const seed = Math.random();
      seeds[i] = seed;
      sizes[i] = i < this.shapeCount
        ? lerp(1.2, 3.1, Math.pow(Math.random(), 2.1))
        : lerp(0.7, 2.2, Math.random());
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(targets.scatter, 3));
    geometry.setAttribute("aLogo", new THREE.BufferAttribute(targets.logo, 3));
    geometry.setAttribute("aSignal", new THREE.BufferAttribute(targets.signal, 3));
    geometry.setAttribute("aWeave", new THREE.BufferAttribute(targets.weave, 3));
    geometry.setAttribute("aReturn", new THREE.BufferAttribute(targets.returnFlow, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

    this.uniforms = {
      uTime: { value: 0 },
      uProgress: { value: 1 },
      uIntro: { value: this.intro },
      uPointer: { value: this.pointer.clone() },
      uPointerStrength: { value: this.reducedMotion ? 0 : 0.12 },
      uPointScale: { value: Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.1 : 1.5) }
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute vec3 aLogo;
        attribute vec3 aSignal;
        attribute vec3 aWeave;
        attribute vec3 aReturn;
        attribute float aSize;
        attribute float aSeed;

        uniform float uTime;
        uniform float uProgress;
        uniform float uIntro;
        uniform vec2 uPointer;
        uniform float uPointerStrength;
        uniform float uPointScale;

        varying float vAlpha;
        varying float vSeed;
        varying float vDepth;

        float ease(float t) {
          t = clamp(t, 0.0, 1.0);
          return t * t * (3.0 - 2.0 * t);
        }

        void main() {
          vec3 target;
          if (uProgress < 2.0) {
            target = mix(aLogo, aSignal, ease(uProgress - 1.0));
          } else if (uProgress < 3.0) {
            target = mix(aSignal, aWeave, ease(uProgress - 2.0));
          } else {
            target = mix(aWeave, aReturn, ease(uProgress - 3.0));
          }

          vec3 p = mix(position, target, ease(uIntro));
          float drift = sin(uTime * (0.11 + aSeed * 0.14) + aSeed * 31.4);
          p.z += drift * 0.07;
          p.y += cos(uTime * 0.1 + aSeed * 27.0) * 0.025;

          float pointerDistance = distance(p.xy, uPointer);
          float pointerFalloff = smoothstep(1.45, 0.0, pointerDistance);
          vec2 direction = normalize(p.xy - uPointer + vec2(0.0001));
          p.xy += direction * pointerFalloff * uPointerStrength;
          p.z += pointerFalloff * uPointerStrength * 0.7;

          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = aSize * uPointScale * (78.0 / -mvPosition.z);

          vSeed = aSeed;
          vDepth = clamp((p.z + 4.0) / 8.0, 0.0, 1.0);
          vAlpha = mix(0.34, 0.94, pow(aSeed, 1.7));
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying float vSeed;
        varying float vDepth;

        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float distanceToCenter = length(uv);
          float softEdge = 1.0 - smoothstep(0.18, 0.5, distanceToCenter);
          float core = 1.0 - smoothstep(0.0, 0.16, distanceToCenter);

          vec3 lavender = vec3(0.72, 0.48, 0.79);
          vec3 pale = vec3(0.96, 0.90, 0.98);
          vec3 pink = vec3(0.86, 0.58, 0.76);
          vec3 color = mix(lavender, pale, pow(vSeed, 2.2));
          color = mix(color, pink, smoothstep(0.42, 0.54, vSeed) * (1.0 - smoothstep(0.54, 0.7, vSeed)) * 0.34);
          color += core * 0.14;

          float alpha = softEdge * vAlpha * mix(0.58, 1.0, vDepth);
          if (alpha < 0.012) discard;
          gl_FragColor = vec4(color, alpha);
        }
      `
    });

    this.points = new THREE.Points(geometry, material);
    this.scene.add(this.points);
  }

  createTargets() {
    const scatter = new Float32Array(this.count * 3);
    const logo = new Float32Array(this.count * 3);
    const signal = new Float32Array(this.count * 3);
    const weave = new Float32Array(this.count * 3);
    const returnFlow = new Float32Array(this.count * 3);

    const isCompact = window.innerWidth <= 820;
    const logoWidth = isCompact ? 5.1 : 5.9;
    const logoCenterX = isCompact ? 0 : 3.2;
    const logoCenterY = isCompact ? 2.25 : 0.85;
    const logoRatio = (this.logoBounds.maxY - this.logoBounds.minY) / (this.logoBounds.maxX - this.logoBounds.minX);
    const logoHeight = logoWidth * logoRatio;

    for (let i = 0; i < this.count; i += 1) {
      const index = i * 3;
      const isShapeParticle = i < this.shapeCount;

      // 初始空間：以疏密不均的橢圓雲取代平均星空。
      const scatterRadius = Math.pow(Math.random(), 0.62);
      const scatterAngle = Math.random() * TAU;
      scatter[index] = Math.cos(scatterAngle) * scatterRadius * 11 + randomGaussian() * 0.28;
      scatter[index + 1] = Math.sin(scatterAngle) * scatterRadius * 6.5 + randomGaussian() * 0.2;
      scatter[index + 2] = randomGaussian() * 3.1;

      if (isShapeParticle) {
        const sample = this.logoPixels[Math.floor(Math.random() * this.logoPixels.length)];
        const nx = (sample.x - this.logoBounds.minX) / (this.logoBounds.maxX - this.logoBounds.minX) - 0.5;
        const ny = 0.5 - (sample.y - this.logoBounds.minY) / (this.logoBounds.maxY - this.logoBounds.minY);
        logo[index] = logoCenterX + nx * logoWidth + randomGaussian() * 0.013;
        logo[index + 1] = logoCenterY + ny * logoHeight + randomGaussian() * 0.013;
        logo[index + 2] = randomGaussian() * 0.16;
      } else {
        logo[index] = scatter[index] * 0.72;
        logo[index + 1] = scatter[index + 1] * 0.72;
        logo[index + 2] = scatter[index + 2] + 0.4;
      }

      // 行銷之前：不對稱、厚實的有機訊號環。
      const ringAngle = Math.random() * TAU;
      const tube = randomGaussian() * 0.56;
      const signalCenterX = isCompact ? 0 : 3.0;
      const signalCenterY = isCompact ? 1.05 : 0.2;
      const organic = 1 + Math.sin(ringAngle * 3 + 0.8) * 0.11 + Math.cos(ringAngle * 5) * 0.055;
      const ringRadiusX = (isCompact ? 2.55 : 3.25) * organic;
      const ringRadiusY = (isCompact ? 1.75 : 2.45) * organic;
      signal[index] = signalCenterX + Math.cos(ringAngle) * (ringRadiusX + tube) + randomGaussian() * 0.12;
      signal[index + 1] = signalCenterY + Math.sin(ringAngle) * (ringRadiusY + tube * 0.62) + Math.sin(ringAngle * 2) * 0.24;
      signal[index + 2] = Math.sin(ringAngle * 1.5) * 1.25 + tube * 0.8;

      // 行銷執行：三股柔軟粒子帶，策略、創意與投放彼此編織。
      const u = Math.random() * 2 - 1;
      const band = i % 3;
      const phase = band * (TAU / 3);
      const breadth = randomGaussian() * 0.36;
      const weaveCenterX = isCompact ? 0 : -2.9;
      const weaveCenterY = isCompact ? 1 : 0.15;
      weave[index] = weaveCenterX + u * (isCompact ? 3.4 : 4.4) + breadth * 0.3;
      weave[index + 1] = weaveCenterY + Math.sin(u * Math.PI * 2.15 + phase) * (isCompact ? 1.3 : 1.85) + breadth;
      weave[index + 2] = Math.cos(u * Math.PI * 2.15 + phase) * 1.45 + randomGaussian() * 0.22;

      // 成效回饋：不封閉、前後交錯的回流環。
      const arc = 0.28 + Math.random() * (TAU - 0.56);
      const ribbon = randomGaussian() * 0.48;
      const returnCenterX = isCompact ? 0 : 3.0;
      const returnCenterY = isCompact ? 0.9 : 0.1;
      const returnRadius = (isCompact ? 2.25 : 3.05) + Math.sin(arc * 2.0) * 0.2;
      returnFlow[index] = returnCenterX + Math.cos(arc) * (returnRadius + ribbon * 0.52);
      returnFlow[index + 1] = returnCenterY + Math.sin(arc) * ((isCompact ? 1.7 : 2.35) + ribbon * 0.4);
      returnFlow[index + 2] = Math.sin(arc * 0.5) * 1.55 + Math.cos(arc * 2.0) * 0.48 + ribbon;
    }

    return { scatter, logo, signal, weave, returnFlow };
  }

  handleResize() {
    if (!this.renderer) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const mobile = width <= 820;

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.1 : 1.5));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    if (this.uniforms) {
      this.uniforms.uPointScale.value = Math.min(window.devicePixelRatio || 1, mobile ? 1.1 : 1.5);
    }
  }

  handlePointer(event) {
    if (this.reducedMotion) return;
    const normalizedX = event.clientX / window.innerWidth * 2 - 1;
    const normalizedY = -(event.clientY / window.innerHeight * 2 - 1);
    const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)) * this.camera.position.z;
    const visibleWidth = visibleHeight * this.camera.aspect;
    this.pointerTarget.set(normalizedX * visibleWidth * 0.5, normalizedY * visibleHeight * 0.5);
  }

  handlePointerLeave() {
    this.pointerTarget.set(99, 99);
  }

  handleVisibility() {
    this.running = !document.hidden;
  }

  setProgress(progress) {
    this.progressTarget = clamp(progress, 1, 4);
  }

  setSceneOpacity(value) {
    this.canvas.style.opacity = String(clamp(value, 0, 1));
  }

  animate() {
    if (!this.points || !this.running) return;

    const now = performance.now();
    const elapsed = this.clock.getElapsedTime();

    if (!this.reducedMotion) {
      this.intro = smoothstep((now - this.introStart) / 2300);
      this.progress += (this.progressTarget - this.progress) * 0.055;
      this.pointer.lerp(this.pointerTarget, 0.06);
      this.uniforms.uTime.value = elapsed;
    } else {
      this.progress = Math.round(this.progressTarget);
    }

    this.uniforms.uIntro.value = this.intro;
    this.uniforms.uProgress.value = this.progress;
    this.uniforms.uPointer.value.copy(this.pointer);

    const pointerIsAway = this.pointerTarget.x === 99;
    const cameraTargetX = pointerIsAway ? 0 : this.pointer.x * 0.015;
    const cameraTargetY = pointerIsAway ? 0 : this.pointer.y * 0.01;
    this.camera.position.x += (cameraTargetX - this.camera.position.x) * 0.025;
    this.camera.position.y += (cameraTargetY - this.camera.position.y) * 0.025;
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
  }
}
