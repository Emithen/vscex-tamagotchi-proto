import type { BattleAction, BattleRecord, BattleStage, Combatant } from '@extension/battle/battle';
import { BATTLE_RESULT_REVEAL_DELAY_MS } from '@extension/shared/protocol';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { getHpFillPixels, getHpLevel } from '../battle/hp';
import { PixelSprite } from '../components/pixel-sprite';
import { TerrainBackdrop } from '../components/terrain-backdrop';
import { useSprites } from '../pixel/sprites';

const BATTLE_HIT_DELAY_MS = 125;
const HIT_FEEDBACK_MS = 300;
const DAMAGE_NUMBER_MS = 600;

type Side = BattleAction['actor'];

type CombatantView = {
  hp: number;
  animation: 'idle' | 'attack' | 'hit' | 'faint';
  /** 같은 애니메이션을 연속 재생할 때 처음부터 다시 시작하기 위한 값 */
  playKey: number;
  isHit: boolean;
  damages: { id: number; value: number }[];
};

type BattleScreenProps = {
  battle: BattleRecord;
  stage: BattleStage;
  onFinished: () => void;
};

/**
 * 미리 계산된 전투 행동을 시작 시각 기준으로 재생한다.
 * 부모는 전투가 바뀔 때 `key`로 화면을 새로 마운트해야 한다.
 */
export function BattleScreen({ battle, stage, onFinished }: BattleScreenProps) {
  const [log, setLog] = useState('전투를 준비하고 있어요.');
  const [combatants, setCombatants] = useState<Record<Side, CombatantView>>(() => ({
    pet: createCombatantView(battle.pet.stats.maxHp),
    enemy: createCombatantView(battle.enemy.stats.maxHp),
  }));
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const updateCombatant = useCallback(
    (side: Side, change: (view: CombatantView) => CombatantView) =>
      setCombatants((current) => ({ ...current, [side]: change(current[side]) })),
    [],
  );

  const playAnimation = useCallback(
    (side: Side, animation: CombatantView['animation']) =>
      updateCombatant(side, (view) =>
        view.animation === 'faint' ? view : { ...view, animation, playKey: view.playKey + 1 },
      ),
    [updateCombatant],
  );

  const returnToIdle = useCallback(
    (side: Side) =>
      updateCombatant(side, (view) =>
        view.animation === 'attack' || view.animation === 'hit'
          ? { ...view, animation: 'idle', playKey: view.playKey + 1 }
          : view,
      ),
    [updateCombatant],
  );

  useEffect(() => {
    const timers: number[] = [];
    const schedule = (callback: () => void, delayMs: number) => {
      timers.push(window.setTimeout(callback, Math.max(0, delayMs)));
    };
    let damageId = 0;

    for (const action of battle.actions) {
      schedule(
        () => {
          const target: Side = action.actor === 'pet' ? 'enemy' : 'pet';
          const attacker =
            action.actor === 'pet' ? `내 ${battle.pet.name}` : `적 ${battle.enemy.name}`;
          setLog(`${attacker}의 공격! ${action.damage} 데미지`);
          playAnimation(action.actor, 'attack');

          schedule(() => {
            const id = ++damageId;
            updateCombatant(target, (view) => ({
              ...view,
              hp: action.targetHp,
              isHit: true,
              damages: [...view.damages, { id, value: action.damage }],
            }));
            playAnimation(target, action.targetHp <= 0 ? 'faint' : 'hit');
            schedule(
              () => updateCombatant(target, (view) => ({ ...view, isHit: false })),
              HIT_FEEDBACK_MS,
            );
            schedule(
              () =>
                updateCombatant(target, (view) => ({
                  ...view,
                  damages: view.damages.filter((damage) => damage.id !== id),
                })),
              DAMAGE_NUMBER_MS,
            );
          }, BATTLE_HIT_DELAY_MS);
        },
        battle.startedAt + action.atMs - Date.now(),
      );
    }

    schedule(
      () => onFinishedRef.current(),
      battle.startedAt + battle.durationMs + BATTLE_RESULT_REVEAL_DELAY_MS - Date.now(),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
    // 전투 기록은 `key`가 같으면 바뀌지 않으므로 마운트 시 한 번만 예약한다.
  }, []);

  return (
    <main class="screen battle-screen" data-field={stage.fieldId}>
      <p class="eyebrow">{stage.name}</p>
      <h2>전투 진행 중</h2>
      <div class="combatants">
        <TerrainBackdrop
          fieldId={stage.fieldId}
          mode="battle"
          className="battle-terrain-backdrop"
        />
        <CombatantPanel
          side="pet"
          label="내 펫"
          combatant={battle.pet}
          view={combatants.pet}
          onAnimationComplete={() => returnToIdle('pet')}
        />
        <span class="versus">VS</span>
        <CombatantPanel
          side="enemy"
          label="적"
          combatant={battle.enemy}
          view={combatants.enemy}
          onAnimationComplete={() => returnToIdle('enemy')}
        />
      </div>
      <p class="battle-log" aria-live="polite">
        {log}
      </p>
    </main>
  );
}

type CombatantPanelProps = {
  side: Side;
  label: string;
  combatant: Combatant;
  view: CombatantView;
  onAnimationComplete: () => void;
};

function CombatantPanel({
  side,
  label,
  combatant,
  view,
  onAnimationComplete,
}: CombatantPanelProps) {
  const sprites = useSprites();
  const spriteSet = combatant.spriteId ?? combatant.id;
  const animation = sprites.get(view.animation, spriteSet);
  const maxHp = combatant.stats.maxHp;
  const hpLevel = getHpLevel(view.hp, maxHp);
  const hpClass = hpLevel === 'good' ? 'pixel-hp' : `pixel-hp is-${hpLevel}`;
  const baseImageClass = `combatant-image combatant-image--${animation.frameWidth} combatant-image--${spriteSet}`;

  return (
    <section class={`combatant combatant--${side}`}>
      <span class="combatant-label">{label}</span>
      <div class="combatant-stage">
        <PixelSprite
          className={view.isHit ? `${baseImageClass} is-hit` : baseImageClass}
          animation={animation}
          playKey={view.playKey}
          label={`${label} ${combatant.name}`}
          onComplete={onAnimationComplete}
        />
      </div>
      <strong>{combatant.name}</strong>
      <div
        class={hpClass}
        role="progressbar"
        aria-label={`${label} ${combatant.name} HP`}
        aria-valuemin={0}
        aria-valuemax={maxHp}
        aria-valuenow={view.hp}
        style={{ '--hp-fill-pixels': String(getHpFillPixels(view.hp, maxHp)) }}
      >
        <span class="pixel-hp-fill" />
      </div>
      <span class="hp-text">
        {view.hp} / {maxHp}
      </span>
      {view.damages.map((damage) => (
        <span key={damage.id} class="damage-number" aria-hidden="true">
          -{damage.value}
        </span>
      ))}
    </section>
  );
}

function createCombatantView(maxHp: number): CombatantView {
  return { hp: maxHp, animation: 'idle', playKey: 0, isHit: false, damages: [] };
}
