/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task, Student, Food, CustomFood, BackgroundItem, BackgroundGachaItem, AppData, PointLog, TeacherActionLog } from "./types";
import { getAdvancedPetDialogue } from "./utils/petDialogue";
import { getPetExpression } from "./systems/PetEmotionSystem";

export const defaultTasks: Task[] = [
  { id: "t1", title: "完成晨間閱讀", category: "learn", points: 10, icon: "📖", type: "individual" },
  { id: "t2", title: "交齊聯絡簿與作業", category: "learn", points: 10, icon: "📚", type: "individual" },
  { id: "t4", title: "全班安靜午休", category: "coop", points: 15, icon: "😴", type: "group", targetCount: 7 }
];

export const BASE_FOOD: Record<string, Food> = {
  cake: { name: "草莓蛋糕", cost: 5, icon: "🍰", exp: 6, happy: 1, affinity: 1, stamina: 0, reply: "甜甜的！感覺充滿了愛！❤️" },
  candy: { name: "星星糖果", cost: 3, icon: "🍬", exp: 4, happy: 1, affinity: 0, stamina: 0, reply: "亮晶晶的！魔力湧現✨" },
  pudding: { name: "魔法布丁", cost: 8, icon: "🍮", exp: 10, happy: 1, affinity: 1, stamina: 1, reply: "Q彈Q彈！跟我一樣可愛！" },
  drink: { name: "彩虹飲料", cost: 10, icon: "🍹", exp: 12, happy: 2, affinity: 1, stamina: 1, reply: "哇！感覺快要飛起來了！" },
  milk: { name: "暖暖牛奶", cost: 12, icon: "🥛", exp: 15, happy: 1, affinity: 2, stamina: 1, reply: "咕嚕咕嚕～好安心！" },
  bento: { name: "水果便當", cost: 20, icon: "🍱", exp: 26, happy: 2, affinity: 2, stamina: 3, reply: "營養滿分！長大一點點！" }
};

export interface Course {
  name: string;
  icon: string;
  cost: number;
  exp: number;
  stats: Record<string, number>;
}

export const courseEffectMap: Record<string, { stats: Record<string, number>; happy?: number; exp?: number }> = {
  "國語課": { stats: { wisdom: 4, expression: 6 }, exp: 3 },
  "數學課": { stats: { wisdom: 6, logic: 8 }, exp: 3 },
  "自然課": { stats: { exploration: 8, wisdom: 4 }, exp: 3 },
  "社會課": { stats: { knowledge: 7, cooperation: 3 }, exp: 3 },
  "英語課": { stats: { expression: 7, wisdom: 4 }, exp: 3 },
  "藝術課": { stats: { creativity: 8 }, happy: 2, exp: 3 },
  "音樂課": { stats: { art: 7 }, happy: 3, exp: 3 },
  "體育課": { stats: { vitality: 8 }, happy: 2, exp: 3 },
  "魔法課": { stats: { wisdom: 4, exploration: 4, creativity: 4 }, exp: 5 },
  "烹飪課": { stats: { creativity: 3, cooperation: 5 }, happy: 4, exp: 5 }
};

export const learningDB: Record<string, Course> = {
  chinese: { name: "國語課", icon: "📖", cost: 6, exp: courseEffectMap["國語課"].exp || 3, stats: courseEffectMap["國語課"].stats },
  math: { name: "數學課", icon: "📐", cost: 6, exp: courseEffectMap["數學課"].exp || 3, stats: courseEffectMap["數學課"].stats },
  science: { name: "自然課", icon: "🔬", cost: 6, exp: courseEffectMap["自然課"].exp || 3, stats: courseEffectMap["自然課"].stats },
  social: { name: "社會課", icon: "🗺️", cost: 6, exp: courseEffectMap["社會課"].exp || 3, stats: courseEffectMap["社會課"].stats },
  english: { name: "英語課", icon: "🔤", cost: 6, exp: courseEffectMap["英語課"].exp || 3, stats: courseEffectMap["英語課"].stats },
  art: { name: "藝術課", icon: "🎨", cost: 6, exp: courseEffectMap["藝術課"].exp || 3, stats: courseEffectMap["藝術課"].stats },
  pe: { name: "體育課", icon: "🏃", cost: 6, exp: courseEffectMap["體育課"].exp || 3, stats: courseEffectMap["體育課"].stats },
  music: { name: "音樂課", icon: "🎵", cost: 6, exp: courseEffectMap["音樂課"].exp || 3, stats: courseEffectMap["音樂課"].stats },
  magic: { name: "魔法課", icon: "🪄", cost: 6, exp: courseEffectMap["魔法課"].exp || 5, stats: courseEffectMap["魔法課"].stats },
  cooking: { name: "烹飪課", icon: "🍳", cost: 6, exp: courseEffectMap["烹飪課"].exp || 5, stats: courseEffectMap["烹飪課"].stats }
};

export const backgroundDB: Record<string, BackgroundItem> = {
  bg_grass: { name: "晴天草地", rarity: "common", colorClass: "text-green-600", icon: "🌿", css: "linear-gradient(to bottom, #bae6fd 40%, #86efac 60%)" },
  bg_classroom: { name: "教室窗邊", rarity: "common", colorClass: "text-yellow-600", icon: "🏫", css: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)" },
  bg_forest: { name: "魔法森林", rarity: "rare", colorClass: "text-green-800", icon: "🌲", css: "radial-gradient(circle at center, #86efac 0%, #064e3b 100%)" },
  bg_sky: { name: "雲朵天空", rarity: "rare", colorClass: "text-blue-400", icon: "☁️", css: "linear-gradient(to bottom, #93c5fd 0%, #e0f2fe 100%)" },
  bg_ice: { name: "極光冰原", rarity: "legendary", colorClass: "text-cyan-400", icon: "❄️", css: "linear-gradient(to bottom, #3b0764 0%, #2dd4bf 100%)" },
  bg_castle: { name: "黃昏城堡", rarity: "legendary", colorClass: "text-orange-600", icon: "🏰", css: "linear-gradient(to top, #78350f 0%, #fb923c 50%, #fde047 100%)" },
  bg_galaxy: { name: "銀河神殿", rarity: "mythic", colorClass: "text-purple-600", icon: "🌌", css: "radial-gradient(circle at top right, #3b0764 0%, #000000 100%)" },
  bg_dream: { name: "夢境彩虹海", rarity: "mythic", colorClass: "text-pink-500", icon: "🌈", css: "linear-gradient(45deg, #fbcfe8, #e879f9, #c084fc, #818cf8, #6ee7b7)" }
};

export const elementNames: Record<string, string> = {
  star: "星空系",
  forest: "森林系",
  candy: "糖果系",
  magic: "魔法系",
  crystal: "水晶系"
};

export const rarityLabels: Record<string, string> = {
  common: "普通",
  rare: "稀有",
  legendary: "傳說",
  mythic: "神話"
};

export const rarityColors: Record<string, string> = {
  common: "#6B7280",
  rare: "#3B82F6",
  legendary: "#F59E0B",
  mythic: "#a855f7"
};

export const rarityMap: Record<string, { key: string; label: string; icon: string; bgClass: string; textColorClass: string; color: string }> = {
  "普通": { key: "common", label: "普通", icon: "⚪", bgClass: "bg-gray-100 text-gray-700 border-gray-300", textColorClass: "text-gray-500 border-gray-300 bg-gray-50", color: "#6B7280" },
  "common": { key: "common", label: "普通", icon: "⚪", bgClass: "bg-gray-100 text-gray-700 border-gray-300", textColorClass: "text-gray-500 border-gray-300 bg-gray-50", color: "#6B7280" },
  "normal": { key: "common", label: "普通", icon: "⚪", bgClass: "bg-gray-100 text-gray-700 border-gray-300", textColorClass: "text-gray-500 border-gray-300 bg-gray-50", color: "#6B7280" },
  "基礎": { key: "basic", label: "基礎", icon: "⬜", bgClass: "bg-slate-100 text-slate-700 border-slate-300", textColorClass: "text-slate-500 border-slate-300 bg-slate-50", color: "#94a3b8" },
  "basic": { key: "basic", label: "基礎", icon: "⬜", bgClass: "bg-slate-100 text-slate-700 border-slate-300", textColorClass: "text-slate-500 border-slate-300 bg-slate-50", color: "#94a3b8" },
  "稀有": { key: "rare", label: "稀有", icon: "🔵", bgClass: "bg-blue-50 text-blue-700 border-blue-200", textColorClass: "text-blue-600 border-blue-400 bg-blue-50", color: "#3B82F6" },
  "rare": { key: "rare", label: "稀有", icon: "🔵", bgClass: "bg-blue-50 text-blue-700 border-blue-200", textColorClass: "text-blue-600 border-blue-400 bg-blue-50", color: "#3B82F6" },
  "超稀有": { key: "epic", label: "超稀有", icon: "🟣", bgClass: "bg-purple-50 text-purple-700 border-purple-200", textColorClass: "text-purple-600 border-orange-400 bg-orange-50", color: "#a855f7" },
  "epic": { key: "epic", label: "超稀有", icon: "🟣", bgClass: "bg-purple-50 text-purple-700 border-purple-200", textColorClass: "text-purple-600 border-orange-400 bg-orange-50", color: "#a855f7" },
  "傳說": { key: "legendary", label: "傳說", icon: "🟡", bgClass: "bg-amber-50 text-amber-700 border-amber-200", textColorClass: "text-amber-500 border-amber-400 bg-amber-50", color: "#F59E0B" },
  "legendary": { key: "legendary", label: "傳說", icon: "🟡", bgClass: "bg-amber-50 text-amber-700 border-amber-200", textColorClass: "text-amber-500 border-amber-400 bg-amber-50", color: "#F59E0B" },
  "神話": { key: "mythic", label: "神話", icon: "🦄", bgClass: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200", textColorClass: "text-fuchsia-600 border-fuchsia-400 bg-fuchsia-50", color: "#d946ef" },
  "mythic": { key: "mythic", label: "神話", icon: "🦄", bgClass: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200", textColorClass: "text-fuchsia-600 border-fuchsia-400 bg-fuchsia-100", color: "#d946ef" }
};

export function getRarityInfo(rarity: string | undefined): { key: string; label: string; icon: string; bgClass: string; textColorClass: string; color: string } {
  if (!rarity) return rarityMap["common"];
  const lowered = rarity.toString().toLowerCase().trim();
  return rarityMap[lowered] || rarityMap[rarity] || rarityMap["common"];
}

export const personalityTitleMap: Record<string, string> = {
  creativity: "藝術家史萊姆",
  performance: "偶像史萊姆",
  wisdom: "博士史萊姆",
  vitality: "熱血史萊姆",
  exploration: "冒險史萊姆",
  affinity: "暖心史萊姆",
  imagination: "魔法史萊姆",
  discipline: "可靠史萊姆"
};

export const personalityLabelPatch: Record<string, string> = {
  creativity: "創造力",
  performance: "表現力",
  wisdom: "智慧",
  vitality: "活力",
  exploration: "探索力",
  affinity: "親和力",
  imagination: "想像力",
  discipline: "自律"
};

export function getEvolutionStageByLevel(level: number): number {
  level = Number(level) || 1;
  if (level <= 1) return 1;
  if (level === 2) return 2;
  if (level === 3) return 3;
  if (level <= 5) return 4;
  if (level <= 7) return 5;
  if (level <= 9) return 6;
  if (level <= 11) return 7;
  if (level <= 13) return 8;
  if (level <= 15) return 9;
  if (level <= 17) return 10;
  if (level <= 19) return 11;
  return 12;
}

export function getStudentElementForWing(student: Partial<Student>): string {
  return (
    student?.element ||
    student?.pet?.growthType ||
    ""
  );
}

export function generateElementWingSVG(element: string, level: number): string {
  // Retained for type compatibility, but the main pixel-art wings are now fully integrated procedurally
  // inside the main generateDetailedSlimeSVG generator to align perfectly with the pixel grid!
  return "";
}

export function generateDetailedSlimeSVG(student: Partial<Student>): string {
  const expr = petExpressionSystem(student);
  const level = Number(student?.pet?.level || 1);
  const element = student?.element || "candy";
  const isEgg = student?.hasChosenEgg === false || level === 1;
  const isCrackedEgg = level === 2;

  // 1. Core Color Palettes (Softer, more pastel)
  const palette = {
    magic: {
      main: "#9D6FD4",
      dark: "#6B4A9C",
      light: "#C9B5E6",
      shine: "#FFFFFF",
      border: "#2D1B4E",
      horn: "#5C3BA8",
      hornLight: "#B89FD9",
      particle: "#DFC7F0"
    },
     crystal: {
      main: "#6FD9FF",
      dark: "#3C9FC9",
      light: "#B4EBFF",
      shine: "#FFFFFF",
      border: "#1A3A4D",
      horn: "#4DBFD0",
      hornLight: "#B8E8F0",
      particle: "#D0F0FF"
    },
    candy: {
      main: "#FF9BC5",
      dark: "#E6699F",
      light: "#FFD0E5",
      shine: "#FFFFFF",
      border: "#4D1A2D",
      horn: "#FF7BA8",
      hornLight: "#FFF0F8",
      particle: "#FFE8F0"
    },
    forest: {
      main: "#8FE89A",
      dark: "#5CB85C",
      light: "#C5F0CA",
      shine: "#FFFFFF",
      border: "#2D5C33",
      horn: "#6FD47E",
      hornLight: "#E8F7ED",
      particle: "#D0F0DB"
    },
    star: {
      main: "#FFD166",
      dark: "#E6A833",
      light: "#FFE8A8",
      shine: "#FFFFFF",
      border: "#664D00",
      horn: "#FFC433",
      hornLight: "#FFFADB",
      particle: "#FFF4D0"
    }
  }[element] || {
    main: "#FF9BC5",
    dark: "#E6699F",
    light: "#FFD0E5",
    shine: "#FFFFFF",
    border: "#4D1A2D",
    horn: "#FF7BA8",
    hornLight: "#FFF0F8",
    particle: "#FFE8F0"
  };

    // Determine evolution stage
  let evolutionStage = 0;
  if (level <= 4) evolutionStage = 1; // Baby
  else if (level <= 9) evolutionStage = 2; // Young
  else if (level <= 14) evolutionStage = 3; // Teen
  else if (level <= 19) evolutionStage = 4; // Elite
  else evolutionStage = 5; // Legendary

  // Helper to draw single block
  const px = (col: number, row: number, fill: string, className = "") =>
    `<rect x="${col * 8}" y="${row * 8}" width="8" height="8" fill="${fill}" class="${className}"  />`;

   // 2. CSS STYLES INJECTION - Smooth Idle Animations
  const css = `
    @keyframes sFloat {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-5px); }
    }
    @keyframes sBreathe {
      0%, 100% { transform: scale(1, 1); }
      50% { transform: scale(1.06, 0.94); }
    }
    @keyframes shScale {
      0%, 100% { transform: scaleX(1); opacity: 0.2; }
      50% { transform: scaleX(0.75); opacity: 0.08; }
    }
    @keyframes spUp {
      0% { transform: translateY(0px) scale(1); opacity: 0; }
      20% { opacity: 0.95; }
      100% { transform: translateY(-30px) scale(0.3); opacity: 0; }
    }
    @keyframes spUpAlt {
      0% { transform: translateY(0px) scale(0.8); opacity: 0; }
      30% { opacity: 1; }
      100% { transform: translateY(-35px) scale(0.15); opacity: 0; }
    }
    @keyframes wL {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(-5deg); }
    }
    @keyframes wR {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(5deg); }
    }
    @keyframes sTiltShake {
      0%, 100% { transform: rotate(0deg) translateY(0px); }
      10%, 30%, 50% { transform: rotate(-4deg) translateY(-2px); }
      20%, 40% { transform: rotate(4deg) translateY(2px); }
      60% { transform: rotate(0deg) translateY(0px); }
    }
    .slime-shadow {
      animation: shScale 4s ease-in-out infinite;
      transform-origin: 128px 208px;
    }
       .slime-shadow {
      animation: shScale 4s ease-in-out infinite;
      transform-origin: center;
    }
    .float-grp {
      animation: sFloat 4s ease-in-out infinite;
      transform-origin: center;
    }
    .breathe-grp {
      animation: sBreathe 3s ease-in-out infinite;
      transform-origin: center;
    }
    .wiggle-l {
      animation: wL 3s ease-in-out infinite;
      transform-origin: left center;
    }
    .wiggle-r {
      animation: wR 3s ease-in-out infinite;
      transform-origin: right center;
    }
    .p-slow1 {
      animation: spUp 3.2s linear infinite;
      transform-origin: center;
    }
    .p-slow2 {
      animation: spUpAlt 4s linear infinite;
      transform-origin: center;
    }
    .hatch-shake {
      animation: sTiltShake 2.5s ease-in-out infinite;
      transform-origin: center;
    }
    .sad-shrink-grp {
      transform: scale(0.85);
      transform-origin: center;
    }
    @keyframes sGlow {
      0%, 100% { filter: drop-shadow(0 0 2px #FBBF24) brightness(1); }
      50% { filter: drop-shadow(0 0 10px #FBBF24) brightness(1.2); }
    }
    .excited-glow-grp {
      animation: sGlow 2s ease-in-out infinite;
    }
    @keyframes sHop {
      0%, 100% { transform: translateY(0px) scale(1, 1); }
      25% { transform: translateY(-8px) scale(0.96, 1.04); }
      50% { transform: translateY(0px) scale(1.04, 0.96); }
      75% { transform: translateY(-4px) scale(0.99, 1.01); }
    }
    .happy-hop-grp {
      animation: sHop 1.5s ease-in-out infinite;
      transform-origin: center;
    }
    .tired-slow-grp .breathe-grp {
      animation-duration: 6s !important;
    }
    @keyframes floatAura {
      0%, 100% { opacity: 0.25; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.15); }
    }
    .aura {
      animation: floatAura 3s ease-in-out infinite;
    }
    @keyframes orbitCompanion1 {
      0% { transform: rotate(0deg) translateX(50px) rotate(0deg); }
      100% { transform: rotate(360deg) translateX(50px) rotate(-360deg); }
    }
    @keyframes orbitCompanion2 {
      0% { transform: rotate(120deg) translateX(50px) rotate(0deg); }
      100% { transform: rotate(480deg) translateX(50px) rotate(-360deg); }
    }
    @keyframes orbitCompanion3 {
      0% { transform: rotate(240deg) translateX(50px) rotate(0deg); }
      100% { transform: rotate(600deg) translateX(50px) rotate(-360deg); }
    }
    .orbit1 { animation: orbitCompanion1 8s linear infinite; }
    .orbit2 { animation: orbitCompanion2 8s linear infinite; }
    .orbit3 { animation: orbitCompanion3 8s linear infinite; }
  `;

  // --- RENDERING ROUTINE: EGG (Level 1 / egg未選) ---
  if (isEgg) {
    const eggBody: string[] = [];
    const eggRows: { [key: number]: [number, number] } = {
      8: [15, 16],
      9: [14, 17],
      10: [14, 17],
      11: [13, 18],
      12: [13, 18],
      13: [12, 19],
      14: [12, 19],
      15: [11, 20],
      16: [11, 20],
      17: [10, 21],
      18: [10, 21],
      19: [9, 22],
      20: [9, 22],
      21: [9, 22],
      22: [9, 22],
      23: [10, 21],
      24: [11, 20],
      25: [12, 19]
    };

    // Draw bottom shadow - slightly wider for stable bottom
    eggBody.push(`<ellipse cx="128" cy="208" rx="48" ry="10" fill="#000000" class="slime-shadow" />`);

    // Top & Bottom border lines
    for (let col = 15; col <= 16; col++) eggBody.push(px(col, 7, palette.border, "breathe-grp"));
    for (let col = 12; col <= 19; col++) eggBody.push(px(col, 26, palette.border, "breathe-grp"));

    // Egg contents with detailed cosmetic elements patterns
    Object.entries(eggRows).forEach(([ystr, [l, r]]) => {
      const y = Number(ystr);
      eggBody.push(px(l - 1, y, palette.border, "breathe-grp"));
      eggBody.push(px(r + 1, y, palette.border, "breathe-grp"));

      for (let x = l; x <= r; x++) {
        let col = palette.main;
        if (y === 8) col = palette.light;
        else if (x === l || x === l + 1) col = palette.light; 
        else if (y >= 21 || x >= r - 1) col = palette.dark; 

        // Gloss highlight reflection
        if (x === l + 2 && (y === 10 || y === 11)) col = palette.shine;

        // Custom Element Embryo patterns on the egg shell!
        if (element === "forest") {
          // Leafy sprout pattern
          if ((x === 15 || x === 16) && y === 12) col = "#ffffff";
          if ((x === 14 || x === 15 || x === 16 || x === 17) && (y === 14 || y === 15)) col = "#29AF4A";
          if (x === 15 && y === 16) col = "#0F521F";
        } else if (element === "magic") {
          // Evil crescent / devil horns pattern
          if ((x === 13 || x === 18) && (y === 13 || y === 14)) col = "#491C80";
          if (x >= 15 && x <= 16 && y >= 15 && y <= 16) col = "#D4B3FF";
        } else if (element === "crystal") {
          // Sharp snowflake/crystal stars
          if ((x === 15 || x === 16) && y === 15) col = "#FFFFFF";
          if (((x === 13 || x === 18) && y === 13) || ((x === 14 || x === 17) && y === 17)) col = "#22D3EE";
        } else if (element === "candy") {
          // Heart emblem in middle of egg
          if (((x === 14 || x === 17) && y === 14) || ((x === 15 || x === 16) && y === 15)) col = "#FFFFFF";
          if (x >= 14 && x <= 17 && y >= 13 && y <= 16) col = "#FDA4AF";
        } else if (element === "star") {
          // Glowing star and sparkle markings
          if ((x === 15 || x === 16) && y === 14) col = "#FDE047";
          if ((x === 14 || x === 17) && y === 15) col = "#FDE047";
          if (x === 15 && y === 16) col = "#FFFFFF";
        }

        eggBody.push(px(x, y, col, "breathe-grp"));
      }
    });

    return `
      <svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
        <style>${css}</style>
        ${eggBody.join("")}
      </svg>
    `;
  }

  // --- RENDERING ROUTINE: CRACKED EGG (Level 2) ---
  if (isCrackedEgg) {
    const crackedBody: string[] = [];
    const eggRows: { [key: number]: [number, number] } = {
      8: [15, 16],
      9: [14, 17],
      10: [14, 17],
      11: [13, 18],
      12: [13, 18],
      13: [12, 19],
      14: [12, 19],
      15: [11, 20],
      16: [11, 20],
      17: [10, 21],
      18: [10, 21],
      19: [9, 22],
      20: [9, 22],
      21: [9, 22],
      22: [9, 22],
      23: [10, 21],
      24: [11, 20],
      25: [12, 19]
    };

    // Draw bottom shadow - slightly wider for stable bottom
    crackedBody.push(`<ellipse cx="128" cy="208" rx="48" ry="10" fill="#000000" class="slime-shadow" />`);

    // We build the egg shell split into top, middle baby reveal gap, and bottom
    const topShell: string[] = [];
    const babyReveal: string[] = [];
    const bottomShell: string[] = [];

    // Top cap border lines
    for (let col = 15; col <= 16; col++) topShell.push(px(col, 7, palette.border));
    // Bottom cap border lines
    for (let col = 12; col <= 19; col++) bottomShell.push(px(col, 26, palette.border));

    Object.entries(eggRows).forEach(([ystr, [l, r]]) => {
      const y = Number(ystr);

      // 1. Top Shell (y <= 13)
      if (y <= 12) {
        topShell.push(px(l - 1, y, palette.border));
        topShell.push(px(r + 1, y, palette.border));
        // Add zigzag cracks at the lower end of the top shell
        const isCrackRow = y === 12;

        for (let x = l; x <= r; x++) {
          let col = palette.main;
          if (y === 8) col = palette.light;
          else if (x === l || x === l + 1) col = palette.light;
          else if (y >= 21 || x >= r - 1) col = palette.dark;
          if (x === l + 2 && (y === 10 || y === 11)) col = palette.shine;

          if (isCrackRow && (x === 14 || x === 15 || x === 17 || x === 18)) {
            col = palette.border; // Crack outline
          }
          topShell.push(px(x, y, col));
        }
      }
      // 2. Middle Row Gaps (y = 13 ~ y = 17) hatching reveal baby slime inside!
      else if (y >= 13 && y <= 17) {
        // Transparent side boundaries, jagged border
        babyReveal.push(px(l - 1, y, palette.border));
        babyReveal.push(px(r + 1, y, palette.border));

        for (let x = l; x <= r; x++) {
          // If at the jagged edge, render cracked white/cream shell pieces
          const isShellLeft = (x <= l + 2 - (y % 2)) || (x === l + 1);
          const isShellRight = (x >= r - 2 + (y % 2)) || (x === r - 1);
          
          if (isShellLeft || isShellRight) {
            let col = palette.main;
            if (x === l || x === l + 1) col = palette.light;
            else if (x >= r - 1) col = palette.dark;
            // Draw cracks
            if ((y === 14 && x === l + 2) || (y === 16 && x === r - 2)) {
              col = palette.border;
            }
            babyReveal.push(px(x, y, col));
          } else {
            // Peek at baby slime body color inside!
            let col = palette.horn; 
            // In the gap center, show cute eyes blinking/looking out!
            if (y === 15) {
              if (x === 14 || x === 17) {
                col = "#1C1032"; // baby eyes
              } else if (x === 15 || x === 16) {
                col = palette.hornLight;
              }
            } else if (y === 16 && x === 15) {
              col = "#FF75A9"; // little pink mouth peeking out
            }
            babyReveal.push(px(x, y, col));
          }
        }
      }
      // 3. Bottom Shell (y >= 18)
      else {
        bottomShell.push(px(l - 1, y, palette.border));
        bottomShell.push(px(r + 1, y, palette.border));

        for (let x = l; x <= r; x++) {
          let col = palette.main;
          if (x === l || x === l + 1) col = palette.light;
          else if (y >= 21 || x >= r - 1) col = palette.dark;

          // Draw rising cracks on bottom shell
          if (y === 18 && (x === 12 || x === 15 || x === 18)) {
            col = palette.border;
          }
          if (y === 19 && (x === 13 || x === 17)) {
            col = palette.border;
          }
          bottomShell.push(px(x, y, col));
        }
      }
    });

    return `
      <svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" style="style="width: 100%; height: 100%;" width: 100%; height: 100%;">
        <style>${css}</style>
        <!-- The top half wiggles/shakes, giving hatching vibes! -->
        <g class="hatch-shake">
          ${topShell.join("")}
        </g>
        <!-- Static Middle baby reveal -->
        <g class="breathe-grp">
          ${babyReveal.join("")}
        </g>
        <!-- Bottom stable base shell -->
        <g class="breathe-grp">
          ${bottomShell.join("")}
        </g>
      </svg>
    `;
  }

  // --- RENDERING ROUTINE: EVOLVING SLIME (Level 3+) ---
  // Size ranges: index 0 (Lv3), 1 (Lv4-7), 2 (Lv8-10: 初階進化), 3 (Lv11-15: 中階進化), 4 (Lv16+: 最終進化)
  const sizeIdx = level <= 3 ? 0 : level <= 7 ? 1 : level <= 10 ? 2 : level <= 15 ? 3 : 4;

  const BODY_PROFILES = [
    // Size 0 (Lv 3): Y_start = 17, Height = 9. Small baby.
    {
      Y_start: 17,
      rows: {
        17: [13, 18],
        18: [11, 20],
        19: [10, 21],
        20: [9, 22],
        21: [9, 22],
        22: [9, 22],
        23: [9, 22],
        24: [9, 22],
        25: [10, 21]
      }
    },
    // Size 1 (Lv 4-7): Y_start = 15, Height = 11. Kid.
    {
      Y_start: 15,
      rows: {
        15: [12, 19],
        16: [10, 21],
        17: [9, 22],
        18: [8, 23],
        19: [8, 23],
        20: [7, 24],
        21: [7, 24],
        22: [7, 24],
        23: [7, 24],
        24: [7, 24],
        25: [8, 23]
      }
    },
    // Size 2 (Lv 8-12): Y_start = 13, Height = 13. Budding youth.
    {
      Y_start: 13,
      rows: {
        13: [12, 19],
        14: [10, 21],
        15: [8, 23],
        16: [7, 24],
        17: [6, 25],
        18: [6, 25],
        19: [5, 26],
        20: [3, 28], // slightly chunkier sides
        21: [3, 28],
        22: [5, 26],
        23: [5, 26],
        24: [5, 26],
        25: [6, 25]
      }
    },
    // Size 3 (Lv 13-16): Y_start = 11, Height = 15. Active hero.
    {
      Y_start: 11,
      rows: {
        11: [11, 20],
        12: [10, 21],
        13: [8, 23],
        14: [7, 24],
        15: [6, 25],
        16: [5, 26],
        17: [4, 27],
        18: [4, 27],
        19: [3, 28],
        20: [3, 28],
        21: [3, 28],
        22: [3, 28],
        23: [3, 28],
        24: [3, 28],
        25: [4, 27]
      }
    },
    // Size 4 (Lv 17-20): Y_start = 9, Height = 17. Apex Legend.
    {
      Y_start: 9,
      rows: {
        9: [11, 20],
        10: [10, 21],
        11: [8, 23],
        12: [7, 24],
        13: [6, 25],
        14: [5, 26],
        15: [4, 27],
        16: [3, 28],
        17: [2, 29],
        18: [2, 29],
        19: [2, 29],
        20: [2, 29],
        21: [2, 29],
        22: [2, 29],
        23: [2, 29],
        24: [2, 29],
        25: [3, 28]
      }
    }
  ];

  const profile = BODY_PROFILES[sizeIdx];
  const ys = profile.Y_start;
  const H = 25 - ys + 1;

  const backgroundLayer: string[] = [];
  const midgroundLayer: string[] = [];
  const faceLayer: string[] = [];
  const foregroundLayer: string[] = [];

  // Ground shadow oval
  const shadowRx = 38 + sizeIdx * 8;
  midgroundLayer.push(`<ellipse cx="128" cy="208" rx="${shadowRx}" ry="10" fill="#000000" class="slime-shadow" />`);

  // Symmetric helper function
  const addSymmetricAcc = (c: number, r: number, col: string, isBack = false, isWiggling = true) => {
    const clsL = isWiggling ? "wiggle-l" : "breathe-grp";
    const clsR = isWiggling ? "wiggle-r" : "breathe-grp";
    if (isBack) {
      backgroundLayer.push(px(c, r, col, clsL));
      backgroundLayer.push(px(31 - c, r, col, clsR));
    } else {
      foregroundLayer.push(px(c, r, col, clsL));
      foregroundLayer.push(px(31 - c, r, col, clsR));
    }
  };

  const addSymmetricWing = (c: number, r: number, col: string) => {
    backgroundLayer.push(px(c, r, col, "wing-l"));
    backgroundLayer.push(px(31 - c, r, col, "wing-r"));
  };

  // --- 3. WINGS DEFINITION (Bigger and cleaner!) ---
  if (sizeIdx === 3) {
    // Elegant angle wings
    const wingPixels = [
      [5, 14], [4, 13], [3, 12], [2, 13], [3, 14], [4, 15], [5, 16],
      [1, 13], [2, 14], [3, 15]
    ];
    wingPixels.forEach(([cx, cy]) => {
      addSymmetricWing(cx, cy, palette.border);
      addSymmetricWing(cx + 1, cy, palette.dark);
    });
  } else if (sizeIdx === 4) {
    // GLORIOUS LARGE WINGS FOR APEX STAGE (Level 17-20)
    const wingPixels = [
      [6, 11], [5, 10], [4, 9], [3, 8], [2, 7], [1, 7], [0, 8], [-1, 9],
      [0, 10], [1, 11], [2, 12], [3, 13], [4, 14], [5, 15], [6, 16],
      [3, 10], [4, 10], [2, 11], [3, 11], [4, 11], [5, 11]
    ];
    wingPixels.forEach(([cx, cy]) => {
      // Offset clipping column boundaries safely inside viewport (>=0)
      const adjustedCx = Math.max(0, cx);
      addSymmetricWing(adjustedCx, cy, palette.border);
      addSymmetricWing(adjustedCx + 1, cy, element === "star" ? "#E28500" : palette.horn);
      addSymmetricWing(adjustedCx + 2, cy + 1, element === "crystal" ? "#ffffff" : palette.light);
    });
  }

  // --- 4. ELEMENT STYLING (Horns, Tails & Custom Accessories) ---
  if (element === "magic") {
    // === Purple Demon (魔王系) ===
    // Demonic tail in background
    if (sizeIdx >= 2) {
      backgroundLayer.push(px(8, 23, palette.border, "wiggle-l"));
      backgroundLayer.push(px(7, 22, palette.border, "wiggle-l"));
      backgroundLayer.push(px(6, 23, palette.horn, "wiggle-l"));
      backgroundLayer.push(px(6, 24, palette.horn, "wiggle-l"));
      backgroundLayer.push(px(5, 23, palette.border, "wiggle-l")); // tail arrow
    }

    if (sizeIdx === 1) {
      [[11, 13], [12, 14]].forEach(([cx, cy]) => addSymmetricAcc(cx, cy, palette.horn));
      addSymmetricAcc(11, 14, palette.border);
    } else if (sizeIdx === 2) {
      // LV 8-10: 雙角變大 (Horns become larger, purple energy pattern)
      [[10, 10], [9, 9], [8, 8]].forEach(([cx, cy]) => addSymmetricAcc(cx, cy, palette.border));
      [[11, 10], [10, 9], [9, 8]].forEach(([cx, cy]) => addSymmetricAcc(cx, cy, palette.horn));
      addSymmetricAcc(11, 9, palette.hornLight);
    } else if (sizeIdx === 3) {
      // LV 11-15: 浮空魔法符文 (Floating magic runes) & 深紫披風感外型 (cape-like backing)
      // Floating runes flanking
      const l_bound = profile.rows[ys][0];
      const r_bound = profile.rows[ys][1];
      backgroundLayer.push(px(l_bound - 4, ys + 4, "#BB99FF", "float-grp"));
      backgroundLayer.push(px(l_bound - 3, ys + 5, "#D4B3FF", "float-grp"));
      backgroundLayer.push(px(r_bound + 4, ys + 4, "#BB99FF", "float-grp"));
      backgroundLayer.push(px(r_bound + 3, ys + 5, "#D4B3FF", "float-grp"));
      // Dark cape panel outlines flanking base
      backgroundLayer.push(px(l_bound - 2, 23, "#491C80", "breathe-grp"));
      backgroundLayer.push(px(l_bound - 3, 24, "#1C1032", "breathe-grp"));
      backgroundLayer.push(px(r_bound + 2, 23, "#491C80", "breathe-grp"));
      backgroundLayer.push(px(r_bound + 3, 24, "#1C1032", "breathe-grp"));

      // Big curved horns
      [[10, 8], [9, 7], [8, 6], [7, 7], [6, 8]].forEach(([cx, cy]) => addSymmetricAcc(cx, cy, palette.border));
      [[11, 8], [10, 7], [9, 6], [8, 7], [7, 8]].forEach(([cx, cy]) => addSymmetricAcc(cx, cy, palette.horn));
    } else if (sizeIdx === 4) {
      // LV 16+: 巨大惡魔角 (Huge horns), 漂浮暗紫火焰 (Dark purple glow), 魔王皇冠 (Demon Crown), 小型翅膀 (Dragon wings)
      // Dragon/bat wings on sides
      addSymmetricWing(5, 11, "#1C1032");
      addSymmetricWing(4, 10, "#491C80");
      addSymmetricWing(3, 9, "#8A4FFF");
      addSymmetricWing(3, 10, "#491C80");
      addSymmetricWing(4, 11, "#1C1032");

      // Spooky rising embers/flames
      const l_bound = profile.rows[ys][0];
      const r_bound = profile.rows[ys][1];
      backgroundLayer.push(px(l_bound - 4, ys + 1, "#8A4FFF", "p-slow1"));
      backgroundLayer.push(px(r_bound + 4, ys, "#8A4FFF", "p-slow2"));

      // Huge devil horns
      [[9, 6], [8, 5], [7, 4], [6, 4], [5, 5], [4, 6]].forEach(([cx, cy]) => {
        addSymmetricAcc(cx, cy, palette.border);
        addSymmetricAcc(cx + 1, cy, palette.horn);
        addSymmetricAcc(cx + 2, cy + 1, palette.hornLight);
      });
    }
  } else if (element === "crystal") {
    // === Ice Blue Slime (聖獸／獨角獸系) ===
    if (sizeIdx >= 2) {
      // Blade icicles sticking out of the sides of the body
      const sideL = profile.rows[18][0];
      const sideR = profile.rows[18][1];
      backgroundLayer.push(px(sideL - 2, 18, palette.horn, "wiggle-l"));
      backgroundLayer.push(px(sideL - 3, 18, "#ffffff", "wiggle-l"));
      backgroundLayer.push(px(sideR + 2, 18, palette.horn, "wiggle-r"));
      backgroundLayer.push(px(sideR + 3, 18, "#ffffff", "wiggle-r"));
    }

    if (sizeIdx === 1) {
      [[15, 12], [16, 12], [15, 13], [16, 13], [15, 14], [16, 14]].forEach(([cx, cy]) => {
        foregroundLayer.push(px(cx, cy, palette.horn, "breathe-grp"));
      });
    } else if (sizeIdx === 2) {
      // LV 8-10: 獨角開始發光 (Glow sparkle on horn tip)
      [[15, 9], [16, 9], [15, 10], [16, 10], [15, 11], [16, 11]].forEach(([cx, cy]) => {
        foregroundLayer.push(px(cx, cy, "#ffffff", "breathe-grp"));
      });
      // Sparkle cross on tip
      foregroundLayer.push(px(15, 7, "#FFFFFF", "float-grp"));
      foregroundLayer.push(px(16, 7, "#FFFFFF", "float-grp"));
      foregroundLayer.push(px(14, 8, "#A6E8FF", "float-grp"));
      foregroundLayer.push(px(17, 8, "#A6E8FF", "float-grp"));
    } else if (sizeIdx === 3) {
      // LV 11-15: 冰晶裝飾 (Ice crystal crest) & 雪花特效 (Floating snowflake particles)
      [[15, 7], [16, 7], [15, 8], [16, 8], [14, 8], [17, 8]].forEach(([cx, cy]) => {
        foregroundLayer.push(px(cx, cy, "#ffffff", "breathe-grp"));
      });
      [[15, 9], [16, 9], [14, 9], [17, 9]].forEach(([cx, cy]) => {
        foregroundLayer.push(px(cx, cy, "#00E5FF", "breathe-grp"));
      });
      // Snowflake details flanking
      const l_bound = profile.rows[ys][0];
      const r_bound = profile.rows[ys][1];
      backgroundLayer.push(px(l_bound - 3, ys + 2, "#E0F7FA", "p-slow1"));
      backgroundLayer.push(px(r_bound + 3, ys + 3, "#E0F7FA", "p-slow2"));
    } else if (sizeIdx === 4) {
      // LV 16+: 大型水晶角 (Huge crystal horn), 冰晶翅膀 (Ice wings), 光環 (Holy halo), 冰雪粒子
      // Ice crystal wings flanking
      addSymmetricWing(5, 11, "#B2EBF2");
      addSymmetricWing(4, 10, "#00E5FF");
      addSymmetricWing(3, 9, "#FFFFFF");

      // Glistening single crown horn
      [[15, 3], [16, 3], [15, 4], [16, 4], [15, 5], [16, 5], [14, 5], [17, 5]].forEach(([cx, cy]) => {
        foregroundLayer.push(px(cx, cy, "#FFFFFF", "breathe-grp"));
      });
      [[15, 6], [16, 6], [14, 6], [17, 6], [13, 7], [18, 7]].forEach(([cx, cy]) => {
        foregroundLayer.push(px(cx, cy, "#00B0FF", "breathe-grp"));
      });
    }
  } else if (element === "candy") {
    // === Pink Slime (精靈兔系) ===
    if (sizeIdx >= 2) {
      // Fluffy rabbit tail back
      backgroundLayer.push(px(21, 23, "#FFB8D3", "wiggle-r"));
      backgroundLayer.push(px(22, 23, "#FF75A9", "wiggle-r"));
    }

    if (sizeIdx === 1) {
      [[11, 12], [10, 11], [11, 10]].forEach(([cx, cy]) => addSymmetricAcc(cx, cy, palette.border));
      [[12, 12], [11, 11]].forEach(([cx, cy]) => addSymmetricAcc(cx, cy, palette.horn));
    } else if (sizeIdx === 2) {
      // LV 8-10: 兔耳變長 (Rabbit ears grow longer)
      [[10, 9], [9, 8], [9, 7], [10, 6], [11, 7], [11, 8]].forEach(([cx, cy]) => addSymmetricAcc(cx, cy, palette.border));
      [[10, 7], [10, 8]].forEach(([cx, cy]) => addSymmetricAcc(cx, cy, "#ffffff")); // white inner lining
    } else if (sizeIdx === 3) {
      // LV 11-15: 花朵裝飾 (Flower headpiece) / 星星特效 (Sparkles around ears)
      [[9, 7], [8, 6], [8, 5], [9, 4], [10, 5], [11, 6]].forEach(([cx, cy]) => addSymmetricAcc(cx, cy, palette.border));
      [[9, 5], [9, 6]].forEach(([cx, cy]) => addSymmetricAcc(cx, cy, "#FFD67D")); // gold inner lining
      
      // Star particles around ears
      const l_bound = profile.rows[ys][0];
      const r_bound = profile.rows[ys][1];
      backgroundLayer.push(px(l_bound - 3, ys, "#FFF9C4", "p-slow1"));
      backgroundLayer.push(px(r_bound + 3, ys - 1, "#FFF9C4", "p-slow2"));
    } else if (sizeIdx === 4) {
      // LV 16+: 巨大兔耳 (Giant ears), 精靈光圈 (Elven halo), 愛心粒子, 花冠 (Flower Crown)
      // Giant fluffy royal bunny ears
      const l_bound_sub = profile.rows[ys][0];
      const r_bound_sub = profile.rows[ys][1];
      [[8, 5], [7, 4], [7, 3], [8, 2], [9, 3], [10, 4]].forEach(([cx, cy]) => addSymmetricAcc(cx, cy, palette.border));
      [[8, 3], [8, 4], [9, 4]].forEach(([cx, cy]) => addSymmetricAcc(cx, cy, "#FF85A5")); // deep pink inner fluff

      // Heart particles rising
      backgroundLayer.push(px(l_bound_sub - 4, ys + 2, "#FF4081", "p-slow1"));
      backgroundLayer.push(px(r_bound_sub + 4, ys + 1, "#FF4081", "p-slow2"));
    }
  } else if (element === "forest") {
    // === Green Slime (森林守護者) ===
    if (sizeIdx === 1) {
      [[15, 13], [16, 13], [14, 12], [17, 12]].forEach(([cx, cy]) => foregroundLayer.push(px(cx, cy, palette.horn, "breathe-grp")));
    } else if (sizeIdx === 2) {
      // LV 8-10: 葉片增多 (Foliage crown counts double)
      [[15, 11], [16, 11], [14, 10], [17, 10], [13, 11], [18, 11]].forEach(([cx, cy]) => {
        foregroundLayer.push(px(cx, cy, "#4FE075", "breathe-grp"));
      });
      [[15, 10], [16, 10]].forEach(([cx, cy]) => foregroundLayer.push(px(cx, cy, palette.border, "breathe-grp")));
    } else if (sizeIdx === 3) {
      // LV 11-15: 藤蔓裝飾 & 小花生成 (blooms on head)
      [[15, 9], [16, 9], [13, 8], [18, 8], [14, 9], [17, 9]].forEach(([cx, cy]) => {
        foregroundLayer.push(px(cx, cy, "#1C9E40", "breathe-grp"));
      });
      // Little rose flower buds on crown
      foregroundLayer.push(px(14, 7, "#E91E63", "breathe-grp"));
      foregroundLayer.push(px(17, 7, "#E91E63", "breathe-grp"));
    } else if (sizeIdx === 4) {
      // LV 16+: 樹冠造型 (Leafy oak helmet), 森林光點 (firefly sparks), 守護者頭冠, 葉片披肩 (Leaf shoulder wraps)
      // Leaves cape wings back
      addSymmetricWing(5, 12, "#1B5E20");
      addSymmetricWing(4, 11, "#4CAF50");

      // Giant oak-canopy crown
      [[15, 6], [16, 6], [13, 5], [18, 5], [12, 6], [19, 6], [14, 5], [17, 5]].forEach(([cx, cy]) => {
         foregroundLayer.push(px(cx, cy, "#388E3C", "breathe-grp"));
      });
      // Guardian gold crest center
      foregroundLayer.push(px(15, 4, "#FFA000", "breathe-grp"));
      foregroundLayer.push(px(16, 4, "#FFA000", "breathe-grp"));

      // Falling glowing pollen / fireflies
      const l_bound = profile.rows[ys][0];
      const r_bound = profile.rows[ys][1];
      backgroundLayer.push(px(l_bound - 4, ys + 1, "#CCFF90", "p-slow1"));
      backgroundLayer.push(px(r_bound + 4, ys, "#CCFF90", "p-slow2"));
    }
  } else if (element === "star") {
    // === Honey Yellow-Orange Slime (聖騎士／王者系) ===
    if (sizeIdx === 1) {
      [[11, 13], [10, 12]].forEach(([cx, cy]) => addSymmetricAcc(cx, cy, palette.border));
      addSymmetricAcc(11, 12, palette.horn);
    } else if (sizeIdx === 2) {
      // LV 8-10: 金屬角變長 (Metallic horn gets longer/sharper)
      [[15, 9], [16, 9], [15, 10], [16, 10], [15, 11], [16, 11]].forEach(([cx, cy]) => {
        foregroundLayer.push(px(cx, cy, "#FFE082", "breathe-grp")); // gold metallic spike
      });
      foregroundLayer.push(px(15, 8, "#FFFFFF", "float-grp")); 
    } else if (sizeIdx === 3) {
      // LV 11-15: 金色護甲紋路 (Golden polished accents)
      [[15, 7], [16, 7], [15, 8], [16, 8], [14, 9], [17, 9]].forEach(([cx, cy]) => {
        foregroundLayer.push(px(cx, cy, "#FFA000", "breathe-grp"));
      });
    } else if (sizeIdx === 4) {
      // LV 16+: 聖王者王冠, 大型天使羽翼 (Large golden wings), 金色光環 (Golden glowing halo), 榮耀粒子
      // Angel wings flanking
      addSymmetricWing(5, 12, "#E65100");
      addSymmetricWing(4, 11, "#FFB300");
      addSymmetricWing(3, 10, "#FFF59D");

      // King's solid royal crown
      [[15, 4], [16, 4], [14, 5], [17, 5], [13, 6], [18, 6]].forEach(([cx, cy]) => {
        foregroundLayer.push(px(cx, cy, "#FF8F00", "breathe-grp"));
      });
      // Gem point
      foregroundLayer.push(px(15, 3, "#D50000", "float-grp"));
      foregroundLayer.push(px(16, 3, "#D50000", "float-grp"));

      // Radiant sparkles rising
      const l_bound = profile.rows[ys][0];
      const r_bound = profile.rows[ys][1];
      backgroundLayer.push(px(l_bound - 4, ys + 2, "#FFEE58", "p-slow1"));
      backgroundLayer.push(px(r_bound + 4, ys + 1, "#FFEE58", "p-slow2"));
    }
  }

  // --- 5. ULTRA MAGNIFICENT HALO & CROWN (Level 17-20 / sizeIdx === 4) ---
  if (sizeIdx === 4) {
    // 1. Glistening Arched Halo floating above
    const haloPixels = [
      [11, ys - 4], [12, ys - 5], [13, ys - 5], [14, ys - 6], [15, ys - 6],
      [16, ys - 6], [17, ys - 6], [18, ys - 5], [19, ys - 5], [20, ys - 4]
    ];
    haloPixels.forEach(([hx, hy]) => {
      foregroundLayer.push(px(hx, hy, "#FFF275", "float-grp"));
      foregroundLayer.push(px(31 - hx, hy, "#FFF275", "float-grp"));
    });

    // 2. Large and ultra-luxurious golden crown (spikes & ruby jewel center)
    const crownY = ys - 2;
    for (let col = 12; col <= 19; col++) {
      foregroundLayer.push(px(col, crownY, "#C36400", "breathe-grp"));
      foregroundLayer.push(px(col, crownY - 1, "#FFAC1C", "breathe-grp"));
    }
    [[12, crownY - 2], [14, crownY - 2], [15, crownY - 3], [16, crownY - 3], [17, crownY - 2], [19, crownY - 2]].forEach(([cx, cy]) => {
      foregroundLayer.push(px(cx, cy, "#FFD67D", "breathe-grp"));
      foregroundLayer.push(px(cx, cy - 1, "#FFFFFF", "breathe-grp")); 
    });

    // Center gemstone based on element
    const gemColor = {
      magic: "#A855F7",
      crystal: "#3B82F6",
      forest: "#10B981",
      star: "#F43F5E",
      candy: "#EC4899"
    }[element] || "#EC4899";
    foregroundLayer.push(px(15, crownY - 1, gemColor, "breathe-grp"));
    foregroundLayer.push(px(16, crownY - 1, gemColor, "breathe-grp"));
  }

  // --- 6. BODY ROW-BY-ROW GRAPHICS GENERATION ---
  // Top capping border
  const topL = profile.rows[ys][0];
  const topR = profile.rows[ys][1];
  for (let col = topL; col <= topR; col++) {
    midgroundLayer.push(px(col, ys - 1, palette.border, "breathe-grp"));
  }

  // Bottom capping border
  const botL = profile.rows[25][0];
  const botR = profile.rows[25][1];
  for (let col = botL; col <= botR; col++) {
    midgroundLayer.push(px(col, 26, palette.border, "breathe-grp"));
  }

  // Main Slime body matrix loop
  Object.entries(profile.rows).forEach(([ystr, [l, r]]) => {
    const y = Number(ystr);

    // Left outer and right outer borders
    midgroundLayer.push(px(l - 1, y, palette.border, "breathe-grp"));
    midgroundLayer.push(px(r + 1, y, palette.border, "breathe-grp"));

    for (let x = l; x <= r; x++) {
      let col = palette.main;

      // Volumetric shading & Edge glow highlights
      if (y === ys) {
        col = palette.light;
      } else if (x === l || x === l + 1) {
        col = palette.light; 
      } else if (y >= 25 - Math.floor(H * 0.42) || x >= r - 1) {
        col = palette.dark; 
      }

      const isLossOfLuster = expr === "sad";

      // Glass shine spot in top-left
      if (!isLossOfLuster) {
        if (x === l + 2 && (y === ys + 1 || y === ys + 2)) {
          col = palette.shine;
        }
        if (x === l + 3 && y === ys + 1) {
          col = palette.shine;
        }
      }

      // --- High-Level level >= 8 Custom Volumetric & Emblem Patterns ---
      if (level >= 8) {
        const cx_mid = Math.floor((l + r) / 2);
        const cy_mid = ys + Math.floor(H / 2);

        // Extra high-contrast shines
        if (!isLossOfLuster) {
          if (x === l + 4 && y === ys + 1) col = palette.shine;
          if (x === l + 3 && y === ys + 2) col = palette.shine;
        }

        // Extra deep shadow core at the base right side
        if (y >= 24 && x >= r - 2) {
          col = palette.border; 
        }

        // --- Custom Chest Emblems/Patterns for Distinctive Silhouettes & Identification ---
        if (element === "magic") {
          // Purple Demon glowing core streaks
          if ((x === cx_mid - 2 && y === cy_mid + 2) || (x === cx_mid - 1 && y === cy_mid + 3) ||
              (x === cx_mid + 1 && y === cy_mid + 1) || (x === cx_mid + 2 && y === cy_mid + 2)) {
            col = "#D4B3FF"; // Neon purple/lavender glow accent
          }
        } else if (element === "forest" && level >= 11) {
          // Green Ivy vine patterns winding around body
          if (y === cy_mid + 1 && (x >= l + 2 && x <= r - 2)) {
            col = "#1B5E20"; // Dark vine wrap stripe
          }
          if (y === cy_mid + 2 && x === l + 3) {
            col = "#1B5E20";
          }
          // Small rose pink flower blossoms on chest
          if (x === cx_mid + 3 && y === cy_mid - 1) {
            col = "#FF85A5"; // Pink petal
          }
          if (x === cx_mid + 3 && y === cy_mid - 2) {
            col = "#FF4081"; // Red center
          }
        } else if (element === "star" && level >= 11) {
          // Golden Knight Breastplate / armor markings
          if (x === cx_mid && (y >= cy_mid + 1 && y <= cy_mid + 3)) {
            col = "#FFF59D"; // Gleaming golden strip
          }
          if (y === cy_mid + 2 && (x >= cx_mid - 1 && x <= cx_mid + 1)) {
            col = "#FFF59D"; // Cross bar armor segment
          }
        } else if (element === "crystal" && level >= 11) {
          // Frozen Ice crystal shard embedded on chest
          if ((x === cx_mid && y === cy_mid + 1) || (x === cx_mid && y === cy_mid + 3) ||
              (x === cx_mid - 1 && y === cy_mid + 2) || (x === cx_mid + 1 && y === cy_mid + 2)) {
            col = "#FFFFFF"; // Snow crystal white reflecting
          }
          if (x === cx_mid && y === cy_mid + 2) {
            col = "#00E5FF"; // Magic ice neon core
          }
        } else if (element === "candy" && level >= 11) {
          // Elven rabbit sweet flower ribbon element
          if (x === cx_mid + 1 && y === cy_mid + 2) {
            col = "#FF4081"; // Vibrant ribbon pink
          }
          if (x === cx_mid && y === cy_mid + 2) {
            col = "#FFFFFF"; // Sparkling white center
          }
        }
      }

      midgroundLayer.push(px(x, y, col, "breathe-grp"));
    }
  });

  // --- 7. FACE EXPRESSIONS (Big glowing eyes, Smile & Blushes) ---
  const faceY = ys + Math.floor(H * 0.42);
  const eyeL = topL + 1;
  const eyeR = topR - 1;
  const lipX = Math.floor((eyeL + eyeR) / 2);

  if (expr === "happy") {
    // 😊 Happy (Curved "^" eyes, sweet smirking mouth)
    faceLayer.push(px(eyeL, faceY + 1, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeL + 1, faceY, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeL + 2, faceY + 1, "#1C1032", "breathe-grp"));

    faceLayer.push(px(eyeR - 2, faceY + 1, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeR - 1, faceY, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeR, faceY + 1, "#1C1032", "breathe-grp"));

    faceLayer.push(px(lipX, faceY + 2, "#4A0E17", "breathe-grp"));
    faceLayer.push(px(lipX + 1, faceY + 2, "#4A0E17", "breathe-grp"));
    faceLayer.push(px(lipX, faceY + 3, "#FF75A9", "breathe-grp"));

    // Rosy cheeks blush
    faceLayer.push(px(eyeL - 2, faceY + 2, "#FF5E9B", "breathe-grp"));
    faceLayer.push(px(eyeL - 1, faceY + 2, "#FF5E9B", "breathe-grp"));
    faceLayer.push(px(eyeR + 1, faceY + 2, "#FF5E9B", "breathe-grp"));
    faceLayer.push(px(eyeR + 2, faceY + 2, "#FF5E9B", "breathe-grp"));
  } else if (expr === "very_happy") {
    // 😄 Very Happy (Double sparkles high curved closed eyes, huge laughing mouth)
    faceLayer.push(px(eyeL, faceY, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeL + 1, faceY - 1, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeL + 2, faceY, "#1C1032", "breathe-grp"));

    faceLayer.push(px(eyeR - 2, faceY, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeR - 1, faceY - 1, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeR, faceY, "#1C1032", "breathe-grp"));

    faceLayer.push(px(lipX - 1, faceY + 2, "#1C1032", "breathe-grp"));
    faceLayer.push(px(lipX, faceY + 2, "#4A0E17", "breathe-grp"));
    faceLayer.push(px(lipX + 1, faceY + 2, "#4A0E17", "breathe-grp"));
    faceLayer.push(px(lipX + 2, faceY + 2, "#1C1032", "breathe-grp"));
    faceLayer.push(px(lipX, faceY + 3, "#FF75A9", "breathe-grp"));
    faceLayer.push(px(lipX + 1, faceY + 3, "#FF75A9", "breathe-grp"));

    faceLayer.push(px(eyeL - 2, faceY + 2, "#FF5E9B", "breathe-grp"));
    faceLayer.push(px(eyeL - 1, faceY + 2, "#FF5E9B", "breathe-grp"));
    faceLayer.push(px(eyeR + 1, faceY + 2, "#FF5E9B", "breathe-grp"));
    faceLayer.push(px(eyeR + 2, faceY + 2, "#FF5E9B", "breathe-grp"));
  } else if (expr === "sad") {
    // 😢 Sad (Dripping tear, tiny frown mouth)
    faceLayer.push(px(eyeL, faceY, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeL + 1, faceY + 1, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeL + 2, faceY + 1, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeL, faceY + 2, "#3B82F6", "breathe-grp")); // Left Tear

    faceLayer.push(px(eyeR, faceY, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeR - 1, faceY + 1, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeR - 2, faceY + 1, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeR, faceY + 2, "#3B82F6", "breathe-grp")); // Right Tear

    faceLayer.push(px(lipX - 1, faceY + 3, "#1C1032", "breathe-grp"));
    faceLayer.push(px(lipX, faceY + 2, "#1C1032", "breathe-grp"));
    faceLayer.push(px(lipX + 1, faceY + 2, "#1C1032", "breathe-grp"));
    faceLayer.push(px(lipX + 2, faceY + 3, "#1C1032", "breathe-grp"));
  } else if (expr === "hungry") {
    // 😢 Hungry (Downward skewed eyes, sad mouth)
    faceLayer.push(px(eyeL, faceY, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeL + 1, faceY + 1, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeL + 2, faceY + 1, "#1C1032", "breathe-grp"));

    faceLayer.push(px(eyeR, faceY, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeR - 1, faceY + 1, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeR - 2, faceY + 1, "#1C1032", "breathe-grp"));

    // Sad small frown mouth
    faceLayer.push(px(lipX - 1, faceY + 3, "#1C1032", "breathe-grp"));
    faceLayer.push(px(lipX, faceY + 2, "#1C1032", "breathe-grp"));
    faceLayer.push(px(lipX + 1, faceY + 2, "#1C1032", "breathe-grp"));
    faceLayer.push(px(lipX + 2, faceY + 3, "#1C1032", "breathe-grp"));

    // Subtle pale blush
    faceLayer.push(px(eyeL - 2, faceY + 2, "#FF85A5", "breathe-grp"));
    faceLayer.push(px(eyeR + 2, faceY + 2, "#FF85A5", "breathe-grp"));
  } else if (expr === "tired") {
    // 😴 Tired (Closed flat eyes, small circular sighing mouth, drifting sleepy Zzz)
    faceLayer.push(px(eyeL - 1, faceY + 1, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeL, faceY + 1, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeL + 1, faceY + 1, "#1C1032", "breathe-grp"));

    faceLayer.push(px(eyeR - 1, faceY + 1, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeR, faceY + 1, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeR + 1, faceY + 1, "#1C1032", "breathe-grp"));

    faceLayer.push(px(lipX, faceY + 2, "#1C1032", "breathe-grp"));
    faceLayer.push(px(lipX + 1, faceY + 2, "#1C1032", "breathe-grp"));

    // Micro Zzz
    faceLayer.push(px(eyeR + 3, faceY - 2, "#93C5FD", "float-grp"));
    faceLayer.push(px(eyeR + 4, faceY - 2, "#93C5FD", "float-grp"));
    faceLayer.push(px(eyeR + 4, faceY - 1, "#93C5FD", "float-grp"));
    faceLayer.push(px(eyeR + 3, faceY, "#93C5FD", "float-grp"));
    faceLayer.push(px(eyeR + 4, faceY, "#93C5FD", "float-grp"));
  } else if (expr === "angry") {
    // 😡 Angry (Fierce slanted eyebrows and grim red cheeks)
    faceLayer.push(px(eyeL, faceY - 1, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeL + 1, faceY, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeL + 1, faceY + 1, "#1C1032", "breathe-grp"));

    faceLayer.push(px(eyeR, faceY - 1, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeR - 1, faceY, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeR - 1, faceY + 1, "#1C1032", "breathe-grp"));

    faceLayer.push(px(lipX - 1, faceY + 3, "#1C1032", "breathe-grp"));
    faceLayer.push(px(lipX, faceY + 2, "#1C1032", "breathe-grp"));
    faceLayer.push(px(lipX + 1, faceY + 3, "#1C1032", "breathe-grp"));
    faceLayer.push(px(lipX + 2, faceY + 2, "#1C1032", "breathe-grp"));

    faceLayer.push(px(eyeL - 1, faceY + 2, "#EF4444", "breathe-grp"));
    faceLayer.push(px(eyeR + 1, faceY + 2, "#EF4444", "breathe-grp"));
  } else if (expr === "excited") {
    // 🤩 Excited (Golden stars as eyes, high wide screaming smile)
    faceLayer.push(px(eyeL, faceY - 1, "#FBBF24", "breathe-grp"));
    faceLayer.push(px(eyeL + 1, faceY, "#FFFFFF", "breathe-grp"));
    faceLayer.push(px(eyeL - 1, faceY, "#FFFFFF", "breathe-grp"));
    faceLayer.push(px(eyeL, faceY + 1, "#FBBF24", "breathe-grp"));

    faceLayer.push(px(eyeR, faceY - 1, "#FBBF24", "breathe-grp"));
    faceLayer.push(px(eyeR + 1, faceY, "#FFFFFF", "breathe-grp"));
    faceLayer.push(px(eyeR - 1, faceY, "#FFFFFF", "breathe-grp"));
    faceLayer.push(px(eyeR, faceY + 1, "#FBBF24", "breathe-grp"));

    faceLayer.push(px(lipX - 1, faceY + 2, "#1C1032", "breathe-grp"));
    faceLayer.push(px(lipX, faceY + 3, "#EF4444", "breathe-grp"));
    faceLayer.push(px(lipX + 1, faceY + 3, "#EF4444", "breathe-grp"));
    faceLayer.push(px(lipX + 2, faceY + 2, "#1C1032", "breathe-grp"));

    faceLayer.push(px(eyeL - 2, faceY + 2, "#FF3E8B", "breathe-grp"));
    faceLayer.push(px(eyeR + 2, faceY + 2, "#FF3E8B", "breathe-grp"));
  } else if (expr === "love") {
    // 🥰 Love (Glistening hearts as eyes, warm red lip, loving blushes)
    faceLayer.push(px(eyeL - 1, faceY - 1, "#FF5E9B", "breathe-grp"));
    faceLayer.push(px(eyeL + 1, faceY - 1, "#FF5E9B", "breathe-grp"));
    faceLayer.push(px(eyeL, faceY, "#FF5E9B", "breathe-grp"));
    faceLayer.push(px(eyeL + 1, faceY, "#FF5E9B", "breathe-grp"));
    faceLayer.push(px(eyeL, faceY + 1, "#FF5E9B", "breathe-grp"));

    faceLayer.push(px(eyeR - 2, faceY - 1, "#FF5E9B", "breathe-grp"));
    faceLayer.push(px(eyeR, faceY - 1, "#FF5E9B", "breathe-grp"));
    faceLayer.push(px(eyeR - 1, faceY, "#FF5E9B", "breathe-grp"));
    faceLayer.push(px(eyeR, faceY, "#FF5E9B", "breathe-grp"));
    faceLayer.push(px(eyeR - 1, faceY + 1, "#FF5E9B", "breathe-grp"));

    faceLayer.push(px(lipX, faceY + 2, "#EF4444", "breathe-grp"));
    faceLayer.push(px(lipX + 1, faceY + 2, "#EF4444", "breathe-grp"));

    faceLayer.push(px(eyeL - 2, faceY + 3, "#FF85A5", "breathe-grp"));
    faceLayer.push(px(eyeR + 2, faceY + 3, "#FF85A5", "breathe-grp"));
  } else if (expr === "proud") {
    // 😎 Proud (Cool sunglasses spanning across both eyes, confident side smirk)
    for (let col = eyeL - 2; col <= eyeR + 2; col++) {
      faceLayer.push(px(col, faceY, "#111822", "breathe-grp"));
    }
    faceLayer.push(px(eyeL - 1, faceY + 1, "#111822", "breathe-grp"));
    faceLayer.push(px(eyeL, faceY + 1, "#111822", "breathe-grp"));
    faceLayer.push(px(eyeR, faceY + 1, "#111822", "breathe-grp"));
    faceLayer.push(px(eyeR - 1, faceY + 1, "#111822", "breathe-grp"));
    faceLayer.push(px(eyeL - 1, faceY, "#FFFFFF", "breathe-grp"));
    faceLayer.push(px(eyeR, faceY, "#FFFFFF", "breathe-grp"));

    faceLayer.push(px(lipX, faceY + 2, "#1C1032", "breathe-grp"));
    faceLayer.push(px(lipX + 1, faceY + 2, "#1C1032", "breathe-grp"));
    faceLayer.push(px(lipX + 2, faceY + 1, "#1C1032", "breathe-grp"));
  } else {
    // 😐 Normal Default (Classic pixel eyes look)
    faceLayer.push(px(eyeL, faceY, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeL, faceY + 1, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeL + 1, faceY, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeL + 1, faceY + 1, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeL, faceY, "#FFFFFF", "breathe-grp"));

    faceLayer.push(px(eyeR, faceY, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeR, faceY + 1, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeR - 1, faceY, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeR - 1, faceY + 1, "#1C1032", "breathe-grp"));
    faceLayer.push(px(eyeR - 1, faceY, "#FFFFFF", "breathe-grp"));

    faceLayer.push(px(lipX, faceY + 2, "#4A0E17", "breathe-grp"));
    faceLayer.push(px(lipX + 1, faceY + 2, "#4A0E17", "breathe-grp"));
    faceLayer.push(px(lipX, faceY + 3, "#FF75A9", "breathe-grp"));

    faceLayer.push(px(eyeL - 2, faceY + 2, "#FF5E9B", "breathe-grp"));
    faceLayer.push(px(eyeL - 1, faceY + 2, "#FF5E9B", "breathe-grp"));
    faceLayer.push(px(eyeR + 1, faceY + 2, "#FF5E9B", "breathe-grp"));
    faceLayer.push(px(eyeR + 2, faceY + 2, "#FF5E9B", "breathe-grp"));
  }

  // --- 8. ELEMENT CUSTOM PARTICLE EMITTERS ---
  if (level >= 8) {
    const partCol = palette.particle;
    
    // Choose particle visuals depending on element type
    let pMarkup1 = px(4, 13, partCol, "p-slow1");
    let pMarkup2 = px(27, 15, partCol, "p-slow2");
    
    if (element === "forest") {
      // Little leaves / clovers
      pMarkup1 = px(4, 13, "#1C9E40", "p-slow1") + px(5, 12, "#ADE8BC", "p-slow1");
      pMarkup2 = px(27, 15, "#1C9E40", "p-slow2") + px(26, 16, "#ADE8BC", "p-slow2");
    } else if (element === "crystal") {
      // Ice flakes
      pMarkup1 = px(4, 13, "#22D3EE", "p-slow1") + px(5, 12, "#FFFFFF", "p-slow1");
      pMarkup2 = px(27, 15, "#22D3EE", "p-slow2") + px(26, 16, "#FFFFFF", "p-slow2");
    } else if (element === "magic") {
      // Deep purple shadow spikes
      pMarkup1 = px(4, 13, "#491C80", "p-slow1") + px(5, 12, "#A855F7", "p-slow1");
      pMarkup2 = px(27, 15, "#491C80", "p-slow2") + px(26, 16, "#A855F7", "p-slow2");
    } else if (element === "candy") {
      // Pink love hearts
      pMarkup1 = px(4, 13, "#F43F5E", "p-slow1") + px(5, 12, "#FDA4AF", "p-slow1");
      pMarkup2 = px(27, 15, "#F43F5E", "p-slow2") + px(26, 16, "#FDA4AF", "p-slow2");
    } else if (element === "star") {
      // Yellow glowing stars
      pMarkup1 = px(4, 13, "#EAB308", "p-slow1") + px(5, 12, "#FEF08A", "p-slow1");
      pMarkup2 = px(27, 15, "#EAB308", "p-slow2") + px(26, 16, "#FEF08A", "p-slow2");
    }

    foregroundLayer.push(pMarkup1);
    foregroundLayer.push(pMarkup2);

    if (level >= 13) {
      foregroundLayer.push(px(7, 5, "#ffffff", "p-slow2"));
      foregroundLayer.push(px(24, 6, partCol, "p-slow1"));
    }

    if (level >= 17) {
      foregroundLayer.push(px(11, 4, "#ffffff", "p-slow1"));
      foregroundLayer.push(px(20, 4, "#ffffff", "p-slow2"));
    }
  }

  // --- CONSOLIDATED DIGITAL SPRITE OUTPUT ---
  return `
    <svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" style="style="width: 100%; height: 100%;" width: 100%; height: 100%;">
      <style>${css}</style>
      <!-- Background Layers (Wings, Tail, Magic circles) -->
      ${backgroundLayer.join("")}

      <g class="${expr === 'sad' ? 'sad-shrink-grp' : ''} ${expr === 'very_happy' ? 'happy-hop-grp' : ''} ${expr === 'excited' ? 'excited-glow-grp' : ''} ${expr === 'tired' ? 'tired-slow-grp' : ''}">
        <!-- Midground Layers (Ground shadow, Main body blocks) -->
        ${midgroundLayer.join("")}

        <!-- Face Layers (Big cute shine eyes, blushes, mouth) -->
        ${faceLayer.join("")}

        <!-- Foreground Layers (Epic crowns, front horns, drifting sparkles) -->
        ${foregroundLayer.join("")}
      </g>
    </svg>
  `;
}

export function getPersonalityTitle(student: Partial<Student>): string {
  const stats = student.pet?.personalityStats || {} as any;
  const keys = Object.keys(personalityTitleMap);
  const vals = keys.map(k => Number(stats[k] || 0));
  const max = Math.max(...vals, 0);
  if (max <= 0) return "多才多藝史萊姆";
  const winners = keys.filter(k => Number(stats[k] || 0) === max);
  return winners.length === 1 ? personalityTitleMap[winners[0]] : "多才多藝史萊姆";
}

export function computeStudentTitle(student: Partial<Student>): string {
  const c = Number(student?.completedTaskCount || 0);
  const st = student?.taskTypeStats || { clean: 0, reading: 0, speaking: 0, cooperation: 0, manners: 0, responsibility: 0 };
  if (Object.values(st).filter(v => v >= 3).length >= 4) return "全能小達人";
  if (c >= 30) return "超級任務王";
  if (c >= 20) return "班級小英雄";
  if (c >= 10) return "任務達人";
  if ((st.clean || 0) >= 5) return "整潔小隊長";
  if ((st.reading || 0) >= 5) return "閱讀小書蟲";
  if ((st.speaking || 0) >= 5) return "發言小勇士";
  if ((st.cooperation || 0) >= 5) return "合作小夥伴";
  if ((st.manners || 0) >= 5) return "禮貌小天使";
  if ((st.responsibility || 0) >= 5) return "作業守護者";
  if (c >= 5) return "穩定小幫手";
  if (c >= 1) return "任務新手";
  return "等待發光中";
}

export function inferTaskType(taskTitle: string, taskCategory: string, taskType: string): string {
  const txt = `${taskTitle || ""} ${taskCategory || ""}`;
  if (/整理|打掃|清潔|桌面/.test(txt)) return "clean";
  if (/閱讀|讀書/.test(txt)) return "reading";
  if (/發言|分享|回答/.test(txt)) return "speaking";
  if (/合作|幫助|團隊/.test(txt)) return "cooperation";
  if (/禮貌|排隊/.test(txt)) return "manners";
  if (/作業|聯絡簿/.test(txt)) return "responsibility";
  return taskType === "group" ? "cooperation" : "responsibility";
}

export const defaultBackgroundGachaItems: BackgroundGachaItem[] = [
  {
    id: "basic_sky",
    name: "粉彩天空",
    category: "background",
    type: "background",
    rarity: "basic",
    probability: 20,
    equippedPosition: "背景",
    placement: "背景",
    enabled: true,
    isDefault: true,
    presetSvgMarkup: "linear-gradient(to bottom, #ff9a9e 0%, #fecfef 100%)",
    imageUrl: ""
  },
  {
    id: "basic_blue_classroom",
    name: "淡藍教室",
    category: "background",
    type: "background",
    rarity: "basic",
    probability: 20,
    equippedPosition: "背景",
    placement: "背景",
    enabled: true,
    isDefault: true,
    presetSvgMarkup: "linear-gradient(to bottom, #e0f2fe 0%, #bae6fd 100%)",
    imageUrl: ""
  },
  {
    id: "basic_warm_room",
    name: "暖黃房間",
    category: "background",
    type: "background",
    rarity: "basic",
    probability: 20,
    equippedPosition: "背景",
    placement: "背景",
    enabled: true,
    isDefault: true,
    presetSvgMarkup: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
    imageUrl: ""
  },
  {
    id: "basic_forest_green",
    name: "森林綠",
    category: "background",
    type: "background",
    rarity: "basic",
    probability: 20,
    equippedPosition: "背景",
    placement: "背景",
    enabled: true,
    isDefault: true,
    presetSvgMarkup: "radial-gradient(circle at center, #86efac 0%, #166534 100%)",
    imageUrl: ""
  },
  {
    id: "basic_night_purple",
    name: "夜空紫",
    category: "background",
    type: "background",
    rarity: "basic",
    probability: 20,
    equippedPosition: "背景",
    placement: "背景",
    enabled: true,
    isDefault: true,
    presetSvgMarkup: "radial-gradient(circle at top right, #3b0764 0%, #0f172a 100%)",
    imageUrl: ""
  }
];

export const defaultAchievements = [
  {
    achievementId: "ach_kind_angel",
    name: "愛心小天使",
    description: "主動關懷身邊同學，並樂於分享溫暖的愛心！",
    icon: "👼",
    category: "品德表現",
    rarity: "epic",
    enabled: true,
    createdAt: "2026-05-29T00:00:00.000Z"
  },
  {
    achievementId: "ach_read_master",
    name: "閱讀達人",
    description: "勤於閱讀課外讀物，充滿好奇心與豐厚智識！",
    icon: "📖",
    category: "學術學習",
    rarity: "rare",
    enabled: true,
    createdAt: "2026-05-29T00:00:00.000Z"
  },
  {
    achievementId: "ach_art_expert",
    name: "藝術小高手",
    description: "在美感、音樂或創作上展現耀眼天賦與熱情！",
    icon: "🎨",
    category: "多元才藝",
    rarity: "rare",
    enabled: true,
    createdAt: "2026-05-29T00:00:00.000Z"
  },
  {
    achievementId: "ach_clean_star",
    name: "整潔之星",
    description: "認真維持個人與周遭環境整潔，乾淨有條理！",
    icon: "🧹",
    category: "日常常規",
    rarity: "common",
    enabled: true,
    createdAt: "2026-05-29T00:00:00.000Z"
  },
  {
    achievementId: "ach_help_model",
    name: "助人楷模",
    description: "積極協助班級事務，是大家公認的心靈支柱與幫手！",
    icon: "🤝",
    category: "品德表現",
    rarity: "legendary",
    enabled: true,
    createdAt: "2026-05-29T00:00:00.000Z"
  },
  {
    achievementId: "ach_math_warrior",
    name: "數學勇士",
    description: "無懼數學難題，積極思考，解題邏輯大爆發！",
    icon: "⚔️",
    category: "學術學習",
    rarity: "epic",
    enabled: true,
    createdAt: "2026-05-29T00:00:00.000Z"
  },
  {
    achievementId: "ach_best_progress",
    name: "最佳進步獎",
    description: "展現超凡毅力與正面態度，突破自我獲得巨大進步！",
    icon: "📈",
    category: "日常常規",
    rarity: "mythic",
    enabled: true,
    createdAt: "2026-05-29T00:00:00.000Z"
  }
];

export const MBTI_PETS: Record<string, {
  type: string;
  title: string;
  description: string;
  quotes: string[];
  advice: string[];
}> = {
  ISTJ: {
    type: "ISTJ",
    title: "系統守護者",
    description: "重視規律與責任感，會嚴格監督任務完成度。腳踏實地的可靠史萊姆。",
    quotes: ["「今天有未完成的任務嗎？建議先完成最重要的一項。」", "「規律的生活才能孕育強大的魔法力喔。」", "「每一分點數，都是你辛勤付出的完美成果！」"],
    advice: ["適合多排定每日例行任務，強化紀律常規。"]
  },
  ISFJ: {
    type: "ISFJ",
    title: "溫柔治癒者",
    description: "細心體貼，最在乎主人的健康與心情。總是安靜守護在身旁。",
    quotes: ["「你辛苦了，要記得休息喔。」", "「我會一直陪著你，不管發生什麼事。」", "「肚子餓了嗎？要不要一起去兌換點心吃呢？」"],
    advice: ["多進行餵食與親密度培養，會讓牠感到幸福滿滿！"]
  },
  INFJ: {
    type: "INFJ",
    title: "心靈魔導士",
    description: "充滿神秘感，擁有極強的洞察力與精神共鳴。追求深層的魔法智慧。",
    quotes: ["「有時候，靜下心來傾聽，就能找到解決問題的最佳答案。」", "「每一次成長，都是靈魂深處的一次微光閃爍。」", "「我覺得主人的靈魂深處，藏著一顆無比善良的星星。」"],
    advice: ["適合進行高度學術或智慧相關課程，加強思考力。"]
  },
  INTJ: {
    type: "INTJ",
    title: "小軍師",
    description: "喜歡規劃未來與分析，不喜歡盲目行動。高冷卻無比可靠的智慧軍師。",
    quotes: ["「我已經想好接下來三天的訓練計畫了。」", "「努力是有方向的，不是盲目的。」", "「你目前的點數與經驗值增長速率非常符合我的軌跡規劃。」"],
    advice: ["多上【閱讀課】或科學思維來拓展智謀屬性。"]
  },
  ISTP: {
    type: "ISTP",
    title: "極客工匠",
    description: "動手能力極強的技術流派。喜歡研究各種怪異的道具與背景裝備結構。",
    quotes: ["「這款裝飾背景的像素結構很有意思，等我把它拆開看看...」", "「實踐是檢驗真理的最佳途徑，動手吧！」", "「呼...我的核心齒輪運作得非常完美。」"],
    advice: ["多換洗家具背景、參與手作清理任務以提高動手性格。"]
  },
  ISFP: {
    type: "ISFP",
    title: "靈感藝術家",
    description: "對美感極其敏銳，沉浸在自我的藝術創作世界。多愁善感的小可愛。",
    quotes: ["「今天的夕陽光影，正好落在我最愛的背景物上...」", "「美就在細節裡，一起用心感覺生活中的小確幸吧。」", "「畫筆能畫出我們說不出的悄悄話喔。」"],
    advice: ["適合多抽取扭蛋、配置華麗背景，提升藝術與感性數值。"]
  },
  INFP: {
    type: "INFP",
    title: "追光夢想家",
    description: "敏感溫柔、富於浪漫幻想。相信奇蹟與內在精神價值的純真精靈。",
    quotes: ["「好想化作一朵雲，漂浮在天空中看看這個美麗的世界。」", "「沒關係的，按照你自己的步調慢慢長大，我也是喔。」", "「你今天對我的微笑，是世界上最好吃的星星糖果。」"],
    advice: ["多與寵物對話與互動，增進親密度與同理心。"]
  },
  INTP: {
    type: "INTP",
    title: "真理追尋者",
    description: "思維永不停止運轉的學者。對未知的宇宙學問擁有無窮的求知慾。",
    quotes: ["「根據我的精密計算，史萊姆進化成光之精靈的概率是...」", "「為什麼天空是藍色的，而我們史萊姆是彩色的呢？」", "「嗯...這一個甜點的糖分轉換公式大約需要以下算式...」"],
    advice: ["多修讀閱讀和觀察研究系課程，能極大滿足探索慾。"]
  },
  ESTP: {
    type: "ESTP",
    title: "冒險急先鋒",
    description: "行動力爆表！喜歡刺激和競技，是最愛在草地上打滾的元氣派。",
    quotes: ["「猶豫什麼？衝就對了！一邊衝刺一邊修正航道吧！」", "「別整天靜坐啦，快帶我去戶外進行魔鬼特訓！」", "「哈哈！我的速度可是全班第一喔！」"],
    advice: ["多發布需要迅速執行的戶外、體能、主動發言任務。"]
  },
  ESFP: {
    type: "ESFP",
    title: "派對發光體",
    description: "班級裡的焦點寵兒。天生幽默、熱情四射，每天都充滿元氣與笑聲。",
    quotes: ["「耶！一起大聲唱歌、快樂跳舞吧！今天也是超嗨的一天！」", "「主人看我！我的黏液今天是不是閃閃發亮？」", "「快樂的魔力是會傳染的喔！哈哈哈哈！」"],
    advice: ["多餵食色彩繽紛的點心，並穿戴逗趣的裝飾配件。"]
  },
  ENFP: {
    type: "ENFP",
    title: "冒險家",
    description: "無限好奇，熱愛驚喜。擁有一顆永不枯竭的奇思妙想腦袋與樂天派精神。",
    quotes: ["「今天一定有什麼好玩的事情要發生！」", "「一起去冒險吧！」", "「哇！今天的世界也是彩虹顏色的耶，太讓人期待了！」"],
    advice: ["經常在介面點擊寵物與牠談天說地、發揮創意。"]
  },
  ENTP: {
    type: "ENTP",
    title: "百變智多星",
    description: "思維鬼才，喜歡打破常規提出精闢點子。熱衷於好玩的智力大挑戰與腦力激盪。",
    quotes: ["「咦？如果我們把這個任務規則倒過來挑戰會怎麼樣？」", "「規矩是人定的，我們來玩點不一樣的魔法魔術吧！」", "「你聽說過薛丁格的史萊姆嗎？很有趣喔！」"],
    advice: ["多上發言分享類的討論課，點擊觸發古怪的奇思妙想。"]
  },
  ESTJ: {
    type: "ESTJ",
    title: "管家總督",
    description: "意志堅定、高效率而且有極強的組織紀律。史萊姆界中名副其實的紀律委員。",
    quotes: ["「落後就要補上！讓我們制定一份精準的每日升級指標吧。」", "「準時與紀律是卓越人才的標配！今天你做到了嗎？」", "「秩序整理得井井有條，才能發揮 100% 的效率。」"],
    advice: ["適合多發行高挑戰性任務，在短時間完成督促職責。"]
  },
  ESFJ: {
    type: "ESFJ",
    title: "熱心小班長",
    description: "超級樂善好施、細緻周到。總是主動協助班級，熱愛集體凝聚力與同學和好。",
    quotes: ["「大家一起手拉手前進，才是真正的勝利喔！」", "「今天的團體合作任務，我有好好為主人加油鼓勁！」", "「你覺得小明同學今天的背景好看嗎？我也很喜歡耶！」"],
    advice: ["積極發起和完成團體合作等班級聯名任務。"]
  },
    ENFJ: {
    type: "ENFJ",
    title: "熱情引路人",
    description: "散發出溫暖的領袖魅力，熱情鼓舞班上的每一個人共同追求光明與進步。",
    quotes: ["「我相信只要我們攜手，就能創造史無前例的滿分奇蹟！」", "「你身上有著無比巨大的潛力，跟著我一起把它激發出來吧！」", "「今天也要充滿自信地跟世界打招呼唷！」"],
    advice: ["適合發起多人或小組團體任務，增強班級整體熱忱。"]
  },
  ENTJ: {
    type: "ENTJ",
    title: "霸道總裁",
    description: "天生的戰略家與領袖，好勝心極強、熱愛挑戰高難度指標與競爭對抗。",
    quotes: ["「目標已經設定好了，出發吧！」", "「第一名的位置很適合我們。」", "「跟隨我的腳步，勝利絕對是百分之百屬於我們的！」"],
    advice: ["多參與高點數、具競速或排名的卓越成就與任務。"]
  }
};

export function calculateStudentMBTI(student: Partial<Student>) {
  const learningCount = student.pet?.learningLog?.length || 0;
  const feedCount = student.feedLog?.length || 0;
  
  const specClean = student.taskTypeStats?.clean || 0;
  const specRead = student.taskTypeStats?.reading || 0;
  const specSpeak = student.taskTypeStats?.speaking || 0;
  const specCoop = student.taskTypeStats?.cooperation || 0;
  const specManners = student.taskTypeStats?.manners || 0;
  const specRes = student.taskTypeStats?.responsibility || 0;
  
  // Base scores from student behaviors
  let E = specSpeak + specCoop + (student.completedTaskCount || 0) * 0.2 + 2; 
  let I = specRead + specRes + learningCount * 0.5 + 2;

  let S = specClean + specManners + feedCount * 0.4 + 2;
  let N = (student.pet?.personalityStats?.imagination || 0) * 0.5 + (student.pet?.personalityStats?.creativity || 0) * 0.5 + learningCount * 0.4 + 2;

  let T = (student.pet?.personalityStats?.wisdom || 0) * 0.5 + (student.pet?.personalityStats?.discipline || 0) * 0.5 + (student.points || 0) * 0.05 + 2;
  let F = (student.pet?.personalityStats?.affinity || 0) * 0.6 + (student.petStats?.affinity || 10) * 0.1 + 2;

  let J = specRes + specClean + 2;
  let P = (student.studentOwnedBackgrounds?.length || 0) + (student.studentOwnedDecorations?.length || 0) + feedCount * 0.2 + 2;

  // Food history influence offsets
  const foodHistory = student.foodHistory || [];
  foodHistory.forEach((foodCategory) => {
    if (foodCategory === "水果") {
      E += 1.5; P += 1.5; N += 1.0;
    } else if (foodCategory === "蔬菜") {
      I += 1.5; J += 1.5; F += 1.0;
    } else if (foodCategory === "甜點") {
      E += 1.0; F += 1.5; J += 1.5;
    } else if (foodCategory === "主食") {
      I += 1.5; S += 1.5; T += 1.0;
    } else if (foodCategory === "肉類") {
      E += 1.5; T += 1.5; J += 1.0;
    } else if (foodCategory === "特殊食物") {
      I += 1.5; N += 1.5; T += 1.0;
    } else if (foodCategory === "飲料") {
      E += 1.0; P += 1.0;
    }
  });

  const dim1 = E >= I ? "E" : "I";
  const dim2 = S >= N ? "S" : "N";
  const dim3 = T >= F ? "T" : "F";
  const dim4 = J >= P ? "J" : "P";

  const mbtiType = `${dim1}${dim2}${dim3}${dim4}`;
  const details = MBTI_PETS[mbtiType] || MBTI_PETS["ISFJ"];

  // Calculate fav food and recent preference
  const counts: Record<string, number> = {
    "水果": 0, "蔬菜": 0, "甜點": 0, "主食": 0, "肉類": 0, "飲料": 0, "特殊食物": 0
  };
  foodHistory.forEach(cat => {
    if (counts[cat] !== undefined) counts[cat]++;
  });

  let favFood = "水果";
  let maxCount = 0;
  Object.entries(counts).forEach(([cat, val]) => {
    if (val > maxCount) {
      maxCount = val;
      favFood = cat;
    }
  });

  const recentPref = foodHistory.length > 0 ? foodHistory[0] : "無";

  return {
    type: mbtiType,
    title: details.title,
    description: details.description,
    advice: details.advice,
    favFood,
    recentPref,
    personalityScore: {
      E: Math.round(E),
      I: Math.round(I),
      N: Math.round(N),
      S: Math.round(S),
      T: Math.round(T),
      F: Math.round(F),
      J: Math.round(J),
      P: Math.round(P)
    }
  };
}

export function getPetDialogue(student: Partial<Student>): string {
  const currentStamina = student.petStats?.stamina !== undefined ? student.petStats.stamina : 50;
  const hunger = student.currentHunger !== undefined ? student.currentHunger : currentStamina;

  if (hunger < 10) {
    return "「我真的好餓喔⋯」";
  }
  if (hunger < 20) {
    return "「肚子咕嚕咕嚕叫了⋯」";
  }
  if (hunger < 40) {
    return "「主人，我有點餓了。」";
  }

  const mbtiInfo = calculateStudentMBTI(student);
  const type = mbtiInfo.type;
  
  // What is the primary category in food history?
  const counts: Record<string, number> = {
    "水果": 0, "蔬菜": 0, "甜點": 0, "主食": 0, "肉類": 0, "飲料": 0, "特殊食物": 0
  };
  (student.foodHistory || []).forEach(cat => {
    if (counts[cat] !== undefined) counts[cat]++;
  });
  
  let dominantFood = "無";
  let maxVal = 0;
  Object.entries(counts).forEach(([cat, val]) => {
    if (val > maxVal) {
      maxVal = val;
      dominantFood = cat;
    }
  });

  // Food specific overrides if dominant food has many counts (e.g., >= 2 counts)
  if (maxVal >= 2) {
    if (dominantFood === "水果") {
      const fruitQuotes = [
        "「今天感覺充滿活力！想出去探索新地方！」🍎🍌",
        "「水果多汁又美味，吃完我覺得思維變得超活潑的！」🍓🍊",
        "「嘻嘻，大自然的味道讓我想唱一首甜甜的歌～」🍒🍑"
      ];
      return fruitQuotes[Math.floor(Math.random() * fruitQuotes.length)];
    }
    if (dominantFood === "甜點") {
      const dessertQuotes = [
        "「好想再吃一次甜甜的東西！跟你在一起最開心了！」🍰🍬",
        "「吃甜點時心跳得好快，這就是幸福的粉紅泡泡嗎？🌸」🍮🍫",
        "「嘿嘿，主人最寵我了對不對？我要一直貼著你撒嬌～」🍦🍭"
      ];
      return dessertQuotes[Math.floor(Math.random() * dessertQuotes.length)];
    }
    if (dominantFood === "肉類") {
      const meatQuotes = [
        "「今天來挑戰更難的任務吧！感覺渾身充滿了衝勁與爆發力！」🥩🍖",
        "「第一名非我們莫屬！帶我去擊敗所有的學習障礙吧！」⚔️🔥",
        "「嚼嚼...肉類的能量最棒了，我們現在強得不可思議喔！」🍗"
      ];
      return meatQuotes[Math.floor(Math.random() * meatQuotes.length)];
    }
    if (dominantFood === "蔬菜") {
      const vegQuotes = [
        "「多吃蔬菜，心靈也會跟著變得無比平靜而溫和呢。」🥗🥬",
        "「謝謝主人細心為我挑選蔬菜，我會耐心陪著你度過每一天。」🥦🍅",
        "「規律穩定的力量，才是魔法智慧的真正源頭喔。」🥒"
      ];
      return vegQuotes[Math.floor(Math.random() * vegQuotes.length)];
    }
    if (dominantFood === "主食") {
      const stapleQuotes = [
        "「每一步都要踏踏實實。今天我也要督促你完成所有課堂作業！」🍱🍙",
        "「主食提供了最紮實的能量，認真生活的小孩最棒了。」🍞麵包",
        "「吃飽飽，精神好！主人，規劃好的任務有沒有逐一打勾呢？」🍛"
      ];
      return stapleQuotes[Math.floor(Math.random() * stapleQuotes.length)];
    }
    if (dominantFood === "特殊食物") {
      const specialQuotes = [
        "「嗯...感覺到一股神秘奇異的力量在我們身邊悄悄流動...」🌌✨",
        "「這不是普通的食物，這是真理奧秘與智慧的結晶！」🧪🔮",
        "「我在思索，宇宙的深度是否等於史萊姆在時空中穿越的距離呢？」🚀"
      ];
      return specialQuotes[Math.floor(Math.random() * specialQuotes.length)];
    }
  }

  // Base MBTI speech list
  const details = MBTI_PETS[type] || MBTI_PETS["ISFJ"];
  const quotes = details.quotes || [];
  return quotes[Math.floor(Math.random() * quotes.length)] || "主人，今天也要加油喔！✨";
}

export function getFoodCategory(foodName: string): string {
  if (foodName.includes("蛋糕") || foodName.includes("甜點") || foodName.includes("甜食") || foodName.includes("糖果") || foodName.includes("布丁") || foodName.includes("巧克力") || foodName.includes("泡芙") || foodName.includes("餅乾") || foodName.includes("馬卡龍")) {
    return "甜點";
  }
  if (foodName.includes("便當") || foodName.includes("飯") || foodName.includes("麵") || foodName.includes("三明治") || foodName.includes("壽司") || foodName.includes("薯條") || foodName.includes("漢堡")) {
    return "主食";
  }
  if (foodName.includes("牛奶") || foodName.includes("汽水") || foodName.includes("可樂") || foodName.includes("紅茶") || foodName.includes("綠茶") || foodName.includes("飲料") || foodName.includes("茶") || foodName.includes("果汁") || foodName.includes("咖啡") || foodName.includes("奶茶")) {
    return "飲料";
  }
  if (foodName.includes("蔬菜") || foodName.includes("沙拉") || foodName.includes("胡蘿蔔") || foodName.includes("青菜") || foodName.includes("西蘭花") || foodName.includes("番茄")) {
    return "蔬菜";
  }
  if (foodName.includes("水果") || foodName.includes("蘋果") || foodName.includes("香蕉") || foodName.includes("草莓") || foodName.includes("櫻桃") || foodName.includes("西瓜") || foodName.includes("葡萄") || foodName.includes("芒果")) {
    return "水果";
  }
  if (foodName.includes("肉") || foodName.includes("雞") || foodName.includes("豬") || foodName.includes("牛") || foodName.includes("魚") || foodName.includes("蝦") || foodName.includes("海鮮") || foodName.includes("排")) {
    return "肉類";
  }
  return "特殊食物";
}

export function awardPoints(
  prev: AppData,
  studentId: string,
  delta: number,
  source: string,
  operator: string = "教師"
): AppData {
  if (delta === 0) return prev;
  
  const student = prev.students.find(s => s.id === studentId);
  if (!student) return prev;

  const updatedStudents = prev.students.map(s => {
    if (s.id === studentId) {
      return {
        ...s,
        points: s.points + delta
      };
    }
    return s;
  });
  
  const timestamp = new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" }) + " " + new Date().toLocaleTimeString("zh-TW", { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  const newLog: PointLog = {
    timestamp,
    studentId,
    studentName: student.name,
    source,
    deltaPoints: delta,
    totalAfter: student.points + delta,
    operator
  };
  
  const pointLogs = prev.pointLogs ? [...prev.pointLogs, newLog] : [newLog];
  
  return {
    ...prev,
    students: updatedStudents,
    pointLogs
  };
}

export function appendPointLog(
  prev: AppData,
  studentId: string,
  delta: number,
  source: string,
  operator: string = "教師",
  forcedTotalAfter?: number
): AppData {
  if (delta === 0) return prev;
  const student = prev.students.find(s => s.id === studentId);
  if (!student) return prev;
  
  const timestamp = new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" }) + " " + new Date().toLocaleTimeString("zh-TW", { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const totalAfter = typeof forcedTotalAfter === "number" ? forcedTotalAfter : student.points;
  
  const newLog: PointLog = {
    timestamp,
    studentId,
    studentName: student.name,
    source,
    deltaPoints: delta,
    totalAfter,
    operator
  };
  
  const pointLogs = prev.pointLogs ? [...prev.pointLogs, newLog] : [newLog];
  return {
    ...prev,
    pointLogs
  };
}

export function appendTeacherActionLog(
  prev: AppData,
  action: string,
  detail: string,
  operator: string = "教師"
): AppData {
  const timestamp = new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" }) + " " + new Date().toLocaleTimeString("zh-TW", { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  const newLog: TeacherActionLog = {
    id: "action_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
    timestamp,
    action,
    detail,
    operator
  };
  
  const teacherActionLogs = prev.teacherActionLogs ? [...prev.teacherActionLogs, newLog] : [newLog];
  
  return {
    ...prev,
    teacherActionLogs
  };
}

export function petExpressionSystem(student: Partial<Student> | undefined): "normal" | "happy" | "very_happy" | "sad" | "tired" | "angry" | "excited" | "love" | "proud" | "hungry" {
  if (!student) return "normal";
  if (student.currentExpression) {
    return student.currentExpression as any;
  }
  return getPetExpression(student as Student) as any;
}

export function calculateSecondsUntilTime(targetTimeStr: string): number {
  if (!targetTimeStr) return 0;
  const [hours, minutes] = targetTimeStr.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  
  let diffMs = targetDate.getTime() - now.getTime();
  if (diffMs < 0) {
    // Treat as expired for past today
    return 0;
  }
  return Math.floor(diffMs / 1000);
}

export function getCurrentTimeHHMM(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
}

export function getTimedTaskRemainingSeconds(t: { isActive: boolean; expired: boolean; remainingSeconds: number; timeMode?: string; endTimeStr?: string; startedAt: number | null; durationSeconds: number }): number {
  if (!t.isActive) return t.remainingSeconds;
  if (t.expired) return 0;
  if (t.timeMode === "endTime" && t.endTimeStr) {
    return calculateSecondsUntilTime(t.endTimeStr);
  }
  if (t.startedAt) {
    return Math.max(0, t.durationSeconds - Math.floor((Date.now() - t.startedAt) / 1000));
  }
  return t.remainingSeconds;
}



