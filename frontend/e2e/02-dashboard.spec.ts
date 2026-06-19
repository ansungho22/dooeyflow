import { test, expect, type Page } from "@playwright/test";

// suite 전용 계정 — 모듈 로드 시점에 고정
const EMAIL = `e2e_dash_${Date.now()}@test.com`;
const PASSWORD = "password1234";
const STORE_NAME = "대시보드 테스트 카페";

// 가입 + 로그인 (최초 1회)
async function registerAndLogin(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByRole("button", { name: /계정이 없으신가요/ }).click();
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByLabel("비밀번호 확인").fill(password);
  await page.getByRole("button", { name: "계정 만들기" }).click();
  await page.waitForURL("**/dashboard**", { timeout: 15000 });
}

// 로그인만 (2회차~)
async function loginOnly(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await page.waitForURL("**/dashboard**", { timeout: 15000 });
}

// 매장 온보딩 처리
async function ensureStore(page: Page, storeName: string) {
  await page.waitForSelector(
    'h1:has-text("첫 매장을 만들어 주세요"), h2:has-text("원자재 추가")',
    { timeout: 10000 },
  );
  if (await page.getByRole("heading", { name: "첫 매장을 만들어 주세요" }).isVisible()) {
    await page.getByLabel("매장 이름").fill(storeName);
    await page.getByRole("button", { name: "매장 만들기" }).click();
    await page.waitForSelector('h2:has-text("원자재 추가")', { timeout: 15000 });
  }
}

// 최초 1회 가입 여부 추적
let accountCreated = false;

test.describe("재고 관리 (대시보드)", () => {
  test.beforeEach(async ({ page }) => {
    if (!accountCreated) {
      await registerAndLogin(page, EMAIL, PASSWORD);
      await ensureStore(page, STORE_NAME);
      accountCreated = true;
    } else {
      await loginOnly(page, EMAIL, PASSWORD);
    }
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "원자재 추가" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("원자재 추가", async ({ page }) => {
    const name = `원두_${Date.now()}`;
    await page.getByLabel("원자재 이름").fill(name);
    await page.getByLabel("현재고").fill("500");
    await page.getByLabel("안전재고").fill("100");
    await page.getByRole("button", { name: "원자재 추가" }).click();
    await expect(page.getByText(name)).toBeVisible({ timeout: 10000 });
  });

  test("원자재 추가 후 통계 카드 업데이트", async ({ page }) => {
    const name = `통계_${Date.now()}`;

    // 추가 전 통계 숫자 캡처
    const statValueBefore = await page
      .locator("section.grid .text-stat, section.grid [class*='text-stat']")
      .first()
      .textContent();

    await page.getByLabel("원자재 이름").fill(name);
    await page.getByLabel("현재고").fill("200");
    await page.getByLabel("안전재고").fill("50");
    await page.getByRole("button", { name: "원자재 추가" }).click();
    await expect(page.getByText(name)).toBeVisible({ timeout: 10000 });

    const statValueAfter = await page
      .locator("section.grid .text-stat, section.grid [class*='text-stat']")
      .first()
      .textContent();
    expect(statValueAfter).not.toEqual(statValueBefore);
  });

  test("원자재 삭제", async ({ page }) => {
    const name = `삭제_${Date.now()}`;
    await page.getByLabel("원자재 이름").fill(name);
    await page.getByLabel("현재고").fill("100");
    await page.getByLabel("안전재고").fill("20");
    await page.getByRole("button", { name: "원자재 추가" }).click();
    await expect(page.getByText(name)).toBeVisible({ timeout: 10000 });

    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: `${name} 삭제` }).click();
    await expect(page.getByText(name)).not.toBeVisible({ timeout: 10000 });
  });

  test("kg 입력 시 g 단위 변환 미리보기 표시", async ({ page }) => {
    await page.getByLabel("원자재 이름").fill("테스트원두");
    await page.getByLabel("단위").selectOption("kg");
    await page.getByLabel("현재고").fill("1");
    await expect(page.getByText(/g로 저장됩니다/)).toBeVisible({ timeout: 5000 });
  });
});
