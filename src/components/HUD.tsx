import React, { useState } from 'react';
import { Volume2, VolumeX, Pause, RotateCcw, AlertTriangle, Shield, Star, HelpCircle, Check, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { ProximityAlertLevel } from '../game/logic';
import { Hazard, NPC } from '../game/types';

interface HUDProps {
  levelNumber: number;
  levelTitle: string;
  lives: number;
  score: number;
  starsCollected: number;
  totalStars: number;
  isOnSafePath: boolean;
  alertLevel: ProximityAlertLevel;
  nearestHazard: Hazard | null;
  hazardDistance: number;
  isMuted: boolean;
  nearbyNPC?: NPC | null;
  onInteractNPC?: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
  onShowPatronTip: () => void;
  onVirtualMove: (dx: number, dy: number) => void;
}

export const HUD: React.FC<HUDProps> = ({
  levelNumber,
  levelTitle,
  lives,
  score,
  starsCollected,
  totalStars,
  isOnSafePath,
  alertLevel,
  nearestHazard,
  hazardDistance,
  isMuted,
  nearbyNPC,
  onInteractNPC,
  onToggleMute,
  onPause,
  onRestart,
  onShowPatronTip,
  onVirtualMove
}) => {
  const [showObjectiveDetails, setShowObjectiveDetails] = useState<boolean>(false);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-2 sm:p-4 select-none font-sans">
      {/* Top Header Cluster: Minecraft Palette & Mobile/Tablet Fit */}
      <div className="flex flex-col gap-1.5 sm:gap-2 w-full max-w-full">
        {/* Row 1: Vitals, Radar & Actions */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-3 w-full">
          {/* Left Stats Cluster (Minecraft Stone Panel) */}
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-3 mc-stone-panel-sm px-2.5 sm:px-3.5 py-1.5 sm:py-2">
            {/* Minecraft Hearts */}
            <div className="flex items-center gap-1 sm:gap-1.5 pr-1.5 sm:pr-2 border-r border-[#1e1f20]">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#aaaaaa] hidden xs:inline mc-text-shadow-sm">
                HP:
              </span>
              <div className="flex items-center gap-0.5 sm:gap-1">
                {[1, 2, 3].map((heartIndex) => {
                  const isAlive = heartIndex <= lives;
                  return (
                    <div
                      key={heartIndex}
                      title={isAlive ? 'Життя активне' : 'Втрачено'}
                      className={`w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center transition-transform ${
                        isAlive ? 'scale-100' : 'scale-90 opacity-40'
                      }`}
                    >
                      {/* Minecraft Pixel Heart SVG */}
                      <svg viewBox="0 0 16 16" className="w-full h-full drop-shadow-sm">
                        {isAlive ? (
                          <>
                            <path
                              d="M2 3h3v2H2zM7 3h2v2H7zM11 3h3v2h-3zM1 5h14v4H1zM2 9h12v2H2zM3 11h10v2H3zM5 13h6v1H5zM7 14h2v1H7z"
                              fill="#e02020"
                            />
                            {/* Shiny pixel */}
                            <rect x="3" y="5" width="2" height="2" fill="#ffffff" />
                            {/* Outline */}
                            <path
                              d="M2 2h3v1H2zm7 0h2v1H9zm2 0h3v1h-3zM1 3h1v2H1zm5 0h2v2H6zm8 0h1v2h-1zM0 5h1v4H0zm15 0h1v4h-1zM1 9h1v2H1zm13 0h1v2h-1zM2 11h1v2H2zm11 0h1v2h-1zM3 13h2v1H3zm7 0h2v1h-2zm-3 1h2v1H7zm-1 1h4v1H6z"
                              fill="#3a0606"
                            />
                          </>
                        ) : (
                          <>
                            <path
                              d="M2 3h3v2H2zM7 3h2v2H7zM11 3h3v2h-3zM1 5h14v4H1zM2 9h12v2H2zM3 11h10v2H3zM5 13h6v1H5zM7 14h2v1H7z"
                              fill="#444444"
                            />
                            <path
                              d="M2 2h3v1H2zm7 0h2v1H9zm2 0h3v1h-3zM1 3h1v2H1zm5 0h2v2H6zm8 0h1v2h-1zM0 5h1v4H0zm15 0h1v4h-1zM1 9h1v2H1zm13 0h1v2h-1zM2 11h1v2H2zm11 0h1v2h-1zM3 13h2v1H3zm7 0h2v1h-2zm-3 1h2v1H7zm-1 1h4v1H6z"
                              fill="#1a1a1a"
                            />
                          </>
                        )}
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stars / XP */}
            <div className="flex items-center gap-1 sm:gap-1.5 pr-1.5 sm:pr-2 border-r border-[#1e1f20]">
              <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ffff55] fill-[#ffff55]" />
              <span className="text-xs sm:text-sm font-black tabular-nums text-[#ffff55] mc-text-shadow-sm">
                {starsCollected}/{totalStars}
              </span>
            </div>

            {/* Score */}
            <div className="flex items-center gap-1">
              <span className="text-[9px] sm:text-[10px] font-black uppercase text-[#aaaaaa] hidden xs:inline mc-text-shadow-sm">
                БАЛИ:
              </span>
              <span className="text-xs sm:text-sm font-black tabular-nums text-[#55ffff] mc-text-shadow-sm">
                {Math.round(score)}
              </span>
            </div>
          </div>

          {/* Center Radar: Desktop & Tablet */}
          <div className="hidden md:block pointer-events-auto">
            <div
              className={`flex items-center gap-2 px-3 py-1 border-2 transition-all shadow-md ${
                alertLevel === 'danger'
                  ? 'bg-[#8a1c14] border-[#e02020] text-white animate-bounce'
                  : alertLevel === 'warning'
                  ? 'bg-[#8c6014] border-[#e09820] text-[#fff0aa]'
                  : alertLevel === 'caution'
                  ? 'bg-[#3b3d1b] border-[#919929] text-[#eef4a0]'
                  : 'bg-[#252826] border-[#444a45] text-slate-300'
              }`}
            >
              <AlertTriangle
                className={`w-4 h-4 ${
                  alertLevel === 'danger'
                    ? 'text-white fill-[#ff5555]'
                    : alertLevel === 'warning'
                    ? 'text-[#ffff55] fill-[#ffaa00]'
                    : alertLevel === 'caution'
                    ? 'text-[#ffff55]'
                    : 'text-slate-400'
                }`}
              />
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-wider text-[#aaaaaa]">
                  РАДАР БЕЗПЕКИ:
                </span>
                <span className="text-xs font-black mc-text-shadow-sm">
                  {alertLevel === 'danger'
                    ? 'НЕБЕЗПЕКА! НЕ ПІДХОДЬ!'
                    : alertLevel === 'warning'
                    ? 'УВАГА: НЕВІДОМИЙ ПРЕДМЕТ'
                    : alertLevel === 'caution'
                    ? 'ПИЛЬНІСТЬ: СЕКТОР РИЗИКУ'
                    : 'СТЕЖКА ЧИСТА'}
                </span>
              </div>
              {nearestHazard && alertLevel !== 'safe' && (
                <span className="text-[10px] font-mono bg-black/50 px-2 py-0.5 border border-black/40 tabular-nums font-black text-white">
                  {Math.round(hazardDistance)}м
                </span>
              )}
            </div>
          </div>

          {/* Right Action Buttons (Tip, Sound, Restart, Pause) */}
          <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 mc-stone-panel-sm p-1">
            <button
              onClick={onShowPatronTip}
              aria-label="Підказка Патрона"
              title="Підказка від песика Патрона"
              className="w-8 h-8 sm:w-9 sm:h-9 mc-btn-wood flex items-center justify-center text-white cursor-pointer active:scale-95"
            >
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#ffffaa]" />
            </button>

            <button
              onClick={onToggleMute}
              aria-label={isMuted ? 'Увімкнути звук' : 'Вимкнути звук'}
              title="Звук [M]"
              className="w-8 h-8 sm:w-9 sm:h-9 mc-btn-stone flex items-center justify-center text-white cursor-pointer active:scale-95"
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ff5555]" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#55ff55]" />
              )}
            </button>

            <button
              onClick={onRestart}
              aria-label="Перезапустити рівень"
              title="Перезапуск [R]"
              className="w-8 h-8 sm:w-9 sm:h-9 mc-btn-stone flex items-center justify-center text-white cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button
              onClick={onPause}
              aria-label="Пауза"
              title="Пауза [Esc / P]"
              className="w-8 h-8 sm:w-9 sm:h-9 mc-btn-green flex items-center justify-center text-white cursor-pointer active:scale-95"
            >
              <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
            </button>
          </div>
        </div>

        {/* Row 2: Level Badge, Safe Path Indicator & Compact Mobile Radar */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 flex-wrap">
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
            <span className="bg-[#244517] border-2 border-[#43842c] text-[#ffff55] font-black text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 mc-text-shadow-sm">
              РІВЕНЬ {levelNumber}: {levelTitle}
            </span>

            <span
              className={`text-[10px] sm:text-xs font-black px-2 sm:px-2.5 py-0.5 sm:py-1 border-2 flex items-center gap-1 transition-colors mc-text-shadow-sm ${
                isOnSafePath
                  ? 'bg-[#18361b] text-[#55ff55] border-[#2f6634]'
                  : 'bg-[#5c1515] text-[#ffaaaa] border-[#b02222] animate-pulse'
              }`}
            >
              {isOnSafePath ? (
                <>
                  <Check className="w-3 h-3 text-[#55ff55]" />
                  <span>БЕЗПЕЧНА СТЕЖКА</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3 text-[#ff5555]" />
                  <span>НЕБЕЗПЕЧНИЙ СХІД!</span>
                </>
              )}
            </span>
          </div>

          {/* Mobile Radar Pill (shown when screen is small) */}
          <div className="md:hidden pointer-events-auto">
            <div
              className={`flex items-center gap-1 px-2 py-0.5 border text-[10px] font-black mc-text-shadow-sm ${
                alertLevel === 'danger'
                  ? 'bg-[#8a1c14] border-[#e02020] text-white animate-bounce'
                  : alertLevel === 'warning'
                  ? 'bg-[#8c6014] border-[#e09820] text-[#fff0aa]'
                  : alertLevel === 'caution'
                  ? 'bg-[#3b3d1b] border-[#919929] text-[#eef4a0]'
                  : 'bg-[#252826] border-[#444a45] text-slate-300'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>
                {alertLevel === 'danger'
                  ? `МІНА! ${Math.round(hazardDistance)}м`
                  : alertLevel === 'warning'
                  ? `УВАГА ${Math.round(hazardDistance)}м`
                  : alertLevel === 'caution'
                  ? 'ПИЛЬНІСТЬ'
                  : 'ЧИСТО'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Area: Controls Hint, Virtual Touch D-Pad & Action Thumb Button */}
      <div className="flex items-end justify-between gap-2 sm:gap-4 w-full">
        {/* Left Side: Ergonomic Mobile Virtual D-Pad (Touch & Click) */}
        <div className="pointer-events-auto sm:hidden flex flex-col items-center gap-1 mc-stone-panel-sm p-1.5 shadow-2xl">
          <button
            onTouchStart={(e) => { e.preventDefault(); onVirtualMove(0, -1); }}
            onTouchEnd={(e) => { e.preventDefault(); onVirtualMove(0, 0); }}
            onMouseDown={() => onVirtualMove(0, -1)}
            onMouseUp={() => onVirtualMove(0, 0)}
            onMouseLeave={() => onVirtualMove(0, 0)}
            aria-label="Вгору"
            className="w-12 h-12 mc-btn-stone text-white font-black text-xl flex items-center justify-center active:bg-[#43842c]"
          >
            ▲
          </button>
          <div className="flex gap-2">
            <button
              onTouchStart={(e) => { e.preventDefault(); onVirtualMove(-1, 0); }}
              onTouchEnd={(e) => { e.preventDefault(); onVirtualMove(0, 0); }}
              onMouseDown={() => onVirtualMove(-1, 0)}
              onMouseUp={() => onVirtualMove(0, 0)}
              onMouseLeave={() => onVirtualMove(0, 0)}
              aria-label="Вліво"
              className="w-12 h-12 mc-btn-stone text-white font-black text-xl flex items-center justify-center active:bg-[#43842c]"
            >
              ◀
            </button>
            <button
              onTouchStart={(e) => { e.preventDefault(); onVirtualMove(0, 1); }}
              onTouchEnd={(e) => { e.preventDefault(); onVirtualMove(0, 0); }}
              onMouseDown={() => onVirtualMove(0, 1)}
              onMouseUp={() => onVirtualMove(0, 0)}
              onMouseLeave={() => onVirtualMove(0, 0)}
              aria-label="Вниз"
              className="w-12 h-12 mc-btn-stone text-white font-black text-xl flex items-center justify-center active:bg-[#43842c]"
            >
              ▼
            </button>
            <button
              onTouchStart={(e) => { e.preventDefault(); onVirtualMove(1, 0); }}
              onTouchEnd={(e) => { e.preventDefault(); onVirtualMove(0, 0); }}
              onMouseDown={() => onVirtualMove(1, 0)}
              onMouseUp={() => onVirtualMove(0, 0)}
              onMouseLeave={() => onVirtualMove(0, 0)}
              aria-label="Вправо"
              className="w-12 h-12 mc-btn-stone text-white font-black text-xl flex items-center justify-center active:bg-[#43842c]"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Center Desktop Controls Hint (Keyboard) */}
        <div className="hidden sm:flex items-center gap-2.5 text-[11px] font-bold text-slate-300 mc-stone-panel-sm px-3.5 py-1.5">
          <span>🎮 Керування: <kbd className="text-[#ffff55] font-mono bg-[#212224] px-1 py-0.5 border border-[#111213]">W A S D</kbd> / <kbd className="text-[#ffff55] font-mono bg-[#212224] px-1 py-0.5 border border-[#111213]">Стрілки</kbd></span>
          <span>·</span>
          <span>🖱 Клік по стежці для ходьби</span>
          <span>·</span>
          <span><kbd className="text-[#ffff55] font-mono bg-[#212224] px-1 py-0.5 border border-[#111213]">E</kbd> Діалог</span>
          <span>·</span>
          <span><kbd className="text-[#ffff55] font-mono bg-[#212224] px-1 py-0.5 border border-[#111213]">P</kbd> Пауза</span>
        </div>

        {/* Right Side: NPC Talk Action Button & Compact Mission Objective */}
        <div className="pointer-events-auto flex flex-col items-end gap-1.5 max-w-[240px] sm:max-w-xs">
          {/* Prominent NPC Talk Action Button (Mobile & Desktop) */}
          {nearbyNPC && onInteractNPC && (
            <button
              onClick={onInteractNPC}
              className="w-full py-2.5 px-3 mc-btn-green text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 animate-pulse cursor-pointer shadow-xl"
            >
              <MessageSquare className="w-4 h-4 text-[#ffff55]" />
              <span>[E] ДІАЛОГ: {nearbyNPC.name}</span>
            </button>
          )}

          {/* Mission Objective Box (Tap to toggle on mobile) */}
          <div className="w-full mc-stone-panel-sm p-2 text-left">
            <div 
              onClick={() => setShowObjectiveDetails(!showObjectiveDetails)}
              className="flex items-center justify-between text-[10px] font-black uppercase text-[#ffaa00] mc-text-shadow-sm cursor-pointer"
            >
              <span>ЦІЛЬ РІВНЯ:</span>
              <span className="sm:hidden text-slate-400">
                {showObjectiveDetails ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              </span>
            </div>
            <div className={`text-[11px] font-semibold text-slate-200 leading-snug mt-0.5 ${showObjectiveDetails ? 'block' : 'hidden sm:block'}`}>
              Дістанься перевіреного безпечного пункту, не торкаючись небезпечних предметів!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
