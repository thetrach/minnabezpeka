import React, { useState } from 'react';
import { NPC } from '../game/types';
import { Award, ArrowRight, ShieldCheck } from 'lucide-react';
import { sounds } from '../game/audio';

interface NPCDialogueModalProps {
  npc: NPC;
  onClose: (rewardPoints: number) => void;
}

export const NPCDialogueModal: React.FC<NPCDialogueModalProps> = ({ npc, onClose }) => {
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(0);

  const currentLine = npc.dialogue[currentLineIndex] || npc.dialogue[0];
  const isLastLine = currentLineIndex >= npc.dialogue.length - 1;

  const handleNext = () => {
    sounds.playClick();
    if (isLastLine) {
      sounds.playQuizCorrect();
      onClose(npc.rewardPoints);
    } else {
      setCurrentLineIndex((prev) => prev + 1);
    }
  };

  const renderAvatar = () => {
    switch (npc.avatarIcon) {
      case 'teacher':
        return <span className="text-3xl sm:text-4xl">👩‍🏫</span>;
      case 'rescuer':
        return <span className="text-3xl sm:text-4xl">👨‍🚒</span>;
      case 'forester':
        return <span className="text-3xl sm:text-4xl">🧔‍♂️</span>;
      case 'builder':
        return <span className="text-3xl sm:text-4xl">👷</span>;
      case 'friend':
        return <span className="text-3xl sm:text-4xl">🧒</span>;
      case 'mother':
        return <span className="text-3xl sm:text-4xl">👩‍👧</span>;
      case 'squirrel':
        return <span className="text-3xl sm:text-4xl">🐿️</span>;
      case 'cat':
        return <span className="text-3xl sm:text-4xl">🐱</span>;
      case 'dog_patron':
        return <span className="text-3xl sm:text-4xl">🐕</span>;
      case 'medic':
        return <span className="text-3xl sm:text-4xl">👩‍⚕️</span>;
      case 'grandma':
        return <span className="text-3xl sm:text-4xl">👵</span>;
      default:
        return <span className="text-3xl sm:text-4xl">👤</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 font-sans select-none animate-in fade-in duration-150">
      <div className="w-full max-w-lg mc-stone-panel p-4 sm:p-6 text-slate-100 flex flex-col gap-4 max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#1e1f20] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 mc-slot flex items-center justify-center shrink-0">
              {renderAvatar()}
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-[#ffaa00] mc-text-shadow-sm">
                {npc.role}
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mc-text-shadow-sm">
                {npc.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#212224] border border-[#3c5e20] text-[#55ff55] text-xs font-black mc-text-shadow-sm">
            <Award className="w-4 h-4 text-[#ffff55]" />
            <span>+{npc.rewardPoints} БАЛІВ</span>
          </div>
        </div>

        {/* Speech Balloon */}
        <div className="relative mc-slot p-3.5 sm:p-4 text-sm sm:text-base font-semibold text-slate-100 leading-relaxed">
          <p className="text-slate-100">
            "{currentLine.text}"
          </p>

          {/* Important Safety Tip Callout */}
          {currentLine.importantTip && (
            <div className="mt-3 p-2.5 bg-[#422d10] border-2 border-[#b87c28] text-[#fef08a] text-xs sm:text-sm font-bold flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#ffcc00] shrink-0 mt-0.5" />
              <div>
                <span className="block font-black text-[#ffaa00] uppercase text-[10px] tracking-wider mb-0.5 mc-text-shadow-sm">
                  ВАЖЛИВЕ ПРАВИЛО:
                </span>
                {currentLine.importantTip}
              </div>
            </div>
          )}
        </div>

        {/* Dialogue Steps Indicator & Action Button */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-1.5">
            {npc.dialogue.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 transition-all ${
                  idx === currentLineIndex
                    ? 'w-6 bg-[#55ff55]'
                    : idx < currentLineIndex
                    ? 'w-2 bg-[#2d882d]'
                    : 'w-2 bg-[#1b1c1d]'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="px-5 py-2.5 sm:py-3 mc-btn-green text-white font-black text-xs sm:text-sm tracking-wide uppercase flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>{isLastLine ? 'ДЯКУЮ ЗА ПОРАДУ!' : 'ДАЛІ'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
