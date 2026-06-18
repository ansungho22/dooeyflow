// 단위 처리.
// 원칙: DB에는 항상 '기본 단위(g/ml/개 등)'로 저장한다.
// kg·L 같은 입력 단위는 ×1000 변환해 기본 단위로 바꿔 저장한다.
// 이렇게 하면 모든 재고/레시피가 같은 단위라 계산이 정확하고 정밀도 손실이 없다.

interface UnitDef {
  /** 사용자에게 보이는 라벨 */
  label: string;
  /** 변환 후 저장될 기본 단위 */
  base: string;
  /** 기본 단위로 환산 시 곱하는 10의 거듭제곱 자릿수 (kg→g 는 3) */
  shift: number;
}

// 입력 단위 → 기본 단위 정의
const UNIT_DEFS: Record<string, UnitDef> = {
  g: { label: "g", base: "g", shift: 0 },
  kg: { label: "kg (→g 저장)", base: "g", shift: 3 },
  ml: { label: "ml", base: "ml", shift: 0 },
  L: { label: "L (→ml 저장)", base: "ml", shift: 3 },
  개: { label: "개", base: "개", shift: 0 },
  병: { label: "병", base: "병", shift: 0 },
  캔: { label: "캔", base: "캔", shift: 0 },
  봉: { label: "봉", base: "봉", shift: 0 },
  팩: { label: "팩", base: "팩", shift: 0 },
  장: { label: "장", base: "장", shift: 0 },
};

export const UNIT_OPTIONS = Object.entries(UNIT_DEFS).map(([value, def]) => ({
  value,
  label: def.label,
}));

/**
 * 소수 문자열의 소수점을 오른쪽으로 places칸 이동(×10^places)한다.
 * 부동소수점을 쓰지 않아 정확하다. 예: shiftRight("0.5", 3) -> "500".
 */
export function shiftRight(num: string, places: number): string {
  if (places <= 0) return num;
  const negative = num.startsWith("-");
  const s = negative ? num.slice(1) : num;
  const [intPartRaw, fracPartRaw = ""] = s.split(".");
  let intPart = intPartRaw;
  let fracPart = fracPartRaw;

  if (places >= fracPart.length) {
    intPart = intPart + fracPart + "0".repeat(places - fracPart.length);
    fracPart = "";
  } else {
    intPart = intPart + fracPart.slice(0, places);
    fracPart = fracPart.slice(places);
  }

  intPart = intPart.replace(/^0+(?=\d)/, "");
  const result = fracPart ? `${intPart}.${fracPart}` : intPart;
  return negative ? `-${result}` : result;
}

/**
 * 입력 단위와 값을 기본 단위 기준으로 변환한다.
 * 예: toBaseUnit("0.5", "kg") -> { value: "500", unit: "g" }
 */
export function toBaseUnit(
  value: string,
  inputUnit: string,
): { value: string; unit: string } {
  const def = UNIT_DEFS[inputUnit] ?? { base: inputUnit, shift: 0, label: inputUnit };
  return {
    value: value === "" ? "0" : shiftRight(value, def.shift),
    unit: def.base,
  };
}
