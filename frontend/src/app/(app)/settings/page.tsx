"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ApiError, updateStore } from "@/lib/api";
import { useActiveStore, useStoreRefresh } from "@/lib/StoreContext";

const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"}/api/v1/webhooks/toss`;

export default function SettingsPage() {
  const store = useActiveStore();
  const refreshStore = useStoreRefresh();

  const [name, setName] = useState(store.name);
  const [tossEnabled, setTossEnabled] = useState(store.toss_enabled);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  function handleCopy(): void {
    navigator.clipboard.writeText(WEBHOOK_URL).then(() => {
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }
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
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccess(false), 2000);
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

          <div className="space-y-3">
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

            {tossEnabled && (
              <div className="rounded-lg border border-accent/30 bg-accent-soft p-4 space-y-3">
                <p className="text-sm font-semibold text-accent-strong">토스 POS 웹훅 설정 방법</p>
                <ol className="text-sm text-text-subtle space-y-1 list-decimal list-inside">
                  <li>토스 POS 관리자 → 설정 → 웹훅으로 이동</li>
                  <li>아래 URL을 웹훅 엔드포인트로 등록</li>
                  <li>이벤트 유형: <span className="font-mono text-xs bg-surface px-1 py-0.5 rounded">PAYMENT_STATUS_CHANGED</span> 선택</li>
                </ol>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-surface px-3 py-2 text-xs font-mono text-text break-all border border-border">
                    {WEBHOOK_URL}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="shrink-0 rounded-md bg-accent px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent/90"
                  >
                    {copied ? "복사됨 ✓" : "복사"}
                  </button>
                </div>
              </div>
            )}
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
