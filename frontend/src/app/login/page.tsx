"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ApiError, getOAuthUrl, register as apiRegister, type OAuthProvider } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

type Mode = "login" | "register";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<OAuthProvider | null>(null);

  // URL 에러 파라미터 처리
  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError === "auth_failed") setError("소셜 로그인에 실패했습니다.");
    else if (urlError === "not_implemented") setError("아직 지원하지 않는 로그인 방식입니다.");
    else if (urlError === "no_token") setError("인증 토큰을 받지 못했습니다.");
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);

    if (mode === "register" && password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "register") {
        await apiRegister(email, password);
      }
      await login(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : "문제가 발생했습니다. 다시 시도해 주세요.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(): void {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
    setPassword("");
    setPasswordConfirm("");
  }

  async function handleSocialLogin(provider: OAuthProvider): Promise<void> {
    setError(null);
    setSocialLoading(provider);
    try {
      const { authorization_url } = await getOAuthUrl(provider);
      window.location.href = authorization_url;
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "소셜 로그인을 시작할 수 없습니다.",
      );
      setSocialLoading(null);
    }
  }

  return (
    <Card className="p-7">
      <h1 className="text-heading font-bold">
        {mode === "login" ? "다시 오셨네요" : "매장 관리 시작하기"}
      </h1>
      <p className="mt-1.5 text-sm text-text-muted">
        {mode === "login"
          ? "이메일로 로그인하세요."
          : "이메일과 비밀번호로 계정을 만드세요."}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          label="이메일"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="owner@cafe.com"
        />
        <Input
          label="비밀번호"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="8자 이상"
        />
        {mode === "register" && (
          <Input
            label="비밀번호 확인"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="비밀번호 재입력"
          />
        )}

        {error && (
          <p className="rounded bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={submitting} className="w-full">
          {submitting
            ? "처리 중…"
            : mode === "login"
              ? "로그인"
              : "계정 만들기"}
        </Button>
      </form>

      <button
        type="button"
        onClick={switchMode}
        className="mt-5 w-full text-sm text-text-muted transition-colors hover:text-accent"
      >
        {mode === "login"
          ? "계정이 없으신가요? 회원가입"
          : "이미 계정이 있으신가요? 로그인"}
      </button>

      {mode === "login" && (
        <>
          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-text-muted">또는</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="mt-5 space-y-2.5">
            <button
              type="button"
              onClick={() => handleSocialLogin("kakao")}
              disabled={socialLoading !== null}
              className="flex w-full items-center justify-center gap-2.5 rounded-lg bg-[#FEE500] px-4 py-3 font-semibold text-[#191919] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M12 3C6.477 3 2 6.463 2 10.714c0 2.788 1.922 5.23 4.778 6.583-.148.532-.949 3.426-.982 3.649 0 0-.02.166.088.229.108.063.235.015.235.015.31-.043 3.587-2.342 4.156-2.74.56.08 1.14.12 1.725.12 5.523 0 10-3.463 10-7.714S17.523 3 12 3z" />
              </svg>
              {socialLoading === "kakao" ? "연결 중…" : "카카오로 로그인"}
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin("naver")}
              disabled={socialLoading !== null}
              className="flex w-full items-center justify-center gap-2.5 rounded-lg bg-[#03C75A] px-4 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M16.273 12.845L7.376 3H3v18h4.727V12.155L16.624 21H21V3h-4.727z" />
              </svg>
              {socialLoading === "naver" ? "연결 중…" : "네이버로 로그인"}
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin("apple")}
              disabled={socialLoading !== null}
              className="flex w-full items-center justify-center gap-2.5 rounded-lg bg-black px-4 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              {socialLoading === "apple" ? "연결 중…" : "Apple로 로그인"}
            </button>
          </div>
        </>
      )}
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <Link
        href="/"
        className="mb-8 text-sm font-semibold text-text-muted hover:text-text"
      >
        ← Dooeyflow
      </Link>
      <Suspense fallback={<Card className="p-7"><p className="text-text-muted">로딩 중…</p></Card>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
