// 백엔드 API 응답과 1:1로 매핑되는 도메인 타입.
// 수량은 백엔드가 DECIMAL 문자열로 직렬화하므로 string으로 받는다 (정밀도 보존).

export type ReasonCode = "SALE" | "WASTE" | "AUDIT" | "CANCEL";

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
}

export interface Store {
  id: number;
  name: string;
  toss_enabled: boolean;
}

export interface Material {
  id: number;
  store_id: number;
  name: string;
  unit: string;
  current_stock: string;
  safety_stock: string;
  is_low_stock: boolean;
}

export interface Menu {
  id: number;
  store_id: number;
  name: string;
  price: string;
  pos_menu_code: string | null;
}

export interface Recipe {
  id: number;
  store_id: number;
  menu_id: number;
  material_id: number;
  quantity_per_unit: string;
  instructions: string | null;
  image_url: string | null;
}

export interface SaleLine {
  menu_id: number;
  quantity_sold: number;
}

export interface MaterialStockChange {
  material_id: number;
  material_name: string;
  consumed: string;
  remaining_stock: string;
  is_low_stock: boolean;
}

export interface BatchSaleResult {
  changes: MaterialStockChange[];
  low_stock_materials: MaterialStockChange[];
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}
