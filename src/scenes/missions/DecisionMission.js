import { W, HUD_H } from '../../config.js';
import { t } from '../../i18n/index.js';
import { MissionBase } from './MissionBase.js';
import { DECISIONS } from '../../data/missions.js';
import { QuizCard } from '../../ui/QuizCard.js';
import { shuffle } from '../../ui/DialogBox.js';

const ICONS = { spill: 'warn_heat', barrier: 'warn_bang', colleague: 'warn_heat', heatstress: 'warn_heat' };

/** Scenario cards: choose the safe action in each situation (kiln). */
export class DecisionMission extends MissionBase {
  constructor() {
    super('DecisionMission');
  }

  create() {
    this.setupBase(t('missions.decision.title'), null, { bg: 0x1a1410 });
    // warm backdrop glow
    const g = this.add.graphics().setDepth(-90);
    g.fillGradientStyle(0x2a160c, 0x2a160c, 0x121a24, 0x121a24, 1);
    g.fillRect(0, HUD_H, W, 720 - HUD_H);
    this.runScenarios();
  }

  async runScenarios() {
    const list = DECISIONS[this.cfg.set];
    for (let i = 0; i < list.length; i++) {
      const sc = list[i];
      const base = `missions.decision.scenarios.${sc.id}`;
      const options = shuffle(['a', 'b', 'c'].map((id) => ({ id, text: t(`${base}.options.${id}`) })));
      const card = new QuizCard(this, this.focus, {
        x: 140,
        y: this.headerBottom + 20,
        w: 1000,
        kicker: t('missions.decision.progress', { i: i + 1, n: list.length }),
        prompt: t(`${base}.prompt`),
        options,
        icon: this.textures.exists(ICONS[sc.id]) ? ICONS[sc.id] : 'warn_heat',
      });
      const picked = await card.ask();
      const ok = picked === sc.correct;
      card.reveal(sc.correct, picked);
      if (!ok) this.addMistake(sc.topic);
      await card.explainAndNext(t(`${base}.explain`), ok, i === list.length - 1 ? t('missions.common.finish') : t('ui.next'));
      card.destroy();
    }
    this.complete();
  }
}
