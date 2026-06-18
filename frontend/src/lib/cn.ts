// 조건부 클래스 병합 유틸 (의존성 없이 경량 구현).
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
