import * as THREE from 'three';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x101726, 0.02);

const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
camera.position.set(10, 8, 14);
camera.lookAt(0, 2.2, 0);

// lights
const hemi = new THREE.HemisphereLight(0xbdd5ff, 0x3f2d23, 0.55);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xffd4a8, 1.1);
key.position.set(-8, 12, 6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -16;
key.shadow.camera.right = 16;
key.shadow.camera.top = 12;
key.shadow.camera.bottom = -10;
scene.add(key);

const fill = new THREE.PointLight(0x9cd2ff, 0.45, 10);
fill.position.set(-4, 2.4, -1.6);
scene.add(fill);

const lampLight = new THREE.PointLight(0xffc88c, 0.55, 8);
lampLight.position.set(5.8, 2.3, 3.2);
scene.add(lampLight);

const boardGlow = new THREE.PointLight(0x82b8ff, 0.65, 9);
boardGlow.position.set(5.4, 4.2, -7.3);
scene.add(boardGlow);

// room
const floorTex = new THREE.CanvasTexture(document.createElement('canvas'));
{
  const c = floorTex.image; c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#6a564a'; g.fillRect(0,0,128,128);
  for (let y=0;y<8;y++) for (let x=0;x<8;x++) {
    const b = 92 + ((x+y)%2)*16 + Math.floor(Math.random()*12);
    g.fillStyle = `rgb(${b},${Math.floor(b*0.82)},${Math.floor(b*0.72)})`;
    g.fillRect(x*16,y*16,16,16);
  }
}
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
floorTex.repeat.set(8,6);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(26,18), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95 }));
floor.rotation.x = -Math.PI/2;
floor.receiveShadow = true;
scene.add(floor);

const wallMat = new THREE.MeshStandardMaterial({ color: 0x5a6075, roughness: 0.92 });
const backWall = new THREE.Mesh(new THREE.BoxGeometry(26, 9, 0.24), wallMat);
backWall.position.set(0,4.5,-9);
scene.add(backWall);

// window
const frameMat = new THREE.MeshStandardMaterial({ color: 0x463a46, roughness: 0.8 });
const win = new THREE.Group();
const winTop = new THREE.Mesh(new THREE.BoxGeometry(7,0.2,0.2), frameMat); winTop.position.y = 1.7;
const winBottom = winTop.clone(); winBottom.position.y = -1.7;
const winLeft = new THREE.Mesh(new THREE.BoxGeometry(0.2,3.4,0.2), frameMat); winLeft.position.x = -3.5;
const winRight = winLeft.clone(); winRight.position.x = 3.5;
const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(6.6,3.1), new THREE.MeshBasicMaterial({ color: 0x89a6d6, transparent:true, opacity:0.35 }));
win.add(winTop, winBottom, winLeft, winRight, winGlass);
win.position.set(-6.4, 4.5, -8.84);
scene.add(win);

const moon = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), new THREE.MeshBasicMaterial({ color: 0xe8f2ff }));
moon.position.set(-3.9, 5.8, -8.95);
scene.add(moon);

// desk area
const desk = new THREE.Mesh(new THREE.BoxGeometry(6.2,0.35,2.4), new THREE.MeshStandardMaterial({ color: 0x9b6a49, roughness: 0.82 }));
desk.position.set(-4.4,1.5,-1.7); desk.castShadow = true; scene.add(desk);
for (const [x,z] of [[-7.2,-2.7],[-1.6,-2.7],[-7.2,-0.7],[-1.6,-0.7]]) {
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22,1.5,0.22), new THREE.MeshStandardMaterial({ color: 0x734830, roughness: 0.9 }));
  leg.position.set(x,0.75,z); leg.castShadow = true; scene.add(leg);
}

const monitor = new THREE.Mesh(new THREE.BoxGeometry(1.8,1.05,0.08), new THREE.MeshStandardMaterial({ color: 0x222a38, roughness:0.45, metalness:0.2 }));
monitor.position.set(-5.3,2.25,-2.2); monitor.castShadow = true; scene.add(monitor);
const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.58,0.82), new THREE.MeshBasicMaterial({ color: 0x9ce7ff }));
screen.position.z = 0.045; monitor.add(screen);
const kb = new THREE.Mesh(new THREE.BoxGeometry(1.2,0.05,0.4), new THREE.MeshStandardMaterial({ color: 0xe5e9ee, roughness:0.7 }));
kb.position.set(-4.8,1.7,-1.3); kb.castShadow = true; scene.add(kb);

const chair = new THREE.Group();
const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.95,0.16,0.9), new THREE.MeshStandardMaterial({ color: 0x747a85, roughness: 0.82 })); chairSeat.position.y = 0.86;
const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.95,0.85,0.14), new THREE.MeshStandardMaterial({ color: 0x878d99, roughness: 0.8 })); chairBack.position.set(0,1.24,0.38);
const chairPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.48,12), new THREE.MeshStandardMaterial({ color: 0x4f5563, metalness: 0.3, roughness: 0.5 })); chairPole.position.y = 0.58;
chair.add(chairSeat, chairBack, chairPole);
chair.position.set(-4.9,0,-0.2); chair.rotation.y = 0.18;
scene.add(chair);

// lounge
const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.4,3.2), new THREE.MeshStandardMaterial({ color: 0x2d3459, roughness: 0.95 }));
rug.rotation.x = -Math.PI/2; rug.position.set(5.8,0.01,2.6); scene.add(rug);
const sofa = new THREE.Mesh(new THREE.BoxGeometry(3.5,0.65,1.4), new THREE.MeshStandardMaterial({ color: 0x6f759e, roughness: 0.82 }));
sofa.position.set(5.2,0.45,3.0); sofa.castShadow = true; scene.add(sofa);
const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(3.5,0.8,0.28), new THREE.MeshStandardMaterial({ color: 0x838ab8, roughness: 0.8 }));
sofaBack.position.set(5.2,0.98,3.55); sofaBack.castShadow = true; scene.add(sofaBack);

// board
const boardCanvas = document.createElement('canvas'); boardCanvas.width = 1024; boardCanvas.height = 512;
const bctx = boardCanvas.getContext('2d');
const boardTex = new THREE.CanvasTexture(boardCanvas);
const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(7.9,3.8,0.25), new THREE.MeshStandardMaterial({ color: 0x3d2a1d, roughness: 0.75 }));
boardFrame.position.set(5.1,4.2,-8.7); boardFrame.castShadow = true; scene.add(boardFrame);
const board = new THREE.Mesh(new THREE.PlaneGeometry(7.45,3.35), new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.35, emissive: 0x0f2238, emissiveIntensity: 0.18 }));
board.position.set(5.1,4.2,-8.55); scene.add(board);

// frog
const frog = new THREE.Group();
const body = new THREE.Mesh(new THREE.SphereGeometry(0.45,18,14), new THREE.MeshStandardMaterial({ color: 0x6fd360, roughness: 0.72 })); body.position.y = 0.9;
const head = new THREE.Mesh(new THREE.SphereGeometry(0.36,18,14), new THREE.MeshStandardMaterial({ color: 0x85dd71, roughness: 0.72 })); head.position.y = 1.38;
const hoodie = new THREE.Mesh(new THREE.CapsuleGeometry(0.33,0.52,4,8), new THREE.MeshStandardMaterial({ color: 0xff8c38, roughness: 0.76 })); hoodie.position.y = 0.43;
frog.add(body, head, hoodie);
frog.position.set(-4.9,0,-0.2); frog.scale.set(1.35,1.35,1.35);
scene.add(frog);

// particles
const pCount = 160;
const p = new Float32Array(pCount*3);
for(let i=0;i<pCount;i++){ p[i*3]=(Math.random()-0.5)*18; p[i*3+1]=Math.random()*5+0.4; p[i*3+2]=(Math.random()-0.5)*12; }
const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(p,3));
const pm = new THREE.PointsMaterial({ size:0.05, color:0xf7ddb9, transparent:true, opacity:0.45, depthWrite:false });
const dust = new THREE.Points(pg,pm); scene.add(dust);

const activeEl = document.getElementById('active');
const doneEl = document.getElementById('done');
const tasksActiveEl = document.getElementById('tasks-active');
const tasksDoneEl = document.getElementById('tasks-done');

function drawBoard(active, done){
  bctx.fillStyle = '#ded2bf'; bctx.fillRect(0,0,1024,512);
  bctx.fillStyle = '#f4ecdf'; bctx.fillRect(20,20,984,472);
  bctx.strokeStyle = '#8f7b66'; bctx.lineWidth = 8; bctx.strokeRect(20,20,984,472);
  bctx.fillStyle = '#1d2640'; bctx.font = 'bold 58px monospace'; bctx.fillText('OFFICE TASK BOARD', 64, 102);
  bctx.font = 'bold 34px monospace'; bctx.fillText(`ACTIVE: ${active.length}`, 64, 160); bctx.fillText(`DONE: ${done.length}`, 540, 160);
  bctx.font = '24px monospace';
  active.slice(0,2).forEach((t,i)=>{
    const y = 220 + i*90; bctx.fillStyle = '#2f374e'; bctx.fillText((t.title||'task').slice(0,34), 64, y);
    const subs = t.subtasks||[]; const dn = subs.filter(s=>s.status==='done').length; const tt = Math.max(1, subs.length); const pct = Math.round((dn/tt)*100);
    bctx.fillStyle = '#bcc5d7'; bctx.fillRect(540, y-24, 360, 24);
    bctx.fillStyle = '#5eb978'; bctx.fillRect(540, y-24, Math.max(8, Math.round(360*pct/100)), 24);
    bctx.fillStyle = '#2f374e'; bctx.fillText(`${pct}%`, 910, y-4);
  });
  bctx.fillStyle = '#616a82';
  done.slice(0,5).forEach((t,i)=> bctx.fillText(`✓ ${(t.title||'task').slice(0,42)}`, 64, 350+i*28));
  boardTex.needsUpdate = true;
}

function renderTasks(taskState){
  const active = taskState.active || [];
  const done = taskState.done || [];
  activeEl.textContent = String(active.length);
  doneEl.textContent = String(done.length);
  tasksActiveEl.innerHTML = '';
  tasksDoneEl.innerHTML = '';
  active.forEach(t=>{
    const div = document.createElement('div'); div.className='task';
    div.innerHTML = `<div><b>🟡 ${t.id||''}</b> — ${t.title||'task'}</div>`;
    (t.subtasks||[]).forEach((s,i)=>{ const sub=document.createElement('div'); sub.className='sub'; sub.textContent=`${s.status==='done'?'✅':s.status==='doing'?'🟡':'⚪'} ${i+1}. ${s.title}`; div.appendChild(sub);});
    tasksActiveEl.appendChild(div);
  });
  done.slice(0,6).forEach(t=>{ const div=document.createElement('div'); div.className='task'; div.innerHTML=`<div><b>✅ ${t.id||''}</b> — ${t.title||'task'}</div>`; tasksDoneEl.appendChild(div); });
  drawBoard(active, done);
}

async function poll(){
  try{
    const r = await fetch('./state.json?ts=' + Date.now(), { cache:'no-store' });
    if(!r.ok) return;
    const data = await r.json();
    const ts = data.taskState || { active: [], done: [] };
    renderTasks(ts);
  }catch{}
}

function resize(){
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

function animate(t){
  requestAnimationFrame(animate);
  const s = t * 0.001;
  const h = new Date().getHours() + new Date().getMinutes()/60;
  const day = (h >= 6 && h < 18) ? Math.sin(((h-6)/12)*Math.PI) : 0;

  scene.background = new THREE.Color().setRGB(0.05 + day*0.15, 0.07 + day*0.2, 0.12 + day*0.28);
  hemi.intensity = 0.3 + day*0.35;
  key.intensity = 0.35 + day*1.0;
  fill.intensity = 0.3 + (1-day)*0.55;
  lampLight.intensity = 0.18 + (1-day)*0.38;
  boardGlow.intensity = 0.46 + (1-day)*0.24;
  moon.visible = day < 0.15;
  moon.position.x = -3.9 + Math.sin(s*0.08)*0.8;

  screen.material.color.setRGB(0.55 + Math.random()*0.07, 0.88 + Math.random()*0.07, 1);
  frog.position.y = Math.sin(s*4.5)*0.02;
  frog.rotation.z = Math.sin(s*5.8)*0.01;

  const arr = pg.attributes.position.array;
  for(let i=0;i<pCount;i++){
    arr[i*3+1] += 0.002 + Math.sin(s*0.4 + i)*0.0008;
    if(arr[i*3+1] > 5.8) arr[i*3+1] = 0.4;
  }
  pg.attributes.position.needsUpdate = true;

  renderer.render(scene, camera);
}

poll();
setInterval(poll, 1500);
animate(0);
