import { test, expect, type Page } from "@playwright/test";

const EMAIL = `e2e_sales_${Date.now()}@test.com`;
const PASSWORD = "password1234";
const STORE_NAME = "판매 테스트 카페";

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

let accountCreated = false;

test.describe("판매 입력", () => {
  test.beforeAll(async ({ browser }) => {
    // 계정 + 원자재 + 메뉴를 suite 시작 전 1회만 세팅
    const page = await browser.newPage();
    await registerAndLogin(page, EMAIL, PASSWORD);
    await ensureStore(page, STORE_NAME);

    // 원자재 추가
    await page.goto("/dashboard");
    await page.waitForSelector('h2:has-text("원자재 추가")', { timeout: 10000 });
    await page.getByLabel("원자재 이름").fill("원두");
    await page.getByLabel("현재고").fill("1000");
    await page.getByLabel("안전재고").fill("100");
    await page.getByRole("button", { name: "원자재 추가" }).click();
    await page.waitForTimeout(1000);

    // 메뉴 추가
    await page.goto("/menus");
    await page.waitForSelector('h2:has-text("메뉴 추가")', { timeout: 10000 });
    await page.getByLabel("메뉴 이름").fill("아메리카노");
    await page.getByLabel("판매 가격").fill("4500");
    await page.getByRole("button", { name: "메뉴 추가" }).click();
    await page.waitForSelector('h3:has-text("아메리카노")', { timeout: 10000 });

    accountCreated = true;
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await loginOnly(page, EMAIL, PASSWORD);
    await page.goto("/sales");
    await expect(page.getByRole("heading", { name: "판매 일괄 입력" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("판매 페이지 로드 및 메뉴 표시", async ({ page }) => {
    await expect(page.getByText("아메리카노")).toBeVisible({ timeout: 10000 });
  });

  test("수량 입력 없이 차감 버튼 비활성화", async ({ page }) => {
    await expect(page.getByText("아메리카노")).toBeVisible({ timeout: 10000 });
    const submitBtn = page.getByRole("button", { name: "수량을 입력하세요" });
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await expect(submitBtn).toBeDisabled();
  });

  test("판매 수량 입력 후 차감 버튼 활성화 및 수량 반영", async ({ page }) => {
    await expect(page.getByText("아메리카노")).toBeVisible({ timeout: 10000 });
    await page.getByRole("spinbutton", { name: "아메리카노 판매 수량" }).fill("3");
    const submitBtn = page.getByRole("button", { name: /잔 재고 차감/ });
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await expect(submitBtn).toContainText("3잔");
  });

  test("판매 차감 실행 후 수량 초기화", async ({ page }) => {
    await expect(page.getByText("아메리카노")).toBeVisible({ timeout: 10000 });
    await page.getByRole("spinbutton", { name: "아메리카노 판매 수량" }).fill("1");
    await page.getByRole("button", { name: /잔 재고 차감/ }).click();
    await expect(
      page.getByRole("button", { name: "수량을 입력하세요" }),
    ).toBeVisible({ timeout: 15000 });
  });
});
