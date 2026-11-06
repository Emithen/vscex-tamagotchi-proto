import { DEV_TEST_SPECIES_CATALOG } from './species';
import type { BattleStageId, PetSpeciesId, SpeciesData, StageData } from './types';

export const GRASSLAND_STAGE_ID: BattleStageId = 'grassland-1';
export const DEFAULT_STAGE_ID: BattleStageId = GRASSLAND_STAGE_ID;
export const BATTLE_VICTORY_EXPERIENCE = 10;

export function createStagesCatalog(
  speciesCatalog: Record<PetSpeciesId, SpeciesData> = DEV_TEST_SPECIES_CATALOG,
): Record<BattleStageId, StageData> {
  const mudkip = speciesCatalog.mudkip;
  return {
    [GRASSLAND_STAGE_ID]: {
      id: GRASSLAND_STAGE_ID,
      name: '초원 1',
      enemy: {
        id: mudkip.id,
        name: mudkip.name,
        stats: mudkip.stats,
      },
      victoryExperience: BATTLE_VICTORY_EXPERIENCE,
    },
  };
}

export const STAGES_CATALOG: Record<BattleStageId, StageData> = createStagesCatalog();
