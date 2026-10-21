import React, { useState } from 'react';
import { QuizQuestion } from '../game/types';
import { CheckCircle2, AlertCircle, HelpCircle, ArrowRight, Award } from 'lucide-react';
import { sounds } from '../game/audio';

interface QuizModalProps {
  question: QuizQuestion;
  onAnswer: (isCorrect: boolean) => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({ question, onAnswer }) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const handleSelectOption = (idx: number) => {
    if (isSubmitted) return;
    setSelectedIndex(idx);
    setIsSubmitted(true);

    const isCorrect = idx === question.correctIndex;
    if (isCorrect) {
      sounds.playQuizCorrect();
    } else {
      sounds.playQuizWrong();
    }
  };

  const handleContinue = () => {
    sounds.playClick();
    onAnswer(selectedIndex === question.correctIndex);
  };

  const isCorrect = selectedIndex === question.correctIndex;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 font-sans select-none animate-in fade-in duration-150">
      <div className="w-full max-w-lg mc-stone-panel p-4 sm:p-6 text-slate-100 flex flex-col gap-4 max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#1e1f20] pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 mc-slot flex items-center justify-center text-[#ffaa00]">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#ffaa00] mc-text-shadow-sm">
                ВІКТОРИНА З МІННОЇ БЕЗПЕКИ
              </span>
              <h3 className="text-sm sm:text-base font-extrabold text-white mc-text-shadow-sm">
                {question.ruleTitle}
              </h3>
            </div>
          </div>
          <div className="text-xs font-black px-2 py-0.5 bg-[#212224] border border-[#3c5e20] text-[#55ff55] mc-text-shadow-sm">
            +150 БАЛІВ
          </div>
        </div>

        {/* Question Text */}
        <p className="text-sm sm:text-base font-bold text-slate-100 leading-snug">
          {question.question}
        </p>

        {/* Options */}
        <div className="flex flex-col gap-2">
          {question.options.map((option, idx) => {
            const isChosen = selectedIndex === idx;
            const isTarget = idx === question.correctIndex;

            let btnClass = 'mc-btn-stone text-left text-white';
            if (isSubmitted) {
              if (isTarget) {
                btnClass = 'mc-btn-green text-white font-bold';
              } else if (isChosen && !isTarget) {
                btnClass = 'bg-[#8a1c14] border-2 border-[#e02020] text-white';
              } else {
                btnClass = 'mc-slot opacity-50 text-slate-400';
              }
            }

            return (
              <button
                key={idx}
                disabled={isSubmitted}
                onClick={() => handleSelectOption(idx)}
                className={`w-full p-3 sm:p-3.5 flex items-start gap-2.5 transition-all cursor-pointer ${btnClass}`}
              >
                <span className="w-6 h-6 mc-slot flex items-center justify-center text-xs font-black shrink-0 mt-0.5 text-[#ffff55]">
                  {['А', 'Б', 'В'][idx]}
                </span>
                <span className="text-xs sm:text-sm font-semibold leading-relaxed flex-1">
                  {option}
                </span>
                {isSubmitted && isTarget && (
                  <CheckCircle2 className="w-5 h-5 text-[#55ff55] shrink-0 mt-0.5" />
                )}
                {isSubmitted && isChosen && !isTarget && (
                  <AlertCircle className="w-5 h-5 text-[#ff5555] shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation Banner */}
        {isSubmitted && (
          <div
            className={`p-3 border-2 flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed ${
              isCorrect
                ? 'bg-[#1b3d1b] border-[#43842c] text-[#d4f8d4]'
                : 'bg-[#422d10] border-[#b87c28] text-[#fef08a]'
            }`}
          >
            {isCorrect ? (
              <Award className="w-5 h-5 text-[#55ff55] shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-[#ffaa00] shrink-0 mt-0.5" />
            )}
            <div>
              <strong className="block font-black mb-0.5 mc-text-shadow-sm">
                {isCorrect ? 'Чудово! Правильна відповідь!' : 'Зверни увагу на правило безпеки:'}
              </strong>
              {question.explanation}
            </div>
          </div>
        )}

        {/* Continue Button */}
        {isSubmitted && (
          <button
            onClick={handleContinue}
            className="w-full py-3 mc-btn-green text-white font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span>ПРОДОВЖИТИ ШЛЯХ</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
