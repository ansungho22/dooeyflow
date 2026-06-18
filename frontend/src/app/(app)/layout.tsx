"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StoreSetup } from "@/components/dashboard/StoreSetup";
import { StoreContextProvider } from "@/lib/StoreContext";
import { useAuth } from "@/lib/useAuth";
import { usePushRegistration } from "@/lib/usePushRegistration";
import { useStore } from "@/lib/useStore";

/**
 * 인증이 필요한 모든 화면의 공통 셸.
 * 인증 가드 + 매장 로딩/온보딩 + 헤더/내비를 한 곳에서 처리하고,
 * 활성 매장을 StoreContext로 하위에 제공한다.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const {
    stores,
    activeStore,
    loading: storeLoading,
    selectStore,
    addStore,
    refresh,
  } = useStore(Boolean(user));

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  // 네이티브(iOS) 환경이면 활성 매장 기준으로 APNs 토큰 등록
  usePushRegistration(activeStore?.id ?? null);

  if (authLoading || (user && storeLoading)) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-text-muted">
        불러오는 중…
      </div>
    );
  }

  if (!user) return null;

  if (!activeStore) {
    return <StoreSetup onCreate={addStore} />;
  }

  return (
    <StoreContextProvider value={{ store: activeStore, refreshTrigger: 0, refresh }}>
      <div className="min-h-dvh">
        <DashboardHeader
          store={activeStore}
          stores={stores}
          onSelectStore={selectStore}
          onLogout={logout}
        />
        {children}
      </div>
    </StoreContextProvider>
  );
}
