import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { sounds } from '../game/audio';

interface GameOverModalProps {
  reason: string;
  onRetry: () => void;
  onGoHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  reason,
  onRetry,
  onGoHome
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 font-sans select-none animate-in fade-in duration-150">
      <div className="w-full max-w-md mc-stone-panel p-4 sm:p-6 text-slate-100 flex flex-col items-center text-center gap-4 max-h-[90dvh] overflow-y-auto">
        {/* Warning Icon (Minecraft Slot) */}
        <div className="w-14 h-14 mc-slot flex items-center justify-center text-[#ff5555]">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#ff5555] mc-text-shadow-sm">
            ОБЕРЕЖНО! НЕБЕЗПЕКА!
          </span>
          <h2 className="text-lg sm:text-xl font-black text-white mt-0.5 mc-text-shadow-sm">
            Стежка виявилася небезпечною
          </h2>
        </div>

        <div className="p-3 bg-[#5c1515] border-2 border-[#b02222] text-xs sm:text-sm text-[#ffaaaa] font-medium leading-relaxed text-left w-full">
          <strong className="block font-black text-[#ffcccc] mb-0.5 mc-text-shadow-sm">
            Чому це сталося?
          </strong>
          {reason || 'Ти зійшов з перевіреної асфальтованої доріжки у траву або наблизився до невідомого предмета.'}
        </div>

        {/* Golden Rule Reminder */}
        <div className="p-3 mc-slot w-full text-left">
          <div className="text-[10px] font-black uppercase text-[#ffaa00] tracking-wider mb-0.5 mc-text-shadow-sm">
            ЗОЛОТЕ ПРАВИЛО МІННОЇ БЕЗПЕКИ:
          </div>
          <div className="text-xs font-black text-white mc-text-shadow-sm">
            1. НЕ ПІДХОДЬ! · 2. НЕ ЧІПАЙ! · 3. ТЕЛЕФОНУЙ 101!
          </div>
        </div>

        {/* Retry Button */}
        <div className="flex flex-col gap-2 w-full mt-1">
          <button
            data-start="true"
            onClick={() => {
              sounds.playClick();
              onRetry();
            }}
            className="w-full py-3.5 bg-[#961f18] hover:bg-[#b5261e] border-2 border-[#540f0b] text-white font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-[inset_2px_2px_0px_#e34840,inset_-2px_-2px_0px_#470c09]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>СПРОБУВАТИ ЩЕ РАЗ</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onGoHome();
            }}
            className="w-full py-2.5 mc-btn-stone text-slate-200 font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Головне меню</span>
          </button>
        </div>
      </div>
    </div>
  );
};
