import { Student } from "../types";

/**
 * 史萊姆表情與對話判定系統
 */

export type PetExpression = "very_happy" | "happy" | "normal" | "tired" | "hungry" | "sad" | "excited" | "proud";

export function getPetExpression(student: Student, nowMs: number = Date.now()): PetExpression {
  const happy = student.petStats?.happy !== undefined ? student.petStats.happy : 60;
  // Satiety decays to minimum 0
  const hunger = student.currentHunger !== undefined ? student.currentHunger : (student.petStats?.stamina !== undefined ? student.petStats.stamina : 50);

  // 1. 🤩 興奮：升級後 10 分鐘內觸發
  if (student.lastLeveledUpAt && nowMs - student.lastLeveledUpAt < 10 * 60 * 1000) {
    return "excited";
  }

  // 2. 😎 得意：抽到稀有/史詩/傳說收藏後 5 分鐘內觸發
  if (student.lastRareItemAt && nowMs - student.lastRareItemAt < 5 * 60 * 1000) {
    return "proud";
  }

  // 3. 😭 非常飢餓 (飽食度 < 10)
  if (hunger < 10) {
    return "sad";
  }

  // 4. 😢 肚子餓 (飽食度 < 20)
  if (hunger < 20) {
    return "hungry";
  }

  // 5. 🥱 疲倦 (飽食度 < 40)
  if (hunger < 40) {
    return "tired";
  }

  // 6. 😄 超開心 (心情 >= 90 且 飽食 >= 70)
  if (happy >= 90 && hunger >= 70) {
    return "very_happy";
  }

  // 7. 😊 開心 (心情 70~89 且 飽食 >= 50)
  if (happy >= 70 && hunger >= 50) {
    return "happy";
  }

  // 😐 普通 (心情 40~69 或 默認)
  return "normal";
}

export function getPetSatietyColor(hunger: number): string {
  if (hunger >= 70) return "bg-green-500 text-white";
  if (hunger >= 40) return "bg-yellow-500 text-slate-800";
  if (hunger >= 20) return "bg-orange-500 text-white";
  return "bg-red-500 text-white animate-pulse";
}

export function getPetDialogue(student: Student, nowMs: number = Date.now()): string {
  const hunger = student.currentHunger !== undefined ? student.currentHunger : (student.petStats?.stamina !== undefined ? student.petStats.stamina : 50);

  // Active Hunger Reminders
  if (hunger < 10) {
    return "「我真的好餓喔⋯」";
  }
  if (hunger < 20) {
    return "「肚子咕嚕咕嚕叫了⋯」";
  }
  if (hunger < 40) {
    return "「主人，我有點餓了。」";
  }

  return "";
}
