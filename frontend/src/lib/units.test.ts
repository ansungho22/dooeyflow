import { describe, expect, it } from "vitest";
import { shiftRight, toBaseUnit } from "@/lib/units";

describe("shiftRight (부동소수점 없이 ×10^n)", () => {
  it("정수를 정확히 1000배한다", () => {
    expect(shiftRight("5", 3)).toBe("5000");
    expect(shiftRight("0", 3)).toBe("0");
  });

  it("소수를 정확히 1000배한다 (부동소수점 오차 없음)", () => {
    expect(shiftRight("0.5", 3)).toBe("500");
    expect(shiftRight("0.0025", 3)).toBe("2.5");
    expect(shiftRight("1.2345", 3)).toBe("1234.5");
    // 부동소수점이면 0.0999... 가 되는 케이스
    expect(shiftRight("0.0001", 3)).toBe("0.1");
  });

  it("shift가 0이면 그대로 둔다", () => {
    expect(shiftRight("123.45", 0)).toBe("123.45");
  });
});

describe("toBaseUnit (입력 단위 → 기본 단위 저장)", () => {
  it("kg을 g로 변환한다 (×1000)", () => {
    expect(toBaseUnit("0.5", "kg")).toEqual({ value: "500", unit: "g" });
    expect(toBaseUnit("2", "kg")).toEqual({ value: "2000", unit: "g" });
  });

  it("L을 ml로 변환한다 (×1000)", () => {
    expect(toBaseUnit("1.5", "L")).toEqual({ value: "1500", unit: "ml" });
  });

  it("기본 단위(g/ml/개)는 변환 없이 그대로 저장한다", () => {
    expect(toBaseUnit("500", "g")).toEqual({ value: "500", unit: "g" });
    expect(toBaseUnit("3", "개")).toEqual({ value: "3", unit: "개" });
  });

  it("빈 값은 0으로 처리한다", () => {
    expect(toBaseUnit("", "kg")).toEqual({ value: "0", unit: "g" });
  });
});
