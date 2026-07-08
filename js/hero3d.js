import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const wrap = document.getElementById('hero-canvas-wrap');
const fallback = document.querySelector('.hero-fallback-text');

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

if (!wrap || !supportsWebGL()) {
  if (fallback) fallback.style.display = 'block';
} else {
  initHero3D();
}

function initHero3D() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let isMobile = window.innerWidth <= 768;

  const VIOLET = new THREE.Color(0x6e2bff);
  const MAGENTA = new THREE.Color(0xff2e9a);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b0b12, 0.012);

  const camera = new THREE.PerspectiveCamera(42, wrap.clientWidth / wrap.clientHeight, 0.1, 200);
  camera.position.set(0, 0, 20);

  const renderer = new THREE.WebGLRenderer({
    antialias: !isMobile,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  wrap.appendChild(renderer.domElement);

  // Environment for subtle glossy reflections on the flat name plate
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const lightV = new THREE.PointLight(0x9b6bff, 26, 60);
  lightV.position.set(-8, 4, 10);
  scene.add(lightV);
  const lightM = new THREE.PointLight(0xff2e9a, 26, 60);
  lightM.position.set(8, -3, 8);
  scene.add(lightM);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
  keyLight.position.set(2, 6, 10);
  scene.add(keyLight);

  const textGroup = new THREE.Group();
  scene.add(textGroup);

  /* ========================================================
     Galaxy / starfield background — layered, depth, drifting
     ======================================================== */

  const galaxyGroup = new THREE.Group();
  galaxyGroup.position.z = -18;
  scene.add(galaxyGroup);

  const dotTexture = makeDotTexture();

  function makeDotTexture() {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.7)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

  function makeNebulaTexture(colorA, colorB) {
    const size = 512;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, colorA);
    grad.addColorStop(0.5, colorB);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

  function makeStarLayer({ count, spread, depth, size, opacity, color }) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.65;
      positions[i * 3 + 2] = (Math.random() - 0.5) * depth;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      size,
      map: dotTexture,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color
    });
    return new THREE.Points(geo, mat);
  }

  const starCounts = isMobile
    ? { far: 260, mid: 140, near: 70 }
    : { far: 900, mid: 420, near: 180 };

  const farStars = makeStarLayer({ count: starCounts.far, spread: 140, depth: 60, size: isMobile ? 0.55 : 0.5, opacity: 0.35, color: 0x9fa8ff });
  const midStars = makeStarLayer({ count: starCounts.mid, spread: 100, depth: 50, size: isMobile ? 0.85 : 0.75, opacity: 0.55, color: 0xd8c8ff });
  const nearStars = makeStarLayer({ count: starCounts.near, spread: 70, depth: 40, size: isMobile ? 1.3 : 1.15, opacity: 0.8, color: 0xffffff });

  galaxyGroup.add(farStars, midStars, nearStars);

  // Soft nebula haze — two large translucent sprites in brand colors
  const nebulaMat1 = new THREE.SpriteMaterial({
    map: makeNebulaTexture('rgba(110,43,255,0.28)', 'rgba(110,43,255,0.08)'),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: isMobile ? 0.5 : 0.7
  });
  const nebula1 = new THREE.Sprite(nebulaMat1);
  nebula1.scale.set(60, 60, 1);
  nebula1.position.set(-16, 8, -30);
  galaxyGroup.add(nebula1);

  const nebulaMat2 = new THREE.SpriteMaterial({
    map: makeNebulaTexture('rgba(255,46,154,0.24)', 'rgba(255,46,154,0.07)'),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: isMobile ? 0.45 : 0.65
  });
  const nebula2 = new THREE.Sprite(nebulaMat2);
  nebula2.scale.set(70, 70, 1);
  nebula2.position.set(18, -10, -36);
  galaxyGroup.add(nebula2);

  function applyGradientColors(geometry) {
    geometry.computeBoundingBox();
    const { min, max } = geometry.boundingBox;
    const range = max.x - min.x || 1;
    const pos = geometry.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = (pos.getX(i) - min.x) / range;
      c.copy(VIOLET).lerp(MAGENTA, t);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  function fitCameraToObject(object, offset = 1.6) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const fovV = camera.fov * (Math.PI / 180);
    const fovH = 2 * Math.atan(Math.tan(fovV / 2) * camera.aspect);
    const distV = (size.y / 2) / Math.tan(fovV / 2);
    const distH = (size.x / 2) / Math.tan(fovH / 2);
    const cameraZ = Math.max(distV, distH) * offset;
    camera.position.set(center.x, center.y, cameraZ);
    const yBias = isMobile ? 0.65 : 0.9;
    camera.lookAt(center.x, center.y - yBias, 0);
  }

  /* ========================================================
     Name — clean flat 3D plate (no deep extrusion), mouse-reactive
     ======================================================== */

  const fontUrl = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json';
  const loader = new FontLoader();
  let ready = false;

  loader.load(
    fontUrl,
    (font) => {
      const lines = ['MAHMOUD', 'ELSHORBAGY'];
      const size = isMobile ? 2.1 : 3.4;
      const height = isMobile ? 0.012 : 0.02;
      const lineGap = isMobile ? 2.5 : 4;

      lines.forEach((line, i) => {
        const geo = new TextGeometry(line, {
          font,
          size,
          height,
          curveSegments: 8,
          bevelEnabled: true,
          bevelThickness: 0.006,
          bevelSize: 0.005,
          bevelSegments: 2
        });
        geo.center();
        applyGradientColors(geo);

        const mat = new THREE.MeshStandardMaterial({
          vertexColors: true,
          metalness: 0.55,
          roughness: 0.32,
          envMapIntensity: 1.1
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = i === 0 ? lineGap / 2 : -lineGap / 2;
        textGroup.add(mesh);
      });

      fitCameraToObject(textGroup);
      ready = true;
      if (fallback) fallback.style.display = 'none';
    },
    undefined,
    () => {
      if (fallback) fallback.style.display = 'block';
    }
  );

  // Mouse / touch parallax
  const mouse = { x: 0, y: 0 };
  const targetRot = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    if (ready && !prefersReduced) {
      targetRot.y += (mouse.x * 0.35 - targetRot.y) * 0.04;
      targetRot.x += (-mouse.y * 0.2 - targetRot.x) * 0.04;
      textGroup.rotation.y = targetRot.y + Math.sin(t * 0.4) * 0.06;
      textGroup.rotation.x = targetRot.x + Math.sin(t * 0.3) * 0.04;
      textGroup.position.y = Math.sin(t * 0.6) * 0.35;
    } else if (ready) {
      textGroup.rotation.y = mouse.x * 0.15;
    }

    if (!prefersReduced) {
      galaxyGroup.rotation.y = t * 0.01 + mouse.x * 0.02;
      galaxyGroup.rotation.x = t * 0.004 - mouse.y * 0.015;
      farStars.rotation.z = t * 0.003;
      midStars.rotation.z = -t * 0.005;
      nearStars.rotation.z = t * 0.008;
      nebula1.material.opacity = (isMobile ? 0.5 : 0.7) + Math.sin(t * 0.25) * 0.08;
      nebula2.material.opacity = (isMobile ? 0.45 : 0.65) + Math.cos(t * 0.2) * 0.08;
    }

    renderer.render(scene, camera);
  }
  animate();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      isMobile = window.innerWidth <= 768;
      camera.aspect = wrap.clientWidth / wrap.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(wrap.clientWidth, wrap.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
      if (ready) fitCameraToObject(textGroup);
    }, 200);
  });
}
