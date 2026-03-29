export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="lav-page-hero animate-pulse">
        <div className="h-3 w-28 rounded-full bg-[var(--surface-strong)]" />
        <div className="mt-4 h-10 w-64 rounded-2xl bg-[var(--surface-strong)]" />
        <div className="mt-4 h-4 w-full max-w-2xl rounded-full bg-[var(--surface-strong)]" />
        <div className="mt-2 h-4 w-3/4 max-w-xl rounded-full bg-[var(--surface-strong)]" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_460px]">
        <div className="lav-data-shell min-h-[420px] animate-pulse p-5">
          <div className="h-12 w-full rounded-2xl bg-[var(--surface-strong)]" />
          <div className="mt-5 space-y-3">
            <div className="h-24 rounded-2xl bg-[var(--surface-strong)]" />
            <div className="h-24 rounded-2xl bg-[var(--surface-strong)]" />
            <div className="h-24 rounded-2xl bg-[var(--surface-strong)]" />
          </div>
        </div>

        <div className="lav-data-shell min-h-[420px] animate-pulse p-5">
          <div className="h-8 w-32 rounded-full bg-[var(--surface-strong)]" />
          <div className="mt-5 h-28 rounded-2xl bg-[var(--surface-strong)]" />
          <div className="mt-4 h-14 rounded-2xl bg-[var(--surface-strong)]" />
          <div className="mt-3 h-14 rounded-2xl bg-[var(--surface-strong)]" />
          <div className="mt-6 h-14 rounded-2xl bg-[var(--surface-strong)]" />
        </div>
      </div>
    </div>
  );
}
