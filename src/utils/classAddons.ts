/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Class Construction, Class Events, and Class Collection Book Systems.
 * Written in a modular manner to ensure 100% preservation of all existing code.
 */

export interface ClassConstructionBuilding {
  id: string;
  name: string;
  icon: string;
  level: number;
  currentExp: number;
  targetExp: number;
}

export interface ClassConstructionData {
  enabled: boolean;
  classContribution: number;
  buildings: ClassConstructionBuilding[];
}

export interface ClassEvent {
  id: string;
  name: string;
  icon: string;
  description: string;
  effectType: "gacha" | "background" | "buff" | "timed_task" | "collection";
  startedAt: number | null; // timestamp millisecond
  durationMinutes: number;
  merchantProducts?: any[];
}

export interface ClassEventData {
  enabled: boolean;
  activeEvent: ClassEvent | null;
  randomEventsHistory: string[];
}

export interface ClassCollectionData {
  unlockedBuildings: string[]; // "buildingId_level"
  unlockedEvents: string[];    // "eventId"
  unlockedSlimes: string[];    // "slimeId"
  unlockedTitles: string[];    // "titleId"
  unlockedItems: string[];     // "itemId"
}

// Initial/default configurations
export const INITIAL_BUILDINGS: ClassConstructionBuilding[] = [
  { id: "building_library", name: "圖書館", icon: "📚", level: 1, currentExp: 0, targetExp: 100 },
  { id: "building_academy", name: "魔法學院", icon: "🏫", level: 1, currentExp: 0, targetExp: 120 },
  { id: "building_tree", name: "世界樹", icon: "🌳", level: 1, currentExp: 0, targetExp: 150 },
  { id: "building_guild", name: "冒險公會", icon: "⚔️", level: 1, currentExp: 0, targetExp: 100 },
  { id: "building_ranch", name: "幻獸牧場", icon: "🦄", level: 1, currentExp: 0, targetExp: 120 },
  { id: "building_temple", name: "天空神殿", icon: "☁️", level: 1, currentExp: 0, targetExp: 180 },
];

export const ALL_EVENTS_TEMPLATES: ClassEvent[] = [
  {
    id: "event_meteor",
    name: "流星雨",
    icon: "🌠",
    description: "天空中降下璀璨流星雨！全班魔力激盪，此時進行扭蛋 (背景/裝飾)，獲得傳說與超稀有物品的機率雙倍提升！",
    effectType: "gacha",
    startedAt: null,
    durationMinutes: 30,
  },
  {
    id: "event_merchant",
    name: "神秘商人",
    icon: "🛒",
    description: "行蹤飄忽的霍華德商人帶著奇珍異寶出現在班級！暫時解鎖限時神秘背景「天空之城」，每人可以享有點數優惠購買！",
    effectType: "background",
    startedAt: null,
    durationMinutes: 45,
  },
  {
    id: "event_king",
    name: "史萊姆國王來訪",
    icon: "👑",
    description: "史萊姆國王親臨教室！降下聖潔祝福，所有學生的史萊姆寵物心情值(Happy)、親密度(Affinity)與體力(Stamina)全數瞬間完全回滿！",
    effectType: "buff",
    startedAt: null,
    durationMinutes: 20,
  },
  {
    id: "event_ruins",
    name: "遠古遺跡",
    icon: "🐉",
    description: "班級領地深處發現了古老的巨龍遺跡！開啟了全員限時挑戰。全班需在時間內完成一件「遺跡探秘」任務，解鎖古老秘密！",
    effectType: "timed_task",
    startedAt: null,
    durationMinutes: 60,
  },
  {
    id: "event_beast",
    name: "幻獸降臨",
    icon: "🦄",
    description: "伴隨著純淨之光，神聖幻獸獨角獸在幻獸牧場降世！解鎖了天空神殿的秘境探險圖鑑，全班獲得稀有收藏品「幻獸眼淚結晶」！",
    effectType: "collection",
    startedAt: null,
    durationMinutes: 15,
  },
];

// static collection configuration lists
export interface BookItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  requirement?: string;
}

export const BOOK_BUILDINGS: BookItem[] = [
  { id: "building_library_1", name: "圖書館 (LV1)", icon: "📚", description: "建立簡陋的木造圖書角，藏書主要是童話與基礎魔法書。" },
  { id: "building_library_2", name: "圖書館 (LV2)", icon: "📚", description: "擴建石造閱讀區，新增了魔法史和世界地圖等高階書籍。" },
  { id: "building_library_3", name: "圖書館 (LV3)", icon: "📚", description: "建立穹頂玻璃採光閣樓，藏書突破千冊，開始有賢者手稿。" },
  { id: "building_library_4", name: "圖書館 (LV4)", icon: "📚", description: "附設真理研究室，四周流轉著古老的魔力文字，具有靜心效果。" },
  { id: "building_library_5", name: "圖書館 (LV5)", icon: "🏛️", description: "大圖書館究極形態！收藏有禁忌黑魔法與時空轉移的終極奧秘卷軸。" },

  { id: "building_academy_1", name: "魔法學院 (LV1)", icon: "🏫", description: "一間附有黑板的初級教室，學生們在此練習漂浮咒。" },
  { id: "building_academy_2", name: "魔法學院 (LV2)", icon: "🏫", description: "落成藥草培植溫室與專用大釜，學生們可以動手調配力量藥水。" },
  { id: "building_academy_3", name: "魔法學院 (LV3)", icon: "🏫", description: "建造了星空觀星塔，能夠精準預測氣象與魔力潮汐汐波動。" },
  { id: "building_academy_4", name: "魔法學院 (LV4)", icon: "🏫", description: "開設進階元素法術演練場，裝設防爆魔力防禦障壁保護學員。" },
  { id: "building_academy_5", name: "魔法學院 (LV5)", icon: "🏰", description: "真理之塔！魔法學術聖殿，全班智慧與學習力的核心堡壘。" },

  { id: "building_tree_1", name: "世界樹 (LV1)", icon: "🌱", description: "一株發出淡淡微光的小樹苗，需要細心照料方能茁壯。" },
  { id: "building_tree_2", name: "世界樹 (LV2)", icon: "🌿", description: "樹苗成長為茂密大樹，方圓百米內空氣變得異常清新，魔力濃度提升。" },
  { id: "building_tree_3", name: "世界樹 (LV3)", icon: "🌳", description: "樹冠延伸遮天，夜間散發溫暖極光，成為大家最喜愛的避暑聖地。" },
  { id: "building_tree_4", name: "世界樹 (LV4)", icon: "🌳", description: "精靈之翼羽化。世界樹開始結出蘊含大量生命精華的金色生命果實。" },
  { id: "building_tree_5", name: "世界樹 (LV5)", icon: "🌲", description: "撐起魔法天幕的永恆世界樹！班級生命的起源，與大自然意志共鳴。" },

  { id: "building_guild_1", name: "冒險公會 (LV1)", icon: "⚔️", description: "簡單的木造告示板，上面貼滿了協助尋找遺失寵物與跑腿的任務。" },
  { id: "building_guild_2", name: "冒險公會 (LV2)", icon: "⚔️", description: "增設了溫馨的冒險者櫃檯，提供免費的草藥涼茶與初級地圖。" },
  { id: "building_guild_3", name: "冒險公會 (LV3)", icon: "⚔️", description: "酒吧與公會合一！提供委託對接和裝備保養，成為班級合作的核心。" },
  { id: "building_guild_4", name: "冒險公會 (LV4)", icon: "⚔️", description: "裝配了冒險傳送陣，可以瞬間派遣精英小組前往邊境森林探險。" },
  { id: "building_guild_5", name: "冒險公會 (LV5)", icon: "🚩", description: "至高傳奇聖殿！無畏挑戰、捍衛夥伴的團隊合作最高榮耀證明。" },

  { id: "building_ranch_1", name: "幻獸牧場 (LV1)", icon: "🦄", description: "一小片木柵欄，偶爾有迷路的小草泥馬進來吃草。" },
  { id: "building_ranch_2", name: "幻獸牧場 (LV2)", icon: "🦄", description: "落成風車穀倉與軟床，幾隻溫馴的棉花羊定居了下來。" },
  { id: "building_ranch_3", name: "幻獸牧場 (LV3)", icon: "🦄", description: "設置了魔水飲泉。能吸引長有羽翼的飛天馬前來棲息與戲水。" },
  { id: "building_ranch_4", name: "幻獸牧場 (LV4)", icon: "🦄", description: "增設了孵化神聖之蛋的聖火溫床，開始培育高級稀有座騎。" },
  { id: "building_ranch_5", name: "幻獸牧場 (LV5)", icon: "🐾", description: "神獸棲息島！星空巨獸與傳神巨龍最喜愛的雲端舒適棲息地。" },

  { id: "building_temple_1", name: "天空神殿 (LV1)", icon: "☁️", description: "飄浮在雲層中的殘破大理石祭壇，訴說著遠古的神聖神話。" },
  { id: "building_temple_2", name: "天空神殿 (LV2)", icon: "☁️", description: "修復了神殿石柱，遠古符文發出溫柔藍光，保護班級避開風暴。" },
  { id: "building_temple_3", name: "天空神殿 (LV3)", icon: "☁️", description: "光芒神像歸位。神殿湧出天空聖水，喝下去能解除史萊姆一切疲勞。" },
  { id: "building_temple_4", name: "天空神殿 (LV4)", icon: "☁️", description: "星光走廊修復。在神殿中可以望見宇宙星軌，賦予學員無限創造力。" },
  { id: "building_temple_5", name: "天空神殿 (LV5)", icon: "🏛️", description: "天空之城黃金神殿！飄浮在萬里晴空的終極避難所與神聖學殿。" },
];

export const BOOK_EVENTS: BookItem[] = [
  { id: "event_meteor", name: "流星雨事件", icon: "🌠", description: "天空中降下璀璨流星雨！轉蛋爆率加倍。" },
  { id: "event_merchant", name: "神秘商人事件", icon: "🛒", description: "霍華德行商出現在教室，帶來獨特之物。" },
  { id: "event_king", name: "史萊姆國王訪問", icon: "👑", description: "巨型國王親自巡禮，賜予全班心情體力完全提振。" },
  { id: "event_ruins", name: "發現龍之遺跡", icon: "🐉", description: "封印解除！隱藏的古代巨龍祭壇浮現。" },
  { id: "event_beast", name: "神聖幻獸降臨", icon: "🦄", description: "獨角仙與天馬振翅，神聖純潔之光臨到班級。" },
];

export const BOOK_SLIMES: BookItem[] = [
  { id: "slime_star", name: "正義小星兔史萊姆", icon: "⭐", description: "蘊含群星之力的正義使者，耳朵能偵測邪惡值。" },
  { id: "slime_forest", name: "森林守護史萊姆", icon: "🌳", description: "與大自然十分親近，走過的地方會開出美麗的四葉草。" },
  { id: "slime_candy", name: "甜點棉花糖史萊姆", icon: "🍬", description: "身上時常散發水果清香，生氣時會吐出草莓糖果。" },
  { id: "slime_magic", name: "傲嬌黑夜魔王史萊姆", icon: "👿", description: "暗黑系史萊姆至尊，雖然看起來兇狠但其實最黏人。" },
  { id: "slime_crystal", name: "神聖水晶獨角獸史萊姆", icon: "💎", description: "頭頂長著斑斕的水晶角，流下的眼淚是魔法藥劑原料。" },
  { id: "slime_king_pet", name: "黃金史萊姆大國王", icon: "👑", description: "寵物界的最高領袖！聽說心情好時能直接吐出純金硬幣。" },
];

export const BOOK_TITLES: BookItem[] = [
  { id: "title_waiting", name: "等待發光中", icon: "🏵️", description: "班級所有初來乍到的新成員持有的萌新稱號。" },
  { id: "title_novice", name: "初學建造者", icon: "🛠️", description: "解鎖時機：班級任一建築升級到 LV2。" },
  { id: "title_expert", name: "高級建設大師", icon: "🏆", description: "解鎖時機：班級任一建築升級到 LV3。" },
  { id: "title_legend", name: "公會傳奇工匠", icon: "👑", description: "解鎖時機：累計班級貢獻值突破 1000 點。" },
  { id: "title_guardian", name: "世界樹守護者", icon: "🌟", description: "解鎖時機：將世界樹建設升級到 LV5！" },
  { id: "title_paladin", name: "天空神殿使徒", icon: "⚔️", description: "解鎖時機：觸發並完成遠古遺跡事件挑戰！" },
];

export const BOOK_ITEMS: BookItem[] = [
  { id: "item_tablet", name: "古代遺跡黃金碑文", icon: "🏺", description: "一塊刻有失落太陽符文的純金板碑，散發溫暖熱度。" },
  { id: "item_crystal", name: "世界樹永恆結晶", icon: "💎", description: "世界樹心孕育萬年才成型的純淨固體，具生命力。" },
  { id: "item_scroll", name: "皇家寵物召喚卷軸", icon: "📜", description: "蓋有王室金印的古老羊皮紙，能召來極稀有的夥伴。" },
  { id: "item_key", name: "天空神殿黃金鑰匙", icon: "🗝️", description: "能開啟雲端隱秘寶庫的鑰匙，上面飾有天使翅膀。" },
  { id: "item_potion", name: "賢者神秘提神秘藥", icon: "🧪", description: "喝一口就能消除靈魂全部倦意，口感據說像香草冰淇淋。" },
  { id: "item_amber", name: "遠古恐龍龍之琥珀", icon: "🦴", description: "澄澈琥珀色寶石中完好封存了一枚史前龍蛋的鱗片。" },
];

// Helper to initialize custom modular data on App state safely
export const getSafeClassAddonsData = (existingSettings: any) => {
  // Safe initializations for Class Construction System
  const construction: ClassConstructionData = existingSettings?.classConstructionData || {
    enabled: false,
    classContribution: 0,
    buildings: INITIAL_BUILDINGS.map(b => ({ ...b })),
  };
  
  // Backwards compatibility check
  if (!Array.isArray(construction.buildings) || construction.buildings.length === 0) {
    construction.buildings = INITIAL_BUILDINGS.map(b => ({ ...b }));
  } else {
    // Fill in any missing buildings
    INITIAL_BUILDINGS.forEach(defB => {
      const exists = construction.buildings.some(b => b.id === defB.id);
      if (!exists) {
        construction.buildings.push({ ...defB });
      }
    });
  }

  // Safe initializations for Class Event System
  const events: ClassEventData = existingSettings?.classEventData || {
    enabled: false,
    activeEvent: null,
    randomEventsHistory: [],
  };

  // Safe initializations for Class Collection Book
  const collections: ClassCollectionData = existingSettings?.classCollectionData || {
    unlockedBuildings: ["building_library_1", "building_academy_1", "building_tree_1", "building_guild_1", "building_ranch_1", "building_temple_1"], // default unlocked building lvl 1s
    unlockedEvents: [],
    unlockedSlimes: ["slime_star", "slime_forest", "slime_candy"], // initial common pets
    unlockedTitles: ["title_waiting"],
    unlockedItems: [],
  };

  return {
    classConstructionData: construction,
    classEventData: events,
    classCollectionData: collections,
  };
};

export interface MerchantProduct {
  id: string;
  name: string;
  icon: string;
  category: "background" | "decoration" | "title" | "item";
  targetId: string;
  rarity: "common" | "rare" | "epic" | "legendary" | string;
  price: number;
}

export const generateMerchantProducts = (appData: any, defaultBackgroundGachaItems: any[] = []): MerchantProduct[] => {
  const products: MerchantProduct[] = [];
  
  const customItemsList = appData?.backgroundGachaItems || defaultBackgroundGachaItems || [];
  const backgrounds = customItemsList.filter((x: any) => x.category === "background" && !x.isDeleted && x.enabled !== false);
  const decorations = customItemsList.filter((x: any) => x.category !== "background" && !x.isDeleted && x.enabled !== false);

  const defaultBgs = [
    { targetId: "bg_desert", name: "神聖沙漠綠洲", icon: "🏜️", rarity: "rare", price: 60, category: "background" },
    { targetId: "bg_sakura", name: "浪漫櫻花庭院", icon: "🌸", rarity: "epic", price: 120, category: "background" },
    { targetId: "bg_cyber", name: "賽博霓虹街區", icon: "🌃", rarity: "legendary", price: 250, category: "background" },
  ];
  
  const defaultDecors = [
    { targetId: "decor_globe", name: "時光浮空儀", icon: "🔮", rarity: "epic", price: 90, category: "decoration" },
    { targetId: "decor_shield", name: "王國守護神聖盾", icon: "🛡️", rarity: "legendary", price: 180, category: "decoration" },
    { targetId: "decor_cactus", name: "發光仙人掌", icon: "🌵", rarity: "common", price: 20, category: "decoration" },
  ];

  const bgPool = backgrounds.length > 0 ? backgrounds.map((b: any) => ({
    targetId: b.id,
    name: b.name,
    icon: b.presetSvgMarkup || "🖼️",
    rarity: b.rarity || "rare",
    price: b.rarity === "legendary" ? 220 : b.rarity === "epic" ? 130 : b.rarity === "rare" ? 70 : 30,
    category: "background" as const
  })) : defaultBgs;

  const decorPool = decorations.length > 0 ? decorations.map((d: any) => ({
    targetId: d.id,
    name: d.name,
    icon: d.presetSvgMarkup || "🎀",
    rarity: d.rarity || "common",
    price: d.rarity === "legendary" ? 180 : d.rarity === "epic" ? 90 : d.rarity === "rare" ? 50 : 20,
    category: "decoration" as const
  })) : defaultDecors;

  const titlePool = [
    { targetId: "全能小達人", name: "全能小達人", icon: "🎖️", rarity: "rare", price: 80, category: "title" as const },
    { targetId: "超級任務王", name: "超級任務王", icon: "👑", rarity: "legendary", price: 280, category: "title" as const },
    { targetId: "班級小英雄", name: "班級小英雄", icon: "🛡️", rarity: "epic", price: 180, category: "title" as const },
    { targetId: "霍華德之友", name: "霍華德之友", icon: "🤝", rarity: "rare", price: 65, category: "title" as const },
    { targetId: "金幣支配者", name: "金幣支配者", icon: "🪙", rarity: "epic", price: 150, category: "title" as const },
    { targetId: "神秘收藏家", name: "神秘收藏家", icon: "📦", rarity: "legendary", price: 260, category: "title" as const },
  ];

  const itemPool = [
    { targetId: "item_tablet", name: "古代遺跡黃金碑文", icon: "🏺", rarity: "epic", price: 130, category: "item" as const },
    { targetId: "item_crystal", name: "世界樹永恆結晶", icon: "💎", rarity: "legendary", price: 260, category: "item" as const },
    { targetId: "item_scroll", name: "皇家寵物召喚卷軸", icon: "📜", rarity: "rare", price: 75, category: "item" as const },
    { targetId: "item_key", name: "天空神殿黃金鑰匙", icon: "🗝️", rarity: "epic", price: 110, category: "item" as const },
    { targetId: "item_potion", name: "賢者神秘提神秘藥", icon: "🧪", rarity: "common", price: 25, category: "item" as const },
    { targetId: "item_amber", name: "遠古恐龍龍之琥珀", icon: "🦴", rarity: "legendary", price: 240, category: "item" as const },
  ];

  const allChoices: any[] = [];
  
  const bgCount = Math.floor(Math.random() * 2) + 1; // 1-2
  const decorCount = Math.floor(Math.random() * 2) + 1; // 1-2
  const titleCount = Math.floor(Math.random() * 2) + 1; // 1-2
  const itemCount = Math.floor(Math.random() * 2) + 1; // 1-2

  const pickRandom = (pool: any[], num: number) => {
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, num);
  };

  allChoices.push(...pickRandom(bgPool, bgCount));
  allChoices.push(...pickRandom(decorPool, decorCount));
  allChoices.push(...pickRandom(titlePool, titleCount));
  allChoices.push(...pickRandom(itemPool, itemCount));

  const finalSize = Math.floor(Math.random() * 6) + 3; // 3 to 8
  const finalShuffled = allChoices.sort(() => 0.5 - Math.random()).slice(0, finalSize);

  return finalShuffled.map((item, idx) => ({
    id: `merch_${item.category}_${item.targetId}_${idx}`,
    name: item.name,
    icon: item.icon,
    category: item.category,
    targetId: item.targetId,
    rarity: item.rarity,
    price: item.price
  }));
};

/**
 * Handle earning Class Contribution values when completing tasks
 */
export const calculateContributionAward = (points: number, type: "individual" | "group" | "timed"): number => {
  // Proportional award logic: Contribution = Points / 10 (minimum 1)
  const base = Math.max(1, Math.floor(points / 10));
  if (type === "group") return base * 2; // Bonus contribution for cooperations
  if (type === "timed") return base * 3; // Even more bonus contribution for intense timed tasks
  return base;
};

/**
 * Handle intercepting changes between previous AppData and new AppData state
 * to automatically add Class Contribution points and trigger unlocks.
 */
export const handleAppDataInterception = (prev: any, next: any): any => {
  if (!next) return next;

  // Initialize addons if not present
  const defaults = getSafeClassAddonsData(next);
  const construction = next.classConstructionData || defaults.classConstructionData;
  const events = next.classEventData || defaults.classEventData;
  const collections = next.classCollectionData || defaults.classCollectionData;

  // Set them onto next so we are ready to modify
  let updatedNext = {
    ...next,
    classConstructionData: { ...construction },
    classEventData: { ...events },
    classCollectionData: { ...collections },
  };

  // Conflict control: Auto-stamp modified student records on local actions
  if (!(window as any).isMergingCloudSnapshot && prev && prev.students && updatedNext.students) {
    updatedNext.students = updatedNext.students.map((ns: any) => {
      const ps = prev.students.find((s: any) => s.id === ns.id);
      if (ps) {
        // Exclude version/updatedAt/onlineStatus for comparison
        const { version: pv, updatedAt: pu, onlineStatus: po, ...contentP } = ps;
        const { version: nv, updatedAt: nu, onlineStatus: no, ...contentN } = ns;
        if (JSON.stringify(contentP) !== JSON.stringify(contentN)) {
          return {
            ...ns,
            version: (ps.version || 0) + 1,
            updatedAt: Date.now()
          };
        }
      } else {
        // New student added locally
        return {
          ...ns,
          version: 1,
          updatedAt: Date.now()
        };
      }
      return ns;
    });
  }

  // Handle student slimes unlocking and completing tasks (even if construction is disabled, collections could be active)
  if (prev && prev.students && updatedNext.students) {
    updatedNext.students.forEach((ns: any) => {
      if (ns.element && !updatedNext.classCollectionData.unlockedSlimes.includes(`slime_${ns.element}`)) {
        updatedNext.classCollectionData.unlockedSlimes = [
          ...updatedNext.classCollectionData.unlockedSlimes,
          `slime_${ns.element}`
        ];
      }
    });
  }

  // Only award contribution if the Class Construction feature is enabled
  if (!updatedNext.classConstructionData.enabled) {
    return updatedNext;
  }

  let extraContribution = 0;

  // 1. Intercept newly completed tasks
  if (prev && prev.students && updatedNext.students) {
    updatedNext.students.forEach((ns: any) => {
      const ps = prev.students.find((s: any) => s.id === ns.id);
      if (ps) {
        // Individual student completed task count increased
        const diffTasks = (ns.completedTaskCount || 0) - (ps.completedTaskCount || 0);
        if (diffTasks > 0) {
          extraContribution += diffTasks * 10; // +10 contribution per task
        }
      }
    });
  }

  // 2. Intercept group timed tasks completions (timed tasks completion list widened)
  if (prev && prev.timedTasks && updatedNext.timedTasks) {
    updatedNext.timedTasks.forEach((nt: any) => {
      const pt = prev.timedTasks.find((t: any) => t.id === nt.id);
      const prevCompletedCount = pt ? pt.completedBy.length : 0;
      const nextCompletedCount = nt.completedBy.length;
      if (nextCompletedCount > prevCompletedCount) {
        const delta = nextCompletedCount - prevCompletedCount;
        extraContribution += delta * 15; // +15 contribution points per timed task completion
      }
    });
  }

  // 3. Apply the new contribution if any
  if (extraContribution > 0) {
    updatedNext.classConstructionData.classContribution += extraContribution;

    // Trigger Title Unlock: Cumulative contribution breaks 1000 -> Unlocks title_legend ("公會傳奇工匠")
    if (updatedNext.classConstructionData.classContribution >= 1000 &&
        !updatedNext.classCollectionData.unlockedTitles.includes("title_legend")) {
      updatedNext.classCollectionData.unlockedTitles = [
        ...updatedNext.classCollectionData.unlockedTitles,
        "title_legend"
      ];
    }
  }

  return updatedNext;
};

/**
 * Handle manual building upgrades (leveling up a building cost Class Contribution)
 */
export const upgradeBuilding = (appData: any, buildingId: string): { success: boolean; data: any; message: string } => {
  if (!appData || !appData.classConstructionData) {
    return { success: false, data: appData, message: "建設系統尚未開啟或尚未初始化" };
  }

  const construction = { ...appData.classConstructionData };
  const buildings = (construction.buildings || []).map((b: any) => ({ ...b }));
  const buildingIndex = buildings.findIndex((b: any) => b.id === buildingId);

  if (buildingIndex === -1) {
    return { success: false, data: appData, message: "找不到該指定建築！" };
  }

  const b = buildings[buildingIndex];
  if (b.level >= 5) {
    return { success: false, data: appData, message: `【${b.name}】已經達到最高等級 LV5 囉！` };
  }

  // Determine upgrade cost
  // Level 1 -> 2: 100
  // Level 2 -> 3: 200
  // Level 3 -> 4: 350
  // Level 4 -> 5: 500
  let cost = 100;
  if (b.level === 2) cost = 200;
  if (b.level === 3) cost = 300;
  if (b.level === 4) cost = 500;

  if (construction.classContribution < cost) {
    return {
      success: false,
      data: appData,
      message: `班級貢獻值不足！升級【${b.name}】至 LV${b.level + 1} 需要累積 ${cost} 點貢獻值（當前僅有 ${construction.classContribution} 點）。`
    };
  }

  // Spend the points!
  construction.classContribution -= cost;
  b.level += 1;
  b.currentExp = 0;
  b.targetExp = b.level * 100; // set target exp
  buildings[buildingIndex] = b;
  construction.buildings = buildings;

  // Clone collection book to unlock entries
  const collection = { ...(appData.classCollectionData || { unlockedBuildings: [], unlockedTitles: [], unlockedItems: [] }) };
  const nBuildings = [...(collection.unlockedBuildings || [])];
  const bKey = `${b.id}_${b.level}`; // e.g. "building_library_2"
  if (!nBuildings.includes(bKey)) {
    nBuildings.push(bKey);
  }

  // Unlock titles based on achievements
  const nTitles = [...(collection.unlockedTitles || [])];
  if (b.level === 2 && !nTitles.includes("title_novice")) {
    nTitles.push("title_novice"); // "初學建造者"
  }
  if (b.level === 3 && !nTitles.includes("title_expert")) {
    nTitles.push("title_expert"); // "高級建設大師"
  }
  if (buildingId === "building_tree" && b.level === 5 && !nTitles.includes("title_guardian")) {
    nTitles.push("title_guardian"); // "世界樹守護者"
  }

  const nextData = {
    ...appData,
    classConstructionData: construction,
    classCollectionData: {
      ...collection,
      unlockedBuildings: nBuildings,
      unlockedTitles: nTitles,
    }
  };

  return {
    success: true,
    data: nextData,
    message: `🎉 恭喜！【${b.name}】成功升級至 LV${b.level}！\n已消耗 ${cost} 點班級貢獻值，並在班級圖鑑中成功解鎖珍貴條目以及新稱號！`
  };
};

