export default function Loading() {
  return <div role="status" aria-label="화면을 불러오는 중" className="space-y-5 py-2">
    <div className="h-8 w-32 animate-pulse rounded-xl bg-primary/5" />
    <div className="h-44 animate-pulse rounded-3xl bg-primary/5" />
    <div className="h-64 animate-pulse rounded-3xl bg-primary/5" />
    <span className="sr-only">잠시만 기다려 주세요.</span>
  </div>;
}
