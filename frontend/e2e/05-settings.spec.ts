import { test, expect, type Page } from "@playwright/test";

const EMAIL = `e2e_settings_${Date.now()}@test.com`;
const PASSWORD = "password1234";
const STORE_NAME = "설정 테스트 카페";

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

test.describe("매장 설정", () => {
  test.beforeEach(async ({ page }) => {
    if (!accountCreated) {
      await registerAndLogin(page, EMAIL, PASSWORD);
      await ensureStore(page, STORE_NAME);
      accountCreated = true;
    } else {
      await loginOnly(page, EMAIL, PASSWORD);
    }
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "매장 설정" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("설정 페이지 로드 및 매장 이름 표시", async ({ page }) => {
    const nameInput = page.getByLabel("매장 이름");
    await expect(nameInput).toBeVisible();
    const value = await nameInput.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });

  test("매장 이름 수정 및 저장", async ({ page }) => {
    const newName = `수정카페_${Date.now()}`;
    await page.getByLabel("매장 이름").fill(newName);
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page.getByText("저장되었습니다!")).toBeVisible({ timeout: 10000 });
  });

  test("저장 후 성공 메시지가 자동으로 사라짐", async ({ page }) => {
    await page.getByRole("button", { name: "저장" }).click();
    const msg = page.getByText("저장되었습니다!");
    await expect(msg).toBeVisible({ timeout: 10000 });
    await expect(msg).not.toBeVisible({ timeout: 5000 });
  });

  test("토스 POS 체크박스 활성화 시 웹훅 안내 표시", async ({ page }) => {
    const checkbox = page.getByRole("checkbox");
    if (await checkbox.isChecked()) {
      await checkbox.uncheck();
    }
    await expect(page.getByText("토스 POS 웹훅 설정 방법")).not.toBeVisible();
    await checkbox.check();
    await expect(page.getByText("토스 POS 웹훅 설정 방법")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("code")).toBeVisible();
  });

  test("토스 POS 체크박스 비활성화 시 웹훅 안내 숨김", async ({ page }) => {
    const checkbox = page.getByRole("checkbox");
    if (!(await checkbox.isChecked())) {
      await checkbox.check();
    }
    await expect(page.getByText("토스 POS 웹훅 설정 방법")).toBeVisible({ timeout: 5000 });
    await checkbox.uncheck();
    await expect(page.getByText("토스 POS 웹훅 설정 방법")).not.toBeVisible({
      timeout: 5000,
    });
  });
});
