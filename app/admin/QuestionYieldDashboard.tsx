'use client';

import { useState, useEffect } from 'react';

interface QuestionYield {
  id: number;
  question_text: string;
  stage: number;
  target_types: number[];
  times_used: number;
  avg_information_yield: number;
  is_baruch_sourced: boolean;
}

export default function QuestionYieldDashboard() {
  const [questions, setQuestions] = useState<QuestionYield[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'yield' | 'uses' | 'stage'>('yield');

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const res = await fetch('/api/admin/questions-yield');
        if (res.ok) {
          const data = await res.json();
          setQuestions(data.questions || []);
        }
      } catch { /* non-fatal */ }
      setLoading(false);
    }
    fetchQuestions();
  }, []);

  const sorted = [...questions].sort((a, b) => {
    if (sortBy === 'yield') return b.avg_information_yield - a.avg_information_yield;
    if (sortBy === 'uses') return b.times_used - a.times_used;
    return a.stage - b.stage;
  });

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <span className="font-sans text-[0.68rem] uppercase tracking-[0.08em] text-gray-500">
          Question Yield ({questions.length} questions)
        </span>
        <div className="flex gap-1.5">
          {(['yield', 'uses', 'stage'] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className={`font-sans text-[0.65rem] px-2.5 py-1 rounded-lg transition-colors ${sortBy === s ? 'bg-[#2563EB] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {s === 'yield' ? 'Yield' : s === 'uses' ? 'Uses' : 'Stage'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : questions.length === 0 ? (
        <p className="text-sm text-gray-400">No questions found. Run the seed script first.</p>
      ) : (
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-gray-400 border-b">
                <th className="py-2 pr-2">ID</th>
                <th className="py-2 pr-2">Question</th>
                <th className="py-2 pr-2">Stage</th>
                <th className="py-2 pr-2">Uses</th>
                <th className="py-2 pr-2">Yield</th>
                <th className="py-2">B</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(q => {
                const yieldPct = Math.round(q.avg_information_yield * 100);
                const yieldColor = yieldPct >= 70 ? '#22C55E' : yieldPct >= 40 ? '#F59E0B' : '#EF4444';
                return (
                  <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 pr-2 text-gray-400">{q.id}</td>
                    <td className="py-2 pr-2 text-gray-700 max-w-[200px] truncate">{q.question_text}</td>
                    <td className="py-2 pr-2 text-gray-500">{q.stage}</td>
                    <td className="py-2 pr-2 text-gray-500">{q.times_used}</td>
                    <td className="py-2 pr-2 font-semibold" style={{ color: yieldColor }}>{yieldPct}%</td>
                    <td className="py-2">{q.is_baruch_sourced ? '✦' : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
