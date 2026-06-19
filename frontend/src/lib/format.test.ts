import { describe, expect, it } from "vitest";
import { formatQuantity, formatWon } from "@/lib/format";

describe("formatQuantity", () => {
  it("trailing 0 소수점을 제거한다", () => {
    expect(formatQuantity("18.0000")).toBe("18");
    expect(formatQuantity("9.3000")).toBe("9.3");
    expect(formatQuantity("0.7000")).toBe("0.7");
  });

  it("정수 문자열은 그대로 둔다", () => {
    expect(formatQuantity("1000")).toBe("1000");
  });

  it("0으로만 이루어진 소수는 0으로 정리한다", () => {
    expect(formatQuantity("0.0000")).toBe("0");
  });
});

describe("formatWon", () => {
  it("천 단위 구분 + 원화 기호", () => {
    expect(formatWon("4500")).toBe("₩4,500");
    expect(formatWon("1000000")).toBe("₩1,000,000");
  });

  it("숫자가 아니면 원본 반환", () => {
    expect(formatWon("N/A")).toBe("N/A");
  });
});
