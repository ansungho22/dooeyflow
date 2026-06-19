import { test, expect, type Page } from "@playwright/test";

const EMAIL = `e2e_menus_${Date.now()}@test.com`;
const PASSWORD = "password1234";
const STORE_NAME = "메뉴 테스트 카페";

async function registerAndLogin(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByRole("button", { name: /계정이 없으신가요/ }).click();
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByLabel("비밀번호 확인").fill(password);
  await page.getByRole("button", { name: "계정 만들기" }).click();
  await page.waitForURL("**/dashboard**", { timeout: 15000 });
}

async function loginOnly(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await page.waitForURL("**/dashboard**", { timeout: 15000 });
}

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

test.describe("메뉴 관리", () => {
  // 계정 + 원자재를 suite 시작 전 1회 세팅
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await registerAndLogin(page, EMAIL, PASSWORD);
    await ensureStore(page, STORE_NAME);

    // 원자재 추가 (메뉴 목록 렌더링에 필요)
    await page.goto("/dashboard");
    await page.waitForSelector('h2:has-text("원자재 추가")', { timeout: 10000 });
    await page.getByLabel("원자재 이름").fill("원두");
    await page.getByLabel("현재고").fill("500");
    await page.getByLabel("안전재고").fill("100");
    await page.getByRole("button", { name: "원자재 추가" }).click();
    await page.waitForSelector('text=원두', { timeout: 10000 });

    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await loginOnly(page, EMAIL, PASSWORD);
    await page.goto("/menus");
    await expect(page.getByRole("heading", { name: "메뉴 추가" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("메뉴 추가", async ({ page }) => {
    const menuName = `아메리카노_${Date.now()}`;
    await page.getByLabel("메뉴 이름").fill(menuName);
    await page.getByLabel("판매 가격").fill("4500");
    await page.getByRole("button", { name: "메뉴 추가" }).click();
    // 원자재가 있으므로 메뉴 목록에 h3으로 표시됨
    await expect(page.getByRole("heading", { name: menuName, level: 3 })).toBeVisible({
      timeout: 10000,
    });
  });

  test("메뉴 추가 시 가격 원화 형식 표시", async ({ page }) => {
    const menuName = `라떼_${Date.now()}`;
    await page.getByLabel("메뉴 이름").fill(menuName);
    await page.getByLabel("판매 가격").fill("5000");
    await page.getByRole("button", { name: "메뉴 추가" }).click();
    await expect(page.getByRole("heading", { name: menuName, level: 3 })).toBeVisible({
      timeout: 10000,
    });
    // formatWon은 ₩5,000 형식으로 렌더링함
    await expect(page.getByText(/₩5,000/)).toBeVisible({ timeout: 5000 });
  });

  test("메뉴 삭제", async ({ page }) => {
    const menuName = `삭제메뉴_${Date.now()}`;
    await page.getByLabel("메뉴 이름").fill(menuName);
    await page.getByLabel("판매 가격").fill("3000");
    await page.getByRole("button", { name: "메뉴 추가" }).click();
    await expect(page.getByRole("heading", { name: menuName, level: 3 })).toBeVisible({
      timeout: 10000,
    });
    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: `${menuName} 메뉴 삭제` }).click();
    await expect(
      page.getByRole("heading", { name: menuName, level: 3 }),
    ).not.toBeVisible({ timeout: 10000 });
  });

  test("POS 코드 입력 토글", async ({ page }) => {
    await expect(page.getByLabel("POS 코드")).not.toBeVisible();
    await page.getByRole("button", { name: /토스 POS 코드 입력/ }).click();
    await expect(page.getByLabel("POS 코드")).toBeVisible();
  });
});
