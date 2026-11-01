import { MAX_FULLNESS, clampFullness, type PetState } from '@extension/pet/pet-state';
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
  const restingAnimation =
    fullness <= 2
      ? sprites.get('hungry')
      : fullness >= 9
        ? sprites.get('happy')
        : sprites.get('blink');

  const finishEating = () => {
    setIsEating(false);
    onFeed();
  };

  return (
    <main class="screen home-screen">
      <PixelSprite
        className="pet-image"
        animation={isEating ? sprites.get('eat') : restingAnimation}
        label={pet.name}
        onComplete={isEating ? finishEating : undefined}
      />
      <h2>{pet.name}</h2>
      <p class="experience">경험치 {pet.experience}</p>
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
