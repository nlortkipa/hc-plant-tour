// Keyboard navigation for buttons: Tab/arrows move focus, Enter/Space activate, Esc cancels.
// Each scene owns one FocusManager; modal layers push a new group on top of the stack.

export class FocusManager {
  constructor(scene) {
    this.scene = scene;
    this.stack = [];
    this.onKey = (e) => this.handle(e);
    scene.input.keyboard.on('keydown', this.onKey);
    scene.input.keyboard.addCapture('TAB,SPACE,UP,DOWN,LEFT,RIGHT');
    scene.events.once('shutdown', () => this.destroy());
  }

  push(items = [], opts = {}) {
    const group = { items: [...items], index: -1, onCancel: opts.onCancel || null, keys: opts.keys || null, grid: opts.columns || 1 };
    this.stack.push(group);
    if (opts.autoFocus) this.focus(group, 0);
    return group;
  }

  pop(group) {
    const i = this.stack.indexOf(group);
    if (i >= 0) {
      const g = this.stack[i];
      if (g.items[g.index]) g.items[g.index].setFocused?.(false);
      this.stack.splice(i, 1);
    }
  }

  add(group, item) {
    group.items.push(item);
  }

  top() {
    return this.stack[this.stack.length - 1];
  }

  active() {
    return this.stack.length > 0;
  }

  focus(group, index) {
    const items = group.items.filter((it) => it.visible !== false);
    if (!items.length) return;
    if (group.items[group.index]) group.items[group.index].setFocused?.(false);
    const n = group.items.length;
    let i = ((index % n) + n) % n;
    // skip invisible/disabled items
    for (let k = 0; k < n; k++) {
      const it = group.items[i];
      if (it.visible !== false && it.enabled !== false) break;
      i = (i + 1) % n;
    }
    group.index = i;
    group.items[i].setFocused?.(true);
  }

  move(group, delta) {
    const n = group.items.length;
    if (!n) return;
    if (group.index < 0) {
      this.focus(group, delta > 0 ? 0 : n - 1);
      return;
    }
    let i = group.index;
    for (let k = 0; k < n; k++) {
      i = (((i + delta) % n) + n) % n;
      const it = group.items[i];
      if (it.visible !== false && it.enabled !== false) break;
    }
    if (group.items[group.index]) group.items[group.index].setFocused?.(false);
    group.index = i;
    group.items[i].setFocused?.(true);
  }

  handle(e) {
    if (!this.scene.sys.isActive()) return;
    const g = this.top();
    if (!g) return;
    if (g.keys && g.keys(e) === true) return;
    switch (e.code) {
      case 'Tab':
        e.preventDefault?.();
        this.move(g, e.shiftKey ? -1 : 1);
        break;
      case 'ArrowDown':
        this.move(g, g.grid);
        break;
      case 'ArrowRight':
        this.move(g, 1);
        break;
      case 'ArrowUp':
        this.move(g, -g.grid);
        break;
      case 'ArrowLeft':
        this.move(g, -1);
        break;
      case 'Enter':
      case 'NumpadEnter':
      case 'Space':
        if (g.index >= 0 && g.items[g.index]) g.items[g.index].activate?.();
        break;
      case 'Escape':
        if (g.onCancel) g.onCancel();
        break;
      default:
        break;
    }
  }

  destroy() {
    this.scene.input.keyboard?.off('keydown', this.onKey);
    this.stack = [];
  }
}
