// Procedural characters: player avatars (with visible PPE) and NPC managers.
//
// A character is drawn in a 48x84 box with the feet at (24, 82). `drawCharacter` takes an
// optional pose (facing direction, walk-cycle phase, breathing, blink, talk) so the same
// renderer produces still images, sprite-sheet animation frames and dialog portraits.
import { makeCanvas, shade, rr } from './draw.js';

export const CHAR_W = 48;
export const CHAR_H = 84;

// Sprite-sheet cells: the 48x84 box plus margins for swinging limbs, hair and bobbing.
export const CELL_W = 60;
export const CELL_H = 92;
const CELL_OX = (CELL_W - CHAR_W) / 2;
const CELL_OY = CELL_H - CHAR_H - 2;
const CELL_PAD = 2; // device pixels between cells, so linear filtering never bleeds

const TAU = Math.PI * 2;
const GLOVE = '#e2b93b';

// Player appearance variants.
export const AVATARS = [
  { skin: '#f1c7a5', hair: 'short', hairColor: '#3b2a20', shirt: '#2f5d8a', pants: '#2b3445' },
  { skin: '#d9a07a', hair: 'pony', hairColor: '#1f1a17', shirt: '#7a3e65', pants: '#2b3445' },
  { skin: '#a8714f', hair: 'short', hairColor: '#141010', beard: true, shirt: '#3e6b48', pants: '#33302b' },
  { skin: '#f4d2b8', hair: 'bob', hairColor: '#b5652b', shirt: '#8a5a2f', pants: '#2b3445' },
];

// NPC looks. Managers wear white helmets; HS manager a green one.
export const NPC_LOOKS = {
  hs: { skin: '#f0c9a8', hair: 'long', hairColor: '#4a2c1c', shirt: '#2d6a4f', pants: '#1f2a36', helmet: '#2fa35b', vest: 'orange', accessory: 'clipboard' },
  crushing: { skin: '#c98e68', hair: 'short', hairColor: '#2a2a2a', beard: true, shirt: '#5b4636', pants: '#2b3445', helmet: '#ffffff', vest: 'yellow', accessory: 'radio' },
  rawmill: { skin: '#e8b996', hair: 'short', hairColor: '#6b4a2b', shirt: '#2f4f6f', pants: '#2b3445', helmet: '#ffffff', vest: 'yellow', accessory: 'tablet' },
  kiln: { skin: '#b77a55', hair: 'bald', hairColor: '#111', beard: true, shirt: '#7a3b2e', pants: '#30302e', helmet: '#ffffff', vest: 'orange', accessory: null },
  ccr: { skin: '#f2cdb0', hair: 'bob', hairColor: '#20160f', shirt: '#2d3e75', pants: '#1f2a36', helmet: null, vest: null, accessory: 'tablet', headset: true, glasses: false, gloves: false, shoes: 'socks' },
  cementmill: { skin: '#d6a07e', hair: 'short', hairColor: '#8a8a8a', shirt: '#4f5d2f', pants: '#2b3445', helmet: '#ffffff', vest: 'yellow', accessory: 'clipboard' },
  silos: { skin: '#e0ab86', hair: 'short', hairColor: '#191919', shirt: '#3d3d55', pants: '#2b3445', helmet: '#ffffff', vest: 'orange', accessory: 'radio', harness: true },
  packing: { skin: '#f3cfb4', hair: 'pony', hairColor: '#7b4a22', shirt: '#6a2f3f', pants: '#2b3445', helmet: '#ffffff', vest: 'yellow', accessory: 'tablet' },
  logistics: { skin: '#c48a62', hair: 'short', hairColor: '#2e1f14', shirt: '#24506b', pants: '#33302b', helmet: '#ffffff', vest: 'orange', accessory: 'clipboard' },
  worker: { skin: '#d8a27d', hair: 'short', hairColor: '#222', shirt: '#3a4a5c', pants: '#2b3445', helmet: '#f2c200', vest: 'orange', accessory: null },
};

/** Convert a player's avatar + equipment list into a full look. */
export function playerLook(avatarIndex, items) {
  const a = AVATARS[avatarIndex % AVATARS.length];
  const set = new Set(items);
  return {
    ...a,
    helmet: set.has('helmet') ? '#f2c200' : null,
    cap: set.has('cap'),
    glasses: set.has('glasses'),
    earmuffs: set.has('earmuffs'),
    respirator: set.has('respirator'),
    vest: set.has('vest') ? 'yellow' : null,
    gloves: set.has('gloves'),
    shoes: set.has('boots') ? 'boots' : set.has('sneakers') ? 'sneakers' : set.has('sandals') ? 'sandals' : 'socks',
    scarf: set.has('scarf'),
  };
}

// ---------------------------------------------------------------------------- pose

/**
 * Expand a pose description into the numbers the painters use.
 *   dir:    'down' (facing the viewer) | 'up' (back to the viewer) | 'side' (facing right)
 *   walk:   walk-cycle phase 0..1, or null when standing
 *   breath: 0..1 (inhale amount), blink: bool, talk: 0 (closed) | 1 | 2 (open)
 * Limb index 0 is the screen-left limb in front/back views and the near limb in side view.
 * Phase 0.25 / 0.75 are the moments a foot lands.
 */
function resolvePose(p = {}) {
  const walking = p.walk != null;
  const a = (p.walk || 0) * TAU;
  const s = walking ? Math.sin(a) : 0;
  const c = walking ? Math.cos(a) : 0;
  // the knee bends most just after toe-off, a little before the legs pass each other
  const cl = walking ? Math.cos(a + 0.45) : 0;
  return {
    dir: p.dir || 'down',
    walking,
    a,
    legSwing: [s, -s],
    legLift: [Math.max(0, cl), Math.max(0, -cl)],
    armSwing: [-s, s],
    // highest while the legs pass each other, lowest when both feet are down
    up: walking ? 1.5 * c * c - 0.5 : 0,
    // weight shifts over the supporting leg
    sway: walking ? -c * 0.7 : 0,
    breath: p.breath || 0,
    blink: !!p.blink,
    talk: p.talk || 0,
  };
}

// ---------------------------------------------------------------------------- helpers

function limb(ctx, pts, width, color, outline) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = outline;
  ctx.lineWidth = width + 1.6;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function hand(ctx, L, x, y, r, dark = 0) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  const base = L.gloves ? GLOVE : L.skin;
  ctx.fillStyle = dark ? shade(base, -dark) : base;
  ctx.fill();
  ctx.strokeStyle = L.gloves ? '#9c7c1d' : shade(L.skin, -0.35);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  if (L.gloves) {
    // cuff
    ctx.fillStyle = shade(GLOVE, -0.18 - dark);
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.75, r * 0.95, r * 0.45, 0, 0, TAU);
    ctx.fill();
  }
}

function shadowAt(ctx, P, rx) {
  if (!P.shadow) return;
  ctx.save();
  ctx.translate(24, 81);
  ctx.scale(1, 4.5 / rx);
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, rx);
  g.addColorStop(0, 'rgba(0,0,0,0.36)');
  g.addColorStop(0.7, 'rgba(0,0,0,0.26)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function vestColor(L) {
  return L.vest === 'orange' ? '#ff7a1a' : '#d9f20d';
}

// ---------------------------------------------------------------------------- shoes

function shoeFront(ctx, L, x, y, k, dark) {
  const d = dark ? -0.2 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  if (L.shoes === 'boots') {
    ctx.fillStyle = shade('#3a2a1e', d);
    rr(ctx, -5.6, -9, 11.2, 9, 3);
    ctx.fill();
    ctx.fillStyle = shade('#5a4330', d);
    ctx.beginPath();
    ctx.ellipse(0, -3.4, 4.6, 2.6, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = shade('#8f969e', d);
    rr(ctx, -5.8, -2.4, 11.6, 2.6, 1.2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-2, -8);
    ctx.lineTo(2, -6.5);
    ctx.moveTo(2, -8);
    ctx.lineTo(-2, -6.5);
    ctx.stroke();
  } else if (L.shoes === 'sneakers') {
    ctx.fillStyle = shade('#f5f5f5', d);
    rr(ctx, -5.5, -6.6, 11, 6.6, 3);
    ctx.fill();
    ctx.fillStyle = shade('#e04848', d);
    ctx.fillRect(-3.5, -4.4, 7, 1.8);
    ctx.fillStyle = shade('#c9cdd2', d);
    rr(ctx, -5.6, -1.8, 11.2, 1.9, 1);
    ctx.fill();
  } else if (L.shoes === 'sandals') {
    ctx.fillStyle = shade(L.skin, d);
    rr(ctx, -4.5, -8, 9, 8, 3);
    ctx.fill();
    ctx.fillStyle = shade(L.skin, -0.25 + d);
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(i * 2.4, -1.4, 0.7, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = shade('#7a4a22', d);
    ctx.fillRect(-4.6, -6, 9.2, 1.8);
    ctx.fillRect(-5.4, -1.4, 10.8, 1.6);
  } else {
    ctx.fillStyle = shade('#bfc5cc', d);
    rr(ctx, -4.6, -7, 9.2, 7, 3);
    ctx.fill();
    ctx.fillStyle = shade('#a3aab2', d);
    ctx.fillRect(-4.6, -6.6, 9.2, 1.5);
  }
  ctx.restore();
}

/** Side-view shoe pointing right; (0,0) is the ankle, the sole sits 3.5 below it. */
function shoeSide(ctx, L, x, y, rot, dark) {
  const d = dark ? -0.22 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  if (L.shoes === 'boots') {
    ctx.fillStyle = shade('#3a2a1e', d);
    ctx.beginPath();
    ctx.moveTo(-3.8, -5.6);
    ctx.lineTo(2.6, -5.6);
    ctx.lineTo(3.2, -1.2);
    ctx.quadraticCurveTo(8.4, -0.8, 8.4, 2.2);
    ctx.lineTo(-4, 2.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade('#5a4330', d);
    ctx.beginPath();
    ctx.ellipse(5.6, 1, 2.8, 2, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = shade('#8f969e', d);
    rr(ctx, -4.3, 1.8, 13, 1.8, 0.8);
    ctx.fill();
  } else if (L.shoes === 'sneakers') {
    ctx.fillStyle = shade('#f5f5f5', d);
    ctx.beginPath();
    ctx.moveTo(-3.8, -2.8);
    ctx.lineTo(2, -2.8);
    ctx.quadraticCurveTo(8.2, -0.6, 8, 2.4);
    ctx.lineTo(-4, 2.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shade('#e04848', d);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-1.6, 1.2);
    ctx.lineTo(3.6, -1.2);
    ctx.stroke();
    ctx.fillStyle = shade('#c9cdd2', d);
    rr(ctx, -4.2, 2, 12.6, 1.5, 0.7);
    ctx.fill();
  } else if (L.shoes === 'sandals') {
    ctx.fillStyle = shade(L.skin, d);
    ctx.beginPath();
    ctx.moveTo(-3, -3);
    ctx.lineTo(1.5, -3);
    ctx.quadraticCurveTo(7.6, 0, 7.6, 2.6);
    ctx.lineTo(-3.4, 2.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade('#7a4a22', d);
    rr(ctx, -4, 2.3, 12.4, 1.4, 0.6);
    ctx.fill();
    ctx.fillRect(1.5, -1.4, 1.6, 3.8);
  } else {
    ctx.fillStyle = shade('#bfc5cc', d);
    ctx.beginPath();
    ctx.moveTo(-3.4, -4);
    ctx.lineTo(1.8, -4);
    ctx.quadraticCurveTo(7.6, -0.4, 7.6, 2.8);
    ctx.lineTo(-3.6, 2.8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------- torso (front/back)

function torsoPath(ctx, br) {
  const t = 33 - br;
  ctx.beginPath();
  ctx.moveTo(12.6, 37);
  ctx.quadraticCurveTo(12.8, t, 17.5, t);
  ctx.lineTo(30.5, t);
  ctx.quadraticCurveTo(35.2, t, 35.4, 37);
  ctx.quadraticCurveTo(34.6, 48, 33.8, 58.5);
  ctx.lineTo(14.2, 58.5);
  ctx.quadraticCurveTo(13.4, 48, 12.6, 37);
  ctx.closePath();
}

function drawTorsoFB(ctx, L, P, back) {
  const br = P.breath * 0.7;
  const g = ctx.createLinearGradient(12, 0, 36, 0);
  g.addColorStop(0, shade(L.shirt, back ? 0.02 : 0.14));
  g.addColorStop(0.45, L.shirt);
  g.addColorStop(1, shade(L.shirt, -0.24));
  torsoPath(ctx, br);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = shade(L.shirt, -0.42);
  ctx.lineWidth = 1;
  ctx.stroke();

  const line = shade(L.shirt, -0.22);
  ctx.strokeStyle = line;
  ctx.lineWidth = 0.8;
  if (!back) {
    // collar, placket, buttons, chest pocket
    ctx.fillStyle = shade(L.shirt, 0.12);
    ctx.beginPath();
    ctx.moveTo(19.5, 33 - br);
    ctx.lineTo(24, 37.5 - br);
    ctx.lineTo(21.5, 38.5 - br);
    ctx.closePath();
    ctx.moveTo(28.5, 33 - br);
    ctx.lineTo(24, 37.5 - br);
    ctx.lineTo(26.5, 38.5 - br);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(24, 37.5 - br);
    ctx.lineTo(24, 55);
    ctx.stroke();
    ctx.fillStyle = line;
    for (const by of [41, 46, 51]) {
      ctx.beginPath();
      ctx.arc(24.9, by, 0.55, 0, TAU);
      ctx.fill();
    }
    rr(ctx, 15.8, 40, 5.6, 5, 1);
    ctx.stroke();
  } else {
    // collar band, yoke seam, centre pleat
    ctx.fillStyle = shade(L.shirt, -0.1);
    rr(ctx, 18.5, 32.4 - br, 11, 2.6, 1.2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(13.6, 39.5);
    ctx.quadraticCurveTo(24, 41, 34.4, 39.5);
    ctx.moveTo(24, 41);
    ctx.lineTo(24, 44);
    ctx.stroke();
  }
  // belt
  ctx.fillStyle = '#2b2622';
  ctx.fillRect(14.1, 55.4, 19.8, 3.1);
  if (!back) {
    ctx.fillStyle = '#b9a46a';
    rr(ctx, 22.2, 55.3, 3.6, 3.2, 0.6);
    ctx.fill();
  }

  if (L.vest) {
    const vc = vestColor(L);
    ctx.fillStyle = vc;
    if (!back) {
      ctx.beginPath();
      ctx.moveTo(13.4, 36.5);
      ctx.quadraticCurveTo(14, 34 - br, 18.5, 34 - br);
      ctx.lineTo(21, 34 - br);
      ctx.lineTo(23, 57.5);
      ctx.lineTo(14, 57.5);
      ctx.closePath();
      ctx.moveTo(34.6, 36.5);
      ctx.quadraticCurveTo(34, 34 - br, 29.5, 34 - br);
      ctx.lineTo(27, 34 - br);
      ctx.lineTo(25, 57.5);
      ctx.lineTo(34, 57.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shade(vc, -0.3);
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.fillStyle = '#dfe6ee';
      ctx.fillRect(13.6, 46, 9, 2.6);
      ctx.fillRect(25.4, 46, 9, 2.6);
      ctx.fillRect(13.8, 52, 9.2, 2.2);
      ctx.fillRect(25, 52, 9.2, 2.2);
    } else {
      torsoPath(ctx, br);
      ctx.save();
      ctx.clip();
      ctx.fillRect(12, 34.2 - br, 24, 24);
      ctx.fillStyle = '#dfe6ee';
      ctx.fillRect(12, 46, 24, 2.6);
      ctx.fillRect(12, 52, 24, 2.2);
      ctx.fillRect(16.5, 34, 2.4, 12);
      ctx.fillRect(29.1, 34, 2.4, 12);
      ctx.restore();
    }
  }

  if (L.harness) {
    ctx.strokeStyle = '#d12f2f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (!back) {
      ctx.moveTo(16, 34);
      ctx.lineTo(21.5, 56);
      ctx.moveTo(32, 34);
      ctx.lineTo(26.5, 56);
      ctx.moveTo(15, 50);
      ctx.lineTo(33, 50);
    } else {
      ctx.moveTo(16, 34);
      ctx.lineTo(31, 55);
      ctx.moveTo(32, 34);
      ctx.lineTo(17, 55);
    }
    ctx.stroke();
    if (back) {
      ctx.strokeStyle = '#b8c0c8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(24, 42, 1.8, 0, TAU);
      ctx.stroke();
    }
  }

  if (L.scarf) {
    ctx.fillStyle = '#d43a3a';
    rr(ctx, 14.5, 31 - br, 19, 6, 3);
    ctx.fill();
    if (!back) {
      const sw = P.walking ? Math.sin(P.a * 2) * 0.12 : 0;
      ctx.save();
      ctx.translate(30, 34);
      ctx.rotate(sw);
      rr(ctx, -3, 0, 6, 16, 2);
      ctx.fill();
      ctx.fillStyle = '#f2f2f2';
      ctx.fillRect(-3, 6, 6, 2);
      ctx.fillRect(-3, 11, 6, 2);
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------------------- head (front/back)

function headBase(ctx, L, cx) {
  const skin = L.skin;
  // neck
  ctx.fillStyle = shade(skin, -0.14);
  ctx.fillRect(cx - 3.2, 27.5, 6.4, 7.5);
  // ears
  ctx.fillStyle = shade(skin, -0.04);
  ctx.beginPath();
  ctx.ellipse(cx - 10.3, 22, 2.2, 3, 0, 0, TAU);
  ctx.ellipse(cx + 10.3, 22, 2.2, 3, 0, 0, TAU);
  ctx.fill();
  // head with soft light from the upper left
  const g = ctx.createRadialGradient(cx - 3.5, 16, 1, cx, 21, 12.5);
  g.addColorStop(0, shade(skin, 0.14));
  g.addColorStop(0.6, skin);
  g.addColorStop(1, shade(skin, -0.16));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, 21, 10.3, 11.3, 0, 0, TAU);
  ctx.fill();
}

function drawFaceFront(ctx, L, P) {
  const skin = L.skin;
  // cheeks
  ctx.fillStyle = 'rgba(214,92,80,0.13)';
  ctx.beginPath();
  ctx.ellipse(18.4, 24.8, 2.1, 1.4, 0, 0, TAU);
  ctx.ellipse(29.6, 24.8, 2.1, 1.4, 0, 0, TAU);
  ctx.fill();
  // brows
  ctx.strokeStyle = shade(L.hairColor === '#111' ? '#2b2420' : L.hairColor, -0.1);
  ctx.lineWidth = 1.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(18, 18.7);
  ctx.quadraticCurveTo(19.9, 17.8, 21.7, 18.4);
  ctx.moveTo(26.3, 18.4);
  ctx.quadraticCurveTo(28.1, 17.8, 30, 18.7);
  ctx.stroke();
  // eyes
  if (P.blink) {
    ctx.strokeStyle = shade(skin, -0.5);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(18.4, 21.8);
    ctx.quadraticCurveTo(20, 22.5, 21.6, 21.8);
    ctx.moveTo(26.4, 21.8);
    ctx.quadraticCurveTo(28, 22.5, 29.6, 21.8);
    ctx.stroke();
  } else {
    for (const ex of [20, 28]) {
      ctx.fillStyle = '#f7f3ec';
      ctx.beginPath();
      ctx.ellipse(ex, 21.5, 1.85, 1.3, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#2a1d16';
      ctx.beginPath();
      ctx.arc(ex + 0.15, 21.6, 1.05, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(ex - 0.25, 21.2, 0.35, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = shade(skin, -0.45);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.ellipse(ex, 21.5, 1.85, 1.3, 0, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
    }
  }
  if (L.respirator) return;
  // nose
  ctx.strokeStyle = shade(skin, -0.28);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(24.4, 21.6);
  ctx.quadraticCurveTo(25.4, 24.2, 23.6, 24.4);
  ctx.stroke();
  // mouth
  if (P.talk) {
    ctx.fillStyle = '#5c2a2a';
    ctx.beginPath();
    ctx.ellipse(24, 26.8, 2, P.talk === 1 ? 0.9 : 1.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(22.6, 25.9, 2.8, 0.6);
  } else {
    ctx.strokeStyle = shade(skin, -0.45);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(24, 24.4, 2.6, 0.35, Math.PI - 0.35);
    ctx.stroke();
  }
}

function drawHairFront(ctx, L) {
  ctx.fillStyle = L.hairColor;
  if (L.hair === 'short') {
    ctx.beginPath();
    ctx.ellipse(24, 14, 10.6, 6.6, 0, Math.PI, 0);
    ctx.quadraticCurveTo(30, 12.6, 24, 13.4);
    ctx.quadraticCurveTo(18, 12.4, 13.4, 14);
    ctx.fill();
    ctx.fillRect(13.6, 13, 2.8, 6.5);
    ctx.fillRect(31.6, 13, 2.8, 6.5);
  } else if (L.hair === 'bob') {
    ctx.beginPath();
    ctx.ellipse(24, 15, 12, 8, 0, Math.PI, 0);
    ctx.fill();
    rr(ctx, 12, 13, 5, 17, 2.5);
    ctx.fill();
    rr(ctx, 31, 13, 5, 17, 2.5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(14, 14);
    ctx.quadraticCurveTo(20, 19, 27, 15.5);
    ctx.lineTo(34, 14);
    ctx.fill();
  } else if (L.hair === 'long' || L.hair === 'pony') {
    ctx.beginPath();
    ctx.ellipse(24, 15, 11.5, 7.5, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(12.5, 14, 4, 10);
    ctx.fillRect(31.5, 14, 4, 10);
    ctx.beginPath();
    ctx.moveTo(13, 14.5);
    ctx.quadraticCurveTo(22, 18.5, 24.5, 14);
    ctx.fill();
  }
  // a lighter sheen on top
  if (L.hair !== 'bald') {
    ctx.strokeStyle = 'rgba(255,255,255,0.13)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(22, 15, 7, Math.PI * 1.15, Math.PI * 1.55);
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.ellipse(20.5, 13.5, 3.5, 2, -0.4, 0, TAU);
    ctx.fill();
  }
  if (L.beard) {
    ctx.fillStyle = L.hairColor === '#111' ? '#2b2420' : L.hairColor;
    ctx.beginPath();
    ctx.moveTo(14.6, 22.5);
    ctx.quadraticCurveTo(15, 32.6, 24, 32.8);
    ctx.quadraticCurveTo(33, 32.6, 33.4, 22.5);
    ctx.lineTo(31.2, 23);
    ctx.quadraticCurveTo(30, 27.6, 27, 27.4);
    ctx.quadraticCurveTo(24, 26, 21, 27.4);
    ctx.quadraticCurveTo(18, 27.6, 16.8, 23);
    ctx.closePath();
    ctx.fill();
  }
}

function drawHairBack(ctx, L, P) {
  ctx.fillStyle = L.hairColor;
  if (L.hair === 'bald') {
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.ellipse(21, 14, 4, 2.4, -0.4, 0, TAU);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  if (L.hair === 'short') {
    ctx.ellipse(24, 19.5, 10.6, 10.2, 0, Math.PI * 0.92, Math.PI * 0.08);
    ctx.quadraticCurveTo(24, 31, 14, 23);
  } else if (L.hair === 'bob') {
    ctx.ellipse(24, 18, 12, 10, 0, Math.PI, 0);
    ctx.lineTo(36, 30);
    ctx.quadraticCurveTo(24, 32, 12, 30);
  } else {
    ctx.ellipse(24, 18.5, 11.5, 10, 0, Math.PI, 0);
    ctx.lineTo(35.5, 25);
    ctx.quadraticCurveTo(24, 30, 12.5, 25);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = shade(L.hairColor, 0.15);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(24, 10);
  ctx.lineTo(24, 16);
  ctx.moveTo(20, 11);
  ctx.quadraticCurveTo(19, 18, 20.5, 24);
  ctx.moveTo(28, 11);
  ctx.quadraticCurveTo(29, 18, 27.5, 24);
  ctx.stroke();
}

/** Hair that hangs behind the head/shoulders (drawn before the body in front view, after in back view). */
function drawLongHair(ctx, L, P, view) {
  ctx.fillStyle = L.hairColor;
  const sw = P.walking ? Math.sin(P.a - 0.9) : 0;
  if (L.hair === 'long') {
    ctx.beginPath();
    ctx.moveTo(12.5, 16);
    ctx.lineTo(11.6 + sw * 0.4, 39);
    ctx.quadraticCurveTo(24, 42, 36.4 + sw * 0.4, 39);
    ctx.lineTo(35.5, 16);
    ctx.closePath();
    ctx.fill();
  } else if (L.hair === 'pony') {
    if (view === 'down') {
      ctx.beginPath();
      ctx.ellipse(35 + sw * 0.8, 30, 3.8, 9, -0.3 + sw * 0.12, 0, TAU);
      ctx.fill();
    } else {
      ctx.save();
      ctx.translate(24, 24.5);
      ctx.rotate(sw * 0.18);
      ctx.beginPath();
      ctx.moveTo(-2.2, 0);
      ctx.quadraticCurveTo(-3.8, 8, -0.6, 16);
      ctx.quadraticCurveTo(0.6, 17, 1, 15.6);
      ctx.quadraticCurveTo(3.4, 8, 2.2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(L.hairColor, -0.35);
      rr(ctx, -2.4, -0.6, 4.8, 2.2, 1);
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawHeadwearFB(ctx, L, back) {
  if (L.glasses) {
    if (!back) {
      ctx.fillStyle = 'rgba(160,220,255,0.5)';
      ctx.strokeStyle = '#2d3a46';
      ctx.lineWidth = 1;
      rr(ctx, 16.5, 19, 7, 5, 2);
      ctx.fill();
      ctx.stroke();
      rr(ctx, 24.5, 19, 7, 5, 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(17.8, 20.2);
      ctx.lineTo(19.4, 20.2);
      ctx.moveTo(25.8, 20.2);
      ctx.lineTo(27.4, 20.2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#2d3a46';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(13.6, 20.5);
      ctx.lineTo(15.6, 21);
      ctx.moveTo(34.4, 20.5);
      ctx.lineTo(32.4, 21);
      ctx.stroke();
    }
  }

  if (L.respirator) {
    if (!back) {
      const g = ctx.createLinearGradient(18, 22, 30, 31);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#d6dce2');
      ctx.fillStyle = g;
      ctx.strokeStyle = '#9aa3ad';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(24, 27, 6.5, 4.6, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#b8c0c8';
      ctx.beginPath();
      ctx.arc(24, 28, 1.6, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#7d8790';
      ctx.beginPath();
      ctx.moveTo(17.5, 26);
      ctx.lineTo(13.5, 22);
      ctx.moveTo(30.5, 26);
      ctx.lineTo(34.5, 22);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#7d8790';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(13.8, 21);
      ctx.quadraticCurveTo(24, 17, 34.2, 21);
      ctx.moveTo(14.4, 26);
      ctx.quadraticCurveTo(24, 24, 33.6, 26);
      ctx.stroke();
    }
  }

  if (L.headset) {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(24, 19, 11.5, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.fillStyle = '#222';
    rr(ctx, 11, 18, 4, 7, 2);
    ctx.fill();
    if (!back) {
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(13, 24);
      ctx.quadraticCurveTo(14, 29, 20, 28);
      ctx.stroke();
    } else {
      rr(ctx, 33, 18, 4, 7, 2);
      ctx.fill();
    }
  }

  if (L.helmet) {
    const hc = L.helmet;
    const g = ctx.createLinearGradient(12, 5, 36, 16);
    g.addColorStop(0, shade(hc, 0.25));
    g.addColorStop(0.5, hc);
    g.addColorStop(1, shade(hc, -0.18));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(24, 15, 12, 10, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = shade(hc, -0.35);
    ctx.lineWidth = 1;
    ctx.stroke();
    rr(ctx, back ? 11.5 : 10, 13.5, back ? 25 : 28, 4, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = shade(hc, -0.12);
    ctx.fillRect(22.5, 5.5, 3, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(18.5, 9.5, 3, 1.4, -0.5, 0, TAU);
    ctx.fill();
  } else if (L.cap) {
    ctx.fillStyle = '#2860c4';
    ctx.beginPath();
    ctx.ellipse(24, 15, 11, 8, 0, Math.PI, 0);
    ctx.fill();
    if (!back) {
      ctx.fillStyle = '#1d4a99';
      rr(ctx, 16, 13.5, 22, 4, 2);
      ctx.fill();
    } else {
      ctx.fillStyle = shade(L.hairColor, -0.1);
      rr(ctx, 21.5, 12.8, 5, 2.4, 1);
      ctx.fill();
      ctx.fillStyle = '#1d4a99';
      ctx.fillRect(21, 14.4, 6, 1.1);
    }
  }

  if (L.earmuffs) {
    ctx.strokeStyle = '#d63b2f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(24, 21, 12.5, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    ctx.fillStyle = '#d63b2f';
    rr(ctx, 9.5, 17, 6, 10, 3);
    ctx.fill();
    rr(ctx, 32.5, 17, 6, 10, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(back ? 34.5 : 9.5, 21, 4, 1.4);
    ctx.fillRect(back ? 9.5 : 34.5, 21, 4, 1.4);
  }
}

function drawAccessoryFront(ctx, L, hx, hy) {
  if (!L.accessory) return;
  ctx.save();
  ctx.translate(hx - 38.5, hy - 57);
  if (L.accessory === 'clipboard') {
    ctx.fillStyle = '#8b5a2b';
    rr(ctx, 36, 44, 10, 14, 1);
    ctx.fill();
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(37.5, 46.5, 7, 10);
    ctx.fillStyle = '#9aa3ad';
    ctx.fillRect(39, 43.2, 4, 2);
    ctx.fillStyle = '#b6bec6';
    for (let i = 0; i < 4; i++) ctx.fillRect(38.5, 48.5 + i * 2, 5, 0.7);
  } else if (L.accessory === 'tablet') {
    ctx.fillStyle = '#1e1e1e';
    rr(ctx, 35, 45, 11, 14, 2);
    ctx.fill();
    ctx.fillStyle = '#5fb3ff';
    ctx.fillRect(36.5, 46.5, 8, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(36.5, 46.5, 8, 3);
  } else if (L.accessory === 'radio') {
    ctx.fillStyle = '#222';
    rr(ctx, 37, 47, 6, 11, 1);
    ctx.fill();
    ctx.fillRect(39, 42, 1.5, 6);
    ctx.fillStyle = '#e04848';
    ctx.fillRect(38.2, 48.2, 1.4, 1.2);
  }
  // fingers over the item
  ctx.restore();
  ctx.fillStyle = L.gloves ? GLOVE : L.skin;
  ctx.beginPath();
  ctx.arc(hx - 1.2, hy - 0.4, 2.2, 0, TAU);
  ctx.fill();
}

// ---------------------------------------------------------------------------- front / back view

function drawFrontBack(ctx, L, P, back) {
  const up = P.up;
  const br = P.breath;
  const pants = L.pants;

  shadowAt(ctx, P, 16);

  // long hair hangs behind the body in front view
  if (!back) drawLongHair(ctx, L, P, 'down');

  // legs: draw the one further from the camera first
  const legs = [0, 1]
    .map((i) => {
      const hx = i ? 28.3 : 19.7;
      const fwd = P.legSwing[i];
      const lift = P.legLift[i];
      return {
        i,
        hx,
        lift,
        fx: hx + (i ? 0.4 : -0.4),
        fy: 82 + (back ? -1 : 1) * fwd * 2.4 - lift * 3.4,
        depth: back ? -fwd : fwd,
      };
    })
    .sort((a, b) => a.depth - b.depth);
  for (const lg of legs) {
    const far = lg.depth < -0.25;
    const col = far ? shade(pants, -0.18) : pants;
    const hipY = 55 - up;
    const kneeY = (hipY + lg.fy - 6) / 2 + lg.lift * 0.8;
    limb(ctx, [[lg.hx, hipY], [lg.hx + (lg.i ? 0.3 : -0.3), kneeY], [lg.fx, lg.fy - 6]], 7.6, col, shade(pants, -0.45));
    // knee crease while the leg is lifted
    if (lg.lift > 0.3) {
      ctx.strokeStyle = shade(pants, -0.35);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(lg.hx - 2.2, kneeY);
      ctx.lineTo(lg.hx + 2.2, kneeY);
      ctx.stroke();
    }
    shoeFront(ctx, L, lg.fx, lg.fy, 1 + (back ? -1 : 1) * P.legSwing[lg.i] * 0.05, far);
  }

  // arms
  const shoulderY = 37.5 - up - br * 0.7;
  const arms = [0, 1].map((i) => {
    const s = P.armSwing[i];
    const side = i ? 1 : -1;
    const sx = 24 + side * 10.6 + P.sway * 0.6;
    const hx = 24 + side * (14.1 - (back ? 0 : Math.max(0, s) * 1.4)) + P.sway * 0.6;
    const hy = 57.6 - up - br * 0.3 + (back ? -1 : 1) * s * 2.6;
    const ex = sx + side * 1.6;
    const ey = (shoulderY + hy) / 2;
    return { i, s, sx, hx, hy, ex, ey, depth: back ? -s : s };
  });
  const drawArm = (a) => {
    const far = a.depth < -0.25;
    const col = far ? shade(L.shirt, -0.2) : L.shirt;
    limb(ctx, [[a.sx, shoulderY], [a.ex, a.ey], [a.hx, a.hy - 2.6]], 6.2, col, shade(L.shirt, -0.45));
    hand(ctx, L, a.hx, a.hy, 3.4 * (1 + (back ? -1 : 1) * a.s * 0.06), far ? 0.15 : 0);
  };
  // arms hang behind the torso edge so the shoulder joint is always covered by the shirt;
  // an arm swinging towards the camera then gets its hand drawn again in front
  for (const a of arms) drawArm(a);

  // torso
  ctx.save();
  ctx.translate(P.sway * 0.6, -up);
  drawTorsoFB(ctx, L, P, back);
  ctx.restore();

  for (const a of arms) if (a.depth > 0.15) hand(ctx, L, a.hx, a.hy, 3.4 * (1 + (back ? -1 : 1) * a.s * 0.06));

  // head
  ctx.save();
  ctx.translate(P.sway * 0.8, -up - br * 0.45);
  headBase(ctx, L, 24);
  if (back) {
    drawHairBack(ctx, L, P);
  } else {
    drawHairFront(ctx, L);
    drawFaceFront(ctx, L, P);
  }
  drawHeadwearFB(ctx, L, back);
  ctx.restore();

  if (back) {
    ctx.save();
    ctx.translate(P.sway * 0.8, -up - br * 0.45);
    drawLongHair(ctx, L, P, 'up');
    ctx.restore();
  }

  // item in the hand on the right of the screen
  const ha = arms[1];
  if (!back) drawAccessoryFront(ctx, L, ha.hx, ha.hy);
}

// ---------------------------------------------------------------------------- side view (facing right)

function sideLeg(P, i) {
  const sw = P.walking ? P.legSwing[i] : i ? -0.1 : 0.12;
  const lift = P.legLift[i];
  const th = sw * 0.44;
  const kf = 0.07 + lift * 0.85;
  const sh = th - kf;
  const kx = Math.sin(th) * 11.5;
  const ky = Math.cos(th) * 11.5;
  const ax = kx + Math.sin(sh) * 11.5;
  const ay = ky + Math.cos(sh) * 11.5;
  const rot = (th > 0 ? -0.35 : -0.6) * th + lift * 0.3;
  return { kx, ky, ax, ay, rot, lift };
}

function sideArm(P, i, sx, sy) {
  const s = P.walking ? P.armSwing[i] : i ? -0.04 : 0.04;
  // arms swing further forward than back, so the upper arm stays within the body's outline
  const al = s > 0 ? s * 0.5 : s * 0.34;
  const flex = 0.12 + Math.max(0, s) * 0.42 + (P.walking ? 0.1 : 0);
  const be = al + flex;
  const ex = sx + Math.sin(al) * 10;
  const ey = sy + Math.cos(al) * 10;
  return { ex, ey, hx: ex + Math.sin(be) * 9.2, hy: ey + Math.cos(be) * 9.2, be };
}

function drawTorsoSide(ctx, L, P) {
  const br = P.breath * 0.7;
  ctx.beginPath();
  ctx.moveTo(18.8, 35 - br);
  ctx.quadraticCurveTo(23.5, 32.4 - br, 28.6, 33.6 - br);
  ctx.quadraticCurveTo(31.4, 35, 31.2 + br * 0.4, 41);
  ctx.quadraticCurveTo(30.8, 50, 30.4, 58.5);
  ctx.lineTo(18.2, 58.5);
  ctx.quadraticCurveTo(17.2, 46, 17.8, 39);
  ctx.quadraticCurveTo(18, 36, 18.8, 35 - br);
  ctx.closePath();
  const g = ctx.createLinearGradient(17, 0, 32, 0);
  g.addColorStop(0, shade(L.shirt, -0.12));
  g.addColorStop(0.5, shade(L.shirt, 0.06));
  g.addColorStop(1, shade(L.shirt, -0.16));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = shade(L.shirt, -0.42);
  ctx.lineWidth = 1;
  ctx.stroke();
  // side seam + belt
  ctx.strokeStyle = shade(L.shirt, -0.24);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(24.2, 38);
  ctx.lineTo(24.4, 55);
  ctx.stroke();
  ctx.fillStyle = '#2b2622';
  ctx.fillRect(18, 55.4, 12.6, 3.1);
  ctx.fillStyle = '#4a423c';
  ctx.fillRect(21.5, 55.2, 1.3, 3.5);

  if (L.vest) {
    const vc = vestColor(L);
    ctx.fillStyle = vc;
    ctx.beginPath();
    ctx.moveTo(19.2, 35.6 - br);
    ctx.quadraticCurveTo(23.5, 33.6 - br, 27.2, 34.4 - br);
    ctx.lineTo(29.6, 41);
    ctx.lineTo(29.6, 57.6);
    ctx.lineTo(18.6, 57.6);
    ctx.quadraticCurveTo(17.8, 46, 18.4, 39);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shade(vc, -0.3);
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = '#dfe6ee';
    ctx.fillRect(18.2, 46, 11.4, 2.6);
    ctx.fillRect(18.4, 52, 11.2, 2.2);
  }
  if (L.harness) {
    ctx.strokeStyle = '#d12f2f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(22, 33.8);
    ctx.lineTo(28.4, 50);
    ctx.lineTo(19, 50.6);
    ctx.moveTo(22, 33.8);
    ctx.lineTo(19.4, 41);
    ctx.stroke();
    ctx.strokeStyle = '#b8c0c8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(19.4, 40.5, 1.6, 0, TAU);
    ctx.stroke();
  }
}

function drawHeadSide(ctx, L, P) {
  const skin = L.skin;
  const sw = P.walking ? Math.sin(P.a - 0.9) : 0;
  // neck
  ctx.fillStyle = shade(skin, -0.14);
  rr(ctx, 21.5, 27, 6.2, 8, 2);
  ctx.fill();

  // hair hanging behind
  ctx.fillStyle = L.hairColor;
  if (L.hair === 'long') {
    ctx.beginPath();
    ctx.moveTo(22, 13);
    ctx.quadraticCurveTo(13.5, 14, 13.8 - sw * 0.6, 40);
    ctx.quadraticCurveTo(18, 41.5, 22.4, 40);
    ctx.lineTo(22.4, 24);
    ctx.closePath();
    ctx.fill();
  } else if (L.hair === 'pony') {
    ctx.save();
    ctx.translate(15.8, 19);
    ctx.rotate(0.35 + sw * 0.22 + (P.walking ? 0.2 : 0));
    ctx.beginPath();
    ctx.moveTo(-1.8, 0);
    ctx.quadraticCurveTo(-4.2, 8, -1.2, 15);
    ctx.quadraticCurveTo(0, 16.2, 0.8, 14.6);
    ctx.quadraticCurveTo(2.6, 8, 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // head
  const g = ctx.createRadialGradient(28, 16, 1, 25, 21, 12.5);
  g.addColorStop(0, shade(skin, 0.14));
  g.addColorStop(0.6, skin);
  g.addColorStop(1, shade(skin, -0.16));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(25, 21, 9.6, 11.2, 0, 0, TAU);
  ctx.fill();
  // jaw and chin
  ctx.beginPath();
  ctx.ellipse(29.6, 27, 4.4, 4, 0.2, 0, TAU);
  ctx.fill();
  // nose
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(33.6, 19);
  ctx.quadraticCurveTo(36.8, 23.4, 34, 24.4);
  ctx.lineTo(33, 24);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = shade(skin, -0.3);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(34.6, 20);
  ctx.quadraticCurveTo(36.6, 23.4, 34, 24.4);
  ctx.stroke();
  // ear
  ctx.fillStyle = shade(skin, -0.05);
  ctx.beginPath();
  ctx.ellipse(23, 22, 2.2, 3, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = shade(skin, -0.3);
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(23.2, 22, 1.2, -1.2, 1.4);
  ctx.stroke();
  // cheek
  ctx.fillStyle = 'rgba(214,92,80,0.13)';
  ctx.beginPath();
  ctx.ellipse(30, 24.6, 2, 1.3, 0, 0, TAU);
  ctx.fill();
  // brow
  ctx.strokeStyle = shade(L.hairColor === '#111' ? '#2b2420' : L.hairColor, -0.1);
  ctx.lineWidth = 1.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(29.6, 18.4);
  ctx.quadraticCurveTo(31.4, 17.6, 33, 18.2);
  ctx.stroke();
  // eye
  if (P.blink) {
    ctx.strokeStyle = shade(skin, -0.5);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(30, 21.2);
    ctx.quadraticCurveTo(31.2, 21.8, 32.4, 21.2);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#f7f3ec';
    ctx.beginPath();
    ctx.ellipse(31.4, 21, 1.1, 1.3, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2a1d16';
    ctx.beginPath();
    ctx.ellipse(31.9, 21.1, 0.75, 1.05, 0, 0, TAU);
    ctx.fill();
  }
  // mouth
  if (!L.respirator) {
    if (P.talk) {
      ctx.fillStyle = '#5c2a2a';
      ctx.beginPath();
      ctx.ellipse(32.6, 27, 1.2, P.talk === 1 ? 0.7 : 1.1, 0, 0, TAU);
      ctx.fill();
    } else {
      ctx.strokeStyle = shade(skin, -0.45);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(31.2, 26.8);
      ctx.quadraticCurveTo(32.4, 27.2, 33.4, 26.4);
      ctx.stroke();
    }
  }

  // hair
  ctx.fillStyle = L.hairColor;
  if (L.hair === 'short' || L.hair === 'pony' || L.hair === 'long') {
    ctx.beginPath();
    ctx.moveTo(34.6, 15);
    ctx.quadraticCurveTo(33, 9, 25, 9.6);
    ctx.quadraticCurveTo(15.2, 10, 15.2, 19.5);
    ctx.lineTo(15.8, L.hair === 'short' ? 25.5 : 27);
    ctx.quadraticCurveTo(18.4, 27.6, 20.6, 25.6);
    ctx.lineTo(21, 18.4);
    ctx.quadraticCurveTo(27, 15.2, 34.6, 15);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(21.2, 17.4, 1.6, 6);
  } else if (L.hair === 'bob') {
    ctx.beginPath();
    ctx.moveTo(35.2, 15.8);
    ctx.quadraticCurveTo(33.4, 8.6, 25, 9.2);
    ctx.quadraticCurveTo(14.2, 9.6, 14, 20);
    ctx.lineTo(14.4, 30.2);
    ctx.quadraticCurveTo(19, 31.6, 22.6, 29.6);
    ctx.lineTo(22, 18.2);
    ctx.quadraticCurveTo(28, 14.6, 35.2, 15.8);
    ctx.closePath();
    ctx.fill();
  } else if (L.hair === 'bald') {
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.ellipse(27, 13.5, 3.5, 2, 0.3, 0, TAU);
    ctx.fill();
  }
  if (L.hair !== 'bald') {
    ctx.strokeStyle = 'rgba(255,255,255,0.13)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(25, 17, 7, Math.PI * 1.2, Math.PI * 1.6);
    ctx.stroke();
  }
  if (L.hair === 'pony') {
    ctx.fillStyle = shade(L.hairColor, -0.35);
    ctx.beginPath();
    ctx.arc(15.6, 19.2, 1.7, 0, TAU);
    ctx.fill();
  }
  if (L.beard) {
    ctx.fillStyle = L.hairColor === '#111' ? '#2b2420' : L.hairColor;
    ctx.beginPath();
    ctx.moveTo(22.6, 23.6);
    ctx.quadraticCurveTo(23.4, 31.6, 29.8, 31.4);
    ctx.quadraticCurveTo(33.8, 31, 34.2, 27.6);
    ctx.lineTo(33.4, 27.4);
    ctx.quadraticCurveTo(31, 28.6, 28.4, 27.2);
    ctx.quadraticCurveTo(25.4, 26.2, 24.6, 22.6);
    ctx.closePath();
    ctx.fill();
    rr(ctx, 31, 25.2, 3.4, 1.2, 0.6);
    ctx.fill();
  }

  // equipment
  if (L.glasses) {
    ctx.strokeStyle = '#2d3a46';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 20.3);
    ctx.lineTo(23.4, 20.8);
    ctx.stroke();
    ctx.fillStyle = 'rgba(160,220,255,0.5)';
    rr(ctx, 29.6, 18.9, 4.8, 4.4, 1.4);
    ctx.fill();
    ctx.stroke();
  }
  if (L.respirator) {
    ctx.strokeStyle = '#7d8790';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(29.4, 24);
    ctx.lineTo(17, 18.6);
    ctx.moveTo(29.6, 28.6);
    ctx.lineTo(18.4, 26.8);
    ctx.stroke();
    const rg = ctx.createLinearGradient(29, 22, 36, 31);
    rg.addColorStop(0, '#ffffff');
    rg.addColorStop(1, '#d6dce2');
    ctx.fillStyle = rg;
    ctx.strokeStyle = '#9aa3ad';
    ctx.beginPath();
    ctx.ellipse(33, 26.4, 3.8, 4.6, 0.15, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#b8c0c8';
    ctx.beginPath();
    ctx.arc(35.2, 27.4, 1.5, 0, TAU);
    ctx.fill();
  }
  if (L.headset) {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(23.2, 17.5);
    ctx.quadraticCurveTo(22.6, 9.6, 26, 9.6);
    ctx.stroke();
    ctx.fillStyle = '#222';
    rr(ctx, 20.4, 18, 5.4, 8, 2.4);
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(24, 24.6);
    ctx.quadraticCurveTo(26.4, 29.2, 31.6, 28.2);
    ctx.stroke();
  }
  if (L.helmet) {
    const hc = L.helmet;
    const hg = ctx.createLinearGradient(14, 4, 36, 16);
    hg.addColorStop(0, shade(hc, 0.25));
    hg.addColorStop(0.5, hc);
    hg.addColorStop(1, shade(hc, -0.18));
    ctx.fillStyle = hg;
    ctx.strokeStyle = shade(hc, -0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(13.6, 15.6);
    ctx.quadraticCurveTo(13.8, 4.6, 25, 4.6);
    ctx.quadraticCurveTo(35.8, 4.8, 36, 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // brim with a peak at the front
    ctx.beginPath();
    ctx.moveTo(12.6, 15);
    ctx.lineTo(36, 14.2);
    ctx.quadraticCurveTo(40.8, 14.6, 40.2, 16.8);
    ctx.lineTo(12.8, 17.6);
    ctx.quadraticCurveTo(11.6, 16.4, 12.6, 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = shade(hc, -0.12);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(17, 7.6);
    ctx.quadraticCurveTo(25, 3.4, 32.6, 6.8);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(28.5, 8.6, 3, 1.3, 0.35, 0, TAU);
    ctx.fill();
  } else if (L.cap) {
    ctx.fillStyle = '#2860c4';
    ctx.beginPath();
    ctx.moveTo(15.2, 15.8);
    ctx.quadraticCurveTo(15.4, 7, 25, 7.2);
    ctx.quadraticCurveTo(33.6, 7.6, 34, 15.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1d4a99';
    ctx.beginPath();
    ctx.moveTo(32.8, 13.6);
    ctx.lineTo(40.6, 15);
    ctx.quadraticCurveTo(41.2, 16.4, 39.6, 16.6);
    ctx.lineTo(32.6, 16.2);
    ctx.closePath();
    ctx.fill();
  }
  if (L.earmuffs) {
    ctx.strokeStyle = '#d63b2f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(23, 16.5);
    ctx.quadraticCurveTo(22.4, 8.2, 24.8, 7.6);
    ctx.stroke();
    ctx.fillStyle = '#d63b2f';
    rr(ctx, 19.3, 16, 7.4, 11, 3.4);
    ctx.fill();
    ctx.fillStyle = shade('#d63b2f', -0.25);
    rr(ctx, 21, 18, 4, 7, 2);
    ctx.fill();
  }
}

function drawAccessorySide(ctx, L, a) {
  if (!L.accessory) return;
  ctx.save();
  ctx.translate(a.hx, a.hy);
  ctx.rotate(-a.be * 0.6);
  if (L.accessory === 'clipboard') {
    ctx.fillStyle = '#8b5a2b';
    rr(ctx, -1, -11, 3.2, 14, 0.8);
    ctx.fill();
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(1.6, -10, 0.9, 12);
  } else if (L.accessory === 'tablet') {
    ctx.fillStyle = '#1e1e1e';
    rr(ctx, -0.6, -11, 2.6, 14, 0.8);
    ctx.fill();
  } else if (L.accessory === 'radio') {
    ctx.fillStyle = '#222';
    rr(ctx, -2.4, -7, 5, 9, 1);
    ctx.fill();
    ctx.fillRect(1, -12, 1.4, 6);
  }
  ctx.restore();
  hand(ctx, L, a.hx, a.hy, 3.2);
}

function drawSide(ctx, L, P) {
  const br = P.breath;
  const pants = L.pants;
  const legs = [sideLeg(P, 0), sideLeg(P, 1)];
  // the hip sits so that the lower foot touches the ground: this gives the natural walking bob
  const hipY = 78.5 - Math.max(legs[0].ay, legs[1].ay);
  const hipX = 24;
  const dy = hipY - 55.5; // body drop relative to the standing pose
  const lean = P.walking ? 0.05 : 0;

  shadowAt(ctx, P, 14);

  const shoulderY = 37.4 - br * 0.7;
  const arms = [sideArm(P, 0, 24.6, shoulderY), sideArm(P, 1, 23.8, shoulderY)];

  const body = (fn) => {
    ctx.save();
    ctx.translate(0, dy);
    ctx.translate(hipX, 57);
    ctx.rotate(lean);
    ctx.translate(-hipX, -57);
    fn();
    ctx.restore();
  };
  const drawLeg = (lg, far) => {
    const col = far ? shade(pants, -0.22) : pants;
    const kx = hipX + lg.kx;
    const ky = hipY + lg.ky;
    const ax = hipX + lg.ax;
    const ay = hipY + lg.ay;
    limb(ctx, [[hipX + (far ? -0.6 : 0.6), hipY - 1], [kx, ky], [ax, ay - 1]], far ? 7.6 : 8, col, shade(pants, -0.45));
    shoeSide(ctx, L, ax, ay, lg.rot, far);
  };
  const drawSideArm = (a, sx, far) => {
    const col = far ? shade(L.shirt, -0.22) : L.shirt;
    // start the sleeve a little below the shoulder top so its rounded end stays inside the torso
    limb(ctx, [[sx, shoulderY + 1.6], [a.ex, a.ey], [a.hx, a.hy]], 6, col, shade(L.shirt, -0.45));
    hand(ctx, L, a.hx, a.hy, 3.2, far ? 0.18 : 0);
    if (!far) {
      // shoulder cap: a soft, un-outlined round that blends the sleeve into the torso
      const al = Math.atan2(a.ex - sx, a.ey - shoulderY);
      const g = ctx.createLinearGradient(sx - 4, 0, sx + 4, 0);
      g.addColorStop(0, shade(L.shirt, -0.06));
      g.addColorStop(1, shade(L.shirt, 0.06));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(sx + Math.sin(al) * 1.4, shoulderY + 2.2, 3.4, 4.2, -al * 0.8, 0, TAU);
      ctx.fill();
    }
  };

  body(() => drawSideArm(arms[1], 23.8, true));
  drawLeg(legs[1], true);
  body(() => drawTorsoSide(ctx, L, P));
  drawLeg(legs[0], false);
  body(() => {
    ctx.save();
    ctx.translate(0, -br * 0.45);
    drawHeadSide(ctx, L, P);
    ctx.restore();
    if (L.scarf) {
      ctx.fillStyle = '#d43a3a';
      rr(ctx, 19.6, 30.4 - br * 0.7, 10.6, 5.6, 2.6);
      ctx.fill();
      // the loose end trails behind while walking: exactly the snag hazard
      const sw = P.walking ? 0.55 + Math.sin(P.a * 2) * 0.15 : 0.05;
      ctx.save();
      ctx.translate(28.4, 33.6);
      ctx.rotate(sw);
      rr(ctx, -2.6, 0, 5.2, 15, 2);
      ctx.fill();
      ctx.fillStyle = '#f2f2f2';
      ctx.fillRect(-2.6, 6, 5.2, 1.8);
      ctx.fillRect(-2.6, 10.5, 5.2, 1.8);
      ctx.restore();
    }
    drawSideArm(arms[0], 24.6, false);
    drawAccessorySide(ctx, L, arms[0]);
  });
}

// ---------------------------------------------------------------------------- public API

/** Draw a character with feet at (24, 82) in a 48x84 box (before scaling). */
export function drawCharacter(ctx, look, opts = {}) {
  const L = { shoes: 'boots', gloves: true, glasses: true, ...look };
  const P = resolvePose(opts.pose);
  P.shadow = opts.shadow !== false;
  ctx.save();
  if (P.dir === 'side') drawSide(ctx, L, P);
  else drawFrontBack(ctx, L, P, P.dir === 'up');
  ctx.restore();
}

export function characterCanvas(look, scale = 1, opts) {
  const c = makeCanvas(CHAR_W * scale, CHAR_H * scale);
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  drawCharacter(ctx, look, opts);
  return c;
}

// ---------------------------------------------------------------------------- sprite sheets

export const WALK_FRAMES = 8;
export const IDLE_FRAMES = 4;
export const TALK_FRAMES = 2;

// Which frames a sheet contains. Walkers move around; NPCs stand, turn and talk; poses are
// for menus and previews.
export const SHEET_PRESETS = {
  walker: { dirs: ['down', 'up', 'side'], walk: true, talk: false },
  npc: { dirs: ['down', 'side'], walk: false, talk: true },
  pose: { dirs: ['down'], walk: false, talk: false },
};

function frameList(preset) {
  const list = [];
  for (const dir of preset.dirs) {
    if (preset.walk) for (let i = 0; i < WALK_FRAMES; i++) list.push({ name: `${dir}_walk_${i}`, pose: { dir, walk: i / WALK_FRAMES } });
    for (let i = 0; i < IDLE_FRAMES; i++) list.push({ name: `${dir}_idle_${i}`, pose: { dir, breath: i / (IDLE_FRAMES - 1) } });
    if (dir !== 'up') list.push({ name: `${dir}_blink`, pose: { dir, blink: true } });
    if (preset.talk && dir !== 'up') for (let i = 0; i < TALK_FRAMES; i++) list.push({ name: `${dir}_talk_${i}`, pose: { dir, breath: 0.4, talk: i + 1 } });
  }
  return list;
}

/** Render every animation frame of a look into one canvas. Returns { canvas, frames }. */
export function characterSheet(look, presetName = 'walker', res = 2) {
  const list = frameList(SHEET_PRESETS[presetName] || SHEET_PRESETS.walker);
  const cw = Math.ceil(CELL_W * res);
  const ch = Math.ceil(CELL_H * res);
  const cols = Math.min(8, list.length);
  const rows = Math.ceil(list.length / cols);
  const canvas = makeCanvas(cols * (cw + CELL_PAD), rows * (ch + CELL_PAD));
  const ctx = canvas.getContext('2d');
  const frames = list.map((f, i) => {
    const x = (i % cols) * (cw + CELL_PAD);
    const y = Math.floor(i / cols) * (ch + CELL_PAD);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cw, ch);
    ctx.clip();
    ctx.translate(x, y);
    ctx.scale(res, res);
    ctx.translate(CELL_OX, CELL_OY);
    drawCharacter(ctx, look, { pose: f.pose });
    ctx.restore();
    return { name: f.name, x, y, w: cw, h: ch };
  });
  return { canvas, frames };
}

// ---------------------------------------------------------------------------- portraits

export const PORTRAIT_FRAMES = ['idle', 'blink', 'talk_0', 'talk_1'];

function paintPortrait(ctx, look, size, bg, pose) {
  rr(ctx, 0, 0, size, size, size * 0.11);
  ctx.save();
  ctx.clip();
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, shade(bg, 0.2));
  g.addColorStop(1, shade(bg, -0.25));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const s = size / 36;
  ctx.translate(size / 2 - 24 * s, size * 0.47 - 21 * s);
  ctx.scale(s, s);
  drawCharacter(ctx, { ...look, accessory: null }, { shadow: false, pose });
  ctx.restore();
}

/** Dialog portrait: head and shoulders on a rounded tile. */
export function portraitCanvas(look, size = 128, bg = '#2b3a4e') {
  const c = makeCanvas(size, size);
  paintPortrait(c.getContext('2d'), look, size, bg, {});
  return c;
}

/** Portrait strip with idle / blink / talking frames (each `size` x `size`). */
export function portraitSheet(look, size = 128, bg = '#2b3a4e') {
  const poses = { idle: {}, blink: { blink: true }, talk_0: { talk: 1 }, talk_1: { talk: 2 } };
  const canvas = makeCanvas(PORTRAIT_FRAMES.length * (size + CELL_PAD), size);
  const ctx = canvas.getContext('2d');
  const frames = PORTRAIT_FRAMES.map((name, i) => {
    const x = i * (size + CELL_PAD);
    ctx.save();
    ctx.translate(x, 0);
    paintPortrait(ctx, look, size, bg, poses[name]);
    ctx.restore();
    return { name, x, y: 0, w: size, h: size };
  });
  return { canvas, frames };
}
