import type { BattleStage, BattleStageId, FieldData } from '@extension/battle/battle';
import { PixelSprite } from '../components/pixel-sprite';
import { TerrainBackdrop } from '../components/terrain-backdrop';
import { useSprites } from '../pixel/sprites';

type StageScreenProps = {
  fields: FieldData[];
  stages: BattleStage[];
  selectedStageId: BattleStageId;
  onSelectStage: (stageId: BattleStageId) => void;
  onStartBattle: (stageId: string) => void;
  onBack: () => void;
};

export function StageScreen({
  fields,
  stages,
  selectedStageId,
  onSelectStage,
  onStartBattle,
  onBack,
}: StageScreenProps) {
  const sprites = useSprites();
  const stage = stages.find((candidate) => candidate.id === selectedStageId) ?? stages[0];
  const fieldIndex = Math.max(
    0,
    fields.findIndex((candidate) => candidate.id === stage.fieldId),
  );
  const currentField = fields[fieldIndex] ?? fields[0];
  const enemySpriteSet = stage.enemy.spriteId ?? stage.enemy.id;
  const enemyIdleAnimation = sprites.get('idle', enemySpriteSet);

  const moveField = (delta: number) => {
    const nextFieldIndex = (fieldIndex + delta + fields.length) % fields.length;
    const nextField = fields[nextFieldIndex];
    const targetStageId = nextField.stageIds[stage.stageNumber - 1] ?? nextField.stageIds[0];
    onSelectStage(targetStageId);
  };

  return (
    <main class="screen stage-screen" data-field={stage.fieldId}>
      <p class="eyebrow">스테이지 선택</p>
      <div class="field-switcher" role="group" aria-label="필드 선택">
        <button
          class="field-nav-button"
          type="button"
          aria-label="이전 필드"
          onClick={() => moveField(-1)}
        >
          ◀
        </button>
        <div class="field-title-box">
          <strong class="field-name">{currentField.name}</strong>
          <span class="field-theme">{currentField.themeTypes}</span>
        </div>
        <button
          class="field-nav-button"
          type="button"
          aria-label="다음 필드"
          onClick={() => moveField(1)}
        >
          ▶
        </button>
      </div>
      <div class="stage-tabs" role="tablist" aria-label={`${currentField.name} 스테이지 번호`}>
        {currentField.stageIds.map((stageId, index) => {
          const isSelected = stageId === stage.id;
          return (
            <button
              key={stageId}
              class={isSelected ? 'stage-tab is-active' : 'stage-tab'}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectStage(stageId)}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      <div class="stage-card" data-field={stage.fieldId}>
        <div class="stage-enemy-stage">
          <TerrainBackdrop
            fieldId={stage.fieldId}
            mode="stage"
            className="stage-terrain-backdrop"
          />
          <PixelSprite
            className={`stage-enemy-image stage-enemy-image--${enemyIdleAnimation.frameWidth} stage-enemy-image--${enemySpriteSet}`}
            animation={enemyIdleAnimation}
            label={`적 ${stage.enemy.name}`}
          />
        </div>
        <div class="stage-card-meta">
          <p class="stage-enemy-name">
            {stage.name} · 적 {stage.enemy.name}
          </p>
          <p class="stage-reward">
            HP {stage.enemy.stats.maxHp} · 보상 EXP +{stage.victoryExperience}
          </p>
        </div>
      </div>
      <div class="button-stack stage-button-stack">
        <button class="primary-button" type="button" onClick={() => onStartBattle(stage.id)}>
          전투 시작
        </button>
        <button class="secondary-button" type="button" onClick={onBack}>
          돌아가기
        </button>
      </div>
    </main>
  );
}
