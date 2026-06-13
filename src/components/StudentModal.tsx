/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { AppData, Student, TimedTask } from "../types";
import { 
  BASE_FOOD, 
  learningDB, 
  courseEffectMap,
  backgroundDB, 
  elementNames, 
  rarityLabels, 
  rarityColors,
  personalityLabelPatch,
  generateDetailedSlimeSVG,
  getPersonalityTitle,
  computeStudentTitle,
  defaultBackgroundGachaItems,
  getRarityInfo,
  defaultAchievements,
  calculateStudentMBTI,
  MBTI_PETS,
  getFoodCategory,
  getPetDialogue,
  awardPoints,
  appendPointLog
} from "../utils";
import {
  getAdvancedPetDialogue,
  isTodayBirthday,
  getZodiac,
  getZodiacDateRange,
  generateDailySlimeWish,
  doubleIfBirthday
} from "../utils/petDialogue";

interface StudentModalProps {
  studentId: string;
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  onClose: () => void;
  showDialog: (params: { title: string; message: string; type: "alert" | "confirm"; onConfirm?: () => void; titleColor?: string }) => void;
  showSuccess: (event: React.MouseEvent | null, pts: number, saved?: boolean) => void;
  gainPetExp: (student: Student, amount: number, attr?: string, bonus?: any) => void;
  autoSave?: (customState?: AppData) => void;
}

export default function StudentModal({
  studentId,
  appData,
  setAppData,
  onClose,
  showDialog,
  showSuccess,
  gainPetExp,
  autoSave,
}: StudentModalProps) {
  console.log("StudentModal Render");
  const currentStudent = appData.students.find((s) => s.id === studentId);
  const [activeShopTab, setActiveShopTab] = useState<"shop-food" | "shop-pack" | "shop-bg" | "shop-gacha" | "shop-collection" | "shop-achievement" | "shop-games" | "tasks">(() => {
    const savedId = localStorage.getItem("current_student_modal_id");
    const savedShopTab = localStorage.getItem("current_student_active_shop_tab") as any;
    const allowed = ["shop-food", "shop-pack", "shop-bg", "shop-gacha", "shop-collection", "shop-achievement", "shop-games", "tasks"];
    if (savedId === studentId && allowed.includes(savedShopTab)) {
      return savedShopTab;
    }
    return "tasks";
  });

  // Synchronize currentScreen and state trackers to localStorage
  useEffect(() => {
    localStorage.setItem("current_student_modal_id", studentId);
    localStorage.setItem("current_student_active_shop_tab", activeShopTab);

    let screenName = "task";
    if (activeShopTab === "shop-gacha") {
      screenName = "gacha";
    } else if (activeShopTab === "shop-achievement") {
      screenName = "achievements";
    } else if (activeShopTab === "tasks") {
      screenName = "task";
    } else {
      screenName = "student";
    }
    localStorage.setItem("currentScreen", screenName);
  }, [studentId, activeShopTab]);
  const [subBgTab, setSubBgTab] = useState<"wallpapers" | "decorations">("wallpapers");
  const [myCollectionTab, setMyCollectionTab] = useState<"bg" | "decor" | "title" | "slime">("bg");
  const [showMbtiDetail, setShowMbtiDetail] = useState(false);
  
  // States for Slime companion interactive mini-games
  const [activeGame, setActiveGame] = useState<"coin" | "rps" | "ttt" | null>(null);
  const [coinSelection, setCoinSelection] = useState<"heads" | "tails" | null>(null);
  const [coinSpinning, setCoinSpinning] = useState(false);
  const [coinResult, setCoinResult] = useState<"heads" | "tails" | null>(null);
  const [rpsPlayerMove, setRpsPlayerMove] = useState<"rock" | "paper" | "scissors" | null>(null);
  const [rpsSlimeMove, setRpsSlimeMove] = useState<"rock" | "paper" | "scissors" | null>(null);
  const [rpsResult, setRpsResult] = useState<"win" | "lose" | "draw" | null>(null);
  const [tttBoard, setTttBoard] = useState<Array<"O" | "X" | "">>(Array(9).fill(""));
  const [tttStatus, setTttStatus] = useState<"playing" | "win" | "lose" | "draw">("playing");
  const [gameFeedback, setGameFeedback] = useState("");
  const [isDrawingGacha, setIsDrawingGacha] = useState(false);
  
  // States/Functions for pet renaming
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [tempPetName, setTempPetName] = useState("");

  const openRenamePetModal = () => {
    if (!currentStudent) return;
    setTempPetName(currentStudent.petName || "我的史萊姆");
    setRenameModalOpen(true);
  };

  const confirmRenamePet = () => {
    if (!currentStudent) return;
    const trimmed = tempPetName.trim();
    if (!trimmed) {
      showDialog({ title: "修改失敗", message: "寵物名稱不可空白。", type: "alert" });
      return;
    }
    
    if (/[<>&"'/\\`;]/.test(trimmed)) {
      showDialog({ title: "修改失敗", message: "寵物名稱不可包含特殊符號 (<, >, &, \", ', /, \\, `, ;, 等)。", type: "alert" });
      return;
    }
    
    let chineseCharCount = 0;
    for (let i = 0; i < trimmed.length; i++) {
      if (/[\u4e00-\u9fa5]/.test(trimmed[i])) {
        chineseCharCount++;
      }
    }
    
    const hasChinese = chineseCharCount > 0;
    const totalLength = trimmed.length;
    
    if (totalLength < 1) { // Will check the 1~12 for English or 2~8 for Chinese
      showDialog({ title: "修改失敗", message: "寵物名稱長度過短！", type: "alert" });
      return;
    }
    if (hasChinese && (totalLength < 2 || totalLength > 8)) {
      showDialog({ title: "修改失敗", message: "中文名稱長度限定為 2～8 個中文字以內！", type: "alert" });
      return;
    }
    if (!hasChinese && (totalLength < 1 || totalLength > 12)) {
      showDialog({ title: "修改失敗", message: "英文名稱長度限定為 1～12 個英數字元以內！", type: "alert" });
      return;
    }

    const changeCount = Number(currentStudent.petNameChangedCount || 0);
    const cost = changeCount > 0 ? 50 : 0;

    if (cost > 0 && currentStudent.points < 50) {
      showDialog({ title: "無法修改", message: "點數不足，無法修改名稱。", type: "alert" });
      return;
    }

    updatePetName(trimmed, cost, changeCount);
  };

  const updatePetName = (newName: string, cost: number, changeCount: number) => {
    setAppData((prev) => {
      const student = prev.students.find(s => s.id === studentId);
      if (!student) return prev;
      const nextStudents = prev.students.map((st) =>
        st.id === studentId 
          ? { 
              ...st, 
              petName: newName,
              points: st.points - cost,
              petNameChangedCount: changeCount + 1,
              hasRenamedPet: true,
              renameCostPaid: cost > 0,
              petRenameHistory: [...(st.petRenameHistory || []), newName]
            } 
          : st
      );
      let nextState = { ...prev, students: nextStudents };
      if (cost > 0) {
        nextState = appendPointLog(nextState, studentId, -cost, "修改寵物名稱", "學生", student.points - cost);
      }
      return nextState;
    });

    if (cost > 0) {
      showSuccess(null, -cost);
    }
    triggerBubble("寵物名字變好聽了！✨");
    showDialog({ 
      title: "修改成功", 
      message: `寵物成功命名為「${newName}」！${cost > 0 ? " (已扣除 50 點)" : " (首次修改免費！)"}`, 
      type: "alert" 
    });
    setRenameModalOpen(false);
  };

  const titleRequirements = [
    { name: "全能小達人", desc: "4 項以上的任務專長大於等於 3 次", check: (s: any) => Object.values(s.taskTypeStats || {}).filter((v: any) => Number(v) >= 3).length >= 4 },
    { name: "超級任務王", desc: "累計完成 30 次任務", check: (s: any) => Number(s.completedTaskCount || 0) >= 30 },
    { name: "班級小英雄", desc: "累計完成 20 次任務", check: (s: any) => Number(s.completedTaskCount || 0) >= 20 },
    { name: "任務達人", desc: "累計完成 10 次任務", check: (s: any) => Number(s.completedTaskCount || 0) >= 10 },
    { name: "整潔小隊長", desc: "整潔專長達到 5 分以上", check: (s: any) => Number(s.taskTypeStats?.clean || 0) >= 5 },
    { name: "閱讀小書蟲", desc: "閱讀專長達到 5 分以上", check: (s: any) => Number(s.taskTypeStats?.reading || 0) >= 5 },
    { name: "發言小勇士", desc: "發言專長達到 5 分以上", check: (s: any) => Number(s.taskTypeStats?.speaking || 0) >= 5 },
    { name: "合作小夥伴", desc: "合作專長達到 5 分以上", check: (s: any) => Number(s.taskTypeStats?.cooperation || 0) >= 5 },
    { name: "禮貌小天使", desc: "禮貌專長達到 5 分以上", check: (s: any) => Number(s.taskTypeStats?.manners || 0) >= 5 },
    { name: "作業守護者", desc: "作業與責任專長達到 5 分以上", check: (s: any) => Number(s.taskTypeStats?.responsibility || 0) >= 5 },
    { name: "穩定小幫手", desc: "累計完成 5 次任務", check: (s: any) => Number(s.completedTaskCount || 0) >= 5 },
    { name: "任務新手", desc: "累計完成 1 次任務", check: (s: any) => Number(s.completedTaskCount || 0) >= 1 },
    { name: "等待發光中", desc: "初入校園，等待發光中", check: () => true },
  ];

  const handleEquipTitle = (titleName: string) => {
    setAppData((prev) => {
      const updatedStudents = prev.students.map((student) => {
        if (student.id === studentId) {
          return { ...student, title: titleName };
        }
        return student;
      });
      const nextState = { ...prev, students: updatedStudents };
      if (autoSave) {
        setTimeout(() => autoSave(nextState), 50);
      }
      return nextState;
    });
    triggerBubble(`🐾「太棒了！我們換上新稱號『${titleName}』囉，戴在頭上看起來非常耀眼呢！」`);
  };

  const getGameCooldownSeconds = () => {
    const lastPlayedVal = currentStudent?.lastPlayTime || currentStudent?.slimeLastPlayedAt;
    if (!currentStudent || !lastPlayedVal) return 0;
    const diff = Date.now() - new Date(lastPlayedVal).getTime();
    const remaining = Math.max(0, 3600 - Math.floor(diff / 1000)); // 1 hour = 3600 seconds
    return remaining;
  };

  const getPlayData = () => {
    if (!currentStudent) return { count: 0, moodIncrease: 0, remainingCd: 0, remainingPlays: 3 };
    const lastPlayedVal = currentStudent.lastPlayTime || currentStudent.slimeLastPlayedAt;
    const lastDateStr = lastPlayedVal ? lastPlayedVal.split("T")[0] : "";
    const todayDateStr = new Date().toISOString().split("T")[0];
    const isToday = lastDateStr === todayDateStr;
    const count = isToday ? (currentStudent.dailyPlayCount ?? currentStudent.slimePlayCountToday ?? 0) : 0;
    const moodIncrease = isToday ? (currentStudent.todayMoodBonus ?? currentStudent.slimeMoodIncreaseToday ?? 0) : 0;
    const remainingCd = getGameCooldownSeconds();
    const remainingPlays = Math.max(0, 3 - count);
    return { count, moodIncrease, remainingCd, remainingPlays };
  };

  const generateCustomSlimeFeedback = (
    happyPointsAward: number, 
    didWin: boolean | null, 
    gameType: "coin" | "rps" | "ttt"
  ) => {
    if (!currentStudent) return "謝謝你陪我玩！";
    
    const mbti = calculateStudentMBTI(currentStudent);
    const zodiac = currentStudent.studentZodiac || getZodiac(currentStudent.studentBirthday) || "雙子座";
    const petName = currentStudent.petName || "我的史萊姆";
    const name = currentStudent.name || "同學";
    const el = currentStudent.element || "magic";
    const currentHappy = currentStudent.petStats?.happy || 60;

    // Mood parts
    let moodPart = "";
    if (currentHappy >= 80) {
      moodPart = "「今天心情超級棒，感覺可以征服世界喔！🚀」";
    } else if (currentHappy < 50) {
      moodPart = "「嗚嗚原本有點沒精神的，但謝謝你的陪伴，我感覺好多而且暖烘烘的 🐾」";
    } else {
      moodPart = "「今天感覺非常溫暖有精神，謝謝你特地抽空陪我！✨」";
    }

    // MBTI parts
    let mbtiPart = "";
    const primary = mbti.type.toUpperCase();
    if (primary.includes("INTJ")) {
      mbtiPart = "「這場遊戲我早就算好了。依據機率我的每一步都是必然的。」";
    } else if (primary.includes("ENFP")) {
      mbtiPart = "「再來一次！再來一次！好好玩啊，全身都是精神氣息！🤩」";
    } else if (primary.includes("INFJ")) {
      mbtiPart = "「透過剛才的遊戲，我好像更能理解你溫暖的靈魂了...🩺」";
    } else if (primary.includes("INFP")) {
      mbtiPart = "「波波...能在安靜的時光裡陪我玩，感覺心裡很溫暖 🧸」";
    } else if (primary.includes("E")) {
      mbtiPart = "「太熱血、太高興啦！下次我們一定還要再挑戰更高難度的對決喔！🔥」";
    } else {
      mbtiPart = "「與你一同參與思考，對舒緩史萊姆的黏液大有裨益，非常感謝。」";
    }

    // Element parts
    let elementPart = "";
    if (el === "forest") {
      elementPart = "森林的樹梢都在為我們歡笑沙沙作響呢！🍃";
    } else if (el === "candy") {
      elementPart = "我的身體感覺甜滋滋的，像咬了一口彩色水果糖！🍬";
    } else if (el === "magic") {
      elementPart = "周圍的魔法指針好像也因為我們的熱情而在微光顫動喔！✨";
    } else if (el === "crystal") {
      elementPart = "七彩水晶折射著剛才我們對決的微笑，好漂亮！💎";
    } else if (el === "star") {
      elementPart = "璀璨的星辰連線在閃耀，感覺我們的回憶已經刻在夜空上了！🌟";
    } else {
      elementPart = "和你共度陪伴時光，我感覺全身充滿了史萊姆夥伴的魔力元素！👾";
    }

    // Game outcomes
    let resultText = "";
    if (gameType === "coin") {
      resultText = didWin === true 
        ? `猜硬幣正面/反面完全被你猜中了！你的直覺與【${zodiac}】完美契合！` 
        : `可惜猜錯硬幣反面正面了，不過沒關係，好運正在默默累積中唷！`;
    } else if (gameType === "rps") {
      resultText = didWin === true
        ? "猜拳你大獲全勝！你難道有讀心術嗎？"
        : didWin === null
          ? "猜拳平手！這就是傳說中的英雄所見略同吧！"
          : "我的剪刀石頭布稍勝一籌囉，承讓承讓！";
    } else if (gameType === "ttt") {
      resultText = didWin === true
        ? "不愧是 3x3 井字連線大師，這個佈局太神了！"
        : didWin === null
          ? "棋盤均已填滿平手！這真是一場精彩的博弈對決！"
          : "嘿嘿，我的 3x3 連棋成功連成一線囉！";
    }

    const combos = [
      `${moodPart} ${resultText} ${mbtiPart} 另外：${elementPart}`,
      `「波波！謝謝你陪我玩 ${gameType === "coin" ? "猜硬幣" : gameType === "rps" ? "猜拳" : "井字棋"}！ ${resultText} ${moodPart} ${mbtiPart}」`,
      `「${mbtiPart} 看著【${zodiac}】的 ${name}，我的屬性能力在湧現呢。${elementPart} ${moodPart}」`
    ];

    return combos[Math.floor(Math.random() * combos.length)];
  };

  const handleRecordGameFinish = (
    didWin: boolean | null, 
    happyPointsAward: number, 
    gameType: "coin" | "rps" | "ttt"
  ) => {
    if (!currentStudent) return;
    const playData = getPlayData();
    const limitReached = playData.count >= 3;

    // Calculate actual points to add, capped by daily maximum mood bonus of +20
    const currentBonus = playData.moodIncrease;
    const remainingCap = Math.max(0, 20 - currentBonus);
    const actualIncrease = limitReached ? 0 : Math.min(happyPointsAward, remainingCap);

    const currentHappy = currentStudent.petStats?.happy ?? 60;
    const newHappy = Math.min(100, currentHappy + actualIncrease);
    const nowIso = new Date().toISOString();

    setAppData((prev) => {
      const updatedStudents = prev.students.map((student) => {
        if (student.id === studentId) {
          const isToday2 = student.lastPlayTime ? student.lastPlayTime.split("T")[0] === nowIso.split("T")[0] : false;
          const prevPlayCount = isToday2 ? (student.dailyPlayCount ?? student.slimePlayCountToday ?? 0) : 0;
          const prevMoodBonus = isToday2 ? (student.todayMoodBonus ?? student.slimeMoodIncreaseToday ?? 0) : 0;

          return {
            ...student,
            petStats: {
              ...(student.petStats || { happy: 60, affinity: 50, stamina: 50 }),
              happy: newHappy,
            },
            // Legacy fields for backward compatibility
            slimePlayCountToday: prevPlayCount + 1,
            slimeLastPlayedAt: nowIso,
            slimeMoodIncreaseToday: prevMoodBonus + actualIncrease,
            // Requested fields for permanent storage
            dailyPlayCount: prevPlayCount + 1,
            lastPlayTime: nowIso,
            todayMoodBonus: prevMoodBonus + actualIncrease,
          };
        }
        return student;
      });
      const nextState = { ...prev, students: updatedStudents };
      if (autoSave) {
        setTimeout(() => autoSave(nextState), 50);
      }
      return nextState;
    });

    const feedback = generateCustomSlimeFeedback(happyPointsAward, didWin, gameType);
    triggerBubble(feedback);
  };

  const handleStartRandomGame = () => {
    const playData = getPlayData();
    if (playData.count >= 3) {
      triggerBubble(`🐾「波波！今天的小遊戲上限（3 次）已經滿囉！人家現在要乖乖睡覺休息，明天我們再一起玩吧 💤」`);
      return;
    }
    if (playData.remainingCd > 0) {
      triggerBubble(`🐾「等、等一下！人家剛陪你玩完，現在還在冷卻中呢，請再等待 ${formatCdTextDetailed(playData.remainingCd)} 囉 ⏳」`);
      return;
    }

    const availableGames: Array<"coin" | "rps" | "ttt"> = ["coin", "rps", "ttt"];
    const chosen = availableGames[Math.floor(Math.random() * availableGames.length)];
    
    // Reset selection states
    if (chosen === "coin") {
      setCoinResult(null);
      setCoinSelection(null);
      setCoinSpinning(false);
    } else if (chosen === "rps") {
      setRpsResult(null);
      setRpsPlayerMove(null);
      setRpsSlimeMove(null);
    } else if (chosen === "ttt") {
      setTttBoard(Array(9).fill(""));
      setTttStatus("playing");
    }

    setActiveGame(chosen);
  };

  const formatCdTextDetailed = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}分${s}秒`;
  };

  const handleCoinPlay = (selection: "heads" | "tails") => {
    const playData = getPlayData();
    if (playData.remainingCd > 0) {
      triggerBubble(`🐾「等、等一下！請預留冷卻等待最後那 ${formatCdTextDetailed(playData.remainingCd)} 再翻硬幣喔 🪙」`);
      return;
    }

    setCoinSelection(selection);
    setCoinSpinning(true);
    setCoinResult(null);

    setTimeout(() => {
      const flips: Array<"heads" | "tails"> = ["heads", "tails"];
      const finalCoin = flips[Math.floor(Math.random() * 2)];
      setCoinResult(finalCoin);
      setCoinSpinning(false);

      const didWin = selection === finalCoin;
      const award = didWin ? 3 : 1;
      handleRecordGameFinish(didWin, award, "coin");
    }, 1200);
  };

  const handleRpsPlay = (playerChoice: "rock" | "paper" | "scissors") => {
    const playData = getPlayData();
    if (playData.remainingCd > 0) {
      triggerBubble(`🐾「雙手手有點累呢，還剩 ${formatCdTextDetailed(playData.remainingCd)} 冷卻時間才能下一局喔 ⏳」`);
      return;
    }

    setRpsPlayerMove(playerChoice);
    const moves: Array<"rock" | "paper" | "scissors"> = ["rock", "paper", "scissors"];
    const slimeChoice = moves[Math.floor(Math.random() * 3)];
    setRpsSlimeMove(slimeChoice);

    let result: "win" | "lose" | "draw" = "draw";
    if (playerChoice === slimeChoice) {
      result = "draw";
    } else if (
      (playerChoice === "rock" && slimeChoice === "scissors") ||
      (playerChoice === "paper" && slimeChoice === "rock") ||
      (playerChoice === "scissors" && slimeChoice === "paper")
    ) {
      result = "win";
    } else {
      result = "lose";
    }
    setRpsResult(result);

    let didWin: boolean | null = null;
    let award = 1;
    if (result === "win") {
      didWin = true;
      award = 5;
    } else if (result === "lose") {
      didWin = false;
      award = 1;
    } else {
      didWin = null;
      award = 2;
    }

    handleRecordGameFinish(didWin, award, "rps");
  };

  const handleTttCellClick = (index: number) => {
    if (tttBoard[index] !== "" || tttStatus !== "playing") return;
    const playData = getPlayData();
    if (playData.remainingCd > 0) {
      triggerBubble(`🐾「波波～ 思考井字棋中，請再隔 ${formatCdTextDetailed(playData.remainingCd)} 冷卻後再落子吧！⏳」`);
      return;
    }

    const nextBoard = [...tttBoard];
    nextBoard[index] = "O";
    setTttBoard(nextBoard);

    const checkWin = (board: typeof tttBoard, char: "O" | "X") => {
      const wins = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
      ];
      return wins.some(([a, b, c]) => board[a] === char && board[b] === char && board[c] === char);
    };

    if (checkWin(nextBoard, "O")) {
      setTttStatus("win");
      handleRecordGameFinish(true, 8, "ttt");
      return;
    }

    if (!nextBoard.includes("")) {
      setTttStatus("draw");
      handleRecordGameFinish(null, 8, "ttt");
      return;
    }

    const emptyIndices = nextBoard.map((val, idx) => (val === "" ? idx : null)).filter((v) => v !== null) as number[];
    if (emptyIndices.length > 0) {
      const slimeChoice = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      nextBoard[slimeChoice] = "X";
      setTttBoard(nextBoard);

      if (checkWin(nextBoard, "X")) {
        setTttStatus("lose");
        handleRecordGameFinish(false, 8, "ttt");
        return;
      }

      if (!nextBoard.includes("")) {
        setTttStatus("draw");
        handleRecordGameFinish(null, 8, "ttt");
        return;
      }
    }
  };
  
  // Custom dialog or speaking lines state
  const [bubbleText, setBubbleText] = useState("");
  const [bubbleShow, setBubbleShow] = useState(false);

  // Time triggers inside student views
  const [nowTimestamp, setNowTimestamp] = useState(Date.now());

  useEffect(() => {
    const tInterval = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(tInterval);
  }, []);

  useEffect(() => {
    if (currentStudent) {
      let needsUpdate = false;
      let updatedBirthday = currentStudent.studentBirthday;
      let updatedZodiac = currentStudent.studentZodiac;
      let updatedWish = currentStudent.todayWish;

      if (updatedBirthday && !updatedZodiac) {
        updatedZodiac = getZodiac(updatedBirthday);
        needsUpdate = true;
      }

      if (!updatedWish) {
        updatedWish = generateDailySlimeWish(currentStudent);
        needsUpdate = true;
      }

      if (needsUpdate) {
        setAppData((prev) => {
          const nextStudents = prev.students.map((s) => {
            if (s.id === studentId) {
              return {
                ...s,
                studentZodiac: updatedZodiac,
                todayWish: updatedWish
              };
            }
            return s;
          });
          const nextState = { ...prev, students: nextStudents };
          if (autoSave) {
            setTimeout(() => autoSave(nextState), 50);
          }
          return nextState;
        });
      }
    }
  }, [studentId, currentStudent?.studentBirthday, currentStudent?.studentZodiac, currentStudent?.todayWish]);

  if (!currentStudent) {
    return (
      <div className="modal-backdrop flex items-center justify-center">
        <div className="game-box bg-white p-6 text-center">
          <p className="text-xl font-bold text-red-600">找不到學生資料</p>
          <button onClick={onClose} className="btn-game bg-gray-300 mt-4 px-4 py-2">
            關閉
          </button>
        </div>
      </div>
    );
  }

  // Speak dialogue helper
  const triggerBubble = (msg: string) => {
    setBubbleText(msg);
    setBubbleShow(true);
    setTimeout(() => {
      setBubbleShow(false);
    }, 2500);
  };

  const handlePokePet = () => {
    // 1. Pick a cute active interactive expression randomly
    const expressions: Array<"happy" | "very_happy" | "excited" | "love" | "proud"> = [
      "happy", "very_happy", "excited", "love", "proud"
    ];
    const randExpr = expressions[Math.floor(Math.random() * expressions.length)];

    // 2. Temporarily set student.currentExpression to randExpr to trigger personalized visual feedback
    setAppData((prev) => {
      const updated = prev.students.map((st) => {
        if (st.id === studentId) {
          return { ...st, currentExpression: randExpr };
        }
        return st;
      });
      return { ...prev, students: updated };
    });

    // 3. Clear temporary expression on slime after 2.8 seconds
    setTimeout(() => {
      setAppData((prev) => {
        const updated = prev.students.map((st) => {
          if (st.id === studentId) {
            return { ...st, currentExpression: undefined };
          }
          return st;
        });
        return { ...prev, students: updated };
      });
    }, 2800);

    const pick = getPetDialogue(currentStudent);
    triggerBubble(pick);

    // Minor confetti splash for sensory satisfaction
    try {
      confetti({ particleCount: 20, spread: 50, origin: { x: 0.5, y: 0.65 } });
    } catch (e) {
      console.warn("Confetti ignored in sandbox:", e);
    }
  };

  // 1. Task executions
  const handleReportIndivTask = (index: number, e: React.MouseEvent) => {
    setAppData((prev) => {
      const updatedStudents = prev.students.map((student) => {
        if (student.id === studentId) {
          const updatedTasks = student.tasks.map((task, idx) => {
            if (idx === index && (!task.status || task.status === "active") && !task.done) {
              return { ...task, status: "pending" as const };
            }
            return task;
          });
          return { ...student, tasks: updatedTasks };
        }
        return student;
      });

      const nextState = { ...prev, students: updatedStudents };
      if (autoSave) {
        setTimeout(() => autoSave(nextState), 50);
      }
      return nextState;
    });

    const activeTask = currentStudent.tasks[index];
    const pick = `🐾「我已經把任務『${activeTask?.title}』的回報傳給老師審核囉！等老師點頭，我們就可以回來領取點數獎勵囉！」`;
    triggerBubble(pick);
  };

  const handleClaimIndivTaskReward = (index: number, e: React.MouseEvent) => {
    let affectedStudentName = "";
    let awardedPoints = 0;
    let taskTitle = "";

    setAppData((prev) => {
      const nextStudents = prev.students.map((student) => {
        if (student.id === studentId) {
          affectedStudentName = student.name;
          const studentTasks = student.tasks || [];
          const task = studentTasks[index];
          if (!task) return student;

          taskTitle = task.title;
          const pts = Number(task.points) || 10;
          
          const isBday = isTodayBirthday(student.studentBirthday) || student.birthdayBonusEnabled;
          awardedPoints = isBday ? pts * 2 : pts;
          
          const typeKey = getTaskTypeCategory(task.title, task.category);
          const stats = student.taskTypeStats || { clean: 0, reading: 0, speaking: 0, cooperation: 0, manners: 0, responsibility: 0 };
          
          const nextTasks = studentTasks.map((t, idx) => {
            if (idx === index) {
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
          `領取任務獎勵「${taskTitle}」`,
          "學生",
          finalBalance
        );
      }

      if (autoSave) {
        setTimeout(() => autoSave(nextState), 50);
      }
      return nextState;
    });

    showSuccess(e, awardedPoints);

    const pick = `🎉「耶！順利領取『${taskTitle}』的點數獎勵囉！我們真是配合得太完美了，一起繼續加油！」`;
    triggerBubble(pick);
  };

  const handleCompleteGroupTask = (index: number, e: React.MouseEvent) => {
    const t = appData.activeGroupTasks[index];
    if (!t) return;

    const joined = t.participants.includes(studentId);
    const claimed = t.claimedBy.includes(studentId);
    const classSize = Math.max(1, appData.students.length);
    const done = t.participants.length >= classSize;

    if (claimed) return;

    if (!done) {
      if (joined) {
        triggerBubble("你已參與此團體合作任務，請等待其他同學一同完成喔！⏰");
        return;
      }

      setAppData((prev) => {
        const nextGroupTasks = prev.activeGroupTasks.map((task, idx) => {
          if (idx === index) {
            return {
              ...task,
              participants: task.participants.includes(studentId)
                ? task.participants
                : [...task.participants, studentId]
            };
          }
          return task;
        });

        const updatedState = {
          ...prev,
          activeGroupTasks: nextGroupTasks
        };
        if (autoSave) {
          setTimeout(() => autoSave(updatedState), 50);
        }
        return updatedState;
      });

      showSuccess(e, 0);
      triggerBubble("已成功參與！等待全班其他同學加入完成...💪");
    } else {
      // Completed, and student can now claim!
      setAppData((prev) => {
        const nextGroupTasks = prev.activeGroupTasks.map((task, idx) => {
          if (idx === index) {
            return {
              ...task,
              claimedBy: task.claimedBy.includes(studentId)
                ? task.claimedBy
                : [...task.claimedBy, studentId]
            };
          }
          return task;
        });

        const nextStudents = prev.students.map((student) => {
          if (student.id === studentId) {
            const stats = student.taskTypeStats || { clean: 0, reading: 0, speaking: 0, cooperation: 0, manners: 0, responsibility: 0 };
            const typeKey = getTaskTypeCategory(t.title, t.category);

            let updatedWish = student.todayWish;
            let happyWishBonus = 0;
            let affinityWishBonus = 0;
            let expWishBonus = 0;
            if (updatedWish && !updatedWish.completed && updatedWish.type === "task") {
              updatedWish = { ...updatedWish, completed: true };
              happyWishBonus = 30;
              affinityWishBonus = 20;
              expWishBonus = 25;
            }

            const currentStats = student.petStats || { happy: 60, affinity: 50, stamina: 50 };
            const doublePts = doubleIfBirthday(student, t.points);

            const updatedStudent = {
              ...student,
              points: student.points + doublePts,
              completedTaskCount: Number(student.completedTaskCount || 0) + 1,
              todayWish: updatedWish,
              petStats: {
                ...currentStats,
                happy: Math.min(100, currentStats.happy + happyWishBonus),
                affinity: Math.min(100, currentStats.affinity + affinityWishBonus)
              },
              taskTypeStats: {
                ...stats,
                [typeKey]: Number(stats[typeKey] || 0) + 1
              }
            };
            if (expWishBonus > 0) {
              gainPetExp(updatedStudent, expWishBonus);
            }
            return updatedStudent;
          }
          return student;
        });

        let updatedState = {
          ...prev,
          activeGroupTasks: nextGroupTasks,
          students: nextStudents
        };
        const s = prev.students.find(x => x.id === studentId);
        if (s) {
          const doublePts = doubleIfBirthday(s, t.points);
          const sourceMarkSymbol = doubleIfBirthday(s, 10) > 10 ? "團體任務 (壽星加倍)" : "團體任務";
          updatedState = appendPointLog(
            updatedState,
            studentId,
            doublePts,
            sourceMarkSymbol,
            "學生",
            s.points + doublePts
          );
        }
        if (autoSave) {
          setTimeout(() => autoSave(updatedState), 50);
        }
        return updatedState;
      });

      confetti({ particleCount: 70, spread: 60 });
      const finalPts = doubleIfBirthday(currentStudent, t.points);
      showSuccess(e, finalPts);
      
      const hasWish = currentStudent.todayWish && !currentStudent.todayWish.completed && currentStudent.todayWish.type === "task";
      const dialogue = getAdvancedPetDialogue(currentStudent, "completeTask", { taskTitle: t.title });
      const wishNotice = hasWish ? `\n\n🎉【史萊姆願望達成！】完成任務大作戰！心情+30、親密+20、經驗+25！💝` : "";
      triggerBubble(`${dialogue}${wishNotice}`);
    }
  };

  const handleCompleteTimedTask = (realIndex: number, e: React.MouseEvent) => {
    const t = appData.timedTasks[realIndex];
    if (!t) return;

    const remainingSec = getTimedRemaining(t);
    if (remainingSec <= 0) {
      showDialog({ title: "任務已逾時", message: "很抱歉，限時任務時間已經截止囉！", type: "alert" });
      return;
    }

    if (t.completedBy.includes(studentId)) return;

    setAppData((prev) => {
      const nextTimed = prev.timedTasks.map((timedT, idx) => {
        if (idx === realIndex) {
          return {
            ...timedT,
            completedBy: [...timedT.completedBy, studentId]
          };
        }
        return timedT;
      });

      const nextStudents = prev.students.map((student) => {
        if (student.id === studentId) {
          const stats = student.taskTypeStats || { clean: 0, reading: 0, speaking: 0, cooperation: 0, manners: 0, responsibility: 0 };
          const typeKey = "responsibility";

          let updatedWish = student.todayWish;
          let happyWishBonus = 0;
          let affinityWishBonus = 0;
          let expWishBonus = 0;
          if (updatedWish && !updatedWish.completed && updatedWish.type === "task") {
            updatedWish = { ...updatedWish, completed: true };
            happyWishBonus = 30;
            affinityWishBonus = 20;
            expWishBonus = 25;
          }

          const currentStats = student.petStats || { happy: 60, affinity: 50, stamina: 50 };
          const doublePts = doubleIfBirthday(student, t.points);

          const updatedStudent = {
            ...student,
            points: student.points + doublePts,
            completedTaskCount: Number(student.completedTaskCount || 0) + 1,
            todayWish: updatedWish,
            petStats: {
              ...currentStats,
              happy: Math.min(100, currentStats.happy + happyWishBonus),
              affinity: Math.min(100, currentStats.affinity + affinityWishBonus)
            },
            taskTypeStats: {
              ...stats,
              [typeKey]: Number(stats[typeKey] || 0) + 1
            }
          };
          if (expWishBonus > 0) {
            gainPetExp(updatedStudent, expWishBonus);
          }
          return updatedStudent;
        }
        return student;
      });

      let nextState = {
        ...prev,
        timedTasks: nextTimed,
        students: nextStudents
      };
      const s = prev.students.find(x => x.id === studentId);
      if (s) {
        const doublePts = doubleIfBirthday(s, t.points);
        const sourceMarkSymbol = doubleIfBirthday(s, 10) > 10 ? "限時任務 (壽星加倍)" : "限時任務";
        nextState = appendPointLog(
          nextState,
          studentId,
          doublePts,
          sourceMarkSymbol,
          "學生",
          s.points + doublePts
        );
      }
      return nextState;
    });

    const finalPts = doubleIfBirthday(currentStudent, t.points);
    showSuccess(e, finalPts);
    
    const hasWish = currentStudent.todayWish && !currentStudent.todayWish.completed && currentStudent.todayWish.type === "task";
    const dialogue = getAdvancedPetDialogue(currentStudent, "completeTask", { taskTitle: t.title });
    const wishNotice = hasWish ? `\n\n🎉【史萊姆願望達成！】完成任務大作戰！心情+30、親密+20、經驗+25！💝` : "";
    triggerBubble(`${dialogue}${wishNotice}`);
  };

  // Helper inside tasks
  const getTaskTypeCategory = (title: string, cat: string) => {
    const t = `${title} ${cat}`;
    if (/整理|打掃|清潔|桌面/.test(t)) return "clean";
    if (/閱讀|讀書/.test(t)) return "reading";
    if (/發言|分享|回答/.test(t)) return "speaking";
    if (/合作|幫助|團隊/.test(t)) return "cooperation";
    if (/禮貌|排隊/.test(t)) return "manners";
    return "responsibility";
  };

  const getTimedRemaining = (t: TimedTask) => {
    if (!t.isActive || !t.startedAt) return t.remainingSeconds;
    const passed = Math.floor((nowTimestamp - t.startedAt) / 1000);
    return Math.max(0, t.durationSeconds - passed);
  };

  const formatSeconds = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 2. Food Shop list builders
  const getCombinedFoods = () => {
    const combined: Record<string, any> = { ...BASE_FOOD };
    appData.customFoods.forEach((f) => {
      if (f.visible) {
        combined[f.id] = {
          name: f.name,
          cost: f.cost,
          icon: f.icon,
          exp: f.exp,
          happy: f.happy,
          affinity: f.affinity,
          stamina: f.stamina,
          reply: f.reply || `${f.name} 真好吃！`
        };
      }
    });
    return combined;
  };

  const handleFeedPet = (foodId: string, e: React.MouseEvent) => {
    const foods = getCombinedFoods();
    const food = foods[foodId];
    if (!food) return;

    if (currentStudent.points < food.cost) {
      showDialog({
        title: "點數不足",
        message: `需要 ${food.cost} 點才能兌換 ${food.name}。請先完成一些課堂任務喔！`,
        type: "alert",
        titleColor: "text-red-500"
      });
      return;
    }

    const currentStats = currentStudent.petStats || { happy: 0, affinity: 0, stamina: 0 };
    const logItem = {
      foodId,
      name: food.name,
      cost: food.cost,
      exp: food.exp,
      time: new Date().toLocaleString("zh-TW")
    };

    // 1. Food category classification
    const foodCat = getFoodCategory(food.name);

    // 2. Pre-feeding preference evaluation
    const petMBTIPre = calculateStudentMBTI(currentStudent);
    const isFav = foodCat === petMBTIPre.favFood;
    
    // Determine if disliked
    const counts: Record<string, number> = {
      "水果": 0, "蔬菜": 0, "甜點": 0, "主食": 0, "肉類": 0, "飲料": 0, "特殊食物": 0
    };
    (currentStudent.foodHistory || []).forEach(c => {
      if (counts[c] !== undefined) counts[c]++;
    });
    const hasStrongPreference = Object.values(counts).some(v => v >= 2);
    const isDisliked = hasStrongPreference && counts[foodCat] === 0;

    let multiplier = 1.0;
    if (isFav) {
      multiplier = 1.6;
    } else if (isDisliked) {
      multiplier = 0.4;
    }

    const happyGain = Math.round(food.happy * multiplier);
    const affinityGain = Math.round(food.affinity * multiplier);
    const staminaGain = food.stamina; // stamina unaffected

    // Update food history list (up to 20 recorded entries)
    const updatedHistory = [foodCat, ...(currentStudent.foodHistory || [])].slice(0, 20);

    let updatedWish = currentStudent.todayWish;
    let happyWishBonus = 0;
    let affinityWishBonus = 0;
    let expWishBonus = 0;
    let wishCompleted = false;
    
    if (updatedWish && !updatedWish.completed && updatedWish.type === "food" && updatedWish.detail.includes(foodCat)) {
      wishCompleted = true;
      updatedWish = { ...updatedWish, completed: true };
      happyWishBonus = 30;
      affinityWishBonus = 20;
      expWishBonus = 25;
    }

    const nextStamina = Math.min(100, currentStats.stamina + staminaGain);
    const clStudent: Student = {
      ...currentStudent,
      points: currentStudent.points - food.cost,
      feedLog: [logItem, ...(currentStudent.feedLog || [])],
      foodHistory: updatedHistory,
      todayWish: updatedWish,
      lastFedTime: Date.now(),
      lastHungerUpdate: Date.now(),
      currentHunger: nextStamina,
      petStats: {
        happy: Math.min(100, currentStats.happy + happyGain + happyWishBonus),
        affinity: Math.min(100, currentStats.affinity + affinityGain + affinityWishBonus),
        stamina: nextStamina
      }
    };

    gainPetExp(clStudent, food.exp + expWishBonus);

    let nextStateStored: any = null;
    setAppData((prev) => {
      const nextStudents = prev.students.map((student) => {
        if (student.id === studentId) {
          return clStudent;
        }
        return student;
      });
      let nextState = { ...prev, students: nextStudents };
      nextState = appendPointLog(
        nextState,
        studentId,
        -food.cost,
        `購買食物 (${food.name})`,
        "學生",
        currentStudent.points - food.cost
      );
      nextStateStored = nextState;
      return nextState;
    });

    if (autoSave && nextStateStored) {
      autoSave(nextStateStored);
    }

    showSuccess(e, -food.cost);

    const customRepl = getAdvancedPetDialogue(clStudent, "feed", { foodName: food.name });
    let header = ``;
    if (isFav) {
      header = `🌟 【超愛吃！心情爆棚！】\n`;
    } else if (isDisliked) {
      header = `💧 【吃飽了，但我更想要【最愛：${petMBTIPre.favFood}】呢...】\n`;
    }
    const wishNotice = wishCompleted ? `\n\n🎉【史萊姆願望達成！】吃到最想要的食物！心情+30、親密+20、經驗+25！💝` : "";
    triggerBubble(`${header}${food.reply} 💕\n「謝謝主人餵我！」\n${customRepl}${wishNotice}`);
  };

  // 3. Learning Course triggers
  // 3. Learning Course triggers
  const handleLearnCourse = (courseId: string, e: React.MouseEvent) => {
    const c = learningDB[courseId];
    if (!c) return;

    if (currentStudent.points < c.cost) {
      showDialog({
        title: "點數不足",
        message: `上【${c.name}】需要 ${c.cost} 點。請多做點任務來賺取點數吧！`,
        type: "alert"
      });
      return;
    }

    const courseEffect = courseEffectMap[c.name] || courseEffectMap[courseId];
    const happyCourseBonus = courseEffect?.happy || 0;

    let completedWishLocal = false;
    let happyWishBonus = 0;
    let affinityWishBonus = 0;
    let expWishBonus = 0;
    const currentStats = currentStudent.petStats || { happy: 60, affinity: 50, stamina: 50 };

    if (currentStudent.todayWish && !currentStudent.todayWish.completed && currentStudent.todayWish.type === "learn") {
      completedWishLocal = true;
      happyWishBonus = 30;
      affinityWishBonus = 20;
      expWishBonus = 25;
    }

    // Determine special triggers for Magic & Cooking
    let isMagicExplosion = false;
    let isCookingPerfect = false;

    if (c.name === "魔法課") {
      // Extremely low chance (極低機率, 10% or similar)
      if (Math.random() < 0.10) {
        isMagicExplosion = true;
      }
    } else if (c.name === "烹飪課") {
      // Low chance (低機率, 15% or similar)
      if (Math.random() < 0.15) {
        isCookingPerfect = true;
      }
    }

    const courseStatToStudentStatKey: Record<string, string> = {
      wisdom: "intelligence",
      expression: "expression",
      logic: "logic",
      exploration: "exploration",
      knowledge: "knowledge",
      cooperation: "cooperation",
      creativity: "creativity",
      art: "art",
      vitality: "energy"
    };

    let nextStateStored: AppData | null = null;

    setAppData((prev) => {
      const nextStudents = prev.students.map((student) => {
        if (student.id === studentId && student.pet) {
          // Update personalityStats
          const currentPStats: any = student.pet.personalityStats || {};
          const nextPStats: any = { ...currentPStats };
          
          Object.entries(c.stats).forEach(([k, v]) => {
            nextPStats[k] = (Number(currentPStats[k] || 0)) + v;
          });

          if (isMagicExplosion) {
            nextPStats.creativity = (Number(nextPStats.creativity || 0)) + 5;
          }

          // Update student.stats (9 primary stats)
          const currentStatsObj = student.stats || {
            intelligence: 0,
            creativity: 0,
            energy: 0,
            exploration: 0,
            expression: 0,
            cooperation: 0,
            logic: 0,
            knowledge: 0,
            art: 0
          };
          const nextStats = { ...currentStatsObj };

          Object.entries(c.stats).forEach(([k, v]) => {
            const mappedKey = courseStatToStudentStatKey[k] || k;
            nextStats[mappedKey] = (Number(currentStatsObj[mappedKey] || 0)) + v;
          });

          if (isMagicExplosion) {
            nextStats.creativity = (Number(nextStats.creativity || 0)) + 5;
          }

          // User requested logs
          console.log("課程效果", c.name, c.stats);
          console.log("更新後能力", nextStats);

          let logNote = "性格數值提升囉";
          if (isMagicExplosion) {
            logNote = "✨ 靈感爆發！創造力額外 +5！";
          } else if (isCookingPerfect) {
            logNote = "🍰 完美料理！心情額外 +5！";
          }

          const logItem = {
            time: new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }),
            course: c.name,
            note: logNote
          };

          let updatedWish = student.todayWish;
          if (completedWishLocal) {
            updatedWish = { ...updatedWish, completed: true } as any;
          }

          const clStudentLocal: Student = {
            ...student,
            points: student.points - c.cost,
            todayWish: updatedWish,
            stats: nextStats,
            petStats: {
              ...currentStats,
              happy: Math.min(100, currentStats.happy + happyWishBonus + happyCourseBonus + (isCookingPerfect ? 5 : 0)),
              affinity: Math.min(100, currentStats.affinity + affinityWishBonus)
            },
            pet: {
              ...student.pet,
              personalityStats: nextPStats as any,
              learningLog: [...(student.pet.learningLog || []), logItem]
            }
          } as Student;

          gainPetExp(clStudentLocal, c.exp + expWishBonus);
          return clStudentLocal;
        }
        return student;
      });
      let nextState = { ...prev, students: nextStudents };
      nextState = appendPointLog(
        nextState,
        studentId,
        -c.cost,
        `學習課程 (${c.name})`,
        "學生",
        currentStudent.points - c.cost
      );
      nextStateStored = nextState;
      return nextState;
    });

    if (autoSave && nextStateStored) {
      autoSave(nextStateStored);
    }

    showSuccess(e, -c.cost);

    const currentStudentStats = currentStudent.stats || {
      intelligence: 0,
      creativity: 0,
      energy: 0,
      exploration: 0,
      expression: 0,
      cooperation: 0,
      logic: 0,
      knowledge: 0,
      art: 0
    };
    const updatedStatsObjLocal = { ...currentStudentStats };
    Object.entries(c.stats).forEach(([k, v]) => {
      const mappedKey = courseStatToStudentStatKey[k] || k;
      updatedStatsObjLocal[mappedKey] = (Number(currentStudentStats[mappedKey] || 0)) + v;
    });
    if (isMagicExplosion) {
      updatedStatsObjLocal.creativity = (Number(updatedStatsObjLocal.creativity || 0)) + 5;
    }

    const updatedStudentWithCurrentClass: Student = {
      ...currentStudent,
      todayWish: completedWishLocal ? { ...currentStudent.todayWish, completed: true } as any : currentStudent.todayWish,
      stats: updatedStatsObjLocal,
      petStats: {
        ...currentStats,
        happy: Math.min(100, currentStats.happy + happyWishBonus + happyCourseBonus + (isCookingPerfect ? 5 : 0)),
        affinity: Math.min(100, currentStats.affinity + affinityWishBonus)
      },
      pet: currentStudent.pet ? {
        ...currentStudent.pet,
        personalityStats: {
          ...currentStudent.pet.personalityStats,
          ...Object.fromEntries(
            Object.entries(c.stats).map(([k, v]) => [k, (Number(currentStudent.pet?.personalityStats?.[k] || 0)) + v])
          )
        } as any
      } : undefined
    } as Student;

    if (isMagicExplosion && updatedStudentWithCurrentClass.pet?.personalityStats) {
      updatedStudentWithCurrentClass.pet.personalityStats.creativity =
        (Number(updatedStudentWithCurrentClass.pet.personalityStats.creativity || 0)) + 5;
    }

    const titleLocal = getPersonalityTitle(updatedStudentWithCurrentClass);
    const petMBTIInfoLocal = calculateStudentMBTI(updatedStudentWithCurrentClass);
    const customRepl = getAdvancedPetDialogue(updatedStudentWithCurrentClass, "learn", { courseName: c.name });
    const wishNotice = completedWishLocal ? `\n\n🎉【史萊姆願詢達成！】完成學習課程！心情+30、親密+20、經驗+25！💝` : "";
    
    let specialTriggerText = "";
    if (isMagicExplosion) {
      specialTriggerText = `\n\n✨🔮【靈感爆發！】史萊姆腦袋靈光一閃，創造力獲得額外 +5 祝福！✨`;
    } else if (isCookingPerfect) {
      specialTriggerText = `\n\n🍳🍰【完美料理！】美味四溢！史萊姆心情額外大增 +5！💖`;
    }

    triggerBubble(`${c.icon} 上了【${c.name}】感覺精神百倍！目前性格類別是：【${titleLocal} (${petMBTIInfoLocal.type})】\n${customRepl}${wishNotice}${specialTriggerText}`);
  };

  // 4. Equip Background (Legacy base compatibility)
  const handleEquipBg = (bgKey: string) => {
    setAppData((prev) => {
      const next = prev.students.map((s) => {
        if (s.id === studentId) {
          return {
            ...s,
            // Toggle off legacy equippedBackground and make sure custom bg is also sync disabled
            equippedBackground: s.equippedBackground === bgKey ? "" : bgKey,
            studentActiveBackground: ""
          };
        }
        return s;
      });
      return { ...prev, students: next };
    });
  };

  const getItemNormalizedCategory = (item: any): string => {
    if (!item) return "background";
    const cat = (item.category || item.type || "background").toLowerCase();
    if (cat.includes("decor") || cat === "裝飾" || cat.includes("飾")) return "decoration";
    if (cat.includes("furnit") || cat === "家具") return "furniture";
    if (cat.includes("object") || cat.includes("prop") || cat.includes("small") || cat === "小物" || cat.includes("擺")) return "object";
    if (cat.includes("effect") || cat === "特效" || cat === "效果") return "effect";
    return "background";
  };

  const categoryLabels: Record<string, string> = {
    background: "背景",
    decoration: "裝飾",
    furniture: "家具",
    object: "小物",
    effect: "特效"
  };

  const handleEquipCustomBg = (bgId: string) => {
    const item = (appData.backgroundGachaItems || defaultBackgroundGachaItems).find((x) => x.id === bgId);
    if (item && item.enabled === false) {
      showDialog({
        title: "背景裝飾已停用",
        message: "⚠️ 此背景裝飾目前已被教師停用（下架），無法啟用！",
        type: "alert"
      });
      return;
    }
    setAppData((prev) => {
      const next = prev.students.map((s) => {
        if (s.id === studentId) {
          let activeDecs = s.studentActiveDecorations;
          if (!activeDecs || Array.isArray(activeDecs) || typeof activeDecs !== "object") {
            activeDecs = {};
          }
          if (s.studentActiveBackground && !activeDecs["background"]) {
            activeDecs = { ...activeDecs, background: s.studentActiveBackground };
          }

          const cat = item ? getItemNormalizedCategory(item) : "background";
          const currentlyActive = activeDecs[cat] === bgId;

          const nextDecs = { ...activeDecs };
          if (currentlyActive) {
            delete nextDecs[cat];
          } else {
            nextDecs[cat] = bgId;
          }

          return {
            ...s,
            studentActiveBackground: nextDecs["background"] || "",
            studentActiveDecorations: nextDecs,
            equippedBackground: ""
          };
        }
        return s;
      });
      return { ...prev, students: next };
    });
  };

  const handleEquipCustomDec = (decItem: any) => {
    if (decItem && decItem.enabled === false) {
      showDialog({
        title: "背景裝飾已停用",
        message: "⚠️ 背景裝飾目前已被教師停用（下架），無法啟用！",
        type: "alert"
      });
      return;
    }
    setAppData((prev) => {
      const next = prev.students.map((s) => {
        if (s.id === studentId) {
          const bgId = decItem.id;
          let activeDecs = s.studentActiveDecorations;
          if (!activeDecs || Array.isArray(activeDecs) || typeof activeDecs !== "object") {
            activeDecs = {};
          }
          if (s.studentActiveBackground && !activeDecs["background"]) {
            activeDecs = { ...activeDecs, background: s.studentActiveBackground };
          }

          const cat = getItemNormalizedCategory(decItem);
          const currentlyActive = activeDecs[cat] === bgId;

          const nextDecs = { ...activeDecs };
          if (currentlyActive) {
            delete nextDecs[cat];
          } else {
            nextDecs[cat] = bgId;
          }

          return {
            ...s,
            studentActiveBackground: nextDecs["background"] || "",
            studentActiveDecorations: nextDecs,
            equippedBackground: ""
          };
        }
        return s;
      });
      return { ...prev, students: next };
    });
  };

  // 5. Roll background Gacha (Costs 30 points) - Weighted Random from Custom Items List
  const handleDrawGacha = (e: React.MouseEvent) => {
    if (!currentStudent) return;
    
    const gachaCost = 30;

    // Check points
    if (currentStudent.points < gachaCost) {
      showDialog({
        title: "點數不足",
        message: "召喚轉蛋需要 30 點數！努力完成日常課堂目標來累積點數吧！",
        type: "alert"
      });
      return;
    }

    if (isDrawingGacha) return;
    setIsDrawingGacha(true);

    const itemsList = appData.backgroundGachaItems || defaultBackgroundGachaItems;
    const enabledItems = itemsList.filter((item) => item.enabled !== false && item.isDeleted !== true);
    const pool = enabledItems.length > 0 ? enabledItems : defaultBackgroundGachaItems;

    // Weighted selection
    const totalWeight = pool.reduce((acc, item) => acc + (item.probability || 10), 0);
    let rng = Math.random() * totalWeight;
    let pickedItem = pool[0];
    for (const item of pool) {
      rng -= (item.probability || 10);
      if (rng <= 0) {
        pickedItem = item;
        break;
      }
    }

    const isBg = pickedItem.category === "background";
    const ownsList = isBg 
      ? (currentStudent.studentOwnedBackgrounds || []) 
      : (currentStudent.studentOwnedDecorations || []);
      
    const duplicate = ownsList.includes(pickedItem.id);
    const originalPointsAfter = currentStudent.points - gachaCost;
    const finalPointsAfter = duplicate ? originalPointsAfter + 10 : originalPointsAfter;

    // Required Debug logs
    console.log("轉蛋前點數", currentStudent.points);
    console.log("轉蛋花費", gachaCost);
    console.log("轉蛋後點數", finalPointsAfter);

    const nextState: AppData = { ...appData };

    // Update student's state containing points and inventory
    nextState.students = appData.students.map((s) => {
      if (s.id === studentId) {
        let nextOwnedBgs = s.studentOwnedBackgrounds || [];
        let nextOwnedDecs = s.studentOwnedDecorations || [];
        let nextActiveBg = s.studentActiveBackground || "";
        let nextActiveDecs = s.studentActiveDecorations;
        if (!nextActiveDecs || Array.isArray(nextActiveDecs) || typeof nextActiveDecs !== "object") {
          nextActiveDecs = {};
        }
        if (s.studentActiveBackground && !nextActiveDecs["background"]) {
          nextActiveDecs = { ...nextActiveDecs, background: s.studentActiveBackground };
        }

        if (isBg) {
          if (!nextOwnedBgs.includes(pickedItem.id)) {
            nextOwnedBgs = [...nextOwnedBgs, pickedItem.id];
          }
        } else {
          if (!nextOwnedDecs.includes(pickedItem.id)) {
            nextOwnedDecs = [...nextOwnedDecs, pickedItem.id];
          }
        }

        const cat = getItemNormalizedCategory(pickedItem);
        const nextDecs = { ...nextActiveDecs };
        if (!nextDecs[cat]) {
          nextDecs[cat] = pickedItem.id;
        }

        const isRare = pickedItem.rarity === "rare" || pickedItem.rarity === "epic" || pickedItem.rarity === "legendary";

        return {
          ...s,
          points: finalPointsAfter,
          studentOwnedBackgrounds: nextOwnedBgs,
          studentOwnedDecorations: nextOwnedDecs,
          studentActiveBackground: nextDecs["background"] || nextActiveBg || "",
          studentActiveDecorations: nextDecs,
          ...(isRare ? { lastRareItemAt: Date.now() } : {})
        };
      }
      return s;
    });

    let savedState = nextState;
    if (duplicate) {
      savedState = appendPointLog(savedState, studentId, -gachaCost, "轉蛋抽獎", "學生", originalPointsAfter);
      savedState = appendPointLog(savedState, studentId, 10, "轉蛋退款", "系統", finalPointsAfter);
    } else {
      savedState = appendPointLog(savedState, studentId, -gachaCost, "轉蛋抽獎", "學生", originalPointsAfter);
    }

    // Append GachaHistory transaction record
    const gachaRecord = {
      id: "gacha_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      timestamp: new Date().toLocaleDateString("zh-TW", { hour12: false }) + " " + new Date().toLocaleTimeString("zh-TW", { hour12: false }),
      studentName: currentStudent.name,
      studentId: studentId,
      gachaType: pickedItem.category === "background" ? "背景轉蛋" : "裝飾轉蛋",
      costPoints: gachaCost,
      drawnItemName: pickedItem.name,
      pointsBefore: currentStudent.points,
      pointsAfter: finalPointsAfter,
    };

    savedState = {
      ...savedState,
      gachaHistoryList: [...(savedState.gachaHistoryList || []), gachaRecord]
    };

    // Trigger state changes and synchronous automated save to local storage & cloud database instantly
    setAppData(savedState);
    if (autoSave) {
      autoSave(savedState);
    }

    showSuccess(e, -gachaCost);

    showDialog({
      title: "🔮 裝飾與背景召喚成功！",
      message: `🎉 獲得【${getRarityInfo(pickedItem.rarity).icon} ${getRarityInfo(pickedItem.rarity).label}】級商品：\n👉【 ${pickedItem.name} (${categoryLabels[getItemNormalizedCategory(pickedItem)] || pickedItem.category}) 】\n${
        duplicate ? "⚠️ 此款你已經擁有過囉，系統自動退還 10 點數作為補償！" : "✨ 已成功派發至你的衣櫃，快去「背景」分頁穿戴吧！"
      }`,
      type: "alert",
      titleColor: "text-purple-600"
    });

    // Reset double-click defense after visual animation delay
    setTimeout(() => {
      setIsDrawingGacha(false);
    }, 1200);
  };

  // Determine actual background CSS linear gradients or image content
  let petBackgroundStyle = "linear-gradient(to bottom, #bae6fd, #e0f2fe)";
  if (currentStudent.studentActiveBackground) {
    const customBg = (appData.backgroundGachaItems || defaultBackgroundGachaItems).find(
      (item) => item.id === currentStudent.studentActiveBackground
    );
    if (customBg) {
      if (customBg.imageUrl) {
        petBackgroundStyle = `url(${customBg.imageUrl}) center/cover`;
      } else if (customBg.presetSvgMarkup && (customBg.presetSvgMarkup.includes("linear") || customBg.presetSvgMarkup.includes("radial"))) {
        petBackgroundStyle = customBg.presetSvgMarkup;
      } else {
        petBackgroundStyle = "linear-gradient(135deg, #a5b4fc 0%, #818cf8 100%)";
      }
    }
  } else if (currentStudent.equippedBackground && backgroundDB[currentStudent.equippedBackground]) {
    petBackgroundStyle = backgroundDB[currentStudent.equippedBackground].css;
  }

  return (
    <div className="modal-backdrop fixed inset-0 flex items-center justify-center p-1 sm:p-2 bg-black/60 backdrop-blur-sm z-[2000]">
      <div 
        className="game-box bg-white flex flex-col overflow-hidden border-[6px] border-gray-700 relative rounded-3xl shadow-2xl"
        style={{ width: "900px", height: "550px" }}
      >
        {/* Modal Header: Shrunk 40%, containing ONLY required student/pet details and points */}
        <div className="bg-[#F280B6] py-2 px-3.5 flex flex-row justify-between items-center border-b-[4px] border-gray-700 shrink-0 gap-2 overflow-hidden select-none">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-black text-white">
            <span className="text-sm md:text-base font-black bg-black/15 py-1 px-2.5 rounded-lg border border-white/25">
              👤 {currentStudent.name}
            </span>
            <span className="text-xs md:text-sm font-extrabold text-yellow-300">
              👾 {currentStudent.petName || "我的史萊姆"}
            </span>
            <span className="text-[10px] md:text-xs font-black bg-purple-700/50 px-2 py-0.5 rounded-full border border-purple-400">
              Lv.{currentStudent.pet?.level || 1}
            </span>
            <div className="text-[11px] md:text-xs font-black text-white/95 truncate max-w-[150px] sm:max-w-[300px]">
              🏅 {(!currentStudent.title || currentStudent.title === "等待發光中") ? computeStudentTitle(currentStudent) : currentStudent.title}
            </div>
          </div>
          
          <div className="shrink-0 flex items-center">
            <div className="bg-yellow-400 px-3 py-1 font-black text-gray-800 text-xs md:text-base flex items-center gap-1 hover:scale-102 transition-transform cursor-pointer rounded-xl border-[3px] border-gray-700 shadow-[2px_2px_0px_#2d3748]">
              <span>🪙 {currentStudent.points} 點</span>
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Board Viewport */}
        <div className="flex-1 relative bg-gray-50 overflow-hidden">
          <div className="absolute inset-0 w-full h-full flex flex-col md:flex-row overflow-hidden">
            
            {/* LEFT COLUMN (40% width): Slime Display & Metrics Deck */}
            <div className="w-full md:w-[40%] flex flex-col border-r-[4px] border-gray-700 bg-white overflow-hidden relative shrink-0">
              {/* Name description block */}
              <div className="p-3 bg-indigo-50/70 border-b-[3px] border-gray-700 flex flex-col select-none relative shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-indigo-950 text-base leading-tight">
                      {currentStudent.petName || "我的史萊姆"}
                    </span>
                    <span className="bg-purple-100 text-purple-700 font-extrabold px-1.5 py-0.5 rounded-lg border border-purple-300 text-[10px] shrink-0">
                      Lv.{currentStudent.pet?.level || 1}
                    </span>
                    <button
                      onClick={openRenamePetModal}
                      className="text-xs p-0.5 hover:scale-110 active:scale-95 transition-transform cursor-pointer leading-none"
                      title="修改寵物名稱"
                    >
                      ✏️
                    </button>
                  </div>
                  
                  {/* Points display */}
                  <div className="text-[10px] sm:text-xs font-bold text-gray-500 flex items-center shrink-0">
                    🏆 {currentStudent.points} 點數
                  </div>
                </div>
                <div className="text-[10px] text-gray-500 font-black text-left mt-1">
                  🏅 {(!currentStudent.title || currentStudent.title === "等待發光中") ? computeStudentTitle(currentStudent) : currentStudent.title}
                </div>
              </div>

              {/* Slime Home Playground Container */}
              <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-end pb-6 select-none shadow-inner" style={{ background: petBackgroundStyle }}>
                {/* Layer decorations mapping */}
                {(() => {
                  const activeDecs = currentStudent.studentActiveDecorations || {};
                  const mappedBg = currentStudent.studentActiveBackground;
                  
                  const categoryItemIds: Record<string, string> = {
                    background: mappedBg || activeDecs["background"] || "",
                    decoration: activeDecs["decoration"] || "",
                    furniture: activeDecs["furniture"] || "",
                    object: activeDecs["object"] || activeDecs["prop"] || "",
                    effect: activeDecs["effect"] || "",
                  };

                  const renderLayer = (itemId: string, zIndexClass: string) => {
                    if (!itemId) return null;
                    const customItemsList = appData.backgroundGachaItems || defaultBackgroundGachaItems;
                    const customBg = customItemsList.find((x) => x.id === itemId);
                    if (!customBg) return null;

                    if (customBg.imageUrl) {
                      return (
                        <div
                          key={itemId}
                          className={`absolute inset-0 w-full h-full bg-center bg-cover pointer-events-none ${zIndexClass} overflow-hidden`}
                          style={{ backgroundImage: `url(${customBg.imageUrl})` }}
                        />
                      );
                    } else {
                      return (
                        <div className={`absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none ${zIndexClass} opacity-20 overflow-hidden`}>
                          <span className="text-[10rem] md:text-[12rem] drop-shadow-2xl">{customBg.presetSvgMarkup || "🎁"}</span>
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

                {/* Companion Speech Bubble */}
                {bubbleShow && (
                  <div
                    className="speech-bubble absolute show text-xs font-black z-30 max-w-[80%]"
                    style={{ left: "50%", bottom: "40%", transform: "translateX(-50%)" }}
                  >
                    {bubbleText}
                  </div>
                )}

                {/* Slime Vector Core */}
                <div
                  onClick={handlePokePet}
                  className="w-[140px] h-[140px] md:w-[170px] md:h-[170px] relative z-25 cursor-pointer transition-transform hover:scale-105 active:scale-95"
                  style={{ transformOrigin: "bottom center" }}
                  dangerouslySetInnerHTML={{
                    __html: generateDetailedSlimeSVG(currentStudent)
                  }}
                />
              </div>

              {/* MBTI Ribbon detail toggler box */}
              {currentStudent.hasChosenEgg && showMbtiDetail && (
                <div className="absolute inset-x-2 bottom-[45%] top-2 z-[45] bg-white/95 backdrop-blur-md rounded-2xl border-[3.5px] border-gray-700 p-3.5 shadow-2xl flex flex-col justify-between overflow-y-auto custom-scroll text-[11px] leading-tight text-gray-700">
                  <div className="flex items-center justify-between border-b pb-1.5 mb-2">
                    <span className="font-extrabold text-[#5B21B6]">🧠 {calculateStudentMBTI(currentStudent).type} | {getPersonalityTitle(currentStudent)}</span>
                    <button onClick={() => setShowMbtiDetail(false)} className="text-gray-400 hover:text-red-500 font-bold text-xs cursor-pointer">✕ 關閉</button>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-purple-100/50 p-2 text-[10px] text-purple-950 rounded-lg border border-purple-250">
                      性格稱號：<span className="text-purple-650 font-black">{getPersonalityTitle(currentStudent)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 bg-gray-50 p-1.5 rounded border border-gray-200">
                      <div>
                        <span className="text-gray-400 text-[8px] block">🧠 智慧值</span>
                        <strong className="text-gray-700">{currentStudent.stats?.intelligence || 0} / 100</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[8px] block">🎨 藝術力</span>
                        <strong className="text-gray-700">{currentStudent.stats?.art || 0} / 100</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[8px] block">🏃 活力值</span>
                        <strong className="text-gray-700">{currentStudent.stats?.energy || 0} / 100</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 text-[8px] block">🍪 最近偏好</span>
                        <strong className="text-gray-700 truncate block">{calculateStudentMBTI(currentStudent).recentPref === "無" ? "尚未餵食" : calculateStudentMBTI(currentStudent).recentPref}</strong>
                      </div>
                    </div>
                    <p className="text-gray-600 leading-normal text-[10px] border-t pt-1">
                      {calculateStudentMBTI(currentStudent).description}
                    </p>
                  </div>
                </div>
              )}

              {/* SCROLLABLE STATS CARDS METRICS DECK (35% height footer inside left area) */}
              <div 
                style={{ height: "280px" }}
                className="border-t-[3px] border-gray-700 bg-indigo-50/20 p-2 overflow-y-auto custom-scroll space-y-2 select-none"
              >
                {/* 1. MBTI Badge trigger card */}
                {currentStudent.hasChosenEgg && (
                  <div className="p-2 bg-gradient-to-r from-indigo-55/10 to-pink-55/10 border-2 border-indigo-200 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-1.5 text-left leading-none">
                      <span className="text-base">🧬</span>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-bold text-gray-400">性格 MBTI</span>
                        <span className="text-[10px] font-black text-[#5B21B6] mt-0.5">
                          {calculateStudentMBTI(currentStudent).type} ｜ <span className="text-pink-600">{calculateStudentMBTI(currentStudent).title}</span>
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowMbtiDetail(!showMbtiDetail)}
                      className="btn-game bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] py-1 px-2.5 shadow-none rounded-lg font-black transition-all cursor-pointer"
                    >
                      {showMbtiDetail ? "隱藏" : "查看詳細"}
                    </button>
                  </div>
                )}

                {/* 9-Stat Growth Panel - Live Refreshed */}
                {currentStudent.hasChosenEgg && currentStudent.stats && (
                  <div className="bg-white border-2 border-gray-300 p-2 rounded-xl shadow-sm text-left text-[10px] space-y-1.5 font-bold">
                    <p className="text-[#3B82F6] font-black border-b pb-1 flex items-center justify-between text-[11px]">
                      <span>📈 史萊姆修練能力值</span>
                      <span className="text-[9px] text-gray-400">上課即時提升</span>
                    </p>
                    <div className="grid grid-cols-3 gap-1 shadow-inner p-1 bg-gray-50/40 rounded-lg">
                      <div className="flex flex-col p-1 border border-indigo-50 rounded bg-white items-center text-center">
                        <span className="text-gray-400 text-[8px]">🧠 智慧</span>
                        <strong className="text-gray-800 font-extrabold text-[10px] mt-0.5">{currentStudent.stats.intelligence || 0}</strong>
                      </div>
                      <div className="flex flex-col p-1 border border-indigo-50 rounded bg-white items-center text-center">
                        <span className="text-gray-400 text-[8px]">🎨 創造力</span>
                        <strong className="text-gray-800 font-extrabold text-[10px] mt-0.5">{currentStudent.stats.creativity || 0}</strong>
                      </div>
                      <div className="flex flex-col p-1 border border-indigo-50 rounded bg-white items-center text-center">
                        <span className="text-gray-400 text-[8px]">⚡ 活力</span>
                        <strong className="text-gray-800 font-extrabold text-[10px] mt-0.5">{currentStudent.stats.energy || 0}</strong>
                      </div>
                      <div className="flex flex-col p-1 border border-indigo-50 rounded bg-white items-center text-center">
                        <span className="text-gray-400 text-[8px]">🔍 探索</span>
                        <strong className="text-gray-800 font-extrabold text-[10px] mt-0.5">{currentStudent.stats.exploration || 0}</strong>
                      </div>
                      <div className="flex flex-col p-1 border border-indigo-50 rounded bg-white items-center text-center">
                        <span className="text-gray-400 text-[8px]">💬 表達</span>
                        <strong className="text-gray-800 font-extrabold text-[10px] mt-0.5">{currentStudent.stats.expression || 0}</strong>
                      </div>
                      <div className="flex flex-col p-1 border border-indigo-50 rounded bg-white items-center text-center">
                        <span className="text-gray-400 text-[8px]">🤝 合作</span>
                        <strong className="text-gray-800 font-extrabold text-[10px] mt-0.5">{currentStudent.stats.cooperation || 0}</strong>
                      </div>
                      <div className="flex flex-col p-1 border border-indigo-50 rounded bg-white items-center text-center">
                        <span className="text-gray-400 text-[8px]">📐 邏輯</span>
                        <strong className="text-gray-800 font-extrabold text-[10px] mt-0.5">{currentStudent.stats.logic || 0}</strong>
                      </div>
                      <div className="flex flex-col p-1 border border-indigo-50 rounded bg-white items-center text-center">
                        <span className="text-gray-400 text-[8px]">📖 知識</span>
                        <strong className="text-gray-800 font-extrabold text-[10px] mt-0.5">{currentStudent.stats.knowledge || 0}</strong>
                      </div>
                      <div className="flex flex-col p-1 border border-indigo-50 rounded bg-white items-center text-center">
                        <span className="text-gray-400 text-[8px]">🎭 藝術</span>
                        <strong className="text-gray-800 font-extrabold text-[10px] mt-0.5">{currentStudent.stats.art || 0}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Today Birthday Banner */}
                {(isTodayBirthday(currentStudent.studentBirthday) || currentStudent.birthdayBonusEnabled) && (
                  <div className="p-2 bg-gradient-to-r from-red-100 to-amber-100 border border-amber-300 rounded-xl flex items-center gap-2 shadow-sm text-left text-[10px] text-amber-900 font-bold leading-tight">
                    <span className="text-lg">🎂</span>
                    <div>
                      <p className="text-red-750 font-black">今日壽星福利！</p>
                      <p className="text-amber-850 text-[8px]">所有任務獲得點數翻倍 200%！🌻</p>
                    </div>
                  </div>
                )}

                {/* 3. Zodiac and Wish Double-Row */}
                {currentStudent.hasChosenEgg && (
                  <div className="grid grid-cols-2 gap-2 font-bold text-left text-[10px] leading-tight">
                    {/* 星座 */}
                    <div className="bg-white border-2 border-gray-300 p-2 rounded-xl flex items-center gap-1.5 shadow-sm">
                      <span className="text-base">🌌</span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[7px] text-gray-400">守護星座</span>
                        <span className="text-[9px] text-indigo-800 font-black truncate max-w-[60px]">
                          {currentStudent.studentZodiac || getZodiac(currentStudent.studentBirthday) || "雙子座"}
                        </span>
                      </div>
                    </div>
                    {/* 每日願望 */}
                    <div className={`border-2 p-2 rounded-xl flex items-center gap-1.5 shadow-sm min-w-0 ${
                      currentStudent.todayWish?.completed 
                        ? "bg-emerald-50 border-emerald-300 text-emerald-950" 
                        : "bg-amber-50 border-amber-200 text-amber-950"
                    }`}>
                      <span className="text-base">{currentStudent.todayWish?.completed ? "✅" : "💡"}</span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[7px] text-gray-400">願望</span>
                        <span className="text-[9px] font-black truncate max-w-[60px]">
                          {currentStudent.todayWish?.detail || "想吃水果"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Level Progress Bar */}
                <div className="bg-white border-2 border-gray-300 p-2 rounded-xl space-y-1 shadow-sm text-left text-[10px] font-bold">
                  <div className="flex justify-between items-center text-purple-700 font-black">
                    <span>👾 Level {currentStudent.pet?.level || 1} 經驗成長</span>
                    <span>{currentStudent.pet?.exp} / {45 + (currentStudent.pet?.level || 1) * 10}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 border border-gray-400 rounded-full overflow-hidden relative">
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            ((currentStudent.pet?.exp || 0) / (45 + (currentStudent.pet?.level || 1) * 10)) * 100
                          )
                        )}%`
                      }}
                      className="h-full bg-purple-500 transition-all duration-300"
                    />
                  </div>
                </div>

                {/* 5. Mood Level Bar */}
                <div className="bg-white border-2 border-gray-300 p-2 rounded-xl space-y-1 shadow-sm text-left text-[10px] font-bold">
                  <div className="flex justify-between items-center text-rose-500 font-black">
                    <span>💖 陪伴心情值</span>
                    <span>{Math.min(100, Math.max(0, currentStudent.petStats?.happy || 60))}/100</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 border border-gray-400 rounded-full overflow-hidden relative">
                    <div
                      style={{ width: `${Math.min(100, Math.max(0, currentStudent.petStats?.happy || 60))}%` }}
                      className="h-full bg-rose-500 transition-all duration-300"
                    />
                  </div>
                </div>

                {/* 6. Food Stamina Bar */}
                {(() => {
                  const hungerValue = Math.min(100, Math.max(0, currentStudent.currentHunger !== undefined ? currentStudent.currentHunger : (currentStudent.petStats?.stamina !== undefined ? currentStudent.petStats.stamina : 50)));
                  let barColor = "bg-green-500";
                  let textColor = "text-green-600";
                  if (hungerValue >= 80) {
                    barColor = "bg-green-500";
                    textColor = "text-green-600";
                  } else if (hungerValue >= 50) {
                    barColor = "bg-yellow-400";
                    textColor = "text-yellow-600";
                  } else if (hungerValue >= 20) {
                    barColor = "bg-orange-500";
                    textColor = "text-orange-500";
                  } else {
                    barColor = "bg-red-500 animate-pulse";
                    textColor = "text-red-600 font-bold animate-pulse";
                  }
                  return (
                    <div className="bg-white border-2 border-gray-300 p-2 rounded-xl space-y-1 shadow-sm text-left text-[10px] font-bold">
                      <div className={`flex justify-between items-center ${textColor} font-black`}>
                        <span>🍖 飽食度</span>
                        <span>{hungerValue}/100</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 border border-gray-400 rounded-full overflow-hidden relative">
                        <div
                          style={{ width: `${hungerValue}%` }}
                          className={`h-full ${barColor} transition-all duration-300`}
                        />
                      </div>
                    </div>
                  );
                })()}

              </div>
            </div>

            {/* RIGHT COLUMN (60% width): Operation Tabs Content Area */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden pb-12 md:pb-0">
              
              {/* Premium Control Pad grid (7 buttons mapped) */}
              <div className="bg-gray-200 border-b-[4px] border-gray-700 shrink-0 select-none">
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 p-2 bg-gray-300 font-sans">
                  
                  {/* Tab 1: Tasks */}
                  <button
                    onClick={() => {
                      setActiveShopTab("tasks");
                      setActiveGame(null);
                    }}
                    className={`py-1.5 px-1 text-xs font-black flex flex-col items-center justify-center gap-0.5 border-t-[3px] border-x-[3px] rounded-t-xl hover:bg-sky-50 transition-all cursor-pointer ${
                      activeShopTab === "tasks"
                        ? "bg-sky-500 text-white border-sky-700 scale-[1.02] translate-y-[2px]"
                        : "bg-gray-100 text-gray-500 border-gray-400"
                    }`}
                  >
                    <span className="text-base sm:text-lg">📋</span>
                    <span className="text-[10px] leading-none">任務</span>
                  </button>

                  {/* Tab 2: Feeding */}
                  <button
                    onClick={() => {
                      setActiveShopTab("shop-food");
                      setActiveGame(null);
                    }}
                    className={`py-1.5 px-1 text-xs font-black flex flex-col items-center justify-center gap-0.5 border-t-[3px] border-x-[3px] rounded-t-xl hover:bg-orange-50 transition-all cursor-pointer ${
                      activeShopTab === "shop-food"
                        ? "bg-orange-500 text-white border-orange-700 scale-[1.02] translate-y-[2px]"
                        : "bg-gray-100 text-orange-600 border-gray-400"
                    }`}
                  >
                    <span className="text-base sm:text-lg">🍎</span>
                    <span className="text-[10px] leading-none">餵食</span>
                  </button>

                  {/* Tab 3: Learning */}
                  <button
                    onClick={() => {
                      setActiveShopTab("shop-pack");
                      setActiveGame(null);
                    }}
                    className={`py-1.5 px-1 text-xs font-black flex flex-col items-center justify-center gap-0.5 border-t-[3px] border-x-[3px] rounded-t-xl hover:bg-blue-50 transition-all cursor-pointer ${
                      activeShopTab === "shop-pack"
                        ? "bg-blue-500 text-white border-blue-700 scale-[1.02] translate-y-[2px]"
                        : "bg-gray-100 text-blue-600 border-gray-400"
                    }`}
                  >
                    <span className="text-base sm:text-lg">📚</span>
                    <span className="text-[10px] leading-none">學習</span>
                  </button>

                  {/* Tab 4: Gacha */}
                  <button
                    onClick={() => {
                      setActiveShopTab("shop-gacha");
                      setActiveGame(null);
                    }}
                    className={`py-1.5 px-1 text-xs font-black flex flex-col items-center justify-center gap-0.5 border-t-[3px] border-x-[3px] rounded-t-xl hover:bg-purple-50 transition-all cursor-pointer ${
                      activeShopTab === "shop-gacha"
                        ? "bg-purple-500 text-white border-purple-700 scale-[1.02] translate-y-[2px]"
                        : "bg-gray-100 text-purple-600 border-gray-400"
                    }`}
                  >
                    <span className="text-base sm:text-lg">🎲</span>
                    <span className="text-[10px] leading-none">轉蛋</span>
                  </button>

                  {/* Tab 5: Games */}
                  <button
                    onClick={() => {
                      setActiveShopTab("shop-games");
                      setActiveGame(null);
                    }}
                    className={`py-1.5 px-1 text-xs font-black flex flex-col items-center justify-center gap-0.5 border-t-[3px] border-x-[3px] rounded-t-xl hover:bg-emerald-55 transition-all cursor-pointer ${
                      activeShopTab === "shop-games"
                        ? "bg-emerald-500 text-white border-emerald-700 scale-[1.02] translate-y-[2px]"
                        : "bg-gray-100 text-emerald-600 border-gray-400"
                    }`}
                  >
                    <span className="text-base sm:text-lg">🎮</span>
                    <span className="text-[10px] leading-none">陪伴</span>
                  </button>

                  {/* Tab 6: Collections */}
                  <button
                    onClick={() => {
                      setActiveShopTab("shop-collection");
                      setActiveGame(null);
                    }}
                    className={`py-1.5 px-1 text-xs font-black flex flex-col items-center justify-center gap-0.5 border-t-[3px] border-x-[3px] rounded-t-xl hover:bg-pink-50 transition-all cursor-pointer ${
                      activeShopTab === "shop-collection"
                        ? "bg-[#F280B6] text-white border-[#be5b8b] scale-[1.02] translate-y-[2px]"
                        : "bg-gray-100 text-[#F280B6] border-gray-400"
                    }`}
                  >
                    <span className="text-base sm:text-lg">🎒</span>
                    <span className="text-[10px] leading-none">收藏</span>
                  </button>

                  {/* Tab 7: Achievements */}
                  <button
                    onClick={() => {
                      setActiveShopTab("shop-achievement");
                      setActiveGame(null);
                    }}
                    className={`py-1.5 px-1 text-xs font-black flex flex-col items-center justify-center gap-0.5 border-t-[3px] border-x-[3px] rounded-t-xl hover:bg-rose-50 transition-all cursor-pointer ${
                      activeShopTab === "shop-achievement"
                        ? "bg-rose-500 text-white border-rose-700 scale-[1.02] translate-y-[2px]"
                        : "bg-gray-100 text-rose-500 border-gray-400"
                    }`}
                  >
                    <span className="text-base sm:text-lg">🏆</span>
                    <span className="text-[10px] leading-none">成就</span>
                  </button>

                </div>
              </div>

              {/* Dynamic Content Core viewport */}
              <div className="flex-1 p-4 overflow-y-auto bg-slate-50/50 custom-scroll relative">
                
                {/* 1. TASKS TAB RENDER */}
                {activeShopTab === "tasks" && (
                  <div className="space-y-4">
                    
                    {/* Time limit tasks (限時限期任務) */}
                    <div className="bg-white p-4 border-[3px] border-gray-700 rounded-2xl text-left space-y-3 shadow-md select-none">
                      <h3 className="text-lg font-black text-blue-600 border-b pb-1.5 mb-2.5 flex items-center gap-1.5 leading-none">
                        <span>⏳</span> 限時限期任務（全班挑戰）
                      </h3>
                      {(() => {
                        const timedTasks = appData.timedTasks || [];
                        const validTimed = timedTasks.filter(item => item.isActive);

                        if (validTimed.length === 0) {
                          return (
                            <p className="text-xs text-gray-400 italic py-3 text-center">
                              ✨ 本時段尚無發布中的限時挑戰任務哦！
                            </p>
                          );
                        }

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {validTimed.map((item) => {
                              const alreadyClaimed = item.completedBy.includes(studentId);
                              const rem = getTimedRemaining(item);
                              const expired = rem <= 0 || item.expired;

                              return (
                                <div key={item.id} className="p-3 border-[2.5px] border-red-300 bg-red-50/30 rounded-xl text-left flex flex-col justify-between">
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-start gap-1">
                                      <h4 className="font-extrabold text-sm text-gray-805 leading-tight">{item.title}</h4>
                                      <span className="text-[10px] text-red-500 font-extrabold px-1 bg-red-100 rounded border border-red-200 whitespace-nowrap">
                                        限時挑戰
                                      </span>
                                    </div>
                                    <div className="text-[10px] font-black text-orange-500 mt-1">
                                      點數儲蓄 +{item.points} 點
                                    </div>
                                    <div className="text-[10px] text-gray-500 font-bold">
                                      ⏰ 剩餘：{formatSeconds(rem)}
                                    </div>
                                  </div>

                                  <button
                                    onClick={(e) => {
                                      const realIndex = appData.timedTasks.findIndex(x => x.id === item.id);
                                      if (realIndex !== -1) {
                                        handleCompleteTimedTask(realIndex, e);
                                      }
                                    }}
                                    disabled={alreadyClaimed || expired}
                                    className={`btn-game mt-2 w-full py-1.5 text-xs font-black rounded-lg ${
                                      alreadyClaimed
                                        ? "bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed"
                                        : expired
                                          ? "bg-gray-400 text-white cursor-not-allowed"
                                          : "bg-red-505 bg-red-500 text-white hover:scale-101 shadow-sm cursor-pointer"
                                    }`}
                                  >
                                    {alreadyClaimed ? "✓ 已完成挑戰" : expired ? "已逾期" : "⚡ 立即領取獎勵"}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Group goals (小組團隊合作任務) */}
                    <div className="bg-white p-4 border-[3px] border-gray-700 rounded-2xl text-left space-y-3 shadow-md select-none">
                      <h3 className="text-lg font-black text-purple-600 border-b pb-1.5 mb-2.5 flex items-center gap-1.5 leading-none">
                        <span>👥</span> 同舟共濟：小組努力大作戰目標
                      </h3>
                      {(() => {
                        const matchedTeam = (appData.groups || []).find((team) =>
                          (team.members || []).includes(studentId)
                        );
                        if (!matchedTeam) {
                          return (
                            <p className="text-xs text-gray-400 italic py-3 text-center">
                              🔍 目前你還沒有小組分配哦，請老師幫你分組吧！
                            </p>
                          );
                        }

                        const targetGoal = 100;
                        const memberStudents = appData.students.filter(s => matchedTeam.members.includes(s.id));
                        const currentSum = memberStudents.reduce((sum, s) => sum + s.points, 0);
                        const percentage = Math.min(100, Math.round((currentSum / targetGoal) * 100));

                        return (
                          <div className="bg-purple-50/30 p-3 rounded-xl border border-purple-100 text-left space-y-2">
                            <div className="flex justify-between items-center text-xs font-black">
                              <span className="text-purple-900">💥 目標組別：【 {matchedTeam.name} 】</span>
                              <span className="text-purple-600">{currentSum} / {targetGoal} 點</span>
                            </div>
                            <div className="h-2 w-full bg-gray-200 border border-gray-300 rounded-full overflow-hidden relative">
                              <div
                                style={{ width: `${percentage}%` }}
                                className="h-full bg-purple-500 transition-all duration-300"
                              />
                            </div>
                            <p className="text-[10px] text-gray-500 font-bold leading-normal">
                              🚀 小組所有成員獲得點數時，會自動累積。達成目標 {targetGoal} 點即可向老師申請兌換大獎勵！🎉
                            </p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Individual goals task card - click to claim directly, no teacher review */}
                    <div className="bg-white p-4 border-[3px] border-gray-700 rounded-2xl text-left space-y-3 shadow-md">
                      <h3 className="text-lg font-black text-emerald-600 border-b pb-1.5 mb-2.5 flex items-center gap-1.5 leading-none select-none">
                        <span>📋</span> 我的日常課堂任務
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(() => {
                          const list = currentStudent.tasks || [];
                          const activeCount = list.filter(t => t.status !== "claimed" && !t.done).length;

                          if (activeCount === 0) {
                            return (
                              <div className="col-span-full py-6 text-center text-gray-400 font-extrabold text-sm bg-gray-50 border-[2px] border-dashed border-gray-300 rounded-xl">
                                📋 目前尚無進行中的個人任務！快向老師申請新任務吧 ☀️
                              </div>
                            );
                          }

                          return list.map((t, index) => {
                            if (t.status === "claimed" || t.done) return null;

                            return (
                              <div key={t.id} className="p-3 bg-white border-2 border-gray-300 rounded-xl flex flex-col justify-between text-left">
                                <div>
                                  <div className="text-base font-black flex items-center justify-between">
                                    <span>{t.icon || "⭐"} {t.title}</span>
                                    {t.isRepeatable && (
                                      <span className="text-[8px] bg-purple-100 text-purple-800 border border-purple-200 px-1.5 py-0.2 rounded-full font-bold shrink-0">
                                        🔁 可重複
                                      </span>
                                    )}
                                  </div>
                                  {t.description && (
                                    <p className="text-[10px] text-gray-500 bg-gray-50/50 p-1.5 rounded mt-1.5 font-medium leading-normal">
                                      說明：{t.description}
                                    </p>
                                  )}
                                  <div className="flex gap-2.5 items-center mt-2 select-none">
                                    <span className="text-orange-500 font-black text-sm">+{t.points} 點數</span>
                                    {t.dueDate && (
                                      <span className="text-[9px] text-gray-400 font-bold ml-auto">
                                        📅 截止：{t.dueDate}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <button
                                  onClick={(e) => handleClaimIndivTaskReward(index, e)}
                                  className="btn-game mt-3 w-full py-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-black hover:scale-102 flex items-center justify-center gap-1.5 shadow-[0px_2.5px_0px_#047857] cursor-pointer"
                                >
                                  <i className="fas fa-check-circle"></i> 完成並直接領取點數！
                                </button>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Task History Logs */}
                    <div className="bg-white p-4 border-[3px] border-gray-700 rounded-2xl text-left space-y-3 shadow-md select-none">
                      <h3 className="text-base font-black text-indigo-600 border-b pb-1">
                        🏆 本期已解鎖任務紀錄
                      </h3>
                      {(() => {
                        const logs = currentStudent.completedTaskHistory || [];
                        if (logs.length === 0) {
                          return (
                            <p className="text-xs text-gray-400 italic py-2 text-center">
                              🔍 尚未有已完成存檔的任務，快快去挑戰任務吧！
                            </p>
                          );
                        }

                        return (
                          <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scroll pr-1">
                            {logs.map((log, idx) => (
                              <div key={log.id + "_" + idx} className="text-[11px] flex justify-between items-center bg-gray-50/80 border border-gray-200 p-2 rounded-lg hover:bg-gray-100">
                                <div className="text-left leading-tight">
                                  <p className="font-extrabold text-gray-750">✔️ {log.title}</p>
                                  <p className="text-[8px] text-gray-400 mt-0.5">📅 完成：{log.completedAt}</p>
                                </div>
                                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-black text-[10px] shrink-0">
                                  +{log.points} 點
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                  </div>
                )}

                {/* 2. FEEDING TAB RENDER */}
                {activeShopTab === "shop-food" && (
                  <div className="space-y-4 text-left">
                    <div className="text-xs font-bold text-gray-500 mb-2 border-b pb-1">
                      🧁 購買食物餵食史萊姆，可以獲得大量經驗值 (EXP) 並補充飽食度、心情！
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Object.entries(getCombinedFoods()).map(([foodId, food]: [string, any]) => (
                        <button
                          key={foodId}
                          onClick={(e) => handleFeedPet(foodId, e)}
                          className="btn-game bg-white hover:bg-orange-50/30 p-3 flex flex-col items-center justify-between text-center border-[3px] border-gray-700 shadow-[3px_3px_0px_#2d3748] hover:scale-102 transition-transform cursor-pointer h-auto min-h-[140px]"
                        >
                          <span className="text-4xl">{food.icon}</span>
                          <div className="space-y-0.5 mt-2 w-full">
                            <span className="font-black text-sm text-gray-800 block">{food.name}</span>
                            <span className="text-[10px] bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 font-black inline-block">
                              {food.cost} 點數 ｜ EXP +{food.exp}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. LEARNING TAB RENDER */}
                {activeShopTab === "shop-pack" && (
                  <div className="space-y-4 text-left">
                    <div className="text-xs font-bold text-gray-500 mb-2 border-b pb-1">
                      🎓 培訓特定的學術學科，會直接影響史萊姆未來的心理人格 (MBTI) 成長特徵喔。
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(learningDB).map(([courseId, course]) => {
                        const statNames: Record<string, string> = {
                          wisdom: "智慧",
                          expression: "表達",
                          logic: "邏輯",
                          exploration: "探索",
                          knowledge: "知識",
                          cooperation: "合作",
                          creativity: "創造力",
                          art: "藝術",
                          vitality: "活力"
                        };
                        const eff = courseEffectMap[course.name] || courseEffectMap[courseId];
                        let bonusText = "";
                        if (eff) {
                          const parts: string[] = [];
                          Object.entries(eff.stats).forEach(([k, v]) => {
                            const name = statNames[k] || k;
                            parts.push(`${name} +${v}`);
                          });
                          if (eff.happy) {
                            parts.push(`心情 +${eff.happy}`);
                          }
                          bonusText = parts.join(" ｜ ");
                        }

                        return (
                          <button
                            key={courseId}
                            onClick={(e) => handleLearnCourse(courseId, e)}
                            className="btn-game bg-white hover:bg-yellow-50 p-3 rounded-xl text-left flex flex-col items-start h-auto border-[3px] border-gray-700 shadow-[2px_2px_0px_rgba(0,0,0,0.15)] hover:scale-101 cursor-pointer"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-2xl">{course.icon}</span>
                              <span className="font-black text-sm text-gray-800">{course.name}</span>
                            </div>
                            <div className="text-[10px] text-gray-500 font-bold mb-1">
                              消耗 <span className="text-indigo-600 font-black">{course.cost} 點</span>
                            </div>
                            <div className="text-[9px] font-black text-indigo-700 bg-indigo-50/50 border border-indigo-200 rounded px-2 py-1 w-full">
                              <span className="text-[9.5px] block font-extrabold text-slate-800 mb-0.5">本課程可提升：</span>
                              <span className="text-indigo-600 font-bold block">{bonusText} ｜ 經驗值 +{course.exp}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Learning Logs */}
                    <div className="mt-4 border-t pt-3">
                      <div className="font-black text-xs text-gray-650 mb-2">最近學習歷程：</div>
                      <div className="space-y-1 text-[11px] text-gray-600">
                        {currentStudent.pet?.learningLog && currentStudent.pet.learningLog.length > 0 ? (
                          currentStudent.pet.learningLog
                            .slice(-4)
                            .reverse()
                            .map((log, idx) => (
                              <div key={idx} className="p-1.5 bg-gray-50 border border-gray-200 rounded-md">
                                ⏱️ {log.time}：參加了「{log.course}」，{log.note}。
                              </div>
                            ))
                        ) : (
                          <div className="text-gray-400">尚無學習歷程。快去上藝術或體育課吧！</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. GACHA TAB RENDER */}
                {activeShopTab === "shop-gacha" && (
                  <div className="flex flex-col items-center justify-center text-center p-4 min-h-[300px]">
                    <div className="max-w-md space-y-4">
                      <span className="text-6xl animate-pulse inline-block">🔮</span>
                      <h3 className="text-xl font-black text-purple-950 block">
                        美化空間：背景衣櫃豪華轉蛋模組
                      </h3>
                      <p className="text-xs text-gray-550 font-bold leading-normal">
                        每次抽取需要花費 <strong>30 點數</strong>，會隨機抽取出一件背景或精美的家居掛件飾品。若是抽到重複的物品，系統會<strong>自動為你退給補償款 10 點數</strong>。
                      </p>
                      
                      <button
                        onClick={handleDrawGacha}
                        disabled={isDrawingGacha}
                        className="btn-game bg-purple-500 hover:bg-purple-600 disabled:bg-purple-400 disabled:opacity-75 disabled:cursor-not-allowed disabled:scale-100 text-white font-extrabold py-3.5 px-8 text-xl rounded-2xl w-full max-w-xs shadow-[3px_3px_0px_#4c1d95] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                      >
                        {isDrawingGacha ? "🔮 召喚中..." : "🔮 立即轉蛋 (30點)"}
                      </button>

                      <div className="flex gap-3 text-[10px] font-black bg-white p-2.5 rounded-xl border-2 border-purple-200 justify-center flex-wrap select-none">
                        <span className="text-gray-450">🟢 普通 60%</span>
                        <span className="text-blue-500">🔵 稀有 25%</span>
                        <span className="text-orange-500">🟠 傳說 10%</span>
                        <span className="text-purple-600">🦄 神話 5%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. GAMES TAB RENDER */}
                {activeShopTab === "shop-games" && (() => {
                  const playData = getPlayData();

                  return (
                    <div className="flex flex-col gap-3 text-left">
                      
                      {/* CD / Plays counters */}
                      <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-2 border-emerald-400 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 select-none">
                        <div>
                          <span className="text-sm font-black text-emerald-855 block">🎮 陪伴史萊姆（互動小遊戲）</span>
                          <span className="text-[10px] text-gray-500 font-bold mt-1 block">
                            每次隨機抽取：<strong>猜硬幣、猜拳 或 井字棋</strong>。每次遊玩冷卻 1 小時，今日累計心情：+{playData.moodIncrease}/20。
                          </span>
                        </div>
                        
                        <div className="bg-white/90 p-2 border border-emerald-200 rounded-lg shrink-0 flex gap-4 text-center">
                          <div>
                            <p className="text-[8px] text-gray-400 font-black">今日剩餘次數</p>
                            <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-250 px-1.5 py-0.5 rounded mt-0.5 inline-block font-sans">
                              {playData.remainingPlays} / 3 次
                            </span>
                          </div>
                          <div>
                            <p className="text-[8px] text-gray-400 font-black">遊玩狀態</p>
                            {playData.remainingCd > 0 ? (
                              <span className="text-red-500 text-[10px] font-black shrink-0 animate-pulse">
                                ⏳ 等待 {Math.floor(playData.remainingCd / 60)}分{playData.remainingCd % 60}秒
                              </span>
                            ) : playData.count >= 3 ? (
                              <span className="text-gray-400 text-[9px] font-black">明日再戰</span>
                            ) : (
                              <span className="text-emerald-500 text-[10px] font-black animate-bounce inline-block">🟢 可挑戰！</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Launch game buttons */}
                      {!activeGame && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Game 1 */}
                          <button
                            onClick={() => setActiveGame("coin")}
                            disabled={playData.remainingCd > 0 || playData.count >= 3}
                            className={`btn-game p-4 rounded-xl text-center flex flex-col items-center justify-between min-h-[140px] border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.15)] ${
                              playData.remainingCd > 0 || playData.count >= 3
                                ? "bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed"
                                : "bg-white hover:bg-emerald-50 border-gray-700 hover:scale-102 cursor-pointer"
                            }`}
                          >
                            <span className="text-3xl">🪙</span>
                            <div className="mt-2 text-center w-full">
                              <span className="block font-black text-sm text-gray-800">猜硬幣</span>
                              <span className="text-[8px] text-gray-400 font-bold block mt-0.5">預測正反，考驗直覺</span>
                            </div>
                          </button>

                          {/* Game 2 */}
                          <button
                            onClick={() => setActiveGame("rps")}
                            disabled={playData.remainingCd > 0 || playData.count >= 3}
                            className={`btn-game p-4 rounded-xl text-center flex flex-col items-center justify-between min-h-[140px] border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.15)] ${
                              playData.remainingCd > 0 || playData.count >= 3
                                ? "bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed"
                                : "bg-white hover:bg-emerald-50 border-gray-700 hover:scale-102 cursor-pointer"
                            }`}
                          >
                            <span className="text-3xl">✌️✊🖐️</span>
                            <div className="mt-2 text-center w-full">
                              <span className="block font-black text-sm text-gray-800">剪刀石頭布</span>
                              <span className="text-[8px] text-gray-400 font-bold block mt-0.5">與史萊姆劃拳博弈</span>
                            </div>
                          </button>

                          {/* Game 3 */}
                          <button
                            onClick={() => {
                              setActiveGame("ttt");
                              setTttBoard(Array(9).fill(""));
                              setTttStatus("playing");
                            }}
                            disabled={playData.remainingCd > 0 || playData.count >= 3}
                            className={`btn-game p-4 rounded-xl text-center flex flex-col items-center justify-between min-h-[140px] border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.15)] ${
                              playData.remainingCd > 0 || playData.count >= 3
                                ? "bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed"
                                : "bg-white hover:bg-emerald-50 border-gray-700 hover:scale-102 cursor-pointer"
                            }`}
                          >
                            <span className="text-3xl">❌⭕</span>
                            <div className="mt-2 text-center w-full">
                              <span className="block font-black text-sm text-gray-800">3x3 井字棋</span>
                              <span className="text-[8px] text-gray-400 font-bold block mt-0.5">策略交鋒棋藝對決</span>
                            </div>
                          </button>
                        </div>
                      )}

                      {/* GAME COIN */}
                      {activeGame === "coin" && (
                        <div className="bg-white border-2 border-gray-300 p-4 rounded-xl relative space-y-3 text-center">
                          <div className="flex justify-between items-center border-b pb-1">
                            <span className="text-xs font-black text-emerald-700">🪙 猜硬幣互動對局</span>
                            <button onClick={() => setActiveGame(null)} className="text-xs text-gray-400 hover:text-gray-655 font-bold cursor-pointer">✕ 返回</button>
                          </div>

                          <div className="py-2 flex justify-center">
                            <div className={`w-16 h-16 rounded-full bg-amber-400 border-[4px] border-gray-700 flex items-center justify-center text-3xl font-black ${coinSpinning ? "animate-spin" : ""}`}>
                              {coinResult ? (coinResult === "heads" ? "🟡" : "🧱") : "🪙"}
                            </div>
                          </div>

                          {(coinResult === null) && !coinSpinning && (
                            <div className="space-y-2">
                              <p className="text-xs font-black text-gray-650">請預測硬幣落地哪一面朝上？</p>
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => handleCoinPlay("heads")}
                                  className="btn-game bg-amber-200 text-gray-800 font-extrabold text-xs py-1.5 px-4 rounded-lg cursor-pointer"
                                >
                                  正面 (🟡)
                                </button>
                                <button
                                  onClick={() => handleCoinPlay("tails")}
                                  className="btn-game bg-gray-300 text-gray-851 font-extrabold text-xs py-1.5 px-4 rounded-lg cursor-pointer"
                                >
                                  反面 (🧱)
                                </button>
                              </div>
                            </div>
                          )}

                          {(coinResult !== null) && (
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-gray-800">
                                預測結果：你可以選了 <strong className="text-blue-600">{coinSelection === "heads" ? "正面" : "反面"}</strong>，
                                開出是 <strong className="text-orange-500">{coinResult === "heads" ? "正面" : "反面"}</strong>！
                              </p>
                              <p className="text-sm font-black text-emerald-600">
                                {coinSelection === coinResult ? "🎉 恭喜你，預測正確，心情大好！" : "🤝 預測失敗了，不過史萊姆玩得很開心喔！"}
                              </p>
                              <button
                                // Allow replay
                                onClick={() => {
                                  setCoinResult(null);
                                  setCoinSelection(null);
                                }}
                                className="btn-game bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-1 px-3 mt-1.5 rounded text-xs cursor-pointer"
                              >
                                再猜一局
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* GAME RPS */}
                      {activeGame === "rps" && (
                        <div className="bg-white border-2 border-gray-300 p-4 rounded-xl relative space-y-3 text-center">
                          <div className="flex justify-between items-center border-b pb-1">
                            <span className="text-xs font-black text-emerald-700">✌️✊🖐️ 剪刀石頭布劃拳</span>
                            <button onClick={() => setActiveGame(null)} className="text-xs text-gray-400 hover:text-gray-655 font-bold cursor-pointer">✕ 返回</button>
                          </div>

                          {!rpsResult && (
                            <div className="space-y-2">
                              <p className="text-xs font-black text-gray-655">出個拳吧！手伸出來：</p>
                              <div className="flex justify-center gap-2">
                                <button onClick={() => handleRpsPlay("rock")} className="btn-game bg-orange text-white text-xs py-1.5 px-3 rounded cursor-pointer">✊ 石頭</button>
                                <button onClick={() => handleRpsPlay("scissors")} className="btn-game bg-sky text-white text-xs py-1.5 px-3 rounded cursor-pointer">✌️ 剪刀</button>
                                <button onClick={() => handleRpsPlay("paper")} className="btn-game bg-emerald text-white text-xs py-1.5 px-3 rounded cursor-pointer">🖐️ 布</button>
                              </div>
                            </div>
                          )}

                          {rpsResult && (
                            <div className="space-y-1">
                              <div className="flex justify-center gap-6 text-xl p-2 select-none border rounded border-gray-100 max-w-xs mx-auto">
                                <div>
                                  <p className="text-[8px] text-gray-400">你出了</p>
                                  <span>{rpsPlayerMove === "rock" ? "✊" : rpsPlayerMove === "paper" ? "🖐️" : "✌️"}</span>
                                </div>
                                <span className="text-gray-300">VS</span>
                                <div>
                                  <p className="text-[8px] text-gray-400">史萊姆</p>
                                  <span>{rpsSlimeMove === "rock" ? "✊" : rpsSlimeMove === "paper" ? "🖐️" : "✌️"}</span>
                                </div>
                              </div>
                              <p className="text-xs font-black mt-2 text-indigo-950">
                                {rpsResult === "win" ? "👑 贏啦！史萊姆被你制服了" : rpsResult === "lose" ? "😢 人家史萊姆贏了喔～" : "🤝 平手！這把是重拳出戰重逢！"}
                              </p>
                              <button
                                onClick={() => {
                                  setRpsResult(null);
                                  setRpsPlayerMove(null);
                                  setRpsSlimeMove(null);
                                }}
                                className="btn-game bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-1 px-3 mt-1 rounded text-xs cursor-pointer"
                              >
                                再戰一局
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* TIC TAC TOE */}
                      {activeGame === "ttt" && (
                        <div className="bg-white border-2 border-gray-300 p-4 rounded-xl relative space-y-3 text-center">
                          <div className="flex justify-between items-center border-b pb-1">
                            <span className="text-xs font-black text-emerald-700">⭕❌ 井字棋九宮格對決</span>
                            <button onClick={() => setActiveGame(null)} className="text-xs text-gray-400 hover:text-gray-655 font-bold cursor-pointer">✕ 返回</button>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 max-w-[150px] mx-auto py-1">
                            {tttBoard.map((cell, idx) => (
                              <button
                                key={idx}
                                disabled={cell !== "" || tttStatus !== "playing"}
                                onClick={() => handleTttCellClick(idx)}
                                className={`w-10 h-10 rounded-lg border-2 text-lg font-black flex items-center justify-center transition-all ${
                                  cell === "O"
                                    ? "bg-rose-50 border-rose-400 text-rose-600"
                                    : cell === "X"
                                      ? "bg-blue-50 border-blue-400 text-blue-600"
                                      : "bg-gray-50 border-gray-200 hover:bg-gray-100 cursor-pointer"
                                }`}
                              >
                                {cell}
                              </button>
                            ))}
                          </div>

                          {tttStatus !== "playing" && (
                            <div className="text-center space-y-1">
                              <p className="text-xs font-black text-indigo-95">
                                {tttStatus === "win" ? "👑 手法犀利！成功把史萊姆連成一線！" : tttStatus === "lose" ? "😢 棋差一著，再努力練習！" : "🤝 滴水不漏！這是一場精彩的和局！"}
                              </p>
                              <button
                                onClick={() => {
                                  setTttBoard(Array(9).fill(""));
                                  setTttStatus("playing");
                                }}
                                className="btn-game bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-1 px-3 mt-1 rounded text-xs cursor-pointer"
                              >
                                重新對局
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })()}

                {/* 6. COLLECTIONS RENDER */}
                {activeShopTab === "shop-collection" && (() => {
                  const customItemsList = appData.backgroundGachaItems || defaultBackgroundGachaItems;
                  const ownedBgs = currentStudent.studentOwnedBackgrounds || [];
                  const ownedDecorations = currentStudent.studentOwnedDecorations || [];

                  return (
                    <div className="flex flex-col gap-3 text-left">
                      
                      {/* Inner sub tab header */}
                      <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-lg border">
                        <button
                          onClick={() => setMyCollectionTab("bg")}
                          className={`py-1 text-[10px] font-black rounded transition-all cursor-pointer ${
                            myCollectionTab === "bg" ? "bg-purple-650 text-white shadow-sm" : "text-purple-700 hover:bg-white"
                          }`}
                        >
                          🖼️ 背景桌布
                        </button>
                        <button
                          onClick={() => setMyCollectionTab("decor")}
                          className={`py-1 text-[10px] font-black rounded transition-all cursor-pointer ${
                            myCollectionTab === "decor" ? "bg-pink-650 text-white shadow-sm" : "text-pink-700 hover:bg-white"
                          }`}
                        >
                          🎀 飾品擺件
                        </button>
                        <button
                          onClick={() => setMyCollectionTab("title")}
                          className={`py-1 text-[10px] font-black rounded transition-all cursor-pointer ${
                            myCollectionTab === "title" ? "bg-indigo-650 text-white shadow-sm" : "text-indigo-700 hover:bg-white"
                          }`}
                        >
                          🎖️ 勳章稱號
                        </button>
                        <button
                          onClick={() => setMyCollectionTab("slime")}
                          className={`py-1 text-[10px] font-black rounded transition-all cursor-pointer ${
                            myCollectionTab === "slime" ? "bg-emerald-600 text-white shadow-sm" : "text-emerald-700 hover:bg-white"
                          }`}
                        >
                          👾 史萊姆圖鑑
                        </button>
                      </div>

                      {/* Sub BG content */}
                      {myCollectionTab === "bg" && (
                        <div className="space-y-3">
                          <p className="text-[10px] text-gray-550 font-bold">🎨 點擊召喚出來的特殊壁紙，裝點史萊姆的小屋：</p>
                          <div className="grid grid-cols-2 gap-2">
                            {customItemsList
                              .filter((item) => item.category === "background")
                              .map((bgItem) => {
                                const isOwned = ownedBgs.includes(bgItem.id);
                                const isEquipped = currentStudent.studentActiveBackground === bgItem.id;

                                return (
                                  <button
                                    key={bgItem.id}
                                    disabled={!isOwned}
                                    onClick={() => handleEquipCustomBg(bgItem.id)}
                                    className={`p-2 border-[2.5px] rounded-lg text-left transition-all ${
                                      isEquipped
                                        ? "bg-purple-50 border-purple-600 font-extrabold text-purple-950 scale-101"
                                        : isOwned
                                          ? "bg-white border-gray-400 text-gray-800 hover:bg-gray-50 cursor-pointer"
                                          : "bg-gray-50 border-gray-200 text-gray-400 opacity-60 cursor-not-allowed"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-extrabold text-xs truncate max-w-[80px]">{bgItem.name}</span>
                                      <span className="text-[10px] font-black">{isEquipped ? "✓ 配戴" : isOwned ? "裝備" : "🔒"}</span>
                                    </div>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Sub Decor content */}
                      {myCollectionTab === "decor" && (
                        <div className="space-y-3">
                          <p className="text-[10px] text-gray-550 font-bold">🎀 點擊你在轉蛋中收穫的精緻掛置玩件，自由安插：</p>
                          <div className="grid grid-cols-2 gap-2">
                            {customItemsList
                              .filter((item) => item.category !== "background")
                              .map((decorItem) => {
                                const isOwned = ownedDecorations.includes(decorItem.id);
                                const itemCategory = getItemNormalizedCategory(decorItem);
                                const isEquipped = currentStudent.studentActiveDecorations?.[itemCategory] === decorItem.id;

                                return (
                                  <button
                                    key={decorItem.id}
                                    disabled={!isOwned}
                                    onClick={() => handleEquipCustomDec(decorItem)}
                                    className={`p-2 border-[2.5px] rounded-lg text-left transition-all ${
                                      isEquipped
                                        ? "bg-pink-50 border-pink-500 font-extrabold text-pink-900 scale-101"
                                        : isOwned
                                          ? "bg-white border-gray-400 text-gray-150 hover:bg-gray-50 cursor-pointer"
                                          : "bg-gray-50 border-gray-200 text-gray-400 opacity-60 cursor-not-allowed"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-extrabold truncate max-w-[70px]">{decorItem.name}</span>
                                      <span className="text-[8px] bg-pink-100 text-pink-750 px-1 rounded truncate max-w-[40px]">{categoryLabels[itemCategory] || decorItem.category}</span>
                                    </div>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Sub Titles content */}
                      {myCollectionTab === "title" && (
                        <div className="space-y-3">
                          <p className="text-[10px] text-gray-550 font-bold">🎖️ 更換當前的勳章稱號：</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {(() => {
                              const list = [...titleRequirements];
                              const owned = currentStudent.studentOwnedTitles || [];
                              owned.forEach((tName: string) => {
                                if (!list.some(x => x.name === tName)) {
                                  list.push({
                                    name: tName,
                                    desc: "🛒 購自神秘行商 Howard 的稱號獎勳",
                                    check: () => true
                                  });
                                }
                              });
                              return list.map((tr) => {
                                const unlocked = tr.check(currentStudent);
                                const isCurrent = currentStudent.title === tr.name || (tr.name === "等待發光中" && (!currentStudent.title || currentStudent.title === "等待發光中"));

                                return (
                                  <button
                                    key={tr.name}
                                    disabled={!unlocked}
                                    onClick={() => handleEquipTitle(tr.name)}
                                    className={`p-2 border-2 rounded-lg text-left flex items-start gap-1.5 ${
                                      isCurrent
                                        ? "bg-indigo-50 border-indigo-500 font-black text-indigo-950"
                                        : unlocked
                                          ? "bg-white border-gray-400 text-gray-800 hover:bg-gray-50 cursor-pointer"
                                          : "bg-gray-50 border-gray-200 text-gray-400 opacity-60 cursor-not-allowed"
                                      }`}
                                  >
                                    <span className="text-sm shrink-0">{isCurrent ? "👑" : unlocked ? "🎖️" : "🔒"}</span>
                                    <div className="min-w-0 font-sans leading-none">
                                      <p className="font-black text-[11px] text-gray-800 truncate">{tr.name}</p>
                                      <p className="text-[8px] text-gray-400 truncate mt-0.5">{tr.desc}</p>
                                    </div>
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Sub Slime content */}
                      {myCollectionTab === "slime" && (
                        <div className="space-y-3">
                          <p className="text-[10px] text-gray-550 font-bold">👾 全套蛋冒險基因：</p>
                          <div className="grid grid-cols-2 gap-2 text-xs text-left">
                            {[
                              { id: "star", name: "星之史萊姆", desc: "星蛋誕生的黃色小天使，最愛吃水果，充滿創造力。" },
                              { id: "forest", name: "森之史萊姆", desc: "綠蔥蛋誕生的森野守護者，溫柔踏實，熱愛環保植物。" },
                              { id: "candy", name: "糖之史萊姆", desc: "蜜糖粉蛋誕生的甜蜜萌生體，高親密，喜歡甜食點心。" },
                              { id: "magic", name: "魔之史萊姆", desc: "紫色法力蛋誕生的智慧化身，聰穎文雅，喜歡閱讀。" },
                              { id: "crystal", name: "水晶史萊姆", desc: "藍色彩釉蛋誕生的晶莹體，開朗陽光，喜歡發言與歌唱。" },
                            ].map((slime) => {
                              const isUnlocked = currentStudent.hasChosenEgg && currentStudent.element === slime.id;
                              const svgMarkup = generateDetailedSlimeSVG({
                                element: slime.id as any,
                                hasChosenEgg: true,
                                pet: { level: 3 } as any
                              });

                              return (
                                <div
                                  key={slime.id}
                                  className={`p-1.5 border-2 rounded-lg text-center flex flex-col items-center justify-between ${
                                    isUnlocked ? "bg-emerald-50/20 border-emerald-400" : "bg-gray-150 border-gray-200 opacity-60"
                                  }`}
                                >
                                  <div
                                    className="w-16 h-12 shrink-0 pointer-events-none select-none"
                                    dangerouslySetInnerHTML={{ __html: svgMarkup }}
                                  />
                                  <p className="text-[10px] font-black text-gray-800 mt-1">{slime.name}</p>
                                  <p className="text-[8px] text-gray-500 mt-0.5">{isUnlocked ? "✨ 已解鎖" : "🔒 尚未繁育"}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                  {/* E. Achievements complete deck list */}
                  {activeShopTab === "shop-achievement" && (() => {
                    const achievementsList = appData.achievements || defaultAchievements;

                    return (
                      <div className="grid grid-cols-2 gap-2 text-left">
                        {achievementsList.map((ach) => {
                          const isClaimed = (currentStudent.earnedAchievements || []).some(
                            (ea) => ea.achievementId === ach.achievementId
                          );

                          return (
                            <div
                              key={ach.achievementId}
                              className={`p-2 border-2 rounded-xl flex items-start gap-2 select-none h-20 overflow-hidden leading-tight ${
                                isClaimed
                                  ? "bg-amber-50/30 border-amber-300 text-amber-955"
                                  : "bg-gray-55 border-gray-200 opacity-65 text-gray-400"
                              }`}
                            >
                              <span className="text-2xl mt-0.5 shrink-0">{isClaimed ? ach.icon || "🏆" : "🔒"}</span>
                              <div className="min-w-0 font-sans">
                                <h4 className="font-black text-[11px] truncate">{ach.name}</h4>
                                <p className="text-[8px] leading-normal opacity-80 line-clamp-2">{ach.description}</p>
                                <p className={`text-[8px] font-black mt-0.5 ${getRarityInfo(ach.rarity).textColorClass || "text-gray-500"}`}>
                                  {getRarityInfo(ach.rarity).icon} {getRarityInfo(ach.rarity).label}榮譽
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                </div>
              </div>
            </div>
          </div>

        {/* Rename Pet Modal */}
        {renameModalOpen && (
          <div id="rename-pet-modal" className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]" style={{ pointerEvents: 'auto' }}>
            <div className="game-box bg-white max-w-md w-full p-6 border-[6px] border-gray-700 rounded-2xl shadow-2xl relative">
              <h3 className="text-2xl font-black text-gray-800 mb-3 flex items-center gap-2">
                <i className="fas fa-pencil-alt text-blue-500"></i> 修改寵物名稱
              </h3>
              
              <div className="bg-blue-50 border-[3px] border-blue-200 text-blue-900 rounded-xl p-3 mb-4 text-sm font-bold">
                💡 <b>說明：</b>
                <ul className="list-disc pl-4 space-y-1 mt-1">
                  <li>每位學生第一次修改寵物名稱免費。</li>
                  <li>第二次起，每次修改需花費 <b className="text-pink-600">50 點數</b>。</li>
                  <li>長度限制：2～8 個中文字，或 1～12 個英數字元。</li>
                  <li>不可輸入空白或特殊符號。</li>
                </ul>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-extrabold text-sm mb-1">
                  目前已修改次數: <span className="text-blue-600 font-black">{Number(currentStudent.petNameChangedCount || 0)}</span> 次
                </label>
                <div className="text-gray-500 text-xs font-bold mb-2">
                  本次更名所需點數:{" "}
                  <span className={`font-black ${Number(currentStudent.petNameChangedCount || 0) > 0 ? "text-red-500" : "text-emerald-500"}`}>
                    {Number(currentStudent.petNameChangedCount || 0) > 0 ? "50 點" : "免費"}
                  </span>
                </div>
                <input
                  id="rename-pet-input"
                  type="text"
                  maxLength={16}
                  value={tempPetName}
                  onChange={(e) => setTempPetName(e.target.value)}
                  placeholder="請輸入夥伴新名稱"
                  className="w-full px-4 py-3 border-[3px] border-gray-700 rounded-xl bg-gray-50 focus:bg-white text-lg font-bold outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  id="rename-pet-cancel-btn"
                  onClick={() => setRenameModalOpen(false)}
                  className="btn-game bg-gray-300 text-gray-800 px-4 py-2 font-black rounded-lg"
                >
                  取消
                </button>
                <button
                  id="rename-pet-confirm-btn"
                  onClick={confirmRenamePet}
                  className="btn-game bg-[#F280B6] text-white px-5 py-2 font-black rounded-lg hover:scale-105"
                >
                  確認修改
                </button>
              </div>
            </div>
          </div>
        )}
        
         {/* Fixed Right-Bottom Return Home Button for elementary grade children */}
         <button
           onClick={onClose}
           style={{ width: "84px", height: "84px" }}
           className="absolute bottom-[24px] right-[24px] z-[9999] btn-game bg-amber-400 hover:bg-amber-500 text-gray-800 rounded-full shadow-[4px_4px_0px_rgba(45,55,72,1)] hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-0.5 border-[4px] border-gray-700 cursor-pointer font-black transition-all group"
           title="返回主頁"
         >
           <span className="text-3xl">⬅</span>
           <span className="text-xs font-black shrink-0 tracking-tighter">返回主頁</span>
         </button>
      </div>
    </div>
  );
}
