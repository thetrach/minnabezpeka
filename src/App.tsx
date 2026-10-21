import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { GameState, Hazard, PlayerStats, QuizQuestion, NPC } from './game/types';
import { LEVELS, BADGES_CATALOG } from './game/levels';
import { ProximityAlertLevel, calculateLevelStars, calculateTotalScore, evaluateBadges } from './game/logic';
import { sounds } from './game/audio';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { TitleScreen } from './components/TitleScreen';
import { QuizModal } from './components/QuizModal';
import { LevelEndChallenge } from './components/LevelEndChallenge';
import { LevelCompleteModal } from './components/LevelCompleteModal';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { CertificateModal } from './components/CertificateModal';
import { NPCDialogueModal } from './components/NPCDialogueModal';
import { HelpCircle, X } from 'lucide-react';

export default function App() {
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const lvl = params.get('level');
      if (lvl) {
        const parsed = parseInt(lvl, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < LEVELS.length) return parsed;
      }
    } catch {
      // ignore
    }
    return 0;
  });

  const [highestUnlockedLevel, setHighestUnlockedLevel] = useState<number>(0);
  const [gameState, setGameState] = useState<GameState>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const st = params.get('state');
      if (st && ['playing', 'task', 'certificate', 'title', 'quiz', 'dialogue'].includes(st)) {
        return st as GameState;
      }
      if (params.get('autostart') === '1') {
        return 'playing';
      }
    } catch {
      // ignore
    }
    return 'title';
  });
  const [, startTransition] = useTransition();

  // Player gameplay statistics
  const [stats, setStats] = useState<PlayerStats>({
    score: 0,
    starsCollected: 0,
    quizzesAnswered: 0,
    quizzesCorrect: 0,
    tasksCompleted: 0,
    npcsTalked: 0,
    mistakesCount: 0,
    lives: 3,
    badges: []
  });

  // Current level specific runtime stats
  const [levelStarsCollected, setLevelStarsCollected] = useState<number>(0);
  const [levelScore, setLevelScore] = useState<number>(0);
  const [activeQuiz, setActiveQuiz] = useState<QuizQuestion | null>(null);
  const [activeNPC, setActiveNPC] = useState<NPC | null>(null);
  const [nearbyNPC, setNearbyNPC] = useState<NPC | null>(null);
  const [gameOverReason, setGameOverReason] = useState<string>('');

  // Proximity & safe path runtime state for HUD
  const [isOnSafePath, setIsOnSafePath] = useState<boolean>(true);
  const [alertLevel, setAlertLevel] = useState<ProximityAlertLevel>('safe');
  const [nearestHazard, setNearestHazard] = useState<Hazard | null>(null);
  const [hazardDistance, setHazardDistance] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(sounds.isMuted());

  // Patron Tip Popup Dialog
  const [showPatronTipModal, setShowPatronTipModal] = useState<boolean>(false);
  const [customTipText, setCustomTipText] = useState<string>('');

  // Virtual touch movement
  const [virtualMove, setVirtualMove] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const currentLevel = LEVELS[currentLevelIndex] || LEVELS[0];

  // Sync state to document.body.dataset.state for ultra-mode verification
  useEffect(() => {
    let datasetState: string = gameState;
    if (gameState === 'quiz' || gameState === 'task' || gameState === 'dialogue') {
      datasetState = 'playing';
    } else if (gameState === 'complete' || gameState === 'certificate') {
      datasetState = 'gameover'; // victory modal state
    }
    document.body.dataset.state = datasetState;
  }, [gameState]);

  // Support ?autostart=1, ?state=task, ?level=0
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const lvl = params.get('level');
      if (lvl) {
        const lvlIdx = parseInt(lvl, 10);
        if (!isNaN(lvlIdx) && lvlIdx >= 0 && lvlIdx < LEVELS.length) {
          setCurrentLevelIndex(lvlIdx);
        }
      }
      const st = params.get('state');
      if (st && ['playing', 'task', 'certificate', 'title', 'quiz'].includes(st)) {
        setGameState(st as GameState);
      } else if (params.get('autostart') === '1') {
        setGameState('playing');
      }
    } catch {
      // URL parsing fallback
    }
  }, []);

  // Keyboard controls for global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'KeyM') {
        const nextMuted = sounds.toggleMute();
        setIsMuted(nextMuted);
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        if (gameState === 'playing') {
          setGameState('paused');
        } else if (gameState === 'paused') {
          setGameState('playing');
        }
      } else if (e.code === 'KeyR' && gameState === 'playing') {
        handleRestartLevel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const handleStartGame = useCallback((levelIndex: number = 0) => {
    setCurrentLevelIndex(levelIndex);
    setLevelStarsCollected(0);
    setLevelScore(0);
    setStats((prev) => ({
      ...prev,
      lives: 3
    }));
    // Reset stars collected and quiz triggers
    LEVELS.forEach((lvl) => {
      lvl.stars.forEach((s) => (s.collected = false));
      lvl.quizQuestions.forEach((q) => (q.triggered = false));
    });
    setGameState('playing');
  }, []);

  const handleRestartLevel = useCallback(() => {
    setLevelStarsCollected(0);
    setLevelScore(0);
    setStats((prev) => ({
      ...prev,
      lives: 3
    }));
    currentLevel.stars.forEach((s) => (s.collected = false));
    currentLevel.quizQuestions.forEach((q) => (q.triggered = false));
    setGameState('playing');
  }, [currentLevel]);

  const handleCollectStar = useCallback((starId: string) => {
    setLevelStarsCollected((prev) => prev + 1);
    setStats((prev) => ({
      ...prev,
      score: prev.score + 100,
      starsCollected: prev.starsCollected + 1
    }));
  }, []);

  const handleTriggerQuiz = useCallback((quizId: string) => {
    const q = currentLevel.quizQuestions.find((item) => item.id === quizId);
    if (q) {
      setActiveQuiz(q);
      setGameState('quiz');
    }
  }, [currentLevel]);

  const handleQuizAnswer = useCallback((isCorrect: boolean) => {
    setStats((prev) => ({
      ...prev,
      score: prev.score + (isCorrect ? 150 : 0),
      quizzesAnswered: prev.quizzesAnswered + 1,
      quizzesCorrect: prev.quizzesCorrect + (isCorrect ? 1 : 0),
      mistakesCount: prev.mistakesCount + (isCorrect ? 0 : 1)
    }));
    setActiveQuiz(null);
    setGameState('playing');
  }, []);

  const handleInteractNPC = useCallback((npc: NPC) => {
    setActiveNPC(npc);
    setGameState('dialogue');
  }, []);

  const handleCloseNPCDialogue = useCallback((rewardPoints: number) => {
    if (activeNPC && !activeNPC.spoken) {
      activeNPC.spoken = true;
      setStats((prev) => {
        const nextStats = {
          ...prev,
          score: prev.score + rewardPoints,
          npcsTalked: prev.npcsTalked + 1
        };
        nextStats.badges = evaluateBadges(nextStats, false);
        return nextStats;
      });
    }
    setActiveNPC(null);
    setGameState('playing');
  }, [activeNPC]);

  const handleReachGoal = useCallback(() => {
    // Open End-of-Level Challenge Task!
    setGameState('task');
  }, []);

  const handleCompleteTask = useCallback((success: boolean) => {
    const earnedPts = calculateTotalScore(
      500,
      levelStarsCollected,
      stats.quizzesCorrect,
      success,
      stats.lives
    );
    setLevelScore(earnedPts);

    const updatedTasksCount = stats.tasksCompleted + 1;
    const isLast = currentLevelIndex === LEVELS.length - 1;

    setStats((prev) => {
      const nextStats = {
        ...prev,
        score: prev.score + earnedPts,
        tasksCompleted: updatedTasksCount
      };
      nextStats.badges = evaluateBadges(nextStats, isLast);
      return nextStats;
    });

    setHighestUnlockedLevel((prev) => Math.max(prev, currentLevelIndex + 1));
    setGameState('complete');
  }, [currentLevelIndex, levelStarsCollected, stats]);

  const handleTakeDamage = useCallback((hazard: Hazard) => {
    setStats((prev) => {
      const nextLives = prev.lives - 1;
      const nextMistakes = prev.mistakesCount + 1;

      if (nextLives <= 0) {
        setGameOverReason(
          `На жаль, ти зіткнувся з небезпечним предметом: ${hazard.name}. ${hazard.educationalTip}`
        );
        setGameState('gameover');
      }

      return {
        ...prev,
        lives: Math.max(0, nextLives),
        mistakesCount: nextMistakes
      };
    });
  }, []);

  const handleNextLevel = useCallback(() => {
    if (currentLevelIndex < LEVELS.length - 1) {
      const nextIdx = currentLevelIndex + 1;
      setCurrentLevelIndex(nextIdx);
      setLevelStarsCollected(0);
      setLevelScore(0);
      setGameState('playing');
    } else {
      setGameState('certificate');
    }
  }, [currentLevelIndex]);

  const handleAlertChange = useCallback((level: ProximityAlertLevel, hazard: Hazard | null, dist: number) => {
    setAlertLevel(level);
    setNearestHazard(hazard);
    setHazardDistance(dist);
  }, []);

  const handleSafeStatusChange = useCallback((isSafe: boolean) => {
    setIsOnSafePath(isSafe);
  }, []);

  const handleShowTip = useCallback((tip: string) => {
    setCustomTipText(tip);
    setShowPatronTipModal(true);
  }, []);

  const handleVirtualMove = useCallback((dx: number, dy: number) => {
    setVirtualMove({ dx, dy });
  }, []);

  // Compute earned stars for modal
  const starsEarned = calculateLevelStars(
    levelStarsCollected,
    currentLevel.stars.length,
    stats.quizzesAnswered > 0 ? stats.quizzesCorrect / stats.quizzesAnswered : 1,
    stats.lives
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 1. TITLE SCREEN */}
      {gameState === 'title' && (
        <TitleScreen
          onStartGame={handleStartGame}
          highestLevel={highestUnlockedLevel}
        />
      )}

      {/* 2. PLAYING / ACTIVE SIMULATION */}
      {(gameState === 'playing' || gameState === 'paused' || gameState === 'quiz' || gameState === 'task' || gameState === 'dialogue') && (
        <>
          <GameCanvas
            level={currentLevel}
            lives={stats.lives}
            onCollectStar={handleCollectStar}
            onTriggerQuiz={handleTriggerQuiz}
            onReachGoal={handleReachGoal}
            onTakeDamage={handleTakeDamage}
            onAlertChange={handleAlertChange}
            onSafeStatusChange={handleSafeStatusChange}
            onShowTip={handleShowTip}
            onInteractNPC={handleInteractNPC}
            onNearbyNPCChange={setNearbyNPC}
            isPaused={gameState !== 'playing'}
            virtualMove={virtualMove}
          />

          <HUD
            levelNumber={currentLevel.id}
            levelTitle={currentLevel.title}
            lives={stats.lives}
            score={stats.score}
            starsCollected={levelStarsCollected}
            totalStars={currentLevel.stars.length}
            isOnSafePath={isOnSafePath}
            alertLevel={alertLevel}
            nearestHazard={nearestHazard}
            hazardDistance={hazardDistance}
            isMuted={isMuted}
            nearbyNPC={nearbyNPC}
            onInteractNPC={() => {
              if (nearbyNPC) handleInteractNPC(nearbyNPC);
            }}
            onToggleMute={() => setIsMuted(sounds.toggleMute())}
            onPause={() => setGameState('paused')}
            onRestart={handleRestartLevel}
            onShowPatronTip={() => {
              setCustomTipText(currentLevel.patronTip);
              setShowPatronTipModal(true);
            }}
            onVirtualMove={handleVirtualMove}
          />
        </>
      )}

      {/* 2.5. NPC DIALOGUE MODAL */}
      {gameState === 'dialogue' && activeNPC && (
        <NPCDialogueModal
          npc={activeNPC}
          onClose={handleCloseNPCDialogue}
        />
      )}

      {/* 3. QUIZ MODAL */}
      {gameState === 'quiz' && activeQuiz && (
        <QuizModal
          question={activeQuiz}
          onAnswer={handleQuizAnswer}
        />
      )}

      {/* 4. END-OF-LEVEL INTERACTIVE CHALLENGE TASK */}
      {gameState === 'task' && (
        <LevelEndChallenge
          task={currentLevel.endTask}
          levelNumber={currentLevel.id}
          onCompleteTask={handleCompleteTask}
        />
      )}

      {/* 5. LEVEL COMPLETE MODAL */}
      {gameState === 'complete' && (
        <LevelCompleteModal
          levelNumber={currentLevel.id}
          levelTitle={currentLevel.title}
          starsEarned={starsEarned}
          levelScore={levelScore}
          totalScore={stats.score}
          isLastLevel={currentLevelIndex === LEVELS.length - 1}
          onNextLevel={handleNextLevel}
          onReplayLevel={handleRestartLevel}
          onViewCertificate={() => setGameState('certificate')}
        />
      )}

      {/* 6. GAME OVER MODAL */}
      {gameState === 'gameover' && (
        <GameOverModal
          reason={gameOverReason}
          onRetry={handleRestartLevel}
          onGoHome={() => setGameState('title')}
        />
      )}

      {/* 7. PAUSE MODAL */}
      {gameState === 'paused' && (
        <PauseModal
          onResume={() => setGameState('playing')}
          onRestart={handleRestartLevel}
          onGoHome={() => setGameState('title')}
        />
      )}

      {/* 8. CERTIFICATE MODAL */}
      {gameState === 'certificate' && (
        <CertificateModal
          totalScore={stats.score}
          totalStars={stats.starsCollected}
          earnedBadges={stats.badges}
          onPlayAgain={() => handleStartGame(0)}
        />
      )}

      {/* 9. PATRON TIP DIALOG OVERLAY */}
      {showPatronTipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 font-sans select-none animate-in fade-in duration-150">
          <div className="w-full max-w-sm mc-stone-panel p-4 sm:p-5 text-slate-100 flex flex-col gap-3.5 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-[#1e1f20] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🐕</span>
                <span className="text-xs font-black uppercase text-[#ffaa00] mc-text-shadow-sm">
                  ПОРАДА ВІД ПЕСИКА ПАТРОНА
                </span>
              </div>
              <button
                onClick={() => setShowPatronTipModal(false)}
                className="w-7 h-7 mc-slot flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-100 leading-relaxed mc-slot p-3">
              {customTipText || currentLevel.patronTip}
            </p>
            <button
              onClick={() => {
                sounds.playClick();
                setShowPatronTipModal(false);
              }}
              className="w-full py-2.5 mc-btn-green text-white font-black text-xs uppercase tracking-wide cursor-pointer active:scale-95"
            >
              ЗРОЗУМІЛО, ДЯКУЮ!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
