import { GAME_DATA } from '@extension/data/game-data';
import {
  MAX_FULLNESS,
  clampFullness,
  getEvolutionExperience,
  type PetState,
} from '@extension/pet/pet-state';
import { useState } from 'preact/hooks';
import { PixelSprite } from '../components/pixel-sprite';
import { useSprites } from '../pixel/sprites';

type HomeScreenProps = {
  pet: PetState;
  onFeed: () => void;
  onOpenStage: () => void;
};

export function HomeScreen({ pet, onFeed, onOpenStage }: HomeScreenProps) {
  const sprites = useSprites();
  const [isEating, setIsEating] = useState(false);
  const fullness = clampFullness(pet.fullness);
  const evolutionExperience = getEvolutionExperience(pet.speciesId);
  const restingAnimation =
    fullness <= GAME_DATA.care.hungryThreshold
      ? sprites.get('hungry', pet.speciesId)
      : fullness >= GAME_DATA.care.happyThreshold
        ? sprites.get('happy', pet.speciesId)
        : sprites.get('blink', pet.speciesId);

  const finishEating = () => {
    setIsEating(false);
    onFeed();
  };

  return (
    <main class="screen home-screen">
      <div class="pet-stage">
        <PixelSprite
          className="pet-image"
          animation={isEating ? sprites.get('eat', pet.speciesId) : restingAnimation}
          label={pet.name}
          onComplete={isEating ? finishEating : undefined}
        />
      </div>
      <h2>{pet.name}</h2>
      <p class="experience">
        {evolutionExperience === undefined
          ? '진화: MAX'
          : `진화: ${pet.experience} / ${evolutionExperience}`}
      </p>
      <progress
        class="experience-progress"
        aria-label="진화 경험치"
        max={evolutionExperience ?? 1}
        value={evolutionExperience === undefined ? 1 : pet.experience}
      />
      <p class="fullness">
        포만감: {fullness} / {MAX_FULLNESS}
      </p>
      <progress aria-label="포만감" max={MAX_FULLNESS} value={fullness} />
      <div class="button-stack">
        <button
          class="primary-button"
          type="button"
          disabled={isEating}
          onClick={() => setIsEating(true)}
        >
          먹이 주기
        </button>
        <button class="secondary-button" type="button" onClick={onOpenStage}>
          스테이지 선택
        </button>
      </div>
    </main>
  );
}
