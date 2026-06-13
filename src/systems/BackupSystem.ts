import { AppData, Student } from "../types";
import { saveStudentData, deleteStudentData, saveClassSettings } from "../firebase";

export function getFormattedDateTime(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${year}${month}${date}_${hours}${mins}`;
}

/**
 * 📥 匯出完整備份 JSON 檔案並觸發瀏覽器下載
 */
export function exportBackupData(appData: AppData) {
  const backupObj = {
    backupMetadata: {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      appId: "5fa8f25b-3468-49e2-91f7-4cc77c12612a",
      timestamp: Date.now()
    },
    ...appData
  };

  const jsonStr = JSON.stringify(backupObj, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `backup_${getFormattedDateTime()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 🔒 在還原前自動建立安全備份並自動下載，同時在 localStorage 保留一個副本
 */
export function autoBackupBeforeRestore(appData: AppData) {
  const backupObj = {
    backupMetadata: {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      appId: "5fa8f25b-3468-49e2-91f7-4cc77c12612a",
      timestamp: Date.now(),
      type: "auto-backup-before-restore"
    },
    ...appData
  };

  const jsonStr = JSON.stringify(backupObj, null, 2);
  
  // 1. 保留於 localStorage 以防萬一
  try {
    localStorage.setItem("AutoBackup_beforeRestore", jsonStr);
    localStorage.setItem("AutoBackup_beforeRestore_timestamp", String(Date.now()));
  } catch (e) {
    console.warn("Could not save autoBackup in LocalStorage due to space constraint", e);
  }

  // 2. 自動觸發備份檔案下載
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `AutoBackup_beforeRestore.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 🔍 驗證備份檔案是否具備相容且完整的資料格式
 */
export function validateBackupData(data: any): boolean {
  if (!data || typeof data !== "object") return false;
  
  // 檢查關鍵欄位：必須有 students 陣列，以及班級名稱
  if (!Array.isArray(data.students)) return false;
  if (typeof data.mainTitle !== "string") return false;
  
  return true;
}

/**
 * 🔄 安全地將備份資料同步至 Firebase (在雲端模式下)
 */
export async function syncRestoredDataToCloud(
  classCode: string,
  restoredData: AppData,
  currentStudents: Student[]
): Promise<void> {
  if (!classCode) return;

  const restoredStudents = restoredData.students || [];
  
  // 1. 清理舊學生：找出目前在雲端，但還原檔案中沒有的學生，將其在雲端徹底刪除
  const restoredIds = new Set(restoredStudents.map(s => s.id));
  const studentsToDelete = currentStudents.filter(s => !restoredIds.has(s.id));
  
  for (const s of studentsToDelete) {
    try {
      await deleteStudentData(classCode, s.id);
      console.log(`🧹 雲端已清理不存在於備份中的學生: ${s.name} (${s.id})`);
    } catch (err) {
      console.error(`🧹 刪除雲端學生失敗: ${s.name}`, err);
    }
  }

  // 2. 写入/更新备份包中的每个学生
  for (const s of restoredStudents) {
    await saveStudentData(classCode, s.id, s);
  }

  // 3. 写入/更新班级设置
  const settings = {
    mainTitle: restoredData.mainTitle || "",
    password: restoredData.password || "0301",
    notes: restoredData.notes || "",
    timerSettings: restoredData.timerSettings || { minutes: 5, seconds: 0 },
    taskTemplates: restoredData.taskTemplates || [],
    customFoods: restoredData.customFoods || [],
    activeGroupTasks: restoredData.activeGroupTasks || [],
    timedTasks: (restoredData.timedTasks || []).map((t) => ({ ...t, remainingSeconds: 0 })),
    achievements: restoredData.achievements || [],
    groups: restoredData.groups || [],
    backgroundGachaItems: restoredData.backgroundGachaItems || [],
    pointLogs: restoredData.pointLogs || [],
    teacherActionLogs: restoredData.teacherActionLogs || [],
    lotterySpeed: restoredData.lotterySpeed || "instant",
    gachaHistoryList: restoredData.gachaHistoryList || [],
    classConstructionData: restoredData.classConstructionData || null,
    classEventData: restoredData.classEventData || null,
    classCollectionData: restoredData.classCollectionData || null,
  };

  await saveClassSettings(classCode, settings);
  console.log("☁️ 雲端還原所有設定完畢！");
}
