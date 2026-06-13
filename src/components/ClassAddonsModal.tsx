import React, { useState } from "react";
import { AppData } from "../types";
import { 
  ALL_EVENTS_TEMPLATES, 
  BOOK_BUILDINGS, 
  BOOK_EVENTS, 
  BOOK_SLIMES, 
  BOOK_TITLES, 
  BOOK_ITEMS,
  upgradeBuilding,
  getSafeClassAddonsData,
  generateMerchantProducts
} from "../utils/classAddons";

interface ClassAddonsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appData: AppData;
  setAppData: React.Dispatch<React.SetStateAction<AppData>>;
  showSuccess: (event: React.MouseEvent | null, pts: number, saved?: boolean) => void;
  currentStudentId?: string | null;
}

export const ClassAddonsModal: React.FC<ClassAddonsModalProps> = ({
  isOpen,
  onClose,
  appData,
  setAppData,
  showSuccess,
  currentStudentId
}) => {
  const [activeTab, setActiveTab] = useState<"construction" | "events" | "collection">("construction");
  const [collectionTab, setCollectionTab] = useState<"buildings" | "events" | "slimes" | "titles" | "items">("buildings");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>(currentStudentId || "");

  if (!isOpen) return null;

  // Assure proper safe data
  const data = getSafeClassAddonsData(appData);
  const construction = appData.classConstructionData || data.classConstructionData;
  const events = appData.classEventData || data.classEventData;
  const collections = appData.classCollectionData || data.classCollectionData;

  const buildings = construction.buildings || [];
  const activeEvent = events.activeEvent;

  // Handle donation click / upgrade
  const handleUpgrade = (buildingId: string) => {
    setErrorMsg("");
    const res = upgradeBuilding(appData, buildingId);
    if (res.success) {
      setAppData(res.data);
      showSuccess(null, 0); // Trigger standard saving float
    } else {
      setErrorMsg(res.message);
    }
  };

  const getOwnedQuantity = (prod: any) => {
    if (!selectedStudentId) return 0;
    const student = appData.students?.find(s => s.id === selectedStudentId);
    if (!student) return 0;

    if (prod.type === "background") {
      return student.ownedBackgrounds?.includes(prod.originalId) ? 1 : 0;
    } else if (prod.type === "decoration") {
      return (student as any).studentOwnedDecorations?.includes(prod.originalId) ? 1 : 0;
    } else if (prod.type === "title") {
      return (student as any).studentOwnedTitles?.includes(prod.originalId) ? 1 : 0;
    } else if (prod.type === "item") {
      return (student as any).studentOwnedItems?.includes(prod.originalId) ? 1 : 0;
    }
    return 0;
  };

  const handleBuyProduct = (prod: any) => {
    setErrorMsg("");
    if (!selectedStudentId) {
      setErrorMsg("請先選擇你的角色/座號，才能向行商霍華德購買寶物！");
      return;
    }

    const student = appData.students?.find(s => s.id === selectedStudentId);
    if (!student) {
      setErrorMsg("找不到該學生的角色資料！");
      return;
    }

    if (prod.priceType === "points") {
      if (student.points < prod.price) {
        setErrorMsg(`點術餘額不足！購買需要 ${prod.price} 點，但你只有 ${student.points} 點。`);
        return;
      }
    } else {
      if (student.coins < prod.price) {
        setErrorMsg(`金幣餘額不足！購買需要 ${prod.price} 金幣，但你只有 ${student.coins} 金幣。`);
        return;
      }
    }

    // Update students state
    setAppData(prev => {
      const studs = (prev.students || []).map(s => {
        if (s.id === selectedStudentId) {
          const nextPoints = prod.priceType === "points" ? s.points - prod.price : s.points;
          const nextCoins = prod.priceType === "coins" ? s.coins - prod.price : s.coins;

          let nextBgs = [...(s.ownedBackgrounds || [])];
          let nextDecs = [...((s as any).studentOwnedDecorations || [])];
          let nextTitles = [...((s as any).studentOwnedTitles || [])];
          let nextItems = [...((s as any).studentOwnedItems || [])];

          if (prod.type === "background") {
            if (!nextBgs.includes(prod.originalId)) nextBgs.push(prod.originalId);
          } else if (prod.type === "decoration") {
            if (!nextDecs.includes(prod.originalId)) nextDecs.push(prod.originalId);
          } else if (prod.type === "title") {
            if (!nextTitles.includes(prod.originalId)) nextTitles.push(prod.originalId);
          } else if (prod.type === "item") {
            if (!nextItems.includes(prod.originalId)) nextItems.push(prod.originalId);
          }

          const nextVer = (s.version || 0) + 1;
          const nextTime = Date.now();

          return {
            ...s,
            points: nextPoints,
            coins: nextCoins,
            ownedBackgrounds: nextBgs,
            studentOwnedDecorations: nextDecs,
            studentOwnedTitles: nextTitles,
            studentOwnedItems: nextItems,
            version: nextVer,
            updatedAt: nextTime
          };
        }
        return s;
      });

      return {
        ...prev,
        students: studs
      };
    });

    showSuccess(null, 0); // Trigger standard float save text
    alert(`🎉 恭喜！成功向神秘行商霍華德購買了「${prod.name}」！請前往個人收藏庫更換。`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div 
        className="w-full max-w-4xl bg-[#FFFBF0] border-[6px] border-slate-800 rounded-3xl flex flex-col overflow-hidden max-h-[90vh] shadow-[8px_8px_0px_#2D3748] animate-fade-in"
        id="class-addons-modal-panel"
      >
        {/* Modal Header */}
        <div className="bg-[#F2DD00] border-b-[5px] border-slate-800 p-4 flex justify-between items-center relative gap-2">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🏰</span>
            <h2 
              className="text-2xl md:text-3xl font-black text-white leading-tight"
              style={{
                WebkitTextStroke: "1.5px #2D3748",
                textShadow: "2px 2px 0px #F2941E"
              }}
            >
              班級理想國度中心
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full border-4 border-slate-800 bg-red-400 hover:bg-red-500 text-white font-extrabold flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95"
            title="關閉"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 border-b-4 border-slate-800 shrink-0 gap-1 p-2 overflow-x-auto select-none">
          <button
            onClick={() => { setActiveTab("construction"); setErrorMsg(""); }}
            className={`px-4 py-2 text-sm sm:text-base font-black rounded-xl border-[3px] border-slate-800 transition-all cursor-pointer whitespace-nowrap px-4 py-2 shadow-[2px_2px_0px_#2d3748] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
              activeTab === "construction" 
                ? "bg-amber-400 text-slate-900 translate-x-[2px] translate-y-[2px] shadow-none" 
                : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            🏗️ 班級建設 PROGRESS
          </button>
          
          <button
            onClick={() => { setActiveTab("events"); setErrorMsg(""); }}
            className={`px-4 py-2 text-sm sm:text-base font-black rounded-xl border-[3px] border-slate-800 transition-all cursor-pointer whitespace-nowrap px-4 py-2 shadow-[2px_2px_0px_#2d3748] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
              activeTab === "events" 
                ? "bg-purple-400 text-slate-900 translate-x-[2px] translate-y-[2px] shadow-none" 
                : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            🌠 班級事件 EVENTS
            {activeEvent && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white font-mono text-[9px] rounded-full animate-pulse border border-white">
                LIVE
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab("collection"); setErrorMsg(""); }}
            className={`px-4 py-2 text-sm sm:text-base font-black rounded-xl border-[3px] border-slate-800 transition-all cursor-pointer whitespace-nowrap px-4 py-2 shadow-[2px_2px_0px_#2d3748] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
              activeTab === "collection" 
                ? "bg-sky-400 text-slate-900 translate-x-[2px] translate-y-[2px] shadow-none" 
                : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            📖 班級圖鑑 COLLECTION BOOK
          </button>
        </div>

        {/* Modal Content Column */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scroll">
          
          {/* Identity Chooser Bar */}
          <div className="mb-5 bg-amber-50/60 border-[3px] border-slate-700 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2.5 text-left">
              <span className="text-3xl filter drop-shadow">👤</span>
              <div>
                <span className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                  當前操作學員：
                  {selectedStudentId ? (
                    <span className="text-xs bg-emerald-500 text-white font-black px-2 py-0.5 rounded-full">
                      已登入代表
                    </span>
                  ) : (
                    <span className="text-xs bg-red-500 text-white font-black px-2 py-0.5 rounded-full animate-pulse">
                      尚未登錄
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-slate-500 font-extrabold block leading-tight mt-0.5">
                  請選擇你的帳號座號，即可在下方神秘商船中使用個人點數或金幣搶購限量寶物！
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <select
                value={selectedStudentId}
                onChange={(e) => {
                  setSelectedStudentId(e.target.value);
                  setErrorMsg("");
                }}
                className="w-full sm:w-56 p-2 border-2 border-slate-700 bg-white rounded-xl text-xs font-black shadow-sm cursor-pointer"
              >
                <option value="">-- 👤 選擇你的代表座號 --</option>
                {(appData.students || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    No.{(s as any).seatNumber || s.id.substring(0, 4)} - {s.name} ({s.points} 點 / {s.coins} 金幣)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-100 border-2 border-red-400 rounded-xl text-red-800 text-xs sm:text-sm font-black text-left">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* ==================================== */}
          {/* TAB 1: Class Construction (班級建設) */}
          {/* ==================================== */}
          {activeTab === "construction" && (
            <div className="space-y-6 text-left">
              {/* Feature Header */}
              <div className="bg-amber-100/60 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="text-left">
                  <h3 className="text-amber-950 font-black text-lg">🏫 班級共同理想故鄉大挑戰</h3>
                  <p className="text-xs text-amber-800 font-extrabold mt-1">
                    完成各項課堂任務都可以自動累積「班級貢獻值」！貢獻值可用於升級全體建築物。
                  </p>
                </div>
                <div className="bg-indigo-600 border-[3px] border-slate-800 text-white font-black px-4 py-2.5 rounded-2xl text-center shadow-[3px_3px_0px_#2d3748] shrink-0">
                  <div className="text-[10px] uppercase text-indigo-200 font-extrabold">可支配班級貢獻值</div>
                  <div className="text-2xl font-black mt-0.5">{construction.classContribution} ⭐</div>
                </div>
              </div>

              {/* Buildings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {buildings.map((b: any) => {
                  const percent = Math.min(100, Math.floor((b.currentExp / (b.targetExp || 100)) * 100));
                  const isMax = b.level >= 5;

                  // Costs based on next level
                  let upgradeCost = 100;
                  if (b.level === 2) upgradeCost = 200;
                  if (b.level === 3) upgradeCost = 300;
                  if (b.level === 4) upgradeCost = 500;

                  return (
                    <div 
                      key={b.id} 
                      className="bg-white border-[3px] border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center sm:items-start hover:shadow-md transition-shadow relative"
                    >
                      {/* Big Building Icon badge */}
                      <div className="w-16 h-16 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-4xl shrink-0 shadow-inner">
                        {b.icon}
                      </div>

                      {/* Content Area */}
                      <div className="flex-1 w-full text-center sm:text-left">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                          <span className="font-black text-slate-800 text-lg leading-tight">{b.name}</span>
                          <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 text-xs px-2.5 py-0.5 rounded-full font-black select-none">
                            LV.{b.level}
                          </span>
                          {isMax && (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-black select-none">
                              MAX
                            </span>
                          )}
                        </div>

                        {/* Description mapping */}
                        <p className="text-xs font-bold text-gray-500 mt-1 min-h-[32px]">
                          {BOOK_BUILDINGS.find(it => it.id === `${b.id}_${b.level}`)?.description || "一個正在興建的偉大建築！"}
                        </p>

                        {/* Progress meter */}
                        <div className="mt-2.5">
                          <div className="flex justify-between items-center text-[10px] font-black text-indigo-700 mb-1">
                            <span>當前建設進度：{percent}%</span>
                            <span>{b.currentExp}/{b.targetExp} EP</span>
                          </div>
                          <div className="w-full bg-slate-200 border-2 border-slate-400 rounded-full h-3.5 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-yellow-400 to-amber-500 h-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>

                        {/* Upgrade actions row */}
                        {!isMax && (
                          <div className="mt-4 flex items-center justify-between gap-2 border-t pt-2 border-slate-100">
                            <span className="text-xs font-bold text-slate-500">
                              升級所需貢獻：<span className="text-indigo-600 font-extrabold">{upgradeCost} ⭐</span>
                            </span>
                            <button
                              disabled={construction.classContribution < upgradeCost}
                              onClick={() => handleUpgrade(b.id)}
                              className={`px-3 py-1 bg-[#10B981] hover:bg-[#059669] disabled:bg-slate-300 disabled:border-slate-400 disabled:text-slate-500 disabled:cursor-not-allowed border-2 border-slate-800 text-white rounded-lg text-xs font-black shadow-[2px_2px_0_#1f2937] active:transform active:translate-y-0.5 transition-transform cursor-pointer`}
                            >
                              【點選升級】
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================== */}
          {/* TAB 2: Class Events (班級事件) */}
          {/* ============================== */}
          {activeTab === "events" && (
            <div className="space-y-6 text-left">
              {/* Header Panel */}
              <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4">
                <h3 className="text-xl font-black text-purple-950">💡 班級奇境隨機事件中心</h3>
                <p className="text-xs text-purple-700 font-extrabold mt-1">
                  隨堂可能因建築物升級、手動或隨機運氣觸發獨特的限時天候事件！為全班學生注入魔力。
                </p>
              </div>

              {/* Active Event Box */}
              {activeEvent ? (
                <>
                  <div className="bg-[#FAF5FF] border-[4px] border-purple-400 rounded-3xl p-5 md:p-6 shadow-[4px_4px_0px_#e9d5ff] relative overflow-hidden flex flex-col md:flex-row gap-5 items-center">
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-[11px] font-black px-3 py-1 rounded-full border-2 border-slate-800 animate-pulse select-none">
                      ✨ 事件發生中 ✨
                    </div>

                    {/* Giant Event Emoji */}
                    <div className="w-24 h-24 rounded-full bg-purple-100 border-4 border-purple-300 flex items-center justify-center text-6xl shrink-0 select-none shadow-md">
                      {activeEvent.icon}
                    </div>

                    <div className="flex-1 text-center md:text-left text-purple-950">
                      <h4 className="text-2xl font-black">{activeEvent.name}</h4>
                      <p className="text-sm font-extrabold text-purple-600 mt-1">
                        效應：{activeEvent.description}
                      </p>
                      
                      <div className="mt-4 flex flex-wrap items-center gap-4 justify-center md:justify-start">
                        <div className="bg-white border-2 border-purple-400 px-4 py-1.5 rounded-xl text-xs font-extrabold">
                          🕒 剩餘時間：
                          <span className="text-indigo-600 font-bold font-mono">
                            {(() => {
                              if (!activeEvent.startedAt) return "剩餘 10 分鐘";
                              const elapsed = Math.floor((Date.now() - activeEvent.startedAt) / 60000);
                              const rem = Math.max(1, activeEvent.durationMinutes - elapsed);
                              return `大約 ${rem} 分鐘`;
                            })()}
                          </span>
                        </div>
                        <span className="text-xs text-purple-400 font-bold">
                          ※ 大螢幕將常態性共享並顯示此次全班祝福！
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mysterious Merchant Shop Interface */}
                  {activeEvent.id === "event_merchant" && (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-100/50 border-[4px] border-amber-500 rounded-3xl p-5 md:p-6 shadow-[4px_4px_0px_rgba(217,119,6,1)] animate-fadeIn">
                      <div className="flex justify-between items-center border-b-[3px] border-amber-400 pb-3 mb-5 flex-wrap gap-2 text-left">
                        <div>
                          <h4 className="text-xl font-black text-amber-950 flex items-center gap-1.5">
                            <span>🛒 神秘行商霍華德 Howard 的魔力櫃檯</span>
                          </h4>
                          <p className="text-xs text-amber-800 font-extrabold mt-1">
                            每次出現隨機提供 3～8 件特殊裝飾、限定精美背景或傳奇稱號，全班共享貨架！學生需選擇座號登錄以利用個人金幣/點數扣點抱走！
                          </p>
                        </div>
                        <span className="bg-amber-500 text-white font-extrabold px-3 py-1.5 border-2 border-slate-800 text-[10px] sm:text-xs rounded-xl shadow-sm shrink-0">
                          ✨ 限定購入一次 / 即時存檔
                        </span>
                      </div>

                      {/* Display Products */}
                      {(!activeEvent.merchantProducts || activeEvent.merchantProducts.length === 0) ? (
                        <div className="py-8 text-center bg-white/80 border border-amber-300 rounded-2xl">
                          <p className="text-sm font-black text-amber-950">🧙‍♂️ 「嘿！我的背包箱子剛才漏水，快幫我招安貨櫃商品！」</p>
                          <p className="text-xs text-amber-700 mt-1">
                            請在底下手動重新派遣魔力貨品。
                          </p>
                          <button
                            onClick={() => {
                              setAppData(prev => {
                                const inner = getSafeClassAddonsData(prev);
                                if (!inner.classEventData.activeEvent) return prev;
                                return {
                                  ...prev,
                                  classEventData: {
                                    ...inner.classEventData,
                                    activeEvent: {
                                      ...inner.classEventData.activeEvent,
                                      merchantProducts: generateMerchantProducts(prev, BOOK_ITEMS) // fallback generator
                                    }
                                  }
                                };
                              });
                              alert("✨ 霍華德重新打開了行商箱，3 ~ 8 件稀珍商品上架成功！");
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-4.5 py-2 rounded-xl border border-amber-800 mt-4 cursor-pointer"
                          >
                            🪄 手動補貨/上架
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                          {activeEvent.merchantProducts.map((prod: any) => {
                            const quantityOwned = getOwnedQuantity(prod);
                            const isCollected = quantityOwned > 0;
                            const isCoin = prod.priceType === "coins";
                            const rarityColors: any = {
                              common: "bg-slate-100 text-slate-800 border-slate-300",
                              rare: "bg-blue-100 text-blue-800 border-blue-300",
                              epic: "bg-purple-100 text-purple-800 border-purple-300 animate-pulse",
                              legendary: "bg-amber-100 text-amber-800 border-amber-400 font-extrabold",
                              mythic: "bg-rose-100 text-rose-805 border-rose-300 font-extrabold animate-bounce"
                            };

                            const typeLabels: any = {
                              background: "🏙️ 背景",
                              decoration: "🖼️ 飾品",
                              title: "🎖️ 稱號",
                              item: "🎁 珍藏"
                            };

                            return (
                              <div
                                key={prod.id}
                                className={`bg-white border-[3px] p-4 rounded-2xl flex flex-col justify-between gap-3 shadow-sm transition-all hover:-translate-y-0.5 ${
                                  isCollected ? "border-slate-300 opacity-75" : "border-slate-850 hover:border-amber-500"
                                }`}
                              >
                                <div>
                                  <div className="flex justify-between items-center gap-2">
                                    <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full font-black">
                                      {typeLabels[prod.type] || "🔮 收藏"}
                                    </span>
                                    <span className={`text-[9px] border px-2 py-0.5 rounded-full font-black ${rarityColors[prod.rarity] || "bg-gray-100"}`}>
                                      {prod.rarity?.toUpperCase()}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3 mt-2.5">
                                    <div className="w-14 h-14 rounded-xl bg-amber-50 border-2 border-slate-700 flex items-center justify-center text-3xl shrink-0 shadow-inner overflow-hidden">
                                      {prod.icon?.startsWith("linear") ? (
                                        <div className="w-full h-full" style={{ background: prod.icon }} />
                                      ) : prod.icon}
                                    </div>
                                    <div className="min-w-0">
                                      <h5 className="font-extrabold text-[13px] text-slate-800 leading-tight truncate">{prod.name}</h5>
                                      <span className="text-[9px] text-gray-400 block mt-1 font-bold">
                                        背包狀態：{isCollected ? "✅ 已經全套收藏" : "❌ 尚未擁有"}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="border-t border-dashed border-slate-200 pt-3.5 mt-2 flex items-center justify-between gap-2">
                                  <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-gray-400">所需代價：</span>
                                    <span className={`text-sm font-black font-mono tracking-tight ${isCoin ? "text-amber-600" : "text-indigo-600"}`}>
                                      {prod.price} {isCoin ? "金幣 🪙" : "點數 🧪"}
                                    </span>
                                  </div>

                                  {isCollected ? (
                                    <button
                                      disabled
                                      className="bg-slate-100 text-slate-400 border border-slate-300 px-3 py-1.5 text-[11px] font-black rounded-lg cursor-not-allowed select-none"
                                    >
                                      已收藏 ✓
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleBuyProduct(prod)}
                                      className={`px-3 py-1.5 border-2 border-slate-850 rounded-lg text-xs font-black shadow-[2px_2px_0_#1f2937] transition-all cursor-pointer active:translate-y-0.5 active:shadow-none shrink-0 ${
                                        isCoin
                                          ? "bg-amber-400 hover:bg-amber-500 text-slate-800"
                                          : "bg-indigo-500 hover:bg-indigo-600 text-white"
                                      }`}
                                    >
                                      購入 🛒
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-slate-50 border-[3px] border-dashed border-slate-300 p-8 text-center rounded-2xl flex flex-col items-center justify-center">
                  <span className="text-5xl my-2">🌌</span>
                  <h4 className="text-base font-black text-slate-500">目前天空晴朗，無特殊隨機天候事件</h4>
                  <p className="text-xs text-gray-400 mt-1.5">
                    事件將常規經由教師手動引發、隨機天降或班級升級建築而激活喔。期待與神秘霍華德商人的降臨吧！🍀
                  </p>
                </div>
              )}

              {/* Event templates description info */}
              <div className="space-y-3">
                <div className="text-xs font-black text-slate-500 border-b pb-1 flex items-center gap-1.5">
                  <span>📜 列王傳說 ── 班常駐可能事件一覽：</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {ALL_EVENTS_TEMPLATES.map((ev) => (
                    <div key={ev.id} className="bg-white border-2 border-slate-200 p-3 rounded-xl flex gap-2 items-start">
                      <span className="text-2xl shrink-0">{ev.icon}</span>
                      <div>
                        <h5 className="font-extrabold text-sm text-slate-800">{ev.name}</h5>
                        <p className="text-[10px] text-gray-400 font-bold leading-tight mt-0.5">{ev.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =================================== */}
          {/* TAB 3: Class Collection Book (班級圖鑑) */}
          {/* =================================== */}
          {activeTab === "collection" && (
            <div className="space-y-6 text-left">
              {/* Tab Category select header menu */}
              <div className="flex bg-amber-100/50 p-2 border-2 border-amber-200 rounded-2xl gap-1 shrink-0 overflow-x-auto select-none">
                <button
                  onClick={() => setCollectionTab("buildings")}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap border-2 border-slate-700 shadow-sm ${
                    collectionTab === "buildings" ? "bg-amber-400 text-slate-900 border-slate-800" : "bg-white text-slate-600"
                  }`}
                >
                  🏗️ 建築圖鑑
                </button>
                <button
                  onClick={() => setCollectionTab("events")}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap border-2 border-slate-700 shadow-sm ${
                    collectionTab === "events" ? "bg-purple-300 text-slate-900 border-slate-800" : "bg-white text-slate-600"
                  }`}
                >
                  🌠 事件圖鑑
                </button>
                <button
                  onClick={() => setCollectionTab("slimes")}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap border-2 border-slate-700 shadow-sm ${
                    collectionTab === "slimes" ? "bg-emerald-300 text-slate-900 border-slate-800" : "bg-white text-slate-600"
                  }`}
                >
                  🐾 史萊姆圖鑑
                </button>
                <button
                  onClick={() => setCollectionTab("titles")}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap border-2 border-slate-700 shadow-sm ${
                    collectionTab === "titles" ? "bg-indigo-300 text-slate-900 border-slate-800" : "bg-white text-slate-600"
                  }`}
                >
                  🎖️ 特殊稱號
                </button>
                <button
                  onClick={() => setCollectionTab("items")}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap border-2 border-slate-700 shadow-sm ${
                    collectionTab === "items" ? "bg-pink-300 text-slate-900 border-slate-800" : "bg-white text-slate-600"
                  }`}
                >
                  ✨ 稀有收藏
                </button>
              </div>

              {/* Display chosen catalog section */}
              {collectionTab === "buildings" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {BOOK_BUILDINGS.map((item) => {
                    const isUnlocked = collections.unlockedBuildings.includes(item.id);
                    return (
                      <div 
                        key={item.id} 
                        className={`p-3 rounded-2xl border-2 flex gap-3 transition-colors ${
                          isUnlocked 
                            ? "bg-amber-50/50 border-amber-300 opacity-100" 
                            : "bg-gray-100 border-dashed border-gray-300 opacity-50 select-none"
                        }`}
                      >
                        <span className={`text-4xl select-none ${isUnlocked ? "" : "grayscale"}`}>
                          {item.icon}
                        </span>
                        <div>
                          <h5 className={`font-black text-sm ${isUnlocked ? "text-amber-950" : "text-gray-400"}`}>
                            {isUnlocked ? item.name : "🔒 尚未解鎖"}
                          </h5>
                          <p className="text-[11px] text-gray-500 font-bold leading-tight mt-1">
                            {isUnlocked ? item.description : `需要該建築建造升級達成解鎖此條目資訊。`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {collectionTab === "events" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {BOOK_EVENTS.map((item) => {
                    const isUnlocked = collections.unlockedEvents.includes(item.id);
                    return (
                      <div 
                        key={item.id} 
                        className={`p-3 rounded-2xl border-2 flex gap-3 transition-colors ${
                          isUnlocked 
                            ? "bg-purple-50/50 border-purple-300 opacity-100" 
                            : "bg-gray-100 border-dashed border-gray-300 opacity-50 select-none"
                        }`}
                      >
                        <span className={`text-4xl select-none ${isUnlocked ? "" : "grayscale"}`}>
                          {item.icon}
                        </span>
                        <div>
                          <h5 className={`font-black text-sm ${isUnlocked ? "text-purple-950" : "text-gray-400"}`}>
                            {isUnlocked ? item.name : "🔒 未知事件"}
                          </h5>
                          <p className="text-[11px] text-gray-500 font-bold leading-tight mt-1">
                            {isUnlocked ? item.description : `觸發過此班級天候事件後自動解鎖記錄。`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {collectionTab === "slimes" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {BOOK_SLIMES.map((item) => {
                    const isUnlocked = collections.unlockedSlimes.includes(item.id);
                    return (
                      <div 
                        key={item.id} 
                        className={`p-3 rounded-2xl border-2 flex gap-3 transition-colors ${
                          isUnlocked 
                            ? "bg-emerald-50/50 border-emerald-300 opacity-100" 
                            : "bg-gray-100 border-dashed border-gray-300 opacity-50 select-none"
                        }`}
                      >
                        <span className={`text-4xl select-none ${isUnlocked ? "" : "grayscale"}`}>
                          {item.icon}
                        </span>
                        <div>
                          <h5 className={`font-black text-sm ${isUnlocked ? "text-emerald-950" : "text-gray-400"}`}>
                            {isUnlocked ? item.name : "🔒 神秘史萊姆"}
                          </h5>
                          <p className="text-[11px] text-gray-500 font-bold leading-tight mt-1">
                            {isUnlocked ? item.description : `當有同學成功孵化孵養此元素史萊姆時即可解鎖。`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {collectionTab === "titles" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {BOOK_TITLES.map((item) => {
                    const isUnlocked = collections.unlockedTitles.includes(item.id);
                    return (
                      <div 
                        key={item.id} 
                        className={`p-3 rounded-2xl border-2 flex gap-3 transition-colors ${
                          isUnlocked 
                            ? "bg-indigo-50/50 border-indigo-300 opacity-100" 
                            : "bg-gray-100 border-dashed border-gray-300 opacity-50 select-none"
                        }`}
                      >
                        <span className={`text-4xl select-none ${isUnlocked ? "" : "grayscale"}`}>
                          {item.icon}
                        </span>
                        <div>
                          <h5 className={`font-black text-sm ${isUnlocked ? item.name : "🔒 未解鎖稱號"}`}>
                            {isUnlocked ? item.name : "🔒 未解鎖稱號"}
                          </h5>
                          <p className="text-[11px] text-gray-500 font-bold leading-tight mt-1">
                            {isUnlocked ? item.description : `全班共同累積成就或特殊任務解鎖。`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {collectionTab === "items" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {BOOK_ITEMS.map((item) => {
                    const isUnlocked = collections.unlockedItems.includes(item.id);
                    return (
                      <div 
                        key={item.id} 
                        className={`p-3 rounded-2xl border-2 flex gap-3 transition-colors ${
                          isUnlocked 
                            ? "bg-pink-50/50 border-pink-300 opacity-100" 
                            : "bg-gray-100 border-dashed border-gray-300 opacity-50 select-none"
                        }`}
                      >
                        <span className={`text-4xl select-none ${isUnlocked ? "" : "grayscale"}`}>
                          {item.icon}
                        </span>
                        <div>
                          <h5 className={`font-black text-sm ${isUnlocked ? item.name : "🔒 神秘收藏品"}`}>
                            {isUnlocked ? item.name : "🔒 神秘收藏品"}
                          </h5>
                          <p className="text-[11px] text-gray-500 font-bold leading-tight mt-1">
                            {isUnlocked ? item.description : `在特定限時事件或挑戰成功中獲得解鎖。`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer banner */}
        <div className="bg-slate-100 border-t-4 border-slate-800 p-3 flex justify-between items-center text-xs text-gray-400 font-bold font-mono">
          <span>理想國度建設系統 v1.0.0</span>
          <span>永久保全存檔：不會因任何重置而消失卡頓</span>
        </div>
      </div>
    </div>
  );
};
