import { adminClient } from '@/lib/supabase';
import Link from 'next/link';
import AssignUserForm from './AssignUserForm';

type UserRow = {
  id: string;
  email: string;
  passkey: string;
  created_at: string;
};

type AssessmentRow = {
  session_id: string;
  user_id: string;
  leading_type: number;
  confidence: number;
  tritype: string | null;
  exchange_count: number;
  created_at: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const TYPE_NAMES: Record<number, string> = {
  1: 'Reformer', 2: 'Helper', 3: 'Achiever', 4: 'Individualist',
  5: 'Investigator', 6: 'Loyalist', 7: 'Enthusiast', 8: 'Challenger', 9: 'Peacemaker',
};

export default async function AdminUsersPage() {
  const [{ data: users }, { data: assessments }] = await Promise.all([
    adminClient.from('users').select('*').order('created_at', { ascending: false }),
    adminClient.from('assessment_results').select('session_id, user_id, leading_type, confidence, tritype, exchange_count, created_at').order('created_at', { ascending: false }),
  ]);

  const userList = (users ?? []) as UserRow[];
  const assessmentList = (assessments ?? []) as AssessmentRow[];

  // Group assessments by user
  const assessmentsByUser: Record<string, AssessmentRow[]> = {};
  for (const a of assessmentList) {
    if (a.user_id) {
      if (!assessmentsByUser[a.user_id]) assessmentsByUser[a.user_id] = [];
      assessmentsByUser[a.user_id].push(a);
    }
  }

  // Unassigned assessments (no user_id)
  const unassigned = assessmentList.filter((a) => !a.user_id);

  return (
    <div className="max-w-[1100px] mx-auto px-5 py-8 flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-xl font-semibold text-[#2C2C2C]">Users & Assessments</h1>
        <span className="font-sans text-xs text-[#9B9590]">{userList.length} users · {assessmentList.length} assessments</span>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#E8E4E0]">
              <th className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] px-5 py-3">Email</th>
              <th className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] px-5 py-3">Save Key</th>
              <th className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] px-5 py-3">Joined</th>
              <th className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] px-5 py-3">Assessments</th>
              <th className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] px-5 py-3">Latest Type</th>
              <th className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {userList.map((user) => {
              const userAssessments = assessmentsByUser[user.id] || [];
              const latest = userAssessments[0];
              return (
                <tr key={user.id} className="border-b border-[#F0EBE6] hover:bg-[#FAF8F5] transition-colors">
                  <td className="font-sans text-sm text-[#2C2C2C] px-5 py-3">{user.email}</td>
                  <td className="font-mono text-xs text-[#9B9590] px-5 py-3">{user.passkey}</td>
                  <td className="font-sans text-xs text-[#9B9590] px-5 py-3">{formatDate(user.created_at)}</td>
                  <td className="font-sans text-sm text-[#2C2C2C] px-5 py-3">{userAssessments.length}</td>
                  <td className="px-5 py-3">
                    {latest ? (
                      <span className="font-sans text-sm">
                        <span className="font-bold text-[#2563EB]">{latest.leading_type}</span>
                        <span className="text-[#9B9590] text-xs ml-1">{TYPE_NAMES[latest.leading_type] || ''}</span>
                        <span className="text-[#9B9590] text-xs ml-2">{Math.round(latest.confidence * 100)}%</span>
                      </span>
                    ) : (
                      <span className="font-sans text-xs text-[#D0CAC4]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {latest && (
                      <Link
                        href={`/admin/${latest.session_id}`}
                        className="font-sans text-xs text-[#2563EB] hover:text-[#1D4ED8]"
                      >
                        View Results
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
            {userList.length === 0 && (
              <tr>
                <td colSpan={6} className="font-sans text-sm text-[#9B9590] text-center py-8">
                  No users registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Unassigned assessments */}
      {unassigned.length > 0 && (
        <div>
          <h2 className="font-serif text-lg font-semibold text-[#2C2C2C] mb-3">
            Unassigned Assessments ({unassigned.length})
          </h2>
          <p className="font-sans text-xs text-[#9B9590] mb-4">
            These assessments were completed without a user account.
          </p>
          <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#E8E4E0]">
                  <th className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] px-5 py-3">Session ID</th>
                  <th className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] px-5 py-3">Type</th>
                  <th className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] px-5 py-3">Confidence</th>
                  <th className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] px-5 py-3">Date</th>
                  <th className="font-sans text-[0.65rem] uppercase tracking-widest text-[#9B9590] px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {unassigned.map((a) => (
                  <tr key={a.session_id} className="border-b border-[#F0EBE6] hover:bg-[#FAF8F5]">
                    <td className="font-mono text-xs text-[#9B9590] px-5 py-3 truncate max-w-[200px]">{a.session_id}</td>
                    <td className="font-sans text-sm px-5 py-3">
                      <span className="font-bold text-[#2563EB]">{a.leading_type}</span>
                      <span className="text-xs text-[#9B9590] ml-1">{TYPE_NAMES[a.leading_type] || ''}</span>
                    </td>
                    <td className="font-sans text-sm text-[#2C2C2C] px-5 py-3">{Math.round(a.confidence * 100)}%</td>
                    <td className="font-sans text-xs text-[#9B9590] px-5 py-3">{formatDate(a.created_at)}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/${a.session_id}`}
                            className="font-sans text-xs text-[#2563EB] hover:text-[#1D4ED8]"
                          >
                            View
                          </Link>
                          <AssignUserForm sessionId={a.session_id} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
