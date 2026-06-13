/**
 * Firebase 初始化與同步服務模組
 * 集中管理 Firebase 的 config、初始化、驗證，並在 Firebase 未啟用時自動且無縫降級為本地 localStorage 備份模式。
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc, 
  collection, 
  onSnapshot, 
  query, 
  where,
  FieldValue,
  serverTimestamp,
  deleteDoc
} from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

// ==========================================
// 【一、Firebase 基礎設定區】
// ==========================================
// 💡 教師/管理員請在此處填入您在 Firebase Console 取得的金鑰與資訊
export const firebaseConfig = {
  apiKey: "AIzaSyAUS250ZT2hmeQFnBuGus7MKkIPOoTd-4w",
  authDomain: "gen-lang-client-0266174140.firebaseapp.com",
  projectId: "gen-lang-client-0266174140",
  storageBucket: "gen-lang-client-0266174140.firebasestorage.app",
  messagingSenderId: "326246209166",
  appId: "1:326246209166:web:cf55e59dabd67728325bdf",
  measurementId: "G-J2LPDEEPZS"
};

// 檢查 Firebase 設定是否已被替換
export const isFirebaseConfigured = () => {
  return (
    firebaseConfig.apiKey && 
    firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY_HERE" &&
    firebaseConfig.projectId && 
    firebaseConfig.projectId !== "YOUR_PROJECT_ID_HERE"
  );
};

let app: any = null;
let db: any = null;
let auth: any = null;
let isFirebaseReady = false;

// 嘗試載入本地 applet-config (若 AI Studio 平台有提供自動配置)
let platformConfig: any = null;
try {
  // 嘗試動態或間接讀取 platform 設定
} catch (e) {
  // 忽略
}

// ==========================================
// 【二、安全初始化機制 (Graceful Fallback)】
// ==========================================
if (isFirebaseConfigured()) {
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    db = getFirestore(app);
    auth = getAuth(app);
    isFirebaseReady = true;
    console.log("⚡ Firebase 初始化成功，正在進行匿名登入驗證...");
    
    // 進行匿名登入以取得安全性規則授權
    signInAnonymously(auth)
      .then((userCredential) => {
        console.log("🔑 Firebase 匿名登入成功:", userCredential.user.uid);
      })
      .catch((err) => {
        console.warn("🔐 Firebase Authentication 匿名登入失敗 (可能未啟用匿名登入):", err);
      });
  } catch (error) {
    console.error("❌ Firebase 初始化失敗，將繼續使用 LocalStorage 本地端儲存:", error);
    isFirebaseReady = false;
  }
} else {
  console.log("ℹ️ 目前仍在本地開發或尚未設定 Firebase 金鑰，已自動啟用本地端備份存檔模式。");
}

export { app, db, auth, isFirebaseReady };

// ==========================================
// 【二點五、高頻寫入防抖緩衝服務】
// ==========================================
const debounceMap = new Map<string, NodeJS.Timeout>();

const runDebounced = (key: string, delay: number, action: () => void) => {
  const existing = debounceMap.get(key);
  if (existing) {
    clearTimeout(existing);
  }
  const timeout = setTimeout(() => {
    debounceMap.delete(key);
    action();
  }, delay);
  debounceMap.set(key, timeout);
};

// ==========================================
// 【三、產生班級隨機代碼】
// ==========================================
// 建立隨機的 6 碼大寫英文與數字代碼
export const generateClassCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 排除容易混淆的字元 (I, O, 0, 1)
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// ==========================================
// 【四、同步基本數據函式】
// ==========================================

/**
 * 教師建立班級
 * @param className 班級名稱
 * @returns 班級代碼 (classCode)
 */
export const createClass = async (className: string): Promise<string> => {
  if (!isFirebaseReady || !db) {
    throw new Error("Firebase 尚未配置完成，目前無法建立線上班級！");
  }

  // 嘗試尋找未重複的代碼
  let classCode = generateClassCode();
  let codeUnique = false;
  let attempts = 0;

  while (!codeUnique && attempts < 5) {
    const classDocRef = doc(db, "classes", classCode);
    const snap = await getDoc(classDocRef);
    if (!snap.exists()) {
      codeUnique = true;
    } else {
      classCode = generateClassCode();
      attempts++;
    }
  }

  const classDocRef = doc(db, "classes", classCode);
  const teacherId = auth?.currentUser?.uid || "anonymous_teacher";
  
  await setDoc(classDocRef, {
    className: className.trim(),
    createdAt: new Date().toISOString(),
    teacherId: teacherId,
    teacherPasscode: "0301" // 預設密碼
  });

  return classCode;
};

/**
 * 載入雲端教室資料 (確認教室是否存在)
 */
export const loadClassroomByCode = async (classCode: string): Promise<any | null> => {
  if (!isFirebaseReady || !db || !classCode) return null;
  try {
    const classDocRef = doc(db, "classes", classCode.trim().toUpperCase());
    const snap = await getDoc(classDocRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (error) {
    console.error("💾 載入雲端教室失敗:", error);
  }
  return null;
};

/**
 * 載入雲端教室資料 (依據代碼，與 loadClassroomByCode 行為一致，配合命名規範)
 */
export const loadCloudClassroomByCode = async (classCode: string): Promise<any | null> => {
  return await loadClassroomByCode(classCode);
};

/**
 * 驗證教師密碼
 */
export const verifyTeacherPasscode = async (classCode: string, teacherPasscode: string): Promise<boolean> => {
  if (!isFirebaseReady || !db || !classCode) return false;
  try {
    const classDocRef = doc(db, "classes", classCode.toUpperCase());
    const snap = await getDoc(classDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const cloudPasscode = data.teacherPasscode || data.password || "0301";
      if (cloudPasscode === teacherPasscode) {
        return true;
      }

      // 備用方案：也檢查其 settings 首頁備份
      const settingsDocRef = doc(db, "classes", classCode.toUpperCase(), "settings", "main");
      const settingsSnap = await getDoc(settingsDocRef);
      if (settingsSnap.exists()) {
        const settingsData = settingsSnap.data();
        const settingsPasscode = settingsData.password || settingsData.teacherPasscode;
        if (settingsPasscode === teacherPasscode) {
          return true;
        }
      }
    }
  } catch (err) {
    console.error("驗證教師密碼失敗:", err);
  }
  return false;
};

/**
 * 儲存/更新教師的 passcode
 */
export const saveTeacherPasscode = async (classCode: string, passcode: string): Promise<void> => {
  if (!isFirebaseReady || !db || !classCode) return;
  try {
    const classDocRef = doc(db, "classes", classCode.toUpperCase());
    await setDoc(classDocRef, { teacherPasscode: passcode }, { merge: true });
  } catch (error) {
    console.error("💾 雲端儲存教師密碼失敗:", error);
  }
};

/**
 * 完全還原教室在雲端的所有靜態與動態資料 (包含：學生、轉蛋、成就、教師設定、任務等)
 */
export const restoreCloudClassroomData = async (classCode: string): Promise<any> => {
  if (!isFirebaseReady || !db || !classCode) return null;
  const code = classCode.toUpperCase();
  try {
    // A. 載入班級主要 metadata 與 teacherPasscode 
    const classDocRef = doc(db, "classes", code);
    const classSnap = await getDoc(classDocRef);
    const classMeta = classSnap.exists() ? classSnap.data() : {};

    // B. 載入 settings/main 子樹
    const settingsDocRef = doc(db, "classes", code, "settings", "main");
    const settingsSnap = await getDoc(settingsDocRef);
    const settingsData = settingsSnap.exists() ? settingsSnap.data() : {};

    // C. 載入全體學生 list
    const studentsCollRef = collection(db, "classes", code, "students");
    const studentsSnap = await getDocs(studentsCollRef);
    const students: any[] = [];
    studentsSnap.forEach((doc) => {
      students.push(doc.data());
    });

    // D. 載入全體自定義/重設成就
    const achievementsCollRef = collection(db, "classes", code, "achievements");
    const achievementsSnap = await getDocs(achievementsCollRef);
    const achievements: any[] = [];
    achievementsSnap.forEach((doc) => {
      achievements.push(doc.data());
    });

    // E. 載入全體轉蛋背景/裝扮商品 (優先載入 Firestore 中的所有未刪除素材)
    const backgroundGachaItems = await loadGachaItems(code);

    return {
      className: classMeta.className || settingsData.className || "還原的雲端教室",
      password: classMeta.teacherPasscode || settingsData.password || "0301",
      mainTitle: settingsData.mainTitle || "",
      taskTemplates: settingsData.taskTemplates || [],
      customFoods: settingsData.customFoods || [],
      timerSettings: settingsData.timerSettings || null,
      groups: settingsData.groups || [],
      notes: settingsData.notes || "",
      activeGroupTasks: settingsData.activeGroupTasks || [],
      timedTasks: settingsData.timedTasks || [],
      students,
      achievements,
      backgroundGachaItems
    };
  } catch (err) {
    console.error("💾 還原雲端教室所有資料失敗:", err);
    throw err;
  }
};

/**
 * 進入既有雲端教室完整入口函式
 */
export const joinExistingCloudClassroom = async (classCode: string, teacherPasscode: string): Promise<any | null> => {
  const isValid = await verifyTeacherPasscode(classCode, teacherPasscode);
  if (!isValid) {
    throw new Error("教師管理代碼驗證失敗，請再確認輸入是否正確！");
  }
  return await restoreCloudClassroomData(classCode);
};

/**
 * 學生端嘗試加入班級
 * @param classCode 🚀 6 碼班級代碼
 * @param studentName 學生姓名
 * @returns 加入結果
 */
export const joinClass = async (classCode: string, studentName: string): Promise<{
  success: boolean;
  message: string;
  studentId?: string;
  className?: string;
  existingData?: any;
}> => {
  if (!isFirebaseReady || !db) {
    return { success: false, message: "Firebase 尚未配置，請先使用本地模式。" };
  }

  const cleanCode = classCode.trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, message: "請輸入有效的 6 碼班級代碼！" };
  }

  // 1. 確認班級是否存在
  const classDocRef = doc(db, "classes", cleanCode);
  const classSnap = await getDoc(classDocRef);
  if (!classSnap.exists()) {
    return { success: false, message: "找不到此代碼對應的班級，請重新確認！" };
  }

  const className = classSnap.data().className;

  // 2. 搜尋是否已有相同姓名的學生在該班級
  const studentsCollRef = collection(db, "classes", cleanCode, "students");
  const q = query(studentsCollRef, where("name", "==", studentName.trim()));
  const qSnap = await getDocs(q);

  if (!qSnap.empty) {
    // 學生姓名重合，提示重新載入既有身分或更名
    const existingDoc = qSnap.docs[0];
    return {
      success: true,
      message: "偵測到班級內已存在相同姓名的寶貝，已為您自動載入對應角色！",
      studentId: existingDoc.id,
      className,
      existingData: existingDoc.data()
    };
  }

  // 3. 命名未重複，建立新學生紀錄
  const studentId = "student_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4);
  const newStudentDocRef = doc(db, "classes", cleanCode, "students", studentId);

  const initialStudentData = {
    id: studentId,
    name: studentName.trim(),
    joinedAt: new Date().toISOString(),
    points: 0,
    coins: 0,
    hasChosenEgg: false,
    element: "",
    petName: `${studentName.trim()}的史萊姆`,
    title: "等待發光中",
    onlineStatus: "online"
  };

  await setDoc(newStudentDocRef, initialStudentData);

  return {
    success: true,
    message: "成功召喚並加入班級！",
    studentId,
    className
  };
};

/**
 * 儲存/更新特定學生的雲端資料
 */
export const saveStudentData = async (classCode: string, studentId: string, studentData: any): Promise<void> => {
  if (!isFirebaseReady || !db || !classCode) return;
  const key = `student_${classCode.toUpperCase()}_${studentId}`;
  
  return new Promise<void>((resolve, reject) => {
    runDebounced(key, 800, async () => {
      try {
        const studentDocRef = doc(db, "classes", classCode.toUpperCase(), "students", studentId);
        // 去除函數或不相容之自訂 properties
        const serializedData = JSON.parse(JSON.stringify(studentData));
        await setDoc(studentDocRef, serializedData, { merge: true });
        resolve();
      } catch (error) {
        console.error("💾 雲端儲存學生失敗記錄:", error);
        reject(error);
      }
    });
  });
};

/**
 * 徹底移除特定學生的雲端資料
 */
export const deleteStudentData = async (classCode: string, studentId: string): Promise<void> => {
  if (!isFirebaseReady || !db || !classCode) return;
  try {
    const studentDocRef = doc(db, "classes", classCode.toUpperCase(), "students", studentId);
    await deleteDoc(studentDocRef);
  } catch (error) {
    console.error("💾 雲端刪除學生資料失敗:", error);
    throw error;
  }
};

/**
 * 讀取特定學生雲端資料
 */
export const loadStudentData = async (classCode: string, studentId: string): Promise<any | null> => {
  if (!isFirebaseReady || !db || !classCode) return null;
  try {
    const studentDocRef = doc(db, "classes", classCode.toUpperCase(), "students", studentId);
    const snap = await getDoc(studentDocRef);
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error("載入學生雲端資料失敗:", e);
    return null;
  }
};

/**
 * 即時偵聽特定學生的數據變動
 */
export const listenStudentData = (
  classCode: string, 
  studentId: string, 
  onUpdate: (data: any) => void
): (() => void) => {
  if (!isFirebaseReady || !db || !classCode || !studentId) {
    return () => {};
  }
  
  const studentDocRef = doc(db, "classes", classCode.toUpperCase(), "students", studentId);
  return onSnapshot(studentDocRef, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data());
    }
  }, (err) => {
    console.error("偵聽特定學生的數據變動失敗:", err);
  });
};

/**
 * 即時偵聽班級全體學生的數據變動 (供教師面板或全局首頁更新)
 */
export const listenAllStudents = (
  classCode: string,
  onUpdate: (students: any[]) => void
): (() => void) => {
  if (!isFirebaseReady || !db || !classCode) {
    return () => {};
  }

  const studentsCollRef = collection(db, "classes", classCode.toUpperCase(), "students");
  return onSnapshot(studentsCollRef, (snap) => {
    const list: any[] = [];
    snap.forEach((doc) => {
      list.push(doc.data());
    });
    onUpdate(list);
  }, (err) => {
    console.error("偵聽班級全體學生變動失敗:", err);
  });
};

/**
 * 儲存/更新班級的設定資料 (如：是否在主介面顯示學生同步畫面)
 */
export const saveClassSettings = async (classCode: string, settings: any): Promise<void> => {
  if (!isFirebaseReady || !db || !classCode) return;
  const key = `settings_${classCode.toUpperCase()}`;
  
  return new Promise<void>((resolve, reject) => {
    runDebounced(key, 1000, async () => {
      try {
        const settingsDocRef = doc(db, "classes", classCode.toUpperCase(), "settings", "main");
        await setDoc(settingsDocRef, settings, { merge: true });
        resolve();
      } catch (error) {
        console.error("💾 雲端儲存班級設定失敗:", error);
        reject(error);
      }
    });
  });
};

/**
 * 儲存或更新單件轉蛋裝飾商品到雲端
 */
export const saveGachaItem = async (classCode: string, item: any): Promise<void> => {
  if (!isFirebaseReady || !db || !classCode || !item?.id) return;
  const key = `gacha_${classCode.toUpperCase()}_${item.id}`;
  
  return new Promise<void>((resolve, reject) => {
    runDebounced(key, 800, async () => {
      try {
        const itemDocRef = doc(db, "classes", classCode.toUpperCase(), "gachaItems", item.id);
        await setDoc(itemDocRef, item, { merge: true });
        resolve();
      } catch (error) {
        console.error("💾 雲端儲存轉蛋商品失敗:", error);
        reject(error);
      }
    });
  });
};

/**
 * 儲存或更新個別成就到雲端
 */
export const saveAchievementToCloud = async (classCode: string, ach: any): Promise<void> => {
  if (!isFirebaseReady || !db || !classCode || !ach?.achievementId) return;
  const key = `achievement_${classCode.toUpperCase()}_${ach.achievementId}`;
  
  return new Promise<void>((resolve, reject) => {
    runDebounced(key, 800, async () => {
      try {
        const achDocRef = doc(db, "classes", classCode.toUpperCase(), "achievements", ach.achievementId);
        await setDoc(achDocRef, ach, { merge: true });
        resolve();
      } catch (error) {
        console.error("💾 雲端儲存成就失敗:", error);
        reject(error);
      }
    });
  });
};

/**
 * 從雲端刪除個別成就
 */
export const deleteAchievementFromCloud = async (classCode: string, achievementId: string): Promise<void> => {
  if (!isFirebaseReady || !db || !classCode || !achievementId) return;
  try {
    const achDocRef = doc(db, "classes", classCode.toUpperCase(), "achievements", achievementId);
    await deleteDoc(achDocRef);
  } catch (error) {
    console.error("💾 雲端刪除成就失敗:", error);
  }
};

/**
 * 即時偵聽雲端成就清單變動
 */
export const listenAchievements = (
  classCode: string,
  onUpdate: (achievements: any[]) => void
): (() => void) => {
  if (!isFirebaseReady || !db || !classCode) {
    return () => {};
  }
  const achsCollRef = collection(db, "classes", classCode.toUpperCase(), "achievements");
  return onSnapshot(achsCollRef, (snap) => {
    const list: any[] = [];
    snap.forEach((doc) => {
      list.push(doc.data());
    });
    onUpdate(list);
  }, (err) => {
    console.error("偵聽成就清單失敗:", err);
  });
};

/**
 * 從雲端刪除單件轉蛋商品
 */
export const deleteGachaItemFromCloud = async (classCode: string, itemId: string): Promise<void> => {
  if (!isFirebaseReady || !db || !classCode || !itemId) return;
  try {
    const itemDocRef = doc(db, "classes", classCode.toUpperCase(), "gachaItems", itemId);
    await deleteDoc(itemDocRef);
  } catch (error) {
    console.error("💾 雲端刪除轉蛋商品失敗:", error);
  }
};

/**
 * 載入雲端轉蛋商品清單 (優先載入 Firestore 中的所有未刪除素材)
 */
export const loadGachaItems = async (classCode: string): Promise<any[]> => {
  if (!isFirebaseReady || !db || !classCode) return [];
  const code = classCode.toUpperCase();
  try {
    const itemsCollRef = collection(db, "classes", code, "gachaItems");
    const snap = await getDocs(itemsCollRef);
    const list: any[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      // 確保未被標記為已刪除
      if (data && data.isDeleted !== true && data.deleted !== true) {
        list.push(data);
      }
    });
    return list;
  } catch (error) {
    console.error("💾 載入雲端轉蛋商品清單失敗:", error);
    return [];
  }
};

/**
 * 即時偵聽雲端轉蛋商品清單變動
 */
export const listenGachaItems = (
  classCode: string,
  onUpdate: (items: any[]) => void
): (() => void) => {
  if (!isFirebaseReady || !db || !classCode) {
    return () => {};
  }
  const itemsCollRef = collection(db, "classes", classCode.toUpperCase(), "gachaItems");
  return onSnapshot(itemsCollRef, (snap) => {
    const list: any[] = [];
    snap.forEach((doc) => {
      list.push(doc.data());
    });
    onUpdate(list);
  }, (err) => {
    console.error("偵聽轉蛋商品清單失敗:", err);
  });
};

/**
 * 即時偵聽班級設定變動
 */
export const listenClassSettings = (
  classCode: string,
  onUpdate: (settings: any) => void
): (() => void) => {
  if (!isFirebaseReady || !db || !classCode) {
    return () => {};
  }
  const settingsDocRef = doc(db, "classes", classCode.toUpperCase(), "settings", "main");
  return onSnapshot(settingsDocRef, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data());
    }
  }, (err) => {
    console.error("偵聽班級設定變動失敗:", err);
  });
};

/**
 * 測試 Firebase 連線，並返回成功與否及詳細診斷文字
 */
export const testFirebaseConnection = async (): Promise<{ success: boolean; message: string }> => {
  if (!isFirebaseReady || !db) {
    return { success: false, message: "Firebase 未配置或初始化失敗，請檢查 firebase.ts" };
  }
  try {
    const { getDocFromServer } = await import("firebase/firestore");
    const testDoc = doc(db, "test", "connection");
    await getDocFromServer(testDoc);
    return { success: true, message: "連線成功！Firebase 雲端資料庫運作正常。" };
  } catch (error: any) {
    console.error("Firebase connection test failed:", error);
    if (error && error.message && error.message.includes("client is offline")) {
      return { success: false, message: "連線失敗：客戶端處於離線狀態，請檢查網路連線。" };
    }
    if (error && error.code && error.code === "permission-denied") {
      return { success: true, message: "連線成功！(Firebase 規則已拒絕非法存取，連線暢通)" };
    }
    return { success: false, message: `連線失敗：${error.message || error}` };
  }
};

/**
 * 儲存個別小組資訊到特定雲端路徑 (classes/{classCode}/groups/{groupId})
 */
export const saveGroupToCloud = async (classCode: string, group: { id: string; name: string; members: string[]; createdAt?: string; updatedAt?: string }): Promise<void> => {
  if (!isFirebaseConfigured() || !db || !classCode) return;
  const key = `group_${classCode.toUpperCase()}_${group.id}`;
  
  return new Promise<void>((resolve, reject) => {
    runDebounced(key, 800, async () => {
      try {
        const groupDocRef = doc(db, "classes", classCode.toUpperCase(), "groups", group.id);
        const serialized = {
          groupId: group.id,
          groupName: group.name,
          students: group.members,
          createdAt: group.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(groupDocRef, serialized, { merge: true });
        console.log(`💾 雲端儲存小組 ${group.name} 成功！`);
        resolve();
      } catch (error) {
        console.error("💾 雲端儲存小組失敗:", error);
        reject(error);
      }
    });
  });
};

/**
 * 從雲端路徑刪除個別小組 (classes/{classCode}/groups/{groupId})
 */
export const deleteGroupFromCloud = async (classCode: string, groupId: string): Promise<void> => {
  if (!isFirebaseConfigured() || !db || !classCode) return;
  try {
    const groupDocRef = doc(db, "classes", classCode.toUpperCase(), "groups", groupId);
    await deleteDoc(groupDocRef);
    console.log(`🗑 雲端刪除小組 ${groupId} 成功！`);
  } catch (error) {
    console.error("💾 雲端刪除小組失敗:", error);
  }
};

/**
 * 儲存雲端備份到 classes/{classCode}/backups Collection
 */
export const saveCloudBackup = async (classCode: string, backupData: any): Promise<void> => {
  if (!isFirebaseReady || !db || !classCode) return;
  try {
    const backupId = `backup_${Date.now()}`;
    const backupDocRef = doc(db, "classes", classCode.toUpperCase(), "backups", backupId);
    
    await setDoc(backupDocRef, {
      id: backupId,
      timestamp: new Date().toLocaleString("zh-TW"),
      timestampMs: Date.now(),
      data: backupData
    });
    console.log(`💾 雲端備份已儲存: ${backupId}`);
  } catch (error) {
    console.error("💾 雲端備份儲存失敗:", error);
  }
};

/**
 * 獲取所有雲端備份列表 classes/{classCode}/backups
 */
export const getCloudBackups = async (classCode: string): Promise<any[]> => {
  if (!isFirebaseReady || !db || !classCode) return [];
  try {
    const backupsCollRef = collection(db, "classes", classCode.toUpperCase(), "backups");
    const querySnapshot = await getDocs(backupsCollRef);
    const backups: any[] = [];
    querySnapshot.forEach((doc) => {
      backups.push(doc.data());
    });
    return backups.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
  } catch (error) {
    console.error("💾 獲取雲端備份失敗:", error);
    return [];
  }
};



