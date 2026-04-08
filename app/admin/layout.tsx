import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <nav className="bg-[#2C2C2C] px-6 py-2 flex items-center gap-6">
        <span className="font-serif text-sm font-semibold text-[#2563EB]">Soulo Admin</span>
        <Link href="/admin" className="font-sans text-xs text-[#D8E4F0] hover:text-white">
          Dashboard
        </Link>
        <Link href="/admin/simulate" className="font-sans text-xs text-[#D8E4F0] hover:text-white">
          Simulate
        </Link>
        <Link href="/admin/shadow-mode" className="font-sans text-xs text-[#D8E4F0] hover:text-white">
          Shadow Mode
        </Link>
        <Link href="/admin/preview-results" className="font-sans text-xs text-[#D8E4F0] hover:text-white">
          Preview Results
        </Link>
        <Link href="/admin/users" className="font-sans text-xs text-[#D8E4F0] hover:text-white">
          Users
        </Link>
        <a href="/api/admin/logout" className="ml-auto font-sans text-xs text-[#9B9590] hover:text-[#D8E4F0]">
          Logout
        </a>
      </nav>
      {children}
    </div>
  );
}
