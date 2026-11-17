import { W, H, CSS, COLORS } from '../../config.js';
import { t } from '../../i18n/index.js';
import { txt, panel } from '../../ui/theme.js';
import { Button } from '../../ui/Button.js';
import { MissionBase } from './MissionBase.js';
import { PALLET } from '../../data/missions.js';
import { QuizCard } from '../../ui/QuizCard.js';
import { shuffle } from '../../ui/DialogBox.js';
import { makeCanvas, fillRR } from '../../art/draw.js';
import { Sound } from '../../audio/Sound.js';

function ensurePalletTextures(scene) {
  if (scene.textures.exists('pallet_good')) return;
  const pallet = (kind) => {
    const c = makeCanvas(180, 90);
    const ctx = c.getContext('2d');
    for (let i = 0; i < 5; i++) {
      const broken = kind === 'broken' && i === 2;
      if (broken) {
        fillRR(ctx, 6 + i * 34, 8, 30, 30, 2, '#b78a55', '#6b4a28');
        fillRR(ctx, 6 + i * 34 + 4, 44, 26, 22, 2, '#b78a55', '#6b4a28');
        ctx.strokeStyle = '#3a2410';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(6 + i * 34, 40);
        ctx.lineTo(18 + i * 34, 30);
        ctx.lineTo(28 + i * 34, 46);
        ctx.stroke();
      } else {
        fillRR(ctx, 6 + i * 34, 8, 30, 58, 2, '#b78a55', '#6b4a28');
      }
    }
    // blocks
    for (let i = 0; i < 3; i++) {
      if (kind === 'block' && i === 1) continue;
      fillRR(ctx, 10 + i * 66, 66, 28, 20, 2, '#8a6236', '#4a3218');
    }
    return c;
  };
  const layer = (kind) => {
    const c = makeCanvas(72, 72);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#a87b48';
    ctx.fillRect(2, 2, 68, 68);
    const bag = (x, y, w, h) => fillRR(ctx, x, y, w, h, 3, '#d8c9a3', '#7b6a42', 2);
    if (kind === 'A') {
      for (let i = 0; i < 3; i++) bag(5, 5 + i * 13, 62, 12);
      bag(5, 45, 30, 22);
      bag(37, 45, 30, 22);
    } else {
      bag(5, 5, 30, 22);
      bag(37, 5, 30, 22);
      for (let i = 0; i < 3; i++) bag(5, 30 + i * 13, 62, 12);
    }
    return c;
  };
  for (const k of ['good', 'broken', 'block']) scene.textures.addCanvas(`pallet_${k}`, pallet(k));
  scene.textures.addCanvas('layer_A', layer('A'));
  scene.textures.addCanvas('layer_B', layer('B'));
}

/** Packing: pick a sound pallet, stack interlocking layers to the height limit, handle a robot jam. */
export class PalletMission extends MissionBase {
  constructor() {
    super('PalletMission');
  }

  create() {
    ensurePalletTextures(this);
    this.setupBase(t('missions.pallet.title'), null);
    this.stepText = txt(this, 40, this.headerBottom + 16, '', 19, { wrap: W - 80, scalable: true });
    this.step1();
  }

  setStep(text) {
    this.stepText.setText(text);
  }

  async step1() {
    this.setStep(t('missions.pallet.step1'));
    const objs = [];
    const btns = PALLET.choices.map((k, i) => {
      const x = 260 + i * 380;
      const b = new Button(this, x, 420, t(`missions.pallet.pallets.${k}`), { width: 300, height: 240, size: 18 });
      b.label.setY(80);
      const img = this.add.image(x, 360, `pallet_${k}`).setScale(1.3);
      objs.push(img);
      b.kind = k;
      return b;
    });
    const group = this.focus.push(btns);
    for (;;) {
      const pick = await new Promise((res) => btns.forEach((b) => (b.onClick = () => res(b))));
      if (pick.kind === PALLET.correctPallet) {
        Sound.play('correct');
        pick.setVariant('good');
        break;
      }
      pick.setVariant('bad');
      pick.setEnabled(false);
      this.addMistake('loads');
      await this.explain(t('missions.pallet.palletWrong'));
    }
    await this.explain(t('missions.pallet.palletGood'));
    this.focus.pop(group);
    btns.forEach((b) => b.destroy());
    objs.forEach((o) => o.destroy());
    this.step2();
  }

  async step2() {
    const max = PALLET.maxLayers;
    this.setStep(t('missions.pallet.step2', { max }));
    const baseX = 380;
    const baseY = 640;
    const layerH = 52;
    const g = this.add.graphics();
    // pallet base (side view)
    g.fillStyle(0xa87b48, 1);
    g.fillRect(baseX - 150, baseY, 300, 14);
    g.fillStyle(0x8a6236, 1);
    for (let i = 0; i < 3; i++) g.fillRect(baseX - 150 + i * 130, baseY + 14, 40, 18);
    // height limit
    const limitY = baseY - max * layerH;
    for (let x = baseX - 190; x < baseX + 190; x += 20) {
      g.lineStyle(3, COLORS.bad, 1);
      g.lineBetween(x, limitY, x + 10, limitY);
    }
    txt(this, baseX + 200, limitY, `${max}`, 18, { bold: true, color: CSS.bad }).setOrigin(0, 0.5);
    const layersText = txt(this, 900, 250, '', 22, { bold: true }).setOrigin(0.5);
    const stack = [];
    const drawLayer = (kind, i) => {
      const c = this.add.container(baseX, baseY - (i + 1) * layerH + layerH / 2);
      const bags = kind === 'A' ? [[-150, 300 / 3], [-50, 100], [50, 100]] : [[-150, 75], [-75, 75], [0, 150]];
      for (const [x, w] of bags) {
        const r = this.add.rectangle(x + 2, 0, w - 4, layerH - 6, kind === 'A' ? 0xd8c9a3 : 0xc9b98f).setOrigin(0, 0.5).setStrokeStyle(2, 0x7b6a42);
        c.add(r);
      }
      c.setAlpha(0).setY(c.y - 40);
      this.tweens.add({ targets: c, alpha: 1, y: c.y + 40, duration: 220, ease: 'Bounce.easeOut' });
      return c;
    };
    const update = () => layersText.setText(t('missions.pallet.layers', { n: stack.length, max }));
    update();
    const bA = new Button(this, 900, 340, t('missions.pallet.layerA'), { width: 420, height: 90, icon: 'layer_A', iconSize: 64, align: 'left' });
    const bB = new Button(this, 900, 450, t('missions.pallet.layerB'), { width: 420, height: 90, icon: 'layer_B', iconSize: 64, align: 'left' });
    const bF = new Button(this, 900, 560, t('missions.pallet.finish'), { width: 420, variant: 'primary', bold: true });
    const group = this.focus.push([bA, bB, bF]);
    await new Promise((done) => {
      let busy = false;
      const add = async (kind) => {
        if (busy) return;
        busy = true;
        const last = stack[stack.length - 1];
        if (stack.length >= max) {
          this.addMistake('loads', t('missions.pallet.tooHigh'));
        } else if (last && last.kind === kind) {
          const ghost = drawLayer(kind, stack.length);
          this.tweens.add({ targets: ghost, angle: 6, x: ghost.x + 30, alpha: 0, delay: 250, duration: 500, onComplete: () => ghost.destroy() });
          this.addMistake('loads', t('missions.pallet.sameLayer'));
        } else {
          Sound.play('click');
          stack.push({ kind, obj: drawLayer(kind, stack.length) });
          update();
        }
        busy = false;
      };
      bA.onClick = () => add('A');
      bB.onClick = () => add('B');
      bF.onClick = () => {
        if (stack.length < max) {
          this.addMistake('loads', t('missions.pallet.tooLow', { max }));
          return;
        }
        done();
      };
    });
    this.focus.pop(group);
    [bA, bB, bF].forEach((b) => b.destroy());
    // wrap animation
    const film = this.add.rectangle(baseX, baseY - (max * layerH) / 2, 320, max * layerH + 10, 0xdcebf5, 0).setStrokeStyle(3, 0x8aa2b5, 0);
    this.tweens.add({ targets: film, fillAlpha: 0.45, strokeAlpha: 1, duration: 900 });
    Sound.play('correct');
    layersText.setText(t('missions.pallet.wrapped')).setColor(CSS.good);
    await new Promise((r) => this.time.delayedCall(1100, r));
    g.destroy();
    film.destroy();
    layersText.destroy();
    stack.forEach((s) => s.obj.destroy());
    this.step3();
  }

  async step3() {
    this.setStep('');
    const J = PALLET.jam;
    const options = shuffle(J.options.map((id) => ({ id, text: t(`missions.pallet.jam.${id}`) })));
    const card = new QuizCard(this, this.focus, { x: 140, y: this.headerBottom + 30, w: 1000, prompt: t('missions.pallet.step3'), options, icon: 'warn_bang' });
    const picked = await card.ask();
    const ok = picked === J.correct;
    card.reveal(J.correct, picked);
    if (!ok) this.addMistake('robots');
    await card.explainAndNext(t('missions.pallet.jamExplain'), ok, t('missions.common.finish'));
    card.destroy();
    this.complete();
  }
}
