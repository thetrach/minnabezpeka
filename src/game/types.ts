export type GameState = 
  | 'title' 
  | 'playing' 
  | 'paused' 
  | 'quiz' 
  | 'task' 
  | 'dialogue'
  | 'complete' 
  | 'gameover' 
  | 'certificate';

export type HazardType = 
  | 'petal_mine'            // ПФМ-1 "Пелюстка"
  | 'tripwire'              // Розтяжка з гранатою чи ОЗМ-72
  | 'antitank_mine'         // ТМ-62М
  | 'directional_mine'      // МОН-50 / МОН-90 міна направленої дії "ДО СУПРОТИВНИКА"
  | 'grenade'               // Граната (Ф-1 "лимонка" / РГД-5)
  | 'mortar_shell'          // Нерозірваний мінометний боєприпас (82-мм / 120-мм)
  | 'fpv_drone'             // ФВП дрон з бойовою частиною
  | 'rocket_debris'         // Залишки ракет (РСЗВ "Град", залишки двигуна/корпусу)
  | 'shahed_debris'         // Залишки БПЛА "Шахед-136" з нерозірваним БЧ
  | 'tank_shell'            // Танковий снаряд (125-мм)
  | 'rpg_rocket'            // Постріл від РПГ (граната ПГ-7В)
  | 'improvised_explosive'  // Саморобний вибуховий пристрій (СВП)
  | 'booby_trap_toy'        // Замаскована міна-пастка (іграшка / телефон / рюкзак)
  | 'destroyed_tech'        // Пошкоджена військова техніка
  | 'unexploded_ord';       // Нерозірваний снаряд/касета

export interface Hazard {
  id: string;
  type: HazardType;
  name: string;
  x: number;
  y: number;
  radius: number; // Collision danger radius
  warningRadius: number; // Detection / warning proximity radius
  description: string;
  educationalTip: string;
  iconType: 'skull' | 'bomb' | 'tripwire' | 'box' | 'tank' | 'drone' | 'rocket' | 'shell' | 'grenade' | 'mine_directional';
}

export interface DangerousPath {
  id: string;
  name: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  leadsToHazardName: string;
  surface: 'dirt_trail' | 'overgrown_grass' | 'cracked_rubble';
}

export interface WarningSign {
  id: string;
  x: number;
  y: number;
  type: 'official_mine_sign' | 'tape' | 'crossed_sticks' | 'danger_flag';
  text: string;
  tip: string;
}

export interface CollectibleStar {
  id: string;
  x: number;
  y: number;
  collected: boolean;
  type: 'star' | 'safety_scroll' | 'first_aid';
  label: string;
}

export interface SafePathSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  name?: string;
  surface: 'asphalt' | 'paved_trail' | 'wooden_bridge' | 'concrete_path';
}

export interface QuizQuestion {
  id: string;
  triggerX?: number;
  triggerY?: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  ruleTitle: string; // e.g., "Золоте правило 101"
  triggered?: boolean;
}

export interface NPCDialogueLine {
  speaker: string;
  text: string;
  importantTip?: string;
}

export interface NPC {
  id: string;
  name: string;
  role: string;
  avatarIcon: 
    | 'teacher' 
    | 'rescuer' 
    | 'forester' 
    | 'builder' 
    | 'friend' 
    | 'cat' 
    | 'squirrel' 
    | 'mother' 
    | 'dog_patron' 
    | 'medic' 
    | 'grandma';
  x: number;
  y: number;
  dialogue: NPCDialogueLine[];
  rewardPoints: number;
  spoken?: boolean;
}

export type TaskType = 'sequence_rules' | 'identify_signs' | 'call_101_dialogue';

export interface SequenceStep {
  id: string;
  order: number;
  text: string;
  icon: string;
}

export interface SignCard {
  id: string;
  title: string;
  isHazardSign: boolean;
  category: 'official' | 'improvised' | 'safe_item';
  description: string;
}

export interface DialogueNode {
  id: string;
  speaker: 'operator' | 'child';
  text: string;
  options?: {
    text: string;
    nextNodeId: string;
    isCorrect: boolean;
    feedback: string;
  }[];
}

export interface EndLevelTask {
  type: TaskType;
  title: string;
  subtitle: string;
  instruction: string;
  // Detailed hints for children
  hintDetails: {
    title: string;
    tips: string[];
    mnemonicRule: string;
    detailedExplanations?: {
      title: string;
      description: string;
      whyImportant: string;
    }[];
  };
  // For sequence_rules
  sequenceSteps?: SequenceStep[];
  // For identify_signs
  signs?: SignCard[];
  // For call_101_dialogue
  dialogueRoot?: DialogueNode;
  dialogueNodes?: Record<string, DialogueNode>;
}

export interface LevelConfig {
  id: number;
  title: string;
  locationName: string;
  description: string;
  theme: 
    | 'school_road' 
    | 'park_forest' 
    | 'neighborhood_home' 
    | 'rural_road' 
    | 'riverbank' 
    | 'strike_site' 
    | 'ruins_construction';
  worldWidth: number;
  worldHeight: number;
  spawnX: number;
  spawnY: number;
  targetX: number;
  targetY: number;
  targetName: string; // e.g., "Школа", "Рідний двір", "Зупинка транспорту"
  safePaths: SafePathSegment[];
  dangerousPaths: DangerousPath[];
  hazards: Hazard[];
  warningSigns: WarningSign[];
  npcs: NPC[];
  stars: CollectibleStar[];
  quizQuestions: QuizQuestion[];
  endTask: EndLevelTask;
  patronTip: string;
}

export interface PlayerStats {
  score: number;
  starsCollected: number;
  quizzesAnswered: number;
  quizzesCorrect: number;
  tasksCompleted: number;
  npcsTalked: number;
  mistakesCount: number;
  lives: number; // 3 lives
  badges: string[];
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}
