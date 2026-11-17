import Phaser from 'phaser';
import { Sound } from '../audio/Sound.js';
import { CharAnimator } from './CharAnimator.js';

const SPEED = 230;
const ACCEL_MS = 70; // time constant for speeding up
const DECEL_MS = 45; // ... and for stopping
const ARRIVE_DIST = 26; // slow down over the last few units of a tap-to-walk
const FOOT_W = 26;
const FOOT_H = 14;

/**
 * Top-down walking player. Keyboard (arrows/WASD) or pointer: tap to walk to a point,
 * hold to steer towards the pointer. Origin is at the feet; the physics body covers the feet only.
 * Options: { dust: true } puffs a little dust from the ground at every step.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture, opts = {}) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.anim = new CharAnimator(this, { onStep: (foot) => this.onStep(foot) });
    this.fitBody();
    this.body.setCollideWorldBounds(true);
    this.frozen = false;
    this.target = null;
    this.vel = new Phaser.Math.Vector2();
    this.last = new Phaser.Math.Vector2(x, y);
    this.dust = !!opts.dust;

    const kb = scene.input.keyboard;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
  }

  /** Physics body: the feet only. Sizes are in texture pixels, which the sprite scale shrinks. */
  fitBody() {
    const k = 1 / this.scaleX;
    this.body.setSize(FOOT_W * k, FOOT_H * k);
    this.body.setOffset((this.width - FOOT_W * k) / 2, this.height - (FOOT_H + 2) * k);
  }

  setLookTexture(key) {
    if (key === this.texture.key) return;
    this.anim.setTexture(key);
    this.fitBody();
  }

  freeze(f = true) {
    this.frozen = f;
    this.target = null;
    this.vel.set(0, 0);
    this.body.setVelocity(0, 0);
  }

  walkTo(x, y) {
    if (this.frozen) return;
    this.target = new Phaser.Math.Vector2(x, y);
  }

  /** Turn to look at a world point (e.g. the thing being interacted with). */
  faceTowards(x, y) {
    this.anim.faceTowards(this.x, this.y, x, y);
    this.anim.render();
  }

  update(time, delta) {
    let vx = 0;
    let vy = 0;
    let speed = SPEED;
    if (!this.frozen) {
      const k = this.keys;
      if (k.LEFT.isDown || k.A.isDown) vx -= 1;
      if (k.RIGHT.isDown || k.D.isDown) vx += 1;
      if (k.UP.isDown || k.W.isDown) vy -= 1;
      if (k.DOWN.isDown || k.S.isDown) vy += 1;
      if (vx || vy) {
        this.target = null;
      } else if (this.target) {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const d = Math.hypot(dx, dy);
        if (d < 6) {
          this.target = null;
          this.emit('arrived');
        } else {
          vx = dx / d;
          vy = dy / d;
          if (d < ARRIVE_DIST) speed = SPEED * Math.max(0.35, d / ARRIVE_DIST);
        }
      }
    }
    const len = Math.hypot(vx, vy) || 1;
    const want = !!(vx || vy);
    const tx = (vx / len) * speed;
    const ty = (vy / len) * speed;
    // ease towards the wanted velocity: a quick start and a short, soft stop
    const f = 1 - Math.exp(-delta / (want ? ACCEL_MS : DECEL_MS));
    this.vel.x += (tx - this.vel.x) * f;
    this.vel.y += (ty - this.vel.y) * f;
    if (!want && this.vel.lengthSq() < 4) this.vel.set(0, 0);
    if (this.frozen) this.vel.set(0, 0);
    this.body.setVelocity(this.vel.x, this.vel.y);

    // stuck against an obstacle while auto-walking? give up on the target
    if (this.target && this.body.blocked && (this.body.blocked.left || this.body.blocked.right || this.body.blocked.up || this.body.blocked.down)) {
      this.stuck = (this.stuck || 0) + delta;
      if (this.stuck > 350) {
        this.target = null;
        this.stuck = 0;
      }
    } else {
      this.stuck = 0;
    }

    // face where we're trying to go; prefer the side view on diagonals, with some hysteresis
    if (want) {
      const ax = Math.abs(vx);
      const ay = Math.abs(vy);
      const side = this.anim.dir === 'side' ? ax > ay * 0.6 : ax > ay * 1.15;
      if (side) this.anim.face('side', vx < 0);
      else this.anim.face(vy < 0 ? 'up' : 'down');
    }

    // animate from the distance actually covered, so legs never slide on the floor
    const moved = Phaser.Math.Distance.Between(this.last.x, this.last.y, this.x, this.y);
    this.last.set(this.x, this.y);
    this.anim.update(delta, moved < 40 ? moved : 0);
    this.setDepth(this.y);
  }

  onStep(foot) {
    Sound.play('step');
    if (!this.dust) return;
    const s = this.scene;
    const side = this.anim.dir === 'side' ? (this.flipX ? 4 : -4) : foot ? 5 : -5;
    const puff = s.add.image(this.x + side, this.y - 2, 'dust').setDepth(this.y - 1).setAlpha(0.32).setScale(0.6);
    s.tweens.add({
      targets: puff,
      scale: 1.5,
      alpha: 0,
      y: puff.y - 4,
      x: puff.x - this.vel.x * 0.04,
      duration: 420,
      ease: 'Quad.easeOut',
      onComplete: () => puff.destroy(),
    });
  }

  get moving() {
    return this.body.velocity.lengthSq() > 1;
  }
}
