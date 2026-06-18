"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ApiError, register as apiRegister } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
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

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <Link
        href="/"
        className="mb-8 text-sm font-semibold text-text-muted hover:text-text"
      >
        ← Dooeyflow
      </Link>
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

          {error && (
            <p className="rounded bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting
              ? "처리 중…"
              : mode === "login"
                ? "로그인"
                : "계정 만들기"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
          className="mt-5 w-full text-sm text-text-muted transition-colors hover:text-accent"
        >
          {mode === "login"
            ? "계정이 없으신가요? 회원가입"
            : "이미 계정이 있으신가요? 로그인"}
        </button>
      </Card>
    </main>
  );
}
