import type { PetSpeciesId, SpeciesData } from './types';

export const DEFAULT_SPECIES_ID: PetSpeciesId = 'mudkip';

/** 개발·테스트 환경용 진화 요구 경험치 (빠른 검증용: 1승 → 늪짱이, 2승 → 대짱이) */
export const DEV_MUDKIP_EVOLUTION_EXPERIENCE = 10;
export const DEV_MARSHTOMP_EVOLUTION_EXPERIENCE = 20;

/** 프로덕션(본편) 기준 진화 요구 경험치 */
export const PROD_MUDKIP_EVOLUTION_EXPERIENCE = 50;
export const PROD_MARSHTOMP_EVOLUTION_EXPERIENCE = 100;

/**
 * 진화 요구 경험치 설정만 주입받아 종별 카탈로그를 생성한다.
 */
export function createSpeciesCatalog(
  evolutionExperience: {
    mudkip: number;
    marshtomp: number;
  } = {
    mudkip: DEV_MUDKIP_EVOLUTION_EXPERIENCE,
    marshtomp: DEV_MARSHTOMP_EVOLUTION_EXPERIENCE,
  },
): Record<PetSpeciesId, SpeciesData> {
  return {
    mudkip: {
      id: 'mudkip',
      name: '물짱이',
      stats: {
        maxHp: 20,
        attack: 10,
        defense: 5,
        speed: 100,
      },
      evolution: {
        requiredExperience: evolutionExperience.mudkip,
        nextSpeciesId: 'marshtomp',
      },
    },
    marshtomp: {
      id: 'marshtomp',
      name: '늪짱이',
      stats: {
        maxHp: 32,
        attack: 15,
        defense: 10,
        speed: 110,
      },
      evolution: {
        requiredExperience: evolutionExperience.marshtomp,
        nextSpeciesId: 'swampert',
      },
    },
    swampert: {
      id: 'swampert',
      name: '대짱이',
      stats: {
        maxHp: 48,
        attack: 22,
        defense: 16,
        speed: 120,
      },
    },
  };
}

export const DEV_TEST_SPECIES_CATALOG: Record<PetSpeciesId, SpeciesData> = createSpeciesCatalog({
  mudkip: DEV_MUDKIP_EVOLUTION_EXPERIENCE,
  marshtomp: DEV_MARSHTOMP_EVOLUTION_EXPERIENCE,
});

export const PRODUCTION_SPECIES_CATALOG: Record<PetSpeciesId, SpeciesData> = createSpeciesCatalog({
  mudkip: PROD_MUDKIP_EVOLUTION_EXPERIENCE,
  marshtomp: PROD_MARSHTOMP_EVOLUTION_EXPERIENCE,
});
