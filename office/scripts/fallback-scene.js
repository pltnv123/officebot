import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function launchFallbackScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x121a2f);

  const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(8, 7, 11);
  camera.lookAt(0, 1.5, 0);

  scene.add(new THREE.HemisphereLight(0xbad6ff, 0x3a2c20, 0.7));
  const key = new THREE.DirectionalLight(0xffd8ae, 0.9);
  key.position.set(-5, 8, 4);
  scene.add(key);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 12),
    new THREE.MeshStandardMaterial({ color: 0x6a6057, roughness: 0.92 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(18, 7, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x4e5a75, roughness: 0.9 })
  );
  wall.position.set(0, 3.5, -6);
  scene.add(wall);

  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 0.25, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x98674a, roughness: 0.84 })
  );
  desk.position.set(-2.2, 1.2, -1.4);
  scene.add(desk);

  const sofa = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.45, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x6d79a6, roughness: 0.88 })
  );
  sofa.position.set(3.0, 0.28, 1.9);
  scene.add(sofa);

  function resize() {
    const w = canvas.clientWidth;
    const h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);

  function tick() {
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
