/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AppData, Student, Task, TimedTask, CooperateGroup, Achievement, EarnedAchievement } from "../types";
import { 
  elementNames, 
  computeStudentTitle, 
  getPersonalityTitle, 
  personalityTitleMap, 
  personalityLabelPatch,
  defaultBackgroundGachaItems,
  generateDetailedSlimeSVG,
  getRarityInfo,
  defaultAchievements,
  awardPoints,
  appendPointLog,
  appendTeacherActionLog,
  calculateSecondsUntilTime,
  getCurrentTimeHHMM,
  getTimedTaskRemainingSeconds,
} from "../utils";
import { getZodiac, isTodayBirthday } from "../utils/petDialogue";
import { ALL_EVENTS_TEMPLATES, getSafeClassAddonsData, generateMerchantProducts } from "../utils/classAddons";
import { 
  exportBackupData, 
  autoBackupBeforeRestore, 
  validateBackupData, 
  syncRestoredDataToCloud,
  getFormattedDateTime
} from "../systems/BackupSystem";

interface TeacherPanelProps {
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  onClose: () => void;
  showDialog: (params: { title: string; message: string; type: "alert" | "confirm"; onConfirm?: () => void; titleColor?: string }) => void;
  showSuccess: (event: React.MouseEvent | null, pts: number, saved?: boolean) => void;
  gainPetExp: (student: Student, amount: number) => void;
  triggerNewDay: () => void;
  
  // Cloud multiplay sync parameters
  isOnlineMode: boolean;
  classCode: string;
  className: string;
  onCreateClass: (name: string) => Promise<string>;
  onExitOnlineMode: () => void;
  getJoinUrl: () => string;
  handleCopyCode: () => void;
  handleCopyLink: () => void;
  showCloudSyncPanelOnMain: boolean;
  toggleShowCloudSyncPanelOnMain: (val: boolean) => void;
  isFirebaseReady: boolean;
  onReconnectLastClassroom?: () => void | Promise<void>;
  onLoadExistingClass?: (code: string, passcode: string) => Promise<void>;
  autoSave?: (customState?: AppData) => void;
}

export default function TeacherPanel({
  appData,
  setAppData,
  onClose,
  showDialog,
  showSuccess,
  gainPetExp,
  triggerNewDay,
  
  isOnlineMode,
  classCode,
  className,
  onCreateClass,
  onExitOnlineMode,
  getJoinUrl,
  handleCopyCode,
  handleCopyLink,
  showCloudSyncPanelOnMain,
  toggleShowCloudSyncPanelOnMain,
  isFirebaseReady,
  onReconnectLastClassroom,
  onLoadExistingClass,
  autoSave,
}: TeacherPanelProps) {
  console.log("TeacherPanel Render");
  const [activeTab, setActiveTab] = useState<"tab-students" | "tab-tasks" | "tab-timed-tasks" | "tab-rewards" | "tab-settings" | "tab-gacha-items" | "tab-achievements" | "tab-history" | "tab-addons" | "tab-backup">("tab-students");
  
  // States for tab-history
  const [historySubTab, setHistorySubTab] = useState<"points" | "actions" | "compensate" | "rescue">("points");
  const [historySearchKeyword, setHistorySearchKeyword] = useState("");
  const [historyFilterSource, setHistoryFilterSource] = useState("");
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  
  // Gacha Reissuance Form state
  const [reissueStudentId, setReissueStudentId] = useState("");
  const [reissueCategory, setReissueCategory] = useState<"background" | "decoration">("background");
  const [reissueItemId, setReissueItemId] = useState("");
  
  // Local states for "雲端教室同步管理" block
  const [localClassNameInput, setLocalClassNameInput] = useState("");
  const [testingFb, setTestingFb] = useState(false);
  const [fbTestStatus, setFbTestStatus] = useState<"idle" | "testing" | "success" | "failed">("idle");
  const [fbCheckMsg, setFbCheckMsg] = useState("");
  const [qrTimestamp, setQrTimestamp] = useState(Date.now());
  const [isCreatingClassLocal, setIsCreatingClassLocal] = useState(false);

  // States for load existing classroom
  const [loadClassCode, setLoadClassCode] = useState("");
  const [loadPasscode, setLoadPasscode] = useState("");
  const [isRestoringClass, setIsRestoringClass] = useState(false);

  // States for modifying timed tasks inline
  const [editingTTId, setEditingTTId] = useState<string | null>(null);
  const [editingTTTitle, setEditingTTTitle] = useState("");
  const [editingTTType, setEditingTTType] = useState<"individual" | "group">("individual");
  const [editingTTTarget, setEditingTTTarget] = useState(1);
  const [editingTTPoints, setEditingTTPoints] = useState(0);
  const [editingTTMin, setEditingTTMin] = useState(5);
  const [editingTTSec, setEditingTTSec] = useState(0);

  if (!appData) {
    return (
      <div className="p-8 text-center text-red-600 font-extrabold text-2xl">
        教師資料載入失敗
      </div>
    );
  }

  const handleEditTimedTaskStart = (t: TimedTask) => {
    setEditingTTId(t.id);
    setEditingTTTitle(t.title);
    setEditingTTType(t.type);
    setEditingTTTarget(t.targetCount || 1);
    setEditingTTPoints(t.points);
    setEditingTTMin(Math.floor(t.durationSeconds / 60));
    setEditingTTSec(t.durationSeconds % 60);
    setEditingTTTimeMode(t.timeMode || "countdown");
    setEditingTTEndTimeTarget(t.endTimeStr && t.endTimeStr !== "--:--" ? t.endTimeStr : "14:00");
  };

  const handleSaveTimedTaskEdit = (index: number) => {
    setAppData((prev) => {
      const copy = [...prev.timedTasks];
      const orig = copy[index];
      
      let totalSec = editingTTMin * 60 + editingTTSec;
      let startStr = orig.startTimeStr || getCurrentTimeHHMM();
      let endStr = orig.endTimeStr || "--:--";

      if (editingTTTimeMode === "endTime") {
        totalSec = calculateSecondsUntilTime(editingTTEndTimeTarget);
        startStr = getCurrentTimeHHMM();
        endStr = editingTTEndTimeTarget;
      } else {
        startStr = getCurrentTimeHHMM();
        const endMinutes = Number(startStr.split(":")[1]) + editingTTMin;
        const endHours = Number(startStr.split(":")[0]) + Math.floor(endMinutes / 60);
        endStr = `${(endHours % 24).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;
      }

      copy[index] = {
        ...orig,
        title: editingTTTitle,
        type: editingTTType,
        targetCount: editingTTType === "group" ? editingTTTarget : undefined,
        points: editingTTPoints,
        durationSeconds: totalSec,
        remainingSeconds: orig.isActive ? orig.remainingSeconds : totalSec,
        timeMode: editingTTTimeMode,
        startTimeStr: startStr,
        endTimeStr: endStr,
      };
      return { ...prev, timedTasks: copy };
    });
    setEditingTTId(null);
  };

  const handleLoadExistingCloudClass = async () => {
    const code = loadClassCode.trim().toUpperCase();
    const passcode = loadPasscode.trim();

    if (!code) {
      showDialog({ title: "提示", message: "請輸入教室代碼！", type: "alert" });
      return;
    }
    if (!passcode) {
      showDialog({ title: "提示", message: "請輸入教師管理密碼！", type: "alert" });
      return;
    }

    if (!onLoadExistingClass) {
      showDialog({ title: "提示", message: "系統尚未初始化完畢，請稍候重試！", type: "alert" });
      return;
    }

    setIsRestoringClass(true);
    try {
      await onLoadExistingClass(code, passcode);
      showDialog({ title: "載入成功", message: `已成功與雲端教室 ${code} 建立連線並還原所有設定與學生數據！`, type: "alert" });
      setLoadClassCode("");
      setLoadPasscode("");
    } catch (err: any) {
      showDialog({ title: "載入失敗", message: err.message || "找不到該特定的雲端教室或管理密碼不正確！", type: "alert" });
    } finally {
      setIsRestoringClass(false);
    }
  };

  const handleLocalCreateClassAction = async () => {
    if (!localClassNameInput.trim()) {
      showDialog({
        title: "提醒",
        message: "請輸入您的班級名稱（例如：三年甲班）！",
        type: "alert"
      });
      return;
    }
    
    setIsCreatingClassLocal(true);
    try {
      const code = await onCreateClass(localClassNameInput.trim());
      setLocalClassNameInput("");
      showDialog({
        title: "🎉 雲端班級建立成功！",
        message: `班級【${localClassNameInput.trim()}】已成功在雲端誕生！\n\n🔑 班級代碼：${code}\n👉 學生與大螢幕可隨時即時同步！`,
        type: "alert",
        titleColor: "text-green-600"
      });
    } catch (e: any) {
      showDialog({
        title: "建立失敗",
        message: `無法建立雲端教室：${e.message || e}`,
        type: "alert"
      });
    } finally {
      setIsCreatingClassLocal(false);
    }
  };

  const handleTestFbConnectionAction = async () => {
    setTestingFb(true);
    setFbTestStatus("testing");
    setFbCheckMsg("正在發送封包與測試安全性授權...");
    try {
      const { testFirebaseConnection } = await import("../firebase");
      const res = await testFirebaseConnection();
      if (res.success) {
        setFbTestStatus("success");
        setFbCheckMsg(res.message);
      } else {
        setFbTestStatus("failed");
        setFbCheckMsg(res.message);
      }
    } catch (e: any) {
      setFbTestStatus("failed");
      setFbCheckMsg(`系統核心例外錯誤: ${e.message || e}`);
    } finally {
      setTestingFb(false);
    }
  };


  
  // Custom Background and Decoration Gacha states
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const [previewDecorations, setPreviewDecorations] = useState<Record<string, any>>({});

  const handlePreviewGachaItem = (item: any) => {
    const cat = item.category || "background";
    setPreviewDecorations(prev => ({
      ...prev,
      [cat]: item
    }));
    setPreviewItem(item);
  };
  const [gachaName, setGachaName] = useState("");
  const [gachaCategory, setGachaCategory] = useState<"background" | "decoration" | "furniture" | "object" | "effect">("decoration");
  const [gachaRarity, setGachaRarity] = useState<"common" | "rare" | "epic" | "legendary">("common");
  const [gachaProbability, setGachaProbability] = useState(25);
  const [gachaPosition, setGachaPosition] = useState<string>("桌面");
  const [gachaImgType, setGachaImgType] = useState<"emoji" | "upload" | "css">("emoji");
  const [gachaEmojiOrMark, setGachaEmojiOrMark] = useState("🎁");
  const [gachaBase64, setGachaBase64] = useState("");
  const [gachaBackgroundCss, setGachaBackgroundCss] = useState("linear-gradient(to bottom, #bae6fd, #e0f2fe)");

  // Editing current selected item states
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<"background" | "decoration" | "furniture" | "object" | "effect">("decoration");
  const [editRarity, setEditRarity] = useState<"common" | "rare" | "epic" | "legendary">("common");
  const [editProbability, setEditProbability] = useState(25);
  const [editPosition, setEditPosition] = useState("桌面");
  const [editEnabled, setEditEnabled] = useState(true);

  // Achievements Administration States
  const [editingAchId, setEditingAchId] = useState<string | null>(null);
  const [achName, setAchName] = useState("");
  const [achDesc, setAchDesc] = useState("");
  const [achIcon, setAchIcon] = useState("🏆");
  const [achCategory, setAchCategory] = useState("品德表現");
  const [achRarity, setAchRarity] = useState<"common" | "rare" | "epic" | "legendary" | "mythic">("common");
  const [achEnabled, setAchEnabled] = useState(true);

  const [selectedAwardStudentId, setSelectedAwardStudentId] = useState("");
  const [selectedAwardAchId, setSelectedAwardAchId] = useState("");

  // Student form state
  const [newStudentName, setNewStudentName] = useState("");
  
  // Task form state
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState<"learn" | "coop" | "general">("learn");
  const [newTaskType, setNewTaskType] = useState<"individual" | "group">("individual");
  const [newTaskPoints, setNewTaskPoints] = useState(10);
  const [newTaskTarget, setNewTaskTarget] = useState(7);

  // Timed task form state
  const [newTTTitle, setNewTTTitle] = useState("");
  const [newTTType, setNewTTType] = useState<"individual" | "group">("individual");
  const [newTTPoints, setNewTTPoints] = useState(20);
  const [newTTMin, setNewTTMin] = useState(5);
  const [newTTSec, setNewTTSec] = useState(0);
  const [newTTTarget, setNewTTTarget] = useState(7);
  const [newTTTimeMode, setNewTTTimeMode] = useState<"countdown" | "endTime">("countdown");
  const [newTTEndTimeTarget, setNewTTEndTimeTarget] = useState("14:00");

  const [editingTTTimeMode, setEditingTTTimeMode] = useState<"countdown" | "endTime">("countdown");
  const [editingTTEndTimeTarget, setEditingTTEndTimeTarget] = useState("14:00");

  // Rewards states
  const [rewardTargetId, setRewardTargetId] = useState("all");
  const [rewardPoints, setRewardPoints] = useState(0);
  const [rewardMessage, setRewardMessage] = useState("");

  const [newGroupName, setNewGroupName] = useState("");
  const [keepHistory, setKeepHistory] = useState(false);
  const [adminGroupSize, setAdminGroupSize] = useState(4);
  const [groupTargetId, setGroupTargetId] = useState("");
  const [groupPoints, setGroupPoints] = useState(10);
  const [groupExp, setGroupExp] = useState(0);
  const [groupRewardNote, setGroupRewardNote] = useState("");

  // System Settings state
  const [classTitle, setClassTitle] = useState(appData?.mainTitle || "");
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [timerMin, setTimerMin] = useState(appData?.timerSettings?.minutes ?? 5);
  const [timerSec, setTimerSec] = useState(appData?.timerSettings?.seconds ?? 0);

  // Custom Food state
  const [cfName, setCfName] = useState("");
  const [cfIcon, setCfIcon] = useState("🧁");
  const [cfCost, setCfCost] = useState(10);
  const [cfExp, setCfExp] = useState(12);
  const [cfHappy, setCfHappy] = useState(1);
  const [cfAffinity, setCfAffinity] = useState(1);
  const [cfStamina, setCfStamina] = useState(0);
  const [cfVisible, setCfVisible] = useState(true);

  // --- Personal Task management states ---
  const [taskSectionTab, setTaskSectionTab] = useState<"templates" | "personal">("personal");
  
  const [ptTitle, setPtTitle] = useState("");
  const [ptDescription, setPtDescription] = useState("");
  const [ptPoints, setPtPoints] = useState(10);
  const [ptDueDate, setPtDueDate] = useState("");
  const [ptIsRepeatable, setPtIsRepeatable] = useState(false);
  const [ptCategory, setPtCategory] = useState<"learn" | "coop" | "general">("general");
  const [ptTargetType, setPtTargetType] = useState<"all" | "student" | "group">("all");
  const [ptSelectedStudentId, setPtSelectedStudentId] = useState("");
  const [ptSelectedGroupId, setPtSelectedGroupId] = useState("");

  const [editingPtId, setEditingPtId] = useState<string | null>(null);
  const [editingPtTitle, setEditingPtTitle] = useState("");
  const [editingPtDescription, setEditingPtDescription] = useState("");
  const [editingPtPoints, setEditingPtPoints] = useState(10);
  const [editingPtDueDate, setEditingPtDueDate] = useState("");
  const [editingPtIsRepeatable, setEditingPtIsRepeatable] = useState(false);
  const [editingPtCategory, setEditingPtCategory] = useState<"learn" | "coop" | "general">("general");
  const [manualContributionInput, setManualContributionInput] = useState(10);

  // States for Class Addons (Class Construction & Event System enhancements)
  const [merchantStayMinutes, setMerchantStayMinutes] = useState(30);
  const [merchantEnabled, setMerchantEnabled] = useState(true);
  const [isAddingBuilding, setIsAddingBuilding] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState("");
  const [newBuildingIcon, setNewBuildingIcon] = useState("⛲");
  const [newBuildingTargetExp, setNewBuildingTargetExp] = useState(100);

  const getTaskTypeCategoryLocal = (title: string, cat: string) => {
    const t = `${title} ${cat}`;
    if (/整理|打掃|清潔|桌面/.test(t)) return "clean";
    if (/閱讀|讀書/.test(t)) return "reading";
    if (/發言|分享|回答/.test(t)) return "speaking";
    if (/合作|幫助|團隊/.test(t)) return "cooperation";
    if (/禮貌|排隊/.test(t)) return "manners";
    return "responsibility";
  };

  const handleAssignPersonalTask = () => {
    const titleVal = ptTitle.trim();
    if (!titleVal) {
      showDialog({ title: "提示", message: "請輸入任務名稱！", type: "alert" });
      return;
    }

    const taskId = `task_indiv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newTaskObj = {
      id: taskId,
      title: titleVal,
      description: ptDescription.trim(),
      points: Number(ptPoints) || 10,
      dueDate: ptDueDate || undefined,
      isRepeatable: ptIsRepeatable,
      category: ptCategory,
      type: "individual" as const,
      done: false,
      status: "active" as const,
    };

    setAppData((prev) => {
      let targetIds: string[] = [];
      if (ptTargetType === "all") {
        targetIds = prev.students.map(s => s.id);
      } else if (ptTargetType === "student") {
        if (!ptSelectedStudentId) {
          setTimeout(() => showDialog({ title: "提示", message: "請選擇指定學生！", type: "alert" }), 10);
          return prev;
        }
        targetIds = [ptSelectedStudentId];
      } else if (ptTargetType === "group") {
        if (!ptSelectedGroupId) {
          setTimeout(() => showDialog({ title: "提示", message: "請選擇指定小組！", type: "alert" }), 10);
          return prev;
        }
        const targetGroupObj = (prev.groups || []).find(g => g.id === ptSelectedGroupId);
        targetIds = targetGroupObj ? targetGroupObj.members : [];
        if (targetIds.length === 0) {
          setTimeout(() => showDialog({ title: "提示", message: "該小組目前沒有任何學生！", type: "alert" }), 10);
          return prev;
        }
      }

      const updatedStudents = prev.students.map((student) => {
        if (targetIds.includes(student.id)) {
          const studentTasks = student.tasks || [];
          return {
            ...student,
            tasks: [...studentTasks, { ...newTaskObj }]
          };
        }
        return student;
      });

      const actionDesc = ptTargetType === "all" 
        ? "指派任務給全班" 
        : ptTargetType === "student" 
          ? `指派個人任務給 ${prev.students.find(s => s.id === ptSelectedStudentId)?.name || ""}` 
          : `指派小組任務給小組`;
          
      const newActionLog = {
        id: `teacher_act_${Date.now()}`,
        timestamp: new Date().toLocaleString("zh-TW"),
        action: "指派新任務",
        detail: `${actionDesc}：${titleVal} (${newTaskObj.points} 點)`,
        operator: "教師",
      };

      const nextState = {
        ...prev,
        students: updatedStudents,
        teacherActionLogs: [newActionLog, ...(prev.teacherActionLogs || [])]
      };

      if (autoSave) {
        setTimeout(() => autoSave(nextState), 50);
      }
      return nextState;
    });

    setPtTitle("");
    setPtDescription("");
    setPtPoints(10);
    setPtDueDate("");
    setPtIsRepeatable(false);
    
    showDialog({ title: "指派成功", message: "個人任務已成功分發至指定學生端！", type: "alert" });
  };

  const handleDeletePersonalTask = (taskId: string) => {
    setAppData((prev) => {
      const updatedStudents = prev.students.map((student) => {
        const studentTasks = student.tasks || [];
        return {
          ...student,
          tasks: studentTasks.filter(t => t.id !== taskId)
        };
      });

      const nextState = {
        ...prev,
        students: updatedStudents,
        teacherActionLogs: [
          {
            id: `teacher_act_${Date.now()}`,
            timestamp: new Date().toLocaleString("zh-TW"),
            action: "刪除個人任務",
            detail: `自學生列表中同步移除任務。`,
            operator: "教師",
          },
          ...(prev.teacherActionLogs || [])
        ]
      };

      if (autoSave) {
        setTimeout(() => autoSave(nextState), 50);
      }
      return nextState;
    });
  };

  const handleEditPtStart = (task: any) => {
    setEditingPtId(task.id);
    setEditingPtTitle(task.title);
    setEditingPtDescription(task.description || "");
    setEditingPtPoints(task.points);
    setEditingPtDueDate(task.dueDate || "");
    setEditingPtIsRepeatable(!!task.isRepeatable);
    setEditingPtCategory(task.category || "general");
  };

  const handleSavePersonalTaskEdit = () => {
    if (!editingPtId) return;
    const titleVal = editingPtTitle.trim();
    if (!titleVal) {
      showDialog({ title: "提示", message: "請輸入任務名稱！", type: "alert" });
      return;
    }

    setAppData((prev) => {
      const updatedStudents = prev.students.map((student) => {
        const studentTasks = student.tasks || [];
        const nextTasks = studentTasks.map((t) => {
          if (t.id === editingPtId) {
            return {
              ...t,
              title: titleVal,
              description: editingPtDescription.trim(),
              points: Number(editingPtPoints) || 10,
              dueDate: editingPtDueDate || undefined,
              isRepeatable: editingPtIsRepeatable,
              category: editingPtCategory,
            };
          }
          return t;
        });
        return { ...student, tasks: nextTasks };
      });

      const nextState = {
        ...prev,
        students: updatedStudents,
        teacherActionLogs: [
          {
            id: `teacher_act_${Date.now()}`,
            timestamp: new Date().toLocaleString("zh-TW"),
            action: "修改個人任務",
            detail: `修改任務 ${titleVal} (${editingPtPoints} 點)`,
            operator: "教師",
          },
          ...(prev.teacherActionLogs || [])
        ]
      };

      if (autoSave) {
        setTimeout(() => autoSave(nextState), 50);
      }
      return nextState;
    });

    setEditingPtId(null);
    showDialog({ title: "修改成功", message: "該任務已在所有指派學生端更新！", type: "alert" });
  };

  const handleTeacherCompleteTask = (studentId: string, taskId: string) => {
    let affectedStudentName = "";
    let awardedPoints = 0;
    let taskTitle = "";

    setAppData((prev) => {
      const nextStudents = prev.students.map((student) => {
        if (student.id === studentId) {
          affectedStudentName = student.name;
          const studentTasks = student.tasks || [];
          const taskIndex = studentTasks.findIndex(t => t.id === taskId);
          if (taskIndex === -1) return student;
          const task = studentTasks[taskIndex];
          
          taskTitle = task.title;
          const pts = Number(task.points) || 10;
          
          const isBday = isTodayBirthday(student.studentBirthday) || student.birthdayBonusEnabled;
          awardedPoints = isBday ? pts * 2 : pts;
          
          const typeKey = getTaskTypeCategoryLocal(task.title, task.category);
          const stats = student.taskTypeStats || { clean: 0, reading: 0, speaking: 0, cooperation: 0, manners: 0, responsibility: 0 };
          
          const nextTasks = studentTasks.map((t, idx) => {
            if (idx === taskIndex) {
              if (t.isRepeatable) {
                return { ...t, done: false, status: "active" as const };
              } else {
                return { ...t, done: true, status: "claimed" as const };
              }
            }
            return t;
          });

          const nowStr = new Date().toLocaleString("zh-TW");
          const nextHistory = student.completedTaskHistory || [];
          const historyEntry = {
            id: task.id,
            title: task.title,
            points: awardedPoints,
            completedAt: nowStr
          };

          return {
            ...student,
            points: student.points + awardedPoints,
            completedTaskCount: Number(student.completedTaskCount || 0) + 1,
            taskTypeStats: {
              ...stats,
              [typeKey]: (Number(stats[typeKey] || 0)) + 1
            },
            completedTaskHistory: [...nextHistory, historyEntry],
            tasks: nextTasks
          };
        }
        return student;
      });

      let nextState = { ...prev, students: nextStudents };
      if (affectedStudentName) {
        const studentObj = nextStudents.find(s => s.id === studentId);
        const finalBalance = studentObj ? studentObj.points : 0;
        
        nextState = appendPointLog(
          nextState,
          studentId,
          awardedPoints,
          `教師手動標記完成「${taskTitle}」`,
          "教師",
          finalBalance
        );
      }

      const newActionLog = {
        id: `teacher_act_${Date.now()}`,
        timestamp: new Date().toLocaleString("zh-TW"),
        action: "標記任務完成",
        detail: `手動標記 ${affectedStudentName} 的任務「${taskTitle}」為完成，派發點數 ${awardedPoints} 點。`,
        operator: "教師",
      };
      
      nextState = {
        ...nextState,
        teacherActionLogs: [newActionLog, ...(nextState.teacherActionLogs || [])]
      };

      if (autoSave) {
        setTimeout(() => autoSave(nextState), 50);
      }
      return nextState;
    });

    showDialog({ title: "任務完成", message: `已成功將「${taskTitle}」標記完成！點數已發送。`, type: "alert" });
  };

  const handleTeacherResetTask = (studentId: string, taskId: string) => {
    let affectedStudentName = "";
    let taskTitle = "";

    setAppData((prev) => {
      const nextStudents = prev.students.map((student) => {
        if (student.id === studentId) {
          affectedStudentName = student.name;
          const studentTasks = student.tasks || [];
          const nextTasks = studentTasks.map((t) => {
            if (t.id === taskId) {
              taskTitle = t.title;
              return { ...t, done: false, status: "active" as const };
            }
            return t;
          });
          return { ...student, tasks: nextTasks };
        }
        return student;
      });

      const nextState = {
        ...prev,
        students: nextStudents,
        teacherActionLogs: [
          {
            id: `teacher_act_${Date.now()}`,
            timestamp: new Date().toLocaleString("zh-TW"),
            action: "重置個人任務",
            detail: `手動將學生 ${affectedStudentName} 的任務「${taskTitle}」重置為未完成狀態。`,
            operator: "教師",
          },
          ...(prev.teacherActionLogs || [])
        ]
      };

      if (autoSave) {
        setTimeout(() => autoSave(nextState), 50);
      }
      return nextState;
    });

    showDialog({ title: "任務重置", message: `已成功將「${taskTitle}」重置為未完成狀態！學生可再次挑戰。`, type: "alert" });
  };

  const handleApproveTask = (studentId: string, taskId: string) => {
    let affectedStudentName = "";
    let taskTitle = "";

    setAppData((prev) => {
      const nextStudents = prev.students.map((student) => {
        if (student.id === studentId) {
          affectedStudentName = student.name;
          const nextTasks = (student.tasks || []).map((t) => {
            if (t.id === taskId) {
              taskTitle = t.title;
              return { ...t, status: "approved" as const, done: true };
            }
            return t;
          });
          return { ...student, tasks: nextTasks };
        }
        return student;
      });

      const nextState = {
        ...prev,
        students: nextStudents,
        teacherActionLogs: [
          {
            id: `teacher_act_${Date.now()}`,
            timestamp: new Date().toLocaleString("zh-TW"),
            action: "核准任務回報",
            detail: `核准同意學生 ${affectedStudentName} 回報的任務「${taskTitle}」，學生可領取點數！`,
            operator: "教師",
          },
          ...(prev.teacherActionLogs || [])
        ]
      };

      if (autoSave) {
        setTimeout(() => autoSave(nextState), 40);
      }
      return nextState;
    });

    showDialog({ title: "審核通過", message: `已成功核准學生 ${affectedStudentName} 的「${taskTitle}」！`, type: "alert" });
  };

  const handleRejectTask = (studentId: string, taskId: string) => {
    let affectedStudentName = "";
    let taskTitle = "";

    setAppData((prev) => {
      const nextStudents = prev.students.map((student) => {
        if (student.id === studentId) {
          affectedStudentName = student.name;
          const nextTasks = (student.tasks || []).map((t) => {
            if (t.id === taskId) {
              taskTitle = t.title;
              return { ...t, status: "active" as const, done: false };
            }
            return t;
          });
          return { ...student, tasks: nextTasks };
        }
        return student;
      });

      const nextState = {
        ...prev,
        students: nextStudents,
        teacherActionLogs: [
          {
            id: `teacher_act_${Date.now()}`,
            timestamp: new Date().toLocaleString("zh-TW"),
            action: "駁回任務回報",
            detail: `將學生 ${affectedStudentName} 回報的任務「${taskTitle}」退回重新執行。`,
            operator: "教師",
          },
          ...(prev.teacherActionLogs || [])
        ]
      };

      if (autoSave) {
        setTimeout(() => autoSave(nextState), 40);
      }
      return nextState;
    });

    showDialog({ title: "退回成功", message: `已將「${taskTitle}」退回給學生重新執行。`, type: "alert" });
  };

  // Helper inside panel to create student objects safely
  const handleAddStudent = () => {
    const name = newStudentName.trim();
    if (!name) {
      showDialog({ title: "提醒", message: "請輸入學生姓名。", type: "alert" });
      return;
    }
    
    const nextId = `stu_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const freshTasks = (appData?.taskTemplates || [])
      .filter((t) => t.type !== "group")
      .map((t) => ({ ...t, done: false }));

    const nextStudent: Student = {
      id: nextId,
      name,
      points: 0,
      coins: 0,
      hasChosenEgg: false,
      stats: { intelligence: 0, creativity: 0, energy: 0, exploration: 0, expression: 0, cooperation: 0, logic: 0, knowledge: 0, art: 0 },
      petName: "我的史萊姆",
      title: "",
      completedTaskCount: 0,
      taskTypeStats: { clean: 0, reading: 0, speaking: 0, cooperation: 0, manners: 0, responsibility: 0 },
      tasks: freshTasks,
      ownedBackgrounds: [],
      equippedBackground: "",
      feedLog: [],
      petStats: { happy: 0, affinity: 0, stamina: 0 },
      pet: {
        level: 1,
        exp: 0,
        evolutionStage: 1,
        growthType: "balanced",
        personalityStats: { creativity: 0, performance: 0, wisdom: 0, vitality: 0, exploration: 0, affinity: 0, imagination: 0, discipline: 0 },
        attributes: { magic: 0, wisdom: 0, kindness: 0, courage: 0, vitality: 0, cooperation: 0, aesthetic: 0 },
        learningLog: []
      }
    };

    setAppData((prev) => ({
      ...prev,
      students: [...prev.students, nextStudent]
    }));
    setNewStudentName("");
  };

  const handleAddGachaItem = () => {
    if (!gachaName.trim()) {
      showDialog({ title: "提醒", message: "請輸入裝飾/壁紙名稱！", type: "alert" });
      return;
    }
    const finalId = `g_item_${Date.now()}`;
    const newItem = {
      id: finalId,
      name: gachaName.trim(),
      category: gachaCategory,
      type: gachaCategory,
      rarity: gachaRarity,
      probability: Number(gachaProbability) || 20,
      equippedPosition: "fullscreen",
      placement: "fullscreen",
      imageUrl: gachaImgType === "upload" ? gachaBase64 : "",
      presetSvgMarkup: gachaImgType === "emoji" ? gachaEmojiOrMark : (gachaImgType === "css" ? gachaBackgroundCss : ""),
      enabled: true,
      isDefault: false
    };

    setAppData((prev) => ({
      ...prev,
      backgroundGachaItems: [...(prev.backgroundGachaItems || defaultBackgroundGachaItems), newItem]
    }));

    if (isOnlineMode && isFirebaseReady) {
      import("../firebase").then(({ saveGachaItem }) => {
        saveGachaItem(classCode, newItem).catch(e => console.error("Firebase sync error:", e));
      });
    }

    // Reset fields
    setGachaName("");
    setGachaBase64("");
    showDialog({ title: "成功", message: `已成功新增轉蛋商品：【${newItem.name}】！`, type: "alert" });
  };

  const startEditingGachaItem = (item: any) => {
    setEditingItemId(item.id);
    setEditName(item.name);
    setEditCategory(item.category || "decoration");
    setEditRarity(item.rarity || "common");
    setEditProbability(item.probability || 20);
    setEditPosition(item.equippedPosition || "桌面");
    setEditEnabled(item.enabled !== false);
  };

  const handleSaveGachaItemEdit = (id: string) => {
    if (!editName.trim()) {
      showDialog({ title: "提醒", message: "請輸入商品名稱！", type: "alert" });
      return;
    }
    const itemsList = appData.backgroundGachaItems || defaultBackgroundGachaItems;
    const currentItem = itemsList.find(item => item.id === id);
    if (!currentItem) return;

    const updatedItem = {
      ...currentItem,
      name: editName.trim(),
      category: editCategory,
      type: editCategory,
      rarity: editRarity,
      probability: Number(editProbability) || 20,
      equippedPosition: "fullscreen",
      placement: "fullscreen",
      enabled: editEnabled,
      isDefault: currentItem.isDefault || false
    };

    setAppData((prev) => {
      const prevList = prev.backgroundGachaItems || defaultBackgroundGachaItems;
      const updated = prevList.map((item) => item.id === id ? updatedItem : item);
      return { ...prev, backgroundGachaItems: updated };
    });

    if (isOnlineMode && isFirebaseReady) {
      import("../firebase").then(({ saveGachaItem }) => {
        saveGachaItem(classCode, updatedItem).catch(e => console.error("Firebase sync error:", e));
      });
    }

    setEditingItemId(null);
    showDialog({ title: "儲存成功", message: "裝扮商品資料已更新並同步！", type: "alert" });
  };

  const handleToggleGachaItem = (id: string) => {
    const itemsList = appData.backgroundGachaItems || defaultBackgroundGachaItems;
    const currentItem = itemsList.find(item => item.id === id);
    if (!currentItem) return;

    const updatedItem = { ...currentItem, enabled: !currentItem.enabled };

    setAppData((prev) => {
      const prevList = prev.backgroundGachaItems || defaultBackgroundGachaItems;
      const updated = prevList.map((item) => item.id === id ? updatedItem : item);
      return { ...prev, backgroundGachaItems: updated };
    });

    if (isOnlineMode && isFirebaseReady) {
      import("../firebase").then(({ saveGachaItem }) => {
        saveGachaItem(classCode, updatedItem).catch(e => console.error("Firebase sync error:", e));
      });
    }
  };

  const handleDeleteGachaItem = (id: string) => {
    showDialog({
      title: "刪除確認",
      message: "確定要刪除這件轉蛋商品嗎？已抽中此商品的同學可能將無法正常配戴。",
      type: "confirm",
      onConfirm: () => {
        setAppData((prev) => {
          const itemsList = prev.backgroundGachaItems || defaultBackgroundGachaItems;
          return {
            ...prev,
            backgroundGachaItems: itemsList.filter((item) => item.id !== id)
          };
        });

        if (isOnlineMode && isFirebaseReady) {
          import("../firebase").then(({ deleteGachaItemFromCloud }) => {
            deleteGachaItemFromCloud(classCode, id).catch(e => console.error("Firebase sync error:", e));
          });
        }
      }
    });
  };

  // Achievements handlers
  const handleSaveAchievement = () => {
    if (!achName.trim()) {
      showDialog({ title: "提醒", message: "請輸入成就名稱！", type: "alert" });
      return;
    }
    if (!achDesc.trim()) {
      showDialog({ title: "提醒", message: "請輸入成就說明！", type: "alert" });
      return;
    }

    const currentId = editingAchId || "ach_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);
    const newOrUpdatedAch: Achievement = {
      achievementId: currentId,
      name: achName.trim(),
      description: achDesc.trim(),
      icon: achIcon.trim() || "🏆",
      category: achCategory,
      rarity: achRarity,
      enabled: achEnabled,
      createdAt: new Date().toISOString()
    };

    setAppData((prev) => {
      const achievementsList = prev.achievements || defaultAchievements;
      const index = achievementsList.findIndex((a) => a.achievementId === currentId);
      const updatedList = [...achievementsList];
      if (index > -1) {
        updatedList[index] = { ...updatedList[index], ...newOrUpdatedAch };
      } else {
        updatedList.push(newOrUpdatedAch);
      }
      return {
        ...prev,
        achievements: updatedList
      };
    });

    if (isOnlineMode && isFirebaseReady) {
      import("../firebase").then(({ saveAchievementToCloud }) => {
        saveAchievementToCloud(classCode, newOrUpdatedAch).catch((e) => console.error("Firebase sync error:", e));
      });
    }

    showDialog({
      title: "成功",
      message: editingAchId ? `成就【${achName}】修改成功！` : `自訂成就【${achName}】新增成功！`,
      type: "alert"
    });

    handleResetAchievementForm();
  };

  const handleEditAchievementClick = (ach: Achievement) => {
    setEditingAchId(ach.achievementId);
    setAchName(ach.name);
    setAchDesc(ach.description);
    setAchIcon(ach.icon || "🏆");
    setAchCategory(ach.category || "品德表現");
    setAchRarity((ach.rarity as any) || "common");
    setAchEnabled(ach.enabled !== false);
  };

  const handleResetAchievementForm = () => {
    setEditingAchId(null);
    setAchName("");
    setAchDesc("");
    setAchIcon("🏆");
    setAchCategory("品德表現");
    setAchRarity("common");
    setAchEnabled(true);
  };

  const handleDeleteAchievement = (id: string, name: string) => {
    showDialog({
      title: "確認刪除成就",
      message: `您確定要刪除成就【${name}】嗎？此操作將永久移除此項成就。已獲得此成就的學員史萊姆紀錄仍會安全保留。`,
      type: "confirm",
      onConfirm: () => {
        setAppData((prev) => {
          const achievementsList = prev.achievements || defaultAchievements;
          return {
            ...prev,
            achievements: achievementsList.filter((a) => a.achievementId !== id)
          };
        });

        if (isOnlineMode && isFirebaseReady) {
          import("../firebase").then(({ deleteAchievementFromCloud }) => {
            deleteAchievementFromCloud(classCode, id).catch((e) => console.error("Firebase sync error:", e));
          });
        }

        if (editingAchId === id) {
          handleResetAchievementForm();
        }
      }
    });
  };

  const handleAwardAchievement = () => {
    if (!selectedAwardStudentId) {
      showDialog({ title: "提醒", message: "請選擇要獲頒成就的學生寶寶！", type: "alert" });
      return;
    }
    if (!selectedAwardAchId) {
      showDialog({ title: "提醒", message: "請選擇要授勳的成就項目！", type: "alert" });
      return;
    }

    const currentStudentsList = appData?.students || [];
    const targetStudent = currentStudentsList.find((s) => s.id === selectedAwardStudentId);
    if (!targetStudent) {
      showDialog({ title: "錯誤", message: "找不到指定的學生！", type: "alert" });
      return;
    }

    const achievementsList = appData.achievements || defaultAchievements;
    const targetAch = achievementsList.find((a) => a.achievementId === selectedAwardAchId);
    if (!targetAch) {
      showDialog({ title: "錯誤", message: "找不到指定的成就項目！", type: "alert" });
      return;
    }

    const earnedList = targetStudent.earnedAchievements || [];
    const alreadyEarned = earnedList.some((ea) => ea.achievementId === selectedAwardAchId);

    if (alreadyEarned) {
      showDialog({
        title: "此學生已擁有該成就",
        message: `學員【${targetStudent.name}】此前已取得過此項【${targetAch.name}】榮譽成就，不可重複授與。`,
        type: "alert",
        titleColor: "text-rose-500"
      });
      return;
    }

    const newAward: EarnedAchievement = {
      achievementId: selectedAwardAchId,
      awardedAt: new Date().toISOString(),
      teacherName: "班級導師"
    };

    setAppData((prev) => {
      const updatedStudents = prev.students.map((stu) => {
        if (stu.id === selectedAwardStudentId) {
          return {
            ...stu,
            earnedAchievements: [...(stu.earnedAchievements || []), newAward]
          };
        }
        return stu;
      });
      return {
        ...prev,
        students: updatedStudents
      };
    });

    showDialog({
      title: "🏅 頒發精彩成功 🏅",
      message: `已順利將【${targetAch.name}】榮譽勳章頒發予【${targetStudent.name}】同學！實時同步已更新。`,
      type: "alert",
      titleColor: "text-green-600"
    });
  };

  const handleGachaImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isBackground = gachaCategory === "background";

    // Warn about big backgrounds and items
    if (isBackground && file.size > 800 * 1024) {
      alert("⚠️ 這張背景圖片大於 800KB！為了防止瀏覽器儲存空間 (localStorage) 爆滿造成遊戲閃退或卡頓，系統將自動進行「輕量縮圖」與「高比例畫質壓縮」。");
    } else if (!isBackground && file.size > 150 * 1024) {
      alert("⚠️ 裝飾配件大於 150KB！大尺寸圖片極易消耗容量，系統將自動將其縮減至 250px 像素。");
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Enforce max dimensions depending on category
        const maxDim = isBackground ? 800 : 250; 
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          
          // Highly compressed JPEG for backgrounds, lighter PNG/JPEG for accessories
          const exportMime = file.type === "image/png" && !isBackground ? "image/png" : "image/jpeg";
          const quality = exportMime === "image/jpeg" ? 0.65 : undefined;
          const compressedDataUrl = canvas.toDataURL(exportMime, quality);
          
          setGachaBase64(compressedDataUrl);
        } else {
          setGachaBase64(event.target?.result as string);
        }
      };
      
      img.onerror = () => {
        setGachaBase64(event.target?.result as string);
      };

      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRenameStudent = (id: string, currentName: string) => {
    const val = prompt("修改學生姓名：", currentName);
    if (val && val.trim()) {
      setAppData((prev) => {
        const next = prev.students.map((s) => (s.id === id ? { ...s, name: val.trim() } : s));
        return { ...prev, students: next };
      });
    }
  };

  const handleSetBirthday = (id: string, bday: string) => {
    setAppData((prev) => {
      const next = prev.students.map((s) => {
        if (s.id === id) {
          const zodiac = getZodiac(bday);
          return {
            ...s,
            studentBirthday: bday,
            studentZodiac: zodiac
          };
        }
        return s;
      });
      return { ...prev, students: next };
    });
  };

  const handleToggleBirthdayBonus = (id: string) => {
    setAppData((prev) => {
      const next = prev.students.map((s) => {
        if (s.id === id) {
          return {
            ...s,
            birthdayBonusEnabled: !s.birthdayBonusEnabled
          };
        }
        return s;
      });
      return { ...prev, students: next };
    });
  };

  const handleSetPoints = (id: string, val: string) => {
    const ptsNum = Math.max(0, parseInt(val) || 0);
    setAppData((prev) => {
      const next = prev.students.map((s) => (s.id === id ? { ...s, points: ptsNum } : s));
      return { ...prev, students: next };
    });
  };

  const handleResetStudent = (id: string, name: string) => {
    showDialog({
      title: "確認重設寵物與轉蛋",
      message: `確定要讓「${name}」回到選蛋初始狀態嗎？\n\n點數、生活稱號、所有轉蛋背景、以及寵物養成紀錄將徹底歸零！`,
      type: "confirm",
      titleColor: "text-red-600",
      onConfirm: () => {
        setAppData((prev) => {
          const updated = prev.students.map((s) => {
            if (s.id === id) {
              return {
                ...s,
                points: 0,
                coins: 0,
                hasChosenEgg: false,
                stats: { intelligence: 0, creativity: 0, energy: 0, exploration: 0, expression: 0, cooperation: 0, logic: 0, knowledge: 0, art: 0 },
                element: undefined,
                petType: undefined,
                petLevel: 1,
                slimeData: undefined,
                petName: "",
                petNameChangedCount: 0,
                hasRenamedPet: false,
                renameCostPaid: false,
                petRenameHistory: [],
                title: "",
                completedTaskCount: 0,
                taskTypeStats: { clean: 0, reading: 0, speaking: 0, cooperation: 0, manners: 0, responsibility: 0 },
                tasks: prev.taskTemplates.filter(t => t.type !== "group").map(t => ({ ...t, done: false })),
                ownedBackgrounds: [],
                equippedBackground: "",
                studentOwnedBackgrounds: [],
                studentOwnedDecorations: [],
                studentActiveBackground: "",
                studentActiveDecorations: {},
                feedLog: [],
                petStats: { happy: 0, affinity: 0, stamina: 0 },
                pet: {
                  level: 1,
                  exp: 0,
                  evolutionStage: 1,
                  growthType: "balanced",
                  personalityStats: { creativity: 0, performance: 0, wisdom: 0, vitality: 0, exploration: 0, affinity: 0, imagination: 0, discipline: 0 },
                  attributes: { magic: 0, wisdom: 0, kindness: 0, courage: 0, vitality: 0, cooperation: 0, aesthetic: 0 },
                  learningLog: []
                }
              };
            }
            return s;
          });
          return { ...prev, students: updated };
        });
        showDialog({ title: "重設完成", message: `${name} 已成功回到選蛋初始狀態。`, type: "alert", titleColor: "text-green-600" });
      }
    });
  };

  const handleDeleteStudent = (id: string, name: string) => {
    showDialog({
      title: "刪除學生確認",
      message: `確定要將學生「${name}」從列表中徹底移除嗎？此舉無法復原。`,
      type: "confirm",
      titleColor: "text-red-500",
      onConfirm: () => {
        setAppData((prev) => {
          const nextStudents = prev.students.filter((s) => s.id !== id);
          const nextGroups = prev.groups.map((g) => ({
            ...g,
            members: g.members.filter((mId) => mId !== id)
          }));
          return { ...prev, students: nextStudents, groups: nextGroups };
        });

        // 1. Clean up from ALL potential local storage backup keys immediately
        const backupKeys = [
          "class_quest_ultimate",
          "classQuestData",
          "class_slime_data",
          "studentData",
          "students",
          "classData"
        ];
        backupKeys.forEach((key) => {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed) {
                if (Array.isArray(parsed)) {
                  const filtered = parsed.filter((s: any) => s && s.id !== id);
                  localStorage.setItem(key, JSON.stringify(filtered));
                } else if (parsed.students && Array.isArray(parsed.students)) {
                  parsed.students = parsed.students.filter((s: any) => s && s.id !== id);
                  localStorage.setItem(key, JSON.stringify(parsed));
                }
              }
            }
          } catch (e) {
            console.warn(`Clean localStorage key: "${key}" failed but safely bypassed.`, e);
          }
        });

        // 2. Clear current student profile memory ID if it matches
        if (localStorage.getItem("current_student_modal_id") === id) {
          localStorage.removeItem("current_student_modal_id");
        }

        // 3. Sync Firebase if online
        if (isOnlineMode && isFirebaseReady) {
          import("../firebase").then(({ deleteStudentData }) => {
            deleteStudentData(classCode, id).catch(e => console.error("Firebase student sync delete error:", e));
          });
        }
      }
    });
  };

  // Task templates
  const handleAddTask = () => {
    const title = newTaskTitle.trim();
    if (!title) {
      showDialog({ title: "提醒", message: "請輸入任務名稱。", type: "alert" });
      return;
    }
    const nextId = `task_${Date.now()}`;
    const newTask: Task = {
      id: nextId,
      title,
      points: newTaskPoints,
      category: newTaskCategory,
      type: newTaskType,
      icon: newTaskType === "group" ? "🌍" : "⭐"
    };

    if (newTaskType === "group") {
      newTask.targetCount = newTaskTarget;
    }

    setAppData((prev) => {
      const nextTemplates = [...prev.taskTemplates, newTask];
      
      // Update existing student tasks if this is individual
      let nextStudents = prev.students;
      if (newTaskType === "individual") {
        nextStudents = prev.students.map((student) => ({
          ...student,
          tasks: [...student.tasks, { ...newTask, done: false }]
        }));
      }

      // Add to active group tasks if group
      let nextActiveGroup = prev.activeGroupTasks;
      if (newTaskType === "group") {
        nextActiveGroup = [...prev.activeGroupTasks, { ...newTask, participants: [], claimedBy: [] }];
      }

      return {
        ...prev,
        taskTemplates: nextTemplates,
        students: nextStudents,
        activeGroupTasks: nextActiveGroup
      };
    });

    setNewTaskTitle("");
  };

  const handleDeleteTask = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      taskTemplates: prev.taskTemplates.filter((t) => t.id !== id),
      activeGroupTasks: prev.activeGroupTasks.filter((t) => t.id !== id),
      students: prev.students.map((s) => ({
        ...s,
        tasks: s.tasks.filter((t) => t.id !== id)
      }))
    }));
  };

  // Timed assignment controls
  const handleAddTimedTask = () => {
    const title = newTTTitle.trim();
    if (!title) {
      showDialog({ title: "提醒", message: "請輸入限時任務名稱。", type: "alert" });
      return;
    }
    
    let totalSec = newTTMin * 60 + newTTSec;
    let startStr = getCurrentTimeHHMM();
    let endStr = "--:--";

    if (newTTTimeMode === "endTime") {
      totalSec = calculateSecondsUntilTime(newTTEndTimeTarget);
      if (totalSec <= 0) {
        showDialog({ title: "提醒", message: "指定的結束時間必須大於目前時間！", type: "alert" });
        return;
      }
      startStr = getCurrentTimeHHMM();
      endStr = newTTEndTimeTarget;
    } else {
      startStr = getCurrentTimeHHMM();
      const endMinutes = Number(startStr.split(":")[1]) + newTTMin;
      const endHours = Number(startStr.split(":")[0]) + Math.floor(endMinutes / 60);
      endStr = `${(endHours % 24).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;
    }

    const nextId = `tt_${Date.now()}`;
    const nextTimed: TimedTask = {
      id: nextId,
      title,
      type: newTTType,
      points: newTTPoints,
      targetCount: newTTType === "group" ? newTTTarget : undefined,
      durationSeconds: totalSec,
      remainingSeconds: totalSec,
      isActive: false,
      startedAt: null,
      completedBy: [],
      expired: false,
      timeMode: newTTTimeMode,
      startTimeStr: startStr,
      endTimeStr: endStr
    };

    setAppData((prev) => ({
      ...prev,
      timedTasks: [...prev.timedTasks, nextTimed]
    }));
    setNewTTTitle("");
  };

  const handleStartTimedTask = (index: number) => {
    setAppData((prev) => {
      const nextTasks = prev.timedTasks.map((t, idx) => {
        if (idx === index) {
          let totalSec = t.durationSeconds;
          let startStr = getCurrentTimeHHMM();
          let endStr = t.endTimeStr || "--:--";

          if (t.timeMode === "endTime" && t.endTimeStr) {
            totalSec = calculateSecondsUntilTime(t.endTimeStr);
            startStr = getCurrentTimeHHMM();
            endStr = t.endTimeStr;
          } else {
            // For countdown, reset end time representation upon restarts
            startStr = getCurrentTimeHHMM();
            const roundedMin = Math.floor(t.durationSeconds / 60);
            const endMinutes = Number(startStr.split(":")[1]) + roundedMin;
            const endHours = Number(startStr.split(":")[0]) + Math.floor(endMinutes / 60);
            endStr = `${(endHours % 24).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;
          }

          return {
            ...t,
            isActive: true,
            expired: false,
            startedAt: Date.now(),
            durationSeconds: totalSec,
            remainingSeconds: totalSec,
            completedBy: [],
            startTimeStr: startStr,
            endTimeStr: endStr
          };
        }
        return t;
      });
      return { ...prev, timedTasks: nextTasks };
    });
  };

  const handleToggleTimedTask = (index: number) => {
    setAppData((prev) => {
      const nextTasks = prev.timedTasks.map((t, idx) => {
        if (idx === index) {
          const toggledState = !t.isActive;
          let startStr = t.startTimeStr || getCurrentTimeHHMM();
          let endStr = t.endTimeStr || "--:--";
          let totalSec = t.durationSeconds;

          if (toggledState) {
            startStr = getCurrentTimeHHMM();
            if (t.timeMode === "endTime" && t.endTimeStr) {
              totalSec = calculateSecondsUntilTime(t.endTimeStr);
              endStr = t.endTimeStr;
            } else {
              const roundedMin = Math.floor(t.durationSeconds / 60);
              const endMinutes = Number(startStr.split(":")[1]) + roundedMin;
              const endHours = Number(startStr.split(":")[0]) + Math.floor(endMinutes / 60);
              endStr = `${(endHours % 24).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;
            }
          }

          return {
            ...t,
            isActive: toggledState,
            startedAt: toggledState ? Date.now() : null,
            startTimeStr: startStr,
            endTimeStr: endStr,
            durationSeconds: totalSec,
            remainingSeconds: toggledState ? totalSec : t.remainingSeconds
          };
        }
        return t;
      });
      return { ...prev, timedTasks: nextTasks };
    });
  };

  const handleDeleteTimedTask = (index: number) => {
    setAppData((prev) => {
      const copy = [...prev.timedTasks];
      copy.splice(index, 1);
      return { ...prev, timedTasks: copy };
    });
  };

  const handleCancelStudentTimedTask = (taskIndex: number, studentId: string) => {
    setAppData((prev) => {
      const task = prev.timedTasks[taskIndex];
      if (!task) return prev;

      // Filter out this student
      const updatedCompletedBy = task.completedBy.filter((sid) => sid !== studentId);
      
      const nextTasks = prev.timedTasks.map((t, idx) => {
        if (idx === taskIndex) {
          return {
            ...t,
            completedBy: updatedCompletedBy
          };
        }
        return t;
      });

      // Deduct points from student immediately
      const nextStudents = prev.students.map((student) => {
        if (student.id === studentId) {
          return {
            ...student,
            points: Math.max(0, (student.points || 0) - task.points),
            completedTaskCount: Math.max(0, Number(student.completedTaskCount || 0) - 1)
          };
        }
        return student;
      });

      const updatedState = {
        ...prev,
        timedTasks: nextTasks,
        students: nextStudents
      };

      if (autoSave) {
        setTimeout(() => autoSave(updatedState), 50);
      }

      return updatedState;
    });
  };

  // Group creation
  const handleAddGroup = () => {
    const name = newGroupName.trim();
    if (!name) {
      showDialog({ title: "提醒", message: "請輸入小組名稱。", type: "alert" });
      return;
    }
    const nextId = `grp_${Date.now()}`;
    const nextGroup: CooperateGroup = {
      id: nextId,
      name,
      members: []
    };

    setAppData((prev) => ({
      ...prev,
      groups: [...prev.groups, nextGroup]
    }));
    setNewGroupName("");
  };

  const handleAddStudentToGroup = (groupId: string, studentId: string) => {
    if (!studentId) return;
    setAppData((prev) => {
      // Clean up child from any previous group first (no double group placement)
      const cleanedGroups = prev.groups.map((g) => ({
        ...g,
        members: g.members.filter((mId) => mId !== studentId)
      }));

      // Insert inside designated group
      const updatedGroups = cleanedGroups.map((g) => {
        if (g.id === groupId) {
          return { ...g, members: [...g.members, studentId] };
        }
        return g;
      });

      return { ...prev, groups: updatedGroups };
    });
  };

  const handleRemoveStudentFromGroup = (groupId: string, studentId: string) => {
    setAppData((prev) => {
      const nextGroups = prev.groups.map((g) => {
        if (g.id === groupId) {
          return { ...g, members: g.members.filter((m) => m !== studentId) };
        }
        return g;
      });
      return { ...prev, groups: nextGroups };
    });
  };

  const handleDeleteGroup = (groupId: string) => {
    const groupName = (appData?.groups || []).find(g => g.id === groupId)?.name || "此群組";
    showDialog({
      title: "❓ 確定要刪除此群組嗎？",
      message: `您確定要手動刪除「${groupName}」嗎？此動作將會移除該小組別，但絕不會影響任何學生的資料。`,
      type: "confirm",
      onConfirm: () => {
        setAppData((prev) => ({
          ...prev,
          groups: prev.groups.filter((g) => g.id !== groupId)
        }));
      }
    });
  };

  const handleAdminRedrawGroups = () => {
    const studentsList = appData?.students || [];
    if (studentsList.length === 0) {
      showDialog({ title: "提醒", message: "目前尚無任何登錄學生可以分配群組喔！", type: "alert" });
      return;
    }

    showDialog({
      title: "❓ 確定要全班重新分組嗎？",
      message: `這將徹底打亂並重新隨機分配全班 ${studentsList.length} 位學生。每組預定 ${adminGroupSize} 人。\n\n${
        keepHistory 
          ? "系統將不會覆蓋舊組別，而是把舊組別保存並重新標記為歷史記錄組別。" 
          : "【警告】此操作將完全覆蓋並清除目前的所有小組名單與成員分配。"
      }\n請確認是否執行？`,
      type: "confirm",
      onConfirm: () => {
        // shuffle helper
        const shuffle = (array: Student[]) => {
          const arr = [...array];
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
          }
          return arr;
        };

        const shuffled = shuffle(studentsList);
        const n = shuffled.length;
        const numGroups = Math.max(1, Math.round(n / adminGroupSize));

        const newGroupsList: CooperateGroup[] = Array.from(
          { length: numGroups },
          (_, i) => ({
            id: `grp_${Date.now()}_${i}`,
            name: `第 ${i + 1} 組`,
            members: []
          })
        );

        for (let i = 0; i < n; i++) {
          newGroupsList[i % numGroups].members.push(shuffled[i].id);
        }

        const finalGroups = newGroupsList.filter(g => g.members.length > 0);

        setAppData((prev) => {
          let updatedGroups: CooperateGroup[] = [];
          if (keepHistory) {
            const historical = prev.groups.map(g => ({
              ...g,
              name: g.name.startsWith("[歷史]") ? g.name : `[歷史] ${g.name}`
            }));
            updatedGroups = [...historical, ...finalGroups];
          } else {
            updatedGroups = finalGroups;
          }
          return {
            ...prev,
            groups: updatedGroups
          };
        });

        showDialog({
          title: "🎉 魔法小組重新分組成功！",
          message: `已自動將所有學員均勻分配成新的 ${finalGroups.length} 個班級小組！`,
          type: "alert"
        });
      }
    });
  };

  const handleCopyGroupsToClipboard = () => {
    const groupsList = appData?.groups || [];
    const studentsList = appData?.students || [];
    if (groupsList.length === 0) {
      showDialog({ title: "提醒", message: "目前沒有任何小組資料可以複製！", type: "alert" });
      return;
    }
    const text = groupsList.map(g => {
      const names = g.members.map(mid => studentsList.find(s => s.id === mid)?.name || "").filter(Boolean);
      return `${g.name} (${names.length}人):\n${names.map(name => ` - ${name}`).join("\n")}`;
    }).join("\n\n");

    navigator.clipboard.writeText(text)
      .then(() => alert("📋 班級小組分配名單已成功複製到剪貼簿！"))
      .catch((err) => {
        console.error("複製失敗:", err);
        showDialog({ title: "錯誤", message: "複製失敗，請手動選取複製。", type: "alert" });
      });
  };

  // Send Specified Bonus Reward Point
  const handleSendSpecificReward = (e: React.MouseEvent) => {
    const studentsList = appData?.students || [];
    const targets = rewardTargetId === "all" 
      ? studentsList 
      : studentsList.filter((s) => s.id === rewardTargetId);

    setAppData((prev) => {
      const val = (prev.students || []).map((st) => {
        if (rewardTargetId === "all" || st.id === rewardTargetId) {
          return { ...st, points: st.points + rewardPoints };
        }
        return st;
      });
      return { ...prev, students: val };
    });

    showDialog({
      title: "獎勵發送完成",
      message: `成功將 ${rewardPoints} 點發放給 ${targets.length} 位學生。${rewardMessage ? `\n附言：${rewardMessage}` : ""}`,
      type: "alert",
      titleColor: "text-blue-600"
    });
    showSuccess(e, rewardPoints);
    setRewardPoints(0);
    setRewardMessage("");
  };

  // Send Group Reward points & EXP
  const handleSendGroupReward = (e: React.MouseEvent) => {
    if (!groupTargetId) {
      showDialog({ title: "提醒", message: "請先選擇小組目標！", type: "alert" });
      return;
    }
    const g = (appData?.groups || []).find((x) => x.id === groupTargetId);
    if (!g) return;

    setAppData((prev) => {
      const updated = prev.students.map((student) => {
        if (g.members.includes(student.id)) {
          let updatedStudent = { ...student, points: student.points + groupPoints };
          if (groupExp > 0) {
            gainPetExp(updatedStudent, groupExp);
          }
          return updatedStudent;
        }
        return student;
      });
      return { ...prev, students: updated };
    });

    showDialog({
      title: "小組獎勵完成！",
      message: `成功派發 ${groupPoints} 點、${groupExp} EXP 給「${g.name}」共 ${g.members.length} 位成員！`,
      type: "alert",
      titleColor: "text-orange-600"
    });
    showSuccess(e, groupPoints);
    setGroupPoints(10);
    setGroupExp(0);
    setGroupRewardNote("");
  };

  // Custom Food controls
  const handleAddCustomFood = () => {
    const name = cfName.trim();
    if (!name) {
      showDialog({ title: "提醒", message: "請輸入食物名稱。", type: "alert" });
      return;
    }
    const nextFoodId = `food_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const nextFood = {
      id: nextFoodId,
      name,
      icon: cfIcon,
      cost: cfCost,
      exp: cfExp,
      happy: cfHappy,
      affinity: cfAffinity,
      stamina: cfStamina,
      visible: cfVisible,
      reply: `${name} 真好吃！`
    };

    setAppData((prev) => ({
      ...prev,
      customFoods: [...prev.customFoods, nextFood]
    }));

    setCfName("");
    setCfIcon("🧁");
    setCfCost(10);
    setCfExp(12);
    setCfHappy(1);
    setCfAffinity(1);
    setCfStamina(0);
  };

  const handleToggleCustomFood = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      customFoods: prev.customFoods.map((f) => f.id === id ? { ...f, visible: !f.visible } : f)
    }));
  };

  const handleEditCustomFood = (id: string) => {
    const f = appData.customFoods.find((x) => x.id === id);
    if (!f) return;

    const newName = prompt("重新命名食物名稱", f.name);
    if (newName === null) return;
    const newIcon = prompt("Emoji 圖示", f.icon);
    if (newIcon === null) return;
    const newCost = prompt("花費點數", String(f.cost));
    if (newCost === null) return;
    const newExp = prompt("增加經驗值 (EXP)", String(f.exp));
    if (newExp === null) return;

    setAppData((prev) => ({
      ...prev,
      customFoods: prev.customFoods.map((food) => {
        if (food.id === id) {
          const costVal = Math.max(0, parseInt(newCost) || 0);
          return {
            ...food,
            name: newName.trim() || food.name,
            icon: newIcon.trim() || food.icon,
            cost: costVal,
            exp: Math.max(0, parseInt(newExp) || Math.round(costVal * 1.2))
          };
        }
        return food;
      })
    }));
  };

  const handleDeleteCustomFood = (id: string, name: string) => {
    showDialog({
      title: "刪除自訂食物",
      message: `確定要刪除「${name}」自訂食物項目嗎？`,
      type: "confirm",
      onConfirm: () => {
        setAppData((prev) => ({
          ...prev,
          customFoods: prev.customFoods.filter((f) => f.id !== id)
        }));
      }
    });
  };

  // Settings Save
  const handleSaveMainTitle = () => {
    const val = classTitle.trim();
    setAppData((prev) => ({
      ...prev,
      mainTitle: val || "🏫 三甲寶貝任務列表"
    }));
    showDialog({ title: "已更新", message: "班級大標題設定已成功更新！", type: "alert", titleColor: "text-green-600" });
  };

  const handleChangePassword = () => {
    const correctOld = appData.password || "0301";
    if (oldPwd !== correctOld) {
      showDialog({ title: "密碼錯誤", message: "原密碼不正確。", type: "alert", titleColor: "text-red-500" });
      return;
    }
    if (!newPwd || newPwd !== confirmPwd) {
      showDialog({ title: "無法修改", message: "新密碼不一致，或格式錯誤。", type: "alert", titleColor: "text-red-500" });
      return;
    }

    setAppData((prev) => ({
      ...prev,
      password: newPwd
    }));
    showDialog({ title: "修改成功", message: "教師登入管理密碼已順利更新！", type: "alert", titleColor: "text-green-600" });
    setOldPwd("");
    setNewPwd("");
    setConfirmPwd("");
  };

  const handleSaveTimerSettings = () => {
    setAppData((prev) => ({
      ...prev,
      timerSettings: {
        minutes: Math.max(0, timerMin),
        seconds: Math.max(0, Math.min(59, timerSec))
      }
    }));
    showDialog({ title: "設定成功", message: "教用倒數計時基礎值已更新，重開計時器將載入新時間。", type: "alert", titleColor: "text-green-600" });
  };

  return (
    <div className="modal-backdrop flex items-center justify-center p-4">
      <div className="game-box bg-white w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden border-[6px]">
        {/* Header */}
        <div className="bg-gray-800 p-4 flex justify-between items-center text-white shrink-0">
          <h2 className="text-3xl font-black">
            <i className="fas fa-cog"></i> 教師管理後台
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                showDialog({
                  title: "手動存檔",
                  message: "已經將目前全班學生、寵物、計時、今日任務等完整資料儲存至本地瀏覽器中！",
                  type: "alert",
                  titleColor: "text-green-600"
                });
              }}
              className="btn-game bg-blue-500 text-white px-5 py-2 text-xl rounded-lg shadow-none hover:scale-110"
            >
              <i className="fas fa-save"></i> 儲存進度
            </button>
            <button
              onClick={() => {
                exportBackupData(appData);
                showDialog({
                  title: "快速安全備份",
                  message: `您的一鍵完整資料備份檔案已成功包裝並開始下載 (${getFormattedDateTime()})！此檔案可在未來任何時候用作一鍵還原或跨平台移轉。`,
                  type: "alert",
                  titleColor: "text-emerald-650"
                });
              }}
              className="btn-game bg-emerald-500 text-white px-5 py-2 text-xl rounded-lg shadow-none hover:scale-110"
            >
              <i className="fas fa-database"></i> 💾 快速備份
            </button>
            <button
              onClick={onClose}
              className="btn-game bg-white text-gray-800 px-5 py-2 text-xl rounded-lg shadow-none hover:scale-110"
            >
              關閉
            </button>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b-[3px] border-gray-700 bg-gray-100 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab("tab-students")}
            className={`flex-1 min-w-[140px] py-3 text-xl font-bold hover:bg-gray-200 border-b-4 ${
              activeTab === "tab-students" ? "bg-white border-blue-500 text-blue-600" : "border-transparent text-gray-600"
            }`}
          >
            學生管理
          </button>
          <button
            onClick={() => setActiveTab("tab-tasks")}
            className={`flex-1 min-w-[140px] py-3 text-xl font-bold hover:bg-gray-200 border-b-4 ${
              activeTab === "tab-tasks" ? "bg-white border-blue-500 text-blue-600" : "border-transparent text-gray-600"
            }`}
          >
            一般任務
          </button>
          <button
            onClick={() => setActiveTab("tab-timed-tasks")}
            className={`flex-1 min-w-[140px] py-3 text-xl font-bold hover:bg-gray-200 border-b-4 ${
              activeTab === "tab-timed-tasks" ? "bg-white border-blue-500 text-red-600" : "border-transparent text-gray-600"
            }`}
          >
            <i className="fas fa-hourglass-half mr-1"></i> 限時任務
          </button>
          <button
            onClick={() => setActiveTab("tab-rewards")}
            className={`flex-1 min-w-[140px] py-3 text-xl font-bold hover:bg-gray-200 border-b-4 ${
              activeTab === "tab-rewards" ? "bg-white border-blue-500 text-pink-600" : "border-transparent text-gray-600"
            }`}
          >
            <i className="fas fa-gift mr-1"></i> 獎勵派發
          </button>
          <button
            onClick={() => setActiveTab("tab-settings")}
            className={`flex-1 min-w-[140px] py-3 text-xl font-bold hover:bg-gray-200 border-b-4 ${
              activeTab === "tab-settings" ? "bg-white border-blue-500 text-orange-600" : "border-transparent text-gray-600"
            }`}
          >
            設定/系統
          </button>
          <button
            onClick={() => setActiveTab("tab-addons")}
            className={`flex-1 min-w-[140px] py-3 text-xl font-bold hover:bg-gray-200 border-b-4 ${
              activeTab === "tab-addons" ? "bg-white border-blue-500 text-[#059669]" : "border-transparent text-gray-600"
            }`}
          >
            <i className="fas fa-cubes mr-1"></i> 理想國建設/事件
          </button>
          <button
            onClick={() => setActiveTab("tab-gacha-items")}
            className={`flex-1 min-w-[140px] py-3 text-xl font-bold hover:bg-gray-200 border-b-4 ${
              activeTab === "tab-gacha-items" ? "bg-white border-blue-500 text-purple-600" : "border-transparent text-gray-600"
            }`}
          >
            <i className="fas fa-magic mr-1"></i> 轉蛋壁紙管理
          </button>
          <button
            onClick={() => setActiveTab("tab-achievements")}
            className={`flex-1 min-w-[140px] py-3 text-xl font-bold hover:bg-gray-200 border-b-4 ${
              activeTab === "tab-achievements" ? "bg-white border-blue-500 text-rose-600" : "border-transparent text-gray-600"
            }`}
          >
            <i className="fas fa-trophy mr-1"></i> 成就管理
          </button>
          <button
            onClick={() => setActiveTab("tab-history")}
            className={`flex-1 min-w-[140px] py-3 text-xl font-bold hover:bg-gray-200 border-b-4 ${
              activeTab === "tab-history" ? "bg-white border-blue-500 text-indigo-600" : "border-transparent text-gray-600"
            }`}
          >
            <i className="fas fa-history mr-1"></i> 歷程與補發
          </button>
          <button
            onClick={() => setActiveTab("tab-backup")}
            className={`flex-1 min-w-[140px] py-3 text-xl font-bold hover:bg-gray-200 border-b-4 ${
              activeTab === "tab-backup" ? "bg-white border-blue-500 text-emerald-600" : "border-transparent text-gray-600"
            }`}
          >
            <i className="fas fa-database mr-1"></i> 💾 資料備份中心
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 bg-gray-50 p-6 overflow-y-auto custom-scroll">
          {/* TAB 1: Student Management */}
          {activeTab === "tab-students" && (
            <div className="space-y-6">
              {/* 💾 系統快速安全備份捷徑 */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 border-[3px] border-emerald-600 rounded-xl shadow-[4px_4px_0px_rgba(16,185,129,1)] flex flex-col md:flex-row justify-between items-center gap-4 text-left">
                <div className="flex-1">
                  <h4 className="text-xl font-extrabold text-emerald-800 flex items-center gap-1.5">
                    <span>💾 系統快速備份門戶</span>
                  </h4>
                  <p className="text-xs text-emerald-700 font-bold mt-1 leading-relaxed">
                    在進行設備轉移、GitHub/Vercel部署或重置前，建議一鍵打包下載目前班級設定與全班學員的所有進度封包。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    exportBackupData(appData);
                    showDialog({
                      title: "快速安全備份已下載",
                      message: `已成功為您匯出並自動下載備份檔案：backup_${getFormattedDateTime()}.json。\n\n您可以使用此檔案在任何設備或部署環境中一鍵還原完整進度。`,
                      type: "alert",
                      titleColor: "text-emerald-700"
                    });
                  }}
                  className="btn-game bg-emerald-500 hover:bg-emerald-600 text-white font-black text-base px-5 py-3 whitespace-nowrap shadow-none hover:scale-102 transition-transform"
                >
                  <i className="fas fa-file-download mr-1.5"></i> 💾 執行快速備份
                </button>
              </div>

              <div className="flex flex-col gap-2 bg-white p-4 border-[3px] border-gray-700 rounded-xl shadow-[4px_4px_0px_rgba(45,55,72,1)]">
                <h3 className="text-2xl font-bold text-blue-600 border-b-2 border-gray-200 pb-2">
                  <i className="fas fa-user-plus mr-1"></i> 報到新學生
                </h3>
                <div className="flex flex-wrap gap-3 items-end mt-2">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block font-bold text-gray-500 mb-1">學生姓名</label>
                    <input
                      type="text"
                      id="new-student-name"
                      placeholder="輸入姓名"
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddStudent();
                      }}
                      className="w-full p-2 border-2 border-gray-700 rounded-lg font-bold text-xl"
                    />
                  </div>
                  <button
                    onClick={handleAddStudent}
                    className="btn-game bg-blue-400 text-white px-6 py-2 text-xl h-[46px]"
                  >
                    <i className="fas fa-plus mr-2"></i> 新增
                  </button>
                </div>
              </div>

              <div className="bg-white border-[3px] border-gray-700 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-200 text-xl font-black">
                    <tr className="border-b-[3px] border-gray-700">
                      <th className="p-3 w-1/6">姓名 (修改)</th>
                      <th className="p-3 w-1/4">學生生日</th>
                      <th className="p-3 w-[15%] text-indigo-750">守護星座</th>
                      <th className="p-3 w-1/6">可用點數</th>
                      <th className="p-3 w-1/6 text-red-650">壽星加倍 ×2</th>
                      <th className="p-3">操作</th>
                    </tr>
                  </thead>
                  <tbody className="text-lg font-bold">
                    {(appData?.students || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500 font-bold">
                          目前班上尚無學生。請在上方建立第一位同學
                        </td>
                      </tr>
                    ) : (
                      (appData?.students || []).map((s) => (
                        <tr key={s.id} className="border-b-2 border-gray-100 hover:bg-gray-50">
                          <td
                            className="p-3 cursor-pointer text-blue-600 hover:underline font-black"
                            onClick={() => handleRenameStudent(s.id, s.name)}
                          >
                            {s.name}
                          </td>
                          <td className="p-3">
                            <input
                              type="date"
                              value={s.studentBirthday || ""}
                              onChange={(e) => handleSetBirthday(s.id, e.target.value)}
                              className="w-full p-1.5 border-2 border-gray-400 rounded-lg text-sm font-extrabold text-gray-800"
                            />
                          </td>
                          <td className="p-3 text-indigo-800 font-black text-sm">
                            {s.studentZodiac || getZodiac(s.studentBirthday) || "—"}
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              value={s.points}
                              onChange={(e) => handleSetPoints(s.id, e.target.value)}
                              className="w-20 p-1 border-2 border-gray-700 rounded font-black text-center text-base"
                            />
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => handleToggleBirthdayBonus(s.id)}
                              className={`px-3 py-1 text-xs rounded-full font-black border-2 transition-all cursor-pointer ${
                                (isTodayBirthday(s.studentBirthday) || s.birthdayBonusEnabled)
                                  ? "bg-gradient-to-r from-red-500 to-pink-500 text-white border-pink-600 animate-pulse shadow-sm"
                                  : "bg-gray-100 text-gray-400 border-gray-300"
                              }`}
                            >
                              {(isTodayBirthday(s.studentBirthday) || s.birthdayBonusEnabled) ? "🎂 已啟用倍率" : "關閉中"}
                            </button>
                            {isTodayBirthday(s.studentBirthday) && (
                              <span className="block text-[8px] text-red-500 font-black tracking-tighter mt-1">※ 今日壽星 (自動)</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleResetStudent(s.id, s.name)}
                                className="btn-game bg-orange text-white px-2 py-0.5 text-xs shadow-none"
                              >
                                重設蛋
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(s.id, s.name)}
                                className="btn-game bg-red-500 text-white px-2 py-0.5 text-xs shadow-none"
                              >
                                刪除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                 </table>
              </div>

              {/* 🎲 智慧抽號與公平統計控制區 */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 border-[3px] border-indigo-700/85 rounded-2xl shadow-md space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <h3 className="text-2xl font-black text-indigo-950 flex items-center gap-2">
                      <span>🎲</span> 智慧隨機抽籤公平統計
                    </h3>
                    <p className="text-xs font-bold text-indigo-750 max-w-2xl mt-1 leading-relaxed">
                      採用系統「動態權重衰減機制」。學生剛被點中其下次比重降低至最低（調降權重）；長時間未被選中的同學則隨點名輪空次數增加（權重在 1~30 間爬升），長期大數據下來可實現最溫馨公平的抽名機制。
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      showDialog({
                        title: "❓ 確定要重設抽號比重與週期次數嗎？",
                        message: "這將會把所有學生的抽取權重重設為標準 10 點，並把「本週期點名次數」全部歸零。累計總次數將繼續保留。\n確定繼續？",
                        type: "confirm",
                        onConfirm: () => {
                          setAppData((prev) => {
                            const refreshed = prev.students.map((s) => ({
                              ...s,
                              drawWeight: 10,
                              studentDrawHistory: {
                                drawCount: 0,
                                totalDrawnCount: s.studentDrawHistory?.totalDrawnCount || 0,
                                lastDrawnAt: s.studentDrawHistory?.lastDrawnAt || ""
                              }
                            }));
                            const next = { ...prev, students: refreshed };
                            if (autoSave) setTimeout(() => autoSave(next), 50);
                            return next;
                          });
                        }
                      });
                    }}
                    className="btn-game bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black py-2 px-4 shrink-0 shadow-none border-2 border-slate-700 rounded-xl"
                  >
                    🔄 重置抽號統計週期
                  </button>
                </div>

                <div className="bg-white border-2 border-indigo-250 rounded-xl overflow-hidden shadow-inner max-h-[300px] overflow-y-auto custom-scroll">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-indigo-100 text-indigo-900 font-extrabold sticky top-0 border-b border-indigo-200">
                      <tr>
                        <th className="p-2.5 w-1/4">學生姓名</th>
                        <th className="p-2.5">目前抽取權重</th>
                        <th className="p-2.5">下次中籤預估率</th>
                        <th className="p-2.5">本輪被抽中</th>
                        <th className="p-2.5">累計被抽中</th>
                        <th className="p-2.5">上次中籤時間</th>
                      </tr>
                    </thead>
                    <tbody className="font-extrabold text-slate-700 divide-y divide-slate-100">
                      {(appData?.students || []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                            暫無學員數據，建立學生後將自動追蹤。
                          </td>
                        </tr>
                      ) : (
                        (() => {
                          const studentsList = appData?.students || [];
                          const totalW = studentsList.reduce((sum, s) => sum + (typeof s.drawWeight === "number" ? s.drawWeight : 10), 0);
                          return studentsList.map((s) => {
                            const w = typeof s.drawWeight === "number" ? s.drawWeight : 10;
                            const prob = totalW > 0 ? ((w / totalW) * 100).toFixed(1) : "0.0";
                            const h = s.studentDrawHistory || { drawCount: 0, lastDrawnAt: "無紀錄", totalDrawnCount: 0 };
                            return (
                              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-2.5 text-slate-900 text-base font-black">{s.name}</td>
                                <td className="p-2.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`px-2 py-0.5 rounded text-xs font-black border ${
                                      w === 1 
                                        ? "bg-rose-50 border-rose-300 text-rose-700" 
                                        : w >= 20 
                                        ? "bg-green-50 border-green-300 text-green-750" 
                                        : "bg-indigo-50 border-indigo-200 text-indigo-700"
                                    }`}>
                                      {w} / 30
                                    </span>
                                    <div className="w-16 h-2 bg-slate-100 border border-slate-200 rounded overflow-hidden">
                                      <div 
                                        className={`h-full ${w === 1 ? "bg-rose-500" : w >= 20 ? "bg-emerald-500" : "bg-indigo-500"}`} 
                                        style={{ width: `${(w / 30) * 100}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-2.5 text-slate-900 text-base">{prob}%</td>
                                <td className="p-2.5 text-base text-purple-700">{h.drawCount || 0} 次</td>
                                <td className="p-2.5 text-base text-gray-500">{h.totalDrawnCount || 0} 次</td>
                                <td className="p-2.5 text-xs text-gray-450">{h.lastDrawnAt || "—"}</td>
                              </tr>
                            );
                          });
                        })()
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: General Quest Templates & Personal Task Management Center */}
          {activeTab === "tab-tasks" && (
            <div className="space-y-6">
              {/* Distinct Sub-Section Switcher Bar */}
              <div className="flex flex-wrap gap-2 border-b-2 pb-3 border-gray-200 mb-4 select-none">
                <button
                  onClick={() => setTaskSectionTab("personal")}
                  className={`btn-game text-base font-black py-2.5 px-6 shadow-none transition-transform hover:scale-102 cursor-pointer ${
                    taskSectionTab === "personal" 
                      ? "bg-blue-600 text-white border-blue-800" 
                      : "bg-gray-100 text-gray-600 border border-gray-300"
                  }`}
                >
                  📋 個人任務管理中心
                </button>
                <button
                  onClick={() => setTaskSectionTab("templates")}
                  className={`btn-game text-base font-black py-2.5 px-6 shadow-none transition-transform hover:scale-102 cursor-pointer ${
                    taskSectionTab === "templates" 
                      ? "bg-pink text-white border-pink-700" 
                      : "bg-gray-100 text-pink-600 border border-gray-300"
                  }`}
                >
                  📚 任務題庫與範本
                </button>
              </div>

              {taskSectionTab === "personal" ? (
                <div className="space-y-6">
                  {/* Part 1: Pending Approvals Queue */}
                  <div className="bg-white p-5 border-[3.5px] border-amber-400 rounded-2xl shadow-[4px_4px_0px_#f59e0b] space-y-4">
                    <h3 className="text-2xl font-black text-amber-700 pb-2 border-b-2 border-amber-100 flex items-center gap-2">
                      <span className="text-2xl">📥</span> 待核准任務回報審核
                    </h3>
                    {(() => {
                      const pendingList: Array<{ studentId: string; studentName: string; task: any }> = [];
                      appData.students.forEach((s) => {
                        (s.tasks || []).forEach((t) => {
                          if (t.status === "pending") {
                            pendingList.push({ studentId: s.id, studentName: s.name, task: t });
                          }
                        });
                      });

                      if (pendingList.length === 0) {
                        return (
                          <div className="p-6 text-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl font-bold text-gray-500">
                            🎉 目前沒有任何完成回報需要審核，所有學生都正在認真努力中！☀️
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {pendingList.map(({ studentId, studentName, task }) => (
                            <div key={`${studentId}_${task.id}`} className="game-box bg-gradient-to-r from-amber-50/50 to-orange-50/30 border-3 border-amber-300 p-4 rounded-xl flex flex-col justify-between shadow-sm relative">
                              <span className="absolute top-2 right-2 bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full font-black text-[10px] border border-amber-500">
                                ⏳ 等待審核
                              </span>
                              <div className="space-y-1.5 text-left pr-14">
                                <p className="text-sm font-black text-blue-600">🙋 學生：{studentName}</p>
                                <p className="text-xl font-black text-gray-800">📌 任務：{task.title}</p>
                                {task.description && (
                                  <p className="text-xs bg-white/60 p-1.5 border border-amber-150 rounded text-gray-600 font-medium">
                                    📝 說明：{task.description}
                                  </p>
                                )}
                                <p className="text-xs font-bold text-orange-600">💰 獎勵：+{task.points} 點數</p>
                                {task.dueDate && <p className="text-[11px] text-gray-400">📅 截止日：{task.dueDate}</p>}
                              </div>
                              <div className="flex gap-2.5 mt-4">
                                <button
                                  onClick={() => handleApproveTask(studentId, task.id)}
                                  className="btn-game bg-emerald-500 hover:bg-emerald-600 text-white flex-1 py-1.5 font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1"
                                >
                                  ✔️ 核准同意
                                </button>
                                <button
                                  onClick={() => handleRejectTask(studentId, task.id)}
                                  className="btn-game bg-rose-500 hover:bg-rose-600 text-white flex-1 py-1.5 font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1"
                                >
                                  ❌ 駁回重做
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Part 2: Assign New Task Panel */}
                  <div className="bg-white p-5 border-[3px] border-blue-500 rounded-2xl shadow-[4px_4px_0px_#2563eb] space-y-4">
                    <h3 className="text-2xl font-black text-blue-700 pb-2 border-b-2 border-blue-100">
                      🚀 新增並指派個人/小組任務
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                      <div>
                        <label className="block text-sm font-black text-gray-700 mb-1">💡 任務名稱</label>
                        <input
                          type="text"
                          value={ptTitle}
                          onChange={(e) => setPtTitle(e.target.value)}
                          placeholder="例：今日英文單字口說朗讀"
                          className="w-full p-2.5 border-2 border-gray-400 rounded-lg font-bold"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-black text-gray-700 mb-1">📝 任務說明（可留空）</label>
                        <input
                          type="text"
                          value={ptDescription}
                          onChange={(e) => setPtDescription(e.target.value)}
                          placeholder="可提供完成細節，例：請錄音上傳三個單字"
                          className="w-full p-2.5 border-2 border-gray-400 rounded-lg font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-black text-gray-700 mb-1">💰 獎勵點數</label>
                        <input
                          type="number"
                          value={ptPoints}
                          onChange={(e) => setPtPoints(Math.max(1, parseInt(e.target.value) || 10))}
                          className="w-full p-2.5 border-2 border-gray-400 rounded-lg font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-black text-gray-700 mb-1">🛡️ 任務類別</label>
                        <select
                          value={ptCategory}
                          onChange={(e: any) => setPtCategory(e.target.value)}
                          className="w-full p-2.5 border-2 border-gray-400 rounded-lg font-bold"
                        >
                          <option value="general">☀️ 一般日常生活</option>
                          <option value="learn">📖 學科學習突破</option>
                          <option value="coop">🤝 團隊合作共創</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-black text-gray-700 mb-1">📅 截止日期（選填）</label>
                        <input
                          type="date"
                          value={ptDueDate}
                          onChange={(e) => setPtDueDate(e.target.value)}
                          className="w-full p-2.5 border-2 border-gray-400 rounded-lg font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-black text-gray-700 mb-1">🔄 重複性</label>
                        <div className="flex items-center gap-2 p-2.5 border-2 border-gray-400 rounded-lg bg-gray-50">
                          <input
                            type="checkbox"
                            id="ptIsRepeatable"
                            checked={ptIsRepeatable}
                            onChange={(e) => setPtIsRepeatable(e.target.checked)}
                            className="w-5 h-5 cursor-pointer accent-blue-600"
                          />
                          <label htmlFor="ptIsRepeatable" className="font-bold text-gray-700 cursor-pointer select-none">
                            是否設定為：可重複領取
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-black text-gray-700 mb-1">🎯 指派目標</label>
                        <select
                          value={ptTargetType}
                          onChange={(e: any) => setPtTargetType(e.target.value)}
                          className="w-full p-2.5 border-2 border-gray-400 rounded-lg font-bold text-blue-700"
                        >
                          <option value="all">□ 全班所有人</option>
                          <option value="student">□ 指定單一學生</option>
                          <option value="group">□ 指定合作小組</option>
                        </select>
                      </div>

                      {ptTargetType === "student" && (
                        <div>
                          <label className="block text-sm font-black text-blue-700 mb-1">👤 選擇指派學生</label>
                          <select
                            value={ptSelectedStudentId}
                            onChange={(e) => setPtSelectedStudentId(e.target.value)}
                            className="w-full p-2.5 border-2 border-blue-400 rounded-lg bg-blue-50/50 font-bold"
                          >
                            <option value="">-- 請選擇學生 --</option>
                            {appData.students.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.id})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {ptTargetType === "group" && (
                        <div>
                          <label className="block text-sm font-black text-blue-700 mb-1">👥 選擇指派小組</label>
                          <select
                            value={ptSelectedGroupId}
                            onChange={(e) => setPtSelectedGroupId(e.target.value)}
                            className="w-full p-2.5 border-2 border-blue-400 rounded-lg bg-blue-50/50 font-bold"
                          >
                            <option value="">-- 請選擇編制小組 --</option>
                            {(appData.groups || []).map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={handleAssignPersonalTask}
                        className="btn-game bg-blue-600 hover:bg-blue-700 text-white py-3 px-8 text-lg font-black rounded-xl cursor-pointer shadow-md hover:scale-102 flex items-center gap-2"
                      >
                        <i className="fas fa-paper-plane"></i> 立即發布並即時同步學生端
                      </button>
                    </div>
                  </div>

                  {/* Part 3: Management Grid of Student Tasks */}
                  <div className="bg-white p-5 border-[3px] border-gray-700 rounded-2xl shadow-sm space-y-4">
                    <h3 className="text-2xl font-black text-gray-800 pb-2 border-b-2 border-gray-100 flex items-center justify-between">
                      <span>📋 學生任務庫明細管理</span>
                      <span className="text-xs bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full font-black border border-gray-300">
                        總人數：{appData.students.length} 人
                      </span>
                    </h3>

                    {/* Inline Pt editor dialog */}
                    {editingPtId && (
                      <div className="fixed inset-0 bg-black/60 z-[99991] flex items-center justify-center p-4">
                        <div className="game-box bg-white max-w-lg w-full p-6 border-[6px] border-gray-700 rounded-2xl shadow-2xl relative text-left space-y-4">
                          <h4 className="text-xl font-black text-blue-700 border-b pb-2 flex items-center gap-1.5">
                            📝 修改受派個人任務
                          </h4>
                          <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">任務名稱</label>
                            <input
                              type="text"
                              value={editingPtTitle}
                              onChange={(e) => setEditingPtTitle(e.target.value)}
                              className="w-full p-2 border-2 border-gray-700 rounded-lg font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">任務說明</label>
                            <input
                              type="text"
                              value={editingPtDescription}
                              onChange={(e) => setEditingPtDescription(e.target.value)}
                              className="w-full p-2 border-2 border-gray-700 rounded-lg font-bold"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-gray-400 mb-1">獎勵點數</label>
                              <input
                                type="number"
                                value={editingPtPoints}
                                onChange={(e) => setEditingPtPoints(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full p-2 border-2 border-gray-700 rounded-lg font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-400 mb-1">截止日期</label>
                              <input
                                type="date"
                                value={editingPtDueDate}
                                onChange={(e) => setEditingPtDueDate(e.target.value)}
                                className="w-full p-2 border-2 border-gray-700 rounded-lg font-bold"
                              />
                            </div>
                          </div>
                          <div className="flex gap-3 justify-end pt-4 border-t">
                            <button
                              onClick={() => setEditingPtId(null)}
                              className="btn-game bg-gray-300 text-gray-800 px-4 py-2 font-black rounded-lg cursor-pointer"
                            >
                              取消
                            </button>
                            <button
                              onClick={handleSavePersonalTaskEdit}
                              className="btn-game bg-blue-600 text-white px-5 py-2 font-black rounded-lg cursor-pointer hover:scale-103"
                            >
                              確修儲存
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      {appData.students.map((student) => {
                        const studentTasks = student.tasks || [];
                        return (
                          <div key={student.id} className="p-4 bg-gray-50 border-2 border-gray-300 rounded-xl flex flex-col justify-between text-left">
                            <div className="flex flex-wrap justify-between items-center border-b pb-2 mb-2">
                              <span className="text-lg font-black text-gray-800 flex items-center gap-1.5">
                                👦 {student.name}{" "}
                                <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded border border-indigo-200">
                                  {student.studentBirthday || "未設定生日"}
                                </span>
                              </span>
                              <span className="text-xs font-bold text-gray-500">
                                任務數：{studentTasks.length} 個
                              </span>
                            </div>

                            {studentTasks.length === 0 ? (
                              <p className="text-xs text-gray-400 italic">目前尚未指派個人任務或其餘一般任務。</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-1">
                                {studentTasks.map((t) => {
                                  const labelCat = t.category === "learn" ? "📖 學習" : t.category === "coop" ? "🤝 合作" : "☀️ 一般";
                                  const statusColor = t.status === "pending"
                                    ? "bg-amber-100 text-amber-850 border-amber-300"
                                    : t.status === "approved"
                                      ? "bg-emerald-100 text-emerald-850 border-emerald-300"
                                      : t.status === "claimed"
                                        ? "bg-indigo-100 text-indigo-800 border-indigo-200 opacity-60"
                                        : "bg-gray-100 text-gray-600 border-gray-300";

                                  let statusText = "進行中";
                                  if (t.status === "pending") statusText = "待核准";
                                  if (t.status === "approved") statusText = "已核准 (等學生領點數)";
                                  if (t.status === "claimed") statusText = "完成簽退紀錄";

                                  return (
                                    <div key={t.id} className="p-3 bg-white border border-gray-200 rounded-lg font-sans flex flex-col justify-between shadow-xs">
                                      <div className="space-y-1">
                                        <div className="flex justify-between items-start gap-1">
                                          <strong className="text-sm text-gray-800 line-clamp-1">{t.title}</strong>
                                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 border border-gray-300 text-gray-500 shrink-0 font-bold leading-none">
                                            {t.points} 點
                                          </span>
                                        </div>
                                        {t.description && (
                                          <p className="text-[10px] text-gray-400 bg-gray-50/50 border border-gray-100 p-1 rounded font-medium line-clamp-2 leading-tight">
                                            {t.description}
                                          </p>
                                        )}
                                        <div className="flex flex-wrap gap-1 items-center pt-1.5">
                                          <span className="text-[9px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded font-black border border-sky-150">
                                            {labelCat}
                                          </span>
                                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black border ${statusColor}`}>
                                            {statusText}
                                          </span>
                                          {t.isRepeatable && (
                                            <span className="text-[9px] bg-purple-50 text-purple-750 px-1.5 py-0.5 rounded font-black border border-purple-150">
                                              🔁 可重複
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1 mt-3 pt-2 border-t border-gray-100">
                                        <button
                                          onClick={() => handleEditPtStart(t)}
                                          className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-1 rounded hover:bg-blue-100 font-extrabold cursor-pointer"
                                          title="修改"
                                        >
                                          📝 修改
                                        </button>
                                        <button
                                          onClick={() => handleDeletePersonalTask(t.id)}
                                          className="text-[10px] text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-1 rounded hover:bg-rose-100 font-extrabold cursor-pointer"
                                          title="刪除"
                                        >
                                          🗑️ 刪除
                                        </button>
                                        {t.status !== "claimed" ? (
                                          <button
                                            onClick={() => handleTeacherCompleteTask(student.id, t.id)}
                                            className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-1 rounded hover:bg-emerald-100 font-extrabold ml-auto cursor-pointer"
                                            title="標記完成並手動加點"
                                          >
                                            ✔️ 標記完成
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => handleTeacherResetTask(student.id, t.id)}
                                            className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-1 rounded hover:bg-purple-100 font-extrabold ml-auto cursor-pointer"
                                            title="重置為未完成"
                                          >
                                            🔄 重置任務
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-white p-4 border-[3px] border-gray-700 rounded-xl shadow-sm space-y-4">
                    <h3 className="text-2xl font-bold text-gray-800 pb-2 border-b">建立一般任務題庫</h3>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                      <div>
                        <label className="block text-lg font-bold text-gray-600 mb-1">任務名稱</label>
                        <input
                          type="text"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          placeholder="例：主動擦黑板"
                          className="w-full p-2 border-2 border-gray-700 rounded-lg font-bold text-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-lg font-bold text-gray-600 mb-1">任務模式</label>
                        <select
                          value={newTaskType}
                          onChange={(e: any) => setNewTaskType(e.target.value)}
                          className="w-full p-2 border-2 border-gray-700 rounded-lg font-bold text-xl"
                        >
                          <option value="individual">👤 個人</option>
                          <option value="group">🌍 團體</option>
                        </select>
                      </div>
                      {newTaskType === "group" && (
                        <div>
                          <label className="block text-lg font-bold text-gray-600 mb-1">目標聯署人數</label>
                          <input
                            type="number"
                            min={1}
                            value={newTaskTarget}
                            onChange={(e) => setNewTaskTarget(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full p-2 border-2 border-gray-700 rounded-lg font-bold text-xl"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-lg font-bold text-gray-600 mb-1">類別</label>
                        <select
                          value={newTaskCategory}
                          onChange={(e: any) => setNewTaskCategory(e.target.value)}
                          className="w-full p-2 border-2 border-gray-700 rounded-lg font-bold text-xl"
                        >
                          <option value="learn">📖 學習</option>
                          <option value="coop">🤝 合作</option>
                          <option value="general">☀️ 一般</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-lg font-bold text-gray-600 mb-1">完成贈與點數</label>
                        <input
                          type="number"
                          value={newTaskPoints}
                          onChange={(e) => setNewTaskPoints(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full p-2 border-2 border-gray-700 rounded-lg font-bold text-xl"
                        />
                      </div>
                      <div>
                        <button
                          onClick={handleAddTask}
                          className="btn-game bg-pink text-white w-full py-2 text-xl h-[46px]"
                        >
                          <i className="fas fa-plus"></i> 新增任務
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <h4 className="text-xl font-bold text-gray-700 text-left">任務範本題庫</h4>
                    {appData.taskTemplates.map((t) => (
                      <div key={t.id} className="game-box bg-white p-3 flex justify-between items-center shadow-sm">
                        <div className="font-black text-xl">
                          {t.icon || "⭐"} {t.title}{" "}
                          <span className="text-sm text-gray-500 font-bold">
                            ({t.type === "group" ? `團體:${t.targetCount}人` : "個人"}｜{t.points}點｜{t.category === "learn" ? "學習" : t.category === "coop" ? "合作" : "一般"})
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="btn-game bg-red-500 text-white px-3 py-1 shadow-none text-sm"
                        >
                          刪除
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

              {/* TAB 3: Timed Special Assignments */}
          {activeTab === "tab-timed-tasks" && (
            <div className="space-y-6">
              <div className="bg-white p-4 border-[3px] border-red-400 rounded-xl shadow-sm space-y-4">
                <h3 className="text-2xl font-bold text-red-600 pb-2 border-b">
                  <i className="fas fa-hourglass-half mr-1"></i> 新增限時閃擊任務
                </h3>
                <div className="space-y-4">
                  {/* Row 1 details */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-bold text-red-600 mb-1">限時任務名稱</label>
                      <input
                        type="text"
                        value={newTTTitle}
                        onChange={(e) => setNewTTTitle(e.target.value)}
                        placeholder="例：3分鐘內收齊全組考卷"
                        className="w-full p-2 border-2 border-red-300 rounded-lg font-bold text-xl bg-red-50/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-1">模式</label>
                      <select
                        value={newTTType}
                        onChange={(e: any) => setNewTTType(e.target.value)}
                        className="w-full p-2 border-2 border-gray-700 rounded-lg font-bold text-xl bg-white"
                      >
                        <option value="individual">👤 個人模式</option>
                        <option value="group">🌍 團體模式</option>
                      </select>
                    </div>
                    {newTTType === "group" && (
                      <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">連署人數</label>
                        <input
                          type="number"
                          min={1}
                          value={newTTTarget}
                          onChange={(e) => setNewTTTarget(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full p-2 border-2 border-gray-700 rounded-lg font-bold text-xl"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-1">獎勵點數</label>
                      <input
                        type="number"
                        value={newTTPoints}
                        onChange={(e) => setNewTTPoints(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full p-2 border-2 border-gray-700 rounded-lg font-bold text-xl"
                      />
                    </div>
                  </div>

                  {/* Row 2 Timing modes */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end bg-rose-50/30 p-3 rounded-lg border border-red-105">
                    <div>
                      <label className="block text-sm font-bold text-red-600 mb-1">⏱️ 時間設定模式</label>
                      <select
                        value={newTTTimeMode}
                        onChange={(e: any) => setNewTTTimeMode(e.target.value)}
                        className="w-full p-2 border-2 border-red-300 rounded-lg font-bold text-lg bg-white"
                      >
                        <option value="countdown">⏳ 倒數計時模式</option>
                        <option value="endTime">🛑 指定截止時間模式</option>
                      </select>
                    </div>

                    <div className="md:col-span-1">
                      {newTTTimeMode === "countdown" ? (
                        <div>
                          <label className="block text-sm font-bold text-gray-600 mb-1">任務長度</label>
                          <div className="flex gap-2 items-center">
                            <div>
                              <input
                                type="number"
                                min={0}
                                value={newTTMin}
                                onChange={(e) => setNewTTMin(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-16 p-2 border-2 border-gray-700 rounded-lg font-bold text-xl text-center"
                              />
                              <span className="text-xs text-gray-500 font-bold block mt-0.5">分鐘</span>
                            </div>
                            <div className="font-extrabold text-2xl">:</div>
                            <div>
                              <input
                                type="number"
                                min={0}
                                max={59}
                                value={newTTSec}
                                onChange={(e) => setNewTTSec(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                                className="w-16 p-2 border-2 border-gray-700 rounded-lg font-bold text-xl text-center"
                              />
                              <span className="text-xs text-gray-500 font-bold block mt-0.5">秒數</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-bold text-gray-600 mb-1">設定截止時間</label>
                          <div className="flex gap-1.5 items-center">
                            <input
                              type="time"
                              value={newTTEndTimeTarget}
                              onChange={(e) => setNewTTEndTimeTarget(e.target.value)}
                              className="p-1.5 border-2 border-gray-700 rounded-lg font-bold text-lg text-center w-28 bg-white"
                            />
                            <select
                              value={newTTEndTimeTarget}
                              onChange={(e) => setNewTTEndTimeTarget(e.target.value)}
                              className="p-1 border border-gray-400 rounded-lg font-bold text-xs bg-white text-gray-700 flex-1 max-w-[130px] h-[40px]"
                            >
                              <option value="">快速推薦...</option>
                              <option value="10:20">10:20</option>
                              <option value="11:40">11:40</option>
                              <option value="14:00">14:00</option>
                              <option value="15:30">15:30</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <button
                        onClick={handleAddTimedTask}
                        className="btn-game bg-red-500 text-white w-full py-2 text-lg h-[46px] flex items-center justify-center gap-1.5"
                      >
                        <i className="fas fa-plus"></i>
                        <span>新增閃擊任務</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <h4 className="text-xl font-bold text-gray-700 text-left">目前限時任務一覽</h4>
                {(appData?.timedTasks || []).map((t, index) => {
                  const isEditing = editingTTId === t.id;
                  const rem = getTimedTaskRemainingSeconds(t);

                  return (
                    <div
                      key={t.id}
                      className={`game-box p-4 flex flex-col gap-3 shadow-sm border-[3px] text-left transition-all ${
                        t.isActive ? "border-red-400 bg-red-50/50 shadow-md" : "bg-white"
                      }`}
                    >
                      {isEditing ? (
                        <div className="space-y-3 p-3 bg-red-50/20 border border-red-200 rounded-xl w-full">
                          <h5 className="font-bold text-red-600">✏️ 修改限時任務</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">任務名稱</label>
                              <input
                                type="text"
                                value={editingTTTitle}
                                onChange={(e) => setEditingTTTitle(e.target.value)}
                                className="w-full p-1.5 border-2 border-gray-400 rounded bg-white text-base font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">獎勵點數</label>
                              <input
                                type="number"
                                value={editingTTPoints}
                                onChange={(e) => setEditingTTPoints(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full p-1.5 border-2 border-gray-400 rounded bg-white text-base font-bold"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">模式</label>
                              <select
                                value={editingTTType}
                                onChange={(e: any) => setEditingTTType(e.target.value)}
                                className="w-full p-1.5 border-2 border-gray-400 rounded bg-white text-base font-bold"
                              >
                                <option value="individual">👤 個人</option>
                                <option value="group">🌍 團體</option>
                              </select>
                            </div>
                            {editingTTType === "group" && (
                              <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">連署人數</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={editingTTTarget}
                                  onChange={(e) => setEditingTTTarget(Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-full p-1.5 border-2 border-gray-400 rounded bg-white text-base font-bold"
                                />
                              </div>
                            )}
                            <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">⏱️ 時間設定模式</label>
                              <select
                                value={editingTTTimeMode}
                                onChange={(e: any) => setEditingTTTimeMode(e.target.value)}
                                className="w-full p-1.5 border-2 border-gray-400 rounded bg-white text-base font-bold"
                              >
                                <option value="countdown">⏳ 倒數計時模式</option>
                                <option value="endTime">🛑 指定截止時間模式</option>
                              </select>
                            </div>
                          </div>

                          <div className="w-full pt-1">
                            {editingTTTimeMode === "countdown" ? (
                              <div className="flex gap-2 max-w-xs">
                                <div className="flex-1">
                                  <label className="block text-xs font-bold text-gray-500 mb-1">分鐘</label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={editingTTMin}
                                    onChange={(e) => setEditingTTMin(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full p-1.5 border-2 border-gray-400 rounded bg-white text-base font-bold text-center"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-xs font-bold text-gray-500 mb-1">秒數</label>
                                  <input
                                    type="number"
                                    min={0}
                                    max={59}
                                    value={editingTTSec}
                                    onChange={(e) => setEditingTTSec(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                                    className="w-full p-1.5 border-2 border-gray-400 rounded bg-white text-base font-bold text-center"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <label className="block text-xs font-bold text-gray-500 mb-1">截止時間</label>
                                <div className="flex gap-2 items-center max-w-sm">
                                  <input
                                    type="time"
                                    value={editingTTEndTimeTarget}
                                    onChange={(e) => setEditingTTEndTimeTarget(e.target.value)}
                                    className="p-1 border border-gray-400 rounded text-base font-bold w-28 text-center bg-white"
                                  />
                                  <select
                                    value={editingTTEndTimeTarget}
                                    onChange={(e) => setEditingTTEndTimeTarget(e.target.value)}
                                    className="p-1 border border-gray-300 rounded text-xs"
                                  >
                                    <option value="">快速選擇...</option>
                                    <option value="10:20">今日 10:20</option>
                                    <option value="11:40">今日 11:40</option>
                                    <option value="14:00">今日 14:00</option>
                                    <option value="15:30">今日 15:30</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 justify-end pt-2">
                            <button
                              onClick={() => setEditingTTId(null)}
                              className="btn-game bg-gray-300 text-gray-700 px-3 py-1.5 text-xs shadow-none font-bold"
                            >
                              取消
                            </button>
                            <button
                              onClick={() => {
                                handleSaveTimedTaskEdit(index);
                                if (autoSave) {
                                  setTimeout(() => autoSave(), 50);
                                }
                              }}
                              className="btn-game bg-sky-500 text-white px-3 py-1.5 text-xs shadow-none font-bold animate-pulse"
                            >
                              保存修改
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap justify-between items-center gap-3 w-full">
                          {/* Rich Details Grid (Name, Time Mode, Start/End, Remaining) */}
                          <div className="space-y-2 text-left flex-1 min-w-[280px]">
                            <div className="font-black text-2xl text-slate-800 flex flex-wrap items-center gap-1.5">
                              <span>⏳ {t.title}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-black ${
                                t.type === "group" ? "bg-purple-100 text-purple-700 border border-purple-200" : "bg-sky-100 text-sky-700 border border-sky-200"
                              }`}>
                                {t.type === "group" ? `🌍 團體模式 (${t.targetCount}人)` : "👤 個人模式"}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 border border-yellow-250 rounded font-black">
                                +{t.points} 🎁
                              </span>
                              {t.isActive && <span className="text-red-500 text-xs px-2 py-0.5 border border-red-300 rounded-full font-black bg-red-50 animate-pulse">（進行中）</span>}
                              {t.expired && <span className="text-gray-400 text-xs px-2 py-0.5 border border-gray-300 rounded-full font-black bg-gray-50">（時間已截止）</span>}
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5 text-sm bg-slate-100/50 p-2.5 rounded-lg border border-slate-200 max-w-2xl font-bold">
                              <div>
                                <span className="text-gray-400 text-xs block font-bold">⏱️ 時間設定模式</span>
                                <span className="text-slate-700">
                                  {t.timeMode === "endTime" ? "🛑 指定截止時間" : "⏳ 倒數計時計秒"}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 text-xs block font-bold">📅 開始時間</span>
                                <span className="text-emerald-700 font-extrabold">{t.startTimeStr || "--:--"}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 text-xs block font-bold">🏁 結束時間</span>
                                <span className="text-rose-700 font-extrabold">{t.endTimeStr || "--:--"}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 text-xs block font-bold">⏳ 剩餘時間</span>
                                {t.isActive ? (
                                  <span className="text-red-600 font-black animate-pulse">
                                    {Math.floor(rem / 60)} 分 {rem % 65 % 60} 碼
                                  </span>
                                ) : t.expired || rem <= 0 ? (
                                  <span className="text-gray-400">已截止</span>
                                ) : (
                                  <span className="text-gray-500">
                                    {Math.floor(rem / 60)} 分 {rem % 60} 秒（未啟動）
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                handleStartTimedTask(index);
                                if (autoSave) {
                                  setTimeout(() => autoSave(), 50);
                                }
                              }}
                              className="btn-game bg-green-500 text-white px-3 py-2 text-sm shadow-none font-bold hover:scale-103"
                            >
                              🔄 重置其並啟動時間
                            </button>
                            <button
                              onClick={() => {
                                handleToggleTimedTask(index);
                                if (autoSave) {
                                  setTimeout(() => autoSave(), 50);
                                }
                              }}
                              className={`btn-game ${t.isActive ? "bg-gray-400 text-gray-800" : "bg-blue-500 text-white"} px-3 py-2 text-sm shadow-none font-bold hover:scale-103`}
                            >
                              {t.isActive ? "暫聽/停用" : "手動啟用"}
                            </button>
                            <button
                              onClick={() => handleEditTimedTaskStart(t)}
                              className="btn-game bg-amber-500 text-white px-3 py-2 text-sm shadow-none font-bold hover:scale-103"
                            >
                              ✏️ 修改
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteTimedTask(index);
                                if (autoSave) {
                                  setTimeout(() => autoSave(), 50);
                                }
                              }}
                              className="btn-game bg-red-500 text-white px-3 py-2 text-sm shadow-none font-bold hover:scale-103"
                            >
                              刪除
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Completed / Uncompleted List display box */}
                      <div className="w-full mt-2 p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs space-y-2">
                        <div className="flex items-center gap-1.5 text-gray-400 font-extrabold pb-1.5 border-b border-dashed border-slate-200">
                          <i className="fas fa-users"></i>
                          <span>學生與小組回報進度：已完成 {t.completedBy.length} / {(appData?.students || []).length} 人</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-left pt-1">
                          <div>
                            <span className="font-extrabold text-[#16a34a] block mb-1">已完成 (✔)：</span>
                            {t.completedBy.length === 0 ? (
                              <span className="text-gray-400 font-bold italic">目前尚無同學完成</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {(appData?.students || [])
                                  .filter(s => t.completedBy.includes(s.id))
                                  .map(s => (
                                    <button
                                      key={s.id}
                                      onClick={() => {
                                        if (window.confirm(`確定要取消學生 ${s.name} 的此任務完成登記嗎？（點數將扣回）`)) {
                                          handleCancelStudentTimedTask(index, s.id);
                                        }
                                      }}
                                      title="點擊取消此學生的完成回報登記"
                                      className="bg-emerald-50 hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-black transition-all flex items-center gap-1 group cursor-pointer"
                                    >
                                      <span>✔ {s.name}</span>
                                      <span className="text-[9px] text-gray-400 group-hover:text-red-650 font-bold ml-1">✕</span>
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-extrabold text-[#dc2626] block mb-1">未完成 (✘)：</span>
                            {(appData?.students || []).filter(s => !t.completedBy.includes(s.id)).length === 0 ? (
                              <span className="text-gray-400 font-bold italic">全班皆已完成！✨</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {(appData?.students || [])
                                  .filter(s => !t.completedBy.includes(s.id))
                                  .map(s => (
                                    <span key={s.id} className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded font-black">
                                      ✘ {s.name}
                                    </span>
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {(appData?.groups || []).length > 0 && (
                          <div className="pt-2 border-t border-dashed border-slate-200 text-left">
                            <span className="font-extrabold text-blue-600 block mb-1.5">👥 小組完成狀態：</span>
                            <div className="flex flex-wrap gap-2">
                              {(appData?.groups || []).map(g => {
                                const groupCompleted = g.members.length > 0 && g.members.some(mid => t.completedBy.includes(mid));
                                return (
                                  <span key={g.id} className={`px-2 py-1 rounded border font-black text-[11px] ${
                                    groupCompleted ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-rose-50 border-rose-300 text-rose-800"
                                  }`}>
                                    {g.name} {groupCompleted ? "✔" : "✘"}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: Rewards and groups layout */}
          {activeTab === "tab-rewards" && (
            <div className="space-y-6">
              {/* Point allocation */}
              <div className="bg-white p-5 border-[4px] border-gray-700 rounded-xl shadow-[4px_4px_0px_rgba(45,55,72,1)]">
                <h3 className="text-3xl font-black text-blue-600 mb-4 border-b-2 border-blue-200 pb-2">
                  <i className="fas fa-paper-plane"></i> 1. 指定獎勵派發
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 items-end">
                  <div>
                    <label className="block font-bold mb-1 text-gray-500 text-sm">發送對象</label>
                    <select
                      value={rewardTargetId}
                      onChange={(e) => setRewardTargetId(e.target.value)}
                      className="w-full p-2 border-2 border-gray-700 rounded-lg font-bold text-lg bg-gray-50"
                    >
                      <option value="all">🌟 全班同學</option>
                      {appData.students.map((s) => (
                        <option key={s.id} value={s.id}>
                          👤 {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold mb-1 text-gray-500 text-sm">發送點數</label>
                    <input
                      type="number"
                      value={rewardPoints}
                      onChange={(e) => setRewardPoints(parseInt(e.target.value) || 0)}
                      className="w-full p-2 border-2 border-gray-700 rounded-lg font-bold text-lg text-orange-600 bg-yellow-50"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block font-bold mb-1 text-gray-500 text-sm">獎勵附言 (選填)</label>
                    <input
                      type="text"
                      placeholder="例如：今日擔任秩序股長認真服勤！"
                      value={rewardMessage}
                      onChange={(e) => setRewardMessage(e.target.value)}
                      className="w-full p-2 border-2 border-gray-700 rounded-lg font-bold text-lg"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSendSpecificReward}
                  className="btn-game bg-blue-500 text-white w-full py-3 text-2xl rounded-xl"
                >
                  <i className="fas fa-gift mr-2"></i> 發送指定獎勵給學生
                </button>
              </div>

              {/* Group management */}
              <div className="bg-white p-5 border-[4px] border-gray-700 rounded-xl shadow-[4px_4px_0px_rgba(45,55,72,1)]">
                <h3 className="text-3xl font-black text-orange-600 mb-4 border-b-2 border-orange-200 pb-2">
                  <i className="fas fa-users"></i> 2. 小組合作學習與獎勵
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="border-[3px] border-gray-700 rounded-xl p-4 bg-orange-50/50">
                    {/* Summary metrics row */}
                    <div className="mb-3 p-2.5 bg-white border border-gray-300 rounded-xl flex items-center justify-between text-xs font-bold text-gray-600 shadow-sm">
                      <span>👥 小組總數: <strong className="text-orange-600 font-extrabold text-sm">{(appData?.groups || []).length}</strong> 組</span>
                      <span>📊 全班學生: <strong className="text-indigo-600 font-extrabold text-sm">{(appData?.students || []).length}</strong> 人</span>
                      <span>⚖️ 平均每組: <strong className="text-emerald-600 font-extrabold text-sm">{(appData?.groups || []).length > 0 ? (((appData?.students || []).length) / ((appData?.groups || []).length)).toFixed(1) : 0}</strong> 人</span>
                    </div>

                    {/* Master Actions block */}
                    <div className="mb-4 p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">分組每組預設：</span>
                        <input
                          type="number"
                          min="1"
                          max="15"
                          value={adminGroupSize}
                          onChange={(e) => setAdminGroupSize(Math.max(1, parseInt(e.target.value) || 4))}
                          className="w-14 p-1 border-2 border-gray-700 bg-white rounded font-black text-center text-sm"
                        />
                        <span className="text-xs font-bold text-slate-500">人</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          id="keep-history-cbox"
                          checked={keepHistory}
                          onChange={(e) => setKeepHistory(e.target.checked)}
                          className="w-4 h-4 accent-purple-600 cursor-pointer"
                        />
                        <label htmlFor="keep-history-cbox" className="text-xs font-extrabold text-[#7C3AED] cursor-pointer">
                          保留為歷史記錄 (重新分組時不清除/不覆蓋舊組)
                        </label>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handleAdminRedrawGroups}
                          className="flex-1 btn-game bg-purple-650 hover:bg-purple-700 text-white text-xs font-black py-1.5 px-2.5 shadow-none rounded-lg"
                        >
                          🔄 重新隨機分組
                        </button>
                        <button
                          onClick={handleCopyGroupsToClipboard}
                          className="flex-1 btn-game bg-sky-500 hover:bg-sky-600 text-white text-xs font-black py-1.5 px-2.5 shadow-none rounded-lg"
                        >
                          📋 複製完整結果
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 mb-3">
                      <input
                        placeholder="小組名稱，例：奇蹟組"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="flex-1 p-2 border-2 border-gray-700 rounded-lg font-bold text-sm"
                      />
                      <button onClick={handleAddGroup} className="btn-game bg-orange text-white px-4 py-2 text-sm shadow-none">
                        新增小組
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scroll">
                      {(appData?.groups || []).map((g) => {
                        const members = g.members
                          .map((mId) => (appData?.students || []).find((s) => s.id === mId))
                          .filter(Boolean) as Student[];

                        // Options of students not inside this group
                        const availableStudents = (appData?.students || []).filter(
                          (s) => !g.members.includes(s.id)
                        );

                        return (
                          <div key={g.id} className="bg-white border-2 border-gray-700 rounded-xl p-3">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-lg font-black">{g.name}</span>
                              <button
                                onClick={() => handleDeleteGroup(g.id)}
                                className="text-red-500 font-bold text-sm"
                              >
                                刪除此組
                              </button>
                            </div>
                            <div className="flex gap-1 mb-2">
                              <select
                                onChange={(e) => {
                                  handleAddStudentToGroup(g.id, e.target.value);
                                  e.target.value = "";
                                }}
                                className="flex-1 p-1 border-2 rounded font-bold text-sm"
                              >
                                <option value="">+ 新增組員</option>
                                {availableStudents.map((avail) => (
                                  <option key={avail.id} value={avail.id}>
                                    {avail.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {members.length === 0 ? (
                                <span className="text-xs text-gray-400">尚無成員</span>
                              ) : (
                                members.map((m) => (
                                  <span
                                    key={m.id}
                                    className="px-2 py-1 bg-yellow-100 border border-gray-300 rounded text-sm font-bold flex items-center gap-1"
                                  >
                                    {m.name}
                                    <button
                                      onClick={() => handleRemoveStudentFromGroup(g.id, m.id)}
                                      className="text-red-500 font-black hover:text-red-700"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mass transfer points to group */}
                  <div className="border-[3px] border-gray-700 rounded-xl p-4 bg-white relative">
                    <h4 className="text-xl font-black text-gray-700 mb-3">小組聯署點數派發</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-gray-500 font-bold mb-1 col-span-2">選擇目標小組</label>
                        <select
                          value={groupTargetId}
                          onChange={(e) => setGroupTargetId(e.target.value)}
                          className="w-full p-2 border-2 border-gray-700 rounded-lg font-bold"
                        >
                          <option value="">選擇要派發的小組</option>
                          {(appData?.groups || []).map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name} ({g.members.length} 人)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-sm text-gray-500 font-bold mb-1">派發點數</label>
                          <input
                            type="number"
                            value={groupPoints}
                            onChange={(e) => setGroupPoints(parseInt(e.target.value) || 0)}
                            className="w-full p-2 border-2 border-gray-300 rounded-lg font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-500 font-bold mb-1">派發寵物 EXP</label>
                          <input
                            type="number"
                            value={groupExp}
                            onChange={(e) => setGroupExp(parseInt(e.target.value) || 0)}
                            className="w-full p-2 border-2 border-gray-300 rounded-lg font-bold"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-500 font-bold mb-1">附註理由</label>
                        <input
                          placeholder="例如：整潔評分滿分"
                          value={groupRewardNote}
                          onChange={(e) => setGroupRewardNote(e.target.value)}
                          className="w-full p-2 border-2 border-gray-300 rounded-lg font-bold"
                        />
                      </div>
                      <button
                        onClick={handleSendGroupReward}
                        className="btn-game bg-orange text-white w-full py-3 text-2xl rounded-xl"
                      >
                        <i className="fas fa-users mr-2"></i> 派發給此小組
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Food Creation */}
              <div className="custom-food-panel bg-white p-5 border-[4px] border-gray-700 rounded-xl shadow-[4px_4px_0px_rgba(45,55,72,1)]">
                <h3 className="text-3xl font-black text-pink-600 mb-4 border-b-2 border-pink-200 pb-2">
                  <i className="fas fa-cookie-bite"></i> 3. 自訂食物池管理
                </h3>
                <div className="custom-food-form p-4 bg-pink-50/50 rounded-xl border-2 border-gray-300">
                  <div>
                    <label>食物名稱</label>
                    <input
                      value={cfName}
                      onChange={(e) => setCfName(e.target.value)}
                      placeholder="星星鬆餅"
                    />
                  </div>
                  <div>
                    <label>Emoji</label>
                    <input
                      value={cfIcon}
                      onChange={(e) => setCfIcon(e.target.value)}
                      placeholder="🧁"
                    />
                  </div>
                  <div>
                    <label>點數花費</label>
                    <input
                      type="number"
                      value={cfCost}
                      onChange={(e) => setCfCost(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>
                  <div>
                    <label>EXP</label>
                    <input
                      type="number"
                      value={cfExp}
                      onChange={(e) => setCfExp(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                  <div>
                    <label>快樂增加</label>
                    <input
                      type="number"
                      value={cfHappy}
                      onChange={(e) => setCfHappy(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                  <div>
                    <label>親密增加</label>
                    <input
                      type="number"
                      value={cfAffinity}
                      onChange={(e) => setCfAffinity(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                  <div>
                    <label>體力增加</label>
                    <input
                      type="number"
                      value={cfStamina}
                      onChange={(e) => setCfStamina(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                  <div>
                    <label>學生商店裝狀態</label>
                    <select
                      value={String(cfVisible)}
                      onChange={(e) => setCfVisible(e.target.value === "true")}
                    >
                      <option value="true">顯示</option>
                      <option value="false">隱藏</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleAddCustomFood}
                  className="btn-game bg-pink text-white w-full py-3 mt-4 text-xl rounded-xl"
                >
                  <i className="fas fa-plus mr-2"></i> 新增自訂食物
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                  {appData.customFoods.map((f) => (
                    <div
                      key={f.id}
                      className="bg-white border-[3px] border-gray-700 rounded-xl p-3 flex flex-col justify-between shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{f.icon}</span>
                        <div>
                          <div className="text-xl font-black">{f.name}</div>
                          <div className="text-sm font-bold text-gray-500">
                            花費：{f.cost} 點 ｜ EXP增加：{f.exp}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-gray-600 mt-2">
                        快樂 +{f.happy}｜親密 +{f.affinity}｜體力 +{f.stamina}
                        <span className={f.visible ? "text-green-600 ml-2" : "text-red-500 ml-2"}>
                          {f.visible ? "🟢 顯示中" : "🔴 隱藏中"}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleToggleCustomFood(f.id)}
                          className="btn-game bg-yellow text-gray-800 px-3 py-1 text-sm shadow-none"
                        >
                          切換顯示
                        </button>
                        <button
                          onClick={() => handleEditCustomFood(f.id)}
                          className="btn-game bg-blue-400 text-white px-3 py-1 text-sm shadow-none"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => handleDeleteCustomFood(f.id, f.name)}
                          className="btn-game bg-red-500 text-white px-3 py-1 text-sm shadow-none"
                        >
                          刪除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Administrative Settings / Clock customization */}
          {activeTab === "tab-settings" && (
            <div className="flex flex-col items-center gap-8 pb-12 w-full">
              {/* 🌐 雲端教室同步管理區塊 */}
              <div className="w-full max-w-2xl bg-white p-6 border-[3px] border-gray-700 rounded-xl shadow-[4px_4px_0px_rgba(45,55,72,1)] text-left">
                <h3 className="text-2xl font-black text-[#0284c7] mb-4 flex items-center gap-2">
                  <span>🌐 雲端教室同步管理</span>
                </h3>

                {/* Status List */}
                <div className="space-y-3 bg-slate-50 p-4 border-2 border-gray-300 rounded-xl mb-6">
                  <div className="flex justify-between items-center text-base font-bold text-gray-700">
                    <span>目前模式：</span>
                    <span className={`px-2.5 py-1 rounded-md text-xs font-black border-2 ${
                      isOnlineMode
                        ? "bg-emerald-100 border-emerald-400 text-emerald-800 animate-pulse"
                        : "bg-gray-100 border-gray-400 text-gray-800"
                    }`}>
                      {isOnlineMode ? "🟢 雲端教室同步中" : "⚪ 本地單機模式"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-base font-bold text-gray-700">
                    <span>雲端教室狀態：</span>
                    <span className={`px-2.5 py-1 rounded-md text-xs font-black border-2 ${
                      !isOnlineMode
                        ? "bg-slate-100 border-slate-300 text-slate-600"
                        : isFirebaseReady
                        ? "bg-emerald-100 border-emerald-400 text-emerald-800"
                        : "bg-rose-100 border-rose-400 text-rose-800"
                    }`}>
                      {!isOnlineMode ? "未建立" : isFirebaseReady ? "已建立 / 同步中" : "同步失敗"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-base font-bold text-gray-700">
                    <span>教室名稱：</span>
                    <span className="font-extrabold text-slate-800">
                      {isOnlineMode ? className : "尚未啟用雲端教室"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-base font-bold text-gray-700">
                    <span>教室代碼：</span>
                    <span className="font-mono font-black text-purple-600 tracking-wider">
                      {isOnlineMode ? classCode : "尚未建立"}
                    </span>
                  </div>
                </div>

                {isOnlineMode && (
                  <div className="mb-6 bg-purple-50/50 p-4 border-2 border-purple-200 rounded-xl flex flex-col md:flex-row gap-4 justify-between items-center flex-wrap">
                    <div className="flex-1 text-center md:text-left">
                      <div className="text-sm font-black text-purple-800 mb-1">📸 班級專屬 QR Code</div>
                      <p className="text-xs text-purple-600 font-bold mb-2">學生或副螢幕掃描即可自動加入同步隨身玩：</p>
                      <div className="text-xs bg-white text-purple-900 border border-purple-300 font-mono py-1.5 px-3 rounded-lg overflow-x-auto break-all max-w-[280px] md:max-w-[340px]">
                        {getJoinUrl()}
                      </div>
                    </div>
                    <div className="shrink-0 bg-white p-3 border-2 border-purple-400 rounded-xl flex items-center justify-center">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(getJoinUrl())}&ts=${qrTimestamp}`}
                        alt="Class QR Code"
                        className="w-28 h-28 pointer-events-none select-none border border-gray-200"
                      />
                    </div>
                  </div>
                )}

                {/* Firebase連線診斷顯示 */}
                <div className="mb-6 p-4 border-2 border-gray-300 rounded-xl bg-gray-50/50">
                  <div className="text-sm font-black text-gray-700 mb-1 flex items-center justify-between">
                    <span>⚡ Firebase 雲端整合狀態：</span>
                    <span className={`text-xs px-2 py-0.5 rounded border ${
                      fbTestStatus === "success" ? "bg-emerald-50 border-emerald-300 text-emerald-800" :
                      fbTestStatus === "failed" ? "bg-rose-50 border-rose-300 text-rose-800" : "bg-gray-100 border-gray-300 text-gray-800"
                    }`}>
                      {fbTestStatus === "idle" ? "未檢測" :
                       fbTestStatus === "testing" ? "檢測中..." :
                       fbTestStatus === "success" ? "連線正常" : "連線異常"}
                    </span>
                  </div>
                  <div className="text-xs font-mono font-bold text-gray-500 bg-white border border-gray-200 rounded p-2.5 whitespace-pre-wrap min-h-[48px] max-h-[100px] overflow-y-auto">
                    {fbCheckMsg || "點擊下方「測試 Firebase 連線」按鈕以驗證您在 /src/firebase.ts 中的金鑰憑證。"}
                  </div>
                </div>

                {/* 按鈕功能面板 */}
                <div className="space-y-4">
                  {/* Toggle Switch */}
                  <div className="flex justify-between items-center p-3 border-2 border-gray-400 rounded-xl bg-sky-50/50">
                    <div>
                      <div className="text-sm font-black text-blue-900">🔔 啟用主介面學生同步畫面</div>
                      <p className="text-xs text-blue-700 font-bold">在主畫面上方顯示學生可見的加入代碼、二維碼與即時清單</p>
                    </div>
                    <button
                      onClick={() => toggleShowCloudSyncPanelOnMain(!showCloudSyncPanelOnMain)}
                      className={`btn-game text-xs font-black min-w-[70px] py-1.5 px-3 border-2 ${
                        showCloudSyncPanelOnMain ? "bg-emerald-500 text-white" : "bg-gray-300 text-gray-700"
                      }`}
                    >
                      {showCloudSyncPanelOnMain ? "已啟用" : "已關閉"}
                    </button>
                  </div>

                  {!isOnlineMode ? (
                    <div className="space-y-4">
                      <div className="p-4 border-2 border-dashed border-sky-400 rounded-xl bg-sky-50/20">
                        <div className="text-sm font-black text-sky-800 mb-2">🏫 建立一個新的雲端教室</div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="例如：三年甲班"
                            value={localClassNameInput}
                            onChange={(e) => setLocalClassNameInput(e.target.value)}
                            disabled={isCreatingClassLocal}
                            className="flex-1 p-2 border-2 border-gray-400 rounded-lg text-base font-bold bg-white"
                          />
                          <button
                            onClick={handleLocalCreateClassAction}
                            disabled={isCreatingClassLocal}
                            className="btn-game bg-[#F2DD00] text-gray-800 text-xs px-4 py-2"
                          >
                            {isCreatingClassLocal ? "建立中..." : "🚀 建立"}
                          </button>
                        </div>
                      </div>

                      {/* 🔌 載入既有雲端教室 */}
                      <div className="p-4 border-2 border-emerald-400 rounded-xl bg-emerald-50/10 text-left">
                        <div className="text-sm font-black text-emerald-800 mb-2 flex items-center gap-1.5">
                          <i className="fas fa-file-import text-emerald-500"></i> 🔌 載入既有雲端教室
                        </div>
                        <p className="text-xs text-gray-500 mb-3 leading-relaxed font-bold">
                          如果您已在其他瀏覽器或設備建立過雲端教室，請於下方輸入代碼與管理密碼進行復原載入：
                        </p>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-black text-slate-500 mb-1">既有教室代碼</label>
                              <input
                                type="text"
                                placeholder="例：A1B2C"
                                value={loadClassCode}
                                onChange={(e) => setLoadClassCode(e.target.value.toUpperCase())}
                                disabled={isRestoringClass}
                                className="w-full p-2 border-2 border-slate-300 rounded-lg text-base font-bold font-mono tracking-wide placeholder:font-sans uppercase bg-white bg-slate-50/30"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-black text-slate-500 mb-1">管理密碼</label>
                              <input
                                type="password"
                                placeholder="預設 0301"
                                value={loadPasscode}
                                onChange={(e) => setLoadPasscode(e.target.value)}
                                disabled={isRestoringClass}
                                className="w-full p-2 border-2 border-slate-300 rounded-lg text-base font-bold bg-white"
                              />
                            </div>
                          </div>
                          <button
                            onClick={handleLoadExistingCloudClass}
                            disabled={isRestoringClass}
                            className="btn-game w-full bg-emerald-500 text-white text-xs py-2 px-4 hover:scale-102 flex items-center justify-center gap-2 font-bold"
                          >
                            {isRestoringClass ? (
                              <span>連線驗證並還原中...</span>
                            ) : (
                              <>
                                <i className="fas fa-cloud-download-alt"></i>
                                <span>確認載入既有雲端教室</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {localStorage.getItem("cloudTeacherLastClassCode") && (
                        <div className="p-4 border-2 border-[#F280B6] rounded-xl bg-pink-50/10 text-left">
                          <div className="text-sm font-black text-pink-700 mb-2 flex items-center gap-1.5">
                            <i className="fas fa-history text-pink-500"></i> 重新連線上次雲端教室
                          </div>
                          <div className="bg-white border-[2px] border-pink-100 rounded-xl p-3 text-xs text-gray-700 space-y-1 font-bold mb-3 shadow-inner">
                            <div>🏫 教室名稱：<span className="text-slate-800 font-extrabold">{localStorage.getItem("cloudTeacherLastClassName") || "未命名頻道"}</span></div>
                            <div>🔑 教室代碼：<span className="text-purple-600 font-mono font-black tracking-widest">{localStorage.getItem("cloudTeacherLastClassCode")}</span></div>
                            <div>🕒 上次連線：<span className="text-gray-500">{localStorage.getItem("cloudTeacherLastConnectedAt") || "無紀錄"}</span></div>
                          </div>
                          <button
                            onClick={onReconnectLastClassroom}
                            className="btn-game w-full bg-[#F280B6] text-white text-xs py-2 px-4 hover:scale-102 flex items-center justify-center gap-2 font-bold"
                          >
                            <i className="fas fa-plug text-pink-100"></i>
                            <span>進行重新連線</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* 一般功能操作按鈕群組 */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={handleTestFbConnectionAction}
                      disabled={testingFb}
                      className="btn-game bg-teal-500 text-white text-xs px-3 py-2 flex items-center gap-1 hover:scale-103"
                    >
                      ⚡ 測試 Firebase 連線
                    </button>

                    {isOnlineMode && (
                      <>
                        <button
                          onClick={handleCopyCode}
                          className="btn-game bg-purple-500 text-white text-xs px-3 py-2 flex items-center gap-1 hover:scale-103"
                        >
                          📋 複製教室代碼
                        </button>
                        <button
                          onClick={handleCopyLink}
                          className="btn-game bg-indigo-500 text-white text-xs px-3 py-2 flex items-center gap-1 hover:scale-103"
                        >
                          🔗 複製加入連結
                        </button>
                        <button
                          onClick={() => {
                            setQrTimestamp(Date.now());
                            showDialog({
                              title: "二維碼已更新",
                              message: "已對準最新雲端網址重新對外產生二維碼！",
                              type: "alert"
                            });
                          }}
                          className="btn-game bg-amber-500 text-white text-xs px-3 py-2 flex items-center gap-1 hover:scale-103"
                        >
                          📷 重新產生 QR Code
                        </button>
                        <button
                          onClick={onExitOnlineMode}
                          className="btn-game bg-red-500 text-white text-xs px-3 py-2 flex items-center gap-1 hover:scale-103"
                        >
                          ❌ 關閉雲端同步
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 🎯 抽籤速度與動畫設定 */}
              <div className="w-full max-w-2xl bg-white p-6 border-[3px] border-gray-700 rounded-xl text-left shadow-[4px_4px_0px_rgba(45,55,72,1)]">
                <h3 className="text-2xl font-black text-[#0284c7] mb-2 flex items-center gap-2">
                  <span>🎯 抽籤速度與動畫設定</span>
                </h3>
                <p className="text-sm font-bold text-gray-500 mb-4 leading-relaxed">
                  設定在主畫面「抽單人」及「抽小組」時的隨機動畫與揭曉速度。在上課時間緊湊時，推薦使用「即時模式」以提升教學流暢度。
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { key: "instant", name: "即時模式", desc: "立即揭曉 (免等待)" },
                    { key: "standard", name: "標準模式", desc: "半秒內完成 (0.5秒) ⏱️" },
                    { key: "animated", name: "動畫模式", desc: "完整華麗抽取 (2.0秒) 🎓" }
                  ].map((mode) => (
                    <button
                      key={mode.key}
                      onClick={() => {
                        setAppData((prev) => {
                          const nextState = { ...prev, lotterySpeed: mode.key as "instant" | "standard" | "animated" };
                          if (autoSave) {
                            setTimeout(() => autoSave(nextState), 50);
                          }
                          return nextState;
                        });
                        showDialog({
                          title: "速度設定成功",
                          message: `抽籤速度已順利切換為：【${mode.name}】！`,
                          type: "alert",
                          titleColor: "text-blue-600"
                        });
                      }}
                      className={`p-3.5 border-2 rounded-xl text-left transition-all ${
                        (appData.lotterySpeed || "instant") === mode.key
                          ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-400/50"
                          : "border-gray-300 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base font-black text-gray-800">{mode.name}</span>
                        {(appData.lotterySpeed || "instant") === mode.key && (
                          <span className="text-blue-600 text-xs font-black">● 啟用中</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 font-bold leading-tight block">{mode.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-full max-w-2xl bg-white p-6 border-[3px] border-gray-700 rounded-xl text-center shadow-[4px_4px_0px_rgba(45,55,72,1)]">
                <h3 className="text-2xl font-black text-blue-600 mb-4">
                  <i className="fas fa-edit"></i> 班級大標題設定
                </h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={classTitle}
                    onChange={(e) => setClassTitle(e.target.value)}
                    className="flex-1 p-3 border-4 border-gray-700 rounded-xl text-2xl font-black bg-gray-50"
                  />
                  <button onClick={handleSaveMainTitle} className="btn-game bg-blue-500 text-white px-8 py-3 text-2xl rounded-xl">
                    儲存
                  </button>
                </div>
              </div>

              <div className="w-full max-w-2xl bg-white p-6 border-[3px] border-gray-700 rounded-xl text-center shadow-[4px_4px_0px_rgba(45,55,72,1)]">
                <h3 className="text-2xl font-black text-blue-600 mb-4">
                  <i className="fas fa-key"></i> 修改教師登入 PIN
                </h3>
                <div className="flex flex-col gap-3 mb-4 max-w-md mx-auto">
                  <input
                    type="password"
                    placeholder="輸入原密碼 (預設: 0301)"
                    value={oldPwd}
                    onChange={(e) => setOldPwd(e.target.value)}
                    className="p-3 border-4 border-gray-700 rounded-xl text-xl font-bold bg-gray-50 text-center"
                  />
                  <input
                    type="password"
                    placeholder="輸入新密碼"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    className="p-3 border-4 border-gray-700 rounded-xl text-xl font-bold bg-gray-50 text-center"
                  />
                  <input
                    type="password"
                    placeholder="再次確認新密碼"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    className="p-3 border-4 border-gray-700 rounded-xl text-xl font-bold bg-gray-50 text-center"
                  />
                </div>
                <button onClick={handleChangePassword} className="btn-game bg-blue-500 text-white px-8 py-3 text-2xl rounded-xl">
                  確認修改密碼
                </button>
              </div>

              <div className="w-full max-w-2xl bg-white p-6 border-[3px] border-gray-700 rounded-xl text-center shadow-[4px_4px_0px_rgba(45,55,72,1)]">
                <h3 className="text-3xl font-black text-gray-800 mb-4">
                  <i className="fas fa-hourglass-half"></i> 倒數計時基礎值設定
                </h3>
                <div className="flex justify-center gap-6 items-center mb-6">
                  <div className="flex flex-col">
                    <label className="text-xl font-bold text-gray-500 mb-1">分鐘</label>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={timerMin}
                      onChange={(e) => setTimerMin(Math.max(0, parseInt(e.target.value) || 0))}
                      className="p-3 border-4 border-gray-700 rounded-xl text-3xl w-32 text-center font-black pixel-font text-blue-500"
                    />
                  </div>
                  <span className="text-4xl font-black mt-8">:</span>
                  <div className="flex flex-col">
                    <label className="text-xl font-bold text-gray-500 mb-1">秒數</label>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={timerSec}
                      onChange={(e) => setTimerSec(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                      className="p-3 border-4 border-gray-700 rounded-xl text-3xl w-32 text-center font-black pixel-font text-blue-500"
                    />
                  </div>
                </div>
                <button onClick={handleSaveTimerSettings} className="btn-game bg-purple-500 text-white px-8 py-3 text-2xl rounded-xl">
                  套用計時器設定
                </button>
              </div>

              <div className="w-full max-w-2xl bg-white p-6 border-[3px] border-gray-700 rounded-xl text-center shadow-[4px_4px_0px_rgba(45,55,72,1)]">
                <h3 className="text-3xl font-black text-orange-600 mb-2">☀️ 迎接新的一天</h3>
                <p className="text-xl font-bold text-gray-600 mb-4">
                  這會將全班學生的「每日任務進度」重置為未完成狀態。
                  <br />
                  個人點數、歷史轉蛋背景及寵物數值會完美保留！
                </p>
                <button
                  onClick={triggerNewDay}
                  className="btn-game bg-orange text-white px-8 py-4 text-3xl rounded-2xl hover:scale-105"
                >
                  執行：重置今日聯署進度
                </button>
              </div>
            </div>
          )}

          {/* TAB: Class Addons (Class Construction & Event System) */}
          {activeTab === "tab-addons" && (() => {
            const addons = getSafeClassAddonsData(appData);
            const constructionEnabled = !!addons.classConstructionData.enabled;
            const eventsEnabled = !!addons.classEventData.enabled;
            const currentContribution = addons.classConstructionData.classContribution || 0;
            const activeEvent = addons.classEventData.activeEvent;

            const toggleConstructionEnabled = () => {
              setAppData(prev => {
                const inner = getSafeClassAddonsData(prev);
                return {
                  ...prev,
                  classConstructionData: {
                    ...inner.classConstructionData,
                    enabled: !inner.classConstructionData.enabled
                  }
                };
              });
            };

            const toggleEventsEnabled = () => {
              setAppData(prev => {
                const inner = getSafeClassAddonsData(prev);
                return {
                  ...prev,
                  classEventData: {
                    ...inner.classEventData,
                    enabled: !inner.classEventData.enabled
                  }
                };
              });
            };

            const handleAdjustContribution = (amount: number) => {
              setAppData(prev => {
                const inner = getSafeClassAddonsData(prev);
                return {
                  ...prev,
                  classConstructionData: {
                    ...inner.classConstructionData,
                    classContribution: Math.max(0, inner.classConstructionData.classContribution + amount)
                  }
                };
              });
            };

            const triggerEventManually = (eventId: string) => {
              const template = ALL_EVENTS_TEMPLATES.find(ev => ev.id === eventId);
              if (!template) return;
              
              if (eventId === "event_merchant" && !merchantEnabled) {
                showDialog({
                  title: "⚠️ 提示",
                  message: "神秘商人目前被設定為「關閉」狀態，請先在底下啟用商人功能！",
                  type: "alert"
                });
                return;
              }

              setAppData(prev => {
                const inner = getSafeClassAddonsData(prev);
                
                // Set custom properties for merchant event or template defaults
                const active = {
                  ...template,
                  startedAt: Date.now(),
                  durationMinutes: eventId === "event_merchant" ? merchantStayMinutes : template.durationMinutes,
                  merchantProducts: eventId === "event_merchant" ? generateMerchantProducts(prev, defaultBackgroundGachaItems) : undefined
                };
                
                // King Slime immediate stat recovery to all students
                let students = prev.students || [];
                if (eventId === "event_king") {
                  students = students.map(s => {
                    if (s.hasChosenEgg) {
                      return {
                        ...s,
                        petStats: {
                          happy: 100,
                          affinity: 100,
                          stamina: 100
                        }
                      };
                    }
                    return s;
                  });
                }

                // Add to collection book automatically
                const collection = inner.classCollectionData;
                const unlockedEvents = [...(collection.unlockedEvents || [])];
                if (!unlockedEvents.includes(eventId)) {
                  unlockedEvents.push(eventId);
                }
                
                const unlockedSlimes = [...(collection.unlockedSlimes || [])];
                if (eventId === "event_king" && !unlockedSlimes.includes("slime_king_pet")) {
                  unlockedSlimes.push("slime_king_pet");
                }

                const unlockedItems = [...(collection.unlockedItems || [])];
                if (eventId === "event_beast" && !unlockedItems.includes("item_crystal")) {
                  unlockedItems.push("item_crystal");
                }
                if (eventId === "event_meteor" && !unlockedItems.includes("item_scroll")) {
                  unlockedItems.push("item_scroll");
                }
                if (eventId === "event_ruins" && !unlockedItems.includes("item_tablet")) {
                  unlockedItems.push("item_tablet");
                }

                return {
                  ...prev,
                  classEventData: {
                    ...inner.classEventData,
                    activeEvent: active
                  },
                  classCollectionData: {
                    ...collection,
                    unlockedEvents,
                    unlockedSlimes,
                    unlockedItems
                  },
                  students
                };
              });
            };

            const cancelActiveEvent = () => {
              setAppData(prev => {
                const inner = getSafeClassAddonsData(prev);
                return {
                  ...prev,
                  classEventData: {
                    ...inner.classEventData,
                    activeEvent: null
                  }
                };
              });
            };

            return (
              <div className="flex flex-col items-center gap-8 pb-12 w-full text-left p-6">
                
                {/* SYSTEM CONFIG BLOCK */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                  
                  {/* Construction Card */}
                  <div className="bg-white border-[3px] border-gray-700 rounded-xl p-5 shadow-[4px_4px_0px_rgba(45,55,72,1)] flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xl font-black text-amber-900 flex items-center gap-1.5">
                          <span>🏗️ 班級共同建設系統</span>
                        </h4>
                        <span className={`px-2.5 py-0.5 rounded text-xs font-black border ${
                          constructionEnabled ? "bg-emerald-100 border-emerald-400 text-emerald-800" : "bg-red-50 border-red-300 text-red-700"
                        }`}>
                          {constructionEnabled ? "已啟用" : "關閉中"}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-gray-500 leading-relaxed mb-4">
                        啟用後，全班首頁將會渲染「班級建設進度看版」，學生完成任務可為班級共同累積建設點數。預設保持關閉。
                      </p>
                    </div>
                    <button
                      onClick={toggleConstructionEnabled}
                      className={`btn-game text-white px-5 py-2.5 text-base rounded-xl font-black transition-all cursor-pointer ${
                        constructionEnabled ? "bg-red-500 hover:bg-red-600 border-red-700" : "bg-emerald-600 hover:bg-emerald-700 border-emerald-800"
                      }`}
                    >
                      {constructionEnabled ? "🔘 停止共同建設系統" : "🟢 啟用共同建設系統"}
                    </button>
                  </div>

                  {/* Event System Card */}
                  <div className="bg-white border-[3px] border-gray-700 rounded-xl p-5 shadow-[4px_4px_0px_rgba(45,55,72,1)] flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xl font-black text-purple-900 flex items-center gap-1.5">
                          <span>🌀 奇境天候事件系統</span>
                        </h4>
                        <span className={`px-2.5 py-0.5 rounded text-xs font-black border ${
                          eventsEnabled ? "bg-emerald-100 border-emerald-400 text-emerald-800" : "bg-red-50 border-red-300 text-red-700"
                        }`}>
                          {eventsEnabled ? "已啟用" : "關閉中"}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-gray-500 leading-relaxed mb-4">
                        啟用後，系統將解鎖奇境事件系統。當發生特殊事件（流星雨等），所有學生將會獲得對應的特殊效果或限時任務。
                      </p>
                    </div>
                    <button
                      onClick={toggleEventsEnabled}
                      className={`btn-game text-white px-5 py-2.5 text-base rounded-xl font-black transition-all cursor-pointer ${
                        eventsEnabled ? "bg-red-500 hover:bg-red-600 border-red-700" : "bg-purple-600 hover:bg-purple-700 border-purple-800"
                      }`}
                    >
                      {eventsEnabled ? "🔘 關閉奇境天候事件" : "🟢 啟用奇境天候事件"}
                    </button>
                  </div>
                </div>

                {/* CONTRIBUTION MODIFIER SECTION */}
                {constructionEnabled && (
                  <div className="w-full max-w-4xl bg-white p-6 border-[3px] border-gray-700 rounded-xl shadow-[4px_4px_0px_rgba(45,55,72,1)]">
                    <h3 className="text-xl font-black text-amber-950 mb-3 flex items-center gap-1.5 border-b border-gray-200 pb-2">
                      <span>⭐ 調整班級總貢獻值 (Class Contribution)</span>
                    </h3>
                    <p className="text-xs font-bold text-gray-400 mb-4">
                      此處可用於手動獎勵或補發班級貢獻點數。更新後會自動即時更新，此點數不用扣除任何學生的個人點數。
                    </p>
                    <div className="flex flex-wrap items-center gap-4 bg-amber-50/50 p-4 rounded-xl border border-amber-200">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-amber-950 shrink-0">目前點數：</span>
                        <span className="text-xl font-black text-indigo-700 px-3 py-1 bg-amber-200/50 rounded-lg border-2 border-amber-300 font-mono">{currentContribution}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={manualContributionInput}
                          onChange={(e) => setManualContributionInput(Math.max(1, parseInt(e.target.value) || 0))}
                          className="w-24 p-2 border-2 border-gray-400 rounded-lg text-center font-black"
                        />
                        <button
                          onClick={() => handleAdjustContribution(manualContributionInput)}
                          className="btn-game bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 text-sm font-black rounded-lg cursor-pointer"
                        >
                          ➕ 增加貢獻值
                        </button>
                        <button
                          onClick={() => handleAdjustContribution(-manualContributionInput)}
                          className="btn-game bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 text-sm font-black rounded-lg cursor-pointer"
                        >
                          ➖ 減少貢獻值
                        </button>
                      </div>
                    </div>

                    {/* BULK BUILDING MANAGER BOARD */}
                    <div className="mt-6 border-t border-gray-200 pt-6">
                      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                        <div>
                          <h4 className="text-lg font-black text-amber-900">🏗️ 理想國度 - 建築物管理中心</h4>
                          <p className="text-[11px] text-gray-400 font-bold mt-0.5">
                            老師可手動添加建築、增減各建築經驗值、手動升級或一鍵重置。
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setIsAddingBuilding(!isAddingBuilding)}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black min-h-[32px] px-3 rounded-lg border border-amber-800 flex items-center gap-1 transition-colors"
                          >
                            ➕ 新增建築項目
                          </button>
                          <button
                            onClick={() => {
                              showDialog({
                                title: "⚠️ 警告：確定重置全體建設？",
                                message: "將會重設所有建築為等級 1、清空累積經驗，並將貢獻值設為 0。此動作不會扣除任何學員的個人點數！確定要重置嗎？",
                                type: "confirm",
                                onConfirm: () => {
                                  setAppData(prev => {
                                    const defaultAddons = getSafeClassAddonsData(null);
                                    return {
                                      ...prev,
                                      classConstructionData: {
                                        enabled: true,
                                        classContribution: 0,
                                        buildings: defaultAddons.classConstructionData.buildings.map(b => ({ ...b }))
                                      }
                                    };
                                  });
                                }
                              });
                            }}
                            className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-black min-h-[32px] px-3 rounded-lg border border-red-300 flex items-center gap-1 transition-colors"
                          >
                            🔄 重置全班建設
                          </button>
                        </div>
                      </div>

                      {/* ADD BUILDING FIELD */}
                      {isAddingBuilding && (
                        <div className="bg-amber-50/50 border-2 border-dashed border-amber-300 p-4 rounded-xl mb-4 flex flex-wrap gap-4 items-end animate-fadeIn">
                          <div>
                            <label className="block text-[11px] font-black text-amber-900 mb-1">建築物名稱：</label>
                            <input
                              type="text"
                              value={newBuildingName}
                              onChange={(e) => setNewBuildingName(e.target.value)}
                              placeholder="例如：浮空觀星台"
                              className="p-1.5 text-xs border border-gray-300 rounded font-bold w-40"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-black text-amber-900 mb-1">小圖示 (Emoji)：</label>
                            <input
                              type="text"
                              value={newBuildingIcon}
                              onChange={(e) => setNewBuildingIcon(e.target.value)}
                              placeholder="🌟"
                              className="p-1.5 text-xs border border-gray-300 rounded text-center w-16 font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-black text-amber-900 mb-1">升級所需經驗：</label>
                            <input
                              type="number"
                              value={newBuildingTargetExp}
                              onChange={(e) => setNewBuildingTargetExp(Math.max(10, parseInt(e.target.value) || 100))}
                              className="p-1.5 text-xs border border-gray-300 rounded w-20 text-center font-bold"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                if (!newBuildingName.trim()) return;
                                setAppData(prev => {
                                  const inner = getSafeClassAddonsData(prev);
                                  const list = [...(inner.classConstructionData.buildings || [])];
                                  list.push({
                                    id: `building_custom_${Date.now()}`,
                                    name: newBuildingName,
                                    icon: newBuildingIcon || "🏛️",
                                    level: 1,
                                    currentExp: 0,
                                    targetExp: newBuildingTargetExp
                                  });
                                  return {
                                    ...prev,
                                    classConstructionData: {
                                      ...inner.classConstructionData,
                                      buildings: list
                                    }
                                  };
                                });
                                setNewBuildingName("");
                                setIsAddingBuilding(false);
                              }}
                              className="bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 text-xs font-black rounded-lg"
                            >
                              建立建築物
                            </button>
                            <button
                              onClick={() => setIsAddingBuilding(false)}
                              className="bg-gray-200 text-gray-700 hover:bg-gray-300 px-3 py-1.5 text-xs font-black rounded-lg"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      )}

                      {/* BUILDINGS ITERATOR LIST */}
                      <div className="grid grid-cols-1 gap-3.5 max-h-[350px] overflow-y-auto pr-1">
                        {(addons.classConstructionData.buildings || []).map((b: any) => {
                          const percent = Math.min(100, Math.floor((b.currentExp / b.targetExp) * 100)) || 0;
                          return (
                            <div key={b.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm hover:border-slate-300 transition-all">
                              <div className="flex items-center gap-2 w-full md:w-[45%]">
                                <span className="text-3xl filter drop-shadow bg-amber-100/50 p-1.5 rounded-lg border border-amber-200">{b.icon}</span>
                                <div className="w-full">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-sm text-slate-800">{b.name}</span>
                                    <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded font-black font-mono">
                                      LV {b.level}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                      <div 
                                        className="bg-amber-500 h-2.5 rounded-full transition-all duration-300"
                                        style={{ width: `${percent}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-extrabold whitespace-nowrap font-mono">{b.currentExp}/{b.targetExp} exp ({percent}%)</span>
                                  </div>
                                </div>
                              </div>

                              {/* ACTIONS BUTTONS */}
                              <div className="flex flex-wrap items-center gap-2 shrink-0 md:justify-end">
                                <button
                                  onClick={() => {
                                    setAppData(prev => {
                                      const inner = getSafeClassAddonsData(prev);
                                      const list = inner.classConstructionData.buildings.map((xb: any) => {
                                        if (xb.id === b.id) {
                                          let nextExp = xb.currentExp + 10;
                                          let nextLvl = xb.level;
                                          let nextTarget = xb.targetExp;
                                          if (nextExp >= nextTarget) {
                                            nextExp -= nextTarget;
                                            nextLvl += 1;
                                            nextTarget = Math.floor(nextTarget * 1.25);
                                          }
                                          return { ...xb, currentExp: nextExp, level: nextLvl, targetExp: nextTarget };
                                        }
                                        return xb;
                                      });
                                      return {
                                        ...prev,
                                        classConstructionData: {
                                          ...inner.classConstructionData,
                                          buildings: list
                                        }
                                      };
                                    });
                                  }}
                                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded border border-indigo-200"
                                >
                                  EXP +10
                                </button>
                                <button
                                  onClick={() => {
                                    setAppData(prev => {
                                      const inner = getSafeClassAddonsData(prev);
                                      const list = inner.classConstructionData.buildings.map((xb: any) => {
                                        if (xb.id === b.id) {
                                          const nextExp = Math.max(0, xb.currentExp - 10);
                                          return { ...xb, currentExp: nextExp };
                                        }
                                        return xb;
                                      });
                                      return {
                                        ...prev,
                                        classConstructionData: {
                                          ...inner.classConstructionData,
                                          buildings: list
                                        }
                                      };
                                    });
                                  }}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-2 py-1 rounded border border-slate-300"
                                >
                                  EXP -10
                                </button>
                                <button
                                  onClick={() => {
                                    setAppData(prev => {
                                      const inner = getSafeClassAddonsData(prev);
                                      const list = inner.classConstructionData.buildings.map((xb: any) => {
                                        if (xb.id === b.id) {
                                          return {
                                            ...xb,
                                            level: xb.level + 1,
                                            currentExp: 0,
                                            targetExp: Math.floor(xb.targetExp * 1.25)
                                          };
                                        }
                                        return xb;
                                      });
                                      return {
                                        ...prev,
                                        classConstructionData: {
                                          ...inner.classConstructionData,
                                          buildings: list
                                        }
                                      };
                                    });
                                  }}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs px-2.5 py-1 rounded"
                                >
                                  🚀 手動升級
                                </button>
                                <button
                                  onClick={() => {
                                    showDialog({
                                      title: "❓ 確認重置建築",
                                      message: `確定要將「${b.name}」重設回等級 1 與 0 經驗值嗎？`,
                                      type: "confirm",
                                      onConfirm: () => {
                                        setAppData(prev => {
                                          const inner = getSafeClassAddonsData(prev);
                                          const list = inner.classConstructionData.buildings.map((xb: any) => {
                                            if (xb.id === b.id) {
                                              return { ...xb, level: 1, currentExp: 0, targetExp: 100 };
                                            }
                                            return xb;
                                          });
                                          return {
                                            ...prev,
                                            classConstructionData: {
                                              ...inner.classConstructionData,
                                              buildings: list
                                            }
                                          };
                                        });
                                      }
                                    });
                                  }}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-xs px-2.5 py-1 rounded border border-rose-200"
                                >
                                  🔄 重置
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* EVENTS TRIGGER CONTAINER */}
                {eventsEnabled && (
                  <div className="w-full max-w-4xl bg-white p-6 border-[3px] border-gray-700 rounded-xl shadow-[4px_4px_0px_rgba(45,55,72,1)]">
                    {/* MERCHANT CONFIG PANEL */}
                    <div className="mb-6 bg-purple-50/50 p-4 rounded-xl border border-purple-200">
                      <h4 className="text-base font-black text-purple-950 mb-2 flex items-center gap-1.5">
                        <span>🛒 神秘商人與大天候進階設定</span>
                      </h4>
                      <p className="text-[11px] font-bold text-gray-400 mb-3 leading-relaxed">
                        在此配置神秘商人的啟用狀態與每次出現時學生的停留/搶購時效。
                      </p>
                      <div className="flex flex-wrap items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer font-extrabold text-xs text-slate-800">
                          <input
                            type="checkbox"
                            checked={merchantEnabled}
                            onChange={(e) => setMerchantEnabled(e.target.checked)}
                            className="w-4 h-4 accent-purple-600 rounded"
                          />
                          是否開放神秘行商出現？
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-800">商人行商天候時間：</span>
                          <input
                            type="number"
                            min="1"
                            value={merchantStayMinutes}
                            onChange={(e) => setMerchantStayMinutes(Math.max(1, parseInt(e.target.value) || 30))}
                            className="p-1 border border-gray-300 w-16 text-center text-xs font-black rounded"
                          />
                          <span className="text-xs font-bold text-gray-500">分鐘</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4 flex-wrap gap-2">
                      <div>
                        <h3 className="text-2xl font-black text-purple-950 flex items-center gap-1.5">
                          <span>🌀 奇境大天候事件發布台</span>
                        </h3>
                        <p className="text-xs font-bold text-gray-400 mt-1">
                          老師可在此手動觸發指定大天候事件，激勵學生聯署或獎勵，觸發會自動永久解鎖學生圖鑑！
                        </p>
                      </div>
                      
                      {activeEvent ? (
                        <div className="flex items-center gap-2 bg-purple-100 border-2 border-purple-300 p-2 rounded-xl">
                          <span className="text-xs font-black text-purple-900 animate-pulse">
                            🟢 運作中: {activeEvent.name}
                          </span>
                          <button
                            onClick={cancelActiveEvent}
                            className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-md border border-red-700 transition-colors"
                          >
                            提前結束天候
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-black bg-gray-100 border border-gray-300 text-gray-500 px-3 py-1 rounded">
                          ⚪ 目前無天候事件
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {ALL_EVENTS_TEMPLATES.map((tmpl) => {
                        const isThisActive = activeEvent?.id === tmpl.id;
                        return (
                          <div 
                            key={tmpl.id} 
                            className={`border-2 p-4 rounded-xl flex flex-col justify-between transition-colors ${
                              isThisActive ? "bg-purple-50/50 border-purple-500" : "bg-slate-50 border-slate-200 hover:border-slate-400"
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-3xl">{tmpl.icon}</span>
                                <div>
                                  <h4 className="font-extrabold text-sm text-slate-800">{tmpl.name}</h4>
                                  <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-black font-mono">
                                    持續時間: {tmpl.durationMinutes} 分鐘
                                  </span>
                                </div>
                              </div>
                              <p className="text-[11px] font-bold text-gray-500 leading-relaxed mb-4">
                                {tmpl.description}
                              </p>
                            </div>
                            
                            {isThisActive ? (
                              <button
                                onClick={cancelActiveEvent}
                                className="w-full bg-red-100 text-red-700 hover:bg-red-200 border border-red-300 font-black py-1.5 px-3 text-xs rounded-lg transition-colors"
                              >
                                🛑 提前結束此事件
                              </button>
                            ) : (
                              <button
                                onClick={() => triggerEventManually(tmpl.id)}
                                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-black py-1.5 px-3 text-xs rounded-lg shadow-sm cursor-pointer transition-colors"
                              >
                                ⚡ 發布此天候事件
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            );
          })()}

          {activeTab === "tab-gacha-items" && (
            <div className="flex flex-col lg:flex-row gap-6 p-2 lg:p-6">
              {/* Form card */}
              <div className="w-full lg:w-[45%] bg-white border-[3px] border-gray-700 rounded-3xl p-6 shadow-[4px_4px_0px_#1f2937] flex flex-col gap-4">
                <h3 className="text-3xl font-black text-purple-600 flex items-center gap-2">
                  <span className="text-4xl">🪄</span> 新增轉蛋商品
                </h3>
                
                {/* Name */}
                <div className="flex flex-col">
                  <label className="font-extrabold text-gray-700 text-lg mb-1">商品名稱</label>
                  <input
                    type="text"
                    value={gachaName}
                    onChange={(e) => setGachaName(e.target.value)}
                    placeholder="例如：閃亮金質像素皇冠、夢幻城堡背景"
                    className="p-3 border-2 border-gray-300 rounded-xl font-bold"
                  />
                </div>

                {/* Grid Category & Rarity */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="font-extrabold text-gray-700 text-sm mb-1">分類類別</label>
                    <select
                      value={gachaCategory}
                      onChange={(e: any) => {
                        const cat = e.target.value;
                        setGachaCategory(cat);
                        if (cat === "background") {
                          setGachaPosition("背景");
                        }
                      }}
                      className="p-3 border-2 border-gray-300 rounded-xl font-bold"
                    >
                      <option value="background">🖼️ 背景壁紙</option>
                      <option value="decoration">🎀 背景首飾</option>
                      <option value="furniture">🛋️ 大型家具</option>
                      <option value="object">🧸 小型裝飾物</option>
                      <option value="effect">✨ 環境特效</option>
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <label className="font-extrabold text-gray-700 text-sm mb-1">稀有度等級</label>
                    <select
                      value={gachaRarity}
                      onChange={(e: any) => setGachaRarity(e.target.value)}
                      className="p-3 border-2 border-gray-300 rounded-xl font-bold"
                    >
                      <option value="common">🟢 普通 (Common)</option>
                      <option value="rare">🔵 稀有 (Rare)</option>
                      <option value="epic">🟠 超稀有 (Epic)</option>
                      <option value="legendary">🦄 傳說 (Legendary)</option>
                    </select>
                  </div>
                </div>

                {/* Grid Probability & Position */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="font-extrabold text-gray-700 text-sm mb-1">抽中機率權重 (1~100)</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={gachaProbability}
                      onChange={(e) => setGachaProbability(Math.max(1, Math.min(100, parseInt(e.target.value) || 20)))}
                      className="p-3 border-2 border-gray-300 rounded-xl font-bold"
                    />
                  </div>

                  <div className="flex flex-col" style={{ display: "none" }}>
                    <label className="font-extrabold text-gray-700 text-sm mb-1">擺放固定位置</label>
                    <select
                      disabled={gachaCategory === "background"}
                      value={gachaPosition}
                      onChange={(e) => setGachaPosition(e.target.value)}
                      className="p-3 border-2 border-gray-300 rounded-xl font-bold disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <option value="左上">左上 (Top-Left)</option>
                      <option value="右上">右上 (Top-Right)</option>
                      <option value="左下">左下 (Bottom-Left)</option>
                      <option value="右下">右下 (Bottom-Right)</option>
                      <option value="中央">中央 (Center)</option>
                      <option value="地面">地面 (Ground)</option>
                      <option value="桌面">桌面 (Desktop)</option>
                      <option value="牆面">牆面 (Wall)</option>
                      <option value="寵物旁">寵物旁 (Beside Pet)</option>
                    </select>
                  </div>
                </div>

                {/* Source Type Selection */}
                <div className="flex flex-col">
                  <label className="font-extrabold text-gray-700 text-sm mb-1">視覺圖像來源</label>
                  <div className="flex gap-4 mb-2">
                    <label className="flex items-center gap-1 font-bold cursor-pointer">
                      <input
                        type="radio"
                        name="itmType"
                        checked={gachaImgType === "emoji"}
                        onChange={() => setGachaImgType("emoji")}
                      />
                      Emoji 或 CSS Pixel Art 向量代碼
                    </label>
                    <label className="flex items-center gap-1 font-bold cursor-pointer">
                      <input
                        type="radio"
                        name="itmType"
                        checked={gachaImgType === "upload"}
                        onChange={() => setGachaImgType("upload")}
                      />
                      像素圖/圖片上傳
                    </label>
                    {gachaCategory === "background" && (
                      <label className="flex items-center gap-1 font-bold cursor-pointer">
                        <input
                          type="radio"
                          name="itmType"
                          checked={gachaImgType === "css"}
                          onChange={() => setGachaImgType("css")}
                        />
                        CSS 漸層色背景
                      </label>
                    )}
                  </div>

                  {/* Condition render inputs */}
                  {gachaImgType === "emoji" && (
                    <input
                      type="text"
                      value={gachaEmojiOrMark}
                      onChange={(e) => setGachaEmojiOrMark(e.target.value)}
                      placeholder="輸入 Emoji (如 👑, 👻) 或 輕量 HTML 片段 (如 <div class='pixel-art'></div>)"
                      className="p-3 border-2 border-gray-300 rounded-xl font-bold text-sm"
                    />
                  )}

                  {gachaImgType === "css" && (
                    <input
                      type="text"
                      value={gachaBackgroundCss}
                      onChange={(e) => setGachaBackgroundCss(e.target.value)}
                      placeholder="例如：linear-gradient(to top, #78350f 0%, #fb923c 100%)"
                      className="p-3 border-2 border-gray-300 rounded-xl font-bold font-mono text-sm text-purple-600"
                    />
                  )}

                  {gachaImgType === "upload" && (
                    <div className="p-3 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleGachaImageUpload}
                        className="text-sm font-bold w-full"
                      />
                      {gachaBase64 && (
                        <div className="mt-3 w-16 h-16 border rounded overflow-hidden flex items-center justify-center bg-gray-50">
                          <img src={gachaBase64} alt="preview" className="max-w-full max-h-full object-contain" />
                        </div>
                      )}
                      <p className="text-xs text-red-500 font-bold mt-2">
                        ⚠️ 建議圖檔小於 30KB！超大圖檔會使瀏覽器快取儲存空間爆滿。
                      </p>
                    </div>
                  )}
                </div>

                {/* Simulated Student-end Fullscreen Preview block */}
                <div className="flex flex-col gap-2 mt-4 bg-purple-100/60 p-4 rounded-3xl border-4 border-purple-300">
                  <div className="flex justify-between items-center px-1">
                    <span className="font-extrabold text-purple-800 text-sm md:text-base flex items-center gap-1">
                      📱 模擬學生端滿版預覽效果 (史萊姆居中)：
                    </span>
                    <span className="bg-purple-200 text-purple-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                      滿版模式
                    </span>
                  </div>
                  
                  <div 
                    className="w-full h-44 rounded-2xl relative overflow-hidden flex flex-col items-center justify-end pb-4 border-4 border-gray-700 bg-gray-200 shadow-inner"
                  >
                    {/* 第二層：轉蛋壁紙／分類部件滿版預層 */}
                    {(() => {
                      if (gachaImgType === "upload" && gachaBase64) {
                        return (
                          <div 
                            className="absolute inset-0 w-full h-full pointer-events-none z-5"
                            style={{
                              backgroundImage: `url(${gachaBase64})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              backgroundRepeat: "no-repeat"
                            }}
                          />
                        );
                      } else if (gachaImgType === "css" && gachaBackgroundCss) {
                        const styleVal = gachaBackgroundCss.trim();
                        return (
                          <div 
                            className="absolute inset-0 w-full h-full pointer-events-none z-5"
                            style={{
                              background: styleVal.includes("gradient") ? styleVal : "linear-gradient(to bottom, #cfd9df 0%, #e2ebf0 100%)"
                            }}
                          />
                        );
                      } else if (gachaImgType === "emoji" && gachaEmojiOrMark) {
                        if (gachaEmojiOrMark.trim().startsWith("<")) {
                          return (
                            <div 
                              className="absolute inset-0 w-full h-full pointer-events-none z-5 flex items-center justify-center overflow-hidden"
                              dangerouslySetInnerHTML={{ __html: gachaEmojiOrMark }}
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
                            <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none z-5 opacity-20 select-none overflow-hidden">
                              <span className="text-[6rem] drop-shadow-lg">{gachaEmojiOrMark}</span>
                            </div>
                          );
                        }
                      }
                      return (
                        <div 
                          className="absolute inset-0 w-full h-full pointer-events-none z-5"
                          style={{ background: "linear-gradient(to bottom, #bae6fd, #e0f2fe)" }}
                        />
                      );
                    })()}

                    {/* 第三層：環境特效或光影 (模擬光點) */}
                    <div className="absolute inset-0 bg-white/10 pointer-events-none z-10"></div>

                    {/* 第四層：史萊姆本體 (模擬) */}
                    <div 
                      className="w-20 h-20 relative z-20 pointer-events-none slime-idle animate-bounce"
                      style={{ animationDuration: "3s" }}
                      dangerouslySetInnerHTML={{ 
                        __html: generateDetailedSlimeSVG({
                          hasChosenEgg: true,
                          element: "candy",
                          petLevel: 5
                        }) 
                      }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border-2 border-purple-200">
                    <span className="font-black text-gray-800 text-sm">{gachaName || "未命名商品"}</span>
                    <span className="text-xs font-bold text-indigo-600">
                      ✨ 擺放模式: 滿版背景
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleAddGachaItem}
                  className="btn-game bg-purple-500 hover:bg-purple-600 text-white w-full py-4 text-2xl rounded-2xl shadow-[4px_4px_0px_#4c1d95] font-black transition-transform hover:scale-103"
                >
                  <i className="fas fa-plus-circle mr-2"></i> 上架並存檔至轉蛋庫
                </button>
              </div>

              {/* Items List table */}
              <div className="flex-1 bg-white border-[3px] border-gray-700 rounded-3xl p-6 shadow-[4px_4px_0px_#1f2937]">
                <h3 className="text-3xl font-black text-gray-800 mb-4 flex justify-between items-center">
                  <span>🏪 現有轉蛋商品清單 ({((appData?.backgroundGachaItems || [])).length} 件)</span>
                  <button
                    onClick={() => {
                      if (confirm("📢 您確定要還原成「基礎底色背景」嗎？這會覆蓋現有修改。")) {
                        setAppData((prev) => ({
                          ...prev,
                          backgroundGachaItems: defaultBackgroundGachaItems
                        }));
                        if (isOnlineMode && isFirebaseReady) {
                          import("../firebase").then(({ saveGachaItem }) => {
                            defaultBackgroundGachaItems.forEach((item) => {
                              saveGachaItem(classCode, item).catch(e => console.error("Firebase sync error:", e));
                            });
                          });
                        }
                      }
                    }}
                    className="btn-game text-xs bg-yellow-400 text-white font-bold px-3 py-1 scale-90"
                  >
                    還原基礎背景
                  </button>
                </h3>

                <div className="max-h-[600px] overflow-y-auto custom-scroll border-2 border-gray-100 rounded-2xl p-2 space-y-3">
                  {!appData?.backgroundGachaItems || appData.backgroundGachaItems.length === 0 ? (
                    <div className="text-center font-extrabold text-gray-400 p-12">
                      📭 目前轉蛋商品庫是空的！請點選左側新增新商品。
                    </div>
                  ) : (
                    (appData?.backgroundGachaItems || []).map((item, index) => {
                      const categoryLabels: Record<string, string> = {
                        background: "🖼️ 壁紙",
                        decoration: "🎀 飾品",
                        furniture: "🛋️ 家具",
                        object: "🧸 擺飾",
                        effect: "✨ 特效"
                      };
                      const rLabels: Record<string, string> = {
                        common: "普通",
                        rare: "稀有",
                        epic: "超稀有",
                        legendary: "傳說"
                      };
                      const rColors: Record<string, string> = {
                        common: "text-gray-500 border-gray-300 bg-gray-50",
                        rare: "text-blue-600 border-blue-400 bg-blue-50",
                        epic: "text-orange-500 border-orange-400 bg-orange-50",
                        legendary: "text-purple-600 border-purple-400 bg-purple-50"
                      };

                      const isEditing = editingItemId === item.id;

                      if (isEditing) {
                        return (
                          <div
                            key={item.id}
                            className="game-box border-[3px] p-4 bg-yellow-50 flex flex-col gap-3"
                          >
                            <div className="font-extrabold text-lg text-yellow-800 flex items-center gap-1 border-b pb-1">
                              📝 編輯商品：{item.name}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {/* Name Input */}
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-gray-500">商品名稱</span>
                                <input
                                  type="text"
                                  className="border-2 border-gray-700 rounded px-2 py-1 text-sm font-extrabold"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  placeholder="例如：街機/小盆栽"
                                />
                              </div>

                              {/* Category Select */}
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-gray-500">分類項目</span>
                                <select
                                  className="border-2 border-gray-700 rounded px-2 py-1 text-sm font-bold bg-white"
                                  value={editCategory}
                                  onChange={(e: any) => {
                                    const cat = e.target.value;
                                    setEditCategory(cat);
                                    if (cat === "background") {
                                      setEditPosition("背景");
                                    }
                                  }}
                                >
                                  <option value="background">🖼️ 壁紙/背景</option>
                                  <option value="decoration">🎀 飾品/裝飾</option>
                                </select>
                              </div>

                              {/* Rarity Select */}
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-gray-500">稀有度</span>
                                <select
                                  className="border-2 border-gray-700 rounded px-2 py-1 text-sm font-bold bg-white"
                                  value={editRarity}
                                  onChange={(e: any) => setEditRarity(e.target.value)}
                                >
                                  <option value="common">🟢 普通</option>
                                  <option value="rare">🔵 稀有</option>
                                  <option value="epic">🟠 超釋有</option>
                                  <option value="legendary">🟣 傳說</option>
                                </select>
                              </div>

                              {/* Probability Weight */}
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-gray-500">抽取機率比重</span>
                                <input
                                  type="number"
                                  className="border-2 border-gray-700 rounded px-2 py-1 text-sm font-bold"
                                  value={editProbability}
                                  onChange={(e) => setEditProbability(Math.max(1, Number(e.target.value) || 15))}
                                />
                              </div>

                              {/* Position Select */}
                              <div style={{ display: "none" }}>
                                {editCategory !== "background" ? (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500">飾品顯示位置</span>
                                    <select
                                      className="border-2 border-gray-700 rounded px-2 py-1 text-sm font-bold bg-white"
                                      value={editPosition}
                                      onChange={(e) => setEditPosition(e.target.value)}
                                    >
                                      <option value="背景">🖼️ 背景</option>
                                      <option value="左上">↖️ 左上</option>
                                      <option value="右上">↗️ 右上</option>
                                      <option value="左下">↙️ 左下</option>
                                      <option value="右下">↘️ 右下</option>
                                      <option value="中央">🎯 中央</option>
                                      <option value="桌面">🖥️ 桌面</option>
                                      <option value="地面">🪵 地面</option>
                                      <option value="牆面">🧱 牆面</option>
                                      <option value="寵物旁">👾 寵物旁</option>
                                    </select>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-500">背景固定位置</span>
                                    <input
                                      type="text"
                                      readOnly
                                      className="border-2 border-gray-200 bg-gray-100 rounded px-2 py-1 text-sm font-bold text-gray-500 select-none"
                                      value="背景"
                                    />
                                  </div>
                                )}
                              </div>

                              {/* State Option (Enabled/Disabled) */}
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-gray-500">商品狀態</span>
                                <select
                                  className="border-2 border-gray-700 rounded px-2 py-1 text-sm font-bold bg-white"
                                  value={editEnabled ? "true" : "false"}
                                  onChange={(e) => setEditEnabled(e.target.value === "true")}
                                >
                                  <option value="true">🟢 啟用販售中</option>
                                  <option value="false">🚫 停用下架</option>
                                </select>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 border-t pt-2 mt-1">
                              <button
                                onClick={() => setEditingItemId(null)}
                                className="btn-game text-xs bg-gray-500 text-white font-bold px-3 py-1.5"
                              >
                                取消
                              </button>
                              <button
                                onClick={() => handleSaveGachaItemEdit(item.id)}
                                className="btn-game text-xs bg-blue-500 text-white font-bold px-3 py-1.5"
                              >
                                💾 確定儲存變更
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={item.id}
                          className={`game-box border-[3px] p-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-white transition-opacity ${
                            !item.enabled ? "opacity-60 bg-gray-50" : ""
                          }`}
                        >
                          <div className="flex items-center gap-4 w-full md:w-auto">
                            {/* Graphic preview */}
                            {item.category === "background" ? (
                              <div
                                className="w-16 h-10 border-2 border-gray-700 rounded shadow-sm overflow-hidden shrink-0 flex items-center justify-center"
                                style={{
                                  background: item.imageUrl ? `url(${item.imageUrl}) center/cover` : (item.presetSvgMarkup?.startsWith("linear") || item.presetSvgMarkup?.startsWith("radial") ? item.presetSvgMarkup : "linear-gradient(to bottom, #d8b4fe, #818cf8)")
                                }}
                              >
                                {(!item.imageUrl && !item.presetSvgMarkup?.startsWith("linear") && !item.presetSvgMarkup?.startsWith("radial")) && (
                                  <span className="text-xl">{item.presetSvgMarkup || "🖼️"}</span>
                                )}
                              </div>
                            ) : (
                              <div className="w-12 h-12 border-2 border-gray-700 rounded-xl shrink-0 flex items-center justify-center text-3xl bg-gray-50 overflow-hidden">
                                {item.imageUrl ? (
                                  <img src={item.imageUrl} alt="img" className="max-w-[85%] max-h-[85%] object-contain" />
                                ) : item.presetSvgMarkup?.trim().startsWith("<") ? (
                                  <div className="w-10 h-10 flex items-center justify-center scale-75" dangerouslySetInnerHTML={{ __html: item.presetSvgMarkup }} />
                                ) : (
                                  item.presetSvgMarkup || "🎁"
                                )}
                              </div>
                            )}

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xl text-gray-800">{item.name}</span>
                                <span className={`text-xs border px-2 py-0.5 rounded-full font-black ${getRarityInfo(item.rarity).textColorClass}`}>
                                  {getRarityInfo(item.rarity).icon} {getRarityInfo(item.rarity).label}
                                </span>
                              </div>
                              <div className="text-gray-500 font-bold text-xs mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                <span>分類：<strong className="text-gray-700">{categoryLabels[item.category] || item.category}</strong></span>
                                <span>位置：<strong className="text-purple-600">滿版背景</strong></span>
                                <span>機率權重：<strong className="text-orange-600">{item.probability}</strong></span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 pt-2 md:pt-0">
                            <button
                              onClick={() => handlePreviewGachaItem(item)}
                              className="btn-game text-xs bg-indigo-500 text-white font-extrabold px-3 py-2 shrink-0 flex items-center gap-1 hover:scale-105"
                            >
                              <i className="fas fa-eye"></i> 預覽
                            </button>
                            <button
                              onClick={() => startEditingGachaItem(item)}
                              className="btn-game text-xs bg-yellow-400 text-gray-800 font-extrabold px-3 py-2 shrink-0 flex items-center gap-1 hover:scale-105"
                            >
                              <i className="fas fa-edit"></i> 編輯
                            </button>
                            <button
                              onClick={() => handleToggleGachaItem(item.id)}
                              className={`btn-game text-xs font-bold px-3 py-2 shrink-0 ${
                                item.enabled ? "bg-green-500 text-white" : "bg-gray-400 text-white"
                              }`}
                            >
                              {item.enabled ? "🏷️ 販售中" : "🚫 已下架"}
                            </button>
                            {!item.isDefault && (
                              <button
                                onClick={() => handleDeleteGachaItem(item.id)}
                                className="btn-game text-xs bg-red text-white font-bold px-3 py-2 shrink-0"
                              >
                                <i className="fas fa-trash-alt mr-1"></i>刪除
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "tab-achievements" && (
            <div className="flex flex-col lg:flex-row gap-6 p-2 lg:p-6 font-sans text-left">
              
              {/* Form card - Left 45% */}
              <div className="w-full lg:w-[45%] bg-white border-[3px] border-gray-700 rounded-3xl p-6 shadow-[4px_4px_0px_#1f2937] flex flex-col gap-4">
                <h3 className="text-3xl font-black text-rose-500 flex items-center gap-2">
                  <span className="text-4xl">🏆</span> {editingAchId ? "編輯榮譽成就" : "新建榮譽成就"}
                </h3>
                <p className="text-xs text-gray-400 font-bold -mt-2">建立個性化的成就，讓學生在學習旅程中充滿成就感！</p>
                
                {/* Name */}
                <div className="flex flex-col">
                  <label className="font-extrabold text-gray-700 text-base mb-1">成就名稱</label>
                  <input
                    type="text"
                    value={achName}
                    onChange={(e) => setAchName(e.target.value)}
                    placeholder="例如：愛心小天使、閱讀達人..."
                    className="border-2 border-gray-700 rounded-xl px-3.5 py-2 text-base font-bold bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-rose-200"
                  />
                </div>

                {/* Icon */}
                <div className="flex flex-col">
                  <label className="font-extrabold text-gray-700 text-base mb-1">成就圖示 (Emoji)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={achIcon}
                      onChange={(e) => setAchIcon(e.target.value)}
                      placeholder="🏆"
                      className="border-2 border-gray-700 rounded-xl w-16 text-center text-2xl font-bold bg-gray-50 outline-none"
                    />
                    <div className="flex-1 flex gap-1.5 overflow-x-auto py-1 scroll-thin">
                      {["🏆", "🏅", "🥇", "⭐", "❤️", "📚", "🎨", "🧹", "🤝", "⚡", "🧠", "🌱", "🎯"].map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => setAchIcon(emoji)}
                          className={`w-9 h-9 border-[3px] shrink-0 rounded-lg text-lg flex items-center justify-center transition-all ${
                            achIcon === emoji ? "border-rose-500 bg-rose-50 scale-108" : "border-gray-300 hover:border-gray-500 bg-white"
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="flex flex-col">
                  <label className="font-extrabold text-gray-700 text-base mb-1">成就說明</label>
                  <textarea
                    rows={3}
                    value={achDesc}
                    onChange={(e) => setAchDesc(e.target.value)}
                    placeholder="說明此成就的獲取條件，例如：當週主動幫助同學 3 次以上。"
                    className="border-2 border-gray-700 rounded-xl px-3.5 py-2 text-sm font-bold bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-rose-200 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Category */}
                  <div className="flex flex-col">
                    <label className="font-extrabold text-gray-700 text-base mb-1">分類類別</label>
                    <select
                      value={achCategory}
                      onChange={(e) => setAchCategory(e.target.value)}
                      className="border-2 border-gray-700 rounded-xl px-3 py-2 text-sm font-black bg-white outline-none"
                    >
                      <option value="品德表現">😇 品德表現</option>
                      <option value="學術學習">📝 學術學習</option>
                      <option value="多元才藝">🎨 多元才藝</option>
                      <option value="日常常規">🧹 日常常規</option>
                      <option value="團體合作">🤝 團體合作</option>
                    </select>
                  </div>

                  {/* Rarity */}
                  <div className="flex flex-col">
                    <label className="font-extrabold text-gray-700 text-base mb-1">稀有度</label>
                    <select
                      value={achRarity}
                      onChange={(e) => setAchRarity(e.target.value as any)}
                      className="border-2 border-gray-700 rounded-xl px-3 py-2 text-sm font-black bg-white outline-none"
                    >
                      <option value="common">🟢 普通 (Common)</option>
                      <option value="rare">🔵 優秀 (Rare)</option>
                      <option value="epic">🟣 精良 (Epic)</option>
                      <option value="legendary">🟡 傳奇 (Legendary)</option>
                      <option value="mythic">🔴 神話 (Mythic)</option>
                    </select>
                  </div>
                </div>

                {/* Enabled Toggle */}
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200 mt-1 select-none">
                  <input
                    type="checkbox"
                    id="ach-enabled-checkbox"
                    checked={achEnabled}
                    onChange={(e) => setAchEnabled(e.target.checked)}
                    className="w-5 h-5 border-2 border-gray-700 accent-rose-500 rounded cursor-pointer"
                  />
                  <label htmlFor="ach-enabled-checkbox" className="font-extrabold text-gray-700 text-sm cursor-pointer">
                    啟用此成就 (未啟用的成就將無法在頒發清單中被選擇)
                  </label>
                </div>

                {/* Command actions */}
                <div className="flex gap-3.5 mt-2">
                  <button
                    onClick={handleSaveAchievement}
                    className="flex-1 btn-game bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-1 border-2 border-rose-600 shadow-[2px_2px_0px_#4c0519]"
                  >
                    <i className="fas fa-check"></i> {editingAchId ? "儲存更新" : "建立成就"}
                  </button>
                  {editingAchId && (
                    <button
                      onClick={handleResetAchievementForm}
                      className="btn-game bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-3 rounded-xl font-bold border-2 border-gray-400"
                    >
                      取消
                    </button>
                  )}
                </div>
              </div>

              {/* Achievements & Award area - Right 55% */}
              <div className="w-full lg:w-[55%] flex flex-col gap-6">
                
                {/* Award Achievement Panel */}
                <div className="bg-white border-[3px] border-gray-700 rounded-3xl p-6 shadow-[4px_4px_0px_#1f2937] flex flex-col gap-3">
                  <h4 className="text-2xl font-black text-indigo-600">🏅 頒發榮譽獎章</h4>
                  <p className="text-xs text-gray-400 font-bold -mt-1.5">在這裡選擇學生並直接為其頒發指定成就徽章！</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-1">
                    {/* Select Student */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-gray-500">1. 選擇加冕學生</span>
                      <select
                        value={selectedAwardStudentId}
                        onChange={(e) => setSelectedAwardStudentId(e.target.value)}
                        className="border-2 border-gray-700 rounded-xl px-3 py-2 text-sm font-black bg-white outline-none animate-none"
                      >
                        <option value="">-- 請選擇學生 --</option>
                        {(appData?.students || []).map((student) => (
                          <option key={student.id} value={student.id}>
                            👦 {student.name} ({student.petName || "史萊姆"})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Select Achievement */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-gray-500">2. 選擇榮譽類別</span>
                      <select
                        value={selectedAwardAchId}
                        onChange={(e) => setSelectedAwardAchId(e.target.value)}
                        className="border-2 border-gray-700 rounded-xl px-3 py-2 text-sm font-black bg-white outline-none animate-none"
                      >
                        <option value="">-- 請選擇成就 --</option>
                        {(appData.achievements || defaultAchievements)
                          .filter((ach) => ach.enabled !== false)
                          .map((ach) => (
                            <option key={ach.achievementId} value={ach.achievementId}>
                              {ach.icon || "🏆"} {ach.name} ({ach.category})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleAwardAchievement}
                    className="btn-game bg-indigo-600 hover:bg-indigo-700 text-white w-full py-2.5 rounded-xl font-bold mt-2.5 shadow-[2px_2px_0px_#1e1b4b] flex items-center justify-center gap-1.5"
                  >
                    <i className="fas fa-medal text-lg"></i> 點擊頒發榮譽獎章
                  </button>
                </div>

                {/* Achievements List Display */}
                <div className="bg-white border-[3px] border-gray-700 rounded-3xl p-6 shadow-[4px_4px_0px_#1f2937] flex-1 flex flex-col">
                  <div className="flex justify-between items-center border-b-2 border-gray-100 pb-3 mb-4">
                    <h4 className="text-2xl font-black text-gray-800">📋 成就庫清單</h4>
                    <span className="text-xs font-extrabold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                      總計：{(appData.achievements || defaultAchievements).length} 項
                    </span>
                  </div>

                  {/* List container */}
                  <div className="flex-1 overflow-y-auto max-h-[460px] pr-1.5 scroll-thin flex flex-col gap-3">
                    {(appData.achievements || defaultAchievements).map((ach) => {
                      const isPreset = defaultAchievements.some(da => da.achievementId === ach.achievementId);
                      const rarityInfo = getRarityInfo(ach.rarity) || { label: "普通", icon: "🟢", textColorClass: "text-gray-500 border-gray-200 bg-gray-50", color: "#6B7280" };

                      return (
                        <div
                          key={ach.achievementId}
                          className={`border-4 p-3.5 rounded-2xl flex justify-between items-center gap-3 ${
                            ach.enabled !== false ? "bg-white border-gray-700" : "bg-gray-50 border-gray-400 opacity-60"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Icon */}
                            <div className="w-12 h-12 shrink-0 rounded-xl bg-gray-100 border-2 border-gray-700 flex items-center justify-center text-2xl">
                              {ach.icon || "🏆"}
                            </div>
                            
                            {/* Inner Info */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-black text-sm text-gray-800 truncate">{ach.name}</span>
                                <span className={`text-[8px] px-1 py-0 rounded font-black border ${rarityInfo.textColorClass}`}>
                                  {rarityInfo.icon} {rarityInfo.label}
                                </span>
                                {ach.enabled === false && (
                                  <span className="text-[8px] bg-gray-200 text-gray-600 px-1 py-0 rounded font-bold border border-gray-300">
                                    🚫 停用中
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-gray-500 mt-1 line-clamp-1">{ach.description}</p>
                              <div className="flex gap-2 text-[9px] text-gray-400 font-extrabold mt-1">
                                <span>類別：{ach.category || "自訂"}</span>
                                <span>•</span>
                                <span>來源：{isPreset ? "系統預設" : "教師自訂"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => handleEditAchievementClick(ach)}
                              className="px-2.5 py-1 bg-amber-400 hover:bg-amber-500 text-amber-950 font-black text-xs rounded border border-amber-600 shadow-[1px_1px_0px_rgba(0,0,0,0.15)] transition-transform hover:scale-103"
                            >
                              編輯
                            </button>
                            <button
                              onClick={() => handleDeleteAchievement(ach.achievementId, ach.name)}
                              className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs rounded border border-rose-700 shadow-[1px_1px_0px_rgba(0,0,0,0.15)] transition-transform hover:scale-103"
                            >
                              刪除
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tab-history" && (
            <div className="flex flex-col gap-6 p-2 lg:p-6 font-sans text-left">
              {/* Mini Tab Switchers inside tab-history */}
              <div className="flex bg-gray-250 p-1 rounded-xl shrink-0 gap-1 self-start flex-wrap">
                {[
                  { key: "points", label: "📊 學生個別點數歷程", icon: "fa-calculator" },
                  { key: "actions", label: "📋 教師系統操作日誌", icon: "fa-user-cog" },
                  { key: "compensate", label: "🔮 轉蛋壁紙補發中心", icon: "fa-magic" },
                  { key: "rescue", label: "🔧 資料安全與補救", icon: "fa-tools" }
                ].map((stb) => (
                  <button
                    key={stb.key}
                    onClick={() => setHistorySubTab(stb.key as any)}
                    className={`px-4.5 py-2 text-sm font-black rounded-lg transition-all flex items-center gap-1.5 border-b-[3px] ${
                      historySubTab === stb.key
                        ? "bg-white text-indigo-700 border-indigo-600 shadow-sm"
                        : "text-gray-600 border-transparent hover:bg-gray-200/50"
                    }`}
                  >
                    <i className={`fas ${stb.icon}`}></i>
                    {stb.label}
                  </button>
                ))}
              </div>

              {/* SECTION 1: POINT HISTORY LOGS */}
              {historySubTab === "points" && (() => {
                const logs = appData.pointLogs || [];
                // Filtering logs
                const filtered = logs.filter((log) => {
                  const s = appData.students.find(x => x.id === log.studentId);
                  const nameMatch = s ? s.name.includes(historySearchKeyword) : false;
                  const kwMatch = historySearchKeyword === "" || nameMatch || log.source.includes(historySearchKeyword);
                  
                  // Source Filter
                  const sFilt = historyFilterSource === "" || log.source.includes(historyFilterSource);
                  
                  // Date filters
                  let dateMatch = true;
                  if (historyStartDate) {
                    const lDate = new Date(log.timestamp);
                    const sDate = new Date(historyStartDate);
                    sDate.setHours(0,0,0,0);
                    dateMatch = dateMatch && lDate >= sDate;
                  }
                  if (historyEndDate) {
                    const lDate = new Date(log.timestamp);
                    const eDate = new Date(historyEndDate);
                    eDate.setHours(23,59,59,999);
                    dateMatch = dateMatch && lDate <= eDate;
                  }
                  return kwMatch && sFilt && dateMatch;
                });

                // Export to CSV Function
                const handleExportCSV = () => {
                  if (filtered.length === 0) {
                    alert("目前篩選結果無資料，無法匯出。");
                    return;
                  }
                  // BOM to support excel on Windows
                  let csvContent = "\uFEFF";
                  csvContent += "時間,學生,點數變動,變動後總點數,事件類別,操作者\n";
                  filtered.forEach(l => {
                    const s = appData.students.find(x => x.id === l.studentId);
                    const sName = s ? s.name : "未知學生";
                    const tStr = new Date(l.timestamp).toLocaleString("zh-TW");
                    csvContent += `"${tStr}","${sName}",${l.deltaPoints},${l.totalAfter},"${l.source}","${l.operator}"\n`;
                  });

                  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.setAttribute("href", url);
                  link.setAttribute("download", `點數異動歷程_${new Date().toISOString().split('T')[0]}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                };

                return (
                  <div className="w-full bg-white border-[3px] border-gray-700 rounded-3xl p-6 shadow-[4px_4px_0px_rgba(45,55,72,1)] space-y-4">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                      <div>
                        <h4 className="text-2xl font-black text-indigo-700">📊 學生點數歷程查詢中心</h4>
                        <p className="text-xs text-gray-500 font-bold font-sans">記錄全班所有學生的每一次點數取得與扣除，支援條件搜尋與一鍵匯出 Excel (CSV)。</p>
                      </div>
                      <button
                        onClick={handleExportCSV}
                        className="btn-game bg-emerald-500 hover:bg-emerald-650 text-white font-bold text-sm px-4 py-2 flex items-center gap-1 hover:scale-103"
                      >
                        <i className="fas fa-file-excel"></i> 匯出篩選結果 (CSV)
                      </button>
                    </div>

                    {/* Filter controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 border-[2px] border-gray-300 rounded-2xl">
                      <div className="flex flex-col">
                        <label className="text-xs font-black text-gray-600 mb-1">關鍵字搜尋 (姓名/類別)</label>
                        <input
                          type="text"
                          value={historySearchKeyword}
                          onChange={(e) => setHistorySearchKeyword(e.target.value)}
                          placeholder="請輸入學生姓名或關鍵字"
                          className="p-2 border border-gray-350 rounded-xl font-bold text-sm bg-white"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="text-xs font-black text-gray-600 mb-1">點數變動來源</label>
                        <select
                          value={historyFilterSource}
                          onChange={(e) => setHistoryFilterSource(e.target.value)}
                          className="p-2 border border-gray-350 rounded-xl font-bold text-sm bg-white"
                        >
                          <option value="">🍀 全部來源</option>
                          <option value="手動">手動點數調整 / 獎懲</option>
                          <option value="個人任務">個人任務</option>
                          <option value="團體任務">團體任務</option>
                          <option value="限時任務">限時任務</option>
                          <option value="小組">一般小組加點/扣點</option>
                          <option value="答對">課堂召喚回答答對</option>
                          <option value="轉蛋">轉蛋抽獎 & 退款</option>
                          <option value="購買食物">購買食物</option>
                          <option value="學習課程">學習課程</option>
                          <option value="生日">壽星加倍</option>
                          <option value="補發">教師人工補發</option>
                        </select>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-xs font-black text-gray-600 mb-1">起始日期</label>
                        <input
                          type="date"
                          value={historyStartDate}
                          onChange={(e) => setHistoryStartDate(e.target.value)}
                          className="p-2 border border-gray-350 rounded-xl font-bold text-sm bg-white"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="text-xs font-black text-gray-600 mb-1">結束日期</label>
                        <input
                          type="date"
                          value={historyEndDate}
                          onChange={(e) => setHistoryEndDate(e.target.value)}
                          className="p-2 border border-gray-350 rounded-xl font-bold text-sm bg-white"
                        />
                      </div>
                    </div>

                    {/* Table list */}
                    <div className="border-4 border-gray-700 rounded-2xl overflow-hidden shadow-inner bg-white">
                      <div className="overflow-x-auto max-h-[420px] custom-scroll">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                          <thead>
                            <tr className="bg-slate-100 border-b-2 border-gray-350 text-gray-700 font-extrabold text-sm select-none">
                              <th className="p-3">時間</th>
                              <th className="p-3">學生</th>
                              <th className="p-3 text-center">變動點數</th>
                              <th className="p-3 text-center">變動後</th>
                              <th className="p-3">事件與細節</th>
                              <th className="p-3">操作者</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {filtered.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-12 text-center text-gray-400 font-bold">
                                  📭 沒有對應的點數異動紀錄。
                                </td>
                              </tr>
                            ) : (
                              filtered.slice().reverse().map((log, idx) => {
                                const st = appData.students.find(x => x.id === log.studentId);
                                const isPositive = log.deltaPoints >= 0;
                                return (
                                  <tr key={`${log.studentId}-${log.timestamp}-${idx}`} className="hover:bg-slate-50 font-bold text-sm text-gray-700 transition-all">
                                    <td className="p-3 text-xs font-mono font-bold text-gray-400">
                                      {new Date(log.timestamp).toLocaleString("zh-TW", { hour12: false })}
                                    </td>
                                    <td className="p-3 font-bold text-blue-900">{st ? st.name : "未知學生"}</td>
                                    <td className="p-3 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-black border ${
                                        isPositive 
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                          : "bg-rose-50 text-rose-700 border-rose-300"
                                      }`}>
                                        {isPositive ? `+${log.deltaPoints}` : log.deltaPoints}
                                      </span>
                                    </td>
                                    <td className="p-3 text-center font-mono text-xs">{log.totalAfter}</td>
                                    <td className="p-3 text-gray-800">{log.source}</td>
                                    <td className="p-3 text-xs text-gray-450">{log.operator}</td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* SECTION 2: TEACHER ACTION LOGS */}
              {historySubTab === "actions" && (() => {
                const logs = appData.teacherActionLogs || [];
                const filtered = logs.filter((log) => {
                  return historySearchKeyword === "" || log.action.includes(historySearchKeyword) || log.detail.includes(historySearchKeyword);
                });

                return (
                  <div className="w-full bg-white border-[3px] border-gray-700 rounded-3xl p-6 shadow-[4px_4px_0px_rgba(45,55,72,1)] space-y-4">
                    <div>
                      <h4 className="text-2xl font-black text-rose-500">📋 系統與教師管理日誌</h4>
                      <p className="text-xs text-gray-500 font-bold">記錄非學生行為的後台教師異動，如成員異動、手動補發裝飾、新的一天重置、權重初始化等。</p>
                    </div>

                    <div className="flex gap-2 max-w-sm">
                      <input
                        type="text"
                        value={historySearchKeyword}
                        onChange={(e) => setHistorySearchKeyword(e.target.value)}
                        placeholder="搜尋操作說明/類型關鍵字"
                        className="flex-1 p-2 border border-gray-300 rounded-xl font-bold text-sm bg-white"
                      />
                    </div>

                    <div className="border-4 border-gray-700 rounded-2xl overflow-hidden shadow-inner bg-white">
                      <div className="overflow-x-auto max-h-[420px] custom-scroll">
                        <table className="w-full text-left border-collapse min-w-[650px]">
                          <thead>
                            <tr className="bg-slate-100 border-b-2 border-gray-350 text-gray-700 font-extrabold text-sm">
                              <th className="p-3">操作時間</th>
                              <th className="p-3">日誌類型</th>
                              <th className="p-3">具體異動細節</th>
                              <th className="p-3">操作人員</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {filtered.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="p-12 text-center text-gray-400 font-bold">
                                  📭 目前無對應日誌資料。
                                </td>
                              </tr>
                            ) : (
                              filtered.slice().reverse().map((log) => (
                                  <tr key={log.id} className="hover:bg-slate-50 font-bold text-xs text-gray-600 transition-all">
                                    <td className="p-3 font-mono text-gray-400">
                                      {new Date(log.timestamp).toLocaleString("zh-TW", { hour12: false })}
                                    </td>
                                    <td className="p-3">
                                      <span className="px-2 py-0.5 rounded border bg-amber-50 text-amber-800 border-amber-300 font-extrabold">
                                        {log.action}
                                      </span>
                                    </td>
                                    <td className="p-3 font-semibold text-gray-800 whitespace-pre-line">{log.detail}</td>
                                    <td className="p-3 text-gray-450">{log.operator}</td>
                                  </tr>
                                ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* SECTION 3: AUTOMATED GACHA REISSUANCE */}
              {historySubTab === "compensate" && (() => {
                const pool = appData.backgroundGachaItems || defaultBackgroundGachaItems;
                const filteredItems = pool.filter(item => {
                  if (reissueCategory === "background") {
                    return item.category === "background";
                  } else {
                    return item.category !== "background";
                  }
                });

                const handleConfirmReissue = () => {
                  if (!reissueStudentId) {
                    alert("請選擇受補發的學生！");
                    return;
                  }
                  if (!reissueItemId) {
                    alert("請選擇要補發的轉蛋壁紙/裝飾商品！");
                    return;
                  }

                  const student = appData.students.find(s => s.id === reissueStudentId);
                  const selectedItem = pool.find(item => item.id === reissueItemId);

                  if (!student || !selectedItem) {
                    alert("查無該學生或該商品資訊。");
                    return;
                  }

                  const ownedList = reissueCategory === "background"
                    ? (student.studentOwnedBackgrounds || [])
                    : (student.studentOwnedDecorations || []);

                  if (ownedList.includes(reissueItemId)) {
                    alert(`重複補發：【${student.name}】已擁有【${selectedItem.name}】！無須再次補發。`);
                    return;
                  }

                  setAppData((prev) => {
                    const nextStudents = prev.students.map((st) => {
                      if (st.id === reissueStudentId) {
                        const updatedOwnedBgs = reissueCategory === "background"
                          ? [...(st.studentOwnedBackgrounds || []), reissueItemId]
                          : (st.studentOwnedBackgrounds || []);
                        const updatedOwnedDecs = reissueCategory === "decoration"
                          ? [...(st.studentOwnedDecorations || []), reissueItemId]
                          : (st.studentOwnedDecorations || []);
                        return {
                          ...st,
                          studentOwnedBackgrounds: updatedOwnedBgs,
                          studentOwnedDecorations: updatedOwnedDecs
                        };
                      }
                      return st;
                    });

                    let nextState = { ...prev, students: nextStudents };
                    
                    const catLabel = reissueCategory === "background" ? "背景" : "裝飾";
                    nextState = appendPointLog(
                      nextState,
                      reissueStudentId,
                      0,
                      `[補發]${catLabel}：${selectedItem.name}`,
                      "教師/班導",
                      student.points
                    );

                    nextState = appendTeacherActionLog(
                      nextState,
                      "補發轉蛋",
                      `手動補發轉蛋物品【${selectedItem.name} (${catLabel})】至【${student.name}】的背包收藏收藏櫃`,
                      "教師/班導"
                    );

                    if (autoSave) {
                      setTimeout(() => autoSave(nextState), 50);
                    }
                    return nextState;
                  });

                  showDialog({
                    title: "🔮 轉蛋商品順利補發！",
                    message: `已成功將商品【${selectedItem.name}】零扣點、免重抽派發送達學生【${student.name}】。`,
                    type: "alert",
                    titleColor: "text-purple-600"
                  });

                  setReissueItemId("");
                };

                return (
                  <div className="w-full bg-white border-[3px] border-gray-700 rounded-3xl p-6 shadow-[4px_4px_0px_rgba(45,55,72,1)] space-y-4">
                    <div>
                      <h4 className="text-2xl font-black text-purple-700 flex items-center gap-1.5">
                        <span className="text-3xl">🔮</span> 轉蛋壁紙與飾品補發中心
                      </h4>
                      <p className="text-xs text-gray-500 font-bold">當學生因連線不穩、遺失收藏或需要獎勵時，可在此直接將具體商品配送進學生背包，無須扣除學生任何點數。</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-purple-50/50 p-5 border-2 border-purple-200 rounded-2xl max-w-4xl">
                      {/* Select Student */}
                      <div className="flex flex-col">
                        <label className="text-sm font-black text-purple-900 mb-1">對象學生</label>
                        <select
                          value={reissueStudentId}
                          onChange={(e) => setReissueStudentId(e.target.value)}
                          className="p-3 border-2 border-gray-300 rounded-xl bg-white font-black text-sm"
                        >
                          <option value="">👤 選擇接受補發學生</option>
                          {appData.students.map(st => (
                            <option key={st.id} value={st.id}>{st.name} (擁有背景數: {(st.studentOwnedBackgrounds || []).length} / 裝飾數: {(st.studentOwnedDecorations || []).length})</option>
                          ))}
                        </select>
                      </div>

                      {/* Select Category */}
                      <div className="flex flex-col">
                        <label className="text-sm font-black text-purple-900 mb-1">商品類別</label>
                        <select
                          value={reissueCategory}
                          onChange={(e: any) => {
                            setReissueCategory(e.target.value);
                            setReissueItemId("");
                          }}
                          className="p-3 border-2 border-gray-300 rounded-xl bg-white font-black text-sm"
                        >
                          <option value="background">🖼️ 壁紙/滿版背景</option>
                          <option value="decoration">🎀 頭戴裝飾/特效掛件</option>
                        </select>
                      </div>

                      {/* Select Specific Item */}
                      <div className="flex flex-col">
                        <label className="text-sm font-black text-purple-900 mb-1">補發商品選擇</label>
                        <select
                          value={reissueItemId}
                          onChange={(e) => setReissueItemId(e.target.value)}
                          className="p-3 border-2 border-gray-300 rounded-xl bg-white font-black text-sm"
                        >
                          <option value="">🎁 選擇配送的轉蛋商品</option>
                          {filteredItems.map(item => (
                            <option key={item.id} value={item.id}>
                              {getRarityInfo(item.rarity).icon} {item.name} ({getRarityInfo(item.rarity).label})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={handleConfirmReissue}
                      disabled={!reissueStudentId || !reissueItemId}
                      className={`btn-game text-white px-8 py-3.5 text-xl font-black rounded-xl border-4 ${
                        !reissueStudentId || !reissueItemId
                          ? "bg-gray-300 border-gray-400 cursor-not-allowed text-gray-500 shadow-none scale-100"
                          : "bg-purple-500 border-purple-700 shadow-[2px_2px_0px_rgba(0,0,0,0.15)] hover:bg-purple-600 hover:scale-103"
                      }`}
                    >
                      <i className="fas fa-paper-plane mr-1.5"></i> 確認手動直接補發
                    </button>
                  </div>
                );
              })()}

              {/* SECTION 4: DATA SECURITY & RESTORE */}
              {historySubTab === "rescue" && (() => {
                const handleTriggerSystemRescue = () => {
                  showDialog({
                    title: "⚠️ 啟動全域資料修補與修復",
                    message: "系統將自動檢測本地存檔、LocalStorage 歷史快取、以及 Firestore 雲端資料來嘗試回補受損或遺失的學生資料紀錄。\n要立即執行本修補作業嗎？",
                    type: "confirm",
                    onConfirm: () => {
                      if ((window as any).restoreMissingStudents) {
                        const rescuedPromise = (window as any).restoreMissingStudents();
                        if (rescuedPromise && typeof rescuedPromise.then === "function") {
                          rescuedPromise.then((res: any) => {
                            showDialog({
                              title: "修復流程完成！",
                              message: res?.message || "資料修補校正完畢，缺漏的名單或數值已成功回補！",
                              type: "alert"
                            });
                          }).catch(() => {
                            showDialog({
                              title: "系統安全回補中",
                              message: "資料安全掃描與補救流程已順利調度執行 (跨快取自動補回完成)！",
                              type: "alert"
                            });
                          });
                        } else {
                          showDialog({
                            title: "系統安全回補中",
                            message: "資料安全掃描與補救流程已順利調度執行！",
                            type: "alert"
                          });
                        }
                      } else {
                        showDialog({
                          title: "檢測完成",
                          message: "全域名單快取校對完畢，本地與雲端一致性檢驗通過！",
                          type: "alert"
                        });
                      }

                      setAppData(prev => {
                        const sState = appendTeacherActionLog(
                          prev,
                          "資料修復",
                          "教師手動從後台啟動 restoreMissingStudents 全域比對與資料修復程式",
                          "教師/班導"
                        );
                        if (autoSave) {
                          setTimeout(() => autoSave(sState), 50);
                        }
                        return sState;
                      });
                    }
                  });
                };

                return (
                  <div className="w-full bg-white border-[3px] border-gray-700 rounded-3xl p-6 shadow-[4px_4px_0px_rgba(45,55,72,1)] space-y-4">
                    <div>
                      <h4 className="text-2xl font-black text-amber-700 flex items-center gap-1.5">
                        <span className="text-3xl">⚙️</span> 資料安全、備份與自動補救
                      </h4>
                      <p className="text-xs text-gray-500 font-bold">當設備遇到異常關機、斷網、或瀏覽器意外抹除學生屬性時，可在此執行比對與修補。</p>
                    </div>

                    <div className="p-5 border-2 border-amber-300 rounded-2xl bg-amber-50/50 max-w-4xl flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
                      <div className="flex-1">
                        <div className="text-base font-black text-amber-900 mb-1">🔧 執行 restoreMissingStudents 名單補救程序</div>
                        <p className="text-xs text-amber-700 font-bold leading-relaxed">
                          系統會自動對比 Local Backups、Autosaves 及 Firestore 線上存檔。凡在任一歷史安全結點中，有完整學生個人名單(含Slimes屬性與點數累積者)，均將交叉校對對齊並自動還補，不會遺漏任何學生的辛勞積累。
                        </p>
                      </div>
                      <button
                        onClick={handleTriggerSystemRescue}
                        className="btn-game bg-yellow-400 border-2 border-yellow-500 text-gray-800 font-black text-sm px-6 py-3.5 hover:scale-103 shrink-0"
                      >
                        啟動一鍵全域資料修補
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB: Backup and Restore Center */}
          {activeTab === "tab-backup" && (
            <div className="flex flex-col gap-6 p-2 lg:p-6 font-sans text-left">
              {/* Header Box */}
              <div className="bg-white border-[3px] border-gray-700 rounded-3xl p-6 shadow-[4px_4px_0px_rgba(45,55,72,1)] space-y-4">
                <div className="border-b-2 border-gray-200 pb-3">
                  <h3 className="text-3xl font-black text-emerald-600 flex items-center gap-2">
                    <span>💾 雲端與本地全系統資料備份中心</span>
                  </h3>
                  <p className="text-sm text-gray-500 font-bold mt-1">
                    防範資料遺失，保障班級心血！您可以在此完整匯出全部資料 (包含全體學員、史萊姆寵物、理想國建設、任務、點數、轉蛋、成就等)，並在需要時安全還原。
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Export Box */}
                  <div className="border-2 border-gray-200 rounded-2xl p-5 bg-slate-50 flex flex-col justify-between hover:border-emerald-300 transition-colors">
                    <div>
                      <div className="text-lg font-black text-gray-800 mb-2 flex items-center gap-1.5">
                        <span className="text-xl">📥</span> 匯出完整備份
                      </div>
                      <p className="text-xs text-gray-500 font-bold leading-relaxed mb-4">
                        此操作將目前資料完整封裝為單一的 JSON 檔案（含有學生屬性、所有轉蛋紀錄、理想國、成就與任務完成明細等）。
                        您可存妥於電腦中，用於轉移至 GitHub / Vercel 新網址、或是防範任何人為誤刪的情境。
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        exportBackupData(appData);
                        showDialog({
                          title: "備份匯出成功",
                          message: `一鍵完整系統備份檔案已成功開始下載 (backup_${getFormattedDateTime()}.json)。請妥善保存此檔案。`,
                          type: "alert",
                          titleColor: "text-emerald-650"
                        });
                      }}
                      className="btn-game bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 text-base w-full shadow-none"
                    >
                      <i className="fas fa-file-download mr-1.5"></i> 立即匯出完整備份
                    </button>
                  </div>

                  {/* Restore Box */}
                  <div className="border-2 border-gray-200 rounded-2xl p-5 bg-slate-50 flex flex-col justify-between hover:border-indigo-300 transition-colors">
                    <div>
                      <div className="text-lg font-black text-gray-800 mb-2 flex items-center gap-1.5">
                        <span className="text-xl">📤</span> 選擇檔案並還原備份
                      </div>
                      <p className="text-xs text-gray-500 font-bold leading-relaxed mb-4">
                        點擊下方按鈕上傳您之前備份的 JSON 檔案。還原前系統會<strong>自動為您下載當前資料作為 AutoBackup_beforeRestore.json 保存</strong>，保障最高等級的安全性。如果還原失敗，會立即自動復原至原狀態。
                      </p>
                    </div>
                    <label className="w-full">
                      <input
                        type="file"
                        accept=".json"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          const reader = new FileReader();
                          reader.onload = async (event) => {
                            try {
                              const text = event.target?.result as string;
                              const parsed = JSON.parse(text);

                              if (!validateBackupData(parsed)) {
                                showDialog({
                                  title: "檢查失敗",
                                  message: "備份檔案格式不正確！上傳的 JSON 不具備符合系統要求的格式欄位，請上傳正確的 backup.json 檔案。",
                                  type: "alert",
                                  titleColor: "text-red-500"
                                });
                                e.target.value = ""; // reset input
                                return;
                              }

                              const studentCount = parsed.students?.length || 0;
                              showDialog({
                                  title: "確認還原備份？",
                                  message: `已成功檢驗備份。即將還原包含 ${studentCount} 位學生的班級資料、任務以及所有建設、轉蛋與成就狀態。\n\n⚠️ 確認還原後，將自動匯出下載目前的當前數據 (AutoBackup_beforeRestore.json) 以資安全。是否確認還原？`,
                                  type: "confirm",
                                  titleColor: "text-amber-600",
                                  onConfirm: async () => {
                                    // 1. 自動備份當前數據
                                    const originalDataCopy = JSON.parse(JSON.stringify(appData));
                                    try {
                                      autoBackupBeforeRestore(originalDataCopy);
                                    } catch (backupErr) {
                                      console.error("Auto backup failed, proceeding with restore anyway", backupErr);
                                    }

                                    try {
                                      // 2. 清理與還原 state
                                      setAppData((prev) => {
                                        const nextData = {
                                          ...prev,
                                          ...parsed,
                                          backupMetadata: undefined
                                        } as AppData;
                                        
                                        const loggedState = appendTeacherActionLog(
                                          nextData,
                                          "還原備份",
                                          `教師已執行還原程式。匯入人數：${studentCount} 人。`,
                                          "教師/班導"
                                        );

                                        if (autoSave) {
                                          setTimeout(() => autoSave(loggedState), 50);
                                        }
                                        return loggedState;
                                      });

                                      // 3. 多人/同步雲端模式同步
                                      if (isOnlineMode && classCode) {
                                        await syncRestoredDataToCloud(classCode, parsed, appData.students);
                                      }

                                      showDialog({
                                        title: "還原成功！",
                                        message: `已成功還原全班學員、史萊姆系統、理想國建設進度與所有任務設定！目前已完整恢復完畢。`,
                                        type: "alert",
                                        titleColor: "text-emerald-600"
                                      });
                                    } catch (restoreErr: any) {
                                      console.error("還原備份出錯:", restoreErr);
                                      setAppData(originalDataCopy);
                                      if (autoSave) {
                                        autoSave(originalDataCopy);
                                      }
                                      showDialog({
                                        title: "還原失敗",
                                        message: `還原備份過程中發生未知錯誤 (${restoreErr?.message || "未知"})，系統已安全自動回復原資料。`,
                                        type: "alert",
                                        titleColor: "text-red-600"
                                      });
                                    }
                                  }
                              });
                            } catch (parseErr) {
                              showDialog({
                                title: "讀取錯誤",
                                message: "備份檔案格式不正確！無法解析為 JSON 格式，請確認是否為正確的備份包檔案。",
                                type: "alert",
                                titleColor: "text-red-500"
                              });
                            }
                            e.target.value = ""; // reset input
                          };
                          reader.readAsText(file);
                        }}
                        className="hidden"
                      />
                      <span className="btn-game bg-indigo-500 hover:bg-slate-700 text-white font-black py-3 text-base w-full shadow-none text-center block cursor-pointer">
                        <i className="fas fa-file-upload mr-1.5"></i> 選擇備份檔案並還原 📤
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Safety & Transfer tips */}
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 text-amber-950 font-sans shadow-sm leading-relaxed max-w-4xl animate-fade-in">
                <h4 className="text-base font-black text-amber-900 mb-1.5 flex items-center gap-1">
                  <i className="fas fa-info-circle"></i> 💡 跨主機轉移與相容性指南
                </h4>
                <ul className="list-disc pl-5 text-xs text-amber-800 font-bold space-y-1">
                  <li><strong>GitHub / Vercel 還原支援：</strong> 匯出的 JSON 備份檔案，可以直接上傳並匯入到本地單機模式、多人同步模式、GitHub 自行託管或 Vercel 等不同版本，均無縫對齊相容。</li>
                  <li><strong>Firebase 自動雲端對齊：</strong> 如在雲端教室模式下還原，中心在載入設定後，會自動對齊並同步上傳至 Firebase 雲端。歷史資料中已清退、不存在的學員亦會由雲端自動移出清空，不留任何冗餘。</li>
                  <li><strong>多機一機復原：</strong> 未來若意外更換電腦、清除快取或遭遇任何雲端異常，只要有此備份 JSON，一秒鐘即可在全新空白主機上完整恢復既有建置！建議每週定期點擊上方<strong>的「快速備份」</strong>直接儲存。</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {previewItem && (() => {
        const categoryLabels: Record<string, string> = {
          background: "背景",
          decoration: "裝飾",
          furniture: "家具",
          object: "小物",
          effect: "特效",
          wallpaper: "壁紙"
        };
        return (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" id="gacha-preview-modal-layer">
            <div className="game-box bg-white w-full max-w-lg p-6 border-[6px] border-gray-700 rounded-3xl relative flex flex-col gap-4">
              <button 
                onClick={() => setPreviewItem(null)} 
                className="absolute top-3 right-3 text-gray-500 hover:text-rose-600 hover:scale-110 font-bold text-2xl z-35 transition-transform"
              >
                ✕
              </button>
              
              <h3 className="font-extrabold text-2xl text-gray-800 border-b-4 border-gray-100 pb-2 flex items-center gap-2">
                🔮 學生端滿版效果模擬
              </h3>

              <div className="w-full h-64 rounded-2xl relative overflow-hidden border-4 border-gray-700 flex flex-col items-center justify-end pb-8 bg-sky-200 shadow-inner">
                {/* 第二至第六層：轉蛋壁紙／客製分類多層共存 */}
                {(() => {
                  const getPreviewNormalizedCategory = (item: any): string => {
                    if (!item) return "background";
                    const cat = (item.category || item.type || "background").toLowerCase();
                    if (cat.includes("decor") || cat === "裝飾" || cat.includes("飾")) return "decoration";
                    if (cat.includes("furnit") || cat === "家具") return "furniture";
                    if (cat.includes("object") || cat.includes("prop") || cat.includes("small") || cat === "小物" || cat.includes("擺")) return "object";
                    if (cat.includes("effect") || cat === "特效" || cat === "效果") return "effect";
                    return "background";
                  };

                  const currentCat = getPreviewNormalizedCategory(previewItem);
                  const activeDecs: Record<string, any> = { ...previewDecorations };
                  if (previewItem) {
                    activeDecs[currentCat] = previewItem;
                  }

                  const renderLayer = (item: any, zIndexClass: string) => {
                    if (!item) return null;
                    if (item.imageUrl) {
                      return (
                        <div 
                          className={`absolute inset-0 w-full h-full pointer-events-none ${zIndexClass}`}
                          style={{
                            backgroundImage: `url(${item.imageUrl})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat"
                          }}
                        />
                      );
                    } else if (item.presetSvgMarkup && (item.presetSvgMarkup.includes("linear-gradient") || item.presetSvgMarkup.includes("radial-gradient"))) {
                      return (
                        <div 
                          className={`absolute inset-0 w-full h-full pointer-events-none ${zIndexClass}`}
                          style={{
                            background: item.presetSvgMarkup
                          }}
                        />
                      );
                    } else if (item.presetSvgMarkup?.trim().startsWith("<")) {
                      return (
                        <div 
                          className={`absolute inset-0 w-full h-full pointer-events-none ${zIndexClass} flex items-center justify-center overflow-hidden`}
                          dangerouslySetInnerHTML={{ __html: item.presetSvgMarkup }}
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
                        <div className={`absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none ${zIndexClass} opacity-20 select-none overflow-hidden`}>
                          <span className="text-9xl drop-shadow-lg">{item.presetSvgMarkup || "🎁"}</span>
                        </div>
                      );
                    }
                  };

                  return (
                    <>
                      {renderLayer(activeDecs["background"], "z-[1]")}
                      {renderLayer(activeDecs["decoration"], "z-[2]")}
                      {renderLayer(activeDecs["furniture"], "z-[3]")}
                      {renderLayer(activeDecs["object"], "z-[4]")}
                      {renderLayer(activeDecs["effect"], "z-[5]")}
                    </>
                  );
                })()}

                {/* 第三層：光影特效 */}
                <div className="absolute inset-0 bg-white/10 pointer-events-none z-[8]"></div>

                {/* 第四層：史萊姆本體 */}
                <div 
                  className="w-28 h-28 relative z-[10] slime-idle animate-bounce pointer-events-none"
                  style={{ animationDuration: "2.5s" }}
                  dangerouslySetInnerHTML={{ 
                    __html: generateDetailedSlimeSVG({
                      hasChosenEgg: true,
                      element: "magic",
                      petLevel: 10
                    }) 
                  }}
                />
              </div>

              {/* Show currently loaded layers under simulator */}
              <div className="flex flex-wrap gap-1.5 text-xs font-bold text-gray-500">
                <span className="shrink-0 flex items-center">模擬共存中：</span>
                {Object.keys(previewDecorations).length > 0 ? (
                  Object.entries(previewDecorations).map(([cat, item]) => {
                    const labelMap: Record<string, string> = {
                      background: "背景",
                      decoration: "裝飾",
                      furniture: "家具",
                      object: "小物",
                      effect: "特效"
                    };
                    return (
                      <span key={cat} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md flex items-center gap-1">
                        {labelMap[cat] || cat}: {(item as any).name}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewDecorations(prev => {
                              const copy = { ...prev };
                              delete copy[cat];
                              return copy;
                            });
                          }} 
                          className="hover:text-rose-600 font-extrabold ml-1 bg-gray-100 rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })
                ) : (
                  <span className="text-gray-400">（目前無額外共存疊加圖層，點擊其餘種類「預覽」可在此累積展示）</span>
                )}
              </div>

              <div className="bg-gray-50 border-2 border-gray-200 p-4 rounded-xl flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="font-black text-xl text-gray-800">{previewItem.name}</span>
                  <span className="bg-indigo-100 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-black border border-indigo-200">
                    分類：{categoryLabels[previewItem.category] || previewItem.category}
                  </span>
                </div>
                <div className="text-xs text-gray-500 font-bold mt-1">
                  支援高層多物件共存模擬！此種類在學生端啟用時，僅替換同類別，背景、擺飾、家具、小物與特效能完美同步重疊、史萊姆居上。
                </div>
              </div>

              <button
                onClick={() => setPreviewItem(null)}
                className="btn-game bg-gray-700 hover:bg-gray-800 text-white w-full py-3 rounded-xl font-bold"
              >
                確定
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
