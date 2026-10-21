import React, { useEffect } from 'react';
import { Shield, Sparkles, BookOpen, Award, ArrowRight, Play, Volume2, Info } from 'lucide-react';
import { sounds } from '../game/audio';

interface TitleScreenProps {
  onStartGame: (levelIndex?: number) => void;
  highestLevel: number;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartGame, highestLevel }) => {
  // Listen for Enter or Space to start immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        sounds.playClick();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame]);

  return (
    <div
      className="relative w-full h-full min-h-screen bg-[#1c221a] flex flex-col items-center justify-between p-3 sm:p-6 select-none overflow-y-auto text-slate-100 font-sans"
      style={{
        backgroundImage: 
          'radial-gradient(circle at 50% 15%, rgba(68, 120, 40, 0.28) 0%, rgba(20, 24, 18, 0.98) 75%), repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 16px, rgba(255,255,255,0.02) 16px, rgba(255,255,255,0.02) 32px)'
      }}
    >
      {/* Top Banner: Minecraft-style DSNS Badge & 6 Locations Indicator */}
      <header className="w-full max-w-3xl flex items-center justify-between border-b-2 border-[#3c4238] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 bg-[#b83828] border-2 border-[#7a1e12] shadow-sm font-black text-white text-[11px] sm:text-xs tracking-wider mc-text-shadow">
            ДСНС УКРАЇНИ
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-slate-300 truncate">
            Мінна безпека для школярів
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-black text-[#55ffff] bg-[#212f38] px-2.5 py-1 border border-[#3b5866] shadow-sm mc-text-shadow-sm">
          <Shield className="w-3.5 h-3.5 text-[#55ffff]" />
          <span>6 НАВЧАЛЬНИХ ЛОКАЦІЙ</span>
        </div>
      </header>

      {/* Main Center Content: Title Lockup & Minecraft/Roblox World Card */}
      <main className="flex flex-col items-center max-w-2xl w-full text-center my-auto py-3 sm:py-5">
        {/* Minecraft-style Blocky Title */}
        <div className="relative mb-3 sm:mb-4">
          <div className="inline-block bg-[#313335] border-4 border-[#1e1f20] px-5 sm:px-8 py-3 sm:py-4 shadow-[inset_3px_3px_0px_#5c5e62,inset_-3px_-3px_0px_#18191a,0_8px_20px_rgba(0,0,0,0.8)]">
            <h1 className="font-black text-2xl sm:text-4xl text-[#ffcc00] tracking-wider uppercase mc-text-shadow">
              БЕЗПЕЧНА СТЕЖКА
            </h1>
            <div className="font-extrabold text-sm sm:text-lg text-[#55ffff] tracking-widest uppercase mt-0.5 mc-text-shadow">
              ШЛЯХ ДОДОМУ · MINECRAFT EDITION
            </div>
          </div>
        </div>

        {/* Mascot Dog Patron Blocky Card */}
        <div className="w-full max-w-md mc-stone-panel p-3 sm:p-4 flex items-center gap-3 sm:gap-4 my-2 text-left">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#232323] border-2 border-[#121212] flex items-center justify-center text-2xl sm:text-3xl shrink-0 shadow-[inset_2px_2px_0px_#101010,inset_-2px_-2px_0px_#404040]">
            🐕
          </div>
          <div>
            <div className="text-[10px] sm:text-xs font-black text-[#ffaa00] uppercase tracking-wide mc-text-shadow-sm flex items-center gap-1.5">
              <span>ПРОВІДНИК ПЕС ПАТРОН:</span>
              <span className="text-[9px] bg-[#43842c] text-white px-1 py-0.2 border border-[#2b591b]">ДСНС</span>
            </div>
            <div className="text-[11px] sm:text-xs text-slate-200 leading-snug mt-0.5">
              "Обирай лише перевірені безпечні стежки, не торкайся небезпечних предметів і телефонуй <strong className="text-[#ff5555]">101</strong>!"
            </div>
          </div>
        </div>

        {/* Primary Start CTA Button (Minecraft Green Button) */}
        <div className="w-full max-w-md mt-2 sm:mt-3">
          <button
            data-start="true"
            onClick={() => {
              sounds.playClick();
              onStartGame(0);
            }}
            className="w-full py-3.5 sm:py-4 mc-btn-green text-white font-black text-base sm:text-lg tracking-wider uppercase flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current text-[#ffff55]" />
            <span>ПОЧАТИ ПРИГОДУ (РІВЕНЬ 1)</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Level Selector Grid (All 6 Levels with Minecraft slot borders) */}
        <div className="mt-4 sm:mt-6 w-full max-w-2xl">
          <div className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-[#aaaaaa] mb-2 text-left mc-text-shadow-sm flex items-center justify-between">
            <span>ВИБІР ЛОКАЦІЇ (6 РІВНІВ):</span>
            <span className="text-[10px] text-[#55ff55]">Розблоковано: {highestLevel + 1}/6</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 0, num: 1, title: 'Дорога від школи', icon: '🏫', desc: 'Асфальт і зебра' },
              { id: 1, num: 2, title: 'Стежка у лісі', icon: '🌲', desc: 'Мох та сосни' },
              { id: 2, num: 3, title: 'Стежка у дворі', icon: '🏠', desc: 'Двір і будинки' },
              { id: 3, num: 4, title: 'Дорога за містом', icon: '🌻', desc: 'Поле соняшників' },
              { id: 4, num: 5, title: 'Берег річки', icon: '🌊', desc: 'Вода та пісок' },
              { id: 5, num: 6, title: 'Зона прильоту', icon: '🚨', desc: 'Shahed / FPV дрон' }
            ].map((lvl) => {
              const isUnlocked = lvl.id <= highestLevel;
              return (
                <button
                  key={lvl.id}
                  disabled={!isUnlocked}
                  onClick={() => {
                    if (isUnlocked) {
                      sounds.playClick();
                      onStartGame(lvl.id);
                    }
                  }}
                  className={`p-2.5 sm:p-3 text-left transition-all ${
                    isUnlocked
                      ? 'mc-slot-active cursor-pointer hover:border-[#55ff55] active:translate-y-0.5'
                      : 'mc-slot opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-[#ffaa00] mc-text-shadow-sm">
                      РІВЕНЬ {lvl.num}
                    </span>
                    <span className="text-sm">{lvl.icon}</span>
                  </div>
                  <div className="text-xs font-extrabold text-white truncate mt-0.5">
                    {lvl.title}
                  </div>
                  <div className="text-[10px] text-slate-300 truncate mt-0.5">
                    {lvl.desc}
                  </div>
                  <div className="text-[9px] font-bold mt-1.5 flex items-center gap-1">
                    {isUnlocked ? (
                      <span className="text-[#55ff55]">● ДОСТУПНО</span>
                    ) : (
                      <span className="text-[#888888]">🔒 ЗАКРИТО</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer Controls & Instructions */}
      <footer className="w-full max-w-2xl text-center text-[10px] sm:text-xs text-slate-400 border-t border-[#3c4238] pt-2">
        <span className="hidden sm:inline">Керування: WASD / Стрілки · Пробіл або Enter Старт · Esc Пауза · Клік для ходьби</span>
        <span className="sm:hidden">Торкніться екрана для ходьби або використовуйте віртуальні стрілки</span>
      </footer>
    </div>
  );
};
