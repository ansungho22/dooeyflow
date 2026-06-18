"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      router.replace(`/login?error=${error}`);
      return;
    }

    if (token) {
      setToken(token);
      router.replace("/dashboard");
    } else {
      router.replace("/login?error=no_token");
    }
  }, [searchParams, router, setToken]);

  return <p className="text-text-muted">로그인 처리 중…</p>;
}

/**
 * OAuth 콜백 페이지.
 * URL에서 token 파라미터를 받아 로그인 처리 후 대시보드로 이동.
 */
export default function AuthCallbackPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <Suspense fallback={<p className="text-text-muted">로딩 중…</p>}>
        <AuthCallbackContent />
      </Suspense>
    </main>
  );
}
