import React from 'react';
import { Star, Trophy, Sparkles, ArrowRight, RotateCcw } from 'lucide-react';
import { sounds } from '../game/audio';

interface LevelCompleteModalProps {
  levelNumber: number;
  levelTitle: string;
  starsEarned: number; // 1 to 3
  levelScore: number;
  totalScore: number;
  isLastLevel: boolean;
  onNextLevel: () => void;
  onReplayLevel: () => void;
  onViewCertificate: () => void;
}

export const LevelCompleteModal: React.FC<LevelCompleteModalProps> = ({
  levelNumber,
  levelTitle,
  starsEarned,
  levelScore,
  totalScore,
  isLastLevel,
  onNextLevel,
  onReplayLevel,
  onViewCertificate
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 font-sans select-none animate-in fade-in duration-150">
      <div className="w-full max-w-md mc-stone-panel p-4 sm:p-6 text-slate-100 flex flex-col items-center text-center gap-4 max-h-[90dvh] overflow-y-auto">
        {/* Trophy Emblem (Minecraft Slot) */}
        <div className="w-14 h-14 mc-slot flex items-center justify-center text-[#ffff55]">
          <Trophy className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#55ff55] mc-text-shadow-sm">
            РІВЕНЬ {levelNumber} УСПІШНО ПРОЙДЕНО!
          </span>
          <h2 className="text-lg sm:text-xl font-black text-white mt-0.5 mc-text-shadow-sm">
            {levelTitle}
          </h2>
        </div>

        {/* 3-Star Rating Readout (Minecraft Nether Stars) */}
        <div className="flex items-center justify-center gap-2.5 my-1">
          {[1, 2, 3].map((starIdx) => {
            const hasStar = starIdx <= starsEarned;
            return (
              <div
                key={starIdx}
                className={`p-2 transition-all ${
                  hasStar
                    ? 'mc-slot-active scale-110 shadow-lg'
                    : 'mc-slot opacity-40'
                }`}
              >
                <Star className={`w-7 h-7 sm:w-8 sm:h-8 ${hasStar ? 'text-[#ffff55] fill-[#ffff55]' : 'text-slate-600'}`} />
              </div>
            );
          })}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 w-full">
          <div className="p-2.5 mc-slot text-center">
            <span className="text-[9px] font-black uppercase text-[#aaaaaa] block mb-0.5 mc-text-shadow-sm">
              БАЛИ ЗА РІВЕНЬ
            </span>
            <span className="text-base sm:text-lg font-black text-[#55ff55] tabular-nums mc-text-shadow-sm">
              +{levelScore}
            </span>
          </div>
          <div className="p-2.5 mc-slot text-center">
            <span className="text-[9px] font-black uppercase text-[#aaaaaa] block mb-0.5 mc-text-shadow-sm">
              ЗАГАЛЬНІ БАЛИ
            </span>
            <span className="text-base sm:text-lg font-black text-[#55ffff] tabular-nums mc-text-shadow-sm">
              {totalScore}
            </span>
          </div>
        </div>

        {/* Mascot Encouragement */}
        <div className="p-2.5 mc-slot text-xs text-slate-300 font-medium leading-relaxed flex items-center gap-2.5 text-left w-full">
          <span className="text-2xl">🐕</span>
          <div>
            <strong className="text-[#ffaa00] font-black block mc-text-shadow-sm">Патрон пишається тобою!</strong>
            Ти дотримався безпечної стежки та не піддався спокусі зійти в траву.
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col gap-2 w-full mt-1">
          {isLastLevel ? (
            <button
              onClick={() => {
                sounds.playClick();
                onViewCertificate();
              }}
              className="w-full py-3.5 mc-btn-green text-white font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-5 h-5 text-[#ffff55]" />
              <span>ОТРИМАТИ СЕРТИФІКАТ САПЕРА</span>
            </button>
          ) : (
            <button
              data-start="true"
              onClick={() => {
                sounds.playClick();
                onNextLevel();
              }}
              className="w-full py-3.5 mc-btn-green text-white font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span>НАСТУПНИЙ РІВЕНЬ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => {
              sounds.playClick();
              onReplayLevel();
            }}
            className="w-full py-2.5 mc-btn-stone text-slate-200 font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Пройти рівень знову</span>
          </button>
        </div>
      </div>
    </div>
  );
};
