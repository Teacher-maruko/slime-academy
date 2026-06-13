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
  if (!student) student = {};
  
  const level = Number(student?.pet?.level || 1);
  const element = student?.pet?.growthType || student?.element || "candy";
  // Dynamically evaluate expression from system logic and cast to string for broad compatibility
  const expr = getPetExpression(student as Student) as string;
  const fullness = student?.currentHunger !== undefined ? student.currentHunger : (student?.petStats?.stamina !== undefined ? student.petStats.stamina : 50);

  // Define element themes and colors
  const baseGradStart = {
    magic: "#C084FC",
    crystal: "#38BDF8",
    forest: "#34D399",
    star: "#FBBF24",
    candy: "#F472B6"
  }[element] || "#F472B6";

  const baseGradEnd = {
    magic: "#6B21A8",
    crystal: "#0369A1",
    forest: "#065F46",
    star: "#9A3412",
    candy: "#9D174D"
  }[element] || "#9D174D";

  // Satiety visual adjustments
  const isHungry = fullness < 20;
  const isTiredStatus = fullness < 40 && fullness >= 20;
  const isPlump = fullness >= 80;

  // Luster degradation for low satiety
  const gradStart = isHungry ? "#94A3B8" : (isTiredStatus ? {
    magic: "#A78BFA",
    crystal: "#22D3EE",
    forest: "#6EE7B7",
    star: "#FCD34D",
    candy: "#FBCFE8"
  }[element] || "#FBCFE8" : baseGradStart);

  const gradEnd = isHungry ? "#475569" : (isTiredStatus ? {
    magic: "#5B21B6",
    crystal: "#155E75",
    forest: "#047857",
    star: "#B45309",
    candy: "#BE185D"
  }[element] || "#BE185D" : baseGradEnd);

  // Border/Outline Color
  const outlineColor = isHungry ? "#1E293B" : {
    magic: "#2E1065",
    crystal: "#082F49",
    forest: "#022C22",
    star: "#451A03",
    candy: "#500724"
  }[element] || "#500724";

  // Particle colors
  const particleColor = {
    magic: "#E9D5FF",
    crystal: "#E0F2FE",
    forest: "#D1FAE5",
    star: "#FEF3C7",
    candy: "#FCE7F3"
  }[element] || "#FCE7F3";

  // Selection of CSS styling for micro-expression symbols and animations
  const animationClass = isHungry ? "shiver-anim" : (isPlump ? "bounce-fat-anim" : "bounce-normal-anim");
  const wingClass = "wing-breathe-anim";
  const floatClass = "float-item-anim";

  // -------------------------------------------------------------
  // CSS DEFINITIONS (Embedded inside SVG to render beautifully inside IFrames)
  // -------------------------------------------------------------
  const svgCSS = `
    @keyframes bounce-normal {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-8px) scale(0.97, 1.03); }
    }
    @keyframes bounce-fat {
      0%, 100% { transform: translateY(0) scale(1, 0.98); }
      50% { transform: translateY(-5px) scale(1.04, 0.95); }
    }
    @keyframes shiver {
      0%, 100% { transform: translate(0, 0); }
      20% { transform: translate(-1px, 1px); }
      40% { transform: translate(1px, -1px); }
      60% { transform: translate(-1px, -1px); }
      80% { transform: translate(1px, 1px); }
    }
    @keyframes shadow-scale {
      0%, 100% { transform: scale(1); opacity: 0.2; }
      50% { transform: scale(0.9); opacity: 0.12; }
    }
    @keyframes float-slow {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-6px) rotate(2deg); }
    }
    @keyframes wing-flap {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(6deg); }
    }
    @keyframes symbol-pulse {
      0%, 100% { transform: scale(1); opacity: 0.8; }
      50% { transform: scale(1.15); opacity: 1; }
    }
    .bounce-normal-anim { animation: bounce-normal 2.2s ease-in-out infinite; transform-origin: center bottom; }
    .bounce-fat-anim { animation: bounce-fat 2.8s ease-in-out infinite; transform-origin: center bottom; }
    .shiver-anim { animation: shiver 0.3s ease-in-out infinite; transform-origin: center bottom; }
    .shadow-scale-anim { animation: shadow-scale 2.2s ease-in-out infinite; transform-origin: center; }
    .wing-breathe-anim { animation: wing-flap 2.2s ease-in-out infinite; transform-origin: center; }
    .float-item-anim { animation: float-slow 3s ease-in-out infinite; }
    .pulse-anim { animation: symbol-pulse 1.5s ease-in-out infinite; transform-origin: center; }
  `;

  // -------------------------------------------------------------
  // EGG RENDERERS (Lvl 1 - Lvl 3)
  // -------------------------------------------------------------
  if (level <= 3) {
    const isCracked = level === 3;
    return `
      <svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%;">
        <style>${svgCSS}</style>
        <defs>
          <radialGradient id="eggGrad" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stop-color="${gradStart}"/>
            <stop offset="70%" stop-color="${gradEnd}"/>
            <stop offset="100%" stop-color="${outlineColor}"/>
          </radialGradient>
        </defs>
        
        <!-- Ground Shadow -->
        <ellipse cx="128" cy="208" rx="42" ry="8" fill="rgba(0,0,0,0.15)"/>
        
        <!-- Egg Body Group with soft float -->
        <g class="${floatClass}" style="transform-origin: center 150px;">
          <!-- Main Egg Shape -->
          <path d="M 128,65 C 85,65 72,130 72,165 C 72,200 97,210 128,210 C 159,210 184,200 184,165 C 184,130 171,65 128,65 Z" 
                fill="url(#eggGrad)" stroke="${outlineColor}" stroke-width="6" stroke-linejoin="round"/>
          
          <!-- Egg Decorative Ribbon Stripe -->
          <path d="M 73,155 Q 128,180 183,155 Q 128,190 73,155" fill="${particleColor}" opacity="0.8"/>
          
          ${isCracked ? `
            <!-- Cracked lines showing slime eyes peeking -->
            <path d="M 105,145 L 120,135 L 132,143 L 148,133 L 157,144" fill="none" stroke="${outlineColor}" stroke-width="4" stroke-linecap="round"/>
            <path d="M 105,145 L 115,155 L 130,147 L 145,156 L 157,144" fill="none" stroke="${outlineColor}" stroke-width="4" stroke-linecap="round"/>
            
            <!-- Peeking glowing Eyes -->
            <circle cx="122" cy="144" r="5" fill="#FFFFFF"/>
            <circle cx="122" cy="144" r="2.5" fill="#000000"/>
            <circle cx="138" cy="144" r="5" fill="#FFFFFF"/>
            <circle cx="138" cy="144" r="2.5" fill="#000000"/>
          ` : `
            <!-- Speckle details on non-cracked egg -->
            <circle cx="102" cy="115" r="4" fill="${particleColor}" opacity="0.6"/>
            <circle cx="148" cy="100" r="5" fill="${particleColor}" opacity="0.6"/>
            <circle cx="152" cy="150" r="3" fill="${particleColor}" opacity="0.6"/>
          `}
          
          <!-- Cute Shell Glistening Spot -->
          <ellipse cx="106" cy="100" rx="6" ry="12" fill="#FFFFFF" opacity="0.3" transform="rotate(-15 106 100)"/>
        </g>
      </svg>
    `;
  }

  // -------------------------------------------------------------
  // SLIME RENDERER (Lvl 4+)
  // -------------------------------------------------------------

  // Dimensions & Paths customized for Satiety
  let bodyPath = "";
  let shadowRx = 65;
  let shadowRy = 12;

  if (isPlump) {
    // Round, chubby bouncy layout
    bodyPath = "M 42,150 C 42,95 72,66 128,66 C 184,66 214,95 214,150 C 214,195 186,215 128,215 C 70,215 42,195 42,150 Z";
    shadowRx = 80;
    shadowRy = 14;
  } else if (isHungry) {
    // Deflated, stretched thin, malnourished layout
    bodyPath = "M 66,145 C 66,98 90,72 128,72 C 166,72 190,98 190,145 C 190,188 165,206 128,206 C 91,206 66,188 66,145 Z";
    shadowRx = 48;
    shadowRy = 9;
  } else {
    // Perfect normal teardrop layout
    bodyPath = "M 50,148 C 50,96 78,68 128,68 C 178,68 206,96 206,148 C 206,192 180,211 128,211 C 76,211 50,192 50,148 Z";
    shadowRx = 65;
    shadowRy = 12;
  }

  // Accessories markup depending on element
  let wingsMarkup = "";
  let hornMarkup = "";
  let emblemMarkup = "";

  // Draw customized horns, wings, and emblems based on evolution size/level ranges
  // 3 levels of evolution: Stage 1 (Lvl 4-7), Stage 2 (Lvl 8-15), Stage 3 (Lvl 16+)
  if (level >= 8) {
    const scale = level >= 16 ? 1.3 : 1.0;
    if (element === "magic") {
      // Demonic bat wings
      wingsMarkup = `
        <g class="${wingClass}" fill="#4A1D95" stroke="${outlineColor}" stroke-width="4">
          <!-- Left Wing -->
          <path d="M 54,142 C 10,130 -10,160 14,180 C 18,170 30,165 52,158 Z" transform="scale(${scale}) translate(${(1-scale)*128}, ${(1-scale)*150})"/>
          <!-- Right Wing -->
          <path d="M 202,142 C 246,130 266,160 242,180 C 238,170 226,165 204,158 Z" transform="scale(${scale}) translate(${(1-scale)*128}, ${(1-scale)*150})"/>
        </g>
      `;

      // Demonic red horns
      hornMarkup = `
        <g fill="#EF4444" stroke="${outlineColor}" stroke-width="4">
          <!-- Left Horn -->
          <path d="M 86,85 Q 60,60 55,80 Q 75,90 92,94 Z"/>
          <!-- Right Horn -->
          <path d="M 170,85 Q 196,60 201,80 Q 181,90 164,94 Z"/>
        </g>
      `;

      // Demonic heart forehead sigil
      emblemMarkup = `
        <path d="M 128,172 L 121,165 C 114,158 111,154 111,148 C 111,141 116,136 123,136 C 126,136 127,138 128,140 C 129,138 130,136 133,136 C 140,136 145,141 145,148 C 145,154 142,158 135,165 Z" 
              fill="#D8B4FE" stroke="${outlineColor}" stroke-width="3" style="transform: translate(0, 10px);"/>
      `;
    } else if (element === "crystal") {
      // Ice crystal wing blades
      wingsMarkup = `
        <g class="${wingClass}" fill="#06B6D4" stroke="${outlineColor}" stroke-width="4">
          <!-- Left Wing -->
          <path d="M 52,136 L 5,120 L 25,150 L 10,170 L 52,154 Z" transform="scale(${scale}) translate(${(1-scale)*128}, ${(1-scale)*150})"/>
          <!-- Right Wing -->
          <path d="M 204,136 L 251,120 L 231,150 L 246,170 L 204,154 Z" transform="scale(${scale}) translate(${(1-scale)*128}, ${(1-scale)*150})"/>
        </g>
      `;

      // Ice crown headcrest spikes
      hornMarkup = `
        <g fill="#A5F3FC" stroke="${outlineColor}" stroke-width="4">
          <path d="M 128,42 L 118,72 L 138,72 Z"/>
          <path d="M 108,52 L 104,78 L 120,78 Z"/>
          <path d="M 148,52 L 152,78 L 136,78 Z"/>
        </g>
      `;

      // Snowflake chest gem
      emblemMarkup = `
        <polygon points="128,142 133,152 143,152 135,158 138,168 128,161 118,168 121,158 113,152 123,152" 
                 fill="#E0F2FE" stroke="${outlineColor}" stroke-width="3" style="transform: translate(0, 5px);"/>
      `;
    } else if (element === "forest") {
      // Foliage back leaves
      wingsMarkup = `
        <g class="${wingClass}" fill="#047857" stroke="${outlineColor}" stroke-width="4">
          <!-- Left Green Leaf -->
          <path d="M 56,150 C 20,130 10,180 40,200 C 50,190 54,175 58,160 Z" transform="scale(${scale}) translate(${(1-scale)*128}, ${(1-scale)*150})"/>
          <!-- Right Green Leaf -->
          <path d="M 200,150 C 236,130 246,180 216,200 C 206,190 202,175 198,160 Z" transform="scale(${scale}) translate(${(1-scale)*128}, ${(1-scale)*150})"/>
        </g>
      `;

      // Forest flower head wreath / antler sprouts
      hornMarkup = `
        <g fill="#34D399" stroke="${outlineColor}" stroke-width="4">
          <!-- Left Branch -->
          <path d="M 92,80 Q 75,50 82,45 Q 90,52 96,72 Z"/>
          <!-- Right Branch -->
          <path d="M 164,80 Q 183,50 176,45 Q 168,52 162,72 Z"/>
          <!-- Yellow center rose blossom -->
          <circle cx="128" cy="74" r="10" fill="#F43F5E"/>
          <circle cx="128" cy="74" r="5" fill="#FBBF24"/>
        </g>
      `;

      // Leaf chest charm
      emblemMarkup = `
        <path d="M 128,145 C 118,145 118,165 128,165 C 138,165 138,145 128,145 Z" 
              fill="#A7F3D0" stroke="${outlineColor}" stroke-width="3" style="transform: translate(0, 10px);"/>
      `;
    } else if (element === "star") {
      // Elegant feathery golden angel wings
      wingsMarkup = `
        <g class="${wingClass}" fill="#F59E0B" stroke="${outlineColor}" stroke-width="4">
          <path d="M 50,140 C 0,110 -15,165 25,190 C 35,175 42,165 52,155 Z" transform="scale(${scale}) translate(${(1-scale)*128}, ${(1-scale)*150})"/>
          <path d="M 206,140 C 256,110 271,165 231,190 C 221,175 214,165 204,155 Z" transform="scale(${scale}) translate(${(1-scale)*128}, ${(1-scale)*150})"/>
        </g>
      `;

      // Radiant paladin star horn spikes
      hornMarkup = `
        <g fill="#FBBF24" stroke="${outlineColor}" stroke-width="4">
          <polygon points="128,32 133,52 153,52 137,62 142,82 128,70 114,82 119,62 103,52 123,52"/>
        </g>
      `;

      // Shining center star crest
      emblemMarkup = `
        <polygon points="128,140 131,150 141,150 133,155 136,165 128,158 120,165 123,155 115,150 125,150" 
                 fill="#FEF08A" stroke="${outlineColor}" stroke-width="3" style="transform: translate(0, 8px);"/>
      `;
    } else if (element === "candy") {
      // Long bunny ears as wings/acc flanking
      wingsMarkup = `
        <g class="${wingClass}" fill="#F472B6" stroke="${outlineColor}" stroke-width="4">
          <!-- Tall Bunny ears -->
          <path d="M 76,82 C 55,30 35,50 66,95 Z"/>
          <path d="M 180,82 C 201,30 221,50 190,95 Z"/>
          <!-- Inner soft pink velvet paths -->
          <path d="M 71,76 C 58,40 48,52 66,85 Z" fill="#FBCFE8" stroke="none"/>
          <path d="M 185,76 C 198,40 208,52 190,85 Z" fill="#FBCFE8" stroke="none"/>
        </g>
      `;

      // Candy Lollipop headpiece
      hornMarkup = `
        <g fill="#EC4899" stroke="${outlineColor}" stroke-width="4">
          <circle cx="128" cy="65" r="14"/>
          <!-- Swirl design -->
          <path d="M 128,51 A 14,14 0 0,1 142,65 A 14,14 0 0,1 128,79" fill="none" stroke="#FFFFFF" stroke-width="3"/>
          <rect x="125" y="79" width="6" height="15" fill="#F3F4F6" stroke="${outlineColor}" stroke-width="3"/>
        </g>
      `;

      // Cute blossom ribbon bow tie
      emblemMarkup = `
        <g stroke="${outlineColor}" stroke-width="3" style="transform: translate(128px, 160px) scale(0.95);">
          <path d="M -15,-6 Q -5,0 -15,6 Z M 15,-6 Q 5,0 15,6 Z" fill="#F43F5E"/>
          <circle cx="0" cy="0" r="5" fill="#FEF08A"/>
        </g>
      `;
    }
  }

  // Floating crown or halos for level >= 16 (Majestic Peak)
  let peakMarkup = "";
  if (level >= 16) {
    peakMarkup = `
      <g class="${floatClass}" style="transform-origin: center 50px;">
        <!-- Glowing Halo -->
        <ellipse cx="128" cy="38" rx="42" ry="9" fill="none" stroke="#FEF08A" stroke-width="5" stroke-dasharray="8 4" opacity="0.9"/>
        <!-- Golden Tiara Jewels -->
        <polygon points="128,34 135,46 142,40 149,52 107,52 114,40 121,46" fill="#FBBF24" stroke="${outlineColor}" stroke-width="3"/>
        <circle cx="128" cy="30" r="3" fill="#D946EF" stroke="${outlineColor}" stroke-width="2"/>
      </g>
    `;
  }

  // -------------------------------------------------------------
  // EMOTIONAL FACIAL RENDERERS (EYES & MOUTH + SPECIAL FLOATING METAPHOR SYMBOLS)
  // -------------------------------------------------------------
  let eyesAndMouthSvg = "";
  let specialEmotionOverlay = "";

  // Dynamic positioning offsets based on slime satiety states
  const faceOffsetY = isPlump ? 6 : (isHungry ? -4 : 0);
  const faceY = 143 + faceOffsetY;
  const eyeLeftX = 96;
  const eyeRightX = 160;
  const mouthX = 128;

  switch (expr) {
    case "happy":
      // Smiling closed eyes ^ ^, rosy blushes, laughing open mouth
      eyesAndMouthSvg = `
        <!-- Left Happy Eye -->
        <path d="M ${eyeLeftX-10},${faceY+2} Q ${eyeLeftX},${faceY-10} ${eyeLeftX+10},${faceY+2}" fill="none" stroke="${outlineColor}" stroke-width="6" stroke-linecap="round"/>
        <!-- Right Happy Eye -->
        <path d="M ${eyeRightX-10},${faceY+2} Q ${eyeRightX},${faceY-10} ${eyeRightX+10},${faceY+2}" fill="none" stroke="${outlineColor}" stroke-width="6" stroke-linecap="round"/>
        <!-- Warm blushes -->
        <ellipse cx="${eyeLeftX-8}" cy="${faceY+10}" rx="12" ry="6" fill="#F43F5E" opacity="0.4"/>
        <ellipse cx="${eyeRightX+8}" cy="${faceY+10}" rx="12" ry="6" fill="#F43F5E" opacity="0.4"/>
        <!-- Cute laughing smile -->
        <path d="M ${mouthX-10},${faceY+4} Q ${mouthX},${faceY+14} ${mouthX+10},${faceY+4}" fill="none" stroke="${outlineColor}" stroke-width="5" stroke-linecap="round"/>
      `;
      break;

    case "very_happy":
      // Shimmering full curved blinking happy eyes, huge wide-open joyful mouth showing pink tongue!
      eyesAndMouthSvg = `
        <!-- Curved Blinking eyes -->
        <path d="M ${eyeLeftX-12},${faceY} Q ${eyeLeftX},${faceY-12} ${eyeLeftX+12},${faceY}" fill="none" stroke="${outlineColor}" stroke-width="7" stroke-linecap="round"/>
        <path d="M ${eyeRightX-12},${faceY} Q ${eyeRightX},${faceY-12} ${eyeRightX+12},${faceY}" fill="none" stroke="${outlineColor}" stroke-width="7" stroke-linecap="round"/>
        <!-- Big cheering mouth -->
        <path d="M ${mouthX-16},${faceY+3} C ${mouthX-16},${faceY+25} ${mouthX+16},${faceY+25} ${mouthX+16},${faceY+3} Z" fill="#991B1B" stroke="${outlineColor}" stroke-width="4"/>
        <!-- Tongue -->
        <path d="M ${mouthX-11},${faceY+15} Q ${mouthX},${faceY+8} ${mouthX+11},${faceY+15} Q ${mouthX},${faceY+24} ${mouthX-11},${faceY+15}" fill="#FB7185"/>
        <!-- Soft golden blushes -->
        <ellipse cx="${eyeLeftX-10}" cy="${faceY+12}" rx="14" ry="7" fill="#F59E0B" opacity="0.3"/>
        <ellipse cx="${eyeRightX+10}" cy="${faceY+12}" rx="14" ry="7" fill="#F59E0B" opacity="0.3"/>
      `;
      break;

    case "sad":
      // Teary downward eyes, crying teardrop streaks, small down-turned frown
      eyesAndMouthSvg = `
        <!-- Sad droopy eyes -->
        <path d="M ${eyeLeftX-12},${faceY-6} C ${eyeLeftX-12},${faceY+6} ${eyeLeftX+2},${faceY+6} ${eyeLeftX+2},${faceY-6} Z" fill="${outlineColor}"/>
        <path d="M ${eyeRightX-2},${faceY-6} C ${eyeRightX-2},${faceY+6} ${eyeRightX+12},${faceY+6} ${eyeRightX+12},${faceY-6} Z" fill="${outlineColor}"/>
        <circle cx="${eyeLeftX-4}" cy="${faceY-1}" r="3" fill="#FFFFFF"/>
        <circle cx="${eyeRightX+4}" cy="${faceY-1}" r="3" fill="#FFFFFF"/>
        <!-- Downward frown mouth -->
        <path d="M ${mouthX-10},${faceY+15} Q ${mouthX},${faceY+5} ${mouthX+10},${faceY+15}" fill="none" stroke="${outlineColor}" stroke-width="5" stroke-linecap="round"/>
      `;
      // Translucent giant crying teardrops sliding down the cheeks
      specialEmotionOverlay = `
        <g class="pulse-anim" style="transform-origin: 128px 140px;">
          <!-- Left teardrop -->
          <path d="M ${eyeLeftX-4},${faceY+6} C ${eyeLeftX-12},${faceY+28} ${eyeLeftX+4},${faceY+28} ${eyeLeftX-4},${faceY+6} Z" fill="#60A5FA" opacity="0.85" stroke="#2563EB" stroke-width="2"/>
          <!-- Right teardrop -->
          <path d="M ${eyeRightX+4},${faceY+6} C ${eyeRightX-4},${faceY+28} ${eyeRightX+12},${faceY+28} ${eyeRightX+4},${faceY+6} Z" fill="#60A5FA" opacity="0.85" stroke="#2563EB" stroke-width="2"/>
        </g>
      `;
      break;

    case "hungry":
      // Hollow exhausted vertical-line eyes, trembling wave mouth, blue sweat droplets on head
      eyesAndMouthSvg = `
        <!-- Exhausted vertical hollow slits -->
        <rect x="${eyeLeftX-5}" y="${faceY-10}" width="8" height="18" rx="4" fill="${outlineColor}" opacity="0.9"/>
        <rect x="${eyeRightX-3}" y="${faceY-10}" width="8" height="18" rx="4" fill="${outlineColor}" opacity="0.9"/>
        <!-- Shaky stomach-rumbling squiggly wave mouth -->
        <path d="M ${mouthX-14},${faceY+8} Q ${mouthX-7},${faceY+3} ${mouthX},${faceY+8} T ${mouthX+14},${faceY+8}" fill="none" stroke="${outlineColor}" stroke-width="4.5" stroke-linecap="round"/>
      `;
      // Shaky cold sweat drops on the forehead/temple
      specialEmotionOverlay = `
        <g class="pulse-anim">
          <!-- Cold sweatdrop left -->
          <path d="M 72,118 C 66,118 62,126 72,132 C 78,126 78,118 72,118" fill="#38BDF8" opacity="0.85" stroke="#0284C7" stroke-width="2"/>
          <!-- Cold sweatdrop right -->
          <path d="M 184,118 C 178,118 174,126 184,132 C 190,126 190,118 184,118" fill="#38BDF8" opacity="0.85" stroke="#0284C7" stroke-width="2"/>
        </g>
      `;
      break;

    case "tired":
      // Semi-closed sleepy lids, small circular yawning mouth, drifting cozy Sleeping "Zzz..." alphabet particles
      eyesAndMouthSvg = `
        <!-- Sleeping lids -->
        <line x1="${eyeLeftX-12}" y1="${faceY}" x2="${eyeLeftX+12}" y2="${faceY}" stroke="${outlineColor}" stroke-width="6.5" stroke-linecap="round"/>
        <line x1="${eyeRightX-12}" y1="${faceY}" x2="${eyeRightX+12}" y2="${faceY}" stroke="${outlineColor}" stroke-width="6.5" stroke-linecap="round"/>
        <!-- Circular yawning mouth -->
        <circle cx="${mouthX}" cy="${faceY+10}" r="8" fill="#500724" stroke="${outlineColor}" stroke-width="4"/>
      `;
      // Drifting sleepy Z's floating upwards
      specialEmotionOverlay = `
        <g class="float-item-anim" style="animation-duration: 4s;">
          <!-- Zzz letters -->
          <text x="${eyeRightX+18}" y="${faceY-32}" font-family="monospace" font-size="16" font-weight="900" fill="#60A5FA" opacity="0.9">Z</text>
          <text x="${eyeRightX+30}" y="${faceY-48}" font-family="monospace" font-size="22" font-weight="900" fill="#93C5FD" opacity="0.75">z</text>
          <text x="${eyeRightX+42}" y="${faceY-64}" font-family="monospace" font-size="28" font-weight="900" fill="#DBEAFE" opacity="0.6">z</text>
        </g>
      `;
      break;

    case "angry":
      // Fierce inward slanted eyebrows, red warning veins pulsing, grim flat mouth
      eyesAndMouthSvg = `
        <!-- Slanted eyebrows -->
        <path d="M ${eyeLeftX-12},${faceY-10} L ${eyeLeftX+10},${faceY-2}" fill="none" stroke="${outlineColor}" stroke-width="6.5" stroke-linecap="round"/>
        <path d="M ${eyeRightX+12},${faceY-10} L ${eyeRightX-10},${faceY-2}" fill="none" stroke="${outlineColor}" stroke-width="6.5" stroke-linecap="round"/>
        <!-- Determined angry eyes -->
        <circle cx="${eyeLeftX}" cy="${faceY+2}" r="8" fill="${outlineColor}"/>
        <circle cx="${eyeLeftX-3}" cy="${faceY}" r="2.5" fill="#FFFFFF"/>
        <circle cx="${eyeRightX}" cy="${faceY+2}" r="8" fill="${outlineColor}"/>
        <circle cx="${eyeRightX+3}" cy="${faceY}" r="2.5" fill="#FFFFFF"/>
        <!-- Grim flat mouth -->
        <line x1="${mouthX-12}" y1="${faceY+12}" x2="${mouthX+12}" y2="${faceY+12}" stroke="${outlineColor}" stroke-width="5.5" stroke-linecap="round"/>
      `;
      // Pulsing red comic-style angry vein marks (💢)
      specialEmotionOverlay = `
        <g class="pulse-anim" fill="none" stroke="#EF4444" stroke-width="4.5" stroke-linecap="round">
          <!-- Left-Side anger mark -->
          <path d="M 62,94 L 74,94 M 68,88 L 68,100 M 58,84 Q 78,84 78,104"/>
          <!-- Right-Side anger mark -->
          <path d="M 182,94 L 194,94 M 188,88 L 188,100 M 178,84 Q 198,84 198,104" stroke="#EF4444"/>
        </g>
      `;
      break;

    case "excited":
      // Magnificent yellow star-pattern eyes, giant laughing open cheeks, sparkling particles flanking
      eyesAndMouthSvg = `
        <!-- Golden Star Left Eye -->
        <polygon points="${eyeLeftX},${faceY-12} ${eyeLeftX+3},${faceY-4} ${eyeLeftX+11},${faceY-4} ${eyeLeftX+5},${faceY+2} ${eyeLeftX+7},${faceY+10} ${eyeLeftX},${faceY+5} ${eyeLeftX-7},${faceY+10} ${eyeLeftX-5},${faceY+2} ${eyeLeftX-11},${faceY-4} ${eyeLeftX-3},${faceY-4}" fill="#FBBF24" stroke="${outlineColor}" stroke-width="3"/>
        <!-- Golden Star Right Eye -->
        <polygon points="${eyeRightX},${faceY-12} ${eyeRightX+3},${faceY-4} ${eyeRightX+11},${faceY-4} ${eyeRightX+5},${faceY+2} ${eyeRightX+7},${faceY+10} ${eyeRightX},${faceY+5} ${eyeRightX-7},${faceY+10} ${eyeRightX-5},${faceY+2} ${eyeRightX-11},${faceY-4} ${eyeRightX-3},${faceY-4}" fill="#FBBF24" stroke="${outlineColor}" stroke-width="3"/>
        <!-- High screaming open smile -->
        <path d="M ${mouthX-14},${faceY+4} C ${mouthX-14},${faceY+24} ${mouthX+14},${faceY+24} ${mouthX+14},${faceY+4} Z" fill="#DC2626" stroke="${outlineColor}" stroke-width="4"/>
        <path d="M ${mouthX-10},${faceY+14} Q ${mouthX},${faceY+8} ${mouthX+10},${faceY+14}" fill="none" stroke="#FCA5A5" stroke-width="4"/>
      `;
      // Sparkling stars flying around
      specialEmotionOverlay = `
        <g class="float-item-anim" fill="#FDE047" opacity="0.9">
          <polygon points="60,80 63,85 68,85 64,88 66,93 60,90 54,93 56,88 52,85 57,85"/>
          <polygon points="196,80 199,85 204,85 200,88 202,93 196,90 190,93 192,88 188,85 193,85"/>
        </g>
      `;
      break;

    case "love":
      // Glistening heart-shaped eyes, pulsing, hot pink blush and a sweet whistling kiss mouth
      eyesAndMouthSvg = `
        <!-- Heart Left Eye -->
        <path d="M ${eyeLeftX},${faceY-4} C ${eyeLeftX-8},${faceY-14} ${eyeLeftX-16},${faceY-4} ${eyeLeftX},${faceY+8} C ${eyeLeftX+16},${faceY-4} ${eyeLeftX+8},${faceY-14} ${eyeLeftX},${faceY-4} Z" fill="#EC4899" stroke="${outlineColor}" stroke-width="3"/>
        <!-- Heart Right Eye -->
        <path d="M ${eyeRightX},${faceY-4} C ${eyeRightX-8},${faceY-14} ${eyeRightX-16},${faceY-4} ${eyeRightX},${faceY+8} C ${eyeRightX+16},${faceY-4} ${eyeRightX+8},${faceY-14} ${eyeRightX},${faceY-4} Z" fill="#EC4899" stroke="${outlineColor}" stroke-width="3"/>
        <!-- Whistling kiss mouth -->
        <circle cx="${mouthX}" cy="${faceY+8}" r="5" fill="#EF4444" stroke="${outlineColor}" stroke-width="3.5"/>
        <!-- Soft blush -->
        <ellipse cx="${eyeLeftX-6}" cy="${faceY+12}" rx="10" ry="5" fill="#F43F5E" opacity="0.35"/>
        <ellipse cx="${eyeRightX+6}" cy="${faceY+12}" rx="10" ry="5" fill="#F43F5E" opacity="0.35"/>
      `;
      // Spark-hearts rising up
      specialEmotionOverlay = `
        <g class="float-item-anim" fill="#FB7185">
          <path d="M 64,100 C 60,94 56,94 56,100 C 56,106 64,112 64,112 C 64,112 72,106 72,100 C 72,94 68,94 64,100 Z" opacity="0.9"/>
          <path d="M 192,100 C 188,94 184,94 184,100 C 184,106 192,112 192,112 C 192,112 200,106 200,100 C 200,94 196,94 192,100 Z" opacity="0.9"/>
        </g>
      `;
      break;

    case "proud":
      // Cool dark designer sunglasses spanning across both eyes, cocky side-skewed grin smirk
      eyesAndMouthSvg = `
        <!-- Sunglasses frame -->
        <path d="M 72,${faceY-5} L 184,${faceY-5} L 176,${faceY+9} C 160,${faceY+10} 144,${faceY+3} 128,${faceY+3} C 112,${faceY+3} 96,${faceY+10} 80,${faceY+9} Z" fill="#1E293B" stroke="${outlineColor}" stroke-width="4.5"/>
        <!-- Sunglass lenses sparkles reflection -->
        <polygon points="84,${faceY-2} 98,${faceY-2} 92,${faceY+6}" fill="#FFFFFF" opacity="0.7"/>
        <polygon points="144,${faceY-2} 158,${faceY-2} 152,${faceY+6}" fill="#FFFFFF" opacity="0.7"/>
        <!-- Cocky smirk -->
        <path d="M ${mouthX-5},${faceY+14} Q ${mouthX+12},${faceY+14} ${mouthX+14},${faceY+6}" fill="none" stroke="${outlineColor}" stroke-width="5.5" stroke-linecap="round"/>
      `;
      break;

    default:
      // Classic default normal face: friendly round shiny eyes, warm blush, and a smiling mouth
      eyesAndMouthSvg = `
        <!-- Left eye -->
        <circle cx="${eyeLeftX}" cy="${faceY}" r="9" fill="${outlineColor}"/>
        <circle cx="${eyeLeftX-3}" cy="${faceY-3}" r="3.5" fill="#FFFFFF"/>
        <circle cx="${eyeLeftX+2}" cy="${faceY+2}" r="1.5" fill="#FFFFFF"/>
        <!-- Right eye -->
        <circle cx="${eyeRightX}" cy="${faceY}" r="9" fill="${outlineColor}"/>
        <circle cx="${eyeRightX-3}" cy="${faceY-3}" r="3.5" fill="#FFFFFF"/>
        <circle cx="${eyeRightX+2}" cy="${faceY+2}" r="1.5" fill="#FFFFFF"/>
        <!-- Rosy cheeks blush -->
        <ellipse cx="${eyeLeftX-6}" cy="${faceY+9}" rx="12" ry="5.5" fill="#FF85A5" opacity="0.45"/>
        <ellipse cx="${eyeRightX+6}" cy="${faceY+9}" rx="12" ry="5.5" fill="#FF85A5" opacity="0.45"/>
        <!-- Gentle sweet smile -->
        <path d="M ${mouthX-8},${faceY+6} Q ${mouthX},${faceY+13} ${mouthX+8},${faceY+6}" fill="none" stroke="${outlineColor}" stroke-width="5" stroke-linecap="round"/>
      `;
      break;
  }

  // Floating ambient energy circles / particles around the peak stage (level >= 8)
  let particlesMarkup = "";
  if (level >= 8) {
    particlesMarkup = `
      <g class="${floatClass}">
        <circle cx="50" cy="95" r="4" fill="${particleColor}" opacity="0.6"/>
        <circle cx="206" cy="115" r="3.5" fill="${particleColor}" opacity="0.6"/>
        <circle cx="65" cy="180" r="5" fill="${particleColor}" opacity="0.4"/>
        <circle cx="191" cy="180" r="4.5" fill="${particleColor}" opacity="0.4"/>
      </g>
    `;
  }

  // -------------------------------------------------------------
  // ASSEMBLE GLORIOUS DIGITAL ADULT SLIME SPRITE Output
  // -------------------------------------------------------------
  return `
    <svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%;">
      <style>${svgCSS}</style>
      <defs>
        <!-- Dynamic Gradient definition -->
        <radialGradient id="bodyGradient" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stop-color="${gradStart}"/>
          <stop offset="72%" stop-color="${gradEnd}"/>
          <stop offset="100%" stop-color="${outlineColor}"/>
        </radialGradient>
      </defs>

      <!-- 1. Background Layers (Wings, Floating peak details) -->
      ${wingsMarkup}
      ${peakMarkup}

      <!-- 2. Ambient Particles -->
      ${particlesMarkup}

      <!-- 3. Slime Base Group (Grounded shadow, Soft Bounce animation) -->
      <g class="shadow-scale-anim" style="transform-origin: 128px 216px;">
        <ellipse cx="128" cy="216" rx="${shadowRx}" ry="${shadowRy}" fill="rgba(0,0,0,0.18)"/>
      </g>

      <g class="${animationClass}">
        <!-- Main Slimes Solid Body Path -->
        <path d="${bodyPath}" fill="url(#bodyGradient)" stroke="${outlineColor}" stroke-width="6.5" stroke-linejoin="round"/>

        <!-- High-Contrast Glass Volumetric Highlight spot -->
        <ellipse cx="${isPlump ? 90 : (isHungry ? 104 : 96)}" cy="100" rx="14" ry="7" fill="#FFFFFF" opacity="0.25" transform="rotate(-15 ${isPlump ? 90 : (isHungry ? 104 : 96)} 100)"/>

        <!-- 4. Element Horn / Crest (Renders on the head) -->
        ${hornMarkup}

        <!-- 5. Eyes & Mouth Face layout -->
        ${eyesAndMouthSvg}

        <!-- 6. Foreground Element Emblems / Accessories on Chest -->
        ${emblemMarkup}
      </g>

      <!-- 7. Special Emotional Floating Symbols overlaying on top -->
      ${specialEmotionOverlay}
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



