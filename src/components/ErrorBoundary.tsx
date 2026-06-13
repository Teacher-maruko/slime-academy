import React, { ErrorInfo, ReactNode } from "react";
import { AlertOctagon, RefreshCw, Trash2, Copy, Home, HelpCircle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorType: "react" | "global" | "promise" | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorType: "react",
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console or telemetry service
    console.error("🚨 React Error Boundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleGlobalError = (event: ErrorEvent) => {
    // Prevent the default browser console print if we want to handle it,
    // but typically we let it log while updating our fallback UI.
    console.error("🚨 Global window.onerror caught:", event.error || event.message);
    
    // Ignore harmless Vite/HMR disconnect messages or third party extensions
    const msg = event.message || "";
    if (msg.includes("vite") || msg.includes("websocket") || msg.includes("HMR")) {
      return;
    }

    this.setState({
      hasError: true,
      error: event.error || new Error(msg),
      errorType: "global",
    });
  };

  private handlePromiseRejection = (event: PromiseRejectionEvent) => {
    console.error("🚨 Unhandled Promise Rejection caught:", event.reason);
    
    let errorObj: Error;
    if (event.reason instanceof Error) {
      errorObj = event.reason;
    } else if (typeof event.reason === "string") {
      errorObj = new Error(event.reason);
    } else {
      errorObj = new Error(JSON.stringify(event.reason) || "Unknown Promise Rejection");
    }

    this.setState({
      hasError: true,
      error: errorObj,
      errorType: "promise",
    });
  };

  componentDidMount() {
    window.addEventListener("error", this.handleGlobalError);
    window.addEventListener("unhandledrejection", this.handlePromiseRejection);
  }

  componentWillUnmount() {
    window.removeEventListener("error", this.handleGlobalError);
    window.removeEventListener("unhandledrejection", this.handlePromiseRejection);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearCacheAndReload = () => {
    if (
      window.confirm(
        "🧹 確定要重設本地進度快取嗎？\n\n這將重設本地的史萊姆及名單紀錄並嘗試修復損毀的資料結構，請僅在網頁持續崩潰且無法載入時執行！(若是雲端班級，資料已保存於雲端資料庫不用擔心)"
      )
    ) {
      try {
        localStorage.removeItem("class_quest_ultimate");
        localStorage.removeItem("classQuestData");
        localStorage.removeItem("active_class_code");
        localStorage.removeItem("active_class_name");
        alert("✨ 本地快取已重設，即將重新載入頁面！");
        window.location.reload();
      } catch (err) {
        console.error("Failed to clear localStorage:", err);
      }
    }
  };

  handleCopyDiagnostics = () => {
    const diagnosticInfo = {
      timestamp: new Date().toISOString(),
      errorType: this.state.errorType,
      errorMessage: this.state.error?.message || "No message available",
      errorStack: this.state.error?.stack || "No stack trace available",
      componentStack: this.state.errorInfo?.componentStack || "No component stack available",
      userAgent: navigator.userAgent,
    };

    navigator.clipboard
      .writeText(JSON.stringify(diagnosticInfo, null, 2))
      .then(() => {
        alert("📋 系統錯誤診斷資訊已成功複製到剪貼簿！");
      })
      .catch((err) => {
        console.error("Failed to copy diagnostics:", err);
        alert("無法自動複製，請手動複製下方文字框內的內容。");
      });
  };

  handleResetState = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || "不明的系統異常";
      const errorStack = this.state.error?.stack || "";
      const componentStack = this.state.errorInfo?.componentStack || "";
      const typeLabel =
        this.state.errorType === "react"
          ? "React 渲染樹崩潰"
          : this.state.errorType === "promise"
          ? "非同步程式(Promise)異常"
          : "網頁全域執行期異常";

      return (
        <div id="error-boundary-root" className="min-h-screen bg-slate-100 flex items-center justify-center p-4 selection:bg-rose-200">
          <div 
            id="error-boundary-card"
            className="w-full max-w-2xl bg-white border-[6px] border-slate-700 rounded-3xl shadow-2xl p-6 md:p-8 text-center relative overflow-hidden"
          >
            {/* Top decorative stripe */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-red-500 via-amber-500 to-rose-500" />

            <div className="flex flex-col items-center mt-2">
              <div 
                id="error-boundary-icon-wrapper"
                className="w-20 h-20 bg-rose-50 border-4 border-rose-500 text-rose-500 rounded-2xl flex items-center justify-center animate-bounce mb-5 shadow-sm"
              >
                <AlertOctagon size={44} className="stroke-2" />
              </div>

              <h1 id="error-boundary-main-title" className="text-3xl font-black text-slate-800 tracking-tight leading-none">
                遭遇突發魔法結界！
              </h1>
              <p id="error-boundary-subtitle" className="text-sm font-bold text-slate-400 mt-2">
                ClassQuest Classroom Error Diagnostic Hub
              </p>

              <div id="error-boundary-friendly-message" className="mt-5 text-left bg-rose-50/70 border-2 border-rose-150 p-4 rounded-2xl w-full">
                <span className="text-xs font-black text-rose-400 block tracking-wider uppercase mb-1">
                  🚨 錯誤偵測模式：{typeLabel}
                </span>
                <p className="text-base font-extrabold text-slate-700 leading-relaxed">
                  老師、小朋友別慌張！系統剛剛攔截到一個預期外的異常，請放心，您的雲端資料不會遺失。您可以嘗試重新整理網頁，或通報系統工程師進行排解。
                </p>
                <div className="mt-3 py-2 px-3 bg-white border border-rose-200 rounded-xl">
                  <span className="text-xs font-bold text-rose-600 block mb-0.5">系統錯誤代碼 (Error Message):</span>
                  <code className="text-xs font-mono font-bold text-rose-800 select-all break-all">
                    {errorMsg}
                  </code>
                </div>
              </div>

              {/* Action buttons */}
              <div id="error-boundary-actions" className="grid grid-cols-2 gap-3 w-full mt-6">
                <button
                  id="error-action-reload"
                  type="button"
                  onClick={this.handleReload}
                  className="flex items-center justify-center gap-2 btn-game bg-amber-400 hover:bg-amber-500 text-slate-900 border-2 border-slate-700 shadow-[2px_2px_0px_#334155] rounded-xl py-3 px-4 text-sm font-black transform active:scale-97 transition-all cursor-pointer"
                >
                  <RefreshCw size={16} className="animate-spin-hover" />
                  重新整理網頁
                </button>

                <button
                  id="error-action-copy-diag"
                  type="button"
                  onClick={this.handleCopyDiagnostics}
                  className="flex items-center justify-center gap-2 btn-game bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-700 shadow-[2px_2px_0px_#334155] rounded-xl py-3 px-4 text-sm font-black transform active:scale-97 transition-all cursor-pointer"
                >
                  <Copy size={16} />
                  複製診斷資訊
                </button>

                <button
                  id="error-action-clear-cache"
                  type="button"
                  onClick={this.handleClearCacheAndReload}
                  className="flex items-center justify-center gap-2 btn-game bg-rose-50 hover:bg-rose-100 text-rose-700 border-2 border-slate-700 shadow-[2px_2px_0px_#334155] rounded-xl py-3 px-4 text-sm font-black transform active:scale-97 transition-all cursor-pointer"
                >
                  <Trash2 size={16} />
                  重設本地快取
                </button>

                <button
                  id="error-action-ignore"
                  type="button"
                  onClick={this.handleResetState}
                  className="flex items-center justify-center gap-2 btn-game bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-2 border-slate-700 shadow-[2px_2px_0px_#334155] rounded-xl py-3 px-4 text-sm font-black transform active:scale-97 transition-all cursor-pointer"
                >
                  <Home size={16} />
                  忽略此錯誤
                </button>
              </div>

              {/* Collapsible diagnostic details */}
              <div id="error-boundary-details-container" className="w-full mt-6 text-left">
                <details className="group border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                  <summary className="flex items-center justify-between p-3.5 bg-slate-100 cursor-pointer select-none font-bold text-xs text-slate-500 hover:text-slate-700">
                    <span className="flex items-center gap-1.5 font-extrabold">
                      <HelpCircle size={14} />
                      檢視技術診斷報告 (Diagnostic Log Details)
                    </span>
                    <span className="transition-transform group-open:rotate-180">▼</span>
                  </summary>
                  
                  <div className="p-4 border-t border-slate-200 bg-slate-900 text-slate-300 font-mono text-[11px] overflow-x-auto max-h-[220px] custom-scroll space-y-3">
                    <div className="border-b border-slate-800 pb-2">
                      <p className="text-amber-400 font-bold"># Environment Context:</p>
                      <p>Time (UTC): 2026-06-05T01:55:27Z</p>
                      <p>Browser: {navigator.userAgent}</p>
                    </div>

                    {errorStack && (
                      <div>
                        <p className="text-rose-450 font-bold"># Error Callstack Trace:</p>
                        <pre className="whitespace-pre-wrap select-all leading-tight mt-1 bg-black/40 p-2 rounded border border-slate-800">
                          {errorStack}
                        </pre>
                      </div>
                    )}

                    {componentStack && (
                      <div>
                        <p className="text-indigo-400 font-bold"># React Component Stack Hierarchy:</p>
                        <pre className="whitespace-pre-wrap select-all leading-tight mt-1 bg-black/40 p-2 rounded border border-slate-800">
                          {componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
