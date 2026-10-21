import React, { useState } from 'react';
import { Award, Printer, RotateCcw, ShieldCheck, Star } from 'lucide-react';
import { BADGES_CATALOG } from '../game/levels';
import { sounds } from '../game/audio';

interface CertificateModalProps {
  totalScore: number;
  totalStars: number;
  earnedBadges: string[];
  onPlayAgain: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  totalScore,
  totalStars,
  earnedBadges,
  onPlayAgain
}) => {
  const [childName, setChildName] = useState<string>('Богданчик');
  const todayDate = new Date().toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const handlePrint = () => {
    sounds.playClick();
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-none font-sans overflow-y-auto">
      <div className="w-full max-w-2xl flex flex-col gap-4 my-auto">
        {/* Printable Certificate Canvas / Paper Card */}
        <div
          id="printable-certificate"
          className="relative bg-amber-50 text-slate-900 border-8 border-double border-amber-600 rounded-3xl p-6 sm:p-10 shadow-2xl flex flex-col items-center text-center select-text"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(254, 243, 199, 0.6) 0%, rgba(253, 230, 138, 0.4) 100%)'
          }}
        >
          {/* Ornamental Corner Ribbon */}
          <div className="w-full flex items-center justify-between border-b-2 border-amber-500/60 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-700 text-white font-black text-xs flex items-center justify-center shadow">
                101
              </div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900">
                СЛУЖБА ПОРЯТУНКУ ДСНС УКРАЇНИ
              </span>
            </div>
            <div className="flex items-center gap-1 text-amber-700 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Знак Відмінника Безпеки</span>
            </div>
          </div>

          {/* Certificate Main Title */}
          <div className="w-16 h-16 rounded-full bg-amber-200 border-2 border-amber-600 flex items-center justify-center text-amber-800 shadow-inner mb-2">
            <Award className="w-9 h-9" />
          </div>

          <span className="text-xs font-black uppercase tracking-widest text-amber-800">
            ОФІЦІЙНИЙ СЕРТИФІКАТ
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 uppercase tracking-tight">
            Юний Знавець Мінної Безпеки
          </h1>

          <p className="text-xs sm:text-sm text-slate-700 mt-2 max-w-md">
            Цим сертифікатом засвідчується, що відважний та уважний школяр:
          </p>

          {/* Editable Name Input for the Child */}
          <div className="my-3 w-full max-w-xs">
            <input
              type="text"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="Введи своє ім'я"
              aria-label="Ім'я школяра"
              className="w-full text-center text-xl sm:text-2xl font-black text-blue-800 bg-transparent border-b-2 border-amber-700/80 focus:border-blue-700 outline-none px-2 py-1"
            />
            <span className="text-[10px] text-amber-800 block mt-0.5">
              (натисни, щоб ввести своє ім'я)
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 max-w-lg leading-relaxed">
            успішно подолав усі небезпечні маршрути, навчився уникати мін-пасток та розтяжок, засвоїв алгоритм виклику за номером <strong>101</strong> та обрав безпечний шлях додому!
          </p>

          {/* Badges Earned Grid */}
          <div className="my-4 w-full bg-white/70 border border-amber-300 rounded-2xl p-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 block mb-2">
              ЗДОБУТІ НАГОРОДИ ТА ВІДЗНАКИ:
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {BADGES_CATALOG.map((badge) => {
                const isEarned = earnedBadges.includes(badge.id);
                return (
                  <div
                    key={badge.id}
                    title={badge.description}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                      isEarned
                        ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-sm'
                        : 'bg-slate-100 text-slate-400 border-slate-300 opacity-50'
                    }`}
                  >
                    <span>{badge.icon}</span>
                    <span>{badge.title}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Signatures & Seal */}
          <div className="w-full flex items-end justify-between border-t border-amber-400/80 pt-4 mt-2 text-left">
            <div>
              <span className="text-[10px] text-slate-500 block">ДАТА ВИДАЧІ:</span>
              <span className="text-xs font-black text-slate-800">{todayDate}</span>
            </div>

            {/* Patron's Paw Seal */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-amber-700 flex items-center justify-center text-xl bg-amber-100">
                🐾
              </div>
              <span className="text-[9px] font-bold text-amber-800 mt-0.5">
                Песик Патрон (ДСНС)
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 block">РЕЗУЛЬТАТ:</span>
              <span className="text-sm font-black text-emerald-700">{totalScore} БАЛІВ ⭐</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full">
          <button
            onClick={handlePrint}
            className="w-full sm:w-auto px-6 py-3 mc-btn-green text-white font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4 text-[#ffff55]" />
            <span>ДРУКУВАТИ / ЗБЕРЕГТИ СЕРТИФІКАТ</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onPlayAgain();
            }}
            className="w-full sm:w-auto px-6 py-3 mc-btn-stone text-slate-100 font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>ГРАТИ ЗНОВУ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
