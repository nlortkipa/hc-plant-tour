import { WALK_FRAMES, IDLE_FRAMES, TALK_FRAMES } from '../art/characters.js';
import { charScale } from '../art/textures.js';

// World units walked per full walk cycle (two steps). Tied to distance, not time, so the feet
// stay planted on the ground whatever the speed.
const STRIDE = 128;
const BREATH_MS = 3400;

/**
 * Drives a character sprite-sheet frame on a sprite: walk cycle, breathing, blinking, talking
 * and which way the character faces. Works on plain Images/Sprites and physics Sprites.
 *   new CharAnimator(sprite, { size: 1.6, auto: true })
 * With `auto`, it updates itself every frame; otherwise call update(delta, distanceMoved).
 */
export class CharAnimator {
  constructor(sprite, opts = {}) {
    this.sprite = sprite;
    this.size = opts.size ?? 1;
    this.dir = opts.dir || 'down';
    this.left = false;
    this.phase = 0;
    this.walking = false;
    this.talking = false;
    this.breathT = Math.random() * BREATH_MS;
    this.blinkIn = 800 + Math.random() * 3000;
    this.blinkLeft = 0;
    this.talkLeft = 0;
    this.talkFrame = 0;
    this.onStep = opts.onStep || null;
    this.lookAround = !!opts.lookAround;
    this.lookIn = 2000 + Math.random() * 5000;
    this.lookLeft = 0;
    // full setFrame once so the sprite takes the cell's size (not the whole sheet's)
    sprite.setFrame(this.frameName());
    this.applyScale();
    this.render();
    if (opts.auto) {
      const scene = sprite.scene;
      const tick = (time, delta) => this.update(delta, 0);
      scene.events.on('update', tick);
      sprite.once('destroy', () => scene.events.off('update', tick));
    }
  }

  /** Call after changing the sprite's texture (e.g. new equipment). */
  setTexture(key) {
    this.sprite.setTexture(key, this.frameName());
    this.applyScale();
    this.render();
  }

  applyScale() {
    this.sprite.setScale(charScale(this.sprite.scene, this.sprite.texture.key, this.size));
  }

  /** Face 'down' | 'up' | 'side' (side: `left` true to face left). */
  face(dir, left = this.left) {
    this.dir = dir;
    this.left = dir === 'side' ? left : false;
  }

  /** Face a world point from (x, y). */
  faceTowards(x, y, tx, ty) {
    const dx = tx - x;
    const dy = ty - y;
    if (Math.abs(dx) > Math.abs(dy) * 0.9) this.face('side', dx < 0);
    else this.face(dy < 0 ? 'up' : 'down');
  }

  setTalking(on) {
    this.talking = on;
    if (!on) this.talkFrame = 0;
  }

  /**
   * delta: ms since last frame. moved: world distance travelled this frame (0 when standing).
   */
  update(delta, moved = 0) {
    const wasWalking = this.walking;
    this.walking = moved > 0.05;
    if (this.walking) {
      if (!wasWalking) this.phase = 0.05; // start from a step, not mid-stride
      const before = this.phase;
      this.phase = (this.phase + moved / STRIDE) % 1;
      // a foot lands at phase 0.25 and 0.75
      if (this.onStep) {
        for (const at of [0.25, 0.75]) {
          const crossed = before <= this.phase ? before < at && this.phase >= at : before < at || this.phase >= at;
          if (crossed) this.onStep(at === 0.25 ? 0 : 1);
        }
      }
    } else {
      this.breathT = (this.breathT + delta) % BREATH_MS;
    }

    this.blinkIn -= delta;
    if (this.blinkLeft > 0) this.blinkLeft -= delta;
    else if (this.blinkIn <= 0) {
      this.blinkLeft = 130;
      // now and then a double blink
      this.blinkIn = Math.random() < 0.15 ? 260 : 1800 + Math.random() * 3800;
    }

    if (this.talking) {
      this.talkLeft -= delta;
      if (this.talkLeft <= 0) {
        this.talkLeft = 70 + Math.random() * 90;
        const r = Math.random();
        this.talkFrame = r < 0.3 ? 0 : r < 0.65 ? 1 : 2;
      }
    }

    if (this.lookAround && !this.talking) {
      if (this.lookLeft > 0) {
        this.lookLeft -= delta;
        if (this.lookLeft <= 0) this.face('down');
      } else if ((this.lookIn -= delta) <= 0) {
        this.lookIn = 4000 + Math.random() * 6000;
        this.lookLeft = 900 + Math.random() * 1400;
        this.face('side', Math.random() < 0.5);
      }
    }
    this.render();
  }

  has(name) {
    return this.sprite.texture.has(name);
  }

  frameName() {
    const d = this.dir;
    if (this.walking) {
      const f = `${d}_walk_${Math.floor(this.phase * WALK_FRAMES) % WALK_FRAMES}`;
      if (this.has(f)) return f;
    }
    if (this.talking && this.talkFrame > 0) {
      const f = `${d}_talk_${Math.min(TALK_FRAMES, this.talkFrame) - 1}`;
      if (this.has(f)) return f;
    }
    if (this.blinkLeft > 0 && this.has(`${d}_blink`)) return `${d}_blink`;
    // breathing: ease in and out through the idle frames
    const b = (1 - Math.cos((this.breathT / BREATH_MS) * Math.PI * 2)) / 2;
    const f = `${d}_idle_${Math.round(b * (IDLE_FRAMES - 1))}`;
    if (this.has(f)) return f;
    return this.has('down_idle_0') ? 'down_idle_0' : '__BASE';
  }

  render() {
    if (!this.has(`${this.dir}_idle_0`)) this.dir = 'down';
    const name = this.frameName();
    if (this.sprite.frame.name !== name) this.sprite.setFrame(name, false, false);
    this.sprite.setFlipX(this.dir === 'side' && this.left);
  }
}
