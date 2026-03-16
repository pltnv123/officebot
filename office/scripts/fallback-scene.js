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

  const hemi = new THREE.HemisphereLight(0xd3e4ff, 0x3f3024, 0.88);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffdeb6, 1.15);
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

  // left wall door
  const doorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 3.3, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x49536b, roughness: 0.85 })
  );
  doorFrame.position.set(-9.88, 1.65, 3.7);
  scene.add(doorFrame);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 3.0, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x6a5446, roughness: 0.8 })
  );
  door.position.set(-9.8, 1.5, 3.7);
  scene.add(door);

  // left wall window
  const winFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 2.6, 3.2),
    new THREE.MeshStandardMaterial({ color: 0x4e5875, roughness: 0.82 })
  );
  winFrame.position.set(-9.9, 4.7, -3.2);
  scene.add(winFrame);
  const winGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(2.9, 2.3),
    new THREE.MeshBasicMaterial({ color: 0x8fb6ff, transparent: true, opacity: 0.65 })
  );
  winGlass.position.set(-9.77, 4.7, -3.2);
  winGlass.rotation.y = Math.PI / 2;
  scene.add(winGlass);

  const windowLight = new THREE.PointLight(0xffd7a8, 1.0, 11);
  windowLight.position.set(-8.5, 4.6, -3.2);
  scene.add(windowLight);

  const ambientFill = new THREE.PointLight(0xa8caff, 0.35, 16);
  ambientFill.position.set(0.5, 3.8, -1.2);
  scene.add(ambientFill);

  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 0.28, 1.9),
    new THREE.MeshStandardMaterial({ color: 0x946547, roughness: 0.84 })
  );
  desk.position.set(-3.2, 1.22, -1.5);
  scene.add(desk);

  const chairSeat = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.16, 0.95),
    new THREE.MeshStandardMaterial({ color: 0x5f6b8d, roughness: 0.82 })
  );
  chairSeat.position.set(-4.9, 0.82, -0.6);
  scene.add(chairSeat);
  const chairBack = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.9, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x67749a, roughness: 0.8 })
  );
  chairBack.position.set(-4.9, 1.28, -1.0);
  scene.add(chairBack);

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

  // simple board lines to imitate tasks
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x24406f });
  for (let i = 0; i < 5; i++) {
    const ln = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.08), lineMat);
    ln.position.set(-0.15, 0.65 - i * 0.35, 0.08);
    board.add(ln);
  }

  const sofa = new THREE.Mesh(
    new THREE.BoxGeometry(3.0, 0.5, 1.25),
    new THREE.MeshStandardMaterial({ color: 0x6d79a6, roughness: 0.86 })
  );
  sofa.position.set(3.6, 0.3, 2.2);
  scene.add(sofa);

  const sofaBack = new THREE.Mesh(
    new THREE.BoxGeometry(3.0, 0.55, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x6270a0, roughness: 0.84 })
  );
  sofaBack.position.set(3.6, 0.65, 1.66);
  scene.add(sofaBack);

  const pillow1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.22, 0.45),
    new THREE.MeshStandardMaterial({ color: 0xe0bf8e, roughness: 0.9 })
  );
  pillow1.position.set(2.85, 0.62, 2.15);
  scene.add(pillow1);

  const pillow2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.2, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x98b2da, roughness: 0.9 })
  );
  pillow2.position.set(4.25, 0.61, 2.23);
  scene.add(pillow2);

  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 2.3),
    new THREE.MeshStandardMaterial({ color: 0x5e4b6f, roughness: 0.95, metalness: 0.0 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(3.8, 0.01, 2.25);
  scene.add(rug);

  const floorLampStand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.8, 12),
    new THREE.MeshStandardMaterial({ color: 0x555b66, roughness: 0.42, metalness: 0.55 })
  );
  floorLampStand.position.set(5.9, 0.92, 2.8);
  scene.add(floorLampStand);

  const floorLampShade = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.45, 18),
    new THREE.MeshStandardMaterial({ color: 0xf1dfbd, roughness: 0.74, emissive: 0x2a1b08, emissiveIntensity: 0.28 })
  );
  floorLampShade.position.set(5.9, 1.95, 2.8);
  floorLampShade.rotation.x = Math.PI;
  scene.add(floorLampShade);

  const floorLampLight = new THREE.PointLight(0xffd39a, 0.72, 8.5);
  floorLampLight.position.set(5.9, 1.75, 2.8);
  scene.add(floorLampLight);

  const employeeDesk = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.22, 1.0),
    new THREE.MeshStandardMaterial({ color: 0x8b6046, roughness: 0.84 })
  );
  employeeDesk.position.set(2.8, 1.1, 1.1);
  scene.add(employeeDesk);

  const employeeMonitor = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.42, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x2d3648, roughness: 0.5, metalness: 0.25 })
  );
  employeeMonitor.position.set(2.8, 1.45, 0.82);
  scene.add(employeeMonitor);

  const employeeMonitorStand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.035, 0.26, 12),
    new THREE.MeshStandardMaterial({ color: 0x586173, roughness: 0.35, metalness: 0.55 })
  );
  employeeMonitorStand.position.set(2.8, 1.23, 0.88);
  scene.add(employeeMonitorStand);

  const employeeMonitorBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.18, 0.03, 18),
    new THREE.MeshStandardMaterial({ color: 0x414a5e, roughness: 0.42, metalness: 0.42 })
  );
  employeeMonitorBase.position.set(2.8, 1.1, 0.88);
  scene.add(employeeMonitorBase);

  const employeeScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 0.31),
    new THREE.MeshBasicMaterial({ color: 0x9adfff })
  );
  employeeScreen.position.z = 0.04;
  employeeMonitor.add(employeeScreen);

  const keyboard = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.03, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x2a2f39, roughness: 0.66 })
  );
  keyboard.position.set(2.78, 1.13, 1.22);
  scene.add(keyboard);

  const mouse = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x404754, roughness: 0.58 })
  );
  mouse.scale.set(1.0, 0.62, 1.24);
  mouse.position.set(3.12, 1.14, 1.2);
  scene.add(mouse);

  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.07, 0.14, 14),
    new THREE.MeshStandardMaterial({ color: 0xd3dbe8, roughness: 0.45 })
  );
  mug.position.set(2.42, 1.18, 1.22);
  scene.add(mug);

  const mugCoffee = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.052, 0.01, 14),
    new THREE.MeshBasicMaterial({ color: 0x3f2919 })
  );
  mugCoffee.position.set(2.42, 1.245, 1.22);
  scene.add(mugCoffee);

  function addPlant(x, z) {
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.2, 0.26, 10),
      new THREE.MeshStandardMaterial({ color: 0x7a4f39, roughness: 0.86 })
    );
    pot.position.set(x, 0.13, z);
    scene.add(pot);
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x71c56e, roughness: 0.72 })
    );
    crown.position.set(x, 0.45, z);
    scene.add(crown);
  }
  addPlant(-1.0, 3.9);
  addPlant(6.2, -0.8);
  addPlant(5.8, 3.55);

  function makeBadge(text, color = 0x9cc2ff){
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(8,14,28,0.72)';
    g.fillRect(0, 8, 256, 48);
    g.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
    g.lineWidth = 3;
    g.strokeRect(2, 10, 252, 44);
    g.fillStyle = '#e7f1ff';
    g.font = 'bold 22px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 128, 33);
    const tex = new THREE.CanvasTexture(c);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    spr.scale.set(1.5, 0.35, 1);
    return spr;
  }

  function makeBot(color, hoodie, role, badgeColor) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), new THREE.MeshStandardMaterial({ color, roughness: 0.75 }));
    body.position.y = 0.55;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), new THREE.MeshStandardMaterial({ color: 0x92df73, roughness: 0.75 }));
    head.position.y = 0.9;
    const hood = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.22, 4, 8), new THREE.MeshStandardMaterial({ color: hoodie, roughness: 0.8 }));
    hood.position.y = 0.3;
    g.add(body, head, hood);
    if (role) {
      const badge = makeBadge(role, badgeColor || 0x9cc2ff);
      badge.position.set(0, 1.35, 0);
      g.add(badge);
    }
    return g;
  }

  const bots = [];
  const b1 = makeBot(0x71d464, 0xff9b49, 'WORKER', 0xffb26f); b1.position.set(-3.0, 0, -0.2); scene.add(b1); bots.push(b1);
  const b2 = makeBot(0x6ecf68, 0x7db3ff, 'PLANNER', 0x7db3ff); b2.position.set(2.5, 0, 1.2); scene.add(b2); bots.push(b2);
  const b3 = makeBot(0x7ad06f, 0xffb875, 'REVIEWER', 0xff8f8f); b3.position.set(5.2, 0, 2.2); scene.add(b3); bots.push(b3);
  const b4 = makeBot(0x68c98d, 0xa591ff, 'DEBUG', 0xb9a5ff); b4.position.set(1.6, 0, -0.9); scene.add(b4); bots.push(b4);
  const b5 = makeBot(0x79d07a, 0x6fd4ff, 'TEST', 0x8fe7ff); b5.position.set(4.4, 0, 0.5); scene.add(b5); bots.push(b5);

  const warm = new THREE.PointLight(0xffc78e, 0.65, 9);
  warm.position.set(3.5, 2.2, 2.0);
  scene.add(warm);

  const moon = new THREE.PointLight(0x8fb7ff, 0.30, 14);
  moon.position.set(-4.2, 6.5, -5.8);
  scene.add(moon);

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
    employeeScreen.material.color.setRGB(0.49 + Math.sin(s * 3.0) * 0.05, 0.83 + Math.cos(s * 2.4) * 0.04, 1.0);
    bots.forEach((b, i) => {
      b.position.y = Math.sin(s * 2.2 + i) * 0.03;
      b.rotation.z = Math.sin(s * 1.7 + i * 0.8) * 0.03;
    });
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
