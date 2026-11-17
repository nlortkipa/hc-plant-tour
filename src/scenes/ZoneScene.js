import Phaser from 'phaser';
import { W, H, HUD_H, CSS, COLORS, SCORING } from '../config.js';
import { t, tl } from '../i18n/index.js';
import { ZONES, TOUR_ZONES, nextLocation } from '../data/zones.js';
import { PPE_BY_ID, HAZARD_PPE, checkPpe } from '../data/ppe.js';
import { GameState } from '../state/GameState.js';
import { Player } from '../world/Player.js';
import { DialogBox, askQuestion } from '../ui/DialogBox.js';
import { FocusManager } from '../ui/Focus.js';
import { Button } from '../ui/Button.js';
import { txt, panel, blocker } from '../ui/theme.js';
import { toast, floatText } from '../ui/Toast.js';
import { playerTexture, ensurePlayerPortrait } from '../art/textures.js';
import { Router } from '../Router.js';
import { Sound } from '../audio/Sound.js';

const RANGE = 78;

export class ZoneScene extends Phaser.Scene {
  constructor() {
    super('Zone');
  }

  init(data) {
    this.zoneId = data.id || 'kpp';
    this.zone = ZONES[this.zoneId];
    this.zs = GameState.zone(this.zoneId);
    this.busy = false;
    this.pending = null;
    this.worn = new Set();
  }

  create() {
    const L = this.zone.layout;
    GameState.setLocation(this.zoneId);
    this.focus = new FocusManager(this);
    this.add.image(0, 0, `bg_${this.zoneId}`).setOrigin(0).setDepth(-10);
    const indoor = L.backdrop === 'hall' || L.backdrop === 'room';
    this.physics.world.setBounds(4, indoor ? 186 : 200, W - 8, H - (indoor ? 186 : 200) - 4);

    this.buildObstacles();
    this.buildDecor();

    // zone PPE already put on earlier (revisit)
    if (this.zs.ppeDone) for (const hz of this.zone.hazards) this.worn.add(HAZARD_PPE[hz]);

    this.player = new Player(this, L.spawn.x, L.spawn.y, this.playerKey());
    this.physics.add.collider(this.player, this.solids);
    this.updateWorn();

    // NPC
    const np = L.npcPos;
    this.npc = this.add.image(np.x, np.y, `npc_${this.zone.npc}`).setOrigin(0.5, 1).setDepth(np.y);
    this.tweens.add({ targets: this.npc, scaleY: 1.02, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.easeInOut' });

    this.dialog = new DialogBox(this, this.focus, { playerPortrait: ensurePlayerPortrait(this, GameState.data.avatar, this.visibleItems()) });
    this.buildInteractables();
    this.buildPromptUi();
    this.setupInput();

    this.banner(t(`locations.${this.zoneId}`));
    this.time.delayedCall(700, () => this.onEnter());
  }

  // ------------------------------------------------------------------ world building
  buildObstacles() {
    const L = this.zone.layout;
    this.solids = [];
    for (const p of L.props) {
      if (p.solid === false) continue;
      this.solids.push(this.addSolid(p.x, p.y, p.w, p.h));
    }
    if (this.zoneId === 'kpp') {
      const ts = L.turnstile;
      this.turnstileGfx = this.add.graphics().setDepth(ts.y + ts.h);
      this.drawTurnstile(GameState.data.kppCleared);
      if (!GameState.data.kppCleared) {
        this.gate = this.addSolid(ts.x, ts.y, ts.w, ts.h);
        this.solids.push(this.gate);
      }
    }
  }

  addSolid(x, y, w, h) {
    const z = this.add.zone(x + w / 2, y + h / 2, w, h);
    this.physics.add.existing(z, true);
    return z;
  }

  drawTurnstile(open) {
    const ts = this.zone.layout.turnstile;
    const g = this.turnstileGfx;
    g.clear();
    g.fillStyle(0x5f6b75, 1);
    g.fillRect(ts.x + ts.w / 2 - 8, ts.y - 20, 16, 24);
    g.fillRect(ts.x + ts.w / 2 - 8, ts.y + ts.h - 6, 16, 24);
    g.fillStyle(open ? COLORS.good : COLORS.bad, 1);
    g.fillCircle(ts.x + ts.w / 2, ts.y - 26, 6);
    if (!open) {
      g.fillStyle(0xd0d4d8, 1);
      for (let i = 0; i < 3; i++) g.fillRect(ts.x + ts.w / 2 - 3, ts.y + 6 + i * 24, 6, 18);
      g.lineStyle(4, 0xe5534b, 1);
      g.lineBetween(ts.x + ts.w / 2, ts.y, ts.x + ts.w / 2, ts.y + ts.h);
    }
  }

  buildDecor() {
    const id = this.zoneId;
    const belt = (x, y, w, h, speed = 1.2) => {
      const ts = this.add.tileSprite(x, y, w, h, 'belt').setOrigin(0).setDepth(-5);
      const fn = () => {
        ts.tilePositionX -= speed;
      };
      this.events.on('update', fn);
      this.events.once('shutdown', () => this.events.off('update', fn));
    };
    const dust = (x, y, w, h, tint = 0xd8d2c0) => {
      this.add
        .particles(0, 0, 'dust', {
          x: { min: x, max: x + w },
          y: { min: y, max: y + h },
          lifespan: 3000,
          speedX: { min: -12, max: 12 },
          speedY: { min: -18, max: -4 },
          scale: { start: 1.5, end: 4 },
          alpha: { start: 0.35, end: 0 },
          tint,
          frequency: 140,
        })
        .setDepth(900);
    };
    const traffic = (lanes) => {
      for (const lane of lanes) {
        const spr = this.add.image(lane.dir > 0 ? -200 : W + 200, lane.y, lane.key).setOrigin(0.5, 1).setDepth(lane.y);
        const run = () => {
          spr.x = lane.dir > 0 ? -200 : W + 200;
          this.tweens.add({
            targets: spr,
            x: lane.dir > 0 ? W + 200 : -200,
            duration: lane.duration,
            delay: lane.delay + Math.random() * 1500,
            onComplete: run,
          });
        };
        run();
      }
    };

    if (id === 'crushing') {
      belt(686, 204, 358, 28);
      dust(380, 120, 300, 160);
      dust(1040, 120, 220, 120);
      traffic([
        { key: 'truck_dumper_l', y: 628, dir: -1, duration: 7000, delay: 0 },
        { key: 'truck_dumper_r', y: 700, dir: 1, duration: 8000, delay: 2500 },
      ]);
    } else if (id === 'rawmill') {
      belt(36, 258, 248, 24);
      dust(290, 120, 270, 160);
    } else if (id === 'kiln') {
      const glow = this.add.image(1130, 215, 'glow').setScale(3.2).setTint(0xff8a2a).setBlendMode(Phaser.BlendModes.ADD).setDepth(-4);
      this.tweens.add({ targets: glow, alpha: { from: 0.55, to: 1 }, scale: { from: 3, to: 3.5 }, yoyo: true, repeat: -1, duration: 700 });
      this.add
        .particles(0, 0, 'dust', {
          x: { min: 280, max: 1120 },
          y: { min: 160, max: 200 },
          lifespan: 1800,
          speedY: { min: -30, max: -12 },
          scale: { start: 1, end: 3 },
          alpha: { start: 0.18, end: 0 },
          tint: 0xffa040,
          frequency: 90,
        })
        .setDepth(-3);
      // rotating tyre highlight
      for (const fx of [0.15, 0.5, 0.85]) {
        const r = this.add.rectangle(250 + 880 * fx, 175, 24, 6, 0xffffff, 0.35).setDepth(-4);
        this.tweens.add({ targets: r, y: 255, duration: 1600, repeat: -1 });
      }
    } else if (id === 'ccr') {
      const lights = [];
      for (let i = 0; i < 18; i++) {
        lights.push(this.add.rectangle(170 + Math.random() * 940, 90 + Math.random() * 120, 10, 6, Math.random() > 0.8 ? 0xe5534b : 0x3fb950).setDepth(-4));
      }
      this.time.addEvent({ delay: 400, loop: true, callback: () => lights.forEach((l) => l.setAlpha(Math.random() > 0.3 ? 1 : 0.2)) });
    } else if (id === 'cementmill') {
      dust(220, 140, 560, 120);
      const spin = this.add.image(910, 92, 'disk_fan').setDepth(-4);
      this.tweens.add({ targets: spin, angle: 360, duration: 900, repeat: -1 });
    } else if (id === 'silos') {
      dust(140, 300, 980, 50, 0xe6e6e6);
    } else if (id === 'packing') {
      belt(376, 240, 288, 24, 1.8);
      dust(110, 200, 260, 100);
      // robot arm
      const arm = this.add.container(850, 195).setDepth(-4);
      const ag = this.add.graphics();
      ag.fillStyle(0xf08a24, 1);
      ag.fillRoundedRect(-12, -12, 110, 24, 10);
      ag.fillStyle(0x3a424a, 1);
      ag.fillCircle(0, 0, 14);
      ag.fillRoundedRect(96, -20, 18, 40, 4);
      const bag = this.add.image(108, 0, 'bag').setDisplaySize(34, 34);
      arm.add([ag, bag]);
      this.tweens.add({ targets: arm, angle: { from: -150, to: 30 }, yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.easeInOut', hold: 250, repeatDelay: 250 });
    } else if (id === 'logistics') {
      traffic([
        { key: 'truck_flatbed_l', y: 632, dir: -1, duration: 8000, delay: 0 },
        { key: 'truck_tanker_r', y: 712, dir: 1, duration: 9000, delay: 3000 },
      ]);
    }
  }

  buildInteractables() {
    const L = this.zone.layout;
    this.items = [];
    const npcItem = {
      kind: 'talk',
      x: L.npcPos.x,
      y: L.npcPos.y + 20,
      standX: L.npcPos.x,
      standY: L.npcPos.y + 34,
      label: () => t('interact.talk'),
      action: () => this.talkToNpc(),
      markerY: L.npcPos.y - 100,
      marker: () => (this.npcNeedsTalk() ? 'mk_talk' : null),
      hit: { x: L.npcPos.x, y: L.npcPos.y - 40, w: 60, h: 90 },
    };
    this.items.push(npcItem);
    for (const f of L.facts) {
      this.items.push({
        kind: 'info',
        id: f.id,
        x: f.x,
        y: f.y,
        standX: f.x,
        standY: f.y + 8,
        label: () => t('interact.look'),
        action: () => this.showFact(f.id),
        markerY: f.y - 50,
        marker: () => 'mk_info',
        dim: () => this.zs.facts.includes(f.id),
        hit: { x: f.x, y: f.y - 40, w: 60, h: 70 },
      });
    }
    if (this.zoneId === 'kpp') {
      this.items.push({
        kind: 'wardrobe',
        x: L.wardrobe.x,
        y: L.wardrobe.y,
        standX: L.wardrobe.x,
        standY: L.wardrobe.y + 20,
        label: () => t('interact.wardrobe'),
        action: () => this.backToWardrobe(),
        markerY: L.wardrobe.y - 60,
        marker: () => (GameState.data.kppCleared ? null : 'mk_info'),
        enabled: () => !GameState.data.kppCleared,
        hit: { x: L.wardrobe.x, y: L.wardrobe.y - 40, w: 70, h: 80 },
      });
    }
    this.items.push({
      kind: 'exit',
      x: L.exit.x,
      y: L.exit.y,
      standX: L.exit.x - 10,
      standY: L.exit.y,
      label: () => (this.zoneId === 'logistics' ? t('interact.exitFinal') : t('interact.exit')),
      action: () => this.tryExit(),
      markerY: L.exit.y - 70,
      marker: () => (this.zoneComplete() ? 'mk_exit' : 'mk_lock'),
      hit: { x: L.exit.x, y: L.exit.y - 30, w: 70, h: 90 },
    });

    for (const it of this.items) {
      it.markerImg = this.add.image(it.x, it.markerY, 'mk_info').setDepth(800);
      this.tweens.add({ targets: it.markerImg, y: it.markerY - 6, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.easeInOut' });
      const z = this.add.zone(it.hit.x, it.hit.y, it.hit.w, it.hit.h).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => this.tapItem(it));
      it.zone = z;
    }
    this.refreshMarkers();
  }

  refreshMarkers() {
    for (const it of this.items) {
      const key = it.marker();
      if (!key) {
        it.markerImg.setVisible(false);
        continue;
      }
      it.markerImg.setTexture(key).setVisible(true).setAlpha(it.dim && it.dim() ? 0.5 : 1);
    }
  }

  buildPromptUi() {
    this.prompt = txt(this, 0, 0, '', 16, { bold: true, color: '#fff' }).setOrigin(0.5, 1).setDepth(851);
    this.promptBg = this.add.graphics().setDepth(850);
    this.actionBtn = new Button(this, W - 110, H - 56, `${t('interact.action')} (E)`, {
      width: 190,
      height: 56,
      variant: 'primary',
      bold: true,
      onClick: () => this.interact(),
    }).setDepth(2100);
    this.actionBtn.setVisible(false);
  }

  setupInput() {
    this.input.keyboard.on('keydown-E', () => {
      if (!this.busy) this.interact();
    });
    this.input.on('pointerdown', (p, over) => {
      if (this.busy || over.length) return;
      this.pending = null;
      this.dragWalk = true;
      this.player.walkTo(p.worldX, p.worldY);
    });
    this.input.on('pointermove', (p) => {
      if (this.busy || !p.isDown || !this.dragWalk) return;
      this.player.walkTo(p.worldX, p.worldY);
    });
    this.input.on('pointerup', () => {
      this.dragWalk = false;
    });
  }

  // ------------------------------------------------------------------ equipment
  visibleItems() {
    const ward = GameState.data.wardrobe || [];
    if (this.zoneId === 'kpp' && !GameState.data.kppCleared) return ward;
    return ward.filter((id) => !PPE_BY_ID[id]?.carry || this.worn.has(id));
  }

  playerKey() {
    return playerTexture(this, GameState.data.avatar, this.visibleItems());
  }

  updateWorn() {
    GameState.worn = this.visibleItems();
    this.player.setLookTexture(this.playerKey());
    if (this.dialog) this.dialog.playerPortrait = ensurePlayerPortrait(this, GameState.data.avatar, this.visibleItems());
  }

  // ------------------------------------------------------------------ state helpers
  zoneComplete() {
    if (this.zoneId === 'kpp') return GameState.data.kppCleared;
    return this.zs.missionDone;
  }

  npcNeedsTalk() {
    return !this.zoneComplete();
  }

  award(key, earned, max, topic) {
    if (GameState.award(key, earned, max, topic)) {
      Sound.play('points');
      floatText(this, this.player.x, this.player.y - 90, t('ui.points', { n: Math.max(0, Math.min(max, earned)) }), earned > 0 ? CSS.good : CSS.dim);
    }
  }

  // ------------------------------------------------------------------ loop
  update(time, delta) {
    this.player.update(time, delta);
    this.npc.setFlipX(this.player.x < this.npc.x);

    // nearest interactable
    let best = null;
    let bestD = Infinity;
    for (const it of this.items) {
      if (it.enabled && !it.enabled()) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, it.x, it.y);
      if (d < RANGE && d < bestD) {
        best = it;
        bestD = d;
      }
    }
    this.near = best;
    this.promptBg.clear();
    if (best && !this.busy) {
      this.prompt.setText(`[E] ${best.label()}`).setPosition(best.x, best.markerY - 22).setVisible(true);
      const b = this.prompt.getBounds();
      this.promptBg.fillStyle(0x0d141d, 0.85);
      this.promptBg.fillRoundedRect(b.x - 8, b.y - 4, b.width + 16, b.height + 8, 8);
      this.actionBtn.setVisible(true);
    } else {
      this.prompt.setVisible(false);
      this.actionBtn.setVisible(false);
    }

    if (this.pending && !this.busy) {
      const it = this.pending;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, it.x, it.y) < RANGE) {
        this.pending = null;
        this.player.freeze(false);
        this.player.target = null;
        this.run(it.action);
      } else if (!this.player.target) {
        this.pending = null;
      }
    }

    // walking-triggered safety event (logistics: phone call)
    const ev = this.zone.event;
    if (ev && !this.zs.eventDone && !this.busy) {
      const r = ev.trigger;
      if (this.player.x > r.x && this.player.x < r.x + r.w && this.player.y > r.y && this.player.y < r.y + r.h) this.run(() => this.phoneEvent());
    }
  }

  tapItem(it) {
    if (this.busy) return;
    if (it.enabled && !it.enabled()) return;
    const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, it.x, it.y);
    if (d < RANGE) {
      this.run(it.action);
    } else {
      this.pending = it;
      this.player.walkTo(it.standX, it.standY);
    }
  }

  interact() {
    if (this.busy || !this.near) return;
    this.run(this.near.action);
  }

  /** Run an async script with the player frozen and the HUD prompt hidden. */
  async run(fn) {
    if (this.busy) return;
    this.busy = true;
    this.player.freeze(true);
    try {
      await fn();
    } catch (e) {
      console.error(e);
    }
    if (!this.sys.isActive() && !this.sys.isPaused()) return;
    this.dialog.hide();
    this.busy = false;
    this.player.freeze(false);
    this.refreshMarkers();
  }

  banner(text) {
    const b = txt(this, W / 2, HUD_H + 70, text, 34, { bold: true, color: CSS.accent, stroke: '#0b1118', strokeThickness: 6 })
      .setOrigin(0.5)
      .setDepth(4000)
      .setAlpha(0);
    this.tweens.add({ targets: b, alpha: 1, y: HUD_H + 60, duration: 400, hold: 1400, yoyo: true, onComplete: () => b.destroy() });
  }

  // ------------------------------------------------------------------ flows
  async onEnter() {
    if (this.zoneId === 'kpp') {
      if (!GameState.data.kppCleared && !this.zs.introDone) {
        this.zs.introDone = true;
        GameState.save();
        await this.run(() => this.dialog.say('hs', tl('zones.kpp.welcome')));
      }
      return;
    }
    if (this.zone.hazards.length && !this.zs.ppeDone) await this.run(() => this.ppePrompt());
  }

  async talkToNpc() {
    if (this.zoneId === 'kpp') return this.kppFlow();
    const id = this.zoneId;
    const npc = this.zone.npc;
    const base = `zones.${id}`;
    if (this.zs.missionDone) {
      await this.dialog.say(npc, tl(`${base}.revisit`));
      return;
    }
    if (!this.zs.introDone) {
      await this.dialog.say(npc, tl(`${base}.intro`));
      await this.dialog.say(npc, tl(`${base}.safety`));
      this.zs.introDone = true;
      GameState.save();
    }
    if (!this.zs.questionDone) {
      const q = this.zone.question;
      const ok = await askQuestion(this.dialog, npc, `${base}.question`, q, { onWrong: () => GameState.mistake(q.topic) });
      this.award(`${id}.question`, ok ? SCORING.zoneQuestion.max : 0, SCORING.zoneQuestion.max, q.topic);
      this.zs.questionDone = true;
      GameState.save();
    }
    await this.dialog.say(npc, t(`${base}.missionIntro`));
    const pick = await this.dialog.choose(npc, t('dialog.askReady'), [
      { id: 'go', text: t('ui.ready') },
      { id: 'later', text: t('ui.later') },
    ]);
    if (pick !== 'go') {
      await this.dialog.say(npc, t('dialog.comeBack'));
      return;
    }
    this.dialog.hide();
    const m = this.zone.mission;
    const result = await Router.runMission(this, m.scene, { ...m, zoneId: id });
    const mistakes = result.mistakes || 0;
    const S = SCORING.mission;
    this.award(`${id}.mission`, S.max - S.perMistake * mistakes, S.max, m.topic);
    const topics = result.topics || (mistakes ? { [m.topic]: mistakes } : {});
    for (const [topic, n] of Object.entries(topics)) GameState.mistake(topic, n);
    this.zs.missionDone = true;
    GameState.save();
    Sound.play('unlock');
    await this.dialog.say(npc, [t('dialog.missionResult', { n: mistakes }), ...tl(`${base}.outro`)]);
    const next = nextLocation(id);
    if (next) toast(this, t('ui.unlocked', { name: t(`locations.${next}`) }), 'good', 2600);
  }

  async kppFlow() {
    const d = GameState.data;
    if (d.kppCleared) {
      await this.dialog.say('hs', tl('zones.kpp.revisit'));
      return;
    }
    const check = checkPpe(d.wardrobe);
    if (!check.ok) {
      const errors = check.missing.length + check.wrong.length;
      d.ppeErrors = (d.ppeErrors || 0) + errors;
      GameState.mistake('ppe', errors);
      Sound.play('wrong');
      // A wrong item already explains what belongs in its slot (sneakers → boots), so skip the
      // matching "missing" message to avoid saying the same thing twice.
      const wrongSlots = new Set(check.wrong.map((id) => PPE_BY_ID[id].slot));
      const lines = [
        ...check.wrong.map((id) => t(`zones.kpp.checkFail.${id}.wrong`)),
        ...check.missing.filter((id) => !wrongSlots.has(PPE_BY_ID[id].slot)).map((id) => t(`zones.kpp.checkFail.${id}.missing`)),
      ];
      lines[0] = t('zones.kpp.checkFailGreeting', { message: lines[0] });
      await this.dialog.say('hs', lines);
      await this.dialog.choose('hs', t('zones.kpp.checkFailOutro'), [{ id: 'back', text: t('zones.kpp.backToWardrobe') }]);
      this.dialog.hide();
      Router.goTo('wardrobe');
      return new Promise(() => {}); // scene is being replaced
    }
    Sound.play('correct');
    const S = SCORING.kppPpe;
    this.award('kpp.ppe', S.max - S.perMistake * (d.ppeErrors || 0), S.max, 'ppe');
    await this.dialog.say('hs', t('zones.kpp.checkOk'));
    await this.dialog.say('hs', tl('zones.kpp.rules'));
    const q = this.zone.question;
    const ok = await askQuestion(this.dialog, 'hs', 'zones.kpp.question', q, { onWrong: () => GameState.mistake(q.topic) });
    this.award('kpp.question', ok ? SCORING.kppQuestion.max : 0, SCORING.kppQuestion.max, q.topic);
    d.kppCleared = true;
    GameState.save();
    // open the turnstile, stow carried PPE
    if (this.gate) {
      this.gate.destroy();
      this.solids = this.solids.filter((s) => s !== this.gate);
      this.gate = null;
    }
    this.drawTurnstile(true);
    this.updateWorn();
    Sound.play('unlock');
    await this.dialog.say('hs', tl('zones.kpp.outro'));
    toast(this, t('ui.unlocked', { name: t('locations.crushing') }), 'good', 2600);
  }

  async showFact(id) {
    const base = `zones.${this.zoneId}.facts.${id}`;
    if (!this.zs.facts.includes(id)) {
      this.zs.facts.push(id);
      GameState.save();
    }
    await this.overlay((close) => {
      const w = 640;
      const objs = [];
      const title = txt(this, W / 2, 0, t(`${base}.title`), 26, { bold: true, color: CSS.accent }).setOrigin(0.5, 0);
      const body = txt(this, W / 2, 0, t(`${base}.body`), 20, { wrap: w - 70, scalable: true, align: 'left', lineSpacing: 7 }).setOrigin(0.5, 0);
      const h = 110 + title.height + body.height + 70;
      const y = (H - h) / 2 + 20;
      const bg = panel(this, (W - w) / 2, y, w, h, { fill: 0x16202c, border: COLORS.info });
      const icon = this.add.image((W - w) / 2 + 40, y + 40, 'mk_info');
      title.setY(y + 26);
      body.setY(y + 40 + title.height + 16);
      const count = txt(this, (W + w) / 2 - 24, y + 24, t('facts.readCount', { n: this.zs.facts.length, t: this.zone.layout.facts.length }), 14, { color: CSS.dim }).setOrigin(1, 0);
      const btn = new Button(this, W / 2, y + h - 40, t('ui.close'), { width: 200, onClick: close });
      objs.push(bg, icon, title, body, count, btn);
      return { objs, focus: [btn] };
    });
  }

  /** Generic in-scene modal. build(close) returns { objs, focus }. Resolves when closed. */
  overlay(build) {
    return new Promise((resolve) => {
      const block = blocker(this, 0.55).setDepth(3000);
      let group;
      let objs = [];
      const close = (val) => {
        Sound.play('close');
        this.focus.pop(group);
        block.destroy();
        objs.forEach((o) => o.destroy());
        resolve(val);
      };
      Sound.play('open');
      const res = build(close);
      objs = res.objs;
      // Stack in array order (not creation order): builders may create text before
      // the panel behind it, e.g. to measure the text and size the panel to fit.
      objs.forEach((o, i) => o.setDepth(3001 + i * 0.01));
      group = this.focus.push(res.focus || [], { onCancel: res.cancellable === false ? null : () => close() });
    });
  }

  async ppePrompt() {
    const required = new Set(this.zone.hazards.map((h) => HAZARD_PPE[h]));
    let attempts = 0;
    for (;;) {
      const chosen = await this.overlay((close) => {
        const w = 720;
        const h = 470;
        const x = (W - w) / 2;
        const y = (H - h) / 2 + 10;
        const objs = [panel(this, x, y, w, h, { fill: 0x16202c, border: COLORS.accent })];
        objs.push(txt(this, W / 2, y + 22, t('hazards.title', { name: t(`locations.${this.zoneId}`) }), 24, { bold: true, color: CSS.accent }).setOrigin(0.5, 0));
        // hazard signs
        const signs = this.zone.hazards;
        signs.forEach((hz, i) => {
          const sx = W / 2 + (i - (signs.length - 1) / 2) * 170;
          objs.push(this.add.image(sx, y + 120, `warn_${hz}`).setDisplaySize(96, 96));
          objs.push(txt(this, sx, y + 176, t(`hazards.${hz}`), 17, { bold: true }).setOrigin(0.5, 0));
        });
        objs.push(txt(this, W / 2, y + 214, t('hazards.prompt'), 18, { wrap: w - 60, align: 'center', color: CSS.dim }).setOrigin(0.5, 0));
        const sel = new Set();
        const toggles = ['earmuffs', 'respirator'].map((id, i) => {
          const b = new Button(this, W / 2 + (i ? 165 : -165), y + 320, t(`ppe.${id}.name`), {
            width: 310,
            height: 70,
            size: 16,
            icon: `ppe_${id}`,
            iconSize: 46,
            align: 'left',
          });
          b.onClick = () => {
            if (sel.has(id)) sel.delete(id);
            else sel.add(id);
            b.setVariant(sel.has(id) ? 'selected' : 'secondary');
          };
          return b;
        });
        const ok = new Button(this, W / 2, y + h - 46, t('hazards.confirm'), { width: 260, variant: 'primary', bold: true, onClick: () => close(new Set(sel)) });
        objs.push(...toggles, ok);
        return { objs, focus: [...toggles, ok], cancellable: false };
      });
      const msgs = [];
      if (required.has('earmuffs') && !chosen.has('earmuffs')) msgs.push(t('hazards.missingEarmuffs'));
      if (required.has('respirator') && !chosen.has('respirator')) msgs.push(t('hazards.missingRespirator'));
      if (!required.has('earmuffs') && chosen.has('earmuffs')) msgs.push(t('hazards.extraEarmuffs'));
      if (!required.has('respirator') && chosen.has('respirator')) msgs.push(t('hazards.extraRespirator'));
      if (!msgs.length) {
        for (const id of required) this.worn.add(id);
        this.updateWorn();
        Sound.play('correct');
        toast(this, t('hazards.good'), 'good');
        const S = SCORING.zonePpe;
        this.award(`${this.zoneId}.ppe`, S.max - S.perMistake * attempts, S.max, 'ppe');
        this.zs.ppeDone = true;
        GameState.save();
        return;
      }
      attempts++;
      GameState.mistake('ppe');
      Sound.play('wrong');
      await this.dialog.say(this.zone.npc, [...msgs, t('hazards.retry')]);
      this.dialog.hide();
    }
  }

  async phoneEvent() {
    const ev = this.zone.event;
    Sound.play('phone');
    this.time.delayedCall(500, () => Sound.play('phone'));
    const ok = await askQuestion(this.dialog, null, `zones.${this.zoneId}.event`, ev, { onWrong: () => GameState.mistake(ev.topic), retry: true });
    this.award(`${this.zoneId}.event`, ok ? SCORING.event.max : 0, SCORING.event.max, ev.topic);
    this.zs.eventDone = true;
    GameState.save();
  }

  async tryExit() {
    if (!this.zoneComplete()) {
      Sound.play('wrong');
      const msg = this.zoneId === 'kpp' ? t('interact.turnstileLocked') : t('interact.exitLocked');
      toast(this, msg, 'bad', 2200);
      return;
    }
    const next = nextLocation(this.zoneId);
    if (next === 'final' && !TOUR_ZONES.every((z) => GameState.isComplete(z))) {
      toast(this, t('final.locked'), 'bad', 2200);
      return;
    }
    this.cameras.main.fadeOut(300, 0, 0, 0);
    await new Promise((r) => this.time.delayedCall(320, r));
    Router.goTo(next);
    await new Promise(() => {});
  }

  async backToWardrobe() {
    if (GameState.data.kppCleared) return;
    Router.goTo('wardrobe');
    await new Promise(() => {});
  }
}
