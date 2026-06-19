"use client";

import { useCallback, useEffect, useState } from "react";
import { createStore, listStores } from "@/lib/api";
import type { Store } from "@/lib/types";

const ACTIVE_STORE_KEY = "dooeyflow_active_store";

interface StoreState {
  stores: Store[];
  activeStore: Store | null;
  loading: boolean;
}

/** 매장 목록 로드 + 활성 매장 선택/생성 관리. */
export function useStore(enabled: boolean) {
  const [state, setState] = useState<StoreState>({
    stores: [],
    activeStore: null,
    loading: true,
  });

  const load = useCallback(async (): Promise<void> => {
    const stores = await listStores();
    const savedId = Number(
      typeof window !== "undefined"
        ? window.localStorage.getItem(ACTIVE_STORE_KEY)
        : null,
    );
    const active =
      stores.find((s) => s.id === savedId) ?? stores[0] ?? null;
    setState({ stores, activeStore: active, loading: false });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    load().catch(() => setState((s) => ({ ...s, loading: false })));
  }, [enabled, load]);

  const selectStore = useCallback((store: Store): void => {
    window.localStorage.setItem(ACTIVE_STORE_KEY, String(store.id));
    setState((s) => ({ ...s, activeStore: store }));
  }, []);

  const addStore = useCallback(
    async (name: string): Promise<void> => {
      const store = await createStore(name);
      window.localStorage.setItem(ACTIVE_STORE_KEY, String(store.id));
      setState((s) => ({
        stores: [...s.stores, store],
        activeStore: store,
        loading: false,
      }));
    },
    [],
  );

  /** 현재 활성 매장 정보를 서버에서 다시 불러온다. */
  const refresh = useCallback(async (): Promise<void> => {
    const stores = await listStores();
    setState((s) => {
      const updated =
        stores.find((st) => st.id === s.activeStore?.id) ?? stores[0] ?? null;
      return { stores, activeStore: updated, loading: false };
    });
  }, []);

  return { ...state, selectStore, addStore, refresh };
}
