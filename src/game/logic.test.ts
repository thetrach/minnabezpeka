import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDistance,
  distanceToSegment,
  isPlayerOnSafePath,
  calculateProximityAlert,
  getNearestHazard,
  checkGoalReached,
  calculateLevelStars,
  calculateTotalScore,
  validateSequenceOrder,
  evaluateBadges,
  findNearbyNPC,
  getDangerousPathProximity
} from './logic';
import { Hazard, SafePathSegment, PlayerStats } from './types';

test('calculateDistance computes correct euclidean distance', () => {
  assert.equal(calculateDistance(0, 0, 3, 4), 5);
  assert.equal(calculateDistance(10, 10, 10, 20), 10);
});

test('distanceToSegment calculates perpendicular and endpoint distances correctly', () => {
  // Point perpendicular to segment (0,0) to (10,0) at (5, 5) -> dist 5
  assert.equal(distanceToSegment(5, 5, 0, 0, 10, 0), 5);
  // Point beyond endpoint at (15, 0) -> dist 5 to (10,0)
  assert.equal(distanceToSegment(15, 0, 0, 0, 10, 0), 5);
  // Point on segment -> dist 0
  assert.equal(distanceToSegment(3, 0, 0, 0, 10, 0), 0);
});

test('isPlayerOnSafePath correctly detects safe path boundaries', () => {
  const paths: SafePathSegment[] = [
    { x1: 0, y1: 100, x2: 200, y2: 100, width: 40, surface: 'asphalt' }
  ];

  // Point right in center (width 40, max allowed radius 20 + 10 margin = 30)
  const onCenter = isPlayerOnSafePath(50, 100, paths);
  assert.equal(onCenter.onPath, true);
  assert.equal(onCenter.activeSurface, 'asphalt');

  // Point within margin (dist = 25 <= 30)
  const nearEdge = isPlayerOnSafePath(50, 125, paths);
  assert.equal(nearEdge.onPath, true);

  // Point out in dangerous grass / verge (dist = 50 > 30)
  const offPath = isPlayerOnSafePath(50, 150, paths);
  assert.equal(offPath.onPath, false);
});

test('calculateProximityAlert returns correct warning stages', () => {
  const warningRad = 100;
  const dangerRad = 30;

  // Far away
  assert.equal(calculateProximityAlert(150, warningRad, dangerRad), 'safe');
  // In warning zone (e.g. 80)
  assert.equal(calculateProximityAlert(80, warningRad, dangerRad), 'caution');
  // Close to danger (e.g. 45)
  assert.equal(calculateProximityAlert(45, warningRad, dangerRad), 'warning');
  // Danger hit (<= 30)
  assert.equal(calculateProximityAlert(25, warningRad, dangerRad), 'danger');
});

test('getNearestHazard accurately finds closest item and sets alert', () => {
  const hazards: Hazard[] = [
    {
      id: 'h1',
      type: 'petal_mine',
      name: 'ПФМ-1 Пелюстка',
      x: 100,
      y: 100,
      radius: 25,
      warningRadius: 80,
      description: 'Небезпечна міна',
      educationalTip: 'Не наступай!',
      iconType: 'bomb'
    },
    {
      id: 'h2',
      type: 'tripwire',
      name: 'Розтяжка',
      x: 300,
      y: 300,
      radius: 30,
      warningRadius: 90,
      description: 'Тонкий дріт',
      educationalTip: 'Дивись під ноги!',
      iconType: 'tripwire'
    }
  ];

  const result = getNearestHazard(120, 100, hazards);
  assert.equal(result.nearestHazard?.id, 'h1');
  assert.equal(result.distance, 20);
  assert.equal(result.alertLevel, 'danger');
});

test('checkGoalReached verifies when player arrives at home / safe zone', () => {
  assert.equal(checkGoalReached(100, 100, 105, 105, 30), true);
  assert.equal(checkGoalReached(100, 100, 200, 200, 30), false);
});

test('calculateLevelStars awards 3 stars only with high stars and accuracy', () => {
  // High score, all lives
  assert.equal(calculateLevelStars(5, 5, 1.0, 3), 3);
  // Medium score
  assert.equal(calculateLevelStars(3, 5, 0.6, 2), 2);
  // Low score or lost lives
  assert.equal(calculateLevelStars(1, 5, 0.2, 1), 1);
});

test('calculateTotalScore computes correct cumulative sum', () => {
  // Base 500 + 3*100 (stars) + 2*150 (quiz) + 300 (task) + 3*100 (lives) = 500 + 300 + 300 + 300 + 300 = 1700
  const score = calculateTotalScore(500, 3, 2, true, 3);
  assert.equal(score, 1700);
});

test('validateSequenceOrder checks safety rules ordering', () => {
  const expected = ['stop', 'dont_touch', 'step_back', 'warn_others', 'call_101'];
  const correct = ['stop', 'dont_touch', 'step_back', 'warn_others', 'call_101'];
  const wrong = ['call_101', 'stop', 'dont_touch', 'step_back', 'warn_others'];

  assert.equal(validateSequenceOrder(correct, expected), true);
  assert.equal(validateSequenceOrder(wrong, expected), false);
});

test('findNearbyNPC detects character within radius', () => {
  const npcs: import('./types').NPC[] = [
    {
      id: 'npc_1',
      name: 'Оксана Петрівна',
      role: 'Вчителька',
      avatarIcon: 'teacher',
      x: 200,
      y: 350,
      dialogue: [{ speaker: 'Вчителька', text: 'Будь уважним!' }],
      rewardPoints: 50
    }
  ];

  // Within 40px -> detected
  const near = findNearbyNPC(220, 350, npcs, 45);
  assert.equal(near?.id, 'npc_1');

  // Too far -> null
  const far = findNearbyNPC(300, 350, npcs, 45);
  assert.equal(far, null);
});

test('getDangerousPathProximity detects dangerous shortcut trails', () => {
  const dpaths: import('./types').DangerousPath[] = [
    {
      id: 'dp1',
      name: 'Зріз через траву',
      x1: 200,
      y1: 350,
      x2: 300,
      y2: 250,
      width: 30,
      leadsToHazardName: 'Міна Пелюстка',
      surface: 'dirt_trail'
    }
  ];

  const near = getDangerousPathProximity(220, 330, dpaths);
  assert.equal(near.isNearDangerTrail, true);
  assert.equal(near.targetHazard, 'Міна Пелюстка');

  const safe = getDangerousPathProximity(500, 500, dpaths);
  assert.equal(safe.isNearDangerTrail, false);
});

test('evaluateBadges unlocks achievements when thresholds are reached', () => {
  const stats: PlayerStats = {
    score: 2500,
    starsCollected: 9,
    quizzesAnswered: 4,
    quizzesCorrect: 4,
    tasksCompleted: 2,
    npcsTalked: 3,
    mistakesCount: 0,
    lives: 3,
    badges: []
  };

  const badges = evaluateBadges(stats, false);
  assert.ok(badges.includes('first_step'));
  assert.ok(badges.includes('sharp_eye'));
  assert.ok(badges.includes('expert_101'));
  assert.ok(badges.includes('safe_walker'));
  assert.ok(badges.includes('attentive_listener'));
  assert.ok(!badges.includes('master_safety')); // not yet all levels

  const finalBadges = evaluateBadges(stats, true);
  assert.ok(finalBadges.includes('master_safety'));
});
