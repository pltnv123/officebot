import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function launchFallbackScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111a31);

  const camera = new THREE.PerspectiveCamera(48, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(9.5, 7.2, 13.5);
  camera.lookAt(0, 1.8, 0);

  const hemi = new THREE.HemisphereLight(0xc1dbff, 0x34281f, 0.72);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffddb5, 0.92);
  key.position.set(-6, 10, 5);
  scene.add(key);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 14),
    new THREE.MeshStandardMaterial({ color: 0x655a52, roughness: 0.94 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(20, 8, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x4e5a75, roughness: 0.9 })
  );
  backWall.position.set(0, 4, -7);
  scene.add(backWall);

  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 8, 14),
    new THREE.MeshStandardMaterial({ color: 0x576281, roughness: 0.9 })
  );
  leftWall.position.set(-10, 4, 0);
  scene.add(leftWall);

  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 0.28, 1.9),
    new THREE.MeshStandardMaterial({ color: 0x946547, roughness: 0.84 })
  );
  desk.position.set(-3.2, 1.22, -1.5);
  scene.add(desk);

  const monitor = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.9, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x2c3442, roughness: 0.45 })
  );
  monitor.position.set(-3.4, 1.95, -2.05);
  scene.add(monitor);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.7),
    new THREE.MeshBasicMaterial({ color: 0x9de6ff })
  );
  screen.position.z = 0.05;
  monitor.add(screen);

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 2.1, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x3c2d25, roughness: 0.78 })
  );
  board.position.set(4.2, 4.1, -6.85);
  scene.add(board);

  const boardFace = new THREE.Mesh(
    new THREE.PlaneGeometry(4.3, 1.85),
    new THREE.MeshBasicMaterial({ color: 0x8fb8ff })
  );
  boardFace.position.z = 0.07;
  board.add(boardFace);

  const sofa = new THREE.Mesh(
    new THREE.BoxGeometry(3.0, 0.5, 1.25),
    new THREE.MeshStandardMaterial({ color: 0x6d79a6, roughness: 0.86 })
  );
  sofa.position.set(3.6, 0.3, 2.2);
  scene.add(sofa);

  function makeBot(color, hoodie) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), new THREE.MeshStandardMaterial({ color, roughness: 0.75 }));
    body.position.y = 0.55;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), new THREE.MeshStandardMaterial({ color: 0x92df73, roughness: 0.75 }));
    head.position.y = 0.9;
    const hood = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.22, 4, 8), new THREE.MeshStandardMaterial({ color: hoodie, roughness: 0.8 }));
    hood.position.y = 0.3;
    g.add(body, head, hood);
    return g;
  }

  const bots = [];
  const b1 = makeBot(0x71d464, 0xff9b49); b1.position.set(-3.0, 0, -0.2); scene.add(b1); bots.push(b1);
  const b2 = makeBot(0x6ecf68, 0x7db3ff); b2.position.set(2.5, 0, 1.2); scene.add(b2); bots.push(b2);
  const b3 = makeBot(0x7ad06f, 0xffb875); b3.position.set(5.2, 0, 2.2); scene.add(b3); bots.push(b3);

  const warm = new THREE.PointLight(0xffc78e, 0.38, 8);
  warm.position.set(3.5, 2.2, 2.0);
  scene.add(warm);

  function resize() {
    const w = canvas.clientWidth;
    const h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);

  function tick(t = 0) {
    const s = t * 0.001;
    screen.material.color.setRGB(0.55 + Math.random() * 0.08, 0.87 + Math.random() * 0.08, 1);
    bots.forEach((b, i) => {
      b.position.y = Math.sin(s * 2.2 + i) * 0.03;
      b.rotation.z = Math.sin(s * 1.7 + i * 0.8) * 0.03;
    });
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
