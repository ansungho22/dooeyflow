import Link from "next/link";
import { Button } from "@/components/ui/Button";

// 랜딩: 제품 정체성을 드러내는 진입점. 로그인/대시보드로 안내.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16">
      <span className="mb-4 inline-flex w-fit items-center rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent-strong">
        요식업 재고관리
      </span>
      <h1 className="text-stat font-bold leading-tight tracking-tight">
        장사에 집중하세요.
        <br />
        재고는 <span className="text-accent">Dooeyflow</span>가 셉니다.
      </h1>
      <p className="mt-5 max-w-xl text-lg text-text-muted">
        토스 POS 연동으로 판매 즉시 원재료가 자동 차감되고, 레시피 기반으로 정확하게
        관리됩니다. 재고가 부족해지면 바로 알려드려요.
      </p>
      <div className="mt-9 flex flex-wrap gap-3">
        <Link href="/login">
          <Button>시작하기</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="secondary">대시보드 보기</Button>
        </Link>
      </div>
    </main>
  );
}
