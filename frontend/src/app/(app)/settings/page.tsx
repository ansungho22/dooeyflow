"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ApiError, updateStore } from "@/lib/api";
import { useActiveStore, useStoreRefresh } from "@/lib/StoreContext";

export default function SettingsPage() {
  const store = useActiveStore();
  const refreshStore = useStoreRefresh();

  const [name, setName] = useState(store.name);
  const [tossEnabled, setTossEnabled] = useState(store.toss_enabled);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    try {
      await updateStore(store.id, { name, toss_enabled: tossEnabled });
      await refreshStore();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-5 py-6">
      <h1 className="text-xl font-bold">매장 설정</h1>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="매장 이름"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="카페 이름"
          />

          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={tossEnabled}
                onChange={(e) => setTossEnabled(e.target.checked)}
                className="h-5 w-5 rounded border-border text-accent focus:ring-accent"
              />
              <div>
                <span className="font-semibold">토스 POS 연동</span>
                <p className="text-sm text-text-subtle">
                  토스 POS를 사용하면 판매 시 재고가 자동으로 차감됩니다.
                </p>
              </div>
            </label>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          {success && (
            <p className="text-sm font-semibold text-green-600">저장되었습니다!</p>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "저장 중…" : "저장"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
