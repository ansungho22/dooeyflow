// 표시용 포매팅 유틸. 수량은 백엔드에서 DECIMAL 문자열로 오므로
// 정밀도를 깨지 않도록 표시 목적의 트림만 수행한다.

/** 불필요한 소수점 0을 제거해 사람이 읽기 좋게 만든다. "18.0000" -> "18", "9.3000" -> "9.3" */
export function formatQuantity(value: string): string {
  if (!value.includes(".")) return value;
  const trimmed = value.replace(/0+$/, "").replace(/\.$/, "");
  return trimmed === "" ? "0" : trimmed;
}

/** 원화 포맷. 가격도 문자열로 오므로 숫자 변환 후 표시. */
export function formatWon(value: string): string {
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return `₩${num.toLocaleString("ko-KR")}`;
}
