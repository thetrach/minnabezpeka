import { Hazard, SafePathSegment, PlayerStats } from './types';

/**
 * Calculates Euclidean distance between two 2D points.
 */
export function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.hypot(dx, dy);
}

/**
 * Checks distance from a point to a line segment.
 */
export function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return calculateDistance(px, py, x1, y1);
  
  // Projection factor t clamped between 0 and 1
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return calculateDistance(px, py, projX, projY);
}

/**
 * Validates whether the player is currently walking inside any verified safe path corridor.
 */
export function isPlayerOnSafePath(
  x: number,
  y: number,
  paths: SafePathSegment[],
  playerMargin: number = 10
): { onPath: boolean; minDistanceToCenter: number; activeSurface?: string } {
  if (paths.length === 0) return { onPath: true, minDistanceToCenter: 0 };

  let minDistanceToCenter = Infinity;
  let onPath = false;
  let activeSurface: string | undefined;

  for (const seg of paths) {
    const dist = distanceToSegment(x, y, seg.x1, seg.y1, seg.x2, seg.y2);
    if (dist < minDistanceToCenter) {
      minDistanceToCenter = dist;
    }
    const maxAllowedDist = seg.width / 2 + playerMargin;
    if (dist <= maxAllowedDist) {
      onPath = true;
      activeSurface = seg.surface;
    }
  }

  return { onPath, minDistanceToCenter, activeSurface };
}

export type ProximityAlertLevel = 'safe' | 'caution' | 'warning' | 'danger';

/**
 * Evaluates proximity alert level given distance to nearest hazard.
 */
export function calculateProximityAlert(
  distance: number,
  warningRadius: number,
  dangerRadius: number
): ProximityAlertLevel {
  if (distance <= dangerRadius) {
    return 'danger';
  }
  if (distance <= dangerRadius + (warningRadius - dangerRadius) * 0.4) {
    return 'warning';
  }
  if (distance <= warningRadius) {
    return 'caution';
  }
  return 'safe';
}

/**
 * Finds the closest hazard to the player and computes proximity alert details.
 */
export function getNearestHazard(
  x: number,
  y: number,
  hazards: Hazard[]
): {
  nearestHazard: Hazard | null;
  distance: number;
  alertLevel: ProximityAlertLevel;
} {
  if (hazards.length === 0) {
    return { nearestHazard: null, distance: Infinity, alertLevel: 'safe' };
  }

  let minDistance = Infinity;
  let nearestHazard: Hazard | null = null;

  for (const h of hazards) {
    const dist = calculateDistance(x, y, h.x, h.y);
    if (dist < minDistance) {
      minDistance = dist;
      nearestHazard = h;
    }
  }

  if (!nearestHazard) {
    return { nearestHazard: null, distance: Infinity, alertLevel: 'safe' };
  }

  const alertLevel = calculateProximityAlert(
    minDistance,
    nearestHazard.warningRadius,
    nearestHazard.radius
  );

  return { nearestHazard, distance: minDistance, alertLevel };
}

/**
 * Evaluates whether goal is reached.
 */
export function checkGoalReached(
  playerX: number,
  playerY: number,
  goalX: number,
  goalY: number,
  goalRadius: number = 36
): boolean {
  return calculateDistance(playerX, playerY, goalX, goalY) <= goalRadius;
}

/**
 * Calculates star rating (1 to 3) for a completed level.
 */
export function calculateLevelStars(
  starsCollected: number,
  totalStars: number,
  quizAccuracy: number,
  livesRemaining: number
): number {
  if (livesRemaining <= 0) return 1;

  const starRatio = totalStars > 0 ? starsCollected / totalStars : 1;
  
  if (starRatio >= 0.8 && quizAccuracy >= 0.8 && livesRemaining === 3) {
    return 3;
  }
  if (starRatio >= 0.5 && quizAccuracy >= 0.5 && livesRemaining >= 2) {
    return 2;
  }
  return 1;
}

/**
 * Calculates total score with bonuses.
 */
export function calculateTotalScore(
  baseLevelPoints: number,
  starsCount: number,
  quizCorrectCount: number,
  taskSuccess: boolean,
  livesRemaining: number
): number {
  const starPoints = starsCount * 100;
  const quizPoints = quizCorrectCount * 150;
  const taskPoints = taskSuccess ? 300 : 100;
  const lifeBonus = livesRemaining * 100;

  return baseLevelPoints + starPoints + quizPoints + taskPoints + lifeBonus;
}

/**
 * Validates step sequence ordering (e.g. 101 emergency protocol).
 */
export function validateSequenceOrder(submittedIds: string[], expectedIds: string[]): boolean {
  if (submittedIds.length !== expectedIds.length) return false;
  return submittedIds.every((id, idx) => id === expectedIds[idx]);
}

/**
 * Finds if player is within interactive proximity to any NPC.
 */
export function findNearbyNPC(
  playerX: number,
  playerY: number,
  npcs: import('./types').NPC[],
  interactRadius: number = 48
): import('./types').NPC | null {
  for (const npc of npcs) {
    if (calculateDistance(playerX, playerY, npc.x, npc.y) <= interactRadius) {
      return npc;
    }
  }
  return null;
}

/**
 * Checks if the player is dangerously close to an unverified shortcut or dangerous trail.
 */
export function getDangerousPathProximity(
  playerX: number,
  playerY: number,
  dangerousPaths: import('./types').DangerousPath[]
): { isNearDangerTrail: boolean; trailName?: string; targetHazard?: string } {
  for (const dp of dangerousPaths) {
    const dist = distanceToSegment(playerX, playerY, dp.x1, dp.y1, dp.x2, dp.y2);
    if (dist <= dp.width / 2 + 15) {
      return { isNearDangerTrail: true, trailName: dp.name, targetHazard: dp.leadsToHazardName };
    }
  }
  return { isNearDangerTrail: false };
}

/**
 * Checks which achievement badges the player qualifies for based on gameplay stats.
 */
export function evaluateBadges(stats: PlayerStats, allLevelsCompleted: boolean): string[] {
  const earned: string[] = [];

  // Badge 1: Перший Крок (First Safe Step)
  if (stats.tasksCompleted >= 1) {
    earned.push('first_step');
  }

  // Badge 2: Уважне Око (Careful Eye - picked up all stars / avoided hazards)
  if (stats.starsCollected >= 8) {
    earned.push('sharp_eye');
  }

  // Badge 3: Експерт 101 (Knows 101 rules without mistakes)
  if (stats.quizzesCorrect >= 3 && stats.mistakesCount === 0) {
    earned.push('expert_101');
  }

  // Badge 4: Дисциплінований Пішохід (Always on safe paths, kept all 3 lives)
  if (stats.lives === 3 && stats.tasksCompleted >= 2) {
    earned.push('safe_walker');
  }

  // Badge 5: Уважний Слухач (Talked to NPCs and safety guides)
  if (stats.npcsTalked && stats.npcsTalked >= 3) {
    earned.push('attentive_listener');
  }

  // Badge 6: Майстер Мінної Безпеки (Completed all 4 levels)
  if (allLevelsCompleted) {
    earned.push('master_safety');
  }

  return earned;
}
