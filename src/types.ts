/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Task {
  id: string;
  title: string;
  points: number;
  category: "learn" | "coop" | "general";
  type: "individual" | "group";
  icon?: string;
  targetCount?: number;
}

export interface StudentTask extends Task {
  done: boolean;
  status?: "active" | "pending" | "approved" | "claimed";
  description?: string;
  dueDate?: string;
  isRepeatable?: boolean;
}

export interface ActiveGroupTask extends Task {
  participants: string[]; // Student IDs who completed it
  claimedBy: string[];   // Student IDs who claimed the points
}

export interface TimedTask {
  id: string;
  title: string;
  type: "individual" | "group";
  points: number;
  targetCount?: number;
  durationSeconds: number;
  remainingSeconds: number;
  isActive: boolean;
  startedAt: number | null; // Milliseconds timestamp
  completedBy: string[]; // Student IDs who completed it
  expired: boolean;
  timeMode?: "countdown" | "endTime";
  startTimeStr?: string;
  endTimeStr?: string;
}

export interface CustomFood {
  id: string;
  name: string;
  icon: string;
  cost: number;
  exp: number;
  happy: number;
  affinity: number;
  stamina: number;
  visible: boolean;
  reply: string;
}

export interface Food {
  name: string;
  cost: number;
  icon: string;
  exp: number;
  happy: number;
  affinity: number;
  stamina: number;
  reply: string;
}

export interface PersonalityStats {
  creativity: number;
  performance: number;
  wisdom: number;
  vitality: number;
  exploration: number;
  affinity: number;
  imagination: number;
  discipline: number;
  [key: string]: number;
}

export interface PetAttributes {
  magic: number;
  wisdom: number;
  kindness: number;
  courage: number;
  vitality: number;
  cooperation: number;
  aesthetic: number;
  [key: string]: number;
}

export interface Pet {
  level: number;
  exp: number;
  evolutionStage: number;
  growthType: "balanced" | string;
  personalityStats: PersonalityStats;
  attributes: PetAttributes;
  learningLog: Array<{
    time: string;
    course: string;
    note: string;
  }>;
}

export interface Student {
  id: string;
  name: string;
  points: number;
  coins: number;
  hasChosenEgg: boolean;
  lastFedTime?: number;
  lastHungerUpdate?: number;
  currentHunger?: number;
  lastLeveledUpAt?: number;
  lastRareItemAt?: number;
  stats?: {
    intelligence: number;
    creativity: number;
    energy: number;
    exploration: number;
    expression: number;
    cooperation: number;
    logic: number;
    knowledge: number;
    art: number;
    [key: string]: number;
  };
  element?: "star" | "forest" | "candy" | "magic" | "crystal" | "";
  petName: string;
  title: string;
  version?: number;
  updatedAt?: number;
  studentOwnedTitles?: string[];
  studentOwnedItems?: string[];
  completedTaskCount?: number;
  taskTypeStats?: {
    clean: number;
    reading: number;
    speaking: number;
    cooperation: number;
    manners: number;
    responsibility: number;
    [key: string]: number;
  };
  tasks: StudentTask[];
  ownedBackgrounds: string[];
  equippedBackground: string;
  feedLog: Array<{
    foodId: string;
    name: string;
    cost: number;
    exp: number;
    time: string;
  }>;
  petStats?: {
    happy: number;
    affinity: number;
    stamina: number;
  };
  pet?: Pet;
  petType?: string; // 選蛋後建立
  petLevel?: number; // 選蛋後建立
  slimeData?: any; // 選蛋後建立
  onlineStatus?: "online" | "offline" | string; // 學生加入教室時建立
  studentOwnedBackgrounds?: string[];
  studentOwnedDecorations?: string[];
  studentActiveBackground?: string;
  studentActiveDecorations?: Record<string, string>;
  petNameChangedCount?: number;
  hasRenamedPet?: boolean;
  renameCostPaid?: boolean;
  petRenameHistory?: string[];
  earnedAchievements?: EarnedAchievement[];
  foodHistory?: string[]; // Up to 20 recorded food types (水果, 蔬菜, 甜點, 主食, 肉類, 飲料, 特殊食物)
  drawWeight?: number; // Draw weight for fair drawing system
  studentBirthday?: string; // YYYY/MM/DD format
  studentZodiac?: string;   // calculated automatically
  birthdayBonusEnabled?: boolean; // whether birthday bonus is active
  todayWish?: {
    type: "food" | "learn" | "task" | "achievement";
    detail: string;
    completed: boolean;
  };
  studentDrawHistory?: {
    drawCount: number;  // 抽中次數 in current cycle/session
    lastDrawnAt?: string; // 最近抽中時間 (formatted string)
    totalDrawnCount?: number; // 累計抽中次數
  };
  completedTaskHistory?: Array<{
    id: string;
    title: string;
    points: number;
    completedAt: string;
  }>;
  slimePlayCountToday?: number;
  slimeLastPlayedAt?: string;
  slimeMoodIncreaseToday?: number;
  dailyPlayCount?: number;
  lastPlayTime?: string;
  todayMoodBonus?: number;
  currentExpression?: "normal" | "happy" | "very_happy" | "sad" | "tired" | "angry" | "excited" | "love" | "proud";
}

export interface EarnedAchievement {
  achievementId: string;
  awardedAt: string;
  teacherName: string;
}

export interface Achievement {
  achievementId: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: "common" | "rare" | "epic" | "legendary" | "mythic" | string;
  enabled: boolean;
  createdAt: string;
}

export interface CooperateGroup {
  id: string;
  name: string;
  members: string[]; // Student IDs
}

export interface TimerSettings {
  minutes: number;
  seconds: number;
}

export interface BackgroundGachaItem {
  id: string;
  name: string;
  category: "background" | "decoration" | "furniture" | "object" | "effect";
  type?: string;
  rarity: "common" | "rare" | "epic" | "legendary" | "basic"; // 普通, 稀有, 超稀有, 傳說, 基礎
  probability: number; // percentage, e.g. 20
  equippedPosition: string; // "背景" | "左上" | "右上" | "左下" | "右下" | "中央" | "地面" | "桌面" | "牆面" | "寵物旁"
  placement?: string;
  imageUrl?: string; // base64 if custom uploaded, otherwise empty
  presetSvgMarkup?: string; // fallback symbol/text or emoji (e.g., ❄️, 🌸, 🧸)
  enabled: boolean;
  isDefault?: boolean;
  isDeleted?: boolean;
}

export interface PointLog {
  timestamp: string;
  studentId: string;
  studentName: string;
  source: string;
  deltaPoints: number;
  totalAfter: number;
  operator: string;
}

export interface TeacherActionLog {
  id: string;
  timestamp: string;
  action: string;
  detail: string;
  operator: string;
}

export interface AppData {
  schemaVersion?: number; // Database schema version for safe updates
  mainTitle: string;
  students: Student[];
  taskTemplates: Task[];
  activeGroupTasks: ActiveGroupTask[];
  timedTasks: TimedTask[];
  customFoods: CustomFood[];
  groups: CooperateGroup[];
  notes: string;
  password?: string;
  timerSettings: TimerSettings;
  backgroundGachaItems?: BackgroundGachaItem[];
  achievements?: Achievement[];
  pointLogs?: PointLog[];
  teacherActionLogs?: TeacherActionLog[];
  lotterySpeed?: "instant" | "standard" | "animated";
  gachaHistoryList?: any[];
  classConstructionData?: any;
  classEventData?: any;
  classCollectionData?: any;
}

export interface BackgroundItem {
  name: string;
  rarity: "common" | "rare" | "legendary" | "mythic";
  colorClass: string;
  icon: string;
  css: string;
}
