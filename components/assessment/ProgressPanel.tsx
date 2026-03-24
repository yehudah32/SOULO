'use client';

interface Stage {
  id: number;
  name: string;
  description: string;
}

const STAGES: Stage[] = [
  { id: 1, name: 'Who You Are', description: 'How you show up in the world' },
  { id: 2, name: 'What You Value', description: 'What you protect and prioritize' },
  { id: 3, name: 'Why You Do What You Do', description: 'The motivation beneath the behavior' },
  { id: 4, name: 'How You React', description: 'Your automatic patterns under pressure' },
  { id: 5, name: 'How You Respond', description: 'Who you are when you choose differently' },
  { id: 6, name: 'Your Core Pattern', description: 'What drives everything' },
  { id: 7, name: 'Your Results', description: 'Your full Defiant Spirit picture' },
];

interface ProgressPanelProps {
  currentStage: number;
  stageQuestionCount: number;
}

export default function ProgressPanel({ currentStage }: ProgressPanelProps) {
  return (
    <aside className="hidden md:flex flex-col w-[260px] flex-shrink-0 bg-white border-r border-white/40 h-full overflow-y-auto">
      <style>{`
        @keyframes step-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.3); }
          50% { transform: scale(1.08); box-shadow: 0 0 0 6px rgba(37, 99, 235, 0); }
        }
        @keyframes dash-march {
          0% { stroke-dashoffset: 12; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>

      <div className="p-6 flex flex-col gap-4">
        {/* Branding */}
        <div>
          <p className="font-serif text-[1rem] font-semibold text-soulo-purple">
            Soulo Enneagram
          </p>
          <p className="font-sans text-[0.7rem] text-gray-700 mt-0.5 leading-snug">
            Defy Your Number. Live Your Spirit.
          </p>
        </div>

        <div className="h-px bg-[#E8E4E0]" />

        {/* Vertical step tracker */}
        <div className="flex flex-col">
          {STAGES.map((stage, idx) => {
            const isCompleted = stage.id < currentStage;
            const isCurrent = stage.id === currentStage;
            const isFuture = stage.id > currentStage;
            const isLast = idx === STAGES.length - 1;

            // Line below this node connects to the next node
            const nextIsCompleted = stage.id + 1 < currentStage;
            const nextIsCurrent = stage.id + 1 === currentStage;

            return (
              <div key={stage.id} className="flex items-stretch">
                {/* Left column: node + connecting line */}
                <div className="flex flex-col items-center w-8 flex-shrink-0">
                  {/* Node */}
                  <div
                    className={`rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                      isCompleted
                        ? 'w-6 h-6 bg-[#7A9E7E]'
                        : isCurrent
                        ? 'w-8 h-8 bg-[#2563EB]'
                        : 'w-3 h-3 bg-[#D0CAC4]'
                    }`}
                    style={isCurrent ? { animation: 'step-pulse 2s ease-in-out infinite' } : undefined}
                  >
                    {isCompleted && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2.5 6l2.5 2.5 4.5-4.5"
                          stroke="white"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                    {isCurrent && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path
                          d="M8.5 2L5.5 7H8L5.5 12"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Connecting line to next node */}
                  {!isLast && (
                    <div className="flex-1 flex justify-center py-0.5" style={{ minHeight: 12 }}>
                      {nextIsCompleted || (isCompleted && nextIsCurrent) ? (
                        // Solid or dashed line
                        <svg width="2" height="100%" className="overflow-visible">
                          <line
                            x1="1" y1="0" x2="1" y2="100%"
                            stroke={nextIsCurrent && !nextIsCompleted ? '#7A9E7E' : '#7A9E7E'}
                            strokeWidth="2"
                            strokeDasharray={nextIsCurrent ? '4 4' : 'none'}
                            style={nextIsCurrent ? { animation: 'dash-march 1s linear infinite' } : undefined}
                          />
                        </svg>
                      ) : (
                        // Faint future line
                        <div className="w-[1px] h-full bg-[#E0DCD8]" />
                      )}
                    </div>
                  )}
                </div>

                {/* Right column: text */}
                <div className={`flex flex-col ml-3 ${isLast ? 'pb-0' : 'pb-4'} ${isCurrent ? 'pt-1' : isCompleted ? 'pt-0.5' : 'pt-0'}`}>
                  {/* Stage label */}
                  <span
                    className={`font-sans text-[0.65rem] uppercase tracking-[0.08em] ${
                      isCompleted ? 'text-[#7A9E7E]' : isCurrent ? 'text-[#2563EB]' : 'text-[#B8B2AC]'
                    }`}
                  >
                    Stage {stage.id}
                  </span>

                  {/* Stage name */}
                  <span
                    className={`font-sans text-[0.82rem] font-semibold leading-tight mt-0.5 transition-colors duration-300 ${
                      isCompleted ? 'text-[#5A7A5E]' : isCurrent ? 'text-[#2563EB]' : 'text-gray-400'
                    }`}
                  >
                    {stage.name}
                  </span>

                  {/* Description — only on current stage */}
                  {isCurrent && (
                    <span className="font-sans text-[0.7rem] text-gray-500 leading-snug mt-0.5">
                      {stage.description}
                    </span>
                  )}

                  {/* Badge */}
                  {isCompleted && (
                    <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded text-[0.58rem] font-semibold uppercase tracking-wide bg-[#7A9E7E]/15 text-[#5A7A5E] w-fit">
                      Completed
                    </span>
                  )}
                  {isCurrent && (
                    <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded text-[0.58rem] font-semibold uppercase tracking-wide bg-[#2563EB] text-white w-fit">
                      In progress
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
