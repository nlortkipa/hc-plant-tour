import { W, H, CSS } from '../config.js';
import { txt, panel } from './theme.js';
import { Button } from './Button.js';
import { t } from '../i18n/index.js';
import { Settings } from '../state/Settings.js';
import { Sound } from '../audio/Sound.js';
import { GameState } from '../state/GameState.js';
import { PORTRAIT_SIZE } from '../art/textures.js';

const BOX_H = 188;
const BOX_Y = H - BOX_H - 12;

/**
 * Bottom dialog window with portrait, speaker name/title, typewriter text and choice buttons.
 * Promise based so scene scripts read top-to-bottom:  await dialog.say('crushing', [...]);
 */
export class DialogBox {
  constructor(scene, focus, opts = {}) {
    this.scene = scene;
    this.focus = focus;
    this.playerPortrait = opts.playerPortrait || null;
    this.depth = opts.depth ?? 1000;
    this.isOpen = false;
    this.build();
    this.setVisible(false);
  }

  build() {
    const s = this.scene;
    // full-screen catcher so taps advance dialog and never reach the world
    this.catcher = s.add.rectangle(0, 0, W, H, 0x000000, 0.001).setOrigin(0).setDepth(this.depth).setInteractive();
    this.catcher.on('pointerup', () => this.advance());
    this.bg = panel(s, 16, BOX_Y, W - 32, BOX_H, { fill: 0x16202c, border: 0x4a6386, radius: 16 }).setDepth(this.depth + 1);
    this.portrait = s.add.image(36 + 64, BOX_Y + 22 + 64, 'portrait_hs', 'idle').setDepth(this.depth + 2);
    this.portrait.setDisplaySize(PORTRAIT_SIZE, PORTRAIT_SIZE);
    // portraits blink, and move their mouth while a line is typed out
    this.blinkIn = 1500;
    this.portraitTimer = s.time.addEvent({ delay: 80, loop: true, callback: () => this.animatePortrait(80) });
    this.name = txt(s, 0, BOX_Y + 16, '', 21, { bold: true, color: CSS.accent }).setDepth(this.depth + 2);
    this.title = txt(s, 0, BOX_Y + 20, '', 16, { color: CSS.dim }).setDepth(this.depth + 2);
    this.body = txt(s, 0, BOX_Y + 52, '', 21, { wrap: 900, scalable: true, lineSpacing: 6 }).setDepth(this.depth + 2);
    this.more = txt(s, W - 52, BOX_Y + BOX_H - 34, '▼', 18, { color: CSS.accent }).setDepth(this.depth + 2);
    s.tweens.add({ targets: this.more, y: '+=5', yoyo: true, repeat: -1, duration: 420 });
    this.choiceButtons = [];
  }

  setVisible(v) {
    for (const o of [this.catcher, this.bg, this.portrait, this.name, this.title, this.body, this.more]) o.setVisible(v);
    this.isOpen = v;
  }

  setSpeaker(speaker) {
    if (speaker !== this.speaker) this.setTalking(false);
    this.speaker = speaker;
    let left = 40;
    if (speaker) {
      let key;
      let name;
      let title = '';
      if (speaker === 'player') {
        key = this.playerPortrait;
        name = GameState.data.name || t('npcs.player.name');
      } else {
        key = `portrait_${speaker}`;
        name = t(`npcs.${speaker}.name`);
        title = t(`npcs.${speaker}.title`);
      }
      if (key && this.scene.textures.exists(key)) {
        this.portrait.setTexture(key, this.scene.textures.get(key).has('idle') ? 'idle' : undefined).setVisible(true);
        this.portrait.setDisplaySize(PORTRAIT_SIZE, PORTRAIT_SIZE);
        left = 182;
      } else {
        this.portrait.setVisible(false);
      }
      this.name.setText(name).setVisible(true);
      this.title.setText(title ? `· ${title}` : '').setVisible(true);
    } else {
      this.portrait.setVisible(false);
      this.name.setVisible(false);
      this.title.setVisible(false);
    }
    this.name.setX(left);
    this.title.setX(left + this.name.width + 10);
    this.body.setX(left);
    this.body.setY(speaker ? BOX_Y + 52 : BOX_Y + 28);
    this.body.setWordWrapWidth(W - 32 - left - 40, true);
  }

  /** Tell the scene who is talking, so a character in the world can move their mouth too. */
  setTalking(on) {
    if (this.talkingNow === on) return;
    this.talkingNow = on;
    this.scene.events.emit('dialog-talk', this.speaker, on);
  }

  animatePortrait(dt) {
    const p = this.portrait;
    if (!p.visible || !p.texture.has('talk_0')) return;
    let frame = 'idle';
    if (this.talkingNow && this.speaker !== 'player') {
      const r = Math.random();
      frame = r < 0.3 ? 'idle' : r < 0.65 ? 'talk_0' : 'talk_1';
    } else {
      this.blinkIn -= dt;
      if (this.blinkIn <= 0) {
        frame = 'blink';
        if (this.blinkIn < -110) this.blinkIn = 1800 + Math.random() * 3500;
      }
    }
    if (p.frame.name !== frame) p.setFrame(frame, false, false);
  }

  fitBody() {
    // shrink font if a long line (or large text setting) would overflow the box
    const maxH = BOX_Y + BOX_H - 14 - this.body.y;
    let size = Math.round(21 * Settings.get('textScale'));
    this.body.setFontSize(size);
    while (this.body.height > maxH && size > 14) {
      size -= 1;
      this.body.setFontSize(size);
    }
  }

  showLine(text) {
    this.full = text;
    this.body.setText(text);
    this.fitBody();
    this.shownAt = this.scene.time.now;
    if (this.typer) this.typer.remove();
    if (this.talkTimer) this.talkTimer.remove();
    this.talkTimer = null;
    if (Settings.get('textSpeed') === 'instant') {
      this.typing = false;
      this.more.setVisible(true);
      if (!this.choosing) {
        this.setTalking(true);
        this.talkTimer = this.scene.time.delayedCall(Math.min(2500, 300 + text.length * 25), () => this.setTalking(false));
      }
      return;
    }
    this.setTalking(true);
    this.typing = true;
    this.more.setVisible(false);
    let i = 0;
    this.body.setText('');
    const step = Math.max(1, Math.ceil(text.length / 180));
    this.typer = this.scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        i += step;
        this.body.setText(text.slice(0, i));
        if (i % 6 === 0) Sound.play('type');
        if (i >= text.length) this.finishTyping();
      },
    });
  }

  finishTyping() {
    if (this.typer) this.typer.remove();
    this.typer = null;
    this.typing = false;
    this.body.setText(this.full);
    this.more.setVisible(!this.choosing);
    if (this.talkTimer) this.talkTimer.remove();
    this.talkTimer = null;
    this.setTalking(false);
  }

  advance() {
    if (!this.isOpen || this.choosing) return;
    if (this.scene.time.now - (this.shownAt || 0) < 140) return;
    if (this.typing) {
      this.finishTyping();
      return;
    }
    const r = this.resolveLine;
    this.resolveLine = null;
    if (r) {
      Sound.play('click');
      r();
    }
  }

  open() {
    if (!this.isOpen) {
      this.setVisible(true);
      this.group = this.focus.push([], {
        keys: (e) => {
          if (this.choosing) {
            const n = parseInt(e.key, 10);
            if (n >= 1 && n <= this.choiceButtons.length) {
              this.choiceButtons[n - 1].activate();
              return true;
            }
            if (['Enter', 'NumpadEnter', 'Space'].includes(e.code) && this.group.index < 0) return true;
            return false;
          }
          if (['Space', 'Enter', 'NumpadEnter', 'KeyE'].includes(e.code)) {
            this.advance();
            return true;
          }
          return false;
        },
      });
    }
  }

  /** Show one or more lines; resolves after the last one is dismissed. */
  async say(speaker, lines) {
    const arr = Array.isArray(lines) ? lines : [lines];
    this.open();
    this.setSpeaker(speaker);
    for (const line of arr) {
      this.showLine(line);
      await new Promise((res) => {
        this.resolveLine = res;
      });
    }
  }

  /** Show a prompt with choice buttons; resolves with the chosen option id. */
  async choose(speaker, prompt, options) {
    this.open();
    this.setSpeaker(speaker);
    this.choosing = true;
    this.showLine(prompt);
    this.finishTyping();
    this.more.setVisible(false);
    const width = 860;
    let y = BOX_Y - 12;
    const buttons = [];
    // build bottom-up
    for (let i = options.length - 1; i >= 0; i--) {
      const o = options[i];
      const b = new Button(this.scene, W / 2, 0, `${i + 1}.  ${o.text}`, {
        width,
        size: 19,
        variant: 'choice',
        align: 'left',
        scalable: true,
      });
      b.setY(y - b.h / 2);
      y -= b.h + 10;
      b.setDepth(this.depth + 3);
      buttons.unshift(b);
    }
    this.choiceButtons = buttons;
    this.group.items = buttons;
    this.group.index = -1;
    buttons.forEach((b, i) => b.setAlpha(0).setX(W / 2 + 20) && this.scene.tweens.add({ targets: b, alpha: 1, x: W / 2, delay: i * 50, duration: 160 }));
    const id = await new Promise((res) => {
      buttons.forEach((b, i) => {
        b.onClick = () => res(options[i].id);
      });
    });
    for (const b of buttons) b.destroy();
    this.choiceButtons = [];
    this.group.items = [];
    this.group.index = -1;
    this.choosing = false;
    return id;
  }

  hide() {
    if (this.typer) this.typer.remove();
    this.typer = null;
    if (this.talkTimer) this.talkTimer.remove();
    this.talkTimer = null;
    this.setTalking(false);
    this.resolveLine = null;
    this.setVisible(false);
    if (this.group) this.focus.pop(this.group);
    this.group = null;
  }

  destroy() {
    this.hide();
    this.portraitTimer.remove();
    for (const o of [this.catcher, this.bg, this.portrait, this.name, this.title, this.body, this.more]) o.destroy();
  }
}

/** Ask a scored question (options in random order). Returns true if the first answer was correct. */
export async function askQuestion(dialog, speaker, textKey, q, { onWrong, retry = true } = {}) {
  const opts = shuffle(q.options.map((id) => ({ id, text: t(`${textKey}.options.${id}`) })));
  let first = true;
  let firstCorrect = false;
  for (;;) {
    const pick = await dialog.choose(speaker, t(`${textKey}.prompt`), opts);
    const ok = pick === q.correct;
    if (first) firstCorrect = ok;
    if (ok) {
      Sound.play('correct');
      await dialog.say(speaker, `${t('ui.correct')} ${t(`${textKey}.explain`)}`);
      return firstCorrect;
    }
    Sound.play('wrong');
    if (first && onWrong) onWrong();
    first = false;
    await dialog.say(speaker, `${t('ui.wrong')}. ${t(`${textKey}.explain`)}`);
    if (!retry) return false;
    await dialog.say(speaker, t('dialog.wrongRetry'));
  }
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
