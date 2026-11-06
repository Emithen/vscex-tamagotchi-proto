import type { BattleStage } from '@extension/battle/battle';
import { PixelSprite } from '../components/pixel-sprite';
import { useSprites } from '../pixel/sprites';

type StageScreenProps = {
  stage: BattleStage;
  onStartBattle: (stageId: string) => void;
  onBack: () => void;
};

export function StageScreen({ stage, onStartBattle, onBack }: StageScreenProps) {
  const sprites = useSprites();

  return (
    <main class="screen stage-screen">
      <p class="eyebrow">스테이지 선택</p>
      <h2>{stage.name}</h2>
      <div class="stage-card">
        <PixelSprite
          className="stage-enemy-image"
          animation={sprites.get('idle', stage.enemy.id)}
          label={`적 ${stage.enemy.name}`}
        />
        <p class="stage-enemy-name">적: {stage.enemy.name}</p>
        <p class="stage-reward">승리 보상: 경험치 +{stage.victoryExperience}</p>
      </div>
      <div class="button-stack">
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
