import Link from 'next/link';

export default function AdminNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] px-6">
      <div className="max-w-md text-center">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[#9B9590] mb-2">
          404
        </p>
        <h1 className="font-serif text-2xl text-[#2C2C2C] mb-3">Admin page not found.</h1>
        <p className="font-sans text-sm text-[#6B6B6B] mb-6">
          The session, dashboard, or route you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/admin"
          className="px-5 py-2 rounded-full bg-[#2C2C2C] text-white font-sans text-sm hover:bg-black transition inline-block"
        >
          Back to admin home
        </Link>
      </div>
    </div>
  );
}
