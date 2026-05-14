export function LoadingState() {
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" />
      <div className="h-3 w-full animate-pulse rounded-full bg-slate-100" />
      <div className="h-3 w-4/5 animate-pulse rounded-full bg-slate-100" />
      <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
    </div>
  );
}
