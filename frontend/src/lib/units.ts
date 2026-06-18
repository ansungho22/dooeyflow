// 원자재 단위 선택지. 요식업에서 흔한 단위를 기본 제공한다.
export const MATERIAL_UNITS: readonly string[] = [
  "g",
  "kg",
  "ml",
  "L",
  "개",
  "병",
  "캔",
  "봉",
  "팩",
  "장",
  "ea",
] as const;

export const UNIT_OPTIONS = MATERIAL_UNITS.map((u) => ({ value: u, label: u }));
