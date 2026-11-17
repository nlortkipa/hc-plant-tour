// Painters for zone props (machines, buildings, vehicles) and floors/backdrops.
// Every painter has the signature (ctx, p) where p = { x, y, w, h, ...options } from data/zones.js.
import {
  box3, cylH, cylV, stripes, warnSign, mandatorySign, label, railing, fillRR, rr, shade, rng, shadowEllipse,
} from './draw.js';
import { drawCharacter, NPC_LOOKS } from './characters.js';

// ---------------------------------------------------------------------------- floors
export function paintFloor(ctx, type, W, H, top) {
  const r = rng(type.length * 97 + 13);
  const base = { asphalt: '#4a4f55', gravel: '#8b8578', concrete: '#9aa0a6', tiles: '#5c6b7a' }[type] || '#8f959b';
  ctx.fillStyle = base;
  ctx.fillRect(0, top, W, H - top);
  if (type === 'tiles') {
    ctx.strokeStyle = shade(base, -0.15);
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = top; y < H; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    return;
  }
  // speckle noise
  const n = type === 'gravel' ? 5000 : 2500;
  for (let i = 0; i < n; i++) {
    const v = r();
    ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
    const s = type === 'gravel' ? 2 + r() * 3 : 1 + r() * 2;
    ctx.fillRect(r() * W, top + r() * (H - top), s, s);
  }
  if (type === 'concrete') {
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 160) {
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = top + 80; y < H; y += 160) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }
  // stains
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.beginPath();
    ctx.ellipse(r() * W, top + r() * (H - top), 20 + r() * 50, 8 + r() * 20, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function paintBackdrop(ctx, type, W, top, bottom) {
  const h = bottom - top;
  if (type === 'hall' || type === 'room') {
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, type === 'room' ? '#2a3442' : '#5b6672');
    g.addColorStop(1, type === 'room' ? '#36414f' : '#7a848e');
    ctx.fillStyle = g;
    ctx.fillRect(0, top, W, h);
    if (type === 'hall') {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      for (let x = 40; x < W; x += 220) ctx.fillRect(x, top, 18, h);
      ctx.fillStyle = 'rgba(190,220,255,0.18)';
      for (let x = 90; x < W; x += 220) ctx.fillRect(x, top + 8, 110, 26);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, bottom - 6, W, 6);
    return;
  }
  // outdoor sky
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, '#8fc3e8');
  g.addColorStop(1, '#d6e8f2');
  ctx.fillStyle = g;
  ctx.fillRect(0, top, W, h);
  const r = rng(type.length * 31);
  // clouds
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 6; i++) {
    const cx = r() * W;
    const cy = top + 10 + r() * 30;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.ellipse(cx + k * 18, cy + (k % 2) * 4, 22, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // hills
  ctx.fillStyle = type === 'quarry' ? '#b9a98f' : '#8fa67c';
  ctx.beginPath();
  ctx.moveTo(0, bottom);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, bottom - 30 - Math.sin(x / 140) * 18 - r() * 8);
  ctx.lineTo(W, bottom);
  ctx.closePath();
  ctx.fill();
  if (type === 'quarry') {
    ctx.fillStyle = '#a6957a';
    for (let i = 0; i < 4; i++) ctx.fillRect(700 + i * 40, bottom - 60 + i * 12, 520 - i * 80, 10);
  }
  if (type === 'plant') {
    // distant plant silhouette
    ctx.fillStyle = '#7d8a96';
    ctx.fillRect(980, bottom - 90, 60, 90);
    ctx.fillRect(1060, bottom - 70, 40, 70);
    ctx.fillRect(1110, bottom - 70, 40, 70);
    ctx.fillRect(1180, bottom - 120, 14, 120);
    ctx.fillRect(920, bottom - 40, 360, 40);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(1187, bottom - 132, 16, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(1205, bottom - 146, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function paintWalkway(ctx, wk) {
  ctx.fillStyle = '#3f8f57';
  ctx.fillRect(wk.x, wk.y, wk.w, wk.h);
  ctx.fillStyle = '#f2c200';
  ctx.fillRect(wk.x, wk.y, wk.w, 5);
  ctx.fillRect(wk.x, wk.y + wk.h - 5, wk.w, 5);
  // walking man icons
  for (let x = wk.x + 120; x < wk.x + wk.w; x += 260) pedIcon(ctx, x, wk.y + wk.h / 2, 'rgba(255,255,255,0.65)');
}

export function pedIcon(ctx, cx, cy, color = '#fff', s = 1) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, -14, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(-1, 3);
  ctx.moveTo(-1, 3);
  ctx.lineTo(-7, 14);
  ctx.moveTo(-1, 3);
  ctx.lineTo(6, 14);
  ctx.moveTo(-7, -4);
  ctx.lineTo(7, -2);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------- props
function worker(ctx, x, y, look = {}, scale = 0.8) {
  ctx.save();
  ctx.translate(x - 24 * scale, y - 82 * scale);
  ctx.scale(scale, scale);
  drawCharacter(ctx, { ...NPC_LOOKS.worker, ...look });
  ctx.restore();
}

const P = {
  booth(ctx, p) {
    box3(ctx, p.x, p.y, p.w, p.h, 40, '#d9d4c7', { top: '#8a3b2f' });
    // windows
    for (let i = 0; i < 3; i++) fillRR(ctx, p.x + 20 + i * 70, p.y + 70, 50, 40, 3, '#7fb3d5', '#4b5a66');
    // door
    fillRR(ctx, p.x + p.w / 2 - 28, p.y + p.h - 80, 56, 80, 3, '#5a6b7a', '#2d3640');
    label(ctx, 'KPP', p.x + p.w - 50, p.y + 90, { bold: true, size: 22, bg: '#1565c0', color: '#fff' });
    mandatorySign(ctx, p.x + p.w - 50, p.y + 150, 18, 'helmet');
  },
  board(ctx, p) {
    ctx.fillStyle = '#555';
    ctx.fillRect(p.x + 10, p.y + 40, 6, p.h - 40);
    ctx.fillRect(p.x + p.w - 16, p.y + 40, 6, p.h - 40);
    fillRR(ctx, p.x, p.y, p.w, 62, 4, '#1f4e79', '#0f2a44', 3);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) ctx.fillRect(p.x + 12, p.y + 12 + i * 11, p.w - 24 - (i % 2) * 20, 4);
  },
  assembly(ctx, p) {
    ctx.fillStyle = '#555';
    ctx.fillRect(p.x + p.w / 2 - 3, p.y + 40, 6, p.h - 40);
    fillRR(ctx, p.x, p.y, p.w, 56, 4, '#1b8a3c', '#0f5c27', 3);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 3; i++) pedIcon(ctx, p.x + 20 + i * 25, p.y + 30, '#fff', 0.7);
  },
  fence(ctx, p) {
    ctx.fillStyle = 'rgba(160,170,180,0.35)';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = '#7b8792';
    ctx.lineWidth = 1;
    for (let y = p.y; y < p.y + p.h; y += 10) {
      ctx.beginPath();
      ctx.moveTo(p.x, y);
      ctx.lineTo(p.x + p.w, y + 6);
      ctx.stroke();
    }
    ctx.fillStyle = '#5f6b75';
    for (let y = p.y; y < p.y + p.h; y += 60) ctx.fillRect(p.x + p.w / 2 - 3, y, 6, 14);
    ctx.strokeStyle = '#5f6b75';
    ctx.lineWidth = 3;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
  },
  parking(ctx, p) {
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 3;
    for (let x = p.x; x <= p.x + p.w; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, p.y);
      ctx.lineTo(x, p.y + p.h);
      ctx.stroke();
    }
  },
  car(ctx, p) {
    shadowEllipse(ctx, p.x + p.w / 2, p.y + p.h - 4, p.w / 2, 8);
    fillRR(ctx, p.x, p.y + 25, p.w, p.h - 40, 12, '#c0392b', '#7d241b');
    fillRR(ctx, p.x + 30, p.y, p.w - 60, 34, 10, '#c0392b', '#7d241b');
    fillRR(ctx, p.x + 38, p.y + 6, p.w - 76, 22, 6, '#9fd0ef');
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(p.x + 32, p.y + p.h - 14, 12, 0, Math.PI * 2);
    ctx.arc(p.x + p.w - 32, p.y + p.h - 14, 12, 0, Math.PI * 2);
    ctx.fill();
  },
  flagpole(ctx, p) {
    ctx.fillStyle = '#ccc';
    ctx.fillRect(p.x + p.w / 2 - 2, p.y, 4, p.h);
    ctx.fillStyle = '#f2b705';
    ctx.fillRect(p.x + p.w / 2 + 2, p.y + 4, 36, 22);
    shadowEllipse(ctx, p.x + p.w / 2, p.y + p.h, 12, 4);
  },
  planter(ctx, p) {
    box3(ctx, p.x, p.y + 20, p.w, p.h - 20, 10, '#8a8178');
    ctx.fillStyle = '#4c8a3f';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(p.x + 12 + i * ((p.w - 24) / 5), p.y + 22, 13, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  road(ctx, p) {
    ctx.fillStyle = '#3d4247';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#f5f5f5';
    for (let x = p.x + 20; x < p.x + p.w; x += 80) ctx.fillRect(x, p.y + p.h / 2 - 3, 44, 6);
    ctx.fillStyle = '#f2c200';
    ctx.fillRect(p.x, p.y, p.w, 4);
    ctx.fillRect(p.x, p.y + p.h - 4, p.w, 4);
  },
  rail(ctx, p) {
    ctx.fillStyle = '#d0a400';
    ctx.fillRect(p.x, p.y + 4, p.w, 6);
    ctx.fillRect(p.x, p.y + 12, p.w, 4);
    ctx.fillStyle = '#7a6200';
    for (let x = p.x + 10; x < p.x + p.w; x += 60) ctx.fillRect(x, p.y, 6, p.h);
  },
  signpost(ctx, p) {
    ctx.fillStyle = '#666';
    ctx.fillRect(p.x + p.w / 2 - 3, p.y + 30, 6, p.h - 30);
    (p.hazards || []).forEach((hz, i) => warnSign(ctx, p.x + p.w / 2, p.y + 18 + i * 36, 34, hz));
  },
  truck(ctx, p) {
    paintTruck(ctx, p.x, p.y, p.w, p.h, p.kind || 'flatbed', p.facing || 'left');
  },
  crusher(ctx, p) {
    // hopper
    ctx.fillStyle = '#6f7a85';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + p.w * 0.55, p.y);
    ctx.lineTo(p.x + p.w * 0.45, p.y + 70);
    ctx.lineTo(p.x + p.w * 0.1, p.y + 70);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3a424a';
    ctx.lineWidth = 2;
    ctx.stroke();
    // rocks in hopper
    const r = rng(7);
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = r() > 0.5 ? '#c8c0b0' : '#a89f8d';
      ctx.beginPath();
      ctx.ellipse(p.x + 20 + r() * (p.w * 0.45), p.y + 6 + r() * 16, 8 + r() * 8, 6 + r() * 5, r(), 0, Math.PI * 2);
      ctx.fill();
    }
    box3(ctx, p.x + 10, p.y + 60, p.w - 10, p.h - 60, 24, '#e0a526');
    stripes(ctx, p.x + 10, p.y + p.h - 18, p.w - 10, 14);
    // motor
    box3(ctx, p.x + p.w - 90, p.y + 100, 70, 60, 14, '#3a6ea5');
    warnSign(ctx, p.x + 70, p.y + 140, 34, 'noise');
    warnSign(ctx, p.x + 120, p.y + 140, 34, 'dust');
  },
  conveyor(ctx, p) {
    const vertical = p.h > p.w;
    ctx.fillStyle = '#535b63';
    if (!vertical) {
      for (let x = p.x + 20; x < p.x + p.w; x += 70) ctx.fillRect(x, p.y + p.h - 4, 6, 18);
      fillRR(ctx, p.x, p.y, p.w, p.h, 6, '#7d8790', '#3a424a');
      ctx.fillStyle = '#26292c';
      ctx.fillRect(p.x + 6, p.y + 8, p.w - 12, p.h - 16);
      // material on belt
      const r = rng(p.x);
      for (let x = p.x + 12; x < p.x + p.w - 12; x += 14) {
        ctx.fillStyle = r() > 0.5 ? '#b9b09e' : '#9c937f';
        ctx.beginPath();
        ctx.ellipse(x, p.y + p.h / 2, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f2c200';
      ctx.fillRect(p.x, p.y + p.h - 3, p.w, 3);
    }
  },
  stockpile(ctx, p) {
    ctx.fillStyle = '#c9ccd0';
    ctx.beginPath();
    ctx.ellipse(p.x + p.w / 2, p.y + p.h, p.w / 2, p.h, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#7a8189';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(p.x + p.w / 2, p.y + p.h, (p.w / 2) * (i / 6), p.h, 0, Math.PI, 0);
      ctx.stroke();
    }
    ctx.fillStyle = '#a89f8d';
    ctx.beginPath();
    ctx.ellipse(p.x + p.w / 2, p.y + p.h, p.w * 0.35, 40, 0, Math.PI, 0);
    ctx.fill();
  },
  vrm(ctx, p) {
    box3(ctx, p.x, p.y + p.h - 70, p.w, 70, 16, '#5d6670');
    cylV(ctx, p.x + 40, p.y + 80, p.w - 80, p.h - 140, '#3f7cbf');
    // separator cone + duct
    ctx.fillStyle = '#5b97d6';
    ctx.beginPath();
    ctx.moveTo(p.x + 60, p.y + 90);
    ctx.lineTo(p.x + p.w - 60, p.y + 90);
    ctx.lineTo(p.x + p.w / 2 + 20, p.y + 30);
    ctx.lineTo(p.x + p.w / 2 - 20, p.y + 30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7d8790';
    ctx.fillRect(p.x + p.w / 2 - 15, p.y, 30, 34);
    warnSign(ctx, p.x + 40, p.y + p.h - 34, 30, 'noise');
    warnSign(ctx, p.x + 80, p.y + p.h - 34, 30, 'dust');
  },
  elevator(ctx, p) {
    box3(ctx, p.x, p.y, p.w, p.h, 10, '#c98a1c');
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    for (let y = p.y + 30; y < p.y + p.h; y += 50) ctx.fillRect(p.x + 8, y, p.w - 16, 4);
  },
  cabinet(ctx, p) {
    box3(ctx, p.x, p.y, p.w, p.h, 10, '#c7ccd1');
    ctx.fillStyle = '#e5534b';
    ctx.beginPath();
    ctx.arc(p.x + p.w - 20, p.y + 34, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3fb950';
    ctx.fillRect(p.x + 14, p.y + 26, 12, 6);
    warnSign(ctx, p.x + 30, p.y + 62, 24, 'bolt');
  },
  silo(ctx, p) {
    cylV(ctx, p.x, p.y + 10, p.w, p.h - 10, p.color || '#cfd4d9');
    // cone bottom
    ctx.fillStyle = shade(p.color || '#cfd4d9', -0.2);
    ctx.fillRect(p.x + p.w * 0.38, p.y + p.h - 18, p.w * 0.24, 18);
    // ladder
    ctx.strokeStyle = '#6b7580';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x + p.w - 28, p.y + 30);
    ctx.lineTo(p.x + p.w - 28, p.y + p.h - 20);
    ctx.moveTo(p.x + p.w - 14, p.y + 30);
    ctx.lineTo(p.x + p.w - 14, p.y + p.h - 20);
    for (let y = p.y + 34; y < p.y + p.h - 20; y += 10) {
      ctx.moveTo(p.x + p.w - 28, y);
      ctx.lineTo(p.x + p.w - 14, y);
    }
    ctx.stroke();
    if (p.railing) railing(ctx, p.x + 4, p.y + 4, p.w - 8, 12);
    if (p.hatch) {
      fillRR(ctx, p.x + p.w / 2 - 26, p.y + p.h - 90, 52, 52, 26, '#7a838c', '#3a424a', 3);
      warnSign(ctx, p.x + p.w / 2 - 50, p.y + p.h - 64, 28, '!');
    }
  },
  sampler(ctx, p) {
    box3(ctx, p.x, p.y, p.w, p.h, 10, '#e8e8e8');
    ctx.fillStyle = '#2f81f7';
    ctx.fillRect(p.x + 10, p.y + 24, p.w - 20, 16);
    ctx.fillStyle = '#999';
    ctx.fillRect(p.x + p.w / 2 - 4, p.y - 40, 8, 40);
  },
  preheater(ctx, p) {
    // steel frame
    ctx.strokeStyle = '#5e6770';
    ctx.lineWidth = 4;
    ctx.strokeRect(p.x + 10, p.y + 10, p.w - 20, p.h - 10);
    for (let y = p.y + 80; y < p.y + p.h; y += 70) {
      ctx.beginPath();
      ctx.moveTo(p.x + 10, y);
      ctx.lineTo(p.x + p.w - 10, y);
      ctx.stroke();
    }
    // cyclones
    for (let i = 0; i < 4; i++) {
      const cx = p.x + (i % 2 ? p.w * 0.68 : p.w * 0.32);
      const cy = p.y + 30 + i * 66;
      cylV(ctx, cx - 30, cy, 60, 44, '#b55a2a');
      ctx.fillStyle = '#8f4520';
      ctx.beginPath();
      ctx.moveTo(cx - 28, cy + 40);
      ctx.lineTo(cx + 28, cy + 40);
      ctx.lineTo(cx + 6, cy + 64);
      ctx.lineTo(cx - 6, cy + 64);
      ctx.closePath();
      ctx.fill();
    }
    warnSign(ctx, p.x + p.w - 30, p.y + p.h - 30, 30, 'heat');
  },
  kiln(ctx, p) {
    const cy = p.y + 30;
    const ch = 90;
    // piers
    for (const fx of [0.15, 0.5, 0.85]) {
      box3(ctx, p.x + p.w * fx - 30, cy + 50, 60, p.h - 80, 10, '#8d939a');
    }
    cylH(ctx, p.x, cy, p.w, ch, '#7a5a48');
    // tyres
    for (const fx of [0.15, 0.5, 0.85]) {
      ctx.fillStyle = '#4b4f55';
      ctx.fillRect(p.x + p.w * fx - 12, cy - 6, 24, ch + 12);
    }
    // hot end glow
    const g = ctx.createRadialGradient(p.x + p.w, cy + ch / 2, 4, p.x + p.w, cy + ch / 2, 70);
    g.addColorStop(0, 'rgba(255,200,80,0.95)');
    g.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(p.x + p.w - 70, cy - 30, 140, ch + 60);
    warnSign(ctx, p.x + p.w * 0.32, cy + ch + 34, 30, 'heat');
    warnSign(ctx, p.x + p.w * 0.68, cy + ch + 34, 30, 'heat');
  },
  cooler(ctx, p) {
    box3(ctx, p.x, p.y, p.w, p.h, 18, '#6c7680');
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#3a424a';
      ctx.beginPath();
      ctx.arc(p.x + 28 + i * 42, p.y + p.h - 34, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#9aa3ad';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x + 28 + i * 42 - 12, p.y + p.h - 34);
      ctx.lineTo(p.x + 28 + i * 42 + 12, p.y + p.h - 34);
      ctx.moveTo(p.x + 28 + i * 42, p.y + p.h - 46);
      ctx.lineTo(p.x + 28 + i * 42, p.y + p.h - 22);
      ctx.stroke();
    }
    ctx.fillStyle = '#e8762c';
    ctx.fillRect(p.x + 12, p.y + 30, p.w - 24, 14);
  },
  hotzone(ctx, p) {
    stripes(ctx, p.x, p.y, p.w, p.h, 'rgba(229,83,75,0.55)', 'rgba(255,255,255,0.35)', 18);
    ctx.strokeStyle = '#e5534b';
    ctx.lineWidth = 4;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
    warnSign(ctx, p.x + p.w / 2, p.y + p.h / 2, 44, 'heat');
  },
  water(ctx, p) {
    box3(ctx, p.x, p.y + 30, p.w, p.h - 30, 10, '#2f81f7');
    cylV(ctx, p.x + 12, p.y, p.w - 24, 40, '#9fd8ff');
  },
  videowall(ctx, p) {
    fillRR(ctx, p.x, p.y, p.w, p.h, 6, '#11161c', '#000');
    const cols = 5;
    const rows = 2;
    const cw = (p.w - 24) / cols;
    const chh = (p.h - 18) / rows;
    const r = rng(42);
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = p.x + 12 + i * cw;
        const y = p.y + 9 + j * chh;
        fillRR(ctx, x + 2, y + 2, cw - 4, chh - 4, 3, '#18324a');
        ctx.strokeStyle = r() > 0.85 ? '#e5534b' : '#3fb950';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let k = 0; k < 8; k++) ctx.lineTo(x + 8 + k * ((cw - 16) / 7), y + chh / 2 + (r() - 0.5) * chh * 0.6);
        ctx.stroke();
        ctx.fillStyle = '#5fb3ff';
        ctx.fillRect(x + 8, y + 8, 30, 4);
      }
    }
  },
  desk(ctx, p) {
    // seated operators (behind the desk)
    for (let i = 0; i < 3; i++) worker(ctx, p.x + 140 + i * 240, p.y + 30, { helmet: null, vest: null, headset: true, shirt: '#2d3e75', glasses: false, gloves: false }, 0.75);
    box3(ctx, p.x, p.y + 20, p.w, p.h - 20, 20, '#c4a77d');
    for (let i = 0; i < 6; i++) {
      fillRR(ctx, p.x + 30 + i * 122, p.y - 16, 90, 50, 3, '#111', '#000');
      ctx.fillStyle = i % 2 ? '#1b4d7a' : '#1d5e44';
      ctx.fillRect(p.x + 34 + i * 122, p.y - 12, 82, 42);
    }
  },
  rack(ctx, p) {
    box3(ctx, p.x, p.y, p.w, p.h, 10, '#2c3238');
    for (let y = p.y + 20; y < p.y + p.h - 10; y += 16) {
      ctx.fillStyle = '#1b1f23';
      ctx.fillRect(p.x + 8, y, p.w - 16, 10);
      ctx.fillStyle = y % 32 ? '#3fb950' : '#2f81f7';
      ctx.fillRect(p.x + 12, y + 3, 4, 4);
    }
  },
  plant(ctx, p) {
    box3(ctx, p.x + 10, p.y + p.h - 34, p.w - 20, 34, 8, '#b06a3b');
    ctx.fillStyle = '#3e8c45';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(p.x + p.w / 2 + (i - 2) * 9, p.y + 26 + Math.abs(i - 2) * 6, 10, 22, (i - 2) * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  table(ctx, p) {
    box3(ctx, p.x, p.y, p.w, p.h, 24, '#8a6b4a');
    fillRR(ctx, p.x + 20, p.y + 4, 60, 14, 2, '#f5f5f5');
    fillRR(ctx, p.x + p.w - 90, p.y + 6, 40, 12, 2, '#2f81f7');
  },
  ballmill(ctx, p) {
    // motor + gearbox
    box3(ctx, p.x, p.y + 50, 70, 90, 14, '#3a6ea5');
    box3(ctx, p.x + 72, p.y + 60, 50, 70, 12, '#5d6670');
    ctx.fillStyle = '#9aa3ad';
    ctx.fillRect(p.x + 122, p.y + 88, 20, 14);
    cylH(ctx, p.x + 140, p.y + 20, p.w - 140, p.h - 50, '#8f9aa5');
    // girth gear
    ctx.fillStyle = '#4b4f55';
    ctx.fillRect(p.x + 200, p.y + 10, 26, p.h - 30);
    // bolts
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let x = p.x + 260; x < p.x + p.w - 20; x += 40) {
      for (let y = p.y + 34; y < p.y + p.h - 40; y += 24) ctx.fillRect(x, y, 3, 3);
    }
    box3(ctx, p.x + 150, p.y + p.h - 40, p.w - 160, 40, 10, '#8d939a');
    warnSign(ctx, p.x + 30, p.y + 160, 28, 'noise');
  },
  separator(ctx, p) {
    box3(ctx, p.x, p.y + 140, p.w, p.h - 140, 16, '#5d6670');
    ctx.fillStyle = '#3f7cbf';
    ctx.beginPath();
    ctx.moveTo(p.x + 20, p.y + 40);
    ctx.lineTo(p.x + p.w - 20, p.y + 40);
    ctx.lineTo(p.x + p.w - 50, p.y + 150);
    ctx.lineTo(p.x + 50, p.y + 150);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1f4e79';
    ctx.lineWidth = 2;
    ctx.stroke();
    cylV(ctx, p.x + 30, p.y, p.w - 60, 50, '#5b97d6');
  },
  hoppers(ctx, p) {
    const names = ['კლინკერი', 'თაბაშირი', 'დანამატი'];
    const colors = ['#4b4b4b', '#efefef', '#b9a98f'];
    const w = p.w / 3;
    for (let i = 0; i < 3; i++) {
      const x = p.x + i * w;
      box3(ctx, x + 6, p.y, w - 12, p.h - 80, 14, '#7d8790');
      ctx.fillStyle = colors[i];
      ctx.fillRect(x + 14, p.y + 4, w - 28, 8);
      ctx.fillStyle = '#6a737c';
      ctx.beginPath();
      ctx.moveTo(x + 6, p.y + p.h - 80);
      ctx.lineTo(x + w - 6, p.y + p.h - 80);
      ctx.lineTo(x + w / 2 + 10, p.y + p.h - 30);
      ctx.lineTo(x + w / 2 - 10, p.y + p.h - 30);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3a424a';
      ctx.fillRect(x + 10, p.y + p.h - 30, w - 20, 24);
      label(ctx, names[i], x + w / 2, p.y + 60, { size: 12, bold: true, bg: '#fff' });
    }
  },
  hatch(ctx, p) {
    fillRR(ctx, p.x, p.y, p.w, p.h, 10, '#6c7680', '#2d3640', 3);
    stripes(ctx, p.x + 10, p.y + 10, p.w - 20, 10);
    warnSign(ctx, p.x + p.w / 2, p.y + p.h / 2 + 10, 34, '!');
  },
  packer(ctx, p) {
    box3(ctx, p.x, p.y + 120, p.w, p.h - 120, 20, '#5d6670');
    cylV(ctx, p.x + 30, p.y + 30, p.w - 60, 120, '#2f81f7');
    // spouts + bags
    for (let i = 0; i < 5; i++) {
      const x = p.x + 40 + i * ((p.w - 80) / 4);
      ctx.fillStyle = '#d8c9a3';
      rr(ctx, x - 14, p.y + 150, 28, 34, 4);
      ctx.fill();
      ctx.strokeStyle = '#9b8a62';
      ctx.stroke();
    }
    ctx.fillStyle = '#7d8790';
    ctx.fillRect(p.x + p.w / 2 - 14, p.y, 28, 34);
    warnSign(ctx, p.x + 26, p.y + p.h - 30, 28, 'noise');
  },
  robotcell(ctx, p) {
    // floor marking
    stripes(ctx, p.x - 8, p.y + p.h - 8, p.w + 16, 8);
    // pallet + bags (static)
    fillRR(ctx, p.x + p.w / 2 - 70, p.y + p.h - 90, 140, 50, 3, '#a87b48', '#6b4a28');
    for (let i = 0; i < 4; i++) fillRR(ctx, p.x + p.w / 2 - 66 + i * 34, p.y + p.h - 110, 32, 22, 3, '#d8c9a3', '#9b8a62', 1);
    // robot base
    cylV(ctx, p.x + p.w / 2 - 34, p.y + 110, 68, 60, '#f08a24');
    // fence
    ctx.strokeStyle = '#f2c200';
    ctx.lineWidth = 4;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = 'rgba(242,194,0,0.12)';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = 'rgba(80,80,80,0.5)';
    ctx.lineWidth = 1;
    for (let x = p.x; x < p.x + p.w; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, p.y);
      ctx.lineTo(x, p.y + p.h);
      ctx.stroke();
    }
    // light curtain posts
    ctx.fillStyle = '#222';
    ctx.fillRect(p.x + 20, p.y + p.h - 50, 8, 50);
    ctx.fillRect(p.x + 90, p.y + p.h - 50, 8, 50);
    ctx.fillStyle = 'rgba(255,60,60,0.5)';
    for (let y = p.y + p.h - 46; y < p.y + p.h - 4; y += 8) ctx.fillRect(p.x + 28, y, 62, 1);
    label(ctx, 'STOP', p.x + p.w - 50, p.y + 24, { bold: true, size: 14, bg: '#e5534b', color: '#fff' });
  },
  wrapper(ctx, p) {
    ctx.fillStyle = '#5d6670';
    ctx.beginPath();
    ctx.ellipse(p.x + p.w / 2, p.y + p.h - 30, p.w / 2, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    // wrapped pallet
    fillRR(ctx, p.x + p.w / 2 - 50, p.y + 50, 100, p.h - 90, 6, 'rgba(220,235,245,0.85)', '#8aa2b5');
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    for (let y = p.y + 60; y < p.y + p.h - 50; y += 12) {
      ctx.beginPath();
      ctx.moveTo(p.x + p.w / 2 - 50, y);
      ctx.lineTo(p.x + p.w / 2 + 50, y + 6);
      ctx.stroke();
    }
    box3(ctx, p.x + p.w - 30, p.y, 22, p.h - 30, 6, '#3a6ea5');
  },
  pallets(ctx, p) {
    const n = Math.floor(p.w / 100);
    for (let i = 0; i < n; i++) {
      const x = p.x + i * 105;
      fillRR(ctx, x, p.y + p.h - 18, 96, 18, 2, '#a87b48', '#6b4a28');
      for (let row = 0; row < 3; row++) {
        for (let k = 0; k < 3; k++) fillRR(ctx, x + 2 + k * 31, p.y + p.h - 40 - row * 22, 30, 22, 3, '#d8c9a3', '#9b8a62', 1);
      }
    }
  },
  weighbridge(ctx, p) {
    ctx.fillStyle = '#6a737c';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = '#3a424a';
    ctx.lineWidth = 3;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
    for (let x = p.x + 30; x < p.x + p.w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, p.y);
      ctx.lineTo(x, p.y + p.h);
      ctx.stroke();
    }
    fillRR(ctx, p.x + p.w - 90, p.y - 40, 80, 34, 4, '#111', '#333');
    label(ctx, '24 380 kg', p.x + p.w - 50, p.y - 23, { size: 13, bold: true, color: '#3fb950' });
  },
  forklift(ctx, p) {
    shadowEllipse(ctx, p.x + p.w / 2, p.y + p.h - 4, p.w / 2, 7);
    box3(ctx, p.x + 20, p.y + 20, p.w - 20, p.h - 34, 10, '#f2b705');
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 4;
    ctx.strokeRect(p.x + 40, p.y, p.w - 50, 30);
    ctx.fillStyle = '#555';
    ctx.fillRect(p.x + 4, p.y + 6, 10, p.h - 20);
    ctx.fillRect(p.x - 18, p.y + p.h - 22, 28, 5);
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(p.x + 36, p.y + p.h - 12, 11, 0, Math.PI * 2);
    ctx.arc(p.x + p.w - 16, p.y + p.h - 12, 11, 0, Math.PI * 2);
    ctx.fill();
  },
};

export function paintTruck(ctx, x, y, w, h, kind, facing = 'left') {
  ctx.save();
  if (facing === 'right') {
    ctx.translate(x * 2 + w, 0);
    ctx.scale(-1, 1);
  }
  shadowEllipse(ctx, x + w / 2, y + h - 6, w / 2, 10);
  const cabW = Math.min(90, w * 0.26);
  const bodyColor = { dumper: '#e0a526', loader: '#e0a526', flatbed: '#3a6ea5', tanker: '#d9dde1' }[kind] || '#3a6ea5';
  if (kind === 'loader') {
    box3(ctx, x + 50, y + 20, w - 60, h - 50, 12, bodyColor);
    fillRR(ctx, x + w - 80, y, 60, 50, 4, 'rgba(160,210,240,0.7)', '#333');
    ctx.fillStyle = '#6b6b6b';
    ctx.beginPath();
    ctx.moveTo(x, y + h - 50);
    ctx.lineTo(x + 50, y + h - 60);
    ctx.lineTo(x + 50, y + h - 20);
    ctx.lineTo(x + 6, y + h - 20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(x + 80, y + h - 22, 22, 0, Math.PI * 2);
    ctx.arc(x + w - 40, y + h - 22, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  // cab (front = left)
  fillRR(ctx, x, y + h * 0.18, cabW, h * 0.62, 8, kind === 'dumper' ? '#c0392b' : '#e74c3c', '#7d241b');
  fillRR(ctx, x + 8, y + h * 0.24, cabW * 0.55, h * 0.22, 4, '#a9d6f2', '#333', 1);
  // body
  if (kind === 'tanker') {
    cylH(ctx, x + cabW + 6, y + h * 0.08, w - cabW - 10, h * 0.58, bodyColor);
    ctx.fillStyle = '#7d8790';
    ctx.fillRect(x + cabW + 40, y + h * 0.02, 30, 10);
    ctx.fillRect(x + w - 90, y + h * 0.02, 30, 10);
  } else if (kind === 'dumper') {
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(x + cabW + 4, y + h * 0.05);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w - 20, y + h * 0.72);
    ctx.lineTo(x + cabW + 4, y + h * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8a6412';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#b9b09e';
    ctx.beginPath();
    ctx.ellipse(x + cabW + (w - cabW) / 2, y + h * 0.05, (w - cabW) / 2.4, 14, 0, Math.PI, 0);
    ctx.fill();
  } else {
    fillRR(ctx, x + cabW + 4, y + h * 0.5, w - cabW - 4, h * 0.2, 2, bodyColor, '#1f3c5a');
    // bags on flatbed
    for (let i = 0; i < 4; i++) {
      fillRR(ctx, x + cabW + 14 + i * ((w - cabW - 28) / 4), y + h * 0.18, (w - cabW - 40) / 4, h * 0.32, 4, '#d8c9a3', '#9b8a62', 1);
    }
  }
  ctx.fillStyle = '#333';
  ctx.fillRect(x + cabW, y + h * 0.7, w - cabW, 8);
  // wheels
  ctx.fillStyle = '#1b1b1b';
  const wy = y + h - 22;
  const wheels = [x + cabW * 0.5, x + w - 70, x + w - 30];
  for (const wx of wheels) {
    ctx.beginPath();
    ctx.arc(wx, wy, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(wx, wy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b1b1b';
  }
  ctx.restore();
}

export function paintProp(ctx, p) {
  const fn = P[p.type];
  if (fn) fn(ctx, p);
  else box3(ctx, p.x, p.y, p.w, p.h, 12, '#7d8790');
}
