"use client";

import { createContext, useContext } from "react";
import type { Store } from "@/lib/types";

interface StoreContextValue {
  store: Store;
  refreshTrigger: number;
  refresh: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export const StoreContextProvider = StoreContext.Provider;

/** 인증 레이아웃 하위에서 활성 매장에 접근한다. */
export function useActiveStore(): Store {
  const ctx = useContext(StoreContext);
  if (ctx === null) {
    throw new Error("useActiveStore must be used within the app layout");
  }
  return ctx.store;
}

/** 매장 정보를 다시 불러온다. */
export function useStoreRefresh(): () => Promise<void> {
  const ctx = useContext(StoreContext);
  if (ctx === null) {
    throw new Error("useStoreRefresh must be used within the app layout");
  }
  return ctx.refresh;
}
