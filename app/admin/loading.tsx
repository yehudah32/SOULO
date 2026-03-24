export default function AdminLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 rounded-full border-2 border-soulo-purple border-t-transparent animate-spin" />
        <p className="font-sans text-sm text-gray-700">Loading…</p>
      </div>
    </div>
  );
}
