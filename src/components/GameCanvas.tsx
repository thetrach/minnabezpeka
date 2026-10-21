import React, { useEffect, useRef } from 'react';
import { LevelConfig, Hazard, SafePathSegment, DangerousPath, CollectibleStar, WarningSign, NPC } from '../game/types';
import { isPlayerOnSafePath, getNearestHazard, checkGoalReached, findNearbyNPC, getDangerousPathProximity, ProximityAlertLevel } from '../game/logic';
import { sounds } from '../game/audio';

interface GameCanvasProps {
  level: LevelConfig;
  lives: number;
  onCollectStar: (starId: string) => void;
  onTriggerQuiz: (quizId: string) => void;
  onReachGoal: () => void;
  onTakeDamage: (hazard: Hazard) => void;
  onAlertChange: (level: ProximityAlertLevel, hazard: Hazard | null, dist: number) => void;
  onSafeStatusChange: (isSafe: boolean) => void;
  onShowTip: (tip: string) => void;
  onInteractNPC: (npc: NPC) => void;
  onNearbyNPCChange?: (npc: NPC | null) => void;
  isPaused: boolean;
  virtualMove: { dx: number; dy: number };
}

// Particle pool for zero-GC performance
interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const PARTICLE_POOL_SIZE = 64;

export const GameCanvas: React.FC<GameCanvasProps> = ({
  level,
  lives,
  onCollectStar,
  onTriggerQuiz,
  onReachGoal,
  onTakeDamage,
  onAlertChange,
  onSafeStatusChange,
  onShowTip,
  onInteractNPC,
  onNearbyNPCChange,
  isPaused,
  virtualMove
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const propsRef = useRef({
    level,
    lives,
    onCollectStar,
    onTriggerQuiz,
    onReachGoal,
    onTakeDamage,
    onAlertChange,
    onSafeStatusChange,
    onShowTip,
    onInteractNPC,
    onNearbyNPCChange,
    isPaused,
    virtualMove
  });
  propsRef.current = {
    level,
    lives,
    onCollectStar,
    onTriggerQuiz,
    onReachGoal,
    onTakeDamage,
    onAlertChange,
    onSafeStatusChange,
    onShowTip,
    onInteractNPC,
    onNearbyNPCChange,
    isPaused,
    virtualMove
  };

  // Player state
  const playerRef = useRef({
    x: level.spawnX,
    y: level.spawnY,
    vx: 0,
    vy: 0,
    speed: 165,
    facing: 'right' as 'left' | 'right' | 'up' | 'down',
    walkCycle: 0,
    isMoving: false,
    radius: 16,
    invulnerableTimer: 0,
    targetX: null as number | null,
    targetY: null as number | null
  });

  // Companion (Patron the Dog) state
  const companionRef = useRef({
    x: level.spawnX - 32,
    y: level.spawnY + 12,
    tailWag: 0
  });

  // Camera state
  const cameraRef = useRef({
    x: level.spawnX,
    y: level.spawnY
  });

  // Nearby NPC prompt state
  const nearbyNPCRef = useRef<NPC | null>(null);

  // Input states
  const keysRef = useRef<Set<string>>(new Set());

  // Particles
  const particlesRef = useRef<Particle[]>(
    Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      color: '#fbbf24',
      size: 4
    }))
  );

  const spawnParticles = (x: number, y: number, color: string, count: number = 8) => {
    let spawned = 0;
    for (const p of particlesRef.current) {
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 80;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.life = 0;
        p.maxLife = 0.4 + Math.random() * 0.3;
        p.color = color;
        p.size = 3 + Math.random() * 3;
        spawned++;
        if (spawned >= count) break;
      }
    }
  };

  // Reset player when level changes
  useEffect(() => {
    playerRef.current.x = level.spawnX;
    playerRef.current.y = level.spawnY;
    playerRef.current.vx = 0;
    playerRef.current.vy = 0;
    playerRef.current.targetX = null;
    playerRef.current.targetY = null;
    companionRef.current.x = level.spawnX - 32;
    companionRef.current.y = level.spawnY + 12;
    cameraRef.current.x = level.spawnX;
    cameraRef.current.y = level.spawnY;
    nearbyNPCRef.current = null;
  }, [level.id, level.spawnX, level.spawnY]);

  // Keyboard input listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      keysRef.current.add(e.code);
      keysRef.current.add(e.key.toLowerCase());

      // NPC Interaction key [E] (or Ukrainian layout 'У') or [Space] when near NPC
      const isEKey = e.code === 'KeyE' || e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 'у';
      if ((isEKey || e.code === 'Space') && nearbyNPCRef.current && !propsRef.current.isPaused) {
        e.preventDefault();
        sounds.playClick();
        propsRef.current.onInteractNPC(nearbyNPCRef.current);
        return;
      }

      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        playerRef.current.targetX = null;
        playerRef.current.targetY = null;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
      keysRef.current.delete(e.key.toLowerCase());
    };

    const handleBlur = () => {
      keysRef.current.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Main 60fps simulation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    let hitstopTimer = 0;
    let offPathTimer = 0;
    let lastAlertLevel: ProximityAlertLevel = 'safe';

    const render = (time: number) => {
      animationFrameId = requestAnimationFrame(render);

      const rawDt = (time - lastTime) / 1000;
      lastTime = time;
      const dt = Math.min(rawDt, 0.05);

      const {
        level: curLevel,
        isPaused: paused,
        onCollectStar: collectStarCb,
        onTriggerQuiz: triggerQuizCb,
        onReachGoal: reachGoalCb,
        onTakeDamage: takeDamageCb,
        onAlertChange: alertChangeCb,
        onSafeStatusChange: safeStatusChangeCb,
        virtualMove: vMove
      } = propsRef.current;

      const player = playerRef.current;
      const companion = companionRef.current;
      const camera = cameraRef.current;
      const keys = keysRef.current;

      if (hitstopTimer > 0) {
        hitstopTimer -= dt;
      }

      const simDt = paused || hitstopTimer > 0 ? 0 : dt;

      if (player.invulnerableTimer > 0) {
        player.invulnerableTimer -= dt;
      }

      if (simDt > 0) {
        let moveX = 0;
        let moveY = 0;

        if (keys.has('KeyW') || keys.has('ArrowUp')) moveY -= 1;
        if (keys.has('KeyS') || keys.has('ArrowDown')) moveY += 1;
        if (keys.has('KeyA') || keys.has('ArrowLeft')) moveX -= 1;
        if (keys.has('KeyD') || keys.has('ArrowRight')) moveX += 1;

        if (Math.abs(vMove.dx) > 0.1 || Math.abs(vMove.dy) > 0.1) {
          moveX = vMove.dx;
          moveY = vMove.dy;
          player.targetX = null;
          player.targetY = null;
        }

        if (player.targetX !== null && player.targetY !== null) {
          const tdx = player.targetX - player.x;
          const tdy = player.targetY - player.y;
          const tdist = Math.hypot(tdx, tdy);
          if (tdist > 8) {
            moveX = tdx / tdist;
            moveY = tdy / tdist;
          } else {
            player.targetX = null;
            player.targetY = null;
          }
        }

        const len = Math.hypot(moveX, moveY);
        if (len > 0.1) {
          player.isMoving = true;
          const normX = moveX / len;
          const normY = moveY / len;
          player.vx = normX * player.speed;
          player.vy = normY * player.speed;

          if (Math.abs(normX) > Math.abs(normY)) {
            player.facing = normX > 0 ? 'right' : 'left';
          } else {
            player.facing = normY > 0 ? 'down' : 'up';
          }

          player.walkCycle += simDt * 10;
          sounds.playFootstep();
        } else {
          player.isMoving = false;
          player.vx = 0;
          player.vy = 0;
        }

        player.x = Math.max(30, Math.min(curLevel.worldWidth - 30, player.x + player.vx * simDt));
        player.y = Math.max(30, Math.min(curLevel.worldHeight - 30, player.y + player.vy * simDt));

        // Companion follows player
        const cdx = player.x - 28 - companion.x;
        const cdy = player.y + 10 - companion.y;
        companion.x += cdx * 4 * simDt;
        companion.y += cdy * 4 * simDt;
        companion.tailWag += simDt * 12;

        // Verify safe path
        const safeCheck = isPlayerOnSafePath(player.x, player.y, curLevel.safePaths);
        safeStatusChangeCb(safeCheck.onPath);

        // Check dangerous shortcut paths proximity
        const dangerTrailCheck = getDangerousPathProximity(player.x, player.y, curLevel.dangerousPaths || []);
        if (dangerTrailCheck.isNearDangerTrail) {
          sounds.playWarningPing('warning');
        }

        if (!safeCheck.onPath) {
          offPathTimer += simDt;
          if (offPathTimer > 1.2 && player.invulnerableTimer <= 0) {
            sounds.playWarningPing('warning');
            offPathTimer = 0;
          }
        } else {
          offPathTimer = 0;
        }

        // Check hazard proximity
        const { nearestHazard, distance, alertLevel } = getNearestHazard(player.x, player.y, curLevel.hazards);
        if (alertLevel !== lastAlertLevel) {
          lastAlertLevel = alertLevel;
          alertChangeCb(alertLevel, nearestHazard, distance);
        }

        if (nearestHazard) {
          if (alertLevel === 'caution' || alertLevel === 'warning') {
            sounds.playWarningPing(alertLevel);
          } else if (alertLevel === 'danger' && player.invulnerableTimer <= 0) {
            sounds.playHazardHit();
            hitstopTimer = 0.08;
            player.invulnerableTimer = 1.5;
            spawnParticles(player.x, player.y, '#ef4444', 16);
            takeDamageCb(nearestHazard);
            player.x -= (nearestHazard.x - player.x) * 0.4;
            player.y -= (nearestHazard.y - player.y) * 0.4;
          }
        }

        // Check NPC proximity
        const nearby = findNearbyNPC(player.x, player.y, curLevel.npcs || [], 68);
        if (nearby?.id !== nearbyNPCRef.current?.id) {
          nearbyNPCRef.current = nearby;
          propsRef.current.onNearbyNPCChange?.(nearby);
        }

        // Check star collection
        for (const star of curLevel.stars) {
          if (!star.collected) {
            const sDist = Math.hypot(player.x - star.x, player.y - star.y);
            if (sDist < player.radius + 18) {
              star.collected = true;
              sounds.playStarPickup();
              spawnParticles(star.x, star.y, '#f59e0b', 12);
              collectStarCb(star.id);
            }
          }
        }

        // Check quiz checkpoints
        for (const quiz of curLevel.quizQuestions) {
          if (!quiz.triggered && quiz.triggerX !== undefined && quiz.triggerY !== undefined) {
            const qDist = Math.hypot(player.x - quiz.triggerX, player.y - quiz.triggerY);
            if (qDist < 36) {
              quiz.triggered = true;
              triggerQuizCb(quiz.id);
            }
          }
        }

        // Check goal reached
        if (checkGoalReached(player.x, player.y, curLevel.targetX, curLevel.targetY, 44)) {
          sounds.playLevelVictory();
          reachGoalCb();
        }
      }

      // Smooth camera interpolation
      const targetCamX = player.x;
      const targetCamY = player.y;
      camera.x += (targetCamX - camera.x) * 0.1;
      camera.y += (targetCamY - camera.y) * 0.1;

      // Update particles
      for (const p of particlesRef.current) {
        if (p.active) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life += dt;
          if (p.life >= p.maxLife) {
            p.active = false;
          }
        }
      }

      // DRAW PHASE
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      let offsetX: number;
      let offsetY: number;

      if (curLevel.worldWidth <= width) {
        offsetX = (width - curLevel.worldWidth) / 2;
      } else {
        const minCamX = width / 2;
        const maxCamX = curLevel.worldWidth - width / 2;
        const clampedCamX = Math.max(minCamX, Math.min(maxCamX, camera.x));
        offsetX = width / 2 - clampedCamX;
      }

      if (curLevel.worldHeight <= height) {
        offsetY = (height - curLevel.worldHeight) / 2;
      } else {
        const minCamY = height / 2;
        const maxCamY = curLevel.worldHeight - height / 2;
        const clampedCamY = Math.max(minCamY, Math.min(maxCamY, camera.y));
        offsetY = height / 2 - clampedCamY;
      }

      // 0. Boundless environmental backdrop
      drawFullCanvasBackdrop(ctx, curLevel.theme, width, height);

      // Camera transform
      ctx.save();
      ctx.translate(offsetX, offsetY);

      // 1. World Background & Terrain
      drawBackground(ctx, curLevel, time);

      // 2. Dangerous Paths (tempting unverified shortcut trails leading to hazards)
      drawDangerousPaths(ctx, curLevel.dangerousPaths || [], time);

      // 3. Verified Safe Paths
      drawSafePaths(ctx, curLevel.safePaths, time);

      // 4. Warning Signs
      drawWarningSigns(ctx, curLevel.warningSigns, time);

      // 5. Hazards (Expressive, highly detailed models with warning halos)
      drawHazards(ctx, curLevel.hazards, player.x, player.y, time);

      // 6. Secondary NPCs (People & Animals with dialogue bubbles)
      drawNPCs(ctx, curLevel.npcs || [], player.x, player.y, time);

      // 7. Collectibles (Stars & Scrolls)
      drawCollectibles(ctx, curLevel.stars, time);

      // 8. Goal Destination Area
      drawGoal(ctx, curLevel.targetX, curLevel.targetY, curLevel.targetName, time);

      // 9. Companion (Patron the Dog)
      drawDogPatron(ctx, companion.x, companion.y, companion.tailWag, player.facing);

      // 10. Player (Hero)
      drawHero(ctx, player.x, player.y, player.facing, player.walkCycle, player.isMoving, player.invulnerableTimer);

      // 11. Particle Pool
      for (const p of particlesRef.current) {
        if (p.active) {
          const alpha = 1 - p.life / p.maxLife;
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1.0;

      ctx.restore();
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Handle Canvas Resize and Click-to-Move / NPC interaction
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = rect.width;
      canvasRef.current.height = rect.height;
    };

    const ro = new ResizeObserver(handleResize);
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }
    handleResize();

    return () => ro.disconnect();
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    let offsetX: number;
    let offsetY: number;

    if (level.worldWidth <= canvas.width) {
      offsetX = (canvas.width - level.worldWidth) / 2;
    } else {
      const minCamX = canvas.width / 2;
      const maxCamX = level.worldWidth - canvas.width / 2;
      const clampedCamX = Math.max(minCamX, Math.min(maxCamX, cameraRef.current.x));
      offsetX = canvas.width / 2 - clampedCamX;
    }

    if (level.worldHeight <= canvas.height) {
      offsetY = (canvas.height - level.worldHeight) / 2;
    } else {
      const minCamY = canvas.height / 2;
      const maxCamY = level.worldHeight - canvas.height / 2;
      const clampedCamY = Math.max(minCamY, Math.min(maxCamY, cameraRef.current.y));
      offsetY = canvas.height / 2 - clampedCamY;
    }

    const worldX = screenX - offsetX;
    const worldY = screenY - offsetY;

    // Check if clicked directly on an NPC to initiate dialogue
    const clickedNPC = findNearbyNPC(worldX, worldY, level.npcs || [], 36);
    if (clickedNPC) {
      sounds.playClick();
      propsRef.current.onInteractNPC(clickedNPC);
      return;
    }

    // Check if clicked position is on a safe path
    const safeCheck = isPlayerOnSafePath(worldX, worldY, level.safePaths, 25);
    if (safeCheck.onPath) {
      playerRef.current.targetX = worldX;
      playerRef.current.targetY = worldY;
      sounds.playClick();
      spawnParticles(worldX, worldY, '#60a5fa', 6);
    } else {
      sounds.playWarningPing('caution');
      propsRef.current.onShowTip('Увага! Сходити в траву чи на неперевірені ділянки небезпечно! Обирай перевірену стежку.');
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden bg-slate-950"
      style={{ touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        data-testid="game-viewport"
        className="block w-full h-full cursor-crosshair"
      />
    </div>
  );
};

// ================= RENDER HELPERS =================

function drawFullCanvasBackdrop(
  ctx: CanvasRenderingContext2D,
  theme: string,
  width: number,
  height: number
) {
  if (theme === 'school_road') {
    ctx.fillStyle = '#1e3a1f';
  } else if (theme === 'park_forest') {
    ctx.fillStyle = '#0f2c15';
  } else if (theme === 'neighborhood_home') {
    ctx.fillStyle = '#1e293b';
  } else if (theme === 'rural_road') {
    ctx.fillStyle = '#1b3b18';
  } else if (theme === 'riverbank') {
    ctx.fillStyle = '#0c4a6e';
  } else if (theme === 'strike_site' || theme === 'ruins_construction') {
    ctx.fillStyle = '#09090b';
  } else {
    ctx.fillStyle = '#1e3e19';
  }
  ctx.fillRect(0, 0, width, height);
}

// ================= VOXEL SCENERY (MINECRAFT & ROBLOX STYLE) =================

function drawVoxelTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: 'oak' | 'birch' | 'pine',
  scale: number = 1
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Voxel Ground Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.fillRect(-22, 28, 44, 12);

  if (type === 'birch') {
    // Birch Trunk (White with black notch blocks)
    ctx.fillStyle = '#e5e5e5';
    ctx.fillRect(-6, -10, 12, 42);
    // Dark side edge for 3D voxel volume
    ctx.fillStyle = '#b8b8b8';
    ctx.fillRect(3, -10, 3, 42);
    // Birch black notches
    ctx.fillStyle = '#222222';
    ctx.fillRect(-6, 0, 5, 3);
    ctx.fillRect(1, 12, 5, 3);
    ctx.fillRect(-4, 22, 6, 3);

    // Birch Voxel Leaves (layered 3D blocks)
    // Layer 1 (bottom wide)
    ctx.fillStyle = '#558a2f'; // shadow
    ctx.fillRect(-28, -26, 56, 18);
    ctx.fillStyle = '#689f38'; // mid
    ctx.fillRect(-26, -28, 52, 18);
    ctx.fillStyle = '#7cb342'; // light top
    ctx.fillRect(-24, -30, 48, 6);

    // Layer 2 (middle tier)
    ctx.fillStyle = '#558a2f';
    ctx.fillRect(-22, -44, 44, 18);
    ctx.fillStyle = '#689f38';
    ctx.fillRect(-20, -46, 40, 18);
    ctx.fillStyle = '#8bc34a';
    ctx.fillRect(-18, -48, 36, 6);

    // Layer 3 (top cap)
    ctx.fillStyle = '#689f38';
    ctx.fillRect(-14, -58, 28, 14);
    ctx.fillStyle = '#9ccc65';
    ctx.fillRect(-12, -60, 24, 6);
  } else if (type === 'pine') {
    // Pine / Spruce Tree (Dark stepped pyramid tiers)
    // Trunk
    ctx.fillStyle = '#4a2f18';
    ctx.fillRect(-5, 0, 10, 32);
    ctx.fillStyle = '#2f1c0d';
    ctx.fillRect(2, 0, 3, 32);

    // Tier 1 (Lowest, widest)
    ctx.fillStyle = '#1b382b';
    ctx.fillRect(-30, -12, 60, 14);
    ctx.fillStyle = '#274e3d';
    ctx.fillRect(-26, -16, 52, 14);

    // Tier 2 (Mid-low)
    ctx.fillStyle = '#1b382b';
    ctx.fillRect(-24, -28, 48, 14);
    ctx.fillStyle = '#2d5a46';
    ctx.fillRect(-20, -32, 40, 14);

    // Tier 3 (Mid-high)
    ctx.fillStyle = '#1b382b';
    ctx.fillRect(-18, -44, 36, 14);
    ctx.fillStyle = '#346952';
    ctx.fillRect(-14, -48, 28, 14);

    // Tier 4 (Crown point)
    ctx.fillStyle = '#2d5a46';
    ctx.fillRect(-10, -58, 20, 12);
    ctx.fillStyle = '#3e7c61';
    ctx.fillRect(-6, -64, 12, 8);
  } else {
    // Classic Oak Tree (Thick cubic foliage clusters)
    // Wood Trunk
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(-7, -8, 14, 40);
    ctx.fillStyle = '#3d2514';
    ctx.fillRect(3, -8, 4, 40);
    ctx.fillStyle = '#7a4e2d';
    ctx.fillRect(-7, -8, 3, 40);

    // Foliage Block Clusters (Voxel Minecraft style)
    // Lower block
    ctx.fillStyle = '#33691e';
    ctx.fillRect(-32, -32, 64, 26);
    ctx.fillStyle = '#43a047';
    ctx.fillRect(-30, -34, 60, 26);
    ctx.fillStyle = '#558b2f';
    ctx.fillRect(-28, -36, 56, 10);

    // Upper block
    ctx.fillStyle = '#33691e';
    ctx.fillRect(-24, -54, 48, 24);
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(-22, -56, 44, 24);
    ctx.fillStyle = '#66bb6a';
    ctx.fillRect(-20, -58, 40, 8);

    // Highlight block accents
    ctx.fillStyle = '#81c784';
    ctx.fillRect(-16, -50, 12, 6);
    ctx.fillRect(6, -42, 10, 6);
    ctx.fillRect(-22, -26, 10, 6);
  }

  ctx.restore();
}

function drawVoxelHouse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  style: 'school' | 'residential' | 'cottage' | 'damaged',
  time: number = 0
) {
  ctx.save();
  ctx.translate(x, y);

  if (style === 'school') {
    // Grand Minecraft/Roblox School Building
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(-12, 85, 264, 15);

    // Main Brick Wall (Minecraft Red Brick)
    ctx.fillStyle = '#8a2d21';
    ctx.fillRect(0, 0, 240, 85);
    // Brick mortar lines
    ctx.strokeStyle = '#c48b81';
    ctx.lineWidth = 1;
    for (let r = 8; r < 85; r += 12) {
      ctx.beginPath();
      ctx.moveTo(0, r);
      ctx.lineTo(240, r);
      ctx.stroke();
    }

    // Cobblestone foundation base
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(-4, 76, 248, 12);
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(-4, 74, 248, 2);

    // Dark Stepped Slate Roof
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-10, -14, 260, 14);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-6, -18, 252, 6);
    ctx.fillStyle = '#475569';
    ctx.fillRect(-2, -22, 244, 4);

    // Central Entry Porch with Columns & School Banner
    ctx.fillStyle = '#e2e8f0'; // White columns
    ctx.fillRect(92, 18, 10, 60);
    ctx.fillRect(138, 18, 10, 60);
    // Arch / Header
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(86, 12, 68, 12);
    // Banner "ШКОЛА"
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(88, 14, 64, 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('ШКОЛА №1', 120, 21);

    // Ukrainian Flag on roof
    ctx.fillStyle = '#475569'; // pole
    ctx.fillRect(118, -36, 3, 20);
    ctx.fillStyle = '#2563eb'; // blue
    ctx.fillRect(121, -36, 14, 5);
    ctx.fillStyle = '#facc15'; // yellow
    ctx.fillRect(121, -31, 14, 5);

    // Glass Windows with white frames
    for (let wx = 12; wx < 80; wx += 32) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(wx, 26, 22, 30);
      ctx.fillStyle = (wx % 64 === 0) ? '#fef08a' : '#7dd3fc';
      ctx.fillRect(wx + 2, 28, 8, 12);
      ctx.fillRect(wx + 12, 28, 8, 12);
      ctx.fillRect(wx + 2, 42, 8, 12);
      ctx.fillRect(wx + 12, 42, 8, 12);
    }
    for (let wx = 162; wx < 230; wx += 32) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(wx, 26, 22, 30);
      ctx.fillStyle = (wx % 64 === 0) ? '#fef08a' : '#7dd3fc';
      ctx.fillRect(wx + 2, 28, 8, 12);
      ctx.fillRect(wx + 12, 28, 8, 12);
      ctx.fillRect(wx + 2, 42, 8, 12);
      ctx.fillRect(wx + 12, 42, 8, 12);
    }

    // Wooden double door
    ctx.fillStyle = '#78350f';
    ctx.fillRect(104, 44, 32, 34);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(119, 44, 2, 34);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(116, 60, 2, 4);
    ctx.fillRect(122, 60, 2, 4);

  } else if (style === 'residential') {
    // Multi-story Voxel Residential Panel House
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-8, 102, 216, 14);

    // Concrete Panel Facade
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 0, 200, 104);
    // Panel seams
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 0); ctx.lineTo(100, 104);
    ctx.moveTo(0, 52); ctx.lineTo(200, 52);
    ctx.stroke();

    // Roof parapet
    ctx.fillStyle = '#334155';
    ctx.fillRect(-4, -8, 208, 10);

    // 3D Voxel Balconies
    for (let by = 16; by < 90; by += 46) {
      for (const bx of [16, 120]) {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(bx, by, 64, 28);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(bx, by, 64, 3);
        ctx.fillStyle = (bx + by) % 3 === 0 ? '#fef08a' : '#38bdf8';
        ctx.fillRect(bx + 8, by - 12, 20, 12);
        ctx.fillRect(bx + 36, by - 12, 20, 12);
        // Air conditioning unit
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(bx + 48, by + 12, 14, 10);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(bx + 52, by + 14, 6, 6);
      }
    }
  } else if (style === 'cottage') {
    // Cozy Minecraft Village Cottage with Oak Planks & Chimney Smoke
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-8, 70, 136, 12);

    // Cobblestone foundation
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(0, 56, 120, 16);

    // Oak Wood Planks
    ctx.fillStyle = '#a07844';
    ctx.fillRect(0, 0, 120, 56);
    ctx.strokeStyle = '#6d4c28';
    ctx.lineWidth = 1;
    for (let py = 12; py < 56; py += 12) {
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(120, py); ctx.stroke();
    }
    // Corner logs
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(0, 0, 12, 56);
    ctx.fillRect(108, 0, 12, 56);

    // A-frame Pitched Roof
    ctx.fillStyle = '#2e1d11';
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(60, -32);
    ctx.lineTo(130, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4a2f1b';
    ctx.beginPath();
    ctx.moveTo(-6, -2);
    ctx.lineTo(60, -30);
    ctx.lineTo(126, -2);
    ctx.closePath();
    ctx.fill();

    // Brick Chimney
    ctx.fillStyle = '#8a2d21';
    ctx.fillRect(86, -42, 16, 24);
    ctx.fillStyle = '#333333';
    ctx.fillRect(84, -44, 20, 4);

    // Animated Voxel Smoke Particles
    for (let i = 0; i < 3; i++) {
      const smokeProgress = ((time * 0.0015 + i * 0.33) % 1);
      const sy = -46 - smokeProgress * 28;
      const sx = 94 + Math.sin(time * 0.003 + i) * 6 + smokeProgress * 8;
      const sSize = 4 + smokeProgress * 6;
      ctx.fillStyle = `rgba(220, 220, 220, ${0.7 - smokeProgress * 0.6})`;
      ctx.fillRect(sx - sSize / 2, sy, sSize, sSize);
    }

    // Window with wooden frame
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(24, 18, 22, 22);
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(34, 18, 2, 22);
    ctx.fillRect(24, 28, 22, 2);

    // Wooden door
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(68, 24, 26, 46);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(72, 46, 3, 3);

  } else {
    // Damaged Ruin at Strike Site
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 20, 160, 60);
    ctx.fillStyle = '#8a2d21';
    ctx.fillRect(20, 10, 40, 30);
    ctx.fillRect(90, 15, 30, 25);
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(30, 8);
    ctx.lineTo(50, 26);
    ctx.lineTo(85, 12);
    ctx.lineTo(120, 30);
    ctx.lineTo(160, 20);
    ctx.lineTo(160, 80);
    ctx.lineTo(0, 80);
    ctx.closePath();
    ctx.fill();

    // Twisted metal rebar sticking out
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(35, 12); ctx.lineTo(38, -6); ctx.lineTo(46, -10);
    ctx.moveTo(92, 14); ctx.lineTo(88, -8); ctx.lineTo(82, -12);
    ctx.stroke();

    // Dark blast scorch marks
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(40, 35, 60, 40);
  }

  ctx.restore();
}

function drawVoxelCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: 'dsns_van' | 'civilian_sedan' | 'pickup' | 'damaged_btr',
  time: number = 0
) {
  ctx.save();
  ctx.translate(x, y);

  // Ground Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(-44, 22, 88, 14);

  if (type === 'dsns_van') {
    // DSNS Sapper Rescue Van (Roblox/Minecraft Style)
    ctx.fillStyle = '#18181b';
    ctx.fillRect(-36, 16, 16, 16);
    ctx.fillRect(20, 16, 16, 16);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-32, 20, 8, 8);
    ctx.fillRect(24, 20, 8, 8);

    // Red Main Van Body
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-42, -12, 84, 30);

    // White High-Visibility Side Stripe
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-42, 0, 84, 8);
    // "101 ДСНС" on stripe
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 6.5px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('101 ДСНС', 0, 6.5);

    // Red Van Roof Cabin
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-22, -26, 44, 16);

    // Windshield & Side Windows
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(10, -22, 10, 10);
    ctx.fillRect(-8, -22, 14, 9);
    ctx.fillRect(-20, -22, 9, 9);

    // Front Bumper & Headlights
    ctx.fillStyle = '#334155';
    ctx.fillRect(40, 8, 5, 8);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(38, 0, 4, 6);

    // Emergency Flashing Beacon Light Bar (Blue & Red)
    const flash = Math.floor(time * 0.008) % 2;
    ctx.fillStyle = '#18181b';
    ctx.fillRect(-6, -30, 12, 4);

    ctx.fillStyle = flash === 0 ? '#ff2222' : '#881111';
    ctx.fillRect(-5, -34, 5, 5);
    ctx.fillStyle = flash === 1 ? '#38bdf8' : '#0369a1';
    ctx.fillRect(1, -34, 5, 5);

    ctx.fillStyle = flash === 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(56, 189, 248, 0.25)';
    ctx.beginPath();
    ctx.arc(0, -32, 28, 0, Math.PI * 2);
    ctx.fill();

  } else if (type === 'civilian_sedan') {
    // Roblox-Style Blue Sedan
    ctx.fillStyle = '#18181b';
    ctx.fillRect(-30, 12, 14, 14);
    ctx.fillRect(18, 12, 14, 14);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-26, 16, 6, 6);
    ctx.fillRect(22, 16, 6, 6);

    ctx.fillStyle = '#2563eb';
    ctx.fillRect(-38, -6, 76, 20);

    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(-18, -18, 38, 13);

    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(8, -16, 9, 9);
    ctx.fillRect(-6, -16, 11, 8);
    ctx.fillRect(-16, -16, 8, 8);

    ctx.fillStyle = '#fef08a';
    ctx.fillRect(36, -2, 3, 5);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-39, -2, 3, 5);

  } else if (type === 'pickup') {
    // Village Farm Pickup Truck
    ctx.fillStyle = '#18181b';
    ctx.fillRect(-32, 14, 15, 15);
    ctx.fillRect(20, 14, 15, 15);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-28, 18, 7, 7);
    ctx.fillRect(24, 18, 7, 7);

    ctx.fillStyle = '#15803d';
    ctx.fillRect(-38, -6, 76, 22);

    ctx.fillStyle = '#166534';
    ctx.fillRect(-36, -10, 32, 5);

    ctx.fillStyle = '#14532d';
    ctx.fillRect(-2, -20, 28, 15);
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(14, -18, 9, 10);
    ctx.fillRect(0, -18, 11, 9);

  } else {
    // Damaged Armored Vehicle / BTR at Strike Site
    ctx.fillStyle = '#3f4b3b';
    ctx.fillRect(-42, -10, 84, 24);

    ctx.fillStyle = '#18181b';
    ctx.fillRect(-36, 14, 16, 15);
    ctx.fillRect(-6, 14, 16, 15);
    ctx.fillRect(22, 14, 15, 15);

    ctx.fillStyle = '#2d3729';
    ctx.fillRect(-14, -20, 32, 12);
    ctx.fillStyle = '#1c2419';
    ctx.fillRect(16, -16, 22, 4);

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-20, -6, 30, 16);

    for (let i = 0; i < 4; i++) {
      const sp = (time * 0.0012 + i * 0.25) % 1;
      const sy = -22 - sp * 38;
      const sx = -24 + Math.sin(time * 0.002 + i) * 8 - sp * 14;
      const sz = 6 + sp * 10;
      ctx.fillStyle = `rgba(30, 30, 30, ${0.7 - sp * 0.6})`;
      ctx.fillRect(sx, sy, sz, sz);
    }
  }

  ctx.restore();
}

function drawBackground(ctx: CanvasRenderingContext2D, level: LevelConfig, time: number) {
  const w = level.worldWidth;
  const h = level.worldHeight;

  if (level.theme === 'school_road') {
    // School Zone: Minecraft Brick School, DSNS Rescue Van, Civilian Sedan, Voxel Trees & Fences
    ctx.fillStyle = '#38662e'; // Minecraft grass block top
    ctx.fillRect(0, 0, w, h);

    // School Buildings along the top
    drawVoxelHouse(ctx, 160, 20, 'school', time);
    drawVoxelHouse(ctx, 950, 20, 'school', time);

    // School Fence Line with Minecraft Iron Bars
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 115); ctx.lineTo(w, 115);
    ctx.stroke();
    for (let x = 20; x < w; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 105); ctx.lineTo(x, 128); ctx.stroke();
    }

    // Expressive Voxel Trees (Birch & Oak)
    const schoolTrees = [
      { x: 70, y: 190, type: 'oak' as const, s: 1 },
      { x: 440, y: 185, type: 'birch' as const, s: 0.95 },
      { x: 740, y: 190, type: 'oak' as const, s: 1.05 },
      { x: 1250, y: 185, type: 'birch' as const, s: 1 },
      { x: 180, y: 530, type: 'oak' as const, s: 1 },
      { x: 580, y: 540, type: 'birch' as const, s: 1.05 },
      { x: 920, y: 530, type: 'oak' as const, s: 0.95 },
      { x: 1300, y: 540, type: 'birch' as const, s: 1 }
    ];
    for (const tr of schoolTrees) {
      drawVoxelTree(ctx, tr.x, tr.y, tr.type, tr.s);
    }

    // DSNS Sapper Rescue Van parked near school entrance
    drawVoxelCar(ctx, 480, 140, 'dsns_van', time);
    // Civilian Blue Sedan parked at curb
    drawVoxelCar(ctx, 1120, 140, 'civilian_sedan', time);

  } else if (level.theme === 'park_forest') {
    // Dense Mossy Pine & Oak Forest with Forester's Cottage & Pickup
    ctx.fillStyle = '#1e4226'; // Deep forest moss grass
    ctx.fillRect(0, 0, w, h);

    // Forester's Wooden Cottage
    drawVoxelHouse(ctx, 420, 35, 'cottage', time);
    // Forester's Pickup Truck parked outside
    drawVoxelCar(ctx, 600, 120, 'pickup', time);

    // Abundant Voxel Pine, Oak, and Birch Trees
    const forestTrees = [
      { x: 80, y: 70, t: 'pine' as const }, { x: 220, y: 65, t: 'oak' as const },
      { x: 780, y: 65, t: 'pine' as const }, { x: 980, y: 70, t: 'oak' as const },
      { x: 1180, y: 60, t: 'pine' as const }, { x: 1380, y: 70, t: 'birch' as const },
      { x: 140, y: 520, t: 'pine' as const }, { x: 340, y: 550, t: 'oak' as const },
      { x: 560, y: 510, t: 'birch' as const }, { x: 820, y: 540, t: 'pine' as const },
      { x: 1040, y: 510, t: 'oak' as const }, { x: 1280, y: 550, t: 'pine' as const }
    ];
    for (const tr of forestTrees) {
      drawVoxelTree(ctx, tr.x, tr.y, tr.t, 1.05);
    }

    // Mossy stone boulders and mushrooms
    ctx.fillStyle = '#4b5563';
    for (let x = 160; x < w; x += 340) {
      ctx.fillRect(x, 480, 18, 12);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(x + 2, 478, 14, 4);
      ctx.fillStyle = '#4b5563';
    }

  } else if (level.theme === 'neighborhood_home') {
    // Residential Courtyard: Multi-story Panel Houses, Parked Cars, Playground
    ctx.fillStyle = '#3f4740'; // Paved courtyard asphalt & tile
    ctx.fillRect(0, 0, w, h);

    // Multi-story Residential Panel Houses
    drawVoxelHouse(ctx, 80, 15, 'residential', time);
    drawVoxelHouse(ctx, 580, 15, 'residential', time);
    drawVoxelHouse(ctx, 1080, 15, 'residential', time);

    // Parked Civilian Cars in Parking Bays
    drawVoxelCar(ctx, 360, 135, 'civilian_sedan', time);
    drawVoxelCar(ctx, 860, 135, 'pickup', time);

    // Courtyard Birch & Oak Trees
    const yardTrees = [
      { x: 40, y: 180, t: 'birch' as const },
      { x: 500, y: 180, t: 'oak' as const },
      { x: 1000, y: 180, t: 'birch' as const },
      { x: 220, y: 530, t: 'oak' as const },
      { x: 680, y: 530, t: 'birch' as const },
      { x: 1150, y: 530, t: 'oak' as const }
    ];
    for (const tr of yardTrees) {
      drawVoxelTree(ctx, tr.x, tr.y, tr.t, 0.95);
    }

    // Playground Sandbox & Benches in lower courtyard
    ctx.fillStyle = '#d97706';
    for (let x = 380; x < w; x += 650) {
      ctx.fillRect(x, 490, 70, 42);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, 490, 70, 42);
      // Bench
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x + 85, 500, 28, 8);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x + 88, 508, 4, 10);
      ctx.fillRect(x + 105, 508, 4, 10);
    }

  } else if (level.theme === 'rural_road') {
    // Country Road: Village Cottages, Sunflower Fields, Farm Pickup & Tractor
    ctx.fillStyle = '#447032'; // Vibrant Ukrainian field grass
    ctx.fillRect(0, 0, w, h);

    // Village Cottages with smoking chimneys
    drawVoxelHouse(ctx, 140, 25, 'cottage', time);
    drawVoxelHouse(ctx, 880, 25, 'cottage', time);

    // Farm Pickup parked on roadside
    drawVoxelCar(ctx, 420, 130, 'pickup', time);

    // Oak trees along country road
    const ruralTrees = [
      { x: 60, y: 170, t: 'oak' as const },
      { x: 600, y: 175, t: 'oak' as const },
      { x: 1250, y: 170, t: 'oak' as const },
      { x: 180, y: 530, t: 'oak' as const },
      { x: 740, y: 540, t: 'oak' as const },
      { x: 1300, y: 530, t: 'oak' as const }
    ];
    for (const tr of ruralTrees) {
      drawVoxelTree(ctx, tr.x, tr.y, tr.t, 1.05);
    }

    // Vibrant Sunflower Fields (Voxel Roblox Style)
    for (let x = 60; x < w; x += 70) {
      // Top field
      ctx.fillStyle = '#15803d'; // stem
      ctx.fillRect(x + 6, 130 + (x % 20), 4, 16);
      ctx.fillStyle = '#eab308'; // petals
      ctx.fillRect(x, 122 + (x % 20), 16, 16);
      ctx.fillStyle = '#451a03'; // core
      ctx.fillRect(x + 4, 126 + (x % 20), 8, 8);

      // Bottom field
      ctx.fillStyle = '#15803d';
      ctx.fillRect(x + 14, 530 + (x % 25), 4, 16);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(x + 8, 522 + (x % 25), 16, 16);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(x + 12, 526 + (x % 25), 8, 8);
    }

  } else if (level.theme === 'riverbank') {
    // Riverbank: Animated Blue River, Boat Shed Cottage, DSNS Van, Sandy Shore
    ctx.fillStyle = '#cca348'; // Sandy beach ground
    ctx.fillRect(0, 0, w, h);

    // Water Body (y: 0 to 180)
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, w, 180);

    // Animated Water Ripples with Specular Block Highlights
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2.5;
    for (let x = 0; x < w; x += 60) {
      const waveY1 = 45 + Math.sin(time * 0.003 + x * 0.02) * 6;
      const waveY2 = 105 + Math.cos(time * 0.003 + x * 0.02) * 6;
      ctx.beginPath();
      ctx.moveTo(x, waveY1); ctx.lineTo(x + 30, waveY1);
      ctx.moveTo(x + 15, waveY2); ctx.lineTo(x + 45, waveY2);
      ctx.stroke();
    }

    // Foam Waterline
    ctx.fillStyle = '#f0fdf4';
    ctx.fillRect(0, 178, w, 4);

    // Fisherman's Cottage on Bank
    drawVoxelHouse(ctx, 450, 30, 'cottage', time);

    // DSNS Patrol Van parked at river road junction
    drawVoxelCar(ctx, 220, 140, 'dsns_van', time);

    // Reeds and Cattails
    for (let x = 40; x < w; x += 55) {
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 210);
      ctx.lineTo(x + Math.sin(time * 0.004 + x) * 5, 176);
      ctx.stroke();
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 2 + Math.sin(time * 0.004 + x) * 5, 170, 5, 10);
    }

    // Wooden Boat Dock
    for (let x = 320; x < w; x += 750) {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x, 130, 48, 64);
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, 130, 48, 64);
    }

    // Riverbank Birch Trees
    const riverTrees = [
      { x: 100, y: 530, t: 'birch' as const },
      { x: 620, y: 530, t: 'birch' as const },
      { x: 1100, y: 530, t: 'birch' as const }
    ];
    for (const tr of riverTrees) {
      drawVoxelTree(ctx, tr.x, tr.y, tr.t, 1);
    }

  } else {
    // Strike Site: Shattered Brick Ruin, Damaged Military BTR with Smoke, Heavy DSNS Rescue Van
    ctx.fillStyle = '#262626'; // Charred ground
    ctx.fillRect(0, 0, w, h);

    // Damaged Ruined Buildings
    drawVoxelHouse(ctx, 160, 25, 'damaged', time);
    drawVoxelHouse(ctx, 850, 25, 'damaged', time);

    // Damaged BTR Armored Vehicle with Rising Smoke
    drawVoxelCar(ctx, 450, 135, 'damaged_btr', time);

    // DSNS Heavy Sapper Rescue Van on scene with flashing emergency lights
    drawVoxelCar(ctx, 1100, 135, 'dsns_van', time);

    // Huge Blast Craters
    const craters = [
      [360, 175, 75],
      [920, 510, 85],
      [1450, 160, 90]
    ];
    for (const [cx, cy, cr] of craters) {
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, cr);
      grad.addColorStop(0, '#0a0a0a');
      grad.addColorStop(0.7, '#171717');
      grad.addColorStop(1, 'rgba(38, 38, 38, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();

      // Blast fissure cracks
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 2.5;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * (cr + 20), cy + Math.sin(a) * (cr + 20));
        ctx.stroke();
      }
    }

    // Broken Concrete Blocks with Rebar
    ctx.fillStyle = '#475569';
    for (let x = 120; x < w; x += 280) {
      ctx.fillRect(x, 480 + (x % 40), 36, 24);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 36, 490 + (x % 40));
      ctx.lineTo(x + 50, 485 + (x % 40));
      ctx.stroke();
    }
  }
}

/**
 * Draws tempting unverified shortcut trails leading toward hazards.
 */
/**
 * Draws tempting unverified shortcut trails leading toward hazards with rich visual warnings.
 */
function drawDangerousPaths(ctx: CanvasRenderingContext2D, paths: DangerousPath[], time: number) {
  for (const dp of paths) {
    ctx.save();

    // 1. Muddy, trampled ground
    ctx.strokeStyle = '#452b1e';
    ctx.lineWidth = dp.width + 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(dp.x1, dp.y1);
    ctx.lineTo(dp.x2, dp.y2);
    ctx.stroke();

    // 2. Cracked trampled center line
    ctx.strokeStyle = '#2d1810';
    ctx.lineWidth = dp.width;
    ctx.beginPath();
    ctx.moveTo(dp.x1, dp.y1);
    ctx.lineTo(dp.x2, dp.y2);
    ctx.stroke();

    // 3. Red Hazard Crosses along the dangerous trail
    const dx = dp.x2 - dp.x1;
    const dy = dp.y2 - dp.y1;
    const pathLen = Math.hypot(dx, dy);
    const steps = Math.max(2, Math.floor(pathLen / 45));

    for (let s = 1; s <= steps; s++) {
      const t = s / (steps + 0.5);
      const px = dp.x1 + dx * t;
      const py = dp.y1 + dy * t;

      // Draw red warning cross
      ctx.save();
      ctx.translate(px, py);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-5, -5);
      ctx.lineTo(5, 5);
      ctx.moveTo(5, -5);
      ctx.lineTo(-5, 5);
      ctx.stroke();

      // Footprints stopping before the end
      if (s < steps) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.ellipse(3, -2, 2.5, 4, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 4. Animated warning chevron dashed stripes (// // //)
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.005);
    ctx.strokeStyle = `rgba(239, 68, 68, ${0.45 + pulse * 0.45})`;
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(dp.x1, dp.y1);
    ctx.lineTo(dp.x2, dp.y2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. Warning roadblock sign & skull at the branching point
    ctx.save();
    ctx.translate(dp.x1, dp.y1);

    // Wooden barrier stakes
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-14, -14, 4, 28);
    ctx.fillRect(10, -14, 4, 28);

    // Barrier bar with red-white stripes
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-18, -8, 36, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-10, -8, 6, 8);
    ctx.fillRect(4, -8, 6, 8);

    // Warning skull emblem
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(0, -16, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('☠', 0, -12);
    ctx.restore();

    // 6. Danger Path Warning Label along midpoint
    const midX = (dp.x1 + dp.x2) / 2;
    const midY = (dp.y1 + dp.y2) / 2;
    ctx.save();
    ctx.translate(midX, midY - 16);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(-75, -10, 150, 20);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-75, -10, 150, 20);
    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 9px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('⛔ НЕБЕЗПЕЧНИЙ ЗРІЗ! МІНИ!', 0, 4);
    ctx.restore();

    ctx.restore();
  }
}

function drawSafePaths(ctx: CanvasRenderingContext2D, paths: SafePathSegment[], time: number) {
  for (const seg of paths) {
    // 1. Base curb/outer border
    ctx.strokeStyle = seg.surface === 'asphalt' ? '#475569' : '#78716c';
    ctx.lineWidth = seg.width + 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(seg.x1, seg.y1);
    ctx.lineTo(seg.x2, seg.y2);
    ctx.stroke();

    // 2. Main road surface
    ctx.strokeStyle = seg.surface === 'asphalt' ? '#1e293b' : '#57534e';
    ctx.lineWidth = seg.width;
    ctx.beginPath();
    ctx.moveTo(seg.x1, seg.y1);
    ctx.lineTo(seg.x2, seg.y2);
    ctx.stroke();

    // 3. Distinct surface textures
    if (seg.surface === 'asphalt') {
      // Clean road markings: white dashed dividing line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([18, 14]);
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (seg.surface === 'concrete_path') {
      // Concrete expansion seams
      ctx.strokeStyle = '#44403c';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 34]);
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Stone/paved trail dotted texture
      ctx.strokeStyle = '#d6d3d1';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 12]);
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 4. Soft green reassurance perimeter glow
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.003);
    ctx.strokeStyle = `rgba(34, 197, 94, ${0.18 + pulse * 0.12})`;
    ctx.lineWidth = seg.width + 24;
    ctx.beginPath();
    ctx.moveTo(seg.x1, seg.y1);
    ctx.lineTo(seg.x2, seg.y2);
    ctx.stroke();
  }
}

function drawWarningSigns(ctx: CanvasRenderingContext2D, signs: WarningSign[], time: number) {
  for (const s of signs) {
    if (s.type === 'official_mine_sign') {
      ctx.save();
      ctx.translate(s.x, s.y);

      // Wooden stake
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-3, 0, 6, 30);

      // Official Red Triangle / Square
      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -32);
      ctx.lineTo(26, 6);
      ctx.lineTo(-26, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // White skull & crossbones
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, -12, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-5, -7, 10, 5);

      // Eye sockets
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-3, -14, 2.5, 3.5);
      ctx.fillRect(1, -14, 2.5, 3.5);

      // Text label "МІНИ!"
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8.5px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('УВАГА МІНИ!', 0, 3);

      ctx.restore();
    } else if (s.type === 'tape') {
      ctx.save();
      ctx.translate(s.x, s.y);

      // Stake
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-4, -22, 8, 44);

      // Fluttering caution tape
      const sway = Math.sin(time * 0.004 + s.x) * 4;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-24 + sway, -14, 48, 9);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-14 + sway, -14, 10, 9);
      ctx.fillRect(6 + sway, -14, 10, 9);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 6.5px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('СТОП', sway, -7);

      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(s.x, s.y);

      // Crossed warning sticks with red cloth
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-18, -18);
      ctx.lineTo(18, 18);
      ctx.moveTo(18, -18);
      ctx.lineTo(-18, 18);
      ctx.stroke();

      // Red fabric tied in middle
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, -6, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
}

/**
 * Draws expressive, high-detail hazard items with animated danger halos and identification plaques.
 */
function drawHazards(
  ctx: CanvasRenderingContext2D,
  hazards: Hazard[],
  playerX: number,
  playerY: number,
  time: number
) {
  for (const h of hazards) {
    const dist = Math.hypot(playerX - h.x, playerY - h.y);

    // Hazard aura when player is within warning range
    if (dist <= h.warningRadius) {
      const pingAlpha = 0.4 + 0.4 * Math.sin(time * 0.008);

      // Outer warning ring
      ctx.strokeStyle = `rgba(239, 68, 68, ${pingAlpha})`;
      ctx.lineWidth = 3.5;
      ctx.setLineDash([7, 7]);
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius + 20, 0, Math.PI * 2);
      ctx.stroke();

      // Inner danger threshold
      ctx.strokeStyle = `rgba(220, 38, 38, ${0.6 + pingAlpha * 0.4})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Floating prominent danger label
      ctx.fillStyle = 'rgba(153, 27, 27, 0.95)';
      ctx.fillRect(h.x - 70, h.y - h.radius - 32, 140, 22);
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(h.x - 70, h.y - h.radius - 32, 140, 22);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9.5px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`⛔ ${h.name}`, h.x, h.y - h.radius - 17);
    }

    // Always draw an explicit warning mini-sign right next to the hazard
    ctx.save();
    ctx.translate(h.x + h.radius + 14, h.y - 12);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-2, 0, 4, 18);
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-10, -14, 20, 14);
    ctx.strokeRect(-10, -14, 20, 14);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('☠ МІНА', 0, -4);
    ctx.restore();

    ctx.save();
    ctx.translate(h.x, h.y);

    // Hazard ground shadow & scorched blast rim
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 10, h.radius * 0.8, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    if (h.type === 'petal_mine') {
      // PFM-1 Petal Mine (Butterfly mine)
      ctx.fillStyle = '#3f6212';
      ctx.beginPath();
      ctx.ellipse(-10, 0, 22, 11, -0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#4d7c0f';
      ctx.beginPath();
      ctx.ellipse(10, -2, 14, 8, 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.strokeStyle = '#273c09';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-16, -4);
      ctx.lineTo(-4, -2);
      ctx.moveTo(-18, 2);
      ctx.lineTo(-4, 2);
      ctx.stroke();

    } else if (h.type === 'tripwire') {
      // Tripwire (Розтяжка з гранатою на кілочках)
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-45, -16, 6, 32);
      ctx.fillRect(40, -16, 6, 32);

      // Grenade at stake
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.arc(43, -2, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(41, -14, 5, 8);
      ctx.strokeStyle = '#eab308';
      ctx.strokeRect(39, -16, 9, 3);

      const glint = 0.5 + 0.5 * Math.sin(time * 0.007);
      ctx.strokeStyle = `rgba(241, 245, 249, ${0.7 + glint * 0.3})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-42, 6);
      ctx.lineTo(43, -4);
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-2, -1, 5, 12);

    } else if (h.type === 'antitank_mine') {
      // TM-62 heavy anti-tank mine
      ctx.fillStyle = '#3f3f46';
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      ctx.strokeStyle = '#52525b';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#71717a';
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -22, 7, Math.PI, Math.PI * 2);
      ctx.stroke();

    } else if (h.type === 'directional_mine') {
      // МОН-50 / МОН-90 Міна направленої дії
      // Metal scissor folding legs
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-18, 14);
      ctx.lineTo(-24, 26);
      ctx.moveTo(18, 14);
      ctx.lineTo(24, 26);
      ctx.stroke();

      // Curved convex plastic body (olive-drab)
      ctx.fillStyle = '#3f6212';
      ctx.beginPath();
      ctx.moveTo(-24, -12);
      ctx.quadraticCurveTo(0, -18, 24, -12);
      ctx.lineTo(24, 12);
      ctx.quadraticCurveTo(0, 16, -24, 12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1e3a1f';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Dual detonator sockets on top
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(-12, -18, 5, 6);
      ctx.fillRect(7, -18, 5, 6);

      // Prominent stencil text "ДО СУПРОТИВНИКА"
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 5.5px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('ДО СУПРОТИВНИКА ➔', 0, 2);

    } else if (h.type === 'grenade') {
      // Ф-1 "лимонка" або РГД-5 ручна граната
      ctx.save();
      ctx.rotate(0.2);

      // Ribbed oval iron cast body
      ctx.fillStyle = '#293520';
      ctx.beginPath();
      ctx.ellipse(0, 3, 14, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#141d10';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pineapple rib grid pattern
      ctx.strokeStyle = '#1c2416';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
      ctx.moveTo(-13, 6); ctx.lineTo(13, 6);
      ctx.moveTo(-10, -5); ctx.lineTo(10, -5);
      ctx.moveTo(0, -15); ctx.lineTo(0, 20);
      ctx.moveTo(-6, -12); ctx.lineTo(-6, 17);
      ctx.moveTo(6, -12); ctx.lineTo(6, 17);
      ctx.stroke();

      // Fuse neck (УЗРГМ)
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(-3, -20, 6, 8);

      // Safety lever spoon
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(10, -18);
      ctx.lineTo(11, 8);
      ctx.stroke();

      // Safety split ring
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-8, -17, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

    } else if (h.type === 'mortar_shell') {
      // 82-мм або 120-мм Нерозірваний мінометний боєприпас
      ctx.save();
      ctx.rotate(-0.5);

      // Teardrop mortar body
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Yellow danger stencil band
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-6, -11, 7, 22);

      // Fuse tip buried slightly into ground
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(18, -6);
      ctx.lineTo(29, 0);
      ctx.lineTo(18, 6);
      ctx.closePath();
      ctx.fill();

      // Tail fin assembly with stabilizing vanes
      ctx.fillStyle = '#334155';
      ctx.fillRect(-32, -4, 12, 8);
      // Fins
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-32, -12); ctx.lineTo(-22, -4);
      ctx.moveTo(-32, 12); ctx.lineTo(-22, 4);
      ctx.stroke();
      ctx.restore();

    } else if (h.type === 'fpv_drone') {
      // ФВП дрон-камікадзе з бойовою частиною
      // Carbon X-frame arms
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-22, -22); ctx.lineTo(22, 22);
      ctx.moveTo(-22, 22); ctx.lineTo(22, -22);
      ctx.stroke();

      // 4 Motors and rotating propeller blur discs
      const propAngles = [-22, 22];
      for (const px of propAngles) {
        for (const py of propAngles) {
          ctx.fillStyle = '#3f3f46';
          ctx.beginPath();
          ctx.arc(px, py, 5, 0, Math.PI * 2);
          ctx.fill();

          // Propeller blade spinning blur
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.arc(px, py, 11, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Main electronics stack
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-10, -10, 20, 20);

      // Camera on front
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(8, -4, 5, 8);

      // Antenna on rear
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, 0); ctx.lineTo(-20, -10);
      ctx.stroke();

      // Strapped RPG Warhead / explosive payload underneath
      ctx.fillStyle = '#3f6212';
      ctx.beginPath();
      ctx.ellipse(0, 10, 16, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Black electrical tape securing payload
      ctx.fillStyle = '#000000';
      ctx.fillRect(-6, 4, 12, 12);

      // Blinking red detonation receiver LED
      const droneLed = Math.floor(time * 0.008) % 2 === 0;
      ctx.fillStyle = droneLed ? '#ef4444' : '#450a0a';
      ctx.beginPath();
      ctx.arc(0, -6, 3.5, 0, Math.PI * 2);
      ctx.fill();

    } else if (h.type === 'shahed_debris') {
      // Залишки БПЛА "Шахед-136" з бойовою частиною
      ctx.save();
      ctx.rotate(0.3);

      // Large triangular delta-wing piece (dark charcoal matte)
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.moveTo(35, 0);   // Nose direction
      ctx.lineTo(-30, -32); // Wingtip left
      ctx.lineTo(-22, 0);   // Center engine area
      ctx.lineTo(-30, 32);  // Wingtip right
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#44403c';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Wing vertical stabilizer fin
      ctx.fillStyle = '#292524';
      ctx.fillRect(-32, -34, 6, 16);
      ctx.fillRect(-32, 18, 6, 16);

      // White serial stencil marking
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 6px monospace';
      ctx.fillText('M-214', -14, -10);

      // Rear engine MD-550 cylinder & broken wooden pusher propeller
      ctx.fillStyle = '#71717a';
      ctx.fillRect(-22, -7, 10, 14);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-28, -2, 6, 18);

      // Dangerous unexploded 50-kg warhead cone in the front
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(35, 0);
      ctx.lineTo(15, -12);
      ctx.lineTo(15, 12);
      ctx.closePath();
      ctx.fill();

      // Protruding severed wire harness
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(12, 5); ctx.lineTo(18, 14);
      ctx.moveTo(8, -4); ctx.lineTo(14, -12);
      ctx.stroke();
      ctx.restore();

    } else if (h.type === 'rocket_debris') {
      // Залишки ракети РСЗВ "Град" або "Ураган" у землі
      ctx.save();
      ctx.rotate(-0.6);

      // Rocket tubular metal engine/fuselage
      ctx.fillStyle = '#475569';
      ctx.fillRect(-32, -8, 54, 16);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.strokeRect(-32, -8, 54, 16);

      // Scorched metal bands
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-12, -8, 6, 16);
      ctx.fillRect(8, -8, 6, 16);

      // Protruding nozzle in crater
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(22, 0, 7, 0, Math.PI * 2);
      ctx.fill();

      // Curved rocket stabilization fins
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.moveTo(-32, -8); ctx.lineTo(-44, -20); ctx.lineTo(-24, -8);
      ctx.moveTo(-32, 8);  ctx.lineTo(-44, 20);  ctx.lineTo(-24, 8);
      ctx.fill();
      ctx.restore();

    } else if (h.type === 'tank_shell') {
      // 125-мм Танковий снаряд
      ctx.save();
      ctx.rotate(0.15);

      // Projectile steel body
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(-25, -9);
      ctx.lineTo(10, -9);
      ctx.lineTo(28, 0); // Pointed aerodynamic ballistic cone
      ctx.lineTo(10, 9);
      ctx.lineTo(-25, 9);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Polished copper driving band
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-14, -10, 7, 20);

      // High-explosive yellow fuse cap
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(24, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      // Stencil marking
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 5.5px monospace';
      ctx.fillText('125-ОФ', -6, 2);
      ctx.restore();

    } else if (h.type === 'rpg_rocket') {
      // Постріл від гранатомета РПГ-7 (ПГ-7В)
      ctx.save();
      ctx.rotate(-0.25);

      // Shaped-charge warhead (large olive cone)
      ctx.fillStyle = '#365314';
      ctx.beginPath();
      ctx.moveTo(25, 0); // Piezo fuse tip
      ctx.lineTo(14, -14);
      ctx.lineTo(-4, -10);
      ctx.lineTo(-4, 10);
      ctx.lineTo(14, 14);
      ctx.closePath();
      ctx.fill();

      // Piezo-electric detonator cap
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(20, -2, 7, 4);

      // Rocket motor body tube
      ctx.fillStyle = '#475569';
      ctx.fillRect(-30, -5, 26, 10);

      // Turbine nozzle & folded stabilizers
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-36, -3, 6, 6);
      ctx.fillStyle = '#65a30d';
      ctx.fillRect(-34, -10, 4, 20);
      ctx.restore();

    } else if (h.type === 'improvised_explosive') {
      // Саморобний вибуховий пристрій (СВП: коробка / термос з проводами і таймером)
      // Cardboard box wrapped in heavy black duct tape
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-18, -14, 36, 28);
      ctx.fillStyle = '#18181b';
      ctx.fillRect(-18, -5, 36, 10);
      ctx.fillRect(-5, -14, 10, 28);

      // Digital timer/phone strapped on top
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-10, -10, 20, 12);
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('88:88', 0, -2);

      // Detonator wires protruding out
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10, -6);
      ctx.bezierCurveTo(18, -16, 22, -2, 26, -10);
      ctx.stroke();

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10, -2);
      ctx.bezierCurveTo(16, 4, 24, 0, 28, 8);
      ctx.stroke();

    } else if (h.type === 'booby_trap_toy') {
      // Booby-trap plush teddy bear / abandoned phone
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      // Bear ears
      ctx.beginPath();
      ctx.arc(-10, -12, 6, 0, Math.PI * 2);
      ctx.arc(10, -12, 6, 0, Math.PI * 2);
      ctx.fill();

      // Snout
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(0, 2, 6, 0, Math.PI * 2);
      ctx.fill();

      // Protruding detonator wire & blinking LED
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.lineTo(14, 18);
      ctx.stroke();

      const led = Math.floor(time * 0.006) % 2 === 0;
      ctx.fillStyle = led ? '#ef4444' : '#7f1d1d';
      ctx.beginPath();
      ctx.arc(14, 18, 4, 0, Math.PI * 2);
      ctx.fill();

    } else if (h.type === 'destroyed_tech') {
      // Burned armored vehicle hull
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(-34, -22, 68, 44);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-20, -12, 40, 24);
      ctx.strokeStyle = '#ea580c';
      ctx.strokeRect(-34, -22, 68, 44);

      // Broken turret barrel
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(42, -10);
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.fillRect(-30, 14, 60, 4);

    } else {
      // Unexploded cluster submunition / artillery projectile
      ctx.save();
      ctx.rotate(-0.35);

      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.ellipse(0, 0, 26, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#b45309';
      ctx.fillRect(-6, -7, 6, 14);

      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-28, -5, 12, 10);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-35, -3, 9, 6);

      ctx.restore();
    }

    ctx.restore();
  }
}

/**
 * Draws secondary NPC characters (People & Animals) with interactive speech bubbles.
 */
function drawNPCs(
  ctx: CanvasRenderingContext2D,
  npcs: NPC[],
  playerX: number,
  playerY: number,
  time: number
) {
  for (const npc of npcs) {
    const dist = Math.hypot(playerX - npc.x, playerY - npc.y);
    const isNearby = dist <= 62;

    ctx.save();
    ctx.translate(npc.x, npc.y);

    // Voxel Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(-12, 16, 24, 7);

    // Render character body in Minecraft Voxel Style
    if (npc.avatarIcon === 'cat') {
      // Minecraft Voxel Cat (Ocelot model)
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-10, 10, 20, 8); // fence post

      // Orange Tabby Voxel Body
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(-8, 2, 16, 8);
      // Legs
      ctx.fillStyle = '#c2410c';
      ctx.fillRect(-8, 10, 3, 4);
      ctx.fillRect(5, 10, 3, 4);
      // Head Block
      ctx.fillStyle = '#f97316';
      ctx.fillRect(-5, -7, 10, 9);
      // Ears
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(-5, -11, 3, 4);
      ctx.fillRect(2, -11, 3, 4);
      // Snout & Eyes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -2, 4, 3);
      ctx.fillStyle = '#15803d'; // green pixel eyes
      ctx.fillRect(-4, -4, 2, 2);
      ctx.fillRect(2, -4, 2, 2);
      // Tail
      const tailSway = Math.sin(time * 0.006) * 4;
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(8, 4, 4, 3);
      ctx.fillRect(11 + tailSway, 0, 3, 5);

    } else if (npc.avatarIcon === 'dog_patron') {
      // Mascot Dog Patron (Minecraft Wolf model with DSNS vest)
      // 4 Paws
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(5, 8, 3, 8);
      ctx.fillRect(1, 8, 3, 8);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-6, 8, 3, 8);
      ctx.fillRect(-9, 8, 3, 8);

      // Body Block
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-10, -2, 20, 10);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-10, -2, 7, 7);

      // Tactical DSNS Vest
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(-4, -3, 12, 11);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-4, 2, 12, 3);

      // Red Collar
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(7, -3, 3, 9);

      // Head Cube
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(8, -11, 10, 10);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(8, -11, 5, 8);
      // Ears
      ctx.fillRect(9, -15, 3, 4);
      ctx.fillRect(14, -15, 3, 4);
      // Snout
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(15, -7, 6, 5);
      ctx.fillStyle = '#111111';
      ctx.fillRect(19, -7, 2, 3);
      // Tail
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-10, -5, 3, 8);

    } else if (npc.avatarIcon === 'squirrel') {
      // Voxel Squirrel
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(-5, 4, 10, 12);
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(-3, 8, 6, 6);
      // Head
      ctx.fillStyle = '#c2410c';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.fillRect(-4, -7, 2, 3);
      ctx.fillRect(2, -7, 2, 3);
      // Big Bushy Tail
      ctx.fillStyle = '#9a3412';
      ctx.fillRect(5, -2, 6, 14);
      ctx.fillRect(3, -6, 6, 6);

    } else if (npc.avatarIcon === 'rescuer') {
      // Sapper Taras / Colonel Viktor (Minecraft DSNS Rescuer)
      // Blocky Legs
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-6, 8, 5, 9);
      ctx.fillRect(1, 8, 5, 9);
      ctx.fillStyle = '#facc15'; // reflective tape on boots
      ctx.fillRect(-6, 12, 5, 2);
      ctx.fillRect(1, 12, 5, 2);

      // Blocky Torso (Navy Blue DSNS Uniform)
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(-8, -8, 16, 16);
      ctx.fillStyle = '#172554';
      ctx.fillRect(6, -8, 2, 16); // 3D side edge
      // Yellow reflective safety stripes
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-8, -2, 16, 3);
      ctx.fillRect(-8, 4, 16, 2);

      // Blocky Arms
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(-12, -7, 4, 11);
      ctx.fillRect(8, -7, 4, 11);
      ctx.fillStyle = '#fed7aa'; // hands
      ctx.fillRect(-12, 2, 4, 4);
      ctx.fillRect(8, 2, 4, 4);

      // Minecraft Head & Protective Visor Helmet
      ctx.fillStyle = '#fed7aa'; // Skin
      ctx.fillRect(-6, -21, 12, 13);
      // Eyes
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-4, -16, 2, 2);
      ctx.fillRect(2, -16, 2, 2);

      // White Protective Helmet Block
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-7, -24, 14, 6);
      ctx.fillRect(-7, -20, 2, 8);
      ctx.fillRect(5, -20, 2, 8);
      // Transparent Protective Visor
      ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.fillRect(-5, -18, 10, 6);

    } else if (npc.avatarIcon === 'medic') {
      // Military Medic Olena (Minecraft Paramedic)
      // Legs
      ctx.fillStyle = '#334155';
      ctx.fillRect(-5, 8, 4, 9);
      ctx.fillRect(1, 8, 4, 9);

      // White Medical Coat Torso
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-8, -8, 16, 16);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(6, -8, 2, 16);
      // Red Cross Block on chest
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-2, -5, 4, 8);
      ctx.fillRect(-5, -3, 10, 4);

      // Arms
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-11, -7, 3, 11);
      ctx.fillRect(8, -7, 3, 11);
      // Medical kit block in hand
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(9, 2, 6, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(11, 4, 2, 2);

      // Head
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(-6, -21, 12, 13);
      // Brown Hair
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(-6, -23, 12, 4);
      ctx.fillRect(-6, -20, 2, 8);
      ctx.fillRect(4, -20, 2, 8);
      // Eyes
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-4, -16, 2, 2);
      ctx.fillRect(2, -16, 2, 2);

    } else if (npc.avatarIcon === 'forester') {
      // Forester Ivan (Minecraft Ranger)
      ctx.fillStyle = '#4a2f18'; // Brown pants
      ctx.fillRect(-5, 8, 4, 9);
      ctx.fillRect(1, 8, 4, 9);

      // Green Wool Coat
      ctx.fillStyle = '#166534';
      ctx.fillRect(-8, -8, 16, 16);
      ctx.fillStyle = '#14532d';
      ctx.fillRect(6, -8, 2, 16);

      // Arms
      ctx.fillStyle = '#166534';
      ctx.fillRect(-11, -7, 3, 11);
      ctx.fillRect(8, -7, 3, 11);

      // Head
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(-6, -21, 12, 13);
      // Beard
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-5, -12, 10, 4);
      // Ranger Cap (Wide block brim)
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-8, -22, 16, 3);
      ctx.fillRect(-5, -26, 10, 5);

    } else if (npc.avatarIcon === 'grandma') {
      // Grandpa Petro / Grandma (Minecraft Elder)
      ctx.fillStyle = '#334155';
      ctx.fillRect(-5, 8, 4, 9);
      ctx.fillRect(1, 8, 4, 9);

      // Woolen Checkered Vest
      ctx.fillStyle = '#475569';
      ctx.fillRect(-8, -8, 16, 16);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-3, -8, 6, 4); // collar

      // Walking cane in hand
      ctx.fillStyle = '#78350f';
      ctx.fillRect(9, -4, 2, 20);
      ctx.fillRect(7, -6, 4, 2);

      // Head with Grey Hair
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(-6, -21, 12, 13);
      ctx.fillStyle = '#94a3b8'; // Grey hair
      ctx.fillRect(-6, -23, 12, 4);
      ctx.fillRect(-6, -20, 2, 6);
      ctx.fillRect(4, -20, 2, 6);

    } else {
      // Teacher / School Student (Minecraft Villager / Civilian)
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(-5, 8, 4, 9);
      ctx.fillRect(1, 8, 4, 9);

      // Colorful Shirt
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(-7, -8, 14, 16);

      // Arms
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(-10, -7, 3, 11);
      ctx.fillRect(7, -7, 3, 11);

      // Head & Hair
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(-6, -21, 12, 13);
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(-6, -23, 12, 4);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-4, -16, 2, 2);
      ctx.fillRect(2, -16, 2, 2);
    }

    // Minecraft Slot Name Plate
    ctx.fillStyle = '#212224';
    ctx.fillRect(-42, 22, 84, 16);
    ctx.strokeStyle = '#3c5e20';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-42, 22, 84, 16);
    ctx.fillStyle = '#ffff55'; // Minecraft gold
    ctx.font = 'bold 8.5px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(npc.name, 0, 33);

    // Interactive Speech Bubble (Minecraft Green Button Style)
    if (isNearby) {
      const bob = Math.sin(time * 0.008) * 4;
      ctx.save();
      ctx.translate(0, -42 + bob);

      // Minecraft Green Button background
      ctx.fillStyle = '#43842c';
      ctx.fillRect(-48, -12, 96, 24);
      // 3D Bevel
      ctx.strokeStyle = '#6bbd47';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-48, 12); ctx.lineTo(-48, -12); ctx.lineTo(48, -12);
      ctx.stroke();
      ctx.strokeStyle = '#1c3c10';
      ctx.beginPath();
      ctx.moveTo(48, -12); ctx.lineTo(48, 12); ctx.lineTo(-48, 12);
      ctx.stroke();

      // Tail
      ctx.fillStyle = '#43842c';
      ctx.beginPath();
      ctx.moveTo(-5, 12); ctx.lineTo(0, 18); ctx.lineTo(5, 12);
      ctx.closePath();
      ctx.fill();

      // Text prompt
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9.5px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('💬 [E] Поговорити', 0, 4);
      ctx.restore();
    }

    ctx.restore();
  }
}

function drawCollectibles(ctx: CanvasRenderingContext2D, stars: CollectibleStar[], time: number) {
  for (const s of stars) {
    if (s.collected) continue;

    const floatY = s.y + Math.sin(time * 0.005 + s.x) * 4;

    ctx.save();
    ctx.translate(s.x, floatY);

    if (s.type === 'star') {
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const points = 5;
      const outerRad = 15;
      const innerRad = 7;
      for (let i = 0; i < points * 2; i++) {
        const rad = i % 2 === 0 ? outerRad : innerRad;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const sx = Math.cos(angle) * rad;
        const sy = Math.sin(angle) * rad;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-12, -14, 24, 28, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('101', 0, 4);
    }

    ctx.restore();
  }
}

function drawGoal(
  ctx: CanvasRenderingContext2D,
  targetX: number,
  targetY: number,
  targetName: string,
  time: number
) {
  ctx.save();
  ctx.translate(targetX, targetY);

  const pulse = 0.5 + 0.5 * Math.sin(time * 0.005);

  // Concentric beacon rings
  ctx.strokeStyle = `rgba(34, 197, 94, ${0.4 + pulse * 0.5})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 36 + pulse * 8, 0, Math.PI * 2);
  ctx.stroke();

  // Minecraft Emerald Block / Safe Sanctuary Base
  ctx.fillStyle = '#15803d';
  ctx.fillRect(-28, -28, 56, 56);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(-24, -24, 48, 48);
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(-20, -20, 40, 40);

  // White Sanctuary Arrow Icon
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(14, 0);
  ctx.lineTo(8, 0);
  ctx.lineTo(8, 14);
  ctx.lineTo(-8, 14);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-14, 0);
  ctx.closePath();
  ctx.fill();

  // Goal Title Banner (Minecraft Stone Slot)
  ctx.fillStyle = '#212224';
  ctx.fillRect(-70, 34, 140, 22);
  ctx.strokeStyle = '#3c5e20';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-70, 34, 140, 22);
  ctx.fillStyle = '#55ff55';
  ctx.font = 'bold 10px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('ЦІЛЬ: ' + targetName, 0, 49);

  ctx.restore();
}

function drawHero(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: 'left' | 'right' | 'up' | 'down',
  walkCycle: number,
  isMoving: boolean,
  invulnerableTimer: number
) {
  if (invulnerableTimer > 0 && Math.floor(invulnerableTimer * 12) % 2 === 0) {
    return;
  }

  ctx.save();
  ctx.translate(x, y);

  const bob = isMoving ? Math.abs(Math.sin(walkCycle * 2)) * 2 : 0;
  const legSwing = isMoving ? Math.sin(walkCycle) * 6 : 0;
  const armSwing = isMoving ? Math.sin(walkCycle) * 7 : 0;

  // 1. Voxel Ground Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(-10, 16, 20, 8);

  // 2. Minecraft Legs (Two separate cuboid legs swinging in walk cycle)
  // Left Leg
  ctx.fillStyle = '#1e3a8a'; // Blue denim jeans
  ctx.fillRect(-6, 6 + bob + legSwing, 5, 10);
  ctx.fillStyle = '#172554'; // Shadow side
  ctx.fillRect(-2, 6 + bob + legSwing, 1, 10);
  ctx.fillStyle = '#262626'; // Dark shoe
  ctx.fillRect(-6, 14 + bob + legSwing, 5, 3);

  // Right Leg
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(1, 6 + bob - legSwing, 5, 10);
  ctx.fillStyle = '#172554';
  ctx.fillRect(5, 6 + bob - legSwing, 1, 10);
  ctx.fillStyle = '#262626';
  ctx.fillRect(1, 14 + bob - legSwing, 5, 3);

  // 3. Minecraft Torso (Cuboid with DSNS Safety Vest)
  ctx.fillStyle = '#ea580c'; // Vibrant orange
  ctx.fillRect(-8, -10 + bob, 16, 16);
  ctx.fillStyle = '#c2410c'; // 3D side edge
  if (facing === 'right') {
    ctx.fillRect(6, -10 + bob, 2, 16);
  } else if (facing === 'left') {
    ctx.fillRect(-8, -10 + bob, 2, 16);
  }
  // High-visibility reflective safety block stripe
  ctx.fillStyle = '#a3e635';
  ctx.fillRect(-8, -4 + bob, 16, 3.5);
  // Inner shirt collar
  ctx.fillStyle = '#1e40af';
  ctx.fillRect(-3, -10 + bob, 6, 3);

  // 4. Minecraft Arms (Swinging in opposition to legs)
  // Left Arm
  ctx.fillStyle = '#ea580c';
  ctx.fillRect(-12, -9 + bob - armSwing, 4, 6);
  ctx.fillStyle = '#fed7aa'; // skin hand block
  ctx.fillRect(-12, -3 + bob - armSwing, 4, 6);

  // Right Arm
  ctx.fillStyle = '#ea580c';
  ctx.fillRect(8, -9 + bob + armSwing, 4, 6);
  ctx.fillStyle = '#fed7aa';
  ctx.fillRect(8, -3 + bob + armSwing, 4, 6);

  // 5. Minecraft Head (14x14 cube with Steve/Alex pixel face)
  ctx.fillStyle = '#fed7aa'; // Peach skin
  ctx.fillRect(-7, -24 + bob, 14, 14);

  // 3D side depth
  ctx.fillStyle = '#fbcfe8';
  if (facing === 'right') {
    ctx.fillRect(5, -24 + bob, 2, 14);
  } else if (facing === 'left') {
    ctx.fillRect(-7, -24 + bob, 2, 14);
  }

  // Brown Minecraft Hair
  ctx.fillStyle = '#451a03';
  ctx.fillRect(-7, -26 + bob, 14, 4); // top hair
  if (facing === 'up') {
    ctx.fillRect(-7, -24 + bob, 14, 12);
  } else {
    // Hair bangs
    ctx.fillRect(-7, -24 + bob, 3, 6);
    ctx.fillRect(4, -24 + bob, 3, 6);

    // DSNS Blue & Yellow Cadet Headband
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(-7, -23 + bob, 14, 3);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-2, -23 + bob, 4, 3);

    // 2x2 Pixel Eyes
    ctx.fillStyle = '#ffffff';
    if (facing === 'right') {
      ctx.fillRect(1, -19 + bob, 4, 3);
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(3, -19 + bob, 2, 3);
    } else if (facing === 'left') {
      ctx.fillRect(-5, -19 + bob, 4, 3);
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(-5, -19 + bob, 2, 3);
    } else {
      ctx.fillRect(-5, -19 + bob, 3, 3);
      ctx.fillRect(2, -19 + bob, 3, 3);
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(-4, -19 + bob, 2, 3);
      ctx.fillRect(3, -19 + bob, 2, 3);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-2, -13 + bob, 4, 1.5);
    }
  }

  ctx.restore();
}

function drawDogPatron(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tailWag: number,
  facing: 'left' | 'right' | 'up' | 'down'
) {
  ctx.save();
  ctx.translate(x, y);

  const dir = facing === 'left' ? -1 : 1;
  const legStep = Math.sin(tailWag * 1.5) * 3;

  // Ground Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.fillRect(-12, 10, 24, 6);

  // 1. Four Minecraft Blocky Legs
  ctx.fillStyle = '#e2e8f0'; // White front paws
  ctx.fillRect(dir * 5, 4 + legStep, 3, 7);
  ctx.fillRect(dir * 1, 4 - legStep, 3, 7);
  ctx.fillStyle = '#b45309'; // Brown rear paws
  ctx.fillRect(dir * -6, 4 - legStep, 3, 7);
  ctx.fillRect(dir * -9, 4 + legStep, 3, 7);

  // 2. Minecraft Dog Body Block (with DSNS Vest)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-10, -5, 20, 10);
  ctx.fillStyle = '#b45309';
  ctx.fillRect(-10, -5, 8, 8);

  // DSNS Tactical Vest
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(-4, -6, 12, 11);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(-4, -1, 12, 3);

  // 3. Red Collar Block
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(dir === 1 ? 7 : -10, -6, 3, 9);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(dir === 1 ? 8 : -9, -1, 2, 3);

  // 4. Minecraft Dog Head (Square Cube)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(dir === 1 ? 8 : -18, -14, 10, 10);
  ctx.fillStyle = '#b45309';
  ctx.fillRect(dir === 1 ? 8 : -14, -14, 5, 8);

  // Pointed Blocky Ears
  ctx.fillRect(dir === 1 ? 9 : -17, -18, 3, 4);
  ctx.fillRect(dir === 1 ? 14 : -12, -18, 3, 4);

  // Protruding Muzzle Block
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(dir === 1 ? 15 : -23, -10, 6, 5);
  ctx.fillStyle = '#111111';
  ctx.fillRect(dir === 1 ? 19 : -23, -10, 2, 3);

  // Pixel Eyes
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(dir === 1 ? 12 : -15, -12, 2, 2);

  // 5. Minecraft Dog Tail (pointing up 45 deg, wagging)
  const wagAngle = Math.sin(tailWag) * 8;
  ctx.save();
  ctx.translate(dir * -10, -4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(wagAngle, -8, 3, 8);
  ctx.fillStyle = '#b45309';
  ctx.fillRect(wagAngle, -8, 3, 3);
  ctx.restore();

  ctx.restore();
}
