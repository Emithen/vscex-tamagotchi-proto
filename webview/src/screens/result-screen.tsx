import type { BattleRecord, BattleStage } from '@extension/battle/battle';
import { PixelSprite } from '../components/pixel-sprite';
import { useSprites, type PetAnimationName } from '../pixel/sprites';

type ResultScreenProps = {
  battle: BattleRecord;
  stage: BattleStage;
  onClaimReward: () => void;
};

const RESULT_VIEW = {
  victory: { title: '승리!', animation: 'victory' },
  defeat: { title: '패배', animation: 'faint' },
  draw: { title: '무승부', animation: 'idle' },
} satisfies Record<BattleRecord['result'], { title: string; animation: PetAnimationName }>;

export function ResultScreen({ battle, stage, onClaimReward }: ResultScreenProps) {
  const sprites = useSprites();
  const view = RESULT_VIEW[battle.result];

  return (
    <main class="screen result-screen">
      <p class="eyebrow">{stage.name} 결과</p>
      <div class="pet-stage result-stage">
        <PixelSprite
          className="pet-image result-image"
          animation={sprites.get(view.animation, battle.pet.id)}
          label={battle.pet.name}
        />
      </div>
      <h2>{view.title}</h2>
      <p class="result-reward">
        획득 경험치 <strong>+{battle.experienceReward}</strong>
      </p>
      <button class="primary-button" type="button" onClick={onClaimReward}>
        보상 받기
      </button>
    </main>
  );
}
