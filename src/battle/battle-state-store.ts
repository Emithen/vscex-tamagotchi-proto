import * as vscode from 'vscode';
import { GRASSLAND_STAGE_ID, type BattleAction, type BattleRecord, type Combatant } from './battle';

const BATTLE_STATE_KEY = 'tamagotchi.battleState';

export class BattleStateStore {
  constructor(private readonly globalState: vscode.Memento) {}

  load(): BattleRecord | undefined {
    const savedState = this.globalState.get<unknown>(BATTLE_STATE_KEY);
    return isBattleRecord(savedState) ? savedState : undefined;
  }

  async save(battle: BattleRecord | undefined): Promise<void> {
    await this.globalState.update(BATTLE_STATE_KEY, battle);
  }
}

function isBattleRecord(value: unknown): value is BattleRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const battle = value as Partial<BattleRecord>;

  return (
    typeof battle.id === 'string' &&
    battle.stageId === GRASSLAND_STAGE_ID &&
    typeof battle.startedAt === 'number' &&
    Number.isFinite(battle.startedAt) &&
    isCombatant(battle.pet) &&
    isCombatant(battle.enemy) &&
    (battle.result === 'victory' || battle.result === 'defeat' || battle.result === 'draw') &&
    typeof battle.durationMs === 'number' &&
    Number.isFinite(battle.durationMs) &&
    Array.isArray(battle.actions) &&
    battle.actions.every(isBattleAction) &&
    typeof battle.experienceReward === 'number' &&
    Number.isInteger(battle.experienceReward) &&
    battle.experienceReward >= 0 &&
    typeof battle.rewardClaimed === 'boolean'
  );
}

function isCombatant(value: unknown): value is Combatant {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const combatant = value as Partial<Combatant>;
  const stats = combatant.stats;

  return (
    typeof combatant.id === 'string' &&
    typeof combatant.name === 'string' &&
    typeof stats === 'object' &&
    stats !== null &&
    [stats.maxHp, stats.attack, stats.defense, stats.speed].every(
      (stat) => typeof stat === 'number' && Number.isFinite(stat) && stat > 0,
    )
  );
}

function isBattleAction(value: unknown): value is BattleAction {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const action = value as Partial<BattleAction>;

  return (
    typeof action.atMs === 'number' &&
    Number.isFinite(action.atMs) &&
    (action.actor === 'pet' || action.actor === 'enemy') &&
    typeof action.damage === 'number' &&
    Number.isInteger(action.damage) &&
    typeof action.targetHp === 'number' &&
    Number.isInteger(action.targetHp)
  );
}
