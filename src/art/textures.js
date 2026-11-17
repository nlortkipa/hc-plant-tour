// Generates every texture used by the game at boot (no image files needed).
import { W, H, HUD_H } from '../config.js';
import { ZONES } from '../data/zones.js';
import { makeCanvas, fillRR, rr, shade, warnSign, stripes, label, railing, cylV, box3, cylH, shadowEllipse } from './draw.js';
import { paintFloor, paintBackdrop, paintWalkway, paintProp, paintTruck, pedIcon } from './props.js';
import { characterCanvas, portraitCanvas, drawCharacter, NPC_LOOKS, AVATARS, playerLook } from './characters.js';

function add(scene, key, canvas) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

// ---------------------------------------------------------------------------- characters
export function charKey(look) {
  return 'char_' + JSON.stringify(look).replace(/[^a-z0-9]/gi, '').slice(0, 180);
}

/** Ensures a character texture exists for this look and returns its key. */
export function ensureCharTexture(scene, look, scale = 1) {
  const key = charKey(look) + (scale !== 1 ? `_x${scale}` : '');
  if (!scene.textures.exists(key)) add(scene, key, characterCanvas(look, scale));
  return key;
}

export function playerTexture(scene, avatar, items, scale = 1) {
  return ensureCharTexture(scene, playerLook(avatar, items), scale);
}

export function ensurePlayerPortrait(scene, avatar, items) {
  const key = `portrait_player_${avatar}_${[...items].sort().join('-')}`;
  if (!scene.textures.exists(key)) add(scene, key, portraitCanvas(playerLook(avatar, items), 128, '#3b4a5e'));
  return key;
}

// ---------------------------------------------------------------------------- icons
function icon(size, fn) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  fn(ctx, size);
  return c;
}

const PPE_ICON = {
  helmet(ctx, s) {
    ctx.fillStyle = '#f2c200';
    ctx.beginPath();
    ctx.ellipse(s / 2, s * 0.62, s * 0.34, s * 0.3, 0, Math.PI, 0);
    ctx.fill();
    rr(ctx, s * 0.1, s * 0.58, s * 0.8, s * 0.1, 4);
    ctx.fill();
    ctx.fillStyle = '#c99f00';
    ctx.fillRect(s * 0.46, s * 0.33, s * 0.08, s * 0.26);
  },
  cap(ctx, s) {
    ctx.fillStyle = '#2860c4';
    ctx.beginPath();
    ctx.ellipse(s / 2, s * 0.6, s * 0.3, s * 0.25, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#1d4a99';
    rr(ctx, s * 0.4, s * 0.56, s * 0.5, s * 0.1, 4);
    ctx.fill();
  },
  glasses(ctx, s) {
    ctx.fillStyle = 'rgba(140,210,255,0.8)';
    ctx.strokeStyle = '#2d3a46';
    ctx.lineWidth = 3;
    rr(ctx, s * 0.12, s * 0.38, s * 0.33, s * 0.24, 6);
    ctx.fill();
    ctx.stroke();
    rr(ctx, s * 0.55, s * 0.38, s * 0.33, s * 0.24, 6);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.45, s * 0.45);
    ctx.lineTo(s * 0.55, s * 0.45);
    ctx.stroke();
  },
  earmuffs(ctx, s) {
    ctx.strokeStyle = '#d63b2f';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(s / 2, s * 0.55, s * 0.3, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#d63b2f';
    rr(ctx, s * 0.1, s * 0.48, s * 0.18, s * 0.3, 8);
    ctx.fill();
    rr(ctx, s * 0.72, s * 0.48, s * 0.18, s * 0.3, 8);
    ctx.fill();
  },
  respirator(ctx, s) {
    ctx.fillStyle = '#f4f4f4';
    ctx.strokeStyle = '#8a939c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(s / 2, s * 0.55, s * 0.28, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c5ccd3';
    ctx.beginPath();
    ctx.arc(s / 2, s * 0.6, s * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.22, s * 0.5);
    ctx.lineTo(s * 0.08, s * 0.35);
    ctx.moveTo(s * 0.78, s * 0.5);
    ctx.lineTo(s * 0.92, s * 0.35);
    ctx.stroke();
  },
  vest(ctx, s) {
    ctx.fillStyle = '#d9f20d';
    ctx.beginPath();
    ctx.moveTo(s * 0.2, s * 0.15);
    ctx.lineTo(s * 0.42, s * 0.15);
    ctx.lineTo(s * 0.46, s * 0.88);
    ctx.lineTo(s * 0.18, s * 0.88);
    ctx.closePath();
    ctx.moveTo(s * 0.8, s * 0.15);
    ctx.lineTo(s * 0.58, s * 0.15);
    ctx.lineTo(s * 0.54, s * 0.88);
    ctx.lineTo(s * 0.82, s * 0.88);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c9d1da';
    ctx.fillRect(s * 0.18, s * 0.52, s * 0.28, s * 0.07);
    ctx.fillRect(s * 0.54, s * 0.52, s * 0.28, s * 0.07);
    ctx.fillRect(s * 0.18, s * 0.68, s * 0.28, s * 0.07);
    ctx.fillRect(s * 0.54, s * 0.68, s * 0.28, s * 0.07);
  },
  gloves(ctx, s) {
    ctx.fillStyle = '#e2b93b';
    ctx.strokeStyle = '#9c7c1d';
    ctx.lineWidth = 2;
    for (const ox of [0.08, 0.5]) {
      rr(ctx, s * (ox + 0.04), s * 0.4, s * 0.3, s * 0.42, 8);
      ctx.fill();
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        rr(ctx, s * (ox + 0.05 + i * 0.075), s * 0.18, s * 0.065, s * 0.28, 4);
        ctx.fill();
      }
    }
  },
  boots(ctx, s) {
    ctx.fillStyle = '#2a1d14';
    rr(ctx, s * 0.22, s * 0.18, s * 0.26, s * 0.55, 6);
    ctx.fill();
    rr(ctx, s * 0.22, s * 0.55, s * 0.6, s * 0.25, 8);
    ctx.fill();
    ctx.fillStyle = '#8f969e';
    rr(ctx, s * 0.6, s * 0.6, s * 0.22, s * 0.18, 6);
    ctx.fill();
    ctx.fillStyle = '#f2c200';
    ctx.fillRect(s * 0.22, s * 0.78, s * 0.6, s * 0.05);
  },
  sneakers(ctx, s) {
    ctx.fillStyle = '#f5f5f5';
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    rr(ctx, s * 0.12, s * 0.45, s * 0.76, s * 0.3, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e04848';
    ctx.beginPath();
    ctx.moveTo(s * 0.3, s * 0.6);
    ctx.lineTo(s * 0.65, s * 0.5);
    ctx.lineTo(s * 0.65, s * 0.58);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#555';
    ctx.fillRect(s * 0.12, s * 0.7, s * 0.76, s * 0.06);
  },
  sandals(ctx, s) {
    ctx.fillStyle = '#9b6a3a';
    rr(ctx, s * 0.15, s * 0.6, s * 0.7, s * 0.14, 8);
    ctx.fill();
    ctx.strokeStyle = '#6b4520';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(s * 0.3, s * 0.62);
    ctx.lineTo(s * 0.5, s * 0.42);
    ctx.lineTo(s * 0.7, s * 0.62);
    ctx.stroke();
  },
  scarf(ctx, s) {
    ctx.fillStyle = '#d43a3a';
    rr(ctx, s * 0.15, s * 0.25, s * 0.7, s * 0.18, 8);
    ctx.fill();
    rr(ctx, s * 0.55, s * 0.35, s * 0.18, s * 0.5, 6);
    ctx.fill();
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(s * 0.55, s * 0.55, s * 0.18, s * 0.05);
    ctx.fillRect(s * 0.55, s * 0.68, s * 0.18, s * 0.05);
  },
};

const UI_ICON = {
  map(ctx, s) {
    ctx.fillStyle = '#f0f3f6';
    ctx.beginPath();
    ctx.moveTo(s * 0.15, s * 0.25);
    ctx.lineTo(s * 0.38, s * 0.15);
    ctx.lineTo(s * 0.62, s * 0.25);
    ctx.lineTo(s * 0.85, s * 0.15);
    ctx.lineTo(s * 0.85, s * 0.75);
    ctx.lineTo(s * 0.62, s * 0.85);
    ctx.lineTo(s * 0.38, s * 0.75);
    ctx.lineTo(s * 0.15, s * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1f2a38';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s * 0.38, s * 0.15);
    ctx.lineTo(s * 0.38, s * 0.75);
    ctx.moveTo(s * 0.62, s * 0.25);
    ctx.lineTo(s * 0.62, s * 0.85);
    ctx.stroke();
  },
  bag(ctx, s) {
    ctx.fillStyle = '#f0f3f6';
    ctx.beginPath();
    ctx.ellipse(s / 2, s * 0.56, s * 0.32, s * 0.24, 0, Math.PI, 0);
    ctx.fill();
    rr(ctx, s * 0.15, s * 0.5, s * 0.7, s * 0.12, 4);
    ctx.fill();
    ctx.fillStyle = '#1f2a38';
    ctx.fillRect(s * 0.46, s * 0.3, s * 0.08, s * 0.22);
  },
  gear(ctx, s) {
    ctx.fillStyle = '#f0f3f6';
    ctx.save();
    ctx.translate(s / 2, s / 2);
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-s * 0.07, -s * 0.38, s * 0.14, s * 0.2);
    }
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1f2a38';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  help(ctx, s) {
    ctx.strokeStyle = '#f0f3f6';
    ctx.lineWidth = s * 0.08;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#f0f3f6';
    ctx.font = `bold ${s * 0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', s / 2, s * 0.53);
  },
};

function marker(kind) {
  const c = makeCanvas(36, 44);
  const ctx = c.getContext('2d');
  const color = { talk: '#f2b705', info: '#2f81f7', exit: '#3fb950', lock: '#56606d' }[kind];
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(18, 41, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(18, 16, 15, 0, Math.PI * 2);
  ctx.moveTo(10, 27);
  ctx.lineTo(18, 37);
  ctx.lineTo(26, 27);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(18, 16, 15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = kind === 'talk' ? '#1b1b1b' : '#fff';
  ctx.strokeStyle = ctx.fillStyle;
  if (kind === 'exit') {
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(10, 16);
    ctx.lineTo(25, 16);
    ctx.moveTo(19, 9);
    ctx.lineTo(26, 16);
    ctx.lineTo(19, 23);
    ctx.stroke();
  } else if (kind === 'lock') {
    rr(ctx, 10, 15, 16, 12, 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(18, 14, 5, Math.PI, 0);
    ctx.stroke();
  } else {
    ctx.font = 'bold 21px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(kind === 'talk' ? '!' : 'i', 18, 17);
  }
  return c;
}

// ---------------------------------------------------------------------------- zone backgrounds
function zoneBackground(zone) {
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const L = zone.layout;
  const indoor = L.backdrop === 'hall' || L.backdrop === 'room';
  const horizon = indoor ? 190 : 200;
  paintFloor(ctx, L.floor, W, H, HUD_H);
  paintBackdrop(ctx, L.backdrop, W, HUD_H, horizon);
  if (L.walkway) paintWalkway(ctx, L.walkway);
  // non-solid floor props first, then solids sorted by their bottom edge
  const props = [...L.props].sort((a, b) => (a.solid === false ? -1 : 0) - (b.solid === false ? -1 : 0) || a.y + a.h - (b.y + b.h));
  for (const p of props) paintProp(ctx, p);
  // entrance / exit door frames
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(W - 14, 430, 14, 90);
  ctx.fillRect(0, 430, 10, 90);
  return c;
}

// ---------------------------------------------------------------------------- mission boards
function rawmillBoard() {
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  paintFloor(ctx, 'concrete', W, H, HUD_H);
  paintBackdrop(ctx, 'hall', W, HUD_H, 200);
  // stairs with handrail (safe)
  ctx.fillStyle = '#7d8790';
  for (let i = 0; i < 8; i++) ctx.fillRect(40 + i * 12, 330 - i * 22, 60, 8);
  ctx.strokeStyle = '#f2c200';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(40, 300);
  ctx.lineTo(140, 140);
  ctx.moveTo(40, 330);
  ctx.lineTo(40, 300);
  ctx.stroke();
  // control panel (safe)
  box3(ctx, 300, 240, 100, 120, 12, '#c7ccd1');
  ctx.fillStyle = '#e5534b';
  ctx.beginPath();
  ctx.arc(350, 290, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2c200';
  ctx.beginPath();
  ctx.arc(350, 290, 18, 0, Math.PI * 2);
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#3fb950';
  ctx.fillRect(318, 320, 20, 10);
  ctx.fillRect(362, 320, 20, 10);
  // belt conveyor across bottom-left to the tail pulley (hazard)
  ctx.fillStyle = '#535b63';
  for (let x = 240; x < 700; x += 80) ctx.fillRect(x, 470, 8, 60);
  fillRR(ctx, 200, 448, 520, 40, 8, '#7d8790', '#3a424a');
  ctx.fillStyle = '#26292c';
  ctx.fillRect(210, 456, 500, 24);
  // tail pulley housing
  ctx.fillStyle = '#4b4f55';
  ctx.beginPath();
  ctx.arc(214, 468, 30, 0, Math.PI * 2);
  ctx.fill();
  // motor + unguarded coupling + gearbox (hazard)
  box3(ctx, 440, 510, 90, 70, 12, '#3a6ea5');
  box3(ctx, 590, 505, 100, 80, 12, '#5d6670');
  ctx.fillStyle = '#9aa3ad';
  ctx.fillRect(528, 535, 64, 14);
  // guarded coupling (safe): motor + mesh guard
  box3(ctx, 640, 270, 70, 60, 10, '#3a6ea5');
  box3(ctx, 780, 265, 80, 70, 10, '#5d6670');
  ctx.fillStyle = 'rgba(242,194,0,0.9)';
  ctx.fillRect(708, 278, 74, 44);
  ctx.strokeStyle = '#7a6200';
  ctx.lineWidth = 1;
  for (let x = 708; x < 782; x += 6) {
    ctx.beginPath();
    ctx.moveTo(x, 278);
    ctx.lineTo(x, 322);
    ctx.stroke();
  }
  // chain drive (hazard)
  box3(ctx, 820, 540, 70, 70, 10, '#3a6ea5');
  box3(ctx, 950, 420, 110, 90, 10, '#5d6670');
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(870, 540);
  ctx.lineTo(950, 470);
  ctx.moveTo(890, 572);
  ctx.lineTo(965, 500);
  ctx.stroke();
  // bucket elevator with open hatch (hazard)
  box3(ctx, 1060, 80, 80, 520, 10, '#c98a1c');
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(1072, 290, 56, 90);
  ctx.strokeStyle = '#7a5410';
  ctx.lineWidth = 3;
  ctx.strokeRect(1072, 290, 56, 90);
  ctx.fillStyle = '#c98a1c';
  ctx.save();
  ctx.translate(1128, 290);
  ctx.rotate(-0.5);
  ctx.fillRect(0, 0, 8, 90);
  ctx.restore();
  // extinguisher (safe)
  ctx.fillStyle = '#c62828';
  rr(ctx, 1196, 525, 28, 64, 8);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.fillRect(1202, 512, 14, 14);
  shadowEllipse(ctx, 1210, 592, 18, 5);
  // walls signs
  warnSign(ctx, 520, 130, 40, 'noise');
  warnSign(ctx, 570, 130, 40, 'dust');
  return c;
}

function silosBoard() {
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  paintFloor(ctx, 'concrete', W, H, HUD_H);
  paintBackdrop(ctx, 'sky', W, HUD_H, 300);
  ctx.translate(0, 40);
  // two big silos
  cylV(ctx, 150, 150, 420, 330, '#d5d9de');
  cylV(ctx, 640, 150, 420, 330, '#d5d9de');
  // roof railings: left silo has a gap on the left (where violation is)
  railing(ctx, 290, 150, 260, 16);
  railing(ctx, 660, 150, 380, 16);
  // anchor + lanyard for the safe worker
  ctx.fillStyle = '#444';
  ctx.fillRect(790, 140, 10, 16);
  ctx.strokeStyle = '#d12f2f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(795, 146);
  ctx.quadraticCurveTo(815, 130, 840, 120);
  ctx.stroke();
  // ladder on left silo
  ctx.strokeStyle = '#6b7580';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(440, 170);
  ctx.lineTo(440, 480);
  ctx.moveTo(470, 170);
  ctx.lineTo(470, 480);
  for (let y = 180; y < 480; y += 14) {
    ctx.moveTo(440, y);
    ctx.lineTo(470, y);
  }
  ctx.stroke();
  // hatches at the base
  for (const hx of [300, 690]) {
    fillRR(ctx, hx - 36, 420, 72, 60, 30, '#4b535b', '#2d3640', 3);
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(hx, 452, 26, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // permit board near safe hatch
  ctx.fillStyle = '#555';
  ctx.fillRect(388, 470, 4, 70);
  fillRR(ctx, 366, 440, 50, 40, 3, '#fff', '#1565c0', 2);
  label(ctx, 'PERMIT', 391, 460, { size: 10, bold: true, color: '#1565c0' });
  // walkway
  paintWalkway(ctx, { x: 0, y: 600, w: W, h: 70 });
  // crane with suspended load (right)
  ctx.fillStyle = '#f2b705';
  ctx.fillRect(1180, 120, 18, 520);
  ctx.fillRect(960, 120, 238, 14);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(1060, 134);
  ctx.lineTo(1060, 420);
  ctx.stroke();
  fillRR(ctx, 1020, 420, 80, 50, 3, '#8a6b4a', '#4a3a28', 2);
  ctx.fillStyle = '#d8c9a3';
  for (let i = 0; i < 3; i++) fillRR(ctx, 1024 + i * 25, 400, 24, 22, 3, '#d8c9a3', '#9b8a62', 1);
  stripes(ctx, 990, 690, 140, 10);
  // workers
  const look = (extra) => ({ ...NPC_LOOKS.worker, ...extra });
  const put = (x, y, l, s = 1) => {
    ctx.save();
    ctx.translate(x - 24 * s, y - 82 * s);
    ctx.scale(s, s);
    drawCharacter(ctx, l);
    ctx.restore();
  };
  put(208, 176, look({ vest: 'orange' }), 0.95); // no harness at edge
  put(840, 176, look({ harness: true }), 0.95); // with harness
  put(455, 390, look({ vest: 'yellow' }), 0.95); // on ladder with box
  fillRR(ctx, 470, 330, 26, 22, 2, '#8b5a2b', '#4a2e12', 2);
  put(690, 520, look({ vest: 'yellow', shirt: '#5b3a3a' }), 0.95); // entering hatch alone
  put(330, 580, look({ accessory: 'radio' }), 0.95); // attendant with detector
  ctx.fillStyle = '#f2b705';
  rr(ctx, 350, 528, 12, 18, 2);
  ctx.fill();
  put(300, 500, look({ respirator: true, harness: true }), 0.85); // entrant with attendant
  put(1060, 600, look({ vest: 'yellow' }), 0.95); // under load
  put(860, 670, look({}), 0.95); // walker on walkway
  return c;
}

function pathBoard() {
  // Layout must match PathMission's WALK/ROADS/CROSSINGS definitions.
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  paintFloor(ctx, 'gravel', W, H, HUD_H);
  // stockpile / loader yard (forbidden)
  stripes(ctx, 300, 500, 900, 8, '#f2c200', '#1d1d1d', 12);
  // roads
  for (const r of [{ y: 380, h: 80 }, { y: 160, h: 80 }]) {
    ctx.fillStyle = '#3d4247';
    ctx.fillRect(0, r.y, W, r.h);
    ctx.fillStyle = '#f5f5f5';
    for (let x = 20; x < W; x += 80) ctx.fillRect(x, r.y + r.h / 2 - 2, 40, 4);
  }
  // walkway segments
  const walk = [
    { x: 40, y: 620, w: 200, h: 80 },
    { x: 160, y: 460, w: 80, h: 240 },
    { x: 160, y: 290, w: 80, h: 90 },
    { x: 160, y: 290, w: 840, h: 80 },
    { x: 920, y: 240, w: 80, h: 130 },
    { x: 880, y: 70, w: 180, h: 90 },
  ];
  ctx.fillStyle = '#3f8f57';
  for (const s of walk) ctx.fillRect(s.x, s.y, s.w, s.h);
  ctx.strokeStyle = '#f2c200';
  ctx.lineWidth = 4;
  for (const s of walk) ctx.strokeRect(s.x + 2, s.y + 2, s.w - 4, s.h - 4);
  ctx.fillStyle = '#3f8f57';
  for (const s of walk) ctx.fillRect(s.x + 4, s.y + 4, s.w - 8, s.h - 8);
  for (const p of [[200, 660], [200, 530], [400, 330], [700, 330], [960, 300]]) pedIcon(ctx, p[0], p[1], 'rgba(255,255,255,0.6)');
  // zebra crossings
  for (const cr of [{ x: 160, y: 380 }, { x: 920, y: 160 }]) {
    ctx.fillStyle = '#f5f5f5';
    for (let i = 0; i < 5; i++) ctx.fillRect(cr.x + 4, cr.y + 4 + i * 16, 72, 9);
    // stop lines for vehicles
    ctx.fillRect(cr.x - 22, cr.y, 6, 80);
    ctx.fillRect(cr.x + 96, cr.y, 6, 80);
  }
  // control room building (goal)
  box3(ctx, 860, HUD_H + 2, 220, 60, 14, '#d9d4c7', { top: '#3a6ea5' });
  fillRR(ctx, 945, HUD_H + 22, 50, 40, 3, '#5a6b7a', '#2d3640');
  // crusher and stockpile scenery (forbidden areas)
  box3(ctx, 330, 520, 250, 150, 20, '#e0a526');
  ctx.fillStyle = '#c9ccd0';
  ctx.beginPath();
  ctx.ellipse(900, 700, 220, 150, 0, Math.PI, 0);
  ctx.fill();
  box3(ctx, 300, 250 - 170, 300, 70, 12, '#8d939a');
  box3(ctx, 1100, 250 - 170, 160, 70, 12, '#8d939a');
  return c;
}

// ---------------------------------------------------------------------------- misc small textures
function spinDisk(size, color, spokes = 4) {
  return icon(size, (ctx, s) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 4;
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(s / 2, s / 2);
      ctx.lineTo(s / 2 + Math.cos(a) * (s / 2 - 4), s / 2 + Math.sin(a) * (s / 2 - 4));
      ctx.stroke();
    }
    ctx.fillStyle = '#e5534b';
    ctx.fillRect(s / 2 - 3, 2, 6, s * 0.25);
  });
}

function truckSprite(kind, w, h, facing) {
  const c = makeCanvas(w, h);
  paintTruck(c.getContext('2d'), 0, 0, w, h, kind, facing);
  return c;
}

function bagTexture() {
  return icon(64, (ctx, s) => {
    fillRR(ctx, 4, 14, s - 8, s - 28, 8, '#d8c9a3', '#9b8a62', 2);
    ctx.fillStyle = '#2f81f7';
    ctx.fillRect(14, 26, s - 28, 6);
    ctx.fillStyle = '#9b8a62';
    ctx.fillRect(s / 2 - 1, 20, 2, s - 40);
  });
}

export function generateAll(scene) {
  for (const id of Object.keys(ZONES)) add(scene, `bg_${id}`, zoneBackground(ZONES[id]));
  add(scene, 'board_rawmill', rawmillBoard());
  add(scene, 'board_silos', silosBoard());
  add(scene, 'board_path', pathBoard());

  for (const [id, fn] of Object.entries(PPE_ICON)) add(scene, `ppe_${id}`, icon(64, fn));
  for (const [id, fn] of Object.entries(UI_ICON)) add(scene, `ui_${id}`, icon(32, fn));
  for (const k of ['talk', 'info', 'exit', 'lock']) add(scene, `mk_${k}`, marker(k));
  for (const hz of ['noise', 'dust', 'heat', 'truck', 'bang', 'fire', 'gas']) add(scene, `warn_${hz}`, icon(96, (ctx, s) => warnSign(ctx, s / 2, s / 2 + 4, s * 0.92, hz)));

  for (const [id, look] of Object.entries(NPC_LOOKS)) {
    add(scene, `npc_${id}`, characterCanvas(look));
    add(scene, `portrait_${id}`, portraitCanvas(look));
  }
  AVATARS.forEach((a, i) => add(scene, `avatar_${i}`, characterCanvas(playerLook(i, []), 2)));

  add(scene, 'disk_pulley', spinDisk(56, '#6b7580', 3));
  add(scene, 'disk_coupling', spinDisk(44, '#c0c6cc', 6));
  add(scene, 'disk_sprocket', spinDisk(40, '#8a8f94', 8));
  add(scene, 'disk_fan', spinDisk(36, '#9aa3ad', 3));
  add(scene, 'bag', bagTexture());
  add(scene, 'truck_dumper_r', truckSprite('dumper', 170, 84, 'right'));
  add(scene, 'truck_dumper_l', truckSprite('dumper', 170, 84, 'left'));
  add(scene, 'truck_flatbed_l', truckSprite('flatbed', 220, 90, 'left'));
  add(scene, 'truck_tanker_r', truckSprite('tanker', 220, 90, 'right'));
  add(scene, 'truck_flatbed_r', truckSprite('flatbed', 220, 90, 'right'));

  // conveyor belt stripes for TileSprite animation
  add(scene, 'belt', icon(32, (ctx, s) => {
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(0, 0, 6, s);
  }));
  // generic white pixel + soft circle
  add(scene, 'px', icon(4, (ctx) => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 4, 4);
  }));
  add(scene, 'glow', icon(64, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }));
  add(scene, 'dust', icon(16, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 1, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(220,215,200,0.7)');
    g.addColorStop(1, 'rgba(220,215,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }));
}

export { shade, cylH };
