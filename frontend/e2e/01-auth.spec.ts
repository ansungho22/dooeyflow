import { test, expect } from "@playwright/test";

const TEST_EMAIL = `e2e_test_${Date.now()}@test.com`;
const TEST_PASSWORD = "password1234";

test.describe("인증 플로우", () => {
  test("회원가입 → 매장 생성 → 대시보드 진입", async ({ page }) => {
    await page.goto("/login");

    // 회원가입 모드로 전환
    await page.getByRole("button", { name: /계정이 없으신가요/ }).click();
    await expect(page.getByRole("button", { name: "계정 만들기" })).toBeVisible();

    // 이메일·비밀번호 입력
    await page.getByLabel("이메일").fill(TEST_EMAIL);
    await page.getByLabel("비밀번호", { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel("비밀번호 확인").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "계정 만들기" }).click();

    // 로그인 후 dashboard URL로 이동
    await page.waitForURL("**/dashboard**", { timeout: 15000 });

    // 신규 가입이면 StoreSetup 화면이 나타남 — 충분히 기다린 뒤 확인
    const storeSetupHeading = page.getByRole("heading", {
      name: "첫 매장을 만들어 주세요",
    });

    // 온보딩 또는 대시보드 둘 중 하나가 먼저 나타날 때까지 대기
    await expect(
      storeSetupHeading.or(page.getByRole("heading", { name: "원자재 추가" })),
    ).toBeVisible({ timeout: 10000 });

    if (await storeSetupHeading.isVisible()) {
      await page.getByLabel("매장 이름").fill("테스트 카페");
      await page.getByRole("button", { name: "매장 만들기" }).click();
    }

    await expect(page.getByRole("heading", { name: "원자재 추가" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("비밀번호 불일치 시 에러 표시", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /계정이 없으신가요/ }).click();

    await page.getByLabel("이메일").fill(`mismatch_${Date.now()}@test.com`);
    await page.getByLabel("비밀번호", { exact: true }).fill("password1234");
    await page.getByLabel("비밀번호 확인").fill("different5678");
    await page.getByRole("button", { name: "계정 만들기" }).click();

    await expect(page.getByText("비밀번호가 일치하지 않습니다.")).toBeVisible();
  });

  test("잘못된 비밀번호로 로그인 시 에러 표시", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("이메일").fill("nonexistent@test.com");
    await page.getByLabel("비밀번호", { exact: true }).fill("wrongpass");
    // exact: true로 submit 버튼만 특정
    await page.getByRole("button", { name: "로그인", exact: true }).click();

    // API 에러 응답 후 에러 메시지 표시
    await expect(
      page.locator("p.text-danger, p[class*='text-danger']").first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("로그인 모드↔회원가입 모드 전환", async ({ page }) => {
    await page.goto("/login");

    // 초기: 로그인 모드 — submit 버튼만 exact 매칭
    await expect(
      page.getByRole("button", { name: "로그인", exact: true }),
    ).toBeVisible();

    // 회원가입으로 전환
    await page.getByRole("button", { name: /계정이 없으신가요/ }).click();
    await expect(page.getByRole("button", { name: "계정 만들기" })).toBeVisible();
    await expect(page.getByLabel("비밀번호 확인")).toBeVisible();

    // 다시 로그인으로 전환
    await page.getByRole("button", { name: /이미 계정이 있으신가요/ }).click();
    await expect(
      page.getByRole("button", { name: "로그인", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("비밀번호 확인")).not.toBeVisible();
  });
});
