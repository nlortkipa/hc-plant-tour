import { CSS, COLORS } from '../config.js';
import { txt, panel } from './theme.js';
import { Button } from './Button.js';
import { t } from '../i18n/index.js';
import { Sound } from '../audio/Sound.js';

/**
 * Question card used by decision/alarm missions and the final test.
 *   const card = new QuizCard(scene, focus, { x, y, w, prompt, options, icon });
 *   const picked = await card.ask(); card.reveal(correct, picked); card.explain(text, ok); await card.next();
 */
export class QuizCard {
  constructor(scene, focus, opts) {
    this.scene = scene;
    this.focus = focus;
    this.o = { w: 900, size: 22, ...opts };
    this.objs = [];
    const { x, y, w } = this.o;
    const left = x + (opts.icon ? 150 : 32);
    let cy = y + 28;
    if (opts.kicker) {
      this.objs.push(txt(scene, left, cy, opts.kicker, 15, { color: CSS.dim }));
      cy += 28;
    }
    const prompt = txt(scene, left, cy, opts.prompt, this.o.size, { bold: true, wrap: x + w - left - 32, scalable: true });
    this.objs.push(prompt);
    if (opts.icon) this.objs.push(scene.add.image(x + 80, y + 80, opts.icon).setDisplaySize(opts.iconSize || 100, opts.iconSize || 100));
    cy = Math.max(cy + prompt.height + 24, opts.icon ? y + 150 : 0);
    this.buttons = opts.options.map((op, i) => {
      const b = new Button(scene, x + w / 2, 0, `${i + 1}.  ${op.text}`, { width: w - 64, size: 19, variant: 'choice', align: 'left', scalable: true });
      b.setY(cy + b.h / 2);
      cy += b.h + 10;
      b.optId = op.id;
      return b;
    });
    this.bottom = cy;
    this.bg = panel(scene, x, y, w, cy - y + 16, { fill: 0x16202c, border: 0x4a6386 });
    this.bg.setDepth(-1);
    this.objs.push(this.bg, ...this.buttons);
  }

  ask() {
    return new Promise((resolve) => {
      this.group = this.focus.push(this.buttons, {
        keys: (e) => {
          const n = parseInt(e.key, 10);
          if (n >= 1 && n <= this.buttons.length) {
            this.buttons[n - 1].activate();
            return true;
          }
          return false;
        },
      });
      this.buttons.forEach((b) => {
        b.onClick = () => {
          this.focus.pop(this.group);
          this.buttons.forEach((x) => (x.onClick = null));
          resolve(b.optId);
        };
      });
    });
  }

  /** Stop waiting for an answer (e.g. timer ran out). */
  abort() {
    if (this.group) this.focus.pop(this.group);
    this.buttons.forEach((x) => (x.onClick = null));
  }

  reveal(correct, picked) {
    for (const b of this.buttons) {
      b.setFocused(false);
      if (b.optId === correct) b.setVariant('good');
      else if (b.optId === picked) b.setVariant('bad');
      else b.setAlpha(0.55);
      b.disableInteractive();
    }
    Sound.play(correct === picked ? 'correct' : 'wrong');
  }

  /** Adds an explanation below the card and a "next" button. Resolves when pressed. */
  explainAndNext(text, ok, label = t('ui.next')) {
    const { x, w } = this.o;
    const msg = txt(this.scene, x + 24, this.bottom + 30, `${ok ? t('ui.correct') : t('ui.wrong') + '.'} ${text}`, 18, {
      wrap: w - 48,
      color: ok ? CSS.good : CSS.bad,
      scalable: true,
    });
    const pg = panel(this.scene, x, this.bottom + 16, w, msg.height + 30, { fill: 0x0d141d, border: ok ? COLORS.good : COLORS.bad, shadow: false });
    pg.setDepth(-1);
    const btn = new Button(this.scene, x + w - 130, this.bottom + msg.height + 84, label, { width: 220, variant: 'primary', bold: true });
    this.objs.push(msg, pg, btn);
    return new Promise((resolve) => {
      const g = this.focus.push([btn], { autoFocus: true });
      btn.onClick = () => {
        this.focus.pop(g);
        resolve();
      };
    });
  }

  destroy() {
    for (const o of this.objs) o.destroy();
    this.objs = [];
  }
}
