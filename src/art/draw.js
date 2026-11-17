// Canvas2D drawing primitives shared by all procedural art.

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  return c;
}

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Lighten (amt > 0) or darken (amt < 0) a hex colour. amt in -1..1. */
export function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const f = (c) => Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

export function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export function fillRR(ctx, x, y, w, h, r, fill, stroke, lw = 2) {
  rr(ctx, x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

/** Deterministic PRNG so painted backgrounds look the same every time. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 3/4-view box: top face of depth `d`, front face below it. */
export function box3(ctx, x, y, w, h, d, color, opts = {}) {
  const top = opts.top || shade(color, 0.25);
  const front = color;
  const edge = opts.edge || shade(color, -0.45);
  // front
  const g = ctx.createLinearGradient(0, y + d, 0, y + h);
  g.addColorStop(0, front);
  g.addColorStop(1, shade(color, -0.18));
  ctx.fillStyle = g;
  ctx.fillRect(x, y + d, w, h - d);
  // top
  ctx.fillStyle = top;
  ctx.fillRect(x, y, w, d);
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.beginPath();
  ctx.moveTo(x, y + d);
  ctx.lineTo(x + w, y + d);
  ctx.stroke();
}

/** Horizontal cylinder (kiln, ball mill). */
export function cylH(ctx, x, y, w, h, color) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, shade(color, -0.35));
  g.addColorStop(0.25, shade(color, 0.35));
  g.addColorStop(0.55, color);
  g.addColorStop(1, shade(color, -0.5));
  ctx.fillStyle = g;
  rr(ctx, x, y, w, h, h * 0.18);
  ctx.fill();
  ctx.strokeStyle = shade(color, -0.55);
  ctx.lineWidth = 2;
  ctx.stroke();
  // end cap ellipse
  ctx.fillStyle = shade(color, -0.2);
  ctx.beginPath();
  ctx.ellipse(x + w - 2, y + h / 2, h * 0.14, h / 2 - 1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/** Vertical cylinder (silo, tanks). */
export function cylV(ctx, x, y, w, h, color, opts = {}) {
  const ey = w * 0.14;
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, shade(color, -0.4));
  g.addColorStop(0.3, shade(color, 0.3));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, -0.45));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y + ey);
  ctx.lineTo(x, y + h - ey);
  ctx.ellipse(x + w / 2, y + h - ey, w / 2, ey, 0, Math.PI, 0, true);
  ctx.lineTo(x + w, y + ey);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = shade(color, -0.55);
  ctx.lineWidth = 2;
  ctx.stroke();
  // top ellipse
  ctx.fillStyle = opts.top || shade(color, 0.15);
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + ey, w / 2, ey, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

export function stripes(ctx, x, y, w, h, c1 = '#f2b705', c2 = '#1d1d1d', size = 14) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = c1;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = c2;
  for (let i = -h; i < w + h; i += size * 2) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + size, y + h);
    ctx.lineTo(x + i + size + h, y);
    ctx.lineTo(x + i + h, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Yellow warning triangle with a simple pictogram. */
export function warnSign(ctx, cx, cy, size, symbol) {
  const s = size;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.55);
  ctx.lineTo(cx + s * 0.6, cy + s * 0.48);
  ctx.lineTo(cx - s * 0.6, cy + s * 0.48);
  ctx.closePath();
  ctx.fillStyle = '#f7c600';
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, s * 0.08);
  ctx.strokeStyle = '#111';
  ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.strokeStyle = '#111';
  ctx.lineWidth = Math.max(1.5, s * 0.05);
  const y = cy + s * 0.1;
  if (symbol === 'noise') {
    ctx.beginPath();
    ctx.ellipse(cx - s * 0.12, y, s * 0.09, s * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(cx - s * 0.05, y, s * 0.1 * i + s * 0.05, -0.7, 0.7);
      ctx.stroke();
    }
  } else if (symbol === 'dust') {
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.arc(cx - s * 0.2 + (i % 3) * s * 0.2, y - s * 0.12 + Math.floor(i / 3) * s * 0.13, s * 0.04, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (symbol === 'heat') {
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * s * 0.15, y + s * 0.2);
      ctx.bezierCurveTo(cx + i * s * 0.15 - s * 0.08, y, cx + i * s * 0.15 + s * 0.08, y - s * 0.1, cx + i * s * 0.15, y - s * 0.25);
      ctx.stroke();
    }
  } else if (symbol === 'fire') {
    ctx.beginPath();
    ctx.moveTo(cx, y - s * 0.28);
    ctx.bezierCurveTo(cx + s * 0.25, y - s * 0.05, cx + s * 0.2, y + s * 0.25, cx, y + s * 0.25);
    ctx.bezierCurveTo(cx - s * 0.2, y + s * 0.25, cx - s * 0.25, y, cx - s * 0.08, y - s * 0.1);
    ctx.bezierCurveTo(cx - s * 0.05, y, cx, y - s * 0.05, cx, y - s * 0.28);
    ctx.fill();
  } else if (symbol === 'gas') {
    for (const [dx, dy, r] of [[-0.12, 0.05, 0.11], [0.05, -0.04, 0.13], [0.16, 0.08, 0.09], [0, 0.12, 0.1]]) {
      ctx.beginPath();
      ctx.arc(cx + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (symbol === 'truck') {
    ctx.fillRect(cx - s * 0.25, y - s * 0.08, s * 0.3, s * 0.18);
    ctx.fillRect(cx + s * 0.07, y - s * 0.02, s * 0.15, s * 0.12);
    ctx.beginPath();
    ctx.arc(cx - s * 0.15, y + s * 0.14, s * 0.05, 0, Math.PI * 2);
    ctx.arc(cx + s * 0.13, y + s * 0.14, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.font = `bold ${Math.round(s * 0.5)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', cx, y + s * 0.02);
  }
  ctx.restore();
}

/** Blue mandatory circle sign. */
export function mandatorySign(ctx, cx, cy, r, symbol) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#1565c0';
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.1);
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  if (symbol === 'helmet') {
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.15, r * 0.5, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(cx - r * 0.65, cy + r * 0.12, r * 1.3, r * 0.15);
  } else {
    ctx.font = `bold ${Math.round(r)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('i', cx, cy + 1);
  }
  ctx.restore();
}

export function label(ctx, text, x, y, opts = {}) {
  ctx.save();
  ctx.font = `${opts.bold ? '700 ' : ''}${opts.size || 14}px "Noto Sans Georgian", "Noto Sans", sans-serif`;
  ctx.textAlign = opts.align || 'center';
  ctx.textBaseline = opts.baseline || 'middle';
  if (opts.bg) {
    const m = ctx.measureText(text);
    const pw = m.width + 12;
    const ph = (opts.size || 14) + 8;
    const bx = opts.align === 'left' ? x - 6 : x - pw / 2;
    fillRR(ctx, bx, y - ph / 2, pw, ph, 4, opts.bg, opts.border);
  }
  ctx.fillStyle = opts.color || '#111';
  ctx.fillText(text, x, y + 1);
  ctx.restore();
}

/** Railing (guard rail) along a horizontal line. */
export function railing(ctx, x, y, w, h = 14, color = '#f2b705') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  for (let i = x; i <= x + w; i += 24) {
    ctx.moveTo(i, y);
    ctx.lineTo(i, y + h);
  }
  ctx.stroke();
  ctx.restore();
}

export function shadowEllipse(ctx, cx, cy, rx, ry, a = 0.25) {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
