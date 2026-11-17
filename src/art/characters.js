// Procedural characters: player avatars (with visible PPE) and NPC managers.
import { makeCanvas, shade, rr } from './draw.js';

export const CHAR_W = 48;
export const CHAR_H = 84;

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

/** Draw a front-facing character with feet at (24, 82) in a 48x84 box (before scaling). */
export function drawCharacter(ctx, look, opts = {}) {
  const L = { shoes: 'boots', gloves: true, glasses: true, ...look };
  const skin = L.skin;
  ctx.save();
  if (opts.shadow !== false) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(24, 81, 15, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // back hair (long styles)
  if (L.hair === 'long' || L.hair === 'pony') {
    ctx.fillStyle = L.hairColor;
    if (L.hair === 'long') {
      rr(ctx, 12, 14, 24, 26, 8);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(35, 30, 4, 9, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // legs
  ctx.fillStyle = L.pants;
  rr(ctx, 15, 56, 8, 22, 2);
  ctx.fill();
  rr(ctx, 25, 56, 8, 22, 2);
  ctx.fill();

  // shoes
  const shoe = (x) => {
    if (L.shoes === 'boots') {
      ctx.fillStyle = '#2a1d14';
      rr(ctx, x - 1, 73, 11, 9, 3);
      ctx.fill();
      ctx.fillStyle = '#8f969e';
      rr(ctx, x - 1, 78, 11, 4, 2);
      ctx.fill();
    } else if (L.shoes === 'sneakers') {
      ctx.fillStyle = '#f5f5f5';
      rr(ctx, x - 1, 75, 11, 7, 3);
      ctx.fill();
      ctx.fillStyle = '#e04848';
      ctx.fillRect(x + 1, 77, 7, 2);
    } else if (L.shoes === 'sandals') {
      ctx.fillStyle = skin;
      rr(ctx, x, 74, 9, 8, 3);
      ctx.fill();
      ctx.fillStyle = '#7a4a22';
      ctx.fillRect(x, 76, 9, 2);
      ctx.fillRect(x - 1, 80, 11, 2);
    } else {
      ctx.fillStyle = '#bfc5cc';
      rr(ctx, x, 75, 9, 7, 3);
      ctx.fill();
    }
  };
  shoe(14);
  shoe(25);

  // arms
  ctx.fillStyle = L.shirt;
  rr(ctx, 6, 36, 7, 20, 3);
  ctx.fill();
  rr(ctx, 35, 36, 7, 20, 3);
  ctx.fill();
  // hands
  ctx.fillStyle = L.gloves ? '#e2b93b' : skin;
  ctx.beginPath();
  ctx.arc(9.5, 57, 3.8, 0, Math.PI * 2);
  ctx.arc(38.5, 57, 3.8, 0, Math.PI * 2);
  ctx.fill();
  if (L.gloves) {
    ctx.strokeStyle = '#9c7c1d';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // torso
  ctx.fillStyle = L.shirt;
  rr(ctx, 12, 33, 24, 27, 5);
  ctx.fill();
  ctx.strokeStyle = shade(L.shirt, -0.35);
  ctx.lineWidth = 1;
  ctx.stroke();

  // hi-vis vest
  if (L.vest) {
    const vc = L.vest === 'orange' ? '#ff7a1a' : '#d9f20d';
    ctx.fillStyle = vc;
    ctx.beginPath();
    ctx.moveTo(13, 35);
    ctx.lineTo(21, 35);
    ctx.lineTo(23, 58);
    ctx.lineTo(13, 58);
    ctx.closePath();
    ctx.moveTo(35, 35);
    ctx.lineTo(27, 35);
    ctx.lineTo(25, 58);
    ctx.lineTo(35, 58);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#dfe6ee';
    ctx.fillRect(13, 46, 10, 3);
    ctx.fillRect(25, 46, 10, 3);
    ctx.fillRect(13, 52, 10, 2);
    ctx.fillRect(25, 52, 10, 2);
  }
  if (L.harness) {
    ctx.strokeStyle = '#d12f2f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(15, 34);
    ctx.lineTo(22, 56);
    ctx.moveTo(33, 34);
    ctx.lineTo(26, 56);
    ctx.moveTo(14, 50);
    ctx.lineTo(34, 50);
    ctx.stroke();
  }

  // scarf
  if (L.scarf) {
    ctx.fillStyle = '#d43a3a';
    rr(ctx, 14, 31, 20, 6, 3);
    ctx.fill();
    rr(ctx, 27, 34, 6, 16, 2);
    ctx.fill();
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(27, 40, 6, 2);
    ctx.fillRect(27, 45, 6, 2);
  }

  // neck + head
  ctx.fillStyle = shade(skin, -0.1);
  ctx.fillRect(21, 29, 6, 5);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(24, 21, 10.5, 11.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // ears
  ctx.beginPath();
  ctx.ellipse(13.5, 22, 2.2, 3, 0, 0, Math.PI * 2);
  ctx.ellipse(34.5, 22, 2.2, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // hair (front)
  ctx.fillStyle = L.hairColor;
  if (L.hair === 'short') {
    ctx.beginPath();
    ctx.ellipse(24, 14, 10.5, 6.5, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(13.5, 13, 3, 6);
    ctx.fillRect(31.5, 13, 3, 6);
  } else if (L.hair === 'bob') {
    ctx.beginPath();
    ctx.ellipse(24, 15, 12, 8, 0, Math.PI, 0);
    ctx.fill();
    rr(ctx, 12, 13, 5, 16, 2);
    ctx.fill();
    rr(ctx, 31, 13, 5, 16, 2);
    ctx.fill();
  } else if (L.hair === 'long' || L.hair === 'pony') {
    ctx.beginPath();
    ctx.ellipse(24, 15, 11.5, 7.5, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(12.5, 14, 4, 10);
    ctx.fillRect(31.5, 14, 4, 10);
  }
  if (L.beard) {
    ctx.fillStyle = L.hairColor === '#111' ? '#2b2420' : L.hairColor;
    ctx.beginPath();
    ctx.ellipse(24, 28, 8, 5, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillRect(15, 24, 3, 5);
    ctx.fillRect(30, 24, 3, 5);
  }

  // face
  ctx.fillStyle = '#1d1d1d';
  ctx.beginPath();
  ctx.arc(20, 21.5, 1.4, 0, Math.PI * 2);
  ctx.arc(28, 21.5, 1.4, 0, Math.PI * 2);
  ctx.fill();
  if (!L.respirator) {
    ctx.strokeStyle = shade(skin, -0.45);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(24, 25.5, 3, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }

  if (L.glasses) {
    ctx.fillStyle = 'rgba(160,220,255,0.55)';
    ctx.strokeStyle = '#2d3a46';
    ctx.lineWidth = 1;
    rr(ctx, 16.5, 19, 7, 5, 2);
    ctx.fill();
    ctx.stroke();
    rr(ctx, 24.5, 19, 7, 5, 2);
    ctx.fill();
    ctx.stroke();
  }

  if (L.respirator) {
    ctx.fillStyle = '#f4f4f4';
    ctx.strokeStyle = '#9aa3ad';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(24, 27, 6.5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#7d8790';
    ctx.beginPath();
    ctx.moveTo(17.5, 26);
    ctx.lineTo(13.5, 22);
    ctx.moveTo(30.5, 26);
    ctx.lineTo(34.5, 22);
    ctx.stroke();
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
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(13, 24);
    ctx.quadraticCurveTo(14, 29, 20, 28);
    ctx.stroke();
  }

  // helmet / cap
  if (L.helmet) {
    ctx.fillStyle = L.helmet;
    ctx.beginPath();
    ctx.ellipse(24, 15, 12, 10, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = shade(L.helmet, -0.35);
    ctx.lineWidth = 1;
    ctx.stroke();
    rr(ctx, 10, 13.5, 28, 4, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = shade(L.helmet, -0.12);
    ctx.fillRect(22.5, 5.5, 3, 8);
  } else if (L.cap) {
    ctx.fillStyle = '#2860c4';
    ctx.beginPath();
    ctx.ellipse(24, 15, 11, 8, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#1d4a99';
    rr(ctx, 16, 13.5, 22, 4, 2);
    ctx.fill();
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
  }

  // accessories in the right hand
  if (L.accessory === 'clipboard') {
    ctx.fillStyle = '#8b5a2b';
    rr(ctx, 36, 44, 10, 14, 1);
    ctx.fill();
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(37.5, 46.5, 7, 10);
  } else if (L.accessory === 'tablet') {
    ctx.fillStyle = '#1e1e1e';
    rr(ctx, 35, 45, 11, 14, 2);
    ctx.fill();
    ctx.fillStyle = '#5fb3ff';
    ctx.fillRect(36.5, 46.5, 8, 10);
  } else if (L.accessory === 'radio') {
    ctx.fillStyle = '#222';
    rr(ctx, 37, 47, 6, 11, 1);
    ctx.fill();
    ctx.fillRect(39, 42, 1.5, 6);
  }
  ctx.restore();
}

export function characterCanvas(look, scale = 1, opts) {
  const c = makeCanvas(CHAR_W * scale, CHAR_H * scale);
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  drawCharacter(ctx, look, opts);
  return c;
}

/** Dialog portrait: head and shoulders on a rounded tile. */
export function portraitCanvas(look, size = 128, bg = '#2b3a4e') {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  rr(ctx, 0, 0, size, size, 14);
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
  drawCharacter(ctx, { ...look, accessory: null }, { shadow: false });
  ctx.restore();
  return c;
}
