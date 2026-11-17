import Phaser from 'phaser';
import { Sound } from '../audio/Sound.js';

const SPEED = 230;

/**
 * Top-down walking player. Keyboard (arrows/WASD) or pointer: tap to walk to a point,
 * hold to steer towards the pointer. Origin is at the feet; the physics body covers the feet only.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.body.setSize(26, 14);
    this.body.setOffset((this.width - 26) / 2, this.height - 16);
    this.body.setCollideWorldBounds(true);
    this.frozen = false;
    this.target = null;
    this.walkTime = 0;
    this.stepTimer = 0;

    const kb = scene.input.keyboard;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
  }

  setLookTexture(key) {
    this.setTexture(key);
    this.body.setSize(26, 14);
    this.body.setOffset((this.width - 26) / 2, this.height - 16);
  }

  freeze(f = true) {
    this.frozen = f;
    this.target = null;
    this.body.setVelocity(0, 0);
  }

  walkTo(x, y) {
    if (this.frozen) return;
    this.target = new Phaser.Math.Vector2(x, y);
  }

  update(time, delta) {
    let vx = 0;
    let vy = 0;
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
        }
      }
    }
    const len = Math.hypot(vx, vy) || 1;
    this.body.setVelocity((vx / len) * SPEED, (vy / len) * SPEED);

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

    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      this.walkTime += delta;
      this.setAngle(Math.sin(this.walkTime / 70) * 5);
      if (vx < 0) this.setFlipX(true);
      else if (vx > 0) this.setFlipX(false);
      this.stepTimer += delta;
      if (this.stepTimer > 300) {
        this.stepTimer = 0;
        Sound.play('step');
      }
    } else {
      this.setAngle(0);
      this.walkTime = 0;
    }
    this.setDepth(this.y);
  }

  get moving() {
    return this.body.velocity.lengthSq() > 1;
  }
}
