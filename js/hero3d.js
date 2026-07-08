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
  const camera = new THREE.PerspectiveCamera(42, wrap.clientWidth / wrap.clientHeight, 0.1, 100);
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

  // Environment for glossy/metallic reflections (procedural, no external HDR needed)
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const lightV = new THREE.PointLight(0x9b6bff, 30, 60);
  lightV.position.set(-8, 4, 10);
  scene.add(lightV);
  const lightM = new THREE.PointLight(0xff2e9a, 30, 60);
  lightM.position.set(8, -3, 8);
  scene.add(lightM);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
  keyLight.position.set(2, 6, 10);
  scene.add(keyLight);

  const textGroup = new THREE.Group();
  scene.add(textGroup);

  // Particle field
  const particleCount = isMobile ? 220 : 700;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 46;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 30 - 6;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const dotTexture = makeDotTexture();
  const particleMat = new THREE.PointsMaterial({
    size: isMobile ? 0.22 : 0.16,
    map: dotTexture,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    color: 0xb98bff
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  function makeDotTexture() {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }

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

  function fitCameraToObject(object, offset = 1.35) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * offset;
    camera.position.set(center.x, center.y, cameraZ);
    camera.lookAt(center.x, center.y, 0);
  }

  const fontUrl = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json';
  const loader = new FontLoader();
  let ready = false;

  loader.load(
    fontUrl,
    (font) => {
      const lines = ['MAHMOUD', 'ELSHORBAGY'];
      const size = isMobile ? 2.1 : 3.4;
      const depth = isMobile ? 0.35 : 0.6;
      const lineGap = isMobile ? 2.5 : 4;
      const meshes = [];

      lines.forEach((line, i) => {
        const geo = new TextGeometry(line, {
          font,
          size,
          depth,
          curveSegments: 8,
          bevelEnabled: true,
          bevelThickness: 0.06,
          bevelSize: 0.045,
          bevelSegments: 4
        });
        geo.center();
        applyGradientColors(geo);

        const mat = new THREE.MeshPhysicalMaterial({
          vertexColors: true,
          metalness: 0.9,
          roughness: 0.22,
          clearcoat: 0.7,
          clearcoatRoughness: 0.18,
          envMapIntensity: 1.3
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = i === 0 ? lineGap / 2 : -lineGap / 2;
        textGroup.add(mesh);
        meshes.push(mesh);
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

  // Mouse parallax
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

    particles.rotation.y = t * 0.015;
    particles.rotation.x = t * 0.008;

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
