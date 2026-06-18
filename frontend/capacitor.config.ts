import type { CapacitorConfig } from "@capacitor/cli";

// Dooeyflow iPhone/iPad 앱 설정.
// 웹 빌드 산출물(out/)을 네이티브 쉘에 번들한다. Universal 앱으로 iPad도 지원.
const config: CapacitorConfig = {
  appId: "com.dooeyflow.app",
  appName: "Dooeyflow",
  webDir: "out",
  ios: {
    // 상태바/노치 안전영역은 웹 viewport(viewportFit=cover)에서 처리
    contentInset: "always",
  },
};

export default config;
