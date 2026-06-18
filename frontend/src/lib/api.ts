// 백엔드 API 클라이언트. 토큰 주입, 에러 정규화, 타입 안전 요청을 담당한다.

import type {
  AuthToken,
  BatchSaleResult,
  Material,
  Menu,
  Recipe,
  SaleLine,
  Store,
  User,
} from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const TOKEN_KEY = "dooeyflow_token";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      (body && typeof body.detail === "string" && body.detail) ||
      "요청을 처리하지 못했습니다.";
    throw new ApiError(response.status, detail);
  }

  return body as T;
}

// --- 인증 ---

export async function register(
  email: string,
  password: string,
  fullName?: string,
): Promise<User> {
  return request<User>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name: fullName ?? null }),
  });
}

export async function login(email: string, password: string): Promise<AuthToken> {
  return request<AuthToken>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchMe(): Promise<User> {
  return request<User>("/api/v1/auth/me");
}

// --- 매장 ---

export async function listStores(): Promise<Store[]> {
  return request<Store[]>("/api/v1/auth/stores");
}

export async function createStore(name: string): Promise<Store> {
  return request<Store>("/api/v1/auth/stores", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

// --- 원자재 ---

export async function listMaterials(storeId: number): Promise<Material[]> {
  return request<Material[]>(`/api/v1/stores/${storeId}/materials`);
}

export async function createMaterial(
  storeId: number,
  data: { name: string; unit: string; current_stock: string; safety_stock: string },
): Promise<Material> {
  return request<Material>(`/api/v1/stores/${storeId}/materials`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// --- 메뉴 ---

export async function listMenus(storeId: number): Promise<Menu[]> {
  return request<Menu[]>(`/api/v1/stores/${storeId}/menus`);
}

export async function createMenu(
  storeId: number,
  data: { name: string; price: string; pos_menu_code?: string | null },
): Promise<Menu> {
  return request<Menu>(`/api/v1/stores/${storeId}/menus`, {
    method: "POST",
    body: JSON.stringify({
      name: data.name,
      price: data.price,
      pos_menu_code: data.pos_menu_code ?? null,
    }),
  });
}

// --- 레시피 (BOM) ---

export async function listRecipes(
  storeId: number,
  menuId: number,
): Promise<Recipe[]> {
  return request<Recipe[]>(`/api/v1/stores/${storeId}/menus/${menuId}/recipes`);
}

export async function addRecipeItem(
  storeId: number,
  menuId: number,
  data: { material_id: number; quantity_per_unit: string },
): Promise<Recipe> {
  return request<Recipe>(`/api/v1/stores/${storeId}/menus/${menuId}/recipes`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteRecipeItem(
  storeId: number,
  menuId: number,
  recipeId: number,
): Promise<void> {
  return request<void>(
    `/api/v1/stores/${storeId}/menus/${menuId}/recipes/${recipeId}`,
    { method: "DELETE" },
  );
}

// --- 재고 차감 ---

export async function batchSale(
  storeId: number,
  lines: SaleLine[],
): Promise<BatchSaleResult> {
  return request<BatchSaleResult>(`/api/v1/stores/${storeId}/inventory/batch-sale`, {
    method: "POST",
    body: JSON.stringify({ lines }),
  });
}
