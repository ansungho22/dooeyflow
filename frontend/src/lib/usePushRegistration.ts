"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { registerDeviceToken } from "@/lib/api";

/**
 * 네이티브(iOS) 환경에서 APNs 푸시 토큰을 등록한다.
 * 웹 브라우저에서는 동작하지 않으며(별도 Web Push 경로), 조용히 건너뛴다.
 */
export function usePushRegistration(storeId: number | null): void {
  useEffect(() => {
    if (storeId === null) return;
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;

    async function setup(): Promise<void> {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== "granted") return;

      // APNs 토큰 수신 리스너 등록 후 register 호출
      await PushNotifications.addListener("registration", (tokenData) => {
        if (cancelled || storeId === null) return;
        // 실패해도 앱 흐름을 막지 않는다 (알림은 부가 기능)
        void registerDeviceToken(storeId, "ios", tokenData.value).catch(() => {});
      });

      await PushNotifications.register();
    }

    void setup();

    return () => {
      cancelled = true;
      void PushNotifications.removeAllListeners();
    };
  }, [storeId]);
}
