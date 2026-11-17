import { makeCanvas, fillRR, label } from './draw.js';

/** Draws the completion certificate (1200x850) on a canvas. `texts` come from i18n. */
export function certificateCanvas({ name, percent, date, texts }) {
  const Wc = 1200;
  const Hc = 850;
  const c = makeCanvas(Wc, Hc);
  const ctx = c.getContext('2d');
  const bg = ctx.createLinearGradient(0, 0, Wc, Hc);
  bg.addColorStop(0, '#fffdf5');
  bg.addColorStop(1, '#f3ead2');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, Wc, Hc);
  // borders
  ctx.strokeStyle = '#1f2a38';
  ctx.lineWidth = 18;
  ctx.strokeRect(20, 20, Wc - 40, Hc - 40);
  ctx.strokeStyle = '#f2b705';
  ctx.lineWidth = 6;
  ctx.strokeRect(46, 46, Wc - 92, Hc - 92);
  // hazard stripe band
  ctx.save();
  ctx.beginPath();
  ctx.rect(46, 46, Wc - 92, 26);
  ctx.clip();
  for (let x = 30; x < Wc; x += 40) {
    ctx.fillStyle = '#1f2a38';
    ctx.beginPath();
    ctx.moveTo(x, 72);
    ctx.lineTo(x + 20, 72);
    ctx.lineTo(x + 46, 46);
    ctx.lineTo(x + 26, 46);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  label(ctx, texts.heading, Wc / 2, 170, { size: 72, bold: true, color: '#1f2a38' });
  label(ctx, texts.confirms, Wc / 2, 265, { size: 28, color: '#4b5563' });
  let nameSize = 56;
  ctx.font = `700 ${nameSize}px "Noto Sans Georgian", sans-serif`;
  while (ctx.measureText(name).width > 900 && nameSize > 24) {
    nameSize -= 2;
    ctx.font = `700 ${nameSize}px "Noto Sans Georgian", sans-serif`;
  }
  label(ctx, name, Wc / 2, 345, { size: nameSize, bold: true, color: '#b07d00' });
  ctx.strokeStyle = '#c9b98f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(260, 390);
  ctx.lineTo(Wc - 260, 390);
  ctx.stroke();
  // wrap the description
  ctx.font = '28px "Noto Sans Georgian", sans-serif';
  const words = texts.text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > 860 && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  lines.push(line);
  lines.forEach((l, i) => label(ctx, l, Wc / 2, 450 + i * 42, { size: 28, color: '#1f2a38' }));

  label(ctx, texts.score, 300, 690, { size: 30, bold: true, color: '#1f2a38' });
  label(ctx, texts.date, Wc - 300, 690, { size: 30, color: '#1f2a38' });

  // badge
  const bx = Wc / 2;
  const by = 650;
  ctx.fillStyle = '#f2b705';
  ctx.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 ? 78 : 88;
    ctx.lineTo(bx + Math.cos(a) * r, by + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1f2a38';
  ctx.beginPath();
  ctx.arc(bx, by, 66, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2b705';
  ctx.beginPath();
  ctx.ellipse(bx, by + 6, 40, 32, 0, Math.PI, 0);
  ctx.fill();
  fillRR(ctx, bx - 50, by + 2, 100, 10, 5, '#f2b705');
  label(ctx, texts.badge, bx, by + 112, { size: 20, bold: true, color: '#b07d00' });
  return c;
}

export function downloadCanvas(canvas, filename) {
  const a = document.createElement('a');
  a.download = filename;
  a.href = canvas.toDataURL('image/png');
  document.body.appendChild(a);
  a.click();
  a.remove();
}
