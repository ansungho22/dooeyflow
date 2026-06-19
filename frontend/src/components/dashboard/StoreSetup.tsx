"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/lib/api";

interface StoreSetupProps {
  onCreate: (name: string) => Promise<void>;
}

export function StoreSetup({ onCreate }: StoreSetupProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onCreate(name);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "매장 생성에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <Card className="p-7">
        <h1 className="text-heading font-bold">첫 매장을 만들어 주세요</h1>
        <p className="mt-1.5 text-sm text-text-muted">
          매장 이름을 입력하면 재고 관리를 시작할 수 있어요.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label="매장 이름"
            required
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="으뜸 카페 강남점"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" size="lg" disabled={submitting} className="w-full">
            {submitting ? "생성 중…" : "매장 만들기"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
