import React from 'react';
import { Play, RotateCcw, Home, Shield } from 'lucide-react';
import { sounds } from '../game/audio';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onGoHome: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onGoHome
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 font-sans select-none animate-in fade-in duration-150">
      <div className="w-full max-w-sm mc-stone-panel p-4 sm:p-6 text-slate-100 flex flex-col items-center text-center gap-4 max-h-[90dvh] overflow-y-auto">
        <div className="w-12 h-12 mc-slot flex items-center justify-center text-[#55ffff]">
          <Shield className="w-7 h-7" />
        </div>

        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-[#ffaa00] mc-text-shadow-sm">
            ГРА ПРИЗУПИНЕНА
          </span>
          <h2 className="text-lg sm:text-xl font-black text-white mt-0.5 mc-text-shadow-sm">
            Пауза
          </h2>
        </div>

        <p className="text-xs text-slate-300">
          Відпочинь, але пам'ятай: справжній рятівник завжди пильний на дорозі!
        </p>

        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={() => {
              sounds.playClick();
              onResume();
            }}
            className="w-full py-3 mc-btn-green text-white font-black text-sm tracking-wide uppercase flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Play className="w-4 h-4 fill-current text-[#ffff55]" />
            <span>ПРОДОВЖИТИ ГРУ</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onRestart();
            }}
            className="w-full py-2.5 mc-btn-stone text-slate-200 font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Почати рівень спочатку</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onGoHome();
            }}
            className="w-full py-2.5 mc-slot text-slate-400 hover:text-white font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Головне меню</span>
          </button>
        </div>
      </div>
    </div>
  );
};
