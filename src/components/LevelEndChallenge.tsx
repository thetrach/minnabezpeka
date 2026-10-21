import React, { useState } from 'react';
import { EndLevelTask, SequenceStep, SignCard, DialogueNode } from '../game/types';
import { validateSequenceOrder } from '../game/logic';
import { CheckCircle2, AlertCircle, ArrowUp, ArrowDown, PhoneCall, ShieldAlert, Sparkles, Trophy } from 'lucide-react';
import { sounds } from '../game/audio';

interface LevelEndChallengeProps {
  task: EndLevelTask;
  levelNumber: number;
  onCompleteTask: (success: boolean) => void;
}

export const LevelEndChallenge: React.FC<LevelEndChallengeProps> = ({
  task,
  levelNumber,
  onCompleteTask
}) => {
  // 1. State for sequence_rules
  const [sequenceItems, setSequenceItems] = useState<SequenceStep[]>(() => {
    if (!task.sequenceSteps) return [];
    return [...task.sequenceSteps].sort(() => 0.5 - Math.random());
  });
  const [seqStatus, setSeqStatus] = useState<'pending' | 'success' | 'retry'>('pending');

  // 2. State for identify_signs
  const [selectedSigns, setSelectedSigns] = useState<Set<string>>(new Set());
  const [signsChecked, setSignsChecked] = useState<boolean>(false);

  // 3. State for call_101_dialogue
  const [currentNodeId, setCurrentNodeId] = useState<string>('root');
  const initialRoot = task.dialogueRoot || task.dialogueNodes?.root;
  const [dialogueHistory, setDialogueHistory] = useState<{ speaker: 'operator' | 'child'; text: string }[]>([
    { speaker: 'operator', text: initialRoot?.text || task.dialogueNodes?.root?.text || 'Служба порятунку 101, слухаю!' }
  ]);
  const [dialogueFeedback, setDialogueFeedback] = useState<string | null>(null);

  // Sequence reordering handlers
  const moveStep = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sequenceItems.length) return;

    sounds.playClick();
    const copy = [...sequenceItems];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    setSequenceItems(copy);
  };

  const checkSequence = () => {
    if (!task.sequenceSteps) return;
    const submittedIds = sequenceItems.map((s) => s.id);
    const expectedIds = [...task.sequenceSteps].sort((a, b) => a.order - b.order).map((s) => s.id);

    const isCorrect = validateSequenceOrder(submittedIds, expectedIds);
    if (isCorrect) {
      sounds.playQuizCorrect();
      setSeqStatus('success');
    } else {
      sounds.playQuizWrong();
      setSeqStatus('retry');
    }
  };

  // Sign identifier handlers
  const toggleSignSelection = (id: string) => {
    if (signsChecked) return;
    sounds.playClick();
    const updated = new Set(selectedSigns);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedSigns(updated);
  };

  const checkSigns = () => {
    if (!task.signs) return;
    setSignsChecked(true);

    const expectedDangerousIds = task.signs.filter((s) => s.isHazardSign).map((s) => s.id);
    const allCorrect =
      expectedDangerousIds.every((id) => selectedSigns.has(id)) &&
      selectedSigns.size === expectedDangerousIds.length;

    if (allCorrect) {
      sounds.playQuizCorrect();
    } else {
      sounds.playQuizWrong();
    }
  };

  // 101 Dialogue handlers
  const handleDialogueChoice = (option: { text: string; nextNodeId: string; isCorrect: boolean; feedback: string }) => {
    sounds.playClick();
    setDialogueFeedback(option.feedback);

    setDialogueHistory((prev) => [
      ...prev,
      { speaker: 'child', text: option.text }
    ]);

    const nextNode = task.dialogueNodes?.[option.nextNodeId];
    if (nextNode) {
      setTimeout(() => {
        setCurrentNodeId(option.nextNodeId);
        setDialogueHistory((prev) => [
          ...prev,
          { speaker: 'operator', text: nextNode.text }
        ]);
        setDialogueFeedback(null);

        if (!nextNode.options || nextNode.options.length === 0) {
          setTimeout(() => {
            onCompleteTask(true);
          }, 1600);
        }
      }, 700);
    }
  };

  const [showDetailedHint, setShowDetailedHint] = useState<boolean>(true);

  const activeDialogueNode = currentNodeId === 'root'
    ? (task.dialogueRoot || task.dialogueNodes?.root)
    : task.dialogueNodes?.[currentNodeId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/85 font-sans overflow-y-auto select-none">
      <div className="w-full max-w-2xl mc-stone-panel p-4 sm:p-6 text-slate-100 flex flex-col gap-3.5 my-auto max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#1e1f20] pb-2.5">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 mc-slot flex items-center justify-center text-[#55ffff]">
              {task.type === 'call_101_dialogue' ? (
                <PhoneCall className="w-5 h-5 text-[#ff5555]" />
              ) : task.type === 'identify_signs' ? (
                <ShieldAlert className="w-5 h-5 text-[#ffff55]" />
              ) : (
                <Trophy className="w-5 h-5 text-[#ffff55]" />
              )}
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#ffaa00] mc-text-shadow-sm">
                ПІДСУМКОВЕ ЗАВДАННЯ · РІВЕНЬ {levelNumber}
              </span>
              <h2 className="text-base sm:text-lg font-black text-white mc-text-shadow-sm">
                {task.title}
              </h2>
            </div>
          </div>
          <div className="text-xs font-black px-2 py-0.5 bg-[#212224] border border-[#3c5e20] text-[#55ff55] flex items-center gap-1 mc-text-shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#ffff55]" />
            <span>+300 БАЛІВ</span>
          </div>
        </div>

        {/* Instruction */}
        <p className="text-xs sm:text-sm font-bold text-slate-200">
          {task.instruction}
        </p>

        {/* Detailed Educational Hint Box */}
        {task.hintDetails && (
          <div className="bg-[#382b18] border-2 border-[#8c6728] p-3 sm:p-4 text-xs sm:text-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-black text-[#ffea75] flex items-center gap-2 text-xs sm:text-sm mc-text-shadow-sm">
                <span className="text-base sm:text-lg">🐕</span>
                <span>{task.hintDetails.title}</span>
              </span>
              <button
                onClick={() => setShowDetailedHint(!showDetailedHint)}
                className="px-2 py-0.5 mc-btn-wood text-white font-bold text-[10px] sm:text-xs cursor-pointer"
              >
                {showDetailedHint ? 'Згорнути ▲' : 'Розгорнути ▼'}
              </button>
            </div>

            {showDetailedHint && (
              <div className="flex flex-col gap-2 pt-2 border-t border-[#664b1d] animate-in fade-in duration-150">
                <div className="text-[10px] sm:text-[11px] font-black uppercase text-[#ffaa00] mc-text-shadow-sm">
                  Покрокові настанови рятувальників ДСНС:
                </div>
                <ul className="space-y-1 text-slate-200 text-xs">
                  {task.hintDetails.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 mc-slot p-1.5 leading-snug">
                      <span className="text-[#55ff55] font-black shrink-0">✔</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>

                {task.hintDetails.detailedExplanations && task.hintDetails.detailedExplanations.length > 0 && (
                  <div className="mt-1 flex flex-col gap-1.5">
                    <div className="text-[10px] font-black uppercase text-[#55ff55] mc-text-shadow-sm">
                      Чому це життєво важливо:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {task.hintDetails.detailedExplanations.map((exp, idx) => (
                        <div key={idx} className="mc-slot p-2 text-[11px]">
                          <div className="font-black text-[#55ffff] mb-0.5">{exp.rule}</div>
                          <div className="text-slate-300 text-[10px] leading-tight mb-1">{exp.description}</div>
                          <div className="text-[#ffff55] font-bold text-[10px]">
                            ⚡ Чому: {exp.whyImportant}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-2 bg-[#212224] border border-[#ffaa00] text-[#ffea75] font-black text-[11px] flex items-center gap-1.5">
                  <span className="text-sm">📌</span>
                  <span>{task.hintDetails.mnemonicRule}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 1. TASK TYPE: SEQUENCE RULES */}
        {task.type === 'sequence_rules' && (
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-1.5">
              {sequenceItems.map((step, idx) => (
                <div
                  key={step.id}
                  className="flex items-center justify-between p-2.5 sm:p-3 mc-slot gap-2"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg sm:text-xl">{step.icon}</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-100">{step.text}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => moveStep(idx, 'up')}
                      disabled={idx === 0 || seqStatus === 'success'}
                      aria-label="Підняти вище"
                      className="w-7 h-7 mc-btn-stone flex items-center justify-center text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveStep(idx, 'down')}
                      disabled={idx === sequenceItems.length - 1 || seqStatus === 'success'}
                      aria-label="Опустити нижче"
                      className="w-7 h-7 mc-btn-stone flex items-center justify-center text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {seqStatus === 'retry' && (
              <div className="p-2.5 bg-[#5c1515] border-2 border-[#b02222] text-[#ffaaaa] text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#ff5555]" />
                <span>Порядок кроків ще не вірний. Спершу зупинись, нічого не торкайся, відійди тим же слідом і телефонуй 101!</span>
              </div>
            )}

            {seqStatus === 'success' ? (
              <div className="flex flex-col gap-2">
                <div className="p-2.5 bg-[#18361b] border-2 border-[#2f6634] text-[#55ff55] text-xs sm:text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#55ff55] shrink-0" />
                  <span>Відмінно! Алгоритм складено на 100% правильно!</span>
                </div>
                <button
                  onClick={() => onCompleteTask(true)}
                  className="w-full py-3 mc-btn-green text-white font-black text-sm tracking-wide uppercase cursor-pointer"
                >
                  ЗАВЕРШИТИ РІВЕНЬ ТА ОТРИМАТИ НАГОРОДИ
                </button>
              </div>
            ) : (
              <button
                onClick={checkSequence}
                className="w-full py-3 mc-btn-stone text-white font-black text-sm tracking-wide uppercase cursor-pointer"
              >
                ПЕРЕВІРИТИ ПОСЛІДОВНІСТЬ
              </button>
            )}
          </div>
        )}

        {/* 2. TASK TYPE: IDENTIFY SIGNS */}
        {task.type === 'identify_signs' && task.signs && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {task.signs.map((sign) => {
                const isSelected = selectedSigns.has(sign.id);
                let cardStyle = isSelected ? 'mc-slot-active border-[#55ffff]' : 'mc-slot';

                if (signsChecked) {
                  if (sign.isHazardSign && isSelected) {
                    cardStyle = 'bg-[#18361b] border-2 border-[#2f6634] text-[#55ff55]';
                  } else if (!sign.isHazardSign && isSelected) {
                    cardStyle = 'bg-[#5c1515] border-2 border-[#b02222] text-[#ffaaaa]';
                  } else if (sign.isHazardSign && !isSelected) {
                    cardStyle = 'bg-[#382b18] border-2 border-[#8c6728] text-[#ffff55]';
                  }
                }

                return (
                  <button
                    key={sign.id}
                    onClick={() => toggleSignSelection(sign.id)}
                    className={`p-2.5 text-left transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${cardStyle}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[9px] font-black uppercase text-[#ffaa00] mc-text-shadow-sm">
                          {sign.category === 'official'
                            ? 'Офіційний знак'
                            : sign.category === 'improvised'
                            ? 'Саморобна позначка'
                            : 'Безпечний предмет'}
                        </span>
                        <div
                          className={`w-4 h-4 flex items-center justify-center border text-[10px] font-black ${
                            isSelected ? 'bg-[#43842c] border-[#6bbd47] text-white' : 'border-[#444444]'
                          }`}
                        >
                          {isSelected ? '✔' : ''}
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-slate-100">
                        {sign.title}
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-300 leading-tight">
                      {sign.description}
                    </div>
                  </button>
                );
              })}
            </div>

            {signsChecked ? (
              <button
                onClick={() => onCompleteTask(true)}
                className="w-full py-3 mc-btn-green text-white font-black text-sm tracking-wide uppercase cursor-pointer"
              >
                ПЕРЕЙТИ ДО ПІДСУМКІВ РІВНЯ
              </button>
            ) : (
              <button
                disabled={selectedSigns.size === 0}
                onClick={checkSigns}
                className="w-full py-3 mc-btn-stone text-white font-black text-sm tracking-wide uppercase cursor-pointer disabled:opacity-40"
              >
                ПЕРЕВІРИТИ ОБРАНІ ЗНАКИ ({selectedSigns.size})
              </button>
            )}
          </div>
        )}

        {/* 3. TASK TYPE: CALL 101 DIALOGUE */}
        {task.type === 'call_101_dialogue' && task.dialogueNodes && (
          <div className="flex flex-col gap-3">
            {/* Phone Screen Mockup */}
            <div className="mc-slot p-3 flex flex-col gap-2 max-h-48 overflow-y-auto">
              <div className="flex items-center gap-1.5 pb-1.5 border-b border-[#333333] text-[11px] font-black text-[#ff5555] mc-text-shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#ff2222] animate-pulse" />
                <span>ДЗВІНОК 101 · СЛУЖБА ПОРЯТУНКУ УКРАЇНИ</span>
              </div>

              {dialogueHistory.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col max-w-[85%] ${
                    item.speaker === 'child' ? 'self-end items-end' : 'self-start items-start'
                  }`}
                >
                  <span className="text-[9px] text-slate-400 mb-0.5">
                    {item.speaker === 'child' ? 'Ви (школяр)' : 'Диспетчер ДСНС'}
                  </span>
                  <div
                    className={`p-2.5 text-xs font-semibold leading-snug ${
                      item.speaker === 'child'
                        ? 'bg-[#1e40af] text-white border border-[#3b82f6]'
                        : 'mc-stone-panel-sm text-slate-100'
                    }`}
                  >
                    {item.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Feedback Alert */}
            {dialogueFeedback && (
              <div className="p-2.5 bg-[#212f38] border border-[#38bdf8] text-[#7dd3fc] text-xs font-bold">
                {dialogueFeedback}
              </div>
            )}

            {/* Answer Options */}
            {activeDialogueNode?.options && (
              <div className="flex flex-col gap-1.5">
                <div className="text-[10px] font-black uppercase text-[#ffaa00] mc-text-shadow-sm">
                  Твоя відповідь диспетчеру:
                </div>
                {activeDialogueNode.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleDialogueChoice(opt)}
                    className="p-2.5 mc-btn-stone text-left text-xs font-bold text-white cursor-pointer active:scale-95"
                  >
                    "{opt.text}"
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
