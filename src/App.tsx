/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { AppData, Student, Task, TimedTask, Pet, StudentTask, EarnedAchievement } from "./types";
import { 
  defaultTasks, 
  backgroundDB, 
  computeStudentTitle, 
  generateDetailedSlimeSVG,
  defaultBackgroundGachaItems,
  defaultAchievements,
  awardPoints,
  appendPointLog,
  appendTeacherActionLog
} from "./utils";
import TeacherPanel from "./components/TeacherPanel";
import StudentModal from "./components/StudentModal";
import { ClassAddonsModal } from "./components/ClassAddonsModal";
import { getSafeClassAddonsData, handleAppDataInterception } from "./utils/classAddons";

import { 
  isFirebaseReady, 
  isFirebaseConfigured, 
  createClass, 
  joinClass, 
  saveStudentData, 
  listenAllStudents,
  saveClassSettings,
  listenClassSettings,
  loadClassroomByCode,
  joinExistingCloudClassroom,
  loadCloudClassroomByCode,
  verifyTeacherPasscode,
  restoreCloudClassroomData,
  saveTeacherPasscode,
  saveGroupToCloud,
  deleteGroupFromCloud
} from "./firebase";

class SafeRenderWrapper extends React.Component<{
  children: React.ReactNode;
  fallbackTitle: string;
  onReset: () => void;
}, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: any) {
    console.error("SafeRenderWrapper caught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="modal-backdrop flex items-center justify-center p-4 bg-slate-900/80 z-[9999]">
          <div className="game-box bg-white p-8 max-w-lg w-full flex flex-col items-center text-center shadow-2xl border-[6px] border-red-500 rounded-3xl">
            <div className="w-16 h-16 bg-red-50 border-4 border-red-500 text-red-500 rounded-2xl flex items-center justify-center mb-4 animate-bounce">
              <span className="text-3xl">⚠️</span>
            </div>
            <h3 className="text-4xl font-black text-red-600 mb-2">
              系統發生錯誤 ({this.props.fallbackTitle})
            </h3>
            <p className="text-sm font-bold text-gray-500 mb-4">
              此視窗在渲染或執行時發生了非預期錯誤，已自動啟動防崩潰安全機制。
            </p>
            <div className="w-full bg-red-50 border border-red-100 p-3 rounded-xl mb-6 text-left overflow-x-auto max-h-[150px]">
              <code className="text-xs font-mono font-bold text-red-800 break-all whitespace-pre-wrap">
                {this.state.error?.message || "不明錯誤"}
              </code>
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                this.props.onReset();
              }}
              className="btn-game bg-red-500 hover:bg-red-600 text-white px-8 py-3 text-lg font-black shadow-none border-2 border-slate-705 rounded-xl"
            >
              返回主頁
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function processHungerDecayForStudents(students: Student[], nowMs: number = Date.now()): { students: Student[]; updatedCount: number } {
  let updatedCount = 0;
  const updatedStudents = students.map((s) => {
    if (!s || !s.hasChosenEgg) {
      return s;
    }

    const currentStamina = s.petStats?.stamina !== undefined ? s.petStats.stamina : 50;
    const hunger = s.currentHunger !== undefined ? s.currentHunger : currentStamina;
    const lastUpdate = s.lastHungerUpdate;

    if (!lastUpdate) {
      // First time setting hunger update timestamp
      updatedCount++;
      return {
        ...s,
        lastHungerUpdate: nowMs,
        currentHunger: hunger,
        petStats: {
          ...(s.petStats || { happy: 60, affinity: 50, stamina: 50 }),
          stamina: hunger
        }
      };
    }

    const elapsedMs = nowMs - lastUpdate;
    const intervalMs = 30 * 60 * 1000; // 30 minutes

    if (elapsedMs >= intervalMs) {
      const intervals = Math.floor(elapsedMs / intervalMs);
      const decayAmount = intervals * 10;
      const nextHunger = Math.max(0, hunger - decayAmount);
      const nextUpdateTimestamp = lastUpdate + intervals * intervalMs;

      updatedCount++;
      return {
        ...s,
        lastHungerUpdate: nextUpdateTimestamp,
        currentHunger: nextHunger,
        petStats: {
          ...(s.petStats || { happy: 60, affinity: 50, stamina: 50 }),
          stamina: nextHunger
        }
      };
    }

    // Match hunger field with petStats if out of sync
    if (s.currentHunger !== hunger || s.petStats?.stamina !== hunger) {
      updatedCount++;
      return {
        ...s,
        currentHunger: hunger,
        petStats: {
          ...(s.petStats || { happy: 60, affinity: 50, stamina: 50 }),
          stamina: hunger
        }
      };
    }

    return s;
  });

  return { students: updatedStudents, updatedCount };
}

// --- DATA INTEGRITY ENHANCEMENTS AND RECOVERY MECHANISMS ---
export const mergeStudentStates = (s1: Student, s2: Student): Student => {
  const mergedTasksMap = new Map<string, StudentTask>();
  const t1 = Array.isArray(s1.tasks) ? s1.tasks : [];
  const t2 = Array.isArray(s2.tasks) ? s2.tasks : [];
  t1.forEach(t => t && t.id && mergedTasksMap.set(t.id, { ...t, done: !!t.done }));
  
  let newlyCompletedPointsDelta = 0;
  let newlyCompletedCoinsDelta = 0;

  t2.forEach(t => {
    if (t && t.id) {
      const existing = mergedTasksMap.get(t.id);
      if (existing) {
        if (t.done && !existing.done) {
          existing.done = true;
          if (t.status === "claimed" || t.status === "approved" || !t.status) {
            existing.status = t.status || "claimed";
            newlyCompletedPointsDelta += Number(t.points) || 0;
            newlyCompletedCoinsDelta += Number(t.points) || 0;
          }
        } else {
          existing.done = existing.done || !!t.done;
        }
      } else {
        mergedTasksMap.set(t.id, { ...t, done: !!t.done });
        if (t.done) {
          newlyCompletedPointsDelta += Number(t.points) || 0;
          newlyCompletedCoinsDelta += Number(t.points) || 0;
        }
      }
    }
  });

  const backgrounds = Array.from(new Set([
    ...(Array.isArray(s1.ownedBackgrounds) ? s1.ownedBackgrounds : []),
    ...(Array.isArray(s2.ownedBackgrounds) ? s2.ownedBackgrounds : []),
    ...(Array.isArray(s1.studentOwnedBackgrounds) ? s1.studentOwnedBackgrounds : []),
    ...(Array.isArray(s2.studentOwnedBackgrounds) ? s2.studentOwnedBackgrounds : []),
  ])).filter(Boolean) as string[];

  const decorations = Array.from(new Set([
    ...(Array.isArray(s1.studentOwnedDecorations) ? s1.studentOwnedDecorations : []),
    ...(Array.isArray(s2.studentOwnedDecorations) ? s2.studentOwnedDecorations : [])
  ])).filter(Boolean) as string[];

  const titles = Array.from(new Set([
    ...(Array.isArray(s1.studentOwnedTitles) ? s1.studentOwnedTitles : []),
    ...(Array.isArray(s2.studentOwnedTitles) ? s2.studentOwnedTitles : [])
  ])).filter(Boolean) as string[];

  const items = Array.from(new Set([
    ...(Array.isArray(s1.studentOwnedItems) ? s1.studentOwnedItems : []),
    ...(Array.isArray(s2.studentOwnedItems) ? s2.studentOwnedItems : [])
  ])).filter(Boolean) as string[];

  const achievementsMap = new Map<string, EarnedAchievement>();
  const a1 = Array.isArray(s1.earnedAchievements) ? s1.earnedAchievements : [];
  const a2 = Array.isArray(s2.earnedAchievements) ? s2.earnedAchievements : [];
  a1.forEach(a => a && a.achievementId && achievementsMap.set(a.achievementId, a));
  a2.forEach(a => a && a.achievementId && achievementsMap.set(a.achievementId, a));

  const pet1 = s1.pet;
  const pet2 = s2.pet;
  let mergedPet = pet1 || pet2;
  if (pet1 && pet2) {
    const level = Math.max(Number(pet1.level) || 1, Number(pet2.level) || 1);
    const exp = Math.max(Number(pet1.exp) || 0, Number(pet2.exp) || 0);
    mergedPet = {
      ...pet1,
      ...pet2,
      level,
      exp,
      personalityStats: {
        creativity: Math.max(pet1.personalityStats?.creativity || 0, pet2.personalityStats?.creativity || 0),
        performance: Math.max(pet1.personalityStats?.performance || 0, pet2.personalityStats?.performance || 0),
        wisdom: Math.max(pet1.personalityStats?.wisdom || 0, pet2.personalityStats?.wisdom || 0),
        vitality: Math.max(pet1.personalityStats?.vitality || 0, pet2.personalityStats?.vitality || 0),
        exploration: Math.max(pet1.personalityStats?.exploration || 0, pet2.personalityStats?.exploration || 0),
        affinity: Math.max(pet1.personalityStats?.affinity || 0, pet2.personalityStats?.affinity || 0),
        imagination: Math.max(pet1.personalityStats?.imagination || 0, pet2.personalityStats?.imagination || 0),
        discipline: Math.max(pet1.personalityStats?.discipline || 0, pet2.personalityStats?.discipline || 0)
      },
      attributes: {
        magic: Math.max(pet1.attributes?.magic || 0, pet2.attributes?.magic || 0),
        wisdom: Math.max(pet1.attributes?.wisdom || 0, pet2.attributes?.wisdom || 0),
        kindness: Math.max(pet1.attributes?.kindness || 0, pet2.attributes?.kindness || 0),
        courage: Math.max(pet1.attributes?.courage || 0, pet2.attributes?.courage || 0),
        vitality: Math.max(pet1.attributes?.vitality || 0, pet2.attributes?.vitality || 0),
        cooperation: Math.max(pet1.attributes?.cooperation || 0, pet2.attributes?.cooperation || 0),
        aesthetic: Math.max(pet1.attributes?.aesthetic || 0, pet2.attributes?.aesthetic || 0)
      },
      learningLog: [...(Array.isArray(pet1.learningLog) ? pet1.learningLog : []), ...(Array.isArray(pet2.learningLog) ? pet2.learningLog : [])].slice(0, 50)
    };
  }

  const hasChosenEgg = s1.hasChosenEgg || s2.hasChosenEgg;
  const petName = s1.petName && s1.petName !== `${s1.name}的史萊姆` ? s1.petName : (s2.petName || `${s1.name}的史萊姆`);

  // Conflict resolution for points & coins
  let points = Math.max(Number(s1.points) || 0, Number(s2.points) || 0);
  let coins = Math.max(Number(s1.coins) || 0, Number(s2.coins) || 0);
  
  if (newlyCompletedPointsDelta > 0) {
    points += newlyCompletedPointsDelta;
    coins += newlyCompletedCoinsDelta;
  }

  // Conflict resolution for metadata
  const highestVersion = Math.max(Number(s1.version) || 0, Number(s2.version) || 0);
  const newestTimestamp = Math.max(Number(s1.updatedAt) || 0, Number(s2.updatedAt) || 0, Date.now());

  // Merge stats with safe fallback values
  const stats1: any = s1.stats || {};
  const stats2: any = s2.stats || {};
  const petStats1: any = s1.pet?.personalityStats || {};
  const petStats2: any = s2.pet?.personalityStats || {};
  const mergedStats = {
    intelligence: Math.max(Number(stats1.intelligence) || 0, Number(stats2.intelligence) || 0, Number(petStats1.wisdom) || 0, Number(petStats2.wisdom) || 0),
    creativity: Math.max(Number(stats1.creativity) || 0, Number(stats2.creativity) || 0, Number(petStats1.creativity) || 0, Number(petStats2.creativity) || 0),
    energy: Math.max(Number(stats1.energy) || 0, Number(stats2.energy) || 0, Number(petStats1.vitality) || 0, Number(petStats2.vitality) || 0),
    exploration: Math.max(Number(stats1.exploration) || 0, Number(stats2.exploration) || 0, Number(petStats1.exploration) || 0, Number(petStats2.exploration) || 0),
    expression: Math.max(Number(stats1.expression) || 0, Number(stats2.expression) || 0, Number(petStats1.expression) || 0, Number(petStats2.expression) || 0),
    cooperation: Math.max(Number(stats1.cooperation) || 0, Number(stats2.cooperation) || 0, Number(petStats1.cooperation) || 0, Number(petStats2.cooperation) || 0, Number(s1.taskTypeStats?.cooperation) || 0, Number(s2.taskTypeStats?.cooperation) || 0),
    logic: Math.max(Number(stats1.logic) || 0, Number(stats2.logic) || 0, Number(petStats1.logic) || 0, Number(petStats2.logic) || 0),
    knowledge: Math.max(Number(stats1.knowledge) || 0, Number(stats2.knowledge) || 0, Number(petStats1.knowledge) || 0, Number(petStats2.knowledge) || 0),
    art: Math.max(Number(stats1.art) || 0, Number(stats2.art) || 0, Number(petStats1.art) || 0, Number(petStats2.art) || 0)
  };

  const newestS = newestTimestamp === s2.updatedAt ? s2 : s1;
  const currentHunger = newestS.currentHunger !== undefined ? newestS.currentHunger : (s1.currentHunger !== undefined ? s1.currentHunger : s2.currentHunger);
  const lastFedTime = newestS.lastFedTime !== undefined ? newestS.lastFedTime : (s1.lastFedTime !== undefined ? s1.lastFedTime : s2.lastFedTime);
  const lastHungerUpdate = newestS.lastHungerUpdate !== undefined ? newestS.lastHungerUpdate : (s1.lastHungerUpdate !== undefined ? s1.lastHungerUpdate : s2.lastHungerUpdate);
  const lastLeveledUpAt = newestS.lastLeveledUpAt !== undefined ? newestS.lastLeveledUpAt : (s1.lastLeveledUpAt !== undefined ? s1.lastLeveledUpAt : s2.lastLeveledUpAt);
  const lastRareItemAt = newestS.lastRareItemAt !== undefined ? newestS.lastRareItemAt : (s1.lastRareItemAt !== undefined ? s1.lastRareItemAt : s2.lastRareItemAt);

  return {
    ...s1,
    ...s2,
    points,
    coins,
    hasChosenEgg,
    petName,
    completedTaskCount: Math.max(Number(s1.completedTaskCount) || 0, Number(s2.completedTaskCount) || 0),
    tasks: Array.from(mergedTasksMap.values()),
    ownedBackgrounds: backgrounds,
    studentOwnedBackgrounds: backgrounds,
    studentOwnedDecorations: decorations,
    studentOwnedTitles: titles,
    studentOwnedItems: items,
    earnedAchievements: Array.from(achievementsMap.values()),
    feedLog: [...(Array.isArray(s1.feedLog) ? s1.feedLog : []), ...(Array.isArray(s2.feedLog) ? s2.feedLog : [])].slice(0, 50),
    version: highestVersion,
    updatedAt: newestTimestamp,
    pet: mergedPet,
    stats: mergedStats,
    lastFedTime,
    lastHungerUpdate,
    currentHunger,
    lastLeveledUpAt,
    lastRareItemAt
  };
};

export const getAllLocalBackupStudents = (): Student[] => {
  const backupKeys = [
    "class_quest_ultimate",
    "classQuestData",
    "class_slime_data",
    "studentData",
    "students",
    "classData"
  ];
  const allBackupStudentsMap = new Map<string, Student>();

  backupKeys.forEach((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        let studentList: any[] = [];
        if (parsed) {
          if (Array.isArray(parsed)) {
            studentList = parsed;
          } else if (parsed.students && Array.isArray(parsed.students)) {
            studentList = parsed.students;
          }
        }
        studentList.forEach((s: any) => {
          if (s && s.id) {
            const cleanHistory = Number(s.completedTaskCount || 0);
            const cleanTypeStats = s.taskTypeStats || { clean: 0, reading: 0, speaking: 0, cooperation: 0, manners: 0, responsibility: 0 };
            
            // Unify alternative task fields if any
            let sTasks = Array.isArray(s.tasks) ? s.tasks : [];
            const altTasks = s.personalTasks || s.taskList || s.activeTasks || [];
            if (Array.isArray(altTasks) && altTasks.length > 0) {
              const taskIds = new Set(sTasks.map((t: any) => t.id));
              altTasks.forEach((at: any) => {
                if (at && at.id && !taskIds.has(at.id)) {
                  sTasks.push({ ...at, done: !!at.done });
                }
              });
            }

            const studentObj: Student = {
              ...s,
              tasks: sTasks,
              ownedBackgrounds: Array.isArray(s.ownedBackgrounds) ? s.ownedBackgrounds : [],
              feedLog: Array.isArray(s.feedLog) ? s.feedLog : [],
              points: Number(s.points) || 0,
              hasChosenEgg: !!s.hasChosenEgg,
              completedTaskCount: cleanHistory,
              taskTypeStats: cleanTypeStats,
              studentOwnedBackgrounds: Array.isArray(s.studentOwnedBackgrounds) ? s.studentOwnedBackgrounds : [],
              studentOwnedDecorations: Array.isArray(s.studentOwnedDecorations) ? s.studentOwnedDecorations : [],
              petNameChangedCount: Number(s.petNameChangedCount || 0),
            };

            const existing = allBackupStudentsMap.get(s.id);
            if (existing) {
              allBackupStudentsMap.set(s.id, mergeStudentStates(existing, studentObj));
            } else {
              allBackupStudentsMap.set(s.id, studentObj);
            }
          }
        });
      }
    } catch (e) {
      console.warn(`getAllLocalBackupStudents attempted reading "${key}" failed`, e);
    }
  });
  return Array.from(allBackupStudentsMap.values());
};

export default function App() {
  console.log("App Render");
  // Global React state containing full persistent records
  const [rawAppData, setRawAppData] = useState<AppData>({
    mainTitle: "🏫 三甲寶貝任務列表",
    students: [],
    taskTemplates: defaultTasks,
    activeGroupTasks: defaultTasks
      .filter((t) => t.type === "group")
      .map((t) => ({ ...t, participants: [], claimedBy: [] })),
    timedTasks: [],
    customFoods: [],
    groups: [],
    notes: "老師可以在這裡輸入今日叮嚀、作業或提醒事項...",
    password: "0301",
    
    bossName: "🗑️ 垃圾怪獸",
    bossHp: 500,
    bossMaxHp: 500,
    
    timerSettings: { minutes: 5, seconds: 0 },
    backgroundGachaItems: defaultBackgroundGachaItems
  });

  const appData = rawAppData;

  const setAppData: React.Dispatch<React.SetStateAction<AppData>> = (value) => {
    setRawAppData((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      return handleAppDataInterception(prev, next);
    });
  };


  // 💾 自動存檔核心實作 (autoSave)
  const autoSave = (customState?: AppData) => {
    const stateToSave = customState || appData;
    try {
      localStorage.setItem("class_quest_ultimate", JSON.stringify(stateToSave));
      localStorage.setItem("classQuestData", JSON.stringify(stateToSave));
    } catch (e: any) {
      console.error("💾 LocalStorage autosave failed:", e);
    }

    if (isOnlineMode && classCode && isFirebaseReady) {
      // 1. 同步雲端班級設定檔 (確保沒有任何欄位是 undefined 或是缺少必填欄位)
      const settings = {
        mainTitle: stateToSave.mainTitle || "",
        password: stateToSave.password || "0301",
        notes: stateToSave.notes || "",
        timerSettings: stateToSave.timerSettings || { minutes: 5, seconds: 0 },
        taskTemplates: stateToSave.taskTemplates || [],
        customFoods: stateToSave.customFoods || [],
        activeGroupTasks: stateToSave.activeGroupTasks || [],
        timedTasks: (stateToSave.timedTasks || []).map((t) => ({ ...t, remainingSeconds: 0 })),
        achievements: stateToSave.achievements || [],
        groups: stateToSave.groups || [],
        backgroundGachaItems: stateToSave.backgroundGachaItems || [],
        pointLogs: stateToSave.pointLogs || [],
        teacherActionLogs: stateToSave.teacherActionLogs || [],
        lotterySpeed: stateToSave.lotterySpeed || "instant",
        gachaHistoryList: stateToSave.gachaHistoryList || [],
        classConstructionData: stateToSave.classConstructionData || null,
        classEventData: stateToSave.classEventData || null,
        classCollectionData: stateToSave.classCollectionData || null,
      };
      
      const cleanedSettings = cleanData(settings);
      const currentSettingsStr = getCanonicalString(cleanedSettings);
      
      if (lastCloudSettingsRef.current !== currentSettingsStr) {
        lastCloudSettingsRef.current = currentSettingsStr;
        saveClassSettings(classCode, cleanedSettings)
          .then(() => console.log("💾 雲端教室設定已成功自動存檔！"))
          .catch((err) => console.error("💾 雲端同步設定失敗:", err));
      }

      // 2. 同步個別小組獨立路徑 (classes/{classCode}/groups/{groupId})
      const currentGroupsStr = getCanonicalString(cleanData(stateToSave.groups || []));
      if (lastCloudGroupsRef.current !== currentGroupsStr) {
        lastCloudGroupsRef.current = currentGroupsStr;
        const prevGroups = appData.groups || [];
        const nextGroups = stateToSave.groups || [];
        const deletedGroups = prevGroups.filter(pg => !nextGroups.some(ng => ng.id === pg.id));
        deletedGroups.forEach(dg => {
          deleteGroupFromCloud(classCode, dg.id);
        });
        nextGroups.forEach(ng => {
          saveGroupToCloud(classCode, ng);
        });
      }
    }
  };

  // Modal active visibility states
  const [teacherLoginShow, setTeacherLoginShow] = useState(false);
  const [teacherPanelShow, setTeacherPanelShow] = useState(false);
  const [studentModalId, setStudentModalId] = useState<string | null>(null);
  const [eggSelectionStudentId, setEggSelectionStudentId] = useState<string | null>(null);
  const [showMainTimedTasksPanel, setShowMainTimedTasksPanel] = useState(false);
  const [showClassAddonsModal, setShowClassAddonsModal] = useState(false);

  // 🌐 雲端線上同步狀態管理物件
  const [classCode, setClassCode] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("classCode")?.toUpperCase() || localStorage.getItem("active_class_code") || "";
  });
  const [className, setClassName] = useState<string>(() => {
    return localStorage.getItem("active_class_name") || "";
  });
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const initialCode = params.get("classCode")?.toUpperCase() || localStorage.getItem("active_class_code") || "";
    return initialCode ? localStorage.getItem(`student_id_${initialCode}`) : null;
  });
  const [isOnlineMode, setIsOnlineMode] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    const initialCode = params.get("classCode")?.toUpperCase() || localStorage.getItem("active_class_code") || "";
    return !!initialCode;
  });

  const [showCloudSyncPanelOnMain, setShowCloudSyncPanelOnMain] = useState<boolean>(() => {
    return localStorage.getItem("showCloudSyncPanelOnMain") !== "false";
  });

  const [footerCollapsed, setFooterCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("footer_collapsed") === "true";
  });

  const toggleFooterCollapsed = () => {
    setFooterCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("footer_collapsed", String(next));
      return next;
    });
  };

  // 線上同步相關對話框控制
  const [showTeacherCreateModal, setShowTeacherCreateModal] = useState(false);
  const [showStudentJoinModal, setShowStudentJoinModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const [createClassNameInput, setCreateClassNameInput] = useState("");
  const [teacherModalMode, setTeacherModalMode] = useState<"create" | "join">("create");
  const [existingClassCodeInput, setExistingClassCodeInput] = useState("");
  const [existingTeacherPasscodeInput, setExistingTeacherPasscodeInput] = useState("");
  const [joinClassCodeInput, setJoinClassCodeInput] = useState("");
  const [joinStudentNameInput, setJoinStudentNameInput] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // 用於在比較 JSON 字串時排除欄位順序與 undefined 產生的假性差異，防止 Firebase 同步無限迴圈
  const getCanonicalString = (obj: any): string => {
    const normalizeValue = (val: any): any => {
      if (val === undefined || val === null) return null;
      if (Array.isArray(val)) {
        return val.map(normalizeValue);
      }
      if (typeof val === "object") {
        const sortedKeys = Object.keys(val).sort();
        const res: any = {};
        for (const k of sortedKeys) {
          if (val[k] !== undefined) {
            res[k] = normalizeValue(val[k]);
          }
        }
        return res;
      }
      return val;
    };
    return JSON.stringify(normalizeValue(obj));
  };

  const cleanData = (obj: any): any => {
    if (obj === undefined) return null;
    if (obj === null) return null;
    if (Array.isArray(obj)) {
      return obj.map(cleanData);
    }
    if (typeof obj === "object") {
      const res: any = {};
      for (const key of Object.keys(obj)) {
        const v = obj[key];
        if (v !== undefined) {
          res[key] = cleanData(v);
        }
      }
      return res;
    }
    return obj;
  };

  const cleanStudentForSync = (student: Student): any => {
    if (!student) return null;
    const { onlineStatus, ...rest } = student;
    return rest;
  };

  // 用於暫存最後一次從雲端載入的資料，以防本地更新引發重複同步的無限迴圈
  const lastCloudStateRef = React.useRef<Record<string, string>>({});
  const lastCloudSettingsRef = React.useRef<string>("");
  const lastCloudGroupsRef = React.useRef<string>("");

  // Administrative PIN verification input
  const [pinInput, setPinInput] = useState("");

  // Countdown timer states
  const [timerSecs, setTimerSecs] = useState(300);
  const [timerRunning, setTimerRunning] = useState(false);

  // System local clocks
  const [currentDateString, setCurrentDateString] = useState("");
  const [currentTimeString, setCurrentTimeString] = useState("");

  // Alert/Confirmation states
  const [dialogConfig, setDialogConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "alert" | "confirm";
    onConfirm?: () => void;
    titleColor?: string;
  } | null>(null);

  // Floating score ticks list
  const [floatingTexts, setFloatingTexts] = useState<Array<{
    id: string;
    x: number;
    y: number;
    text: string;
    styleType: "plus" | "minus" | "save";
  }>>([]);

  const restoreMissingStudents = () => {
    // Collect all backups
    const backups = getAllLocalBackupStudents();
    setAppData((prev) => {
      const allStudentKeys = new Set<string>();
      prev.students.forEach(s => s && s.id && allStudentKeys.add(s.id));
      backups.forEach(s => s && s.id && allStudentKeys.add(s.id));

      const resolvedStudents = Array.from(allStudentKeys).map((studentId) => {
        const memoryS = prev.students.find(x => x.id === studentId);
        const backupS = backups.find(x => x.id === studentId);
        let merged = memoryS || backupS;
        if (memoryS && backupS) {
          merged = mergeStudentStates(memoryS, backupS);
        }
        return merged!;
      });

      resolvedStudents.sort((a, b) => a.id.localeCompare(b.id));
      
      setTimeout(() => {
        setDialogConfig({
          show: true,
          title: "🔄 手動資料修復完成",
          message: `「四重本地與雲端大還原」已成功運算完成！共掃描 ${allStudentKeys.size} 名學生，補回/融合了所有最新任務、點數、裝扮與成就資料。`,
          type: "alert",
          titleColor: "text-green-600"
        });
      }, 100);

      const updatedState = {
        ...prev,
        students: resolvedStudents
      };
      
      // Save newly restored data out
      try {
        localStorage.setItem("class_quest_ultimate", JSON.stringify(updatedState));
        localStorage.setItem("classQuestData", JSON.stringify(updatedState));
      } catch (err) {
        console.error("Failed to persist hand restoration backup", err);
      }

      return updatedState;
    });
  };

  useEffect(() => {
    (window as any).restoreMissingStudents = restoreMissingStudents;
    return () => {
      delete (window as any).restoreMissingStudents;
    };
  }, []);

  const handleCloseMainTimedTasks = () => {
    console.log("限時任務視窗關閉");
    setShowMainTimedTasksPanel(false);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showMainTimedTasksPanel) {
        handleCloseMainTimedTasks();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showMainTimedTasksPanel]);

  // Lucky Draw (Random Student Picker) states
  const [luckyDrawOpen, setLuckyDrawOpen] = useState(false);
  const [luckyDrawMode, setLuckyDrawMode] = useState<"single" | "group">("single");
  const [groupSize, setGroupSize] = useState<number>(4);
  const [customGroupSize, setCustomGroupSize] = useState<string>("");
  const [generatedGroups, setGeneratedGroups] = useState<Array<{ name: string; members: string[] }>>([]);
  const [luckyDrawActive, setLuckyDrawActive] = useState(false);
  const [luckyDrawName, setLuckyDrawName] = useState("");
  const [luckyDrawWinner, setLuckyDrawWinner] = useState<Student | null>(null);

  // 🎲 重新抽小組/分組與同步
  const generateLuckyGroups = () => {
    const sizeToUse = customGroupSize ? parseInt(customGroupSize) || 4 : groupSize;
    if (appData.students.length === 0) {
      setDialogConfig({
        show: true,
        title: "⚠️ 目前尚無學生名單",
        message: "班上目前還沒有任何登錄的寶貝喔！\n請先開啟教師主控台新增學員名單。",
        type: "alert"
      });
      return;
    }
    if (sizeToUse < 1) {
      setDialogConfig({
        show: true,
        title: "⚠️ 輸入錯誤",
        message: "每組人數必須大於 0 人！",
        type: "alert"
      });
      return;
    }

    setLuckyDrawActive(true);
    setLuckyDrawName("⚡量子魔法力正在聚能分組中...");

    setTimeout(() => {
      // 1. Shuffle students randomly
      const shuffle = (array: Student[]) => {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      };

      const shuffled = shuffle(appData.students);
      const n = shuffled.length;
      
      // Calculate balanced groups
      const numGroups = Math.max(1, Math.round(n / sizeToUse));
      const groupsList: Array<{ id: string; name: string; members: string[] }> = Array.from(
        { length: numGroups },
        (_, i) => ({
          id: `grp_${Date.now()}_${i}`,
          name: `第 ${i + 1} 組`,
          members: []
        })
      );

      for (let i = 0; i < n; i++) {
        groupsList[i % numGroups].members.push(shuffled[i].id);
      }

      // Filter out empty groups if any
      const finalGroups = groupsList.filter(g => g.members.length > 0);

      // Save new group assignments into state to automatically propagate to DB
      setAppData((prev) => ({
        ...prev,
        groups: finalGroups
      }));

      // Set display lists
      const disp = finalGroups.map(g => {
        const names = g.members.map(mid => appData.students.find(s => s.id === mid)?.name || "").filter(Boolean);
        return {
          name: g.name,
          members: names
        };
      });

      setGeneratedGroups(disp);
      setLuckyDrawActive(false);
      setLuckyDrawName(`分組分配完成！`);

      // Celebrate
      confetti({ particleCount: 150, spread: 130, origin: { y: 0.4 } });
    }, 1500); // 1.5 seconds assembling animation
  };

  const copyGroupResults = () => {
    const text = generatedGroups.map(g => `${g.name}：\n${g.members.map(name => ` - ${name}`).join("\n")}`).join("\n\n");
    navigator.clipboard.writeText(text)
      .then(() => alert("📋 已將分組結果成功複製到剪貼簿！"))
      .catch((err) => console.error("複製失敗:", err));
  };

  const [luckyGroupWinner, setLuckyGroupWinner] = useState<{ id: string; name: string; members: string[] } | null>(null);

  // Random existing group drawer
  const startGroupLuckyDraw = () => {
    if (!appData.groups || appData.groups.length === 0) {
      setDialogConfig({
        show: true,
        title: "⚠️ 目前尚無小組名單",
        message: "班上目前還沒有任何自訂小組喔！\n請先前往老師後台「學生與小組管理」底下新增各組別及名單。",
        type: "alert"
      });
      return;
    }

    setLuckyDrawActive(true);
    setLuckyGroupWinner(null);
    setLuckyDrawName("魔法小組召喚中...");

    const finalIndex = Math.floor(Math.random() * appData.groups.length);
    const finalGroup = appData.groups[finalIndex];
    const memberNames = finalGroup.members
      .map(mid => appData.students.find(s => s.id === mid)?.name || "")
      .filter(Boolean);

    const speed = appData.lotterySpeed || "instant";

    if (speed === "instant") {
      setLuckyGroupWinner({
        id: finalGroup.id,
        name: finalGroup.name,
        members: memberNames
      });
      setLuckyDrawName(finalGroup.name);
      setLuckyDrawActive(false);
      confetti({ particleCount: 120, spread: 100, origin: { y: 0.4 } });
      return;
    }

    let counter = 0;
    const maxTumbles = speed === "standard" ? 5 : 15;
    const intervalTime = speed === "standard" ? 50 : 100;
    const modifier = speed === "standard" ? 10 : 18;

    const tumble = () => {
      const randomIndex = Math.floor(Math.random() * appData.groups.length);
      const tempGroup = appData.groups[randomIndex];
      setLuckyDrawName(tempGroup.name);

      counter++;
      if (counter < maxTumbles) {
        setTimeout(tumble, intervalTime + (counter * modifier));
      } else {
        setLuckyGroupWinner({
          id: finalGroup.id,
          name: finalGroup.name,
          members: memberNames
        });
        setLuckyDrawName(finalGroup.name);
        setLuckyDrawActive(false);

        // Huge splash animation!
        confetti({ particleCount: 120, spread: 100, origin: { y: 0.4 } });
      }
    };

    setTimeout(tumble, speed === "standard" ? 50 : 200);
  };

  // Cinematic Random Pick Summoner using fair drawing weights
  const startLuckyDraw = () => {
    if (appData.students.length === 0) {
      setDialogConfig({
        show: true,
        title: "⚠️ 目前尚無學生名單",
        message: "班上目前還沒有任何登錄的寶貝喔！\n請先點選右上角齒輪，輸入教師密碼（0301）新增名單。",
        type: "alert"
      });
      return;
    }

    setLuckyDrawActive(true);
    setLuckyDrawWinner(null);
    setLuckyDrawName("召喚儀式開始...");

    // Weighted selection logic
    const pickWeightedWinner = (): Student => {
      const totalWeight = appData.students.reduce((sum, s) => sum + (typeof s.drawWeight === "number" ? s.drawWeight : 10), 0);
      if (totalWeight <= 0) {
        return appData.students[Math.floor(Math.random() * appData.students.length)];
      }

      let randomVal = Math.random() * totalWeight;
      for (const s of appData.students) {
        const w = typeof s.drawWeight === "number" ? s.drawWeight : 10;
        if (randomVal < w) {
          return s;
        }
        randomVal -= w;
      }
      return appData.students[appData.students.length - 1];
    };

    const finalWinner = pickWeightedWinner();
    const speed = appData.lotterySpeed || "instant";

    const saveChanges = (winner: Student) => {
      setAppData((prev) => {
        const updatedStudents = prev.students.map((s) => {
          const h = s.studentDrawHistory || { drawCount: 0, lastDrawnAt: "", totalDrawnCount: 0 };
          if (s.id === winner.id) {
            return {
              ...s,
              drawWeight: 1, // recently drawn weight dips to 1
              studentDrawHistory: {
                drawCount: (h.drawCount || 0) + 1,
                totalDrawnCount: (h.totalDrawnCount || 0) + 1,
                lastDrawnAt: new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })
              }
            };
          } else {
            return {
              ...s,
              drawWeight: Math.min(30, (typeof s.drawWeight === "number" ? s.drawWeight : 10) + 1), // slowly increase other weights
              studentDrawHistory: {
                drawCount: h.drawCount || 0,
                totalDrawnCount: h.totalDrawnCount || 0,
                lastDrawnAt: h.lastDrawnAt || ""
              }
            };
          }
        });

        const nextData = { ...prev, students: updatedStudents };
        setTimeout(() => autoSave(nextData), 50);
        return nextData;
      });
    };

    if (speed === "instant") {
      setLuckyDrawWinner(finalWinner);
      setLuckyDrawName(finalWinner.name);
      setLuckyDrawActive(false);
      confetti({ particleCount: 150, spread: 130, origin: { y: 0.4 } });
      saveChanges(finalWinner);
      return;
    }

    let counter = 0;
    const maxTumbles = speed === "standard" ? 5 : 15;
    const intervalTime = speed === "standard" ? 50 : 100;
    const modifier = speed === "standard" ? 10 : 18;

    const tumble = () => {
      const randomIndex = Math.floor(Math.random() * appData.students.length);
      const tempStudent = appData.students[randomIndex];
      setLuckyDrawName(tempStudent.name);

      counter++;
      if (counter < maxTumbles) {
        setTimeout(tumble, intervalTime + (counter * modifier));
      } else {
        setLuckyDrawWinner(finalWinner);
        setLuckyDrawName(finalWinner.name);
        setLuckyDrawActive(false);

        // Huge splash animation!
        confetti({ particleCount: 150, spread: 130, origin: { y: 0.4 } });

        // Save updated weights & draw statistics
        saveChanges(finalWinner);
      }
    };

    setTimeout(tumble, speed === "standard" ? 50 : 200);
  };

  // Load user database on boot (with robust recovery for previous schemas)
  useEffect(() => {
    const backupKeys = [
      "class_quest_ultimate",
      "classQuestData",
      "class_slime_data",
      "studentData",
      "students",
      "classData"
    ];

    let loadedObj: any = null;
    for (const key of backupKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            if (Array.isArray(parsed)) {
              loadedObj = { students: parsed };
            } else {
              loadedObj = parsed;
            }
            console.log(`Successfully restored previous records from localStorage key: "${key}"!`);
            break;
          }
        }
      } catch (e) {
        console.warn(`Attempt to read key: "${key}" failed but safely bypassed.`, e);
      }
    }

    if (loadedObj) {
      // Restore states with defensive schema completion
      setAppData((prev) => {
        const merged: AppData = {
          mainTitle: loadedObj.mainTitle || prev.mainTitle || "🏫 三甲寶貝任務列表",
          students: Array.isArray(loadedObj.students) ? loadedObj.students : prev.students,
          taskTemplates: Array.isArray(loadedObj.taskTemplates) && loadedObj.taskTemplates.length > 0 
            ? loadedObj.taskTemplates 
            : prev.taskTemplates,
          activeGroupTasks: Array.isArray(loadedObj.activeGroupTasks) ? loadedObj.activeGroupTasks : prev.activeGroupTasks,
          timedTasks: Array.isArray(loadedObj.timedTasks) ? loadedObj.timedTasks : prev.timedTasks,
          customFoods: Array.isArray(loadedObj.customFoods) ? loadedObj.customFoods : prev.customFoods,
          groups: Array.isArray(loadedObj.groups) ? loadedObj.groups : prev.groups,
          notes: typeof loadedObj.notes === "string" ? loadedObj.notes : prev.notes,
          password: loadedObj.password || prev.password || "0301",
          timerSettings: loadedObj.timerSettings && typeof loadedObj.timerSettings === "object"
            ? loadedObj.timerSettings
            : prev.timerSettings,
          backgroundGachaItems: Array.isArray(loadedObj.backgroundGachaItems) && loadedObj.backgroundGachaItems.length > 0   
            ? loadedObj.backgroundGachaItems 
            : prev.backgroundGachaItems,
          ...getSafeClassAddonsData(loadedObj)
        };

        // Guarantee list alignments & sub-properties inside students
        merged.students = merged.students.filter(Boolean).map((s) => {
          const cleanHistory = Number(s.completedTaskCount || 0);
          const cleanTypeStats = s.taskTypeStats || { clean: 0, reading: 0, speaking: 0, cooperation: 0, manners: 0, responsibility: 0 };
          
          const pStats: any = s.pet?.personalityStats || {};
          const existingStats: any = s.stats || {};
          const cleanStats = {
            intelligence: Number(existingStats.intelligence !== undefined ? existingStats.intelligence : (pStats.wisdom || 0)),
            creativity: Number(existingStats.creativity !== undefined ? existingStats.creativity : (pStats.creativity || 0)),
            energy: Number(existingStats.energy !== undefined ? existingStats.energy : (pStats.vitality || pStats.vocalSense || 0)),
            exploration: Number(existingStats.exploration !== undefined ? existingStats.exploration : (pStats.exploration || 0)),
            expression: Number(existingStats.expression !== undefined ? existingStats.expression : (pStats.expression || pStats.performance || 0)),
            cooperation: Number(existingStats.cooperation !== undefined ? existingStats.cooperation : (pStats.cooperation || (s.taskTypeStats && (s.taskTypeStats as any).cooperation) || 0)),
            logic: Number(existingStats.logic !== undefined ? existingStats.logic : (pStats.logic || pStats.discipline || 0)),
            knowledge: Number(existingStats.knowledge !== undefined ? existingStats.knowledge : (pStats.knowledge || 0)),
            art: Number(existingStats.art !== undefined ? existingStats.art : (pStats.art || pStats.artSense || pStats.imagination || 0))
          };

          return {
            ...s,
            tasks: Array.isArray(s.tasks) ? s.tasks : [],
            ownedBackgrounds: Array.isArray(s.ownedBackgrounds) ? s.ownedBackgrounds : [],
            equippedBackground: s.equippedBackground || "",
            feedLog: Array.isArray(s.feedLog) ? s.feedLog : [],
            points: Number(s.points) || 0,
            hasChosenEgg: !!s.hasChosenEgg,
            title: (!s.title || s.title === "等待發光中") ? computeStudentTitle(s) : s.title,
            completedTaskCount: cleanHistory,
            taskTypeStats: cleanTypeStats,
            studentOwnedBackgrounds: Array.isArray(s.studentOwnedBackgrounds) ? s.studentOwnedBackgrounds : [],
            studentOwnedDecorations: Array.isArray(s.studentOwnedDecorations) ? s.studentOwnedDecorations : [],
            studentActiveBackground: s.studentActiveBackground || "",
            studentActiveDecorations: s.studentActiveDecorations || {},
            petNameChangedCount: Number(s.petNameChangedCount || 0),
            stats: cleanStats,
            petStats: s.petStats || { happy: 60, affinity: 50, stamina: s.currentHunger !== undefined ? s.currentHunger : 50 },
            lastFedTime: s.lastFedTime,
            lastHungerUpdate: s.lastHungerUpdate,
            currentHunger: s.currentHunger !== undefined ? s.currentHunger : (s.petStats?.stamina !== undefined ? s.petStats.stamina : 50),
            pet: s.pet ? {
              ...s.pet,
              level: Number(s.pet.level) || 1,
              exp: Number(s.pet.exp) || 0,
              personalityStats: s.pet.personalityStats || { creativity: 0, performance: 0, wisdom: 0, vitality: 0, exploration: 0, affinity: 0, imagination: 0, discipline: 0 },
              attributes: s.pet.attributes || { magic: 0, wisdom: 0, kindness: 0, courage: 0, vitality: 0, cooperation: 0, aesthetic: 0 },
              learningLog: Array.isArray(s.pet.learningLog) ? s.pet.learningLog : []
            } : undefined
          };
        });

        const decayResult = processHungerDecayForStudents(merged.students, Date.now());
        merged.students = decayResult.students;

        // Sync local timer remaining count as well on startup
        setTimerSecs((merged.timerSettings.minutes || 5) * 60 + (merged.timerSettings.seconds || 0));
        return merged;
      });

      // Restore active screen view state
      const savedScreen = localStorage.getItem("currentScreen");
      if (savedScreen === "student") {
        const savedId = localStorage.getItem("current_student_modal_id");
        if (savedId) {
          console.log("開啟學生介面");
          setStudentModalId(savedId);
        }
      } else if (savedScreen === "teacher") {
        console.log("開啟教師後台");
        setTeacherPanelShow(true);
      }
    } else {
      // Setup initial default countdown
      setTimerSecs(300);
    }
  }, []);

  // 💾 記錄當前頁面與視窗狀態 (currentScreen)，供重開時自動恢復
  useEffect(() => {
    if (studentModalId) {
      localStorage.setItem("currentScreen", "student");
      localStorage.setItem("current_student_modal_id", studentModalId);
    } else if (teacherPanelShow) {
      localStorage.setItem("currentScreen", "teacher");
    } else {
      localStorage.setItem("currentScreen", "main");
    }
  }, [studentModalId, teacherPanelShow]);

  // Save changes via autoSave whenever appData mutates
  useEffect(() => {
    try {
      autoSave(appData);
    } catch (e: any) {
      console.error("LocalStorage/Cloud autoSave sync failed:", e);
      if (e.name === "QuotaExceededError" || e.code === 22 || e.name === "NS_ERROR_DOM_QUOTA_REACHED") {
        alert("⚠️ 您的瀏覽器快取容量 (localStorage) 已滿，無法儲存最新設定！\n\n💡 解決方案：請前往「教師主控台 > 轉蛋庫管理」，刪除解析度/畫質過高的自訂裝扮背景圖，或改為使用 Emojis、CSS 漸層色背景以釋放空間，並維持最高效流暢的極速體驗！");
      }
    }
  }, [appData, isOnlineMode, classCode, isFirebaseReady]);

  // ==========================================
  // 🌐 雲端線上同步功能整合機制
  // ==========================================

  // 1. 偵測網址參數中的班級代碼 (?classCode=XXXXXX) 進行自動載入/加入
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("classCode")?.toUpperCase();
    if (codeFromUrl) {
      setClassCode(codeFromUrl);
      setIsOnlineMode(true);
      localStorage.setItem("active_class_code", codeFromUrl);

      // 檢查此瀏覽器先前是否登錄過該班級的學生 ID
      const storedStudentId = localStorage.getItem(`student_id_${codeFromUrl}`);
      if (storedStudentId) {
        setCurrentStudentId(storedStudentId);
        // 已加入雲端班級，停留於大廳同步列表，不再直接開啟學生寵物介面
      } else {
        // 沒有角色紀錄，自動跳出加入介面引導輸入姓名
        setJoinClassCodeInput(codeFromUrl);
        setShowStudentJoinModal(true);
      }
    }
  }, []);

  // 2. 當啟用線上模式時，即時聽取 Firebase 全體學生資料與轉蛋商品清單變動
  useEffect(() => {
    if (!isOnlineMode || !classCode || !isFirebaseReady) return;

    let unsub = () => {};
    let unsubGacha = () => {};
    let unsubAchievements = () => {};
    
    // 非同步載入與建置監聽
    import("./firebase").then(({ listenAllStudents, listenGachaItems, listenAchievements }) => {
      console.log(`📡 啟動雲端班級、轉蛋清單與成就偵聽，代碼: ${classCode}`);
      unsub = listenAllStudents(classCode, (studentsFromCloud) => {
        (window as any).isMergingCloudSnapshot = true;
        setAppData((prev) => {
          // 1. Get all local backup students
          const backups = getAllLocalBackupStudents();
          const prevCount = prev.students.length;
          
          // Determine the max local count before we load
          const maxLocalCount = Math.max(prevCount, backups.length);
          const cloudCount = studentsFromCloud.length;

          // 2. Combine list of unique student IDs from all sources
          const allStudentKeys = new Set<string>();
          studentsFromCloud.forEach(s => s && s.id && allStudentKeys.add(s.id));
          prev.students.forEach(s => s && s.id && allStudentKeys.add(s.id));
          backups.forEach(s => s && s.id && allStudentKeys.add(s.id));

          // 3. Build the final resolved students list
          const resolvedStudents: Student[] = [];
          let restoredCount = 0;

          allStudentKeys.forEach((studentId) => {
            const cloudS = studentsFromCloud.find(x => x.id === studentId);
            const memoryS = prev.students.find(x => x.id === studentId);
            const backupS = backups.find(x => x.id === studentId);

            // Construct student state with prioritized fallback merge
            let baseStudent: Student | null = null;
            if (cloudS) {
              baseStudent = cloudS;
            } else if (memoryS) {
              baseStudent = memoryS;
              restoredCount++;
            } else if (backupS) {
              baseStudent = backupS;
              restoredCount++;
            }

            if (baseStudent) {
              // Merge details from available backups/memory for safety
              let finalS = { ...baseStudent };
              if (memoryS) {
                finalS = mergeStudentStates(finalS, memoryS);
              }
              if (backupS) {
                finalS = mergeStudentStates(finalS, backupS);
              }

              // Address task addition race conditions:
              // If a task template is present locally but not on the cloud yet, preserve it.
              const localTasks = memoryS?.tasks || backupS?.tasks || [];
              const cloudTasks = cloudS?.tasks || [];
              const activeTemplates = prev.taskTemplates || [];

              const mergedTasksMap = new Map<string, StudentTask>();
              cloudTasks.forEach(ct => {
                if (ct && ct.id) mergedTasksMap.set(ct.id, { ...ct, done: !!ct.done });
              });

              localTasks.forEach(lt => {
                if (lt && lt.id) {
                  const ct = mergedTasksMap.get(lt.id);
                  if (ct) {
                    ct.done = ct.done || !!lt.done;
                  } else {
                    const inTemplates = activeTemplates.some((tt) => tt.id === lt.id);
                    if (inTemplates) {
                      mergedTasksMap.set(lt.id, { ...lt, done: !!lt.done });
                    }
                  }
                }
              });

              finalS.tasks = Array.from(mergedTasksMap.values());

              // Record to cloud tracking state to prevent loop saves
              const cleaned = cleanData(cleanStudentForSync(finalS));
              const stringified = getCanonicalString(cleaned);
              lastCloudStateRef.current[finalS.id] = stringified;

              resolvedStudents.push(finalS);
            }
          });

          // Sort alphabetically/numerically by id to prevent UI shuffling
          resolvedStudents.sort((a, b) => a.id.localeCompare(b.id));

          const decayResult = processHungerDecayForStudents(resolvedStudents, Date.now());
          const finalStudents = decayResult.students;

          // 4. Trigger data recovery warning toast if a drop was detected and restored
          if (cloudCount < maxLocalCount && restoredCount > 0 && maxLocalCount > 0) {
            setTimeout(() => {
              setDialogConfig({
                show: true,
                title: "🛡️ 智慧資料安全盾啟動",
                message: `偵測到學生資料出現庫存落差（雲端 ${cloudCount} 人 ⇄ 本地大儲備 ${maxLocalCount} 人），系統已自動調配「四重防護網」安全還原了 ${restoredCount} 位學生的點數、成就與成長檔案！✨`,
                type: "alert",
                titleColor: "text-purple-600"
              });
            }, 100);
          }

          return {
            ...prev,
            students: finalStudents
          };
        });
        (window as any).isMergingCloudSnapshot = false;
      });

      unsubGacha = listenGachaItems(classCode, (gachaFromCloud) => {
        if (Array.isArray(gachaFromCloud)) {
          setAppData((prev) => {
            // 1. 初始化為預設裝扮/背景列表
            const mergedList = defaultBackgroundGachaItems.map((item) => ({ ...item }));

            // 2. 先保留本地記憶體中已有的自訂 (非 isDefault) 商品，防範雲端資料尚未完全同步時被重設
            if (Array.isArray(prev.backgroundGachaItems)) {
              prev.backgroundGachaItems.forEach((localItem) => {
                if (localItem && !localItem.isDefault) {
                  const idx = mergedList.findIndex((item) => item.id === localItem.id);
                  if (idx === -1) {
                    mergedList.push({ ...localItem });
                  } else {
                    mergedList[idx] = { ...mergedList[idx], ...localItem };
                  }
                }
              });
            }

            // 3. 疊加雲端載入之最新素材 (優先以 Firestore 的狀態為準，並處理刪除/下架標記)
            gachaFromCloud.forEach((cloudItem) => {
              if (cloudItem) {
                if (cloudItem.isDeleted === true || cloudItem.deleted === true) {
                  const idx = mergedList.findIndex((item) => item.id === cloudItem.id);
                  if (idx > -1) {
                    mergedList.splice(idx, 1);
                  }
                  return;
                }
                const defaultIndex = mergedList.findIndex((item) => item.id === cloudItem.id);
                if (defaultIndex > -1) {
                  mergedList[defaultIndex] = { ...mergedList[defaultIndex], ...cloudItem };
                } else {
                  mergedList.push({ ...cloudItem });
                }
              }
            });

            return {
              ...prev,
              backgroundGachaItems: mergedList
            };
          });
        }
      });

      unsubAchievements = listenAchievements(classCode, (achievementsFromCloud) => {
        if (Array.isArray(achievementsFromCloud)) {
          setAppData((prev) => {
            const mergedList = defaultAchievements.map((item) => ({ ...item }));
            achievementsFromCloud.forEach((cloudAch) => {
              const defaultIndex = mergedList.findIndex((item) => item.achievementId === cloudAch.achievementId);
              if (defaultIndex > -1) {
                mergedList[defaultIndex] = { ...mergedList[defaultIndex], ...cloudAch };
              } else {
                mergedList.push({ ...cloudAch });
              }
            });
            return {
              ...prev,
              achievements: mergedList
            };
          });
        }
      });
    }).catch(err => {
      console.error("載入 Firebase 監聽器失敗:", err);
    });

    return () => {
      unsub();
      unsubGacha();
      unsubAchievements();
    };
  }, [isOnlineMode, classCode]);

  // 💾 偵聽並自動更新雲端教室同步設定 (是否啟用主介面學生同步畫面、限時任務等即時連線欄位)
  useEffect(() => {
    if (!isOnlineMode || !classCode || !isFirebaseReady) return;
    let unsub = () => {};
    import("./firebase").then(({ listenClassSettings }) => {
      unsub = listenClassSettings(classCode, (settings) => {
        if (settings) {
          if (typeof settings.showCloudSyncPanelOnMain === "boolean") {
            setShowCloudSyncPanelOnMain(settings.showCloudSyncPanelOnMain);
          }

          // 暫存雲端接收到的設定以避免引起 autoSave 寫回的無限迴圈
          const cloudSettingsStr = getCanonicalString(cleanData({
            mainTitle: settings.mainTitle || "",
            password: settings.password || "0301",
            notes: settings.notes || "",
            timerSettings: settings.timerSettings || { minutes: 5, seconds: 0 },
            taskTemplates: settings.taskTemplates || [],
            customFoods: settings.customFoods || [],
            activeGroupTasks: settings.activeGroupTasks || [],
            timedTasks: (settings.timedTasks || []).map((t: any) => ({ ...t, remainingSeconds: 0 })),
            achievements: settings.achievements || [],
            groups: settings.groups || [],
            backgroundGachaItems: settings.backgroundGachaItems || [],
            pointLogs: settings.pointLogs || [],
            teacherActionLogs: settings.teacherActionLogs || [],
            lotterySpeed: settings.lotterySpeed || "instant",
            gachaHistoryList: settings.gachaHistoryList || [],
            classConstructionData: settings.classConstructionData || null,
            classEventData: settings.classEventData || null,
            classCollectionData: settings.classCollectionData || null,
          }));
          lastCloudSettingsRef.current = cloudSettingsStr;
          lastCloudGroupsRef.current = getCanonicalString(cleanData(settings.groups || []));

          setAppData((prev) => {
            const nextTimedTasks = Array.isArray(settings.timedTasks) ? settings.timedTasks : prev.timedTasks;
            return {
              ...prev,
              mainTitle: settings.mainTitle || prev.mainTitle,
              password: settings.password || prev.password,
              notes: typeof settings.notes === "string" ? settings.notes : prev.notes,
              timerSettings: settings.timerSettings || prev.timerSettings,
              taskTemplates: Array.isArray(settings.taskTemplates) ? settings.taskTemplates : prev.taskTemplates,
              customFoods: Array.isArray(settings.customFoods) ? settings.customFoods : prev.customFoods,
              activeGroupTasks: Array.isArray(settings.activeGroupTasks) ? settings.activeGroupTasks : prev.activeGroupTasks,
              achievements: Array.isArray(settings.achievements) ? settings.achievements : prev.achievements,
              groups: Array.isArray(settings.groups) ? settings.groups : prev.groups,
              backgroundGachaItems: Array.isArray(settings.backgroundGachaItems) ? settings.backgroundGachaItems : prev.backgroundGachaItems,
              pointLogs: Array.isArray(settings.pointLogs) ? settings.pointLogs : prev.pointLogs,
              teacherActionLogs: Array.isArray(settings.teacherActionLogs) ? settings.teacherActionLogs : prev.teacherActionLogs,
              lotterySpeed: settings.lotterySpeed || prev.lotterySpeed || "instant",
              gachaHistoryList: Array.isArray(settings.gachaHistoryList) ? settings.gachaHistoryList : prev.gachaHistoryList,
              classConstructionData: settings.classConstructionData || prev.classConstructionData,
              classEventData: settings.classEventData || prev.classEventData,
              classCollectionData: settings.classCollectionData || prev.classCollectionData,
              timedTasks: nextTimedTasks,
            };
          });
        }
      });
    }).catch((err) => {
      console.error("載入 Firebase 班級設定與限時任務即時監聽失敗:", err);
    });
    return () => unsub();
  }, [isOnlineMode, classCode]);

  // 3. 偵聽本地學生屬性異動 (點數、餵食、裝扮等)，自動將異動同步上傳雲端
  useEffect(() => {
    if (!isOnlineMode || !classCode || !isFirebaseReady) return;

    appData.students.forEach((s) => {
      const cleaned = cleanData(cleanStudentForSync(s));
      const stringified = getCanonicalString(cleaned);

      const cached = lastCloudStateRef.current[s.id];
      if (cached !== stringified) {
        // 本地發生狀態變化，觸發 Firebase 單一物件更新
        lastCloudStateRef.current[s.id] = stringified;
        saveStudentData(classCode, s.id, s).catch((err) => {
          console.error(`同步學員 [${s.name}] 資料至雲端發生錯誤:`, err);
        });
      }
    });
  }, [appData.students, isOnlineMode, classCode]);

  // 建立線上班級
  const handleCreateOnlineClass = async () => {
    if (!createClassNameInput.trim()) {
      setDialogConfig({
        show: true,
        title: "提醒",
        message: "請輸入您的班級名稱（例如：三年甲班）！",
        type: "alert"
      });
      return;
    }

    if (!isFirebaseConfigured()) {
      setDialogConfig({
        show: true,
        title: "尚未設定 金鑰憑證",
        message: "⚠️ 偵測到本專案 /src/firebase.ts 尚未替換為您的 Firebase API Key！\n\n請開啟 /src/firebase.ts 並在 `firebaseConfig` 填入您的專案金鑰，隨後重新編譯即可自動啟用學堂即時連線功能！在此之前，系統仍利用 LocalStorage 提供完整備份保障。",
        type: "alert"
      });
      return;
    }

    setIsSyncing(true);
    try {
      const code = await createClass(createClassNameInput.trim());
      setClassCode(code);
      setClassName(createClassNameInput.trim());
      setIsOnlineMode(true);
      
      localStorage.setItem("active_class_code", code);
      localStorage.setItem("active_class_name", createClassNameInput.trim());

      // 如果當前已有本地學員名單，自動一併打包上傳至 Firebase 班級
      if (appData.students.length > 0) {
        for (const s of appData.students) {
          await saveStudentData(code, s.id, {
            ...s,
            joinedAt: new Date().toISOString()
          });
        }
      }

      setShowTeacherCreateModal(false);
      setCreateClassNameInput("");
      
      setDialogConfig({
        show: true,
        title: "🎉 雲端班級建立成功！",
        message: `班級【${createClassNameInput.trim()}】已成功在雲端誕生！\n\n🔑 班級代碼：${code}\n👉 學生可透過：\n1. 輸入大寫代碼： ${code}\n2. 點擊 / 掃描 QRCode\n直接暢玩連線同步！`,
        type: "alert",
        titleColor: "text-green-600"
      });
    } catch (err: any) {
      console.error(err);
      setDialogConfig({
        show: true,
        title: "建立失敗",
        message: `很抱歉，建立雲端班級時發生錯誤：${err.message || err}`,
        type: "alert"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // 進入既有雲端教室
  const handleJoinExistingOnlineClass = async () => {
    const code = existingClassCodeInput.trim().toUpperCase();
    const passcode = existingTeacherPasscodeInput.trim();

    if (!code) {
      setDialogConfig({
        show: true,
        title: "提醒",
        message: "請輸入既有雲端班級代碼！",
        type: "alert"
      });
      return;
    }
    if (!passcode) {
      setDialogConfig({
        show: true,
        title: "提醒",
        message: "請輸入該班級的教師認證密碼！",
        type: "alert"
      });
      return;
    }

    if (!isFirebaseConfigured()) {
      setDialogConfig({
        show: true,
        title: "尚未設定 金鑰憑證",
        message: "⚠️ 偵測到本專案 /src/firebase.ts 尚未替換為您的 Firebase API Key！",
        type: "alert"
      });
      return;
    }

    setIsSyncing(true);
    try {
      const restored = await joinExistingCloudClassroom(code, passcode);
      if (restored) {
        setClassCode(code);
        const restoredClassName = restored.className || "還原的班級";
        setClassName(restoredClassName);
        setIsOnlineMode(true);
        
        localStorage.setItem("active_class_code", code);
        localStorage.setItem("active_class_name", restoredClassName);
        
        // 記錄最近登入
        localStorage.setItem("cloudTeacherLastClassCode", code);
        localStorage.setItem("cloudTeacherLastClassName", restoredClassName);
        localStorage.setItem("cloudTeacherLastConnectedAt", new Date().toLocaleString());

        // 使用備份內容重建本地 appData
        setAppData((prev) => {
          const merged: AppData = {
            ...prev,
            mainTitle: restored.mainTitle || prev.mainTitle || `${restoredClassName}任務列表`,
            password: restored.password || prev.password || "0301",
            notes: restored.notes || prev.notes || "",
            timerSettings: restored.timerSettings || prev.timerSettings,
            taskTemplates: Array.isArray(restored.taskTemplates) && restored.taskTemplates.length > 0 
              ? restored.taskTemplates 
              : prev.taskTemplates,
            customFoods: Array.isArray(restored.customFoods) && restored.customFoods.length > 0 
              ? restored.customFoods 
              : prev.customFoods,
            groups: Array.isArray(restored.groups) ? restored.groups : prev.groups,
            activeGroupTasks: Array.isArray(restored.activeGroupTasks) ? restored.activeGroupTasks : prev.activeGroupTasks,
            timedTasks: Array.isArray(restored.timedTasks) ? restored.timedTasks : prev.timedTasks,
            students: Array.isArray(restored.students) ? restored.students : prev.students,
            achievements: Array.isArray(restored.achievements) ? restored.achievements : prev.achievements,
            backgroundGachaItems: Array.isArray(restored.backgroundGachaItems) ? restored.backgroundGachaItems : prev.backgroundGachaItems,
          };
          
          if (merged.timerSettings) {
            setTimerSecs((merged.timerSettings.minutes || 5) * 60 + (merged.timerSettings.seconds || 0));
          }
          return merged;
        });

        setShowTeacherCreateModal(false);
        setExistingClassCodeInput("");
        setExistingTeacherPasscodeInput("");

        // 更新網址導航參數
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + `?classCode=${code}`;
        window.history.pushState({ path: newUrl }, "", newUrl);

        setDialogConfig({
          show: true,
          title: "🎉 成功恢復雲端教室！",
          message: `您已成功在此設備上接軌進入雲端班級：【${restoredClassName}】(${code})！\n教師設定與學生名單已實時同步完成。`,
          type: "alert",
          titleColor: "text-green-600"
        });
      }
    } catch (err: any) {
      console.error(err);
      setDialogConfig({
        show: true,
        title: "恢復失敗",
        message: `很抱歉，無法接管進入此雲端班級：${err.message || err}`,
        type: "alert"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // 1. 答對/加點核心及動作函式
  const updateStudentPoints = (studentId: string, addedPoints: number) => {
    setAppData((prev) => {
      const student = prev.students.find(s => s.id === studentId);
      if (!student) return prev;
      
      const hasBday = student.birthdayBonusEnabled === true;
      const finalPts = hasBday ? addedPoints * 2 : addedPoints;
      const source = hasBday ? "抽號答對 (壽星加倍)" : "抽號答對";

      const nextStudents = prev.students.map((s) => {
        if (s.id === studentId) {
          return {
            ...s,
            points: (s.points || 0) + finalPts
          };
        }
        return s;
      });

      let nextState = { ...prev, students: nextStudents };
      nextState = appendPointLog(nextState, studentId, finalPts, source, "教師", (student.points || 0) + finalPts);
      return nextState;
    });
  };

  const awardCorrectAnswerPoints = (studentId: string) => {
    updateStudentPoints(studentId, 10);
    triggerFloatingText(null, 10);
    setDialogConfig({
      show: true,
      title: "🎉 回答正確！",
      message: "回答正確！獲得 10 點點數！🌟",
      type: "alert",
      titleColor: "text-green-600"
    });
  };

  const handleCorrectAnswer = () => {
    if (!luckyDrawWinner) return;
    awardCorrectAnswerPoints(luckyDrawWinner.id);
    setLuckyDrawWinner(null);
    setLuckyDrawActive(false);
  };

  const handleWrongAnswer = () => {
    setDialogConfig({
      show: true,
      title: "❌ 回答錯誤",
      message: "回答錯誤！繼續加油，下一次可以做得更好！✨",
      type: "alert",
      titleColor: "text-red-500"
    });
    setLuckyDrawWinner(null);
    setLuckyDrawActive(false);
  };

  // 學生輸入代碼與名稱加入班級
  const handleJoinOnlineClass = async () => {
    // A. 離線單機模式 🎒 Single Player / Local Mode Flow
    if (!isOnlineMode) {
      const name = joinStudentNameInput.trim();
      if (!name) {
        setDialogConfig({
          show: true,
          title: "提醒",
          message: "請輸入您的名字/綽號！",
          type: "alert"
        });
        return;
      }

      setIsSyncing(true);
      try {
        // 檢查是否已存在該姓名學生
        const existingStudent = appData.students.find((s) => s.name === name);
        let targetId = "";

        if (existingStudent) {
          // 直接切換為該學生
          targetId = existingStudent.id;
          setCurrentStudentId(targetId);
          localStorage.setItem("local_current_student_id", targetId);
          setShowStudentJoinModal(false);
          setJoinStudentNameInput("");
          setIsSyncing(false);
          
          setDialogConfig({
            show: true,
            title: "👋 歡迎回來！",
            message: `已成功登入並切換至已有角色【${name}】！正在載入您的專屬冒險資料...`,
            type: "alert",
            titleColor: "text-blue-600"
          });
          return;
        } else {
          // 建立新學生
          const newId = `local_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          const freshTasks = appData.taskTemplates
            .filter((t) => t.type !== "group")
            .map((t) => ({ ...t, done: false }));

          const newStudent: Student = {
            id: newId,
            name: name,
            points: 100, // 預設給予 100 點
            coins: 100,
            hasChosenEgg: false, // 讓他們有機會自選寵物蛋！
            petName: "我的史萊姆",
            title: "等待發光中",
            completedTaskCount: 0,
            taskTypeStats: { clean: 0, reading: 0, speaking: 0, cooperation: 0, manners: 0, responsibility: 0 },
            tasks: freshTasks,
            ownedBackgrounds: ["garden"],
            equippedBackground: "garden",
            feedLog: [],
            petStats: { happy: 60, affinity: 40, stamina: 80 },
            studentOwnedBackgrounds: [],
            studentOwnedDecorations: [],
            studentActiveBackground: "",
            studentActiveDecorations: {}
          };

          const updatedStudents = [...appData.students, newStudent];
          const newAppData = { ...appData, students: updatedStudents };
          setAppData(newAppData);
          
          setCurrentStudentId(newId);
          localStorage.setItem("local_current_student_id", newId);

          setShowStudentJoinModal(false);
          setJoinStudentNameInput("");
          setIsSyncing(false);

          setDialogConfig({
            show: true,
            title: "🎉 成功建立新角色！",
            message: `恭喜創建離線角色【${name}】！\n為了慶祝您的第一次登入，我們發放了初始 100 點獎學金。請點擊首頁自己頭像，親手選擇您的第一顆精美史萊姆蛋吧！`,
            type: "alert",
            titleColor: "text-green-600"
          });
          return;
        }
      } catch (err) {
        console.error(err);
        setIsSyncing(false);
      }
      return;
    }

    // B. 線上同步模式 Online Mode Entry
    if (!joinClassCodeInput.trim()) {
      setDialogConfig({
        show: true,
        title: "提醒",
        message: "請輸入 6 碼線上班級代碼！",
        type: "alert"
      });
      return;
    }
    if (!joinStudentNameInput.trim()) {
      setDialogConfig({
        show: true,
        title: "提醒",
        message: "請輸入學生本人的中文姓名！",
        type: "alert"
      });
      return;
    }

    if (!isFirebaseConfigured()) {
      setDialogConfig({
        show: true,
        title: "尚未設定 金鑰憑證",
        message: "⚠️ 偵測到本專案 /src/firebase.ts 尚未替換您的 Firebase 金鑰！\n\n請打開本專案 /src/firebase.ts 並在下方填妥您的 API Key 與 Project ID。在這之前，本機將維持離線 LocalStorage 發包運作。",
        type: "alert"
      });
      return;
    }

    setIsSyncing(true);
    try {
      const upperCode = joinClassCodeInput.trim().toUpperCase();
      const res = await joinClass(upperCode, joinStudentNameInput.trim());
      if (res.success && res.studentId) {
        setClassCode(upperCode);
        setClassName(res.className || "");
        setIsOnlineMode(true);
        setCurrentStudentId(res.studentId);

        localStorage.setItem("active_class_code", upperCode);
        localStorage.setItem("active_class_name", res.className || "");
        localStorage.setItem(`student_id_${upperCode}`, res.studentId);

        setShowStudentJoinModal(false);
        setJoinClassCodeInput("");
        setJoinStudentNameInput("");

        // 自動修改 URL 網址參數而不造成頁面重載刷屏
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + `?classCode=${upperCode}`;
        window.history.pushState({ path: newUrl }, "", newUrl);

        setDialogConfig({
          show: true,
          title: "🎒 成功加入線上班級！",
          message: `${res.message}\n\n🏫 班級名稱: ${res.className}\n👤 同步姓名: ${joinStudentNameInput.trim()}\n\n👉 請在主畫面點選您自己「高亮顯示」的學生區塊，正式進入隨身玩史萊姆介面唷！`,
          type: "alert",
          titleColor: "text-blue-600"
        });

        // 成功加入後停留於大廳同步列表，不直接開啟學生寵物介面，引導手動點開
      } else {
        setDialogConfig({
          show: true,
          title: "加入失敗",
          message: res.message,
          type: "alert"
        });
      }
    } catch (err: any) {
      console.error(err);
      setDialogConfig({
        show: true,
        title: "連線錯誤",
        message: `無法成功發出雲端驗證：${err.message || err}`,
        type: "alert"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // 關閉並退出線上連線模式，安全返還本地端 snapshot
  const handleExitOnlineMode = () => {
    setDialogConfig({
      show: true,
      title: "確定關閉雲端運作？",
      message: "點擊確認後，系統將暫停雲端教室同步，其他同學的裝置將處於暫停同步狀態。您的螢幕將改回顯示原本留在本地端 (localStorage) 的單機名單存檔。",
      type: "confirm",
      onConfirm: () => {
        // 1. 保留最後一次雲端教室紀錄到 localStorage
        if (classCode) {
          localStorage.setItem("cloudTeacherLastClassCode", classCode);
          localStorage.setItem("cloudTeacherLastClassName", className);
          localStorage.setItem("cloudTeacherLastConnectedAt", new Date().toLocaleString());
          
          // 2. 將雲端設定狀態更新為 paused 
          saveClassSettings(classCode, { syncStatus: "paused" }).catch(e => console.error("Failed to pause sync:", e));
        }

        setIsOnlineMode(false);
        // 按使用者需求，特別保留 classCode 與 className 狀態值，不清空
        setCurrentStudentId(null);

        // 還原 URL
        const clearUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.pushState({ path: clearUrl }, "", clearUrl);

        // 重新讀取原本的本地 class list
        const raw = localStorage.getItem("class_quest_ultimate");
        if (raw) {
          try {
            setAppData(JSON.parse(raw));
          } catch (e) {}
        }
      }
    });
  };

  const handleTeacherCreateClass = async (customName: string): Promise<string> => {
    const code = await createClass(customName);
    setClassCode(code);
    setClassName(customName);
    setIsOnlineMode(true);
    
    localStorage.setItem("active_class_code", code);
    localStorage.setItem("active_class_name", customName);

    // 同步儲存至最近使用的雲端教室紀錄
    localStorage.setItem("cloudTeacherLastClassCode", code);
    localStorage.setItem("cloudTeacherLastClassName", customName);
    localStorage.setItem("cloudTeacherLastConnectedAt", new Date().toLocaleString());

    // 如果當前已有本地學員名單，自動一併打包上傳至 Firebase 班級
    if (appData.students.length > 0) {
      for (const s of appData.students) {
        await saveStudentData(code, s.id, {
          ...s,
          joinedAt: new Date().toISOString()
        });
      }
    }
    return code;
  };

  const handleTeacherLoadExistingClass = async (code: string, passcode: string): Promise<void> => {
    if (!isFirebaseConfigured()) {
      throw new Error("⚠️ 偵測到本專案尚未替換為您的 Firebase API Key！請檢查 /src/firebase.ts");
    }

    const restored = await joinExistingCloudClassroom(code, passcode);
    if (!restored) {
      throw new Error("認證密碼不正確或找不到該特定的雲端教室！");
    }

    setClassCode(code);
    const restoredClassName = restored.className || "還原的班級";
    setClassName(restoredClassName);
    setIsOnlineMode(true);
    
    localStorage.setItem("active_class_code", code);
    localStorage.setItem("active_class_name", restoredClassName);
    localStorage.setItem("teacher_passcode", passcode);
    
    // Save last connected info
    localStorage.setItem("cloudTeacherLastClassCode", code);
    localStorage.setItem("cloudTeacherLastClassName", restoredClassName);
    localStorage.setItem("cloudTeacherLastConnectedAt", new Date().toLocaleString());

    setAppData((prev) => {
      const merged: AppData = {
        ...prev,
        mainTitle: restored.mainTitle || prev.mainTitle || `${restoredClassName}任務列表`,
        password: restored.password || prev.password || "0301",
        notes: restored.notes || prev.notes || "",
        timerSettings: restored.timerSettings || prev.timerSettings,
        taskTemplates: Array.isArray(restored.taskTemplates) && restored.taskTemplates.length > 0 
          ? restored.taskTemplates 
          : prev.taskTemplates,
        customFoods: Array.isArray(restored.customFoods) && restored.customFoods.length > 0 
          ? restored.customFoods 
          : prev.customFoods,
        groups: Array.isArray(restored.groups) ? restored.groups : prev.groups,
        activeGroupTasks: Array.isArray(restored.activeGroupTasks) ? restored.activeGroupTasks : prev.activeGroupTasks,
        timedTasks: Array.isArray(restored.timedTasks) ? restored.timedTasks : prev.timedTasks,
        students: Array.isArray(restored.students) ? restored.students : prev.students,
        achievements: Array.isArray(restored.achievements) ? restored.achievements : prev.achievements,
        backgroundGachaItems: Array.isArray(restored.backgroundGachaItems) ? restored.backgroundGachaItems : prev.backgroundGachaItems,
        gachaHistoryList: Array.isArray(restored.gachaHistoryList) ? restored.gachaHistoryList : prev.gachaHistoryList,
      };
      
      if (merged.timerSettings) {
        setTimerSecs((merged.timerSettings.minutes || 5) * 60 + (merged.timerSettings.seconds || 0));
      }
      return merged;
    });

    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + `?classCode=${code}`;
    window.history.pushState({ path: newUrl }, "", newUrl);
  };

  const handleReconnectLastClassroom = async () => {
    const lastCode = localStorage.getItem("cloudTeacherLastClassCode");
    const lastName = localStorage.getItem("cloudTeacherLastClassName") || "";
    if (!lastCode) {
      setDialogConfig({
        show: true,
        title: "重新連線失敗",
        message: "在本裝置上找不到可重新連線的最後一次雲端教室紀錄！",
        type: "alert"
      });
      return;
    }
    
    setIsSyncing(true);
    try {
      const classData = await loadClassroomByCode(lastCode);
      if (classData) {
        // 雲端教室存在
        const finalClassName = classData.className || lastName;
        setClassCode(lastCode);
        setClassName(finalClassName);
        setIsOnlineMode(true);
        localStorage.setItem("active_class_code", lastCode);
        localStorage.setItem("active_class_name", finalClassName);
        
        // 更新最後連線時間
        localStorage.setItem("cloudTeacherLastConnectedAt", new Date().toLocaleString());
        
        // 恢復 Firestore 中的同步狀態為 online / active
        await saveClassSettings(lastCode, { syncStatus: "online" });
        
        // 更新網址導航參數
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + `?classCode=${lastCode}`;
        window.history.pushState({ path: newUrl }, "", newUrl);

        setDialogConfig({
          show: true,
          title: "重新連線成功",
          message: `已成功重新連線至雲端教室：「${finalClassName}」(代碼: ${lastCode})，並恢復雙向即時同步運作！✨`,
          type: "alert"
        });
      } else {
        setDialogConfig({
          show: true,
          title: "重新連線失敗",
          message: "找不到上次的雲端教室，可能已被刪除或代碼錯誤。",
          type: "alert"
        });
      }
    } catch (err: any) {
      console.error(err);
      setDialogConfig({
        show: true,
        title: "連線錯誤",
        message: `重新連線時發生錯誤：${err.message || err}`,
        type: "alert"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleShowCloudSyncPanelOnMain = async (newValue: boolean) => {
    setShowCloudSyncPanelOnMain(newValue);
    localStorage.setItem("showCloudSyncPanelOnMain", String(newValue));
    if (isOnlineMode && classCode && isFirebaseReady) {
      await saveClassSettings(classCode, { showCloudSyncPanelOnMain: newValue });
    }
  };

  const getJoinUrl = () => {
    return window.location.protocol + "//" + window.location.host + window.location.pathname + `?classCode=${classCode}`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(classCode);
    setDialogConfig({
      show: true,
      title: "📋 複製成功",
      message: `已複製班級代碼：${classCode}`,
      type: "alert"
    });
  };

  const handleCopyLink = () => {
    const url = getJoinUrl();
    navigator.clipboard.writeText(url);
    setDialogConfig({
      show: true,
      title: "📋 連結複製成功！",
      message: `學生加入專屬連結已完備：\n\n${url}\n\n💡 將此網址黏貼至 LINE/聯絡簿/Google Classroom，學生點開即可直接召喚史萊姆！`,
      type: "alert"
    });
  };

  const handleQuickReportTimedTask = (taskId: string, studentId: string) => {
    const task = appData.timedTasks.find((t) => t.id === taskId);
    if (!task) return;

    // Check if remaining time is > 0
    const rem = task.isActive && task.startedAt 
      ? Math.max(0, task.durationSeconds - Math.floor((Date.now() - task.startedAt) / 1000)) 
      : task.remainingSeconds;
    const expired = rem <= 0 || task.expired;
    if (expired) {
      setDialogConfig({
        show: true,
        title: "⚠️ 挑戰已過期",
        message: "此限時任務倒數已經結束囉！期待下次挑戰！✨",
        type: "alert"
      });
      return;
    }

    if (task.completedBy.includes(studentId)) {
      return; // Already completed
    }

    setAppData((prev) => {
      const activeTask = prev.timedTasks.find((t) => t.id === taskId);
      if (!activeTask) return prev;

      const classSize = prev.students.length;
      const alreadyCompleted = activeTask.completedBy.includes(studentId);
      if (alreadyCompleted) return prev;

      const updatedCompletedBy = [...activeTask.completedBy, studentId];
      const isGroupCoop = activeTask.type === "group";
      const groupNowFinished = isGroupCoop && updatedCompletedBy.length === classSize;

      // Update the timed task completion list
      const nextTimedTasks = prev.timedTasks.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            completedBy: updatedCompletedBy,
            // If group goal is successfully hit, we set groupRewarded flag to prevent duplicate payouts
            ...(groupNowFinished ? { groupRewarded: true } : {})
          };
        }
        return t;
      });

      // Award points and update students' stats
      const nextStudents = prev.students.map((student) => {
        const stats = student.taskTypeStats || { clean: 0, reading: 0, speaking: 0, cooperation: 0, manners: 0, responsibility: 0 };
        
        // If it was group coop and it became finished just now, everyone gets the reward points!
        if (groupNowFinished) {
          const isOwnerOfTrigger = student.id === studentId;
          return {
            ...student,
            points: (student.points || 0) + activeTask.points,
            completedTaskCount: Number(student.completedTaskCount || 0) + (isOwnerOfTrigger ? 1 : 0),
            taskTypeStats: {
              ...stats,
              cooperation: (stats.cooperation || 0) + 1
            }
          };
        }

        // Under standard individual tasks, triggerer gets immediate points!
        if (!isGroupCoop && student.id === studentId) {
          return {
            ...student,
            points: (student.points || 0) + activeTask.points,
            completedTaskCount: Number(student.completedTaskCount || 0) + 1,
            taskTypeStats: {
              ...stats,
              responsibility: (stats.responsibility || 0) + 1
            }
          };
        }

        return student;
      });

      const updatedState = {
        ...prev,
        timedTasks: nextTimedTasks,
        students: nextStudents
      };

      // Announcement if group coop completed successfully
      if (groupNowFinished) {
        setTimeout(() => {
          setDialogConfig({
            show: true,
            title: "🎉 全班大合力！達標挑戰！",
            message: `好棒！班級全員（${classSize}/${classSize}）攜手完成了團體合作限時任務【${activeTask.title}】！\n\n🎁 全班每位史萊姆均獲得 +${activeTask.points} 點數獎勵！`,
            type: "alert"
          });
        }, 100);
      }

      // Synchronize/Save state
      autoSave(updatedState);

      return updatedState;
    });
  };

  // System real-time ticking loop
  useEffect(() => {
    const clockInterval = setInterval(() => {
      const now = new Date();
      
      // Traditional Chinese calendar structure
      const localizedDate = now.toLocaleDateString("zh-TW", {
        month: "long",
        day: "numeric",
        weekday: "long"
      });
      setCurrentDateString(localizedDate);

      const hours = now.getHours();
      const rawMins = now.getMinutes().toString().padStart(2, "0");
      const halfDayIndicator = hours >= 12 ? "下午" : "上午";
      const formattedHour = (hours % 12 || 12).toString().padStart(2, "0");
      
      setCurrentTimeString(`${halfDayIndicator} ${formattedHour}:${rawMins}`);
    }, 1000);

    return () => clearInterval(clockInterval);
  }, []);

  // HungerDecaySystem background ticker (running passive updates for logged in / open students)
  useEffect(() => {
    const hungerDecayInterval = setInterval(() => {
      let stateChanged = false;
      let nextState: AppData | null = null;
      setAppData((prev) => {
        const result = processHungerDecayForStudents(prev.students, Date.now());
        if (result.updatedCount > 0) {
          stateChanged = true;
          const updated = { ...prev, students: result.students };
          nextState = updated;
          return updated;
        }
        return prev;
      });

      setTimeout(() => {
        if (stateChanged && nextState) {
          autoSave(nextState);
        }
      }, 0);
    }, 15000); // Check every 15 seconds

    return () => clearInterval(hungerDecayInterval);
  }, [isOnlineMode, classCode]);

  // Timed task background tick loops (running countdown triggers)
  useEffect(() => {
    const timedTaskInterval = setInterval(() => {
      // 1. App timed assignment countdown
      setAppData((prev) => {
        let changed = false;
        let expiredJustNow = false;
        const updatedTimedTasks = prev.timedTasks.map((t) => {
          if (t.isActive && !t.expired) {
            const nowMs = Date.now();
            const started = t.startedAt || nowMs;
            const elapsed = Math.floor((nowMs - started) / 1000);
            const remaining = Math.max(0, t.durationSeconds - elapsed);
            
            const isFinished = remaining <= 0;
            if (isFinished || remaining !== t.remainingSeconds) {
              changed = true;
            }
            if (isFinished) {
              expiredJustNow = true;
            }

            return {
              ...t,
              remainingSeconds: remaining,
              expired: isFinished ? true : t.expired,
              isActive: isFinished ? false : t.isActive
            };
          }
          return t;
        });

        if (changed) {
          const nextState = { ...prev, timedTasks: updatedTimedTasks };
          // Save immediately on expiration or change
          if (expiredJustNow) {
            setTimeout(() => {
              autoSave(nextState);
            }, 10);
          }
          return nextState;
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timedTaskInterval);
  }, []);

  // Automatically show main timed tasks modal on new task trigger and automatically close when none active
  useEffect(() => {
    const activeTask = appData.timedTasks.find((t) => {
      if (!t.isActive) return false;
      const rem = t.startedAt 
        ? Math.max(0, t.durationSeconds - Math.floor((Date.now() - t.startedAt) / 1000)) 
        : t.remainingSeconds;
      return rem > 0 && !t.expired;
    });

    if (activeTask) {
      setShowMainTimedTasksPanel(true);
    } else {
      setShowMainTimedTasksPanel(false);
    }
  }, [appData.timedTasks]);

  // Potion magic teacher timer tick loop
  useEffect(() => {
    let tInterval: NodeJS.Timeout | null = null;
    if (timerRunning) {
      tInterval = setInterval(() => {
        setTimerSecs((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            if (tInterval) clearInterval(tInterval);
            
            // Timeout alert
            setDialogConfig({
              show: true,
              title: "🔔 Potion 計時結束！",
              message: "恭喜全班同學！魔法沙漏時間倒數終了！⏰",
              type: "alert"
            });
            confetti({ particleCount: 150, spread: 130, origin: { y: 0.5 } });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (tInterval) clearInterval(tInterval);
    };
  }, [timerRunning]);

  // Check if a student already has starter pet data established
  const checkStudentHasPet = (s: Student): boolean => {
    return !!(s.hasChosenEgg && s.element && (s.petType || s.element) && s.pet?.level);
  };

  // Open the egg choosing modal screen
  const openEggSelectionScreen = (studentId: string) => {
    setEggSelectionStudentId(studentId);
  };

  // Create starter structured pet details
  const createStarterPet = (element: "star" | "forest" | "candy" | "magic" | "crystal"): Pet => {
    return {
      level: 1,
      exp: 0,
      evolutionStage: 1,
      growthType: "balanced",
      personalityStats: { creativity: 0, performance: 0, wisdom: 0, vitality: 0, exploration: 0, affinity: 0, imagination: 0, discipline: 0 },
      attributes: { magic: 0, wisdom: 0, kindness: 0, courage: 0, vitality: 0, cooperation: 0, aesthetic: 0 },
      learningLog: []
    };
  };

  // Update locally and upload starter pet structures to cloud
  const saveStarterPetToCloud = (studentId: string, element: "star" | "forest" | "candy" | "magic" | "crystal") => {
    const starter = createStarterPet(element);
    setAppData((prev) => {
      const updated = prev.students.map((st) => {
        if (st.id === studentId) {
          return {
            ...st,
            element,
            hasChosenEgg: true,
            petType: element,
            petLevel: 1,
            petName: `${st.name}的史萊姆`,
            slimeData: starter,
            pet: starter
          };
        }
        return st;
      });
      return { ...prev, students: updated };
    });
  };

  // Open safe profile workspace checking eggs
  const openStudentProfile = (studentId: string) => {
    const targetStudent = appData.students.find((s) => s.id === studentId);
    if (!targetStudent) return;

    const hasPet = checkStudentHasPet(targetStudent);
    if (!hasPet) {
      openEggSelectionScreen(studentId);
    } else {
      console.log("開啟學生介面");
      setStudentModalId(studentId);
    }
  };

  // Handle student egg picker trigger safely with permission guards
  const handleOpenStudentGridItem = (s: Student) => {
    openStudentProfile(s.id);
  };

  const handleChooseEgg = (element: "star" | "forest" | "candy" | "magic" | "crystal") => {
    if (!eggSelectionStudentId) return;

    const targetId = eggSelectionStudentId;
    saveStarterPetToCloud(targetId, element);

    const studentName = appData.students.find((x) => x.id === targetId)?.name || "";
    setEggSelectionStudentId(null);
    console.log("開啟學生介面");
    setStudentModalId(targetId);

    setDialogConfig({
      show: true,
      title: "🐣 孵化契約成立！",
      message: `恭喜同學！【${studentName}】順利召喚了「${
        { star: "星空系", forest: "森林系", candy: "糖果系", magic: "魔法系", crystal: "水晶系" }[element]
      }史萊姆」！\n開始和寵物一起完成學習任務、獲取經驗值並進化吧！`,
      type: "alert",
      titleColor: "text-purple-600"
    });
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.4 } });
  };

  // 渲染學生同步列表 / 學生區塊列表
  const renderStudentSyncList = () => {
    if (appData.students.length === 0) {
      return (
        <div className="col-span-full text-center text-3xl font-black text-gray-500 py-16 bg-white/40 rounded-2xl border-4 border-dashed border-gray-400">
          🏫 目前班上尚無登錄的寶貝！
          <br />
          <span className="text-xl font-bold mt-2 block text-gray-400">
            請點按右上方齒輪進入教師密碼（0301）來新增名單
          </span>
        </div>
      );
    }

    const activeTimedTasks = appData.timedTasks.filter((t) => {
      if (!t.isActive) return false;
      const rem = t.startedAt 
        ? Math.max(0, t.durationSeconds - Math.floor((Date.now() - t.startedAt) / 1000)) 
        : t.remainingSeconds;
      return rem > 0 && !t.expired;
    });

    return (
      <div className="max-h-[70vh] overflow-y-auto custom-scroll pr-1 pb-4">
        {/* Timed Tasks Quick Report Panel */}
        {activeTimedTasks.length > 0 && (
          <div className="mb-6 p-5 border-[4px] border-slate-700 rounded-3xl bg-amber-50 shadow-[4px_4px_0px_#cbd5e1] text-left mx-1">
            <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2.5 mb-3.5">
              <span className="text-3xl">⏰</span>
              <div>
                <h3 className="text-xl font-black text-slate-800 leading-tight">⚡ 限時任務快速回報區</h3>
                <p className="text-[11px] font-black text-slate-500 mt-1">
                  點擊學生自己的名字即可即時完成回報、領取點數獎勵！
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {activeTimedTasks.map((t) => {
                const rem = t.startedAt 
                  ? Math.max(0, t.durationSeconds - Math.floor((Date.now() - t.startedAt) / 1000)) 
                  : t.remainingSeconds;
                const classSize = appData.students.length;
                const completedCount = t.completedBy.length;
                
                return (
                  <div key={t.id} className="p-4 bg-white border-[3px] border-slate-700 rounded-2xl flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-gray-150 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
                          t.type === "group"
                            ? "bg-purple-100 border-purple-400 text-purple-700"
                            : "bg-sky-100 border-sky-400 text-sky-700"
                        }`}>
                          {t.type === "group" ? "👥 團體合作任務" : "👤 個人挑戰任務"}
                        </span>
                        <span className="font-extrabold text-slate-800 text-base">{t.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500">
                          ⏱️ 剩餘時間：
                          <strong className="text-red-600 font-mono text-sm font-black ml-1">
                            {Math.floor(rem / 60).toString().padStart(2, "0")}:{(rem % 60).toString().padStart(2, "0")}
                          </strong>
                        </span>
                        <span className="text-xs font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                          獎勵：+{t.points} 點
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex-wrap sm:flex-nowrap gap-3">
                      <span className="text-xs font-black text-slate-600">
                        📊 完成進度：
                        <strong className="text-indigo-600 text-sm font-extrabold ml-1">
                          {t.type === "group" ? "班級連署目標" : "學生登記"} ({completedCount} / {classSize})
                        </strong>
                      </span>
                      <div className="flex-1 min-w-[150px] h-2.5 bg-gray-200 rounded-full overflow-hidden border border-gray-300 relative">
                        <div 
                          className={`h-full transition-all duration-500 ${t.type === "group" ? "bg-purple-500" : "bg-emerald-500"}`}
                          style={{ width: `${(completedCount / Math.max(1, classSize)) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Member checklist */}
                    <div className="pt-1">
                      <span className="text-xs font-extrabold text-[#5b21b6] block mb-2">👤 點選名字完成快速回報：</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[160px] overflow-y-auto pr-1">
                        {appData.students.map((st) => {
                          const hasCompleted = t.completedBy.includes(st.id);
                          return (
                            <button
                              key={st.id}
                              disabled={hasCompleted}
                              onClick={() => handleQuickReportTimedTask(t.id, st.id)}
                              className={`flex items-center gap-1.5 p-1.5 rounded-xl border-2 transition-all font-black text-xs text-left cursor-pointer truncate ${
                                hasCompleted
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-800 opacity-80"
                                  : "bg-white hover:bg-slate-50 border-slate-300 text-slate-700 active:scale-95"
                              }`}
                            >
                              <span className={`text-sm shrink-0 font-sans ${hasCompleted ? "text-emerald-600" : "text-gray-300"}`}>
                                {hasCompleted ? "☑" : "☐"}
                              </span>
                              <span className="truncate">{st.name}</span>
                              {hasCompleted && <span className="text-[9px] font-bold text-emerald-500 shrink-0 ml-auto">✔</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 ml-1 mr-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {appData.students.map((s) => {
            const isMe = isOnlineMode && currentStudentId === s.id;

            // Determine active background custom or legacy
            let studentBgStyle = "linear-gradient(to bottom, #ffffff, #ffffff)";
            if (s.hasChosenEgg) {
              if (s.studentActiveBackground) {
                const customBg = (appData.backgroundGachaItems || defaultBackgroundGachaItems).find(
                  (item) => item.id === s.studentActiveBackground
                );
                if (customBg) {
                  if (customBg.imageUrl) {
                    studentBgStyle = `url(${customBg.imageUrl}) center/cover`;
                  } else if (customBg.presetSvgMarkup && (customBg.presetSvgMarkup.includes("linear") || customBg.presetSvgMarkup.includes("radial"))) {
                    studentBgStyle = customBg.presetSvgMarkup;
                  } else {
                    studentBgStyle = "linear-gradient(135deg, #a5b4fc 0%, #818cf8 100%)";
                  }
                }
              } else if (s.equippedBackground && backgroundDB[s.equippedBackground]) {
                studentBgStyle = backgroundDB[s.equippedBackground].css;
              } else {
                studentBgStyle = "linear-gradient(to bottom, #bae6fd, #e0f2fe)";
              }
            }

            const renderCardDecorSlot = (position: string, className: string) => {
              const itemId = s.studentActiveDecorations?.[position];
              if (!itemId) return null;
              const itemsList = appData.backgroundGachaItems || defaultBackgroundGachaItems;
              const item = itemsList.find((i) => i.id === itemId);
              if (!item || item.enabled === false) return null;

              return (
                <div
                  key={position}
                  className={`pointer-events-none select-none z-[5] animate-bounce ${className}`}
                  style={{ animationDuration: "5s" }}
                >
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-8 h-8 object-contain drop-shadow" />
                  ) : item.presetSvgMarkup?.trim().startsWith("<") ? (
                    <div 
                      className="w-8 h-8 flex items-center justify-center scale-[0.55]"
                      dangerouslySetInnerHTML={{ __html: item.presetSvgMarkup }}
                    />
                  ) : (
                    <span className="text-2xl drop-shadow">{item.presetSvgMarkup}</span>
                  )}
                </div>
              );
            };

            return (
              <div
                key={s.id}
                onClick={() => handleOpenStudentGridItem(s)}
                style={{ background: studentBgStyle }}
                className={`student-card game-box p-4 border-[4px] flex flex-col items-center justify-between min-h-[360px] overflow-hidden relative cursor-pointer transition-all duration-300 ${
                  isMe
                    ? "border-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.8)] ring-4 ring-emerald-300 ring-offset-2 scale-102 hover:scale-105"
                    : "border-gray-700 hover:scale-103"
                }`}
              >
                <div className="absolute inset-0 bg-white/10 pointer-events-none z-0"></div>

                {/* Absolute overlay badges / decorations */}
                {isMe && (
                  <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] px-2.5 py-1 rounded-md font-black border-2 border-white shadow-sm animate-bounce z-20">
                    🌟 我的角色
                  </div>
                )}

                {/* 是否已選蛋狀態標籤 */}
                <div className="absolute top-2 right-2 z-20">
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${
                    s.hasChosenEgg
                      ? "bg-indigo-100 border-indigo-300 text-indigo-800"
                      : "bg-rose-100 border-rose-300 text-rose-800 animate-pulse"
                  }`}>
                    {s.hasChosenEgg ? "✨ 已選蛋" : "🥚 尚未選蛋"}
                  </span>
                </div>

                {/* 第二至第六層：轉蛋壁紙／客製分類多層共存滿版背景 */}
                {s.hasChosenEgg && (() => {
                  const activeDecs = s.studentActiveDecorations || {};
                  const mappedBg = s.studentActiveBackground;
                  
                  const categoryItemIds: Record<string, string> = {
                    background: mappedBg || activeDecs["background"] || "",
                    decoration: activeDecs["decoration"] || "",
                    furniture: activeDecs["furniture"] || "",
                    object: activeDecs["object"] || activeDecs["prop"] || "",
                    effect: activeDecs["effect"] || "",
                  };
                  
                  const itemsList = appData.backgroundGachaItems || defaultBackgroundGachaItems;
                  
                  const renderLayer = (itemId: string, zIndexClass: string) => {
                    if (!itemId) return null;
                    const customBg = itemsList.find((item) => item.id === itemId);
                    if (!customBg || customBg.enabled === false) return null;

                    if (customBg.imageUrl) {
                      return (
                        <div 
                          className={`absolute inset-0 w-full h-full pointer-events-none ${zIndexClass}`}
                          style={{
                            backgroundImage: `url(${customBg.imageUrl})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat"
                          }}
                        />
                      );
                    } else if (customBg.presetSvgMarkup && (customBg.presetSvgMarkup.includes("linear-gradient") || customBg.presetSvgMarkup.includes("radial-gradient"))) {
                      return (
                        <div 
                          className={`absolute inset-0 w-full h-full pointer-events-none ${zIndexClass}`}
                          style={{
                            background: customBg.presetSvgMarkup
                          }}
                        />
                      );
                    } else if (customBg.presetSvgMarkup?.trim().startsWith("<")) {
                      return (
                        <div 
                          className={`absolute inset-0 w-full h-full pointer-events-none ${zIndexClass} flex items-center justify-center overflow-hidden`}
                          dangerouslySetInnerHTML={{ __html: customBg.presetSvgMarkup }}
                          style={{
                            transform: "scale(1)",
                            width: "100%",
                            height: "100%",
                            objectFit: "cover"
                          }}
                        />
                      );
                    } else {
                      return (
                        <div className={`absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none ${zIndexClass} opacity-15 overflow-hidden`}>
                          <span className="text-7xl drop-shadow-lg">{customBg.presetSvgMarkup || "🎁"}</span>
                        </div>
                      );
                    }
                  };

                  return (
                    <>
                      {renderLayer(categoryItemIds.background, "z-[1]")}
                      {renderLayer(categoryItemIds.decoration, "z-[2]")}
                      {renderLayer(categoryItemIds.furniture, "z-[3]")}
                      {renderLayer(categoryItemIds.object, "z-[4]")}
                      {renderLayer(categoryItemIds.effect, "z-[5]")}
                    </>
                  );
                })()}
                
                {/* Avatar section */}
                <div className={`w-36 h-36 relative mb-2 z-10 drop-shadow-xl ${s.hasChosenEgg ? "slime-idle" : "animate-pulse"}`}>
                  {s.hasChosenEgg ? (
                    <div
                       className="w-full h-full"
                       dangerouslySetInnerHTML={{ __html: generateDetailedSlimeSVG(s) }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <span className="text-6xl animate-bounce">🥚</span>
                      <span className="text-[11px] font-black text-rose-600 mt-2 bg-rose-50/95 border border-rose-300 px-2 py-0.5 rounded-full text-center">
                        尚未選擇寵物蛋
                      </span>
                    </div>
                  )}
                </div>

                {/* Student name */}
                <div
                  className="text-2xl font-black z-10 text-gray-800"
                  style={{
                    textShadow: "1px 1px 0px white, -1px -1px 0px white, 1px -1px 0px white, -1px 1px 0px white"
                  }}
                >
                  {s.name}
                </div>

                {/* Student life badge title or egg selection hint */}
                {s.hasChosenEgg ? (
                  <div className="title-badge mt-1 mb-1 z-10 relative">
                    🏅 {(!s.title || s.title === "等待發光中") ? computeStudentTitle(s) : s.title}
                  </div>
                ) : (
                  <div className="text-xs font-bold text-gray-400 mt-1 mb-1 z-10">
                    等待選蛋召喚中
                  </div>
                )}

                {/* Points / Level display */}
                <div className="flex gap-2 items-center z-10 mt-1">
                  <div className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    Lv.{s.pet?.level || 1}
                  </div>
                  <div className="text-sm font-bold text-orange-600 bg-white/95 px-2 py-0.5 rounded border border-orange-200 shadow-sm">
                    ⭐ {s.points}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Safe PET experience leveling formula
  const gainPetExp = (student: Student, amount: number) => {
    if (!student.pet) return;
    const pet = student.pet;
    pet.exp = (pet.exp || 0) + amount;

    let leveled = false;
    // Calculate required exp scaling up recursively
    while (pet.level < 20 && pet.exp >= 45 + pet.level * 10) {
      pet.exp -= 45 + pet.level * 10;
      pet.level += 1;
      leveled = true;
    }

    if (leveled) {
      student.lastLeveledUpAt = Date.now();
      // Trigger confetti celebration on next render ticks
      setTimeout(() => {
        setDialogConfig({
          show: true,
          title: "☄️ 史萊姆實力突破！",
          message: `祝賀【${student.name}】的寵物「${student.petName}」升級至 Lv.${pet.level}！\n它的身形在外表與力量上均獲得新的蛻變！✨`,
          type: "alert",
          titleColor: "text-purple-600"
        });
        confetti({ particleCount: 130, spread: 110, origin: { y: 0.3 } });
      }, 500);
    }
  };

  // Reset progress for a brand new school day
  const triggerNewDay = () => {
    setAppData((prev) => {
      // Clean up all individual checks
      const nextStudents = prev.students.map((st) => ({
        ...st,
        tasks: st.tasks.map((task) => ({ ...task, done: false }))
      }));

      // Clean up all group checks
      const nextGroupQuests = prev.activeGroupTasks.map((t) => ({
        ...t,
        participants: [],
        claimedBy: []
      }));

      return {
        ...prev,
        students: nextStudents,
        activeGroupTasks: nextGroupQuests
      };
    });

    setDialogConfig({
      show: true,
      title: "☀️ 早安！新的一天已開始",
      message: "全班所有學生的今日每日學習任務聯署進度已重置完成。\n大家今天也要認真合作賺取點數喔！",
      type: "alert"
    });
  };

  // Admin Verification PIN
  const handleVerifyPin = () => {
    const targetPwd = appData.password || "0301";
    if (pinInput === targetPwd) {
      setTeacherLoginShow(false);
      console.log("開啟教師後台");
      setTeacherPanelShow(true);
      setPinInput("");
    } else {
      setDialogConfig({
        show: true,
        title: "拒絕授權",
        message: "教師專用密碼不正確。請重試或洽詢管理人員。",
        type: "alert",
        titleColor: "text-red-500"
      });
    }
  };

  // Append score float animations
  const triggerFloatingText = (e: React.MouseEvent | null, pts: number, saved = false) => {
    const x = e ? e.clientX : window.innerWidth / 2;
    const y = e ? e.clientY : window.innerHeight / 2;

    const newId = `float_${Date.now()}_${Math.random()}`;
    const txt = saved ? "✅ 存檔完成" : `${pts > 0 ? "+" : ""}${pts} 點`;
    const styleType = saved ? "save" : pts > 0 ? "plus" : "minus";

    setFloatingTexts((prev) => [...prev, { id: newId, x, y, text: txt, styleType }]);

    // Trigger explosive canvas confetti sparkle
    if (!saved && pts !== 0) {
      confetti({
        particleCount: 30,
        spread: 45,
        origin: { x: x / window.innerWidth, y: y / window.innerHeight }
      });
    }

    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((item) => item.id !== newId));
    }, 1300);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden select-none pb-4 relative">
      {/* 1. Header Game Bar */}
      <header className="game-box bg-[#F2DD00] p-2 md:p-3.5 m-2 md:m-4 shrink-0 border-b-[5px] border-[#2D3748] flex flex-wrap justify-between items-center gap-2.5 relative z-40">
        <div className="flex items-center gap-2">
          <h1
            className="text-2xl md:text-3xl font-black tracking-wide text-white flex items-center gap-2 select-none flex-wrap"
            style={{
              WebkitTextStroke: "2px #2D3748",
              textShadow: "3px 3px 0px #F2941E"
            }}
          >
            <span>{appData.mainTitle}</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-xl border-[2px] border-gray-700 font-extrabold tracking-normal flex items-center gap-1 shadow-[1px_1px_0px_#2d3748] ${
              isOnlineMode
                ? "bg-[#34D399] text-emerald-950"
                : "bg-[#cbd5e1] text-slate-800"
            }`} style={{ WebkitTextStroke: "0px", textShadow: "none" }}>
              {isOnlineMode ? "🟢 雲端教室同步中" : "⚪ 單機模式運作中"}
            </span>
          </h1>
          {/* Administrator gear */}
          <button
            onClick={() => {
              console.log("教師後台按鈕被點擊");
              console.log("teacherPanelShow =", teacherPanelShow);
              setTeacherLoginShow(true);
            }}
            className="text-gray-800 opacity-40 hover:opacity-100 p-2 text-2xl transition-all hover:scale-110 active:scale-95 flex items-center justify-center rounded-lg hover:bg-black/5"
            title="教師後台管理員面板"
          >
            <i className="fas fa-cog"></i>
          </button>
        </div>

        {/* Dynamic Class Countdown */}
        <div
          onClick={() => setTimerRunning(!timerRunning)}
          className="game-box bg-white px-5 py-2 flex items-center gap-4 rounded-full border-[4px] border-gray-700 hover:bg-gray-50 hover:scale-102 transition-transform cursor-pointer shadow-sm"
          title="點擊開始或暫停此班級沙漏"
        >
          <div className="w-12 h-12 flex items-center justify-center text-3xl animate-bounce">⏳</div>
          <span className="text-4xl font-black pixel-font text-gray-800 w-24 text-center tracking-wider">
            {Math.floor(timerSecs / 60).toString().padStart(2, "0")}:{(timerSecs % 60).toString().padStart(2, "0")}
          </span>
          <i className={`fas ${timerRunning ? "fa-pause" : "fa-play"} text-gray-400 text-2xl ml-1`} />
        </div>

        {/* Lucky Random Picker Button */}
        <button
          onClick={() => setLuckyDrawOpen(true)}
          className="game-box bg-[#F43F5E] hover:bg-[#E11D48] active:scale-95 text-white text-2xl font-black py-2.5 px-6 rounded-2xl border-[4px] border-gray-700 shadow-[2px_2px_0px_#9f1239] transition-all flex items-center gap-2 cursor-pointer hover:scale-103"
          title="🎲 史萊姆幸運召唤大冒險（隨機抽人與抽組）"
        >
          <span>🎲 幸運點名</span>
        </button>

        {/* ⚡ 限時任務面板按鈕 */}
        <button
          onClick={() => setShowMainTimedTasksPanel(true)}
          className={`game-box active:scale-95 text-white text-2xl font-black py-2.5 px-6 rounded-2xl border-[4px] border-gray-700 transition-all flex items-center gap-2 cursor-pointer hover:scale-103 ${
            appData.timedTasks.some((t) => t.isActive && !t.expired)
              ? "bg-amber-500 hover:bg-amber-600 shadow-[2px_2px_0px_#b45309] animate-pulse"
              : "bg-indigo-500 hover:bg-indigo-600 shadow-[2px_2px_0px_#4338ca]"
          }`}
          title="⚡ 限時閃擊任務：查看全班現有的倒數計時挑戰！"
        >
          <span>⚡ 限時任務</span>
          {appData.timedTasks.some((t) => t.isActive && !t.expired) && (
            <span className="bg-red-600 text-white text-[11px] px-1.5 py-0.5 rounded-full border border-white font-mono font-black select-none">
              ON
            </span>
          )}
        </button>

        {/* 🏗️ 班級理想國 (Class Addons Panel Button) */}
        <button
          onClick={() => setShowClassAddonsModal(true)}
          className={`game-box active:scale-95 text-white text-2xl font-black py-2.5 px-6 rounded-2xl border-[4px] border-gray-700 transition-all flex items-center gap-2 cursor-pointer hover:scale-103 ${
            appData.classEventData?.activeEvent
              ? "bg-purple-500 hover:bg-purple-600 shadow-[2px_2px_0px_#6b21a8] animate-pulse"
              : "bg-emerald-500 hover:bg-emerald-600 shadow-[2px_2px_0px_#065f46]"
          }`}
          title="🏗️ 班級理想國：查看全班理想王國建設進度、天候大事件、以及圖鑑成就！"
        >
          <span>🏗️ 班級理想國</span>
          {appData.classEventData?.activeEvent && (
            <span className="bg-red-500 text-white text-[11px] px-1.5 py-0.5 rounded-full border border-white font-mono font-black select-none animate-bounce">
              EVENT
            </span>
          )}
        </button>

        {/* 🎒 學生連線加入按鈕 */}
        {!isOnlineMode && (
          <button
            onClick={() => {
              setJoinClassCodeInput("");
              setJoinStudentNameInput("");
              setShowStudentJoinModal(true);
            }}
            className="game-box bg-[#0EA5E9] hover:bg-[#0284C7] active:scale-95 text-white text-2xl font-black py-2.5 px-6 rounded-2xl border-[4px] border-gray-700 shadow-[2px_2px_0px_#0369a1] transition-all flex items-center gap-2 cursor-pointer hover:scale-103"
            title="🎒 學生輸入代碼與姓名加入線上班級"
          >
            <span>🎒 學生連線加入</span>
          </button>
        )}

        {/* Real-time clocks */}
        <div className="flex gap-4 items-center">
          <div className="game-box bg-white px-5 py-2 flex flex-col items-center justify-center rounded-2xl border-[4px] border-gray-700">
            <div className="text-3xl font-black text-blue-500 border-b-2 border-gray-100 pb-1 flex items-center gap-2">
              <i className="far fa-clock"></i>
              <span className="tracking-widest">{currentTimeString || "載入中..."}</span>
            </div>
            <div className="text-lg font-bold text-gray-400 pt-1 flex items-center gap-2">
              <i className="far fa-calendar-alt"></i>
              <span>{currentDateString || "載入中..."}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Dashboard Classroom student listings */}
      <main className="flex-1 overflow-y-auto px-4 md:px-6 mb-4 custom-scroll z-30">
        {/* ========================================== */}
        {/* 🌐 雲端連線同步網路控制面板 (Pixel Art UI) */}
        {/* ========================================== */}
        {/* ========================================== */}
        {/* 🌐 雲端連線同步網路控制面板 (Pixel Art UI) */}
        {/* ========================================== */}
        {isOnlineMode && showCloudSyncPanelOnMain && (
          <div className="game-box border-[4px] border-gray-700 bg-[#ECFDF5] p-5 mb-6 shadow-[4px_4px_0px_rgba(45,55,72,1)] animate-fade-in relative text-left">
            <h3 className="text-2xl font-black text-emerald-950 tracking-wide mb-3 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span>雲端教室同步中</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
              {/* Left Column: Infos */}
              <div className="space-y-2 text-left">
                <div className="text-base font-extrabold text-emerald-900">
                  🏫 教室名稱：<span className="text-indigo-700">{className || "線上班級"}</span>
                </div>
                <div className="text-base font-extrabold text-emerald-900">
                  🔑 教室代碼：<span className="text-purple-600 font-mono font-black tracking-widest">{classCode}</span>
                </div>
                <div className="text-base font-extrabold text-emerald-900">
                  👥 已加入寶貝人數：<span className="text-blue-600 font-black">{appData.students.length} 人</span>
                </div>
                <div className="text-xs font-bold text-gray-500">
                  🔄 最近同步時間：{new Date().toLocaleTimeString()}
                </div>
                <p className="text-xs font-bold text-emerald-700 mt-2">
                  💡 學生可使用手機/平板掃描右側 QR Code 或輸入教室代碼加入，與大螢幕即時同步史萊姆！
                </p>
              </div>

              {/* Middle Column: Scrollable Student Names with green dot */}
              <div className="bg-white border-2 border-slate-300 p-3 rounded-lg text-left h-[105px] overflow-y-auto custom-scroll">
                <div className="text-xs font-black text-gray-400 mb-1.5 flex items-center justify-between border-b pb-1">
                  <span>Joined Students / 已加入學生名單</span>
                  <span>{appData.students.length}人</span>
                </div>
                {appData.students.length === 0 ? (
                  <div className="text-xs font-bold text-gray-400 text-center py-4">目前尚無學生加入</div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {appData.students.map((student) => (
                      <div key={student.id} className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 bg-emerald-50/50 hover:bg-emerald-50 p-1 rounded border border-emerald-100 truncate justify-between">
                        <span className="truncate">{student.name}</span>
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0"></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: QR Code Image and Copy Links */}
              <div className="flex bg-white/70 p-3 border-2 border-emerald-200 rounded-xl gap-4 items-center flex-wrap sm:flex-nowrap justify-between">
                <div className="flex-1 text-center sm:text-left">
                  <span className="text-xs font-black text-[#5b21b6] block mb-1">📸 掃描 QR Code 隨身玩</span>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={handleCopyLink} 
                      className="btn-game bg-purple-500 text-white text-[10px] py-1 px-2.5 font-bold hover:scale-102 flex items-center gap-1 justify-center shrink-0 shadow-none border-2 border-gray-600 cursor-pointer"
                    >
                      🔗 複製網址
                    </button>
                    <button 
                      onClick={handleCopyCode} 
                      className="btn-game bg-sky-500 text-white text-[10px] py-1 px-2.5 font-bold hover:scale-102 flex items-center gap-1 justify-center shrink-0 shadow-none border-2 border-gray-600 cursor-pointer"
                    >
                      📋 複製代碼
                    </button>
                  </div>
                </div>
                <div className="shrink-0 bg-white p-2 border-2 border-slate-300 rounded-lg flex items-center justify-center self-center mx-auto sm:mx-0">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=95x95&data=${encodeURIComponent(getJoinUrl())}`}
                    alt="Class Join QR Code"
                    className="w-[72px] h-[72px] select-none pointer-events-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 🏗️ 班級建設進度 (Class Construction Progress Panel) */}
        {appData.classConstructionData?.enabled && (
          <div 
            onClick={() => setShowClassAddonsModal(true)}
            className="game-box border-[4px] border-gray-700 bg-amber-50/90 p-4 mb-6 shadow-[4px_4px_0px_rgba(45,55,72,1)] hover:scale-[1.01] transition-all cursor-pointer relative text-left"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-amber-200 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-3xl">🏗️</span>
                <div>
                  <h3 className="text-xl font-black text-amber-900 font-sans tracking-tight">班級理想國度建設中</h3>
                  <p className="text-xs font-bold text-amber-700 mt-0.5">全班完成任務可累積「班級貢獻值」！點點看版開啟王國中心、消耗貢獻點數升級建築 🌟</p>
                </div>
              </div>
              <div className="font-black text-sm bg-amber-200 border-2 border-amber-400 text-amber-950 px-3 py-1 rounded-full flex items-center gap-1.5 self-start sm:self-center font-mono">
                <span>⭐ 班級總貢獻值：</span>
                <span className="text-lg text-indigo-700 font-black">{appData.classConstructionData?.classContribution || 0}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(appData.classConstructionData?.buildings || []).slice(0, 6).map((b: any) => {
                const percent = Math.min(100, Math.floor((b.currentExp / (b.targetExp || 100)) * 100));
                // Progress bar visual block character count (10 blocks max)
                const filledBlocks = Math.floor(percent / 10);
                const barStr = "█".repeat(filledBlocks) + "░".repeat(10 - filledBlocks);
                
                return (
                  <div key={b.id} className="bg-white border-2 border-amber-300 p-3 rounded-xl flex items-center gap-3 hover:border-amber-500 transition-colors">
                    <span className="text-3xl shrink-0">{b.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-black text-amber-950 text-sm truncate">{b.name} <span className="text-xs bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-black ml-1">LV.{b.level}</span></span>
                        <span className="text-xs font-black text-indigo-600">{b.level >= 5 ? "MAX" : `${percent}%`}</span>
                      </div>
                      <div className="font-mono text-xs text-amber-500 tracking-wider font-bold mb-1 select-none">
                        {barStr}
                      </div>
                      <div className="text-[10px] text-gray-400 font-extrabold flex justify-between">
                        <span>升級進度</span>
                        <span>{b.level >= 5 ? "已滿級" : `${b.currentExp}/${b.targetExp || 100}`} EXP</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {renderStudentSyncList()}
      </main>

      {/* 3. Footer Announcement Banner (Collapsible) */}
      <footer className="game-box border-[6px] border-gray-700 m-2 md:m-4 mt-0 shrink-0 flex flex-col overflow-hidden z-30 bg-white transition-all duration-300">
        {/* Toggle Bar / Header */}
        <div 
          onClick={toggleFooterCollapsed}
          className="bg-sky-400 text-white px-4 py-2 flex items-center justify-between border-b-2 last:border-b-0 border-gray-700 select-none cursor-pointer hover:bg-sky-500 transition-colors"
        >
          <div className="flex items-center gap-2">
            <i className={`fas ${footerCollapsed ? "fa-caret-right" : "fa-caret-down"} text-2.5xl text-yellow-300 w-5 text-center`}></i>
            <span className="text-xl font-black tracking-widest">
              📢 補充事項
            </span>
          </div>
          <span className="text-xs bg-black/15 font-bold px-2 py-0.5 rounded border border-white/20">
            {footerCollapsed ? "▶ 點擊展開" : "▼ 點擊收合"}
          </span>
        </div>

        {!footerCollapsed && (
          <div className="flex overflow-hidden h-28">
            {/* Real-time editable textbox notices */}
            <textarea
              value={appData.notes}
              onChange={(e) => {
                const val = e.target.value;
                setAppData((prev) => ({ ...prev, notes: val }));
              }}
              placeholder="老師可以在這裡輸入今日聯絡事項、黑板通知或提醒作業喔..."
              className="flex-1 p-3 text-xl font-bold bg-white text-gray-700 outline-none resize-none"
            />
          </div>
        )}
      </footer>

      {/* 8. MODAL: Main interface Timed Tasks Dashboard Overview */}
      {showMainTimedTasksPanel && (
        <div 
          className="modal-backdrop flex items-center justify-center p-4 z-[4000]"
          onClick={handleCloseMainTimedTasks}
        >
          <div 
            className="game-box bg-white p-6 max-w-3xl w-full border-[6px] border-slate-700 rounded-3xl shadow-2xl relative text-left select-none flex flex-col justify-between min-h-[500px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                console.log("限時任務 X 被點擊");
                handleCloseMainTimedTasks();
              }}
              className="close-btn text-gray-400 hover:text-gray-900 border-2 border-slate-300 rounded-lg flex items-center justify-center font-black hover:bg-slate-100"
            >
              ✕
            </button>
            
            {(() => {
              const activeTask = appData.timedTasks.find((t) => {
                if (!t.isActive) return false;
                const rem = t.startedAt 
                  ? Math.max(0, t.durationSeconds - Math.floor((Date.now() - t.startedAt) / 1000)) 
                  : t.remainingSeconds;
                return rem > 0 && !t.expired;
              });

              if (activeTask) {
                const rem = activeTask.startedAt 
                  ? Math.max(0, activeTask.durationSeconds - Math.floor((Date.now() - activeTask.startedAt) / 1000)) 
                  : activeTask.remainingSeconds;
                const percent = (rem / activeTask.durationSeconds) * 100;

                return (
                  <div className="w-full flex flex-col h-full gap-4">
                    {/* Header */}
                    <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-3">
                      <span className="text-4xl animate-bounce">⏳</span>
                      <div>
                        <h3 className="text-2xl md:text-3xl font-black text-rose-500">
                          {activeTask.title}
                        </h3>
                        <p className="text-xs font-bold text-gray-400 mt-[2px]">
                          限時閃擊任務：在倒數時間截止前，點擊你的名字登錄成果吧！
                        </p>
                      </div>
                    </div>

                    {/* Left & Right columns layout */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-5 items-stretch min-h-[300px]">
                      {/* Left: Sandglass & Countdown (Col-span-2) */}
                      <div className="md:col-span-2 flex flex-col justify-between bg-slate-900 border-[4px] border-slate-700 p-5 rounded-2xl shadow-inner relative overflow-hidden gap-4">
                        {/* Ambient background decoration */}
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/40 via-transparent to-transparent pointer-events-none"></div>

                        {/* Top: Task type badge and point value */}
                        <div className="z-10 flex flex-wrap justify-between items-center gap-2">
                          <span className="text-[10px] sm:text-xs font-black text-rose-300 bg-rose-950/50 border border-rose-800/50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                            {activeTask.type === "group" ? `👥 班級合作 (${activeTask.targetCount}人)` : "👤 個人挑戰"}
                          </span>
                          <span className="bg-amber-400 border-2 border-slate-700 text-slate-800 text-xs sm:text-sm px-3 py-1 font-extrabold rounded-lg shadow-sm">
                            獎勵 <span className="font-black text-indigo-700">+{activeTask.points}</span> 點
                          </span>
                        </div>

                        {/* Middle: Hourglass Animation */}
                        <div className="flex items-center justify-center gap-4 z-10 my-1 shrink-0">
                          {/* Hourglass Graphical (100px width) */}
                          <div className="relative w-24 h-32 border-[4px] border-amber-400 rounded-xl p-1 bg-indigo-950/30 flex flex-col justify-between overflow-hidden shrink-0 shadow-lg">
                            {/* Upper Half */}
                            <div className="w-full h-[46%] bg-indigo-900/20 rounded-t-lg relative flex items-end justify-center overflow-hidden">
                              <div 
                                className="bg-amber-400 absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-linear"
                                style={{ height: `${percent}%` }}
                              />
                            </div>

                            {/* Sand falling pipe stream */}
                            <div className="absolute top-[46%] bottom-[46%] left-1/2 -translate-x-1/2 w-1 z-10 flex flex-col justify-center">
                              {rem > 0 && (
                                <div className="w-full h-full bg-amber-400 animate-pulse" />
                              )}
                            </div>

                            {/* Bottom Half */}
                            <div className="w-full h-[46%] bg-indigo-900/20 rounded-b-lg relative flex items-end justify-center overflow-hidden">
                              <div 
                                className="bg-amber-400 absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-linear"
                                style={{ height: `${100 - percent}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Bottom: Timer text display */}
                        <div className="flex flex-col items-center justify-center space-y-1.5 z-10">
                          <span className="text-[11px] font-black tracking-widest text-slate-400 uppercase">
                            ⌛ 剩餘時間 ⌛
                          </span>
                          
                          <div 
                            className={`text-4xl sm:text-5xl font-black pixel-font tracking-widest leading-none ${
                              rem < 30 ? "text-rose-500 animate-pulse scale-102" : "text-amber-300"
                            }`}
                            style={{
                              textShadow: rem < 30 ? "0 0 16px rgba(244,63,94,0.6)" : "0 0 16px rgba(245,158,11,0.5)"
                            }}
                          >
                            {`${Math.floor(rem / 60).toString().padStart(2, "0")}:${(rem % 60).toString().padStart(2, "0")}`}
                          </div>

                          {rem < 30 ? (
                            <div className="text-rose-400 font-extrabold text-[10px] tracking-widest animate-pulse">
                              🚨 剩餘不到 30 秒！快快完成！ 🚨
                            </div>
                          ) : (
                            <div className="text-slate-400 font-bold text-[10px]">
                              請點點右側姓名完成系統登錄
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Student completion reporting zone (Col-span-3) */}
                      <div className="md:col-span-3 bg-slate-50 border-[3px] border-slate-300 rounded-2xl p-4 flex flex-col justify-between">
                        <div className="w-full">
                          <div className="text-sm font-black text-slate-600 border-b pb-1.5 mb-2 flex justify-between items-center">
                            <span>📋 點選名字完成快速回報：</span>
                            <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-black">限回報一次</span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1">
                            {(() => {
                              // Sort students alphabetically
                              const sortedStudents = [...appData.students].sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
                              
                              return sortedStudents.map((st) => {
                                const hasCompleted = activeTask.completedBy.includes(st.id);
                                return (
                                  <button
                                    key={st.id}
                                    disabled={hasCompleted}
                                    onClick={() => {
                                      // Click reporting behavior
                                      // If logged in as someone else: prevent
                                      if (currentStudentId && currentStudentId !== st.id) {
                                        setDialogConfig({
                                          show: true,
                                          title: "🔒 登錄限制",
                                          message: `此裝置目前是以【${appData.students.find(s => s.id === currentStudentId)?.name || '登入者'}】登入。\n\n為了挑戰公平性，你只能直接點擊你自己的名字【${st.name}】唷！`,
                                          type: "alert"
                                        });
                                        return;
                                      }

                                      // Ready to submit
                                      setDialogConfig({
                                        show: true,
                                        title: "❓ 確認完成任務",
                                        message: `親愛的【${st.name}】，你真的已經完成閃擊任務「${activeTask.title}」了嗎？\n\n（確認後無法取消，並將立即為你注入 +${activeTask.points} 點數獎勵喔！）`,
                                        type: "confirm",
                                        onConfirm: () => {
                                          handleQuickReportTimedTask(activeTask.id, st.id);
                                        }
                                      });
                                    }}
                                    className={`group flex items-center gap-1.5 p-2 rounded-xl border-2 transition-all text-sm font-black text-left truncate relative ${
                                      hasCompleted
                                        ? "bg-emerald-50 border-emerald-400 text-emerald-800 opacity-90"
                                        : "bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-700 active:scale-95 shadow-sm cursor-pointer"
                                    }`}
                                  >
                                    <span className={`text-base shrink-0 select-none ${hasCompleted ? "text-emerald-500 font-extrabold" : "text-slate-300 group-hover:text-indigo-400"}`}>
                                      {hasCompleted ? "☑" : "☐"}
                                    </span>
                                    <span className="truncate flex-1">{st.name}</span>
                                    {hasCompleted && (
                                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-1 rounded scale-90 whitespace-nowrap">
                                        已完成
                                      </span>
                                    )}
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        </div>

                        {/* Extra note inside Right Area */}
                        <div className="mt-3 text-[10px] text-gray-400 font-bold leading-tight bg-white border border-slate-200 rounded-lg p-2">
                          💡 點擊任何同學姓名即可提報；若以個人登入狀態下，將被限制只能點自己。提報後將即刻獲得點數並更新進度！
                        </div>
                      </div>
                    </div>

                    <div className="border-t-2 border-dashed border-gray-200 my-1"></div>

                    {/* Progress representation: Completed: 18 / 25 */}
                    <div className="bg-indigo-50 border-[3px] border-indigo-200 p-4 rounded-xl font-bold">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                        <div className="text-lg font-black text-indigo-900 flex items-center gap-2">
                          <span>🎯 挑戰完成進度：</span>
                          <span className="text-3xl font-black text-[#10B981] animate-pulse">
                            {activeTask.completedBy.length}
                          </span>
                          <span className="text-slate-400 mx-1">/</span>
                          <span className="text-xl text-slate-600">
                            {appData.students.length} 人
                          </span>
                        </div>
                        <div className="text-xs font-black text-indigo-500 bg-indigo-100/50 px-2.5 py-1 rounded-full border border-indigo-200/50">
                          {activeTask.completedBy.length === appData.students.length 
                            ? "🎉 全班全員達標！🏆" 
                            : `剩餘 ${appData.students.length - activeTask.completedBy.length} 位同學努力中`}
                        </div>
                      </div>
                      
                      {/* Visual progress bar */}
                      <div className="w-full bg-slate-200 rounded-full h-4 mt-2.5 overflow-hidden border-2 border-slate-400">
                        <div 
                          className="bg-gradient-to-r from-emerald-400 to-[#10B981] h-full transition-all duration-500 ease-out" 
                          style={{ width: `${(activeTask.completedBy.length / (appData.students.length || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              }

              // Normal/fallback view: show the static timed tasks list
              return (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-4xl">⚡</span>
                    <h3 className="text-3xl font-black text-slate-800">限時閃擊任務看板</h3>
                  </div>

                  {appData.timedTasks.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border-2 border-slate-300 border-dashed rounded-2xl">
                      <p className="text-xl font-bold text-gray-500">教室裡目前沒有發布任何限時任務唷！🍵</p>
                      <p className="text-xs text-gray-400 mt-2">（教師後台 ＞ 限定活動 ＞ 可以隨時發起或修改限時閃擊任務喔！）</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scroll">
                      {appData.timedTasks.map((t) => {
                        const rem = t.isActive && t.startedAt 
                          ? Math.max(0, t.durationSeconds - Math.floor((Date.now() - t.startedAt) / 1000)) 
                          : t.remainingSeconds;
                        const expired = rem <= 0 || t.expired;
                        
                        return (
                          <div
                            key={t.id}
                            className={`game-box p-4 border-[3px] rounded-2xl relative overflow-hidden flex flex-col gap-3 ${
                              t.isActive && !expired
                                ? "border-red-400 bg-red-50/40"
                                : expired
                                ? "border-gray-300 bg-slate-50/50"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <span className={`text-xs px-2 py-0.5 rounded border-2 font-black ${
                                  t.type === "group" 
                                    ? "bg-purple-100 border-purple-400 text-purple-800" 
                                    : "bg-sky-100 border-sky-400 text-sky-800"
                                }`}>
                                  {t.type === "group" ? `👥 班級團體目標 (${t.targetCount}人)` : "👤 個人精進挑戰"}
                                </span>
                                <h4 className="text-2xl font-black text-slate-800 mt-1.5">{t.title}</h4>
                              </div>
                              <div className="text-right">
                                <span className="text-orange-500 font-black text-xl block">+{t.points} 點數</span>
                              </div>
                            </div>

                            {/* Display Clock */}
                            <div className="flex items-center gap-4 bg-slate-100 border-2 border-slate-300 p-3 rounded-xl">
                              <div className="text-4xl">⏰</div>
                              <div className="flex-1">
                                <div className="text-xs font-bold text-gray-400">剩餘倒數計時</div>
                                <div className={`text-4xl font-black pixel-font tracking-widest ${
                                  expired ? "text-gray-450" : rem < 30 ? "text-red-600 animate-pulse" : "text-slate-800"
                                }`}>
                                  {expired ? "Challenge Ended" : `${Math.floor(rem / 60).toString().padStart(2, "0")}:${(rem % 60).toString().padStart(2, "0")}`}
                                </div>
                              </div>
                              <div>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-black border ${
                                  expired 
                                    ? "bg-gray-100 border-gray-300 text-gray-500" 
                                    : t.isActive 
                                    ? "bg-red-100 border-red-300 text-red-700 animate-pulse" 
                                    : "bg-yellow-100 border-yellow-300 text-yellow-700"
                                }`}>
                                  {expired ? "● 挑戰截止" : t.isActive ? "● 進行中" : "● 待命中"}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* 8. OVERLAY: Score float tags list renderer */}
      <div className="fixed inset-0 pointer-events-none z-[8000]">
        {floatingTexts.map((f) => {
          let extraColorClasses = "border-blue-400 text-blue-500";
          if (f.styleType === "minus") extraColorClasses = "border-red-400 text-red-500";
          if (f.styleType === "save") extraColorClasses = "border-green-400 text-green-500";

          return (
            <div
              key={f.id}
              style={{ left: f.x - 50, top: f.y - 30 }}
              className={`floating-point bg-white px-5 py-2 rounded-2xl border-[4px] font-black ${extraColorClasses}`}
            >
              {f.text}
            </div>
          );
        })}
      </div>

      {/* 10. OVERLAY: Sizzling Pixel Summoner Lucky Random Picker */}
      {(luckyDrawOpen || luckyDrawActive || luckyDrawWinner) && (
        <div className="modal-backdrop flex items-center justify-center p-4 bg-slate-900/85 z-[9500]">
          <div className="game-box bg-white w-full max-w-md p-6 border-[6px] text-center flex flex-col items-center relative overflow-hidden shadow-2xl">
            {/* Ambient magic circle glows */}
            <div className="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-yellow-300/10 blur-xl"></div>
            <div className="absolute -bottom-12 -right-12 w-32 h-32 rounded-full bg-purple-500/10 blur-xl"></div>

            {/* Mode Selector Tabs (only visible when not active or resolved) */}
            {!luckyDrawActive && !luckyDrawWinner && generatedGroups.length === 0 && (
              <div className="flex border-4 border-slate-200 bg-slate-100 rounded-xl overflow-hidden mb-5 p-1 gap-1 w-full">
                <button
                  type="button"
                  onClick={() => setLuckyDrawMode("single")}
                  className={`flex-1 py-1.5 text-center text-sm font-black rounded-lg transition-all cursor-pointer ${
                    luckyDrawMode === "single"
                      ? "bg-purple-600 text-white shadow"
                      : "text-gray-500 hover:text-gray-850"
                  }`}
                >
                  👤 抽單人
                </button>
                <button
                  type="button"
                  onClick={() => setLuckyDrawMode("group")}
                  className={`flex-1 py-1.5 text-center text-sm font-black rounded-lg transition-all cursor-pointer ${
                    luckyDrawMode === "group"
                      ? "bg-purple-600 text-white shadow"
                      : "text-gray-500 hover:text-gray-850"
                  }`}
                >
                  👥 抽小組
                </button>
              </div>
            )}

            {luckyDrawMode === "single" && (
              <div className="w-full flex flex-col items-center">
                <h2 className="text-3xl font-black mb-5 text-purple-600 tracking-wider flex items-center gap-2">
                  🔮 史萊姆單人召喚儀式 🔮
                </h2>

                {/* Spinner Glass viewport */}
                <div className="w-full bg-slate-50 border-[4px] border-gray-700 p-6 rounded-2xl mb-6 flex flex-col items-center justify-center min-h-[200px] relative shadow-inner">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-3.5 bg-orange-500 border-b-2 border-gray-700 rounded-b-md"></div>
                  
                  {luckyDrawWinner && (
                    <div className="w-24 h-24 mb-3 slime-idle drop-shadow-lg">
                      <div
                        className="w-full h-full"
                        dangerouslySetInnerHTML={{ __html: generateDetailedSlimeSVG(luckyDrawWinner) }}
                      />
                    </div>
                  )}

                  <div 
                    className={`text-5xl font-black truncate max-w-full ${
                      luckyDrawActive 
                        ? "text-[#F43F5E] animate-pulse scale-102" 
                        : "text-indigo-600 scale-105"
                    } transition-all duration-75`}
                    style={{
                      textShadow: luckyDrawActive ? "none" : "2px 2px 0px #e0e7ff"
                    }}
                  >
                    {luckyDrawName || "點擊「召喚」開始"}
                  </div>

                  {luckyDrawActive && (
                    <span className="text-xs font-bold text-gray-400 mt-4 tracking-widest animate-bounce">
                      ⚡ 凝聚古老召喚能量中 ⚡
                    </span>
                  )}

                  {luckyDrawWinner && (
                    <span className="text-sm font-black text-rose-500 mt-4 tracking-wider bg-rose-50 px-4 py-1 rounded-full border border-rose-100 animate-bounce">
                      🌟 恭喜幸運之星誕生！ 🌟
                    </span>
                  )}
                </div>

                {/* Verdict Options (Correct / Incorrect) */}
                {luckyDrawWinner && !luckyDrawActive && (
                  <div className="flex gap-4 w-full mb-5">
                    <button
                      onClick={handleCorrectAnswer}
                      className="flex-1 btn-game bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black py-3 rounded-xl border-[4px] border-gray-700 shadow-[2px_2px_0px_#065f46] text-lg flex items-center justify-center gap-1 cursor-pointer"
                    >
                      ✅ 回答正確 +10
                    </button>
                    <button
                      onClick={handleWrongAnswer}
                      className="flex-1 btn-game bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-black py-3 rounded-xl border-[4px] border-gray-700 shadow-[2px_2px_0px_#9f1239] text-lg flex items-center justify-center gap-1 cursor-pointer"
                    >
                      ❌ 回答錯誤 +0
                    </button>
                  </div>
                )}

                {/* Actions panel */}
                <div className="flex gap-4 w-full">
                  <button
                    onClick={() => {
                      setLuckyDrawWinner(null);
                      setLuckyDrawActive(false);
                      setLuckyDrawOpen(false);
                      setLuckyDrawName("");
                    }}
                    disabled={luckyDrawActive}
                    className={`flex-1 btn-game text-lg px-4 py-2.5 shadow-none ${
                      luckyDrawActive ? "bg-gray-100 text-gray-400 border-gray-400 cursor-not-allowed" : "bg-gray-200 text-gray-800 hover:scale-103"
                    }`}
                  >
                    關閉
                  </button>
                  
                  <button
                    onClick={startLuckyDraw}
                    disabled={luckyDrawActive}
                    className={`flex-1 btn-game text-lg px-4 py-2.5 text-white shadow-none ${
                      luckyDrawActive 
                        ? "bg-gray-400 border-gray-500 cursor-not-allowed" 
                        : "bg-[#F43F5E] hover:bg-[#E11D48] hover:scale-103 active:scale-97"
                    }`}
                  >
                    {luckyDrawWinner ? "🔄 再選一次" : "召喚單人"}
                  </button>
                </div>
              </div>
            )}

            {luckyDrawMode === "group" && (
              <div className="w-full flex flex-col items-center">
                <h2 className="text-3xl font-black mb-4 text-[#7C3AED] tracking-wider">
                  👥 史萊姆自訂小組召喚 👥
                </h2>

                {/* Setup or Active spinning */}
                {!luckyDrawActive && !luckyGroupWinner && (
                  <div className="w-full bg-slate-50 border-[4px] border-gray-700 p-5 rounded-2xl mb-5 text-center shadow-inner">
                    <span className="block text-sm font-extrabold text-gray-500 mb-3">
                      🎲 系統將隨機抽出一個目前班上有組員的小組氣化登場！
                    </span>
                    
                    {appData.groups.length === 0 ? (
                      <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
                        <p className="text-xs font-black text-orange-700 leading-relaxed">
                          ⚠️ 班上目前還沒有建立任何分組喔！<br />
                          請先至【教師主控台 ＞ 學生與小組管理】建立小組別並加入成員，再回來進行召喚！
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-indigo-50 border-2 border-indigo-200 rounded-xl">
                        <p className="text-xs font-black text-indigo-750">
                          目前已登記的自訂小組數：<strong className="text-indigo-600 font-extrabold text-sm">{appData.groups.length}</strong> 個小組
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Spinning view or Landed winner */}
                {(luckyDrawActive || luckyGroupWinner) && (
                  <div className="w-full bg-slate-50 border-[4px] border-indigo-200 p-5 rounded-2xl mb-5 min-h-[180px] flex flex-col items-center justify-center relative shadow-inner">
                    {luckyDrawActive ? (
                      <div className="flex flex-col items-center py-4">
                        <div className="w-14 h-14 border-t-4 border-indigo-600 border-solid rounded-full animate-spin mb-4"></div>
                        <span className="text-2xl font-black text-indigo-600 animate-pulse">{luckyDrawName}</span>
                      </div>
                    ) : luckyGroupWinner ? (
                      <div className="w-full space-y-4 text-left">
                        <div className="text-center">
                          <span className="text-xs font-extrabold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full animate-bounce inline-block">
                            🎉 幸運小組降臨！ 🎉
                          </span>
                          <h4 className="text-4xl font-extrabold text-purple-700 mt-2 text-center tracking-wider" style={{ textShadow: "1px 1px 0px #e0e7ff" }}>
                            ⚜ {luckyGroupWinner.name}
                          </h4>
                        </div>
                        
                        <div className="bg-white border-2 border-slate-200 p-3.5 rounded-xl">
                          <span className="text-[11px] font-black text-slate-400 block mb-2 border-b pb-1">👥 組員名單：</span>
                          {luckyGroupWinner.members.length === 0 ? (
                            <span className="text-xs text-slate-500 italic font-bold block text-center">此組內目前沒有任何學生組員 🍵</span>
                          ) : (
                            <div className="flex flex-wrap gap-2 justify-center">
                              {luckyGroupWinner.members.map((mName, mIdx) => (
                                <span key={mIdx} className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-black">
                                  {mName}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3 w-full mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLuckyDrawWinner(null);
                      setLuckyGroupWinner(null);
                      setLuckyDrawActive(false);
                      setLuckyDrawOpen(false);
                    }}
                    disabled={luckyDrawActive}
                    className="flex-1 btn-game text-sm py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 shadow-none font-black"
                  >
                    關閉
                  </button>

                  <button
                    type="button"
                    onClick={startGroupLuckyDraw}
                    disabled={luckyDrawActive || appData.groups.length === 0}
                    className={`flex-1 btn-game text-sm py-2.5 text-white shadow-none font-black ${
                      luckyDrawActive || appData.groups.length === 0
                        ? "bg-gray-400 border-gray-500 cursor-not-allowed" 
                        : "bg-purple-600 hover:bg-purple-700 hover:scale-103 active:scale-97"
                    }`}
                  >
                    {luckyGroupWinner ? "🔄 再抽一組" : "🎲 開始抽小組"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🟢 OVERLAY: 教師建立/還原線上班級對話框 */}
      {showTeacherCreateModal && (
        <div className="modal-backdrop flex items-center justify-center p-4 bg-slate-900/80 z-[8500]">
          <div className="game-box bg-white p-6 max-w-sm w-full flex flex-col shadow-2xl border-[6px] border-gray-700">
            {/* Tab Swappers */}
            <div className="flex border-4 border-gray-700 bg-gray-100 rounded-xl overflow-hidden mb-6 p-1 gap-1">
              <button
                type="button"
                onClick={() => setTeacherModalMode("create")}
                className={`flex-1 py-1.5 text-center text-xs font-black rounded-lg transition-all cursor-pointer ${
                  teacherModalMode === "create"
                    ? "bg-amber-400 text-gray-900 shadow-sm border border-amber-500"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                ➕ 建立新班級
              </button>
              <button
                type="button"
                onClick={() => setTeacherModalMode("join")}
                className={`flex-1 py-1.5 text-center text-xs font-black rounded-lg transition-all cursor-pointer ${
                  teacherModalMode === "join"
                    ? "bg-sky-400 text-gray-900 shadow-sm border border-sky-500"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                🔌 進入既有班級
              </button>
            </div>

            {teacherModalMode === "create" ? (
              <div className="text-center flex flex-col">
                <h3 className="text-3xl font-black mb-2 text-amber-500">
                  🏫 建立學堂線上班級
                </h3>
                <p className="text-sm font-bold text-gray-400 mb-4">輸入您想要建立的班級名稱，系統會自動在雲端註冊此班級實體。</p>
                
                <input
                  type="text"
                  placeholder="例如：三年甲班、自然研習社"
                  value={createClassNameInput}
                  onChange={(e) => setCreateClassNameInput(e.target.value)}
                  className="p-3 border-4 border-gray-700 rounded-xl text-xl font-bold text-center mb-6 outline-none bg-indigo-50/20"
                />

                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => {
                      setShowTeacherCreateModal(false);
                      setCreateClassNameInput("");
                    }}
                    disabled={isSyncing}
                    className="btn-game bg-gray-300 px-6 py-2 text-lg shadow-none"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateOnlineClass}
                    disabled={isSyncing}
                    className="btn-game bg-green-500 text-white px-6 py-2 text-lg shadow-none font-black animate-pulse"
                  >
                    {isSyncing ? "建立中..." : "💾 建立班級"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                <h3 className="text-3xl font-black mb-2 text-[#0284C7] text-center">
                  🔌 進入既有雲端班級
                </h3>
                <p className="text-sm font-bold text-gray-400 mb-4 text-center">輸入班級代碼與教師認證密碼以進入既有學堂教室。</p>
                
                <div className="flex flex-col gap-3 text-left mb-6">
                  <div>
                    <label className="text-xs font-black text-gray-500 block mb-1">🔑 班級代碼 (classCode)：</label>
                    <input
                      type="text"
                      placeholder="請輸入 6 碼大寫代碼"
                      maxLength={6}
                      value={existingClassCodeInput}
                      onChange={(e) => setExistingClassCodeInput(e.target.value.toUpperCase())}
                      className="p-3 w-full border-4 border-gray-700 rounded-xl text-xl font-black text-center outline-none bg-sky-50/20 uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-gray-500 block mb-1">🔒 教師管理認證密碼：</label>
                    <input
                      type="password"
                      placeholder="預設為 0301"
                      value={existingTeacherPasscodeInput}
                      onChange={(e) => setExistingTeacherPasscodeInput(e.target.value)}
                      className="p-3 w-full border-4 border-gray-700 rounded-xl text-xl font-black text-center outline-none bg-sky-50/20"
                    />
                  </div>
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => {
                      setShowTeacherCreateModal(false);
                      setExistingClassCodeInput("");
                      setExistingTeacherPasscodeInput("");
                    }}
                    disabled={isSyncing}
                    className="btn-game bg-gray-300 px-6 py-2 text-lg shadow-none"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleJoinExistingOnlineClass}
                    disabled={isSyncing}
                    className="btn-game bg-sky-500 text-white px-6 py-2 text-lg shadow-none font-black"
                  >
                    {isSyncing ? "進入中..." : "🔌 還原班級"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🎒 OVERLAY: 學生輸入代碼加入線上班級 */}
      {showStudentJoinModal && (
        <div className="modal-backdrop flex items-center justify-center p-4 bg-slate-900/80 z-[8500]">
          <div className="game-box bg-white p-8 max-w-sm w-full flex flex-col text-center shadow-2xl border-[6px] border-gray-700">
            <h3 className="text-3xl font-black mb-4 text-sky-500">
              🎒 加入雲端班級課堂
            </h3>
            <p className="text-sm font-bold text-gray-400 mb-4">請輸入 6 碼大寫班級代碼，並填寫您的姓名以同步召喚角色！</p>
            
            <div className="flex flex-col gap-3 text-left mb-6">
              <div>
                <label className="text-xs font-black text-gray-500 block mb-1">🔑 班級六碼代碼：</label>
                <input
                  type="text"
                  placeholder="請輸入大寫代碼"
                  maxLength={6}
                  value={joinClassCodeInput}
                  onChange={(e) => setJoinClassCodeInput(e.target.value.toUpperCase())}
                  className="p-3 w-full border-4 border-gray-700 rounded-xl text-xl font-black text-center outline-none bg-sky-50/20 uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-black text-gray-500 block mb-1">👤 學生中文姓名：</label>
                <input
                  type="text"
                  placeholder="請輸入中文姓名"
                  value={joinStudentNameInput}
                  onChange={(e) => setJoinStudentNameInput(e.target.value)}
                  className="p-3 w-full border-4 border-gray-700 rounded-xl text-xl font-black text-center outline-none bg-sky-50/20"
                />
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  setShowStudentJoinModal(false);
                  setJoinClassCodeInput("");
                  setJoinStudentNameInput("");
                }}
                disabled={isSyncing}
                className="btn-game bg-gray-300 px-6 py-2 text-lg shadow-none"
              >
                關閉
              </button>
              <button
                onClick={handleJoinOnlineClass}
                disabled={isSyncing}
                className="btn-game bg-sky-500 text-white px-6 py-2 text-lg shadow-none font-black"
              >
                {isSyncing ? "連線中..." : "🎒 加入班級"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📷 OVERLAY: 顯現班級 QR Code 下載與加入連結 */}
      {showQRModal && (
        <div className="modal-backdrop flex items-center justify-center p-4 bg-slate-900/80 z-[8500]">
          <div className="game-box bg-white p-6 max-w-md w-full flex flex-col items-center text-center shadow-2xl border-[6px] border-purple-500">
            <h3 className="text-2xl font-black mb-1 text-purple-600">
              📸 學生專屬大螢幕掃描器
            </h3>
            <p className="text-sm font-bold text-gray-400 mb-4">使用手機相機掃描下方二維碼，即可直接在行動端暢玩！</p>
            
            {/* Retro Border Pixel Photo Frame */}
            <div className="game-box border-[4px] border-gray-800 p-4 bg-slate-50 flex items-center justify-center rounded-2xl mb-4 self-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getJoinUrl())}`}
                alt="Class Join QR Code"
                className="w-48 h-48 select-none border-2 border-gray-300 pointer-events-none drop-shadow-sm"
              />
            </div>

            <div className="text-sm font-bold text-gray-500 mb-2">
              班級代碼：<span className="text-2xl font-black text-purple-600 tracking-widest">{classCode}</span>
            </div>

            <p className="text-xs text-gray-400 font-bold mb-6 break-all max-w-full px-4 bg-gray-50 py-2 rounded-lg border border-gray-200">
              {getJoinUrl()}
            </p>

            <div className="flex gap-4 w-full">
              <button
                onClick={() => setShowQRModal(false)}
                className="flex-1 btn-game bg-gray-300 py-2.5 text-base shadow-none font-black"
              >
                返回
              </button>
              <button
                onClick={handleCopyLink}
                className="flex-1 btn-game bg-purple-500 text-white py-2.5 text-base shadow-none font-black hover:scale-102"
              >
                📋 複製加入連結
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎨 TEACHER PANEL SCREEN OVERLAY */}
      {teacherPanelShow && (
        <SafeRenderWrapper
          fallbackTitle="教師管理後台"
          onReset={() => setTeacherPanelShow(false)}
        >
          <TeacherPanel
            appData={appData}
            setAppData={setAppData}
            onClose={() => setTeacherPanelShow(false)}
            showDialog={(params) => setDialogConfig({ show: true, ...params })}
            showSuccess={triggerFloatingText}
            gainPetExp={gainPetExp}
            triggerNewDay={triggerNewDay}
            isOnlineMode={isOnlineMode}
            classCode={classCode || ""}
            className={className || "線上班級"}
            onCreateClass={async (name) => {
              const code = await createClass(name);
              setClassCode(code);
              setClassName(name);
              setIsOnlineMode(true);
              localStorage.setItem("active_class_code", code);
              localStorage.setItem("active_class_name", name);
              return code;
            }}
            onExitOnlineMode={handleExitOnlineMode}
            getJoinUrl={getJoinUrl}
            handleCopyCode={handleCopyCode}
            handleCopyLink={handleCopyLink}
            showCloudSyncPanelOnMain={showCloudSyncPanelOnMain}
            toggleShowCloudSyncPanelOnMain={(val) => {
              setShowCloudSyncPanelOnMain(val);
              localStorage.setItem("showCloudSyncPanelOnMain", String(val));
              if (isOnlineMode && classCode && isFirebaseReady) {
                saveClassSettings(classCode, { showCloudSyncPanelOnMain: val }).catch(e => console.error("Failed to save settings:", e));
              }
            }}
            isFirebaseReady={isFirebaseReady}
            onReconnectLastClassroom={handleReconnectLastClassroom}
            onLoadExistingClass={handleTeacherLoadExistingClass}
            autoSave={autoSave}
          />
        </SafeRenderWrapper>
      )}

      {/* 🎨 STUDENT PROFILE MODAL OVERLAY */}
      {studentModalId && (
        <SafeRenderWrapper
          fallbackTitle="學生個人介面"
          onReset={() => setStudentModalId(null)}
        >
          <StudentModal
            studentId={studentModalId}
            appData={appData}
            setAppData={setAppData}
            onClose={() => setStudentModalId(null)}
            showDialog={(params) => setDialogConfig({ show: true, ...params })}
            showSuccess={triggerFloatingText}
            gainPetExp={gainPetExp}
            autoSave={autoSave}
          />
        </SafeRenderWrapper>
      )}

      {/* 🏗️ CLASS IDEAL LAND ADDON MODAL OVERLAY */}
      {showClassAddonsModal && (
        <ClassAddonsModal
          isOpen={showClassAddonsModal}
          onClose={() => setShowClassAddonsModal(false)}
          appData={appData}
          setAppData={setAppData}
          showSuccess={triggerFloatingText}
          currentStudentId={studentModalId}
        />
      )}

      {/* 🔐 TEACHER PIN VERIFICATION OVERLAY */}
      {teacherLoginShow && (
        <div className="modal-backdrop flex items-center justify-center p-4 bg-slate-900/85 z-[8900]">
          <div className="game-box bg-white p-6 max-w-sm w-full flex flex-col shadow-2xl border-[6px] border-violet-600 rounded-3xl">
            <div className="text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center mb-4 border-4 border-violet-500 text-3xl">
                🔑
              </div>
              <h3 className="text-2xl font-black mb-1 text-violet-700">
                教師權限驗證
              </h3>
              <p className="text-sm font-bold text-gray-400 mb-6">
                請輸入教師專用管理密碼以存取後台
              </p>
              
              <div className="w-full mb-6 text-left">
                <label className="text-xs font-black text-gray-500 block mb-2">🔒 管理認證密碼：</label>
                <input
                  type="password"
                  placeholder="預設為 0301"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleVerifyPin();
                  }}
                  className="p-3 w-full border-4 border-gray-700 rounded-xl text-xl font-black text-center outline-none bg-sky-50/20 focus:border-violet-600 focus:ring-4 focus:ring-violet-200 transition-all text-gray-800"
                  autoFocus
                />
              </div>

              <div className="flex justify-center gap-4 w-full">
                <button
                  onClick={() => {
                    setTeacherLoginShow(false);
                    setPinInput("");
                  }}
                  className="btn-game flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2.5 text-base shadow-none font-bold rounded-xl border-2 border-gray-400 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleVerifyPin}
                  className="btn-game flex-1 bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 text-base shadow-none font-black rounded-xl border-2 border-violet-800 transition-all"
                >
                  認證登入
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. OVERLAY: Confirmation / alert dialog box */}
      {dialogConfig && dialogConfig.show && (
        <div className="modal-backdrop flex items-center justify-center p-4 bg-slate-900/70 z-[9000]">
          <div className="game-box bg-white p-6 max-w-md w-full flex flex-col text-center shadow-2xl border-[6px]">
            <h3 className={`text-3xl font-black mb-4 ${dialogConfig.titleColor || "text-gray-800"}`}>
              {dialogConfig.title}
            </h3>
            <p className="text-xl font-bold mb-6 text-gray-600 whitespace-pre-line leading-relaxed">
              {dialogConfig.message}
            </p>
            <div className="flex justify-center gap-4">
              {dialogConfig.type === "confirm" ? (
                <>
                  <button
                    onClick={() => setDialogConfig(null)}
                    className="btn-game bg-gray-300 px-6 py-2 text-xl shadow-none"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      setDialogConfig(null);
                      if (dialogConfig.onConfirm) dialogConfig.onConfirm();
                    }}
                    className="btn-game bg-red-500 text-white px-6 py-2 text-xl shadow-none animate-pulse"
                  >
                    確認
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setDialogConfig(null)}
                  className="btn-game bg-yellow-400 px-10 py-2 text-2xl font-black shadow-none hover:scale-105"
                >
                  知道囉
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
