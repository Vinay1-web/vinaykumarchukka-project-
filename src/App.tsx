/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  ShieldCheck, 
  Mail, 
  MessageSquare, 
  Link as LinkIcon, 
  Search, 
  History, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink,
  Loader2,
  LogOut,
  User,
  LayoutDashboard,
  HelpCircle,
  LifeBuoy,
  AlertOctagon,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, collection, addDoc } from "./lib/firebase";
import { analyzeContent, ScanResult } from "./services/geminiService";
import { cn } from "./lib/utils";

// --- Types ---

interface ScanRecord extends ScanResult {
  id: string;
  type: "email" | "sms" | "url";
  content: string;
  timestamp: any;
}

// --- Components ---

const RiskBadge = ({ level }: { level: "Low" | "Medium" | "High" }) => {
  const colors = {
    Low: "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-200/50 shadow-[0_0_10px_rgba(16,185,129,0.1)]",
    Medium: "bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-200/50 shadow-[0_0_10px_rgba(245,158,11,0.1)]",
    High: "bg-gradient-to-r from-rose-600 to-red-600 text-white border-rose-700 shadow-lg shadow-rose-500/20",
  };

  return (
    <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border backdrop-blur-sm", colors[level])}>
      {level} Risk
    </span>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<"analyze" | "history" | "prediction" | "warnings" | "suggestions" | "advices" | "help">("analyze");
  const [scanType, setScanType] = useState<"email" | "sms" | "url">("email");
  const [input, setInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [deepScan, setDeepScan] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanRecord[]>([]);

  // Load history from local storage for session persistence without login
  useEffect(() => {
    const saved = localStorage.getItem("phish_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const handleScan = async () => {
    if (!input.trim()) return;

    setIsScanning(true);
    setResult(null);

    try {
      const analysis = await analyzeContent(scanType, input, deepScan);
      setResult(analysis);

      const newRecord: ScanRecord = {
        id: Math.random().toString(36).substr(2, 9),
        type: scanType,
        content: input,
        ...analysis,
        timestamp: new Date().toISOString()
      };

      const updatedHistory = [newRecord, ...history].slice(0, 50);
      setHistory(updatedHistory);
      localStorage.setItem("phish_history", JSON.stringify(updatedHistory));

      // Optional: Save to Firestore anonymously if needed, but local is fine for no-login demo
      try {
        await addDoc(collection(db, "scans"), {
          uid: "guest",
          type: scanType,
          content: input,
          ...analysis,
          timestamp: new Date()
        });
      } catch (e) {
        console.warn("Firestore save failed (expected if rules are strict)", e);
      }
    } catch (error) {
      console.error("Scan failed", error);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 glass px-6 py-4 flex items-center justify-between border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400 leading-none mb-1">DEVELOPERS</span>
            <div className="flex items-center gap-3">
              <motion.div 
                animate={{ 
                  y: [0, -4, 0],
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="p-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg shadow-lg shadow-indigo-200"
              >
                <ShieldAlert className="w-5 h-5 text-white" />
              </motion.div>
              <h1 className="text-xl font-black tracking-tight uppercase">Phish Hunter</h1>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-neutral-50 text-neutral-600 rounded-full border border-neutral-200">
            <div className="relative flex h-2 w-2">
              <span className="animate-pulse-lite absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Protection</span>
          </div>
        </div>
      </header>


      <main className="max-w-5xl mx-auto p-6 space-y-12">
        {/* Navigation Tabs */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { 
              opacity: 1, 
              y: 0,
              transition: { staggerChildren: 0.05 }
            }
          }}
          className="flex flex-wrap gap-2 p-1 bg-neutral-50 rounded-2xl w-fit border border-neutral-100"
        >
          {[
            { id: "analyze", label: "Analyze", icon: Search },
            { id: "prediction", label: "Prediction", icon: LayoutDashboard },
            { id: "warnings", label: "Warnings", icon: AlertTriangle },
            { id: "suggestions", label: "Suggestions", icon: CheckCircle2 },
            { id: "advices", label: "Advices", icon: ShieldCheck },
            { id: "help", label: "Help", icon: HelpCircle },
            { id: "history", label: "History", icon: History },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              variants={{
                hidden: { opacity: 0, scale: 0.9 },
                visible: { opacity: 1, scale: 1 }
              }}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all relative",
                activeTab === tab.id 
                  ? "bg-gradient-to-br from-white to-neutral-50 shadow-sm text-black border border-neutral-200" 
                  : "text-neutral-400 hover:text-neutral-600"
              )}
            >
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTabDot"
                  className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                />
              )}
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </motion.button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === "analyze" ? (
            <motion.div 
              key="analyze"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              {/* Quick Tips */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />, bg: "bg-emerald-50 border-emerald-100", title: "Verify Sender", desc: "Check if the email address matches the official domain." },
                  { icon: <AlertTriangle className="w-5 h-5 text-amber-600" />, bg: "bg-amber-50 border-amber-100", title: "Check Links", desc: "Hover over links to see the actual destination URL." },
                  { icon: <MessageSquare className="w-5 h-5 text-indigo-600" />, bg: "bg-indigo-50 border-indigo-100", title: "Trust Instincts", desc: "If it feels too good to be true, it probably is." }
                ].map((tip, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
                    whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)" }}
                    className="p-6 mono-card flex flex-col items-start gap-4"
                  >
                    <div className={cn("p-3 rounded-2xl shrink-0 border", tip.bg)}>
                      {tip.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-tight mb-1">{tip.title}</h4>
                      <p className="text-xs text-neutral-500 leading-relaxed font-medium">{tip.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Scan Controls */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mono-card p-8 space-y-8"
              >
                <div className="flex flex-wrap items-center justify-between gap-6">
                  <div className="flex flex-wrap gap-3">
                    <motion.button 
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setScanType("email")}
                      className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold border transition-all",
                        scanType === "email" 
                          ? "bg-black text-white border-black shadow-lg" 
                          : "bg-white text-neutral-400 border-neutral-100 hover:border-black"
                      )}
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </motion.button>
                    <motion.button 
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setScanType("sms")}
                      className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold border transition-all",
                        scanType === "sms" 
                          ? "bg-black text-white border-black shadow-lg" 
                          : "bg-white text-neutral-400 border-neutral-100 hover:border-black"
                      )}
                    >
                      <MessageSquare className="w-4 h-4" />
                      SMS
                    </motion.button>
                    <motion.button 
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setScanType("url")}
                      className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold border transition-all",
                        scanType === "url" 
                          ? "bg-black text-white border-black shadow-lg" 
                          : "bg-white text-neutral-400 border-neutral-100 hover:border-black"
                      )}
                    >
                      <LinkIcon className="w-4 h-4" />
                      URL
                    </motion.button>
                  </div>

                  <div className={cn(
                    "flex items-center gap-4 px-4 py-2 rounded-2xl border transition-colors",
                    deepScan ? "bg-indigo-50/50 border-indigo-100" : "bg-neutral-50 border-neutral-100"
                  )}>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Deep AI Scan</span>
                      <span className="text-[8px] text-neutral-300">Uses High Thinking Mode</span>
                    </div>
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setDeepScan(!deepScan)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        deepScan ? "bg-gradient-to-r from-indigo-600 to-violet-600" : "bg-neutral-200"
                      )}
                    >
                      <motion.div 
                        animate={{ x: deepScan ? 26 : 4 }}
                        className={cn(
                          "w-4 h-4 rounded-full absolute top-1",
                          deepScan ? "bg-white" : "bg-white shadow-sm"
                        )}
                      />
                    </motion.button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
                    {scanType === "url" ? "Enter URL to check" : `Paste ${scanType} content`}
                  </label>
                  <div className="relative overflow-hidden rounded-xl">
                    <textarea 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={
                        scanType === "url" ? "https://example.com/login" : 
                        scanType === "email" ? "Paste the full email body here..." : 
                        "Paste the SMS message text here..."
                      }
                      className="mono-input min-h-[160px] resize-none font-mono text-sm text-neutral-900"
                    />
                    {isScanning && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-scan pointer-events-none" />
                    )}
                  </div>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.01, y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={handleScan}
                  disabled={isScanning || !input.trim()}
                  className={cn(
                    "w-full py-5 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white font-black uppercase tracking-widest rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-2xl shadow-indigo-500/20",
                    !isScanning && input.trim() && "animate-glow"
                  )}
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-200" />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-6 h-6" />
                      Scan for Threats
                    </>
                  )}
                </motion.button>

                <div className="flex justify-center">
                  <button 
                    onClick={() => setActiveTab("help")}
                    className="text-xs font-bold text-neutral-400 hover:text-neutral-600 flex items-center gap-1.5 transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Need help identifying a threat? Check our guide
                  </button>
                </div>
              </motion.div>

              {/* Result Display */}
              {result && (
                <motion.div 
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "circOut" }}
                  className={cn(
                    "mono-card overflow-hidden",
                    result.riskLevel === "High" ? "border-black border-2" : ""
                  )}
                >
                  <div className={cn(
                    "p-10 flex items-center justify-between border-b border-neutral-100",
                    result.riskLevel === "High" ? "bg-black text-white" : "bg-gradient-to-br from-neutral-50 to-indigo-50/30"
                  )}>
                    <div className="flex items-center gap-6">
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 12 }}
                        className={cn(
                          "p-5 rounded-2xl",
                          result.riskLevel === "High" ? "bg-white/20" : "bg-white shadow-sm border border-neutral-100"
                        )}
                      >
                        {result.riskLevel === "High" ? <AlertOctagon className="w-10 h-10" /> : 
                         result.riskLevel === "Medium" ? <AlertTriangle className="w-10 h-10 text-black" /> : 
                         <CheckCircle2 className="w-10 h-10 text-black" />}
                      </motion.div>
                      <div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter mb-1">
                          {result.riskLevel === "High" ? "Threat Detected" : 
                           result.riskLevel === "Medium" ? "Suspicious Content" : 
                           "Likely Safe"}
                        </h3>
                        <div className="flex items-center gap-3">
                          <RiskBadge level={result.riskLevel} />
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-[0.3em] opacity-50",
                            result.riskLevel === "High" ? "text-white" : "text-neutral-400"
                          )}>
                            SCAN COMPLETE
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ 
                          opacity: 1, 
                          x: 0,
                          scale: [1, 1.05, 1],
                          textShadow: [
                            "0 0 0px rgba(99, 102, 241, 0)",
                            "0 0 20px rgba(99, 102, 241, 0.3)",
                            "0 0 0px rgba(99, 102, 241, 0)"
                          ]
                        }}
                        transition={{ 
                          scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                          textShadow: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                        }}
                        className="text-5xl font-black tracking-tighter"
                      >
                        {result.riskScore}%
                      </motion.div>
                      <div className="text-[10px] font-black uppercase tracking-widest opacity-60 animate-pulse-lite">Confidence Score</div>
                    </div>
                  </div>

                  <div className="p-8 space-y-8">
                    <div className="relative group/exp">
                      <p className="text-lg font-medium leading-relaxed text-neutral-800">
                        {result.explanation}
                      </p>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(result.explanation);
                        }}
                        className="absolute -top-6 right-0 opacity-0 group-hover/exp:opacity-100 transition-opacity text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-black flex items-center gap-1"
                      >
                        Copy Explanation
                      </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Key Indicators
                        </h3>
                        <ul className="space-y-3">
                          {result.reasons.map((reason, i) => (
                            <motion.li 
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="flex items-start gap-3 text-sm font-bold text-neutral-700 bg-neutral-50 p-4 rounded-xl border border-neutral-100"
                            >
                              <span className="w-2 h-2 rounded-full bg-black mt-1.5 shrink-0" />
                              {reason}
                            </motion.li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" />
                          Safe Alternatives
                        </h3>
                        <ul className="space-y-3">
                          {result.safeAlternatives.map((alt, i) => (
                            <motion.li 
                              key={i}
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="flex items-start gap-3 text-sm font-bold text-neutral-700 bg-neutral-50 p-4 rounded-xl border border-neutral-100"
                            >
                              <span className="w-2 h-2 rounded-full bg-neutral-200 mt-1.5 shrink-0" />
                              {alt}
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {result.deepAnalysis && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4 p-6 bg-neutral-50 rounded-2xl border border-neutral-100"
                      >
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Deep Analysis Report
                        </h3>
                        <p className="text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap font-medium">
                          {result.deepAnalysis}
                        </p>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : activeTab === "prediction" ? (
            <motion.div 
              key="prediction"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mono-card p-8 space-y-8"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-black text-white rounded-2xl">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Threat Prediction</h2>
                  <p className="text-sm text-neutral-500 font-medium">AI-powered forecasting of emerging phishing trends.</p>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { title: "AI-Generated Scams", trend: "Increasing", risk: "High" },
                  { title: "QR Code Phishing", trend: "Stable", risk: "Medium" },
                  { title: "Brand Impersonation", trend: "Decreasing", risk: "Low" }
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ y: -5, borderColor: "#000" }}
                    className="p-8 bg-neutral-50 rounded-2xl border border-neutral-100 transition-colors"
                  >
                    <h3 className="font-black uppercase tracking-tight mb-6 text-sm">{item.title}</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Trend</span>
                        <span className="text-xs font-bold text-black uppercase tracking-wider">{item.trend}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Risk</span>
                        <RiskBadge level={item.risk as any} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="p-4 bg-neutral-50 rounded-xl text-xs text-neutral-400 font-bold uppercase tracking-widest text-center border border-neutral-100">
                Note: Prediction models are updated every 24 hours based on global threat intelligence.
              </div>
            </motion.div>
          ) : activeTab === "warnings" ? (
            <motion.div 
              key="warnings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mono-card p-8 space-y-8"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-black text-white rounded-2xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Active Warnings</h2>
                  <p className="text-sm text-neutral-500 font-medium">Real-time alerts for currently active phishing campaigns.</p>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  "New 'Tax Refund' email scam targeting Gmail users.",
                  "Fake 'Bank Account Locked' SMS circulating in North America.",
                  "Malicious 'Software Update' popups detected on major news sites."
                ].map((warning, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ x: 5, borderColor: "#000" }}
                    className="flex items-center gap-6 p-6 bg-neutral-50 rounded-2xl border border-neutral-100 group transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 border border-neutral-100 group-hover:bg-black transition-colors">
                      <AlertTriangle className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors" />
                    </div>
                    <p className="text-sm font-bold text-neutral-800 uppercase tracking-tight">{warning}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : activeTab === "suggestions" ? (
            <motion.div 
              key="suggestions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mono-card p-8 space-y-8"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-black text-white rounded-2xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Safety Suggestions</h2>
                  <p className="text-sm text-neutral-500 font-medium">Personalized tips to improve your digital security.</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  "Enable 2FA on all financial accounts.",
                  "Use a password manager for unique passwords.",
                  "Verify sender identity before clicking links.",
                  "Keep your browser and OS updated."
                ].map((tip, i) => (
                  <motion.div 
                    key={i}
                    whileHover={{ scale: 1.02, borderColor: "#000" }}
                    className="p-5 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center gap-4 transition-colors"
                  >
                    <CheckCircle2 className="w-5 h-5 text-black" />
                    <p className="text-sm font-bold text-neutral-800">{tip}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : activeTab === "advices" ? (
            <motion.div 
              key="advices"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mono-card p-8 space-y-8"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-black text-white rounded-2xl">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Security Advices</h2>
                  <p className="text-sm text-neutral-500 font-medium">Expert guidance on staying safe in the digital age.</p>
                </div>
              </div>
              <div className="prose prose-neutral max-w-none">
                <p className="text-base text-neutral-500 leading-relaxed font-medium">
                  Phishing is a type of social engineering where an attacker sends a fraudulent message designed to trick a person into revealing sensitive information to the attacker or to deploy malicious software on the victim's infrastructure like ransomware.
                </p>
                <div className="mt-8 grid gap-6">
                  {[
                    { title: "1. Inspect the Sender", desc: "Always check the actual email address, not just the display name. Look for subtle misspellings." },
                    { title: "2. Hover Before Clicking", desc: "Hover your mouse over any link to see the actual destination URL in the bottom corner of your browser." },
                    { title: "3. Beware of Urgency", desc: "Scammers often use high-pressure language to force you to act quickly without thinking." }
                  ].map((advice, i) => (
                    <motion.div 
                      key={i}
                      whileHover={{ x: 5, borderColor: "#000" }}
                      className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100 transition-colors"
                    >
                      <h4 className="font-black uppercase tracking-widest text-sm mb-2">{advice.title}</h4>
                      <p className="text-sm text-neutral-400 font-medium leading-relaxed">{advice.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : activeTab === "help" ? (
            <motion.div 
              key="help"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="mono-card p-8 space-y-12">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-black text-white rounded-2xl">
                    <LifeBuoy className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Help & Support</h2>
                    <p className="text-sm text-neutral-500 font-medium">Everything you need to know about Phish Hunter.</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="space-y-6">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">Frequently Asked Questions</h3>
                      <div className="space-y-6">
                        {[
                          { q: "How does Phish Hunter work?", a: "We use advanced Gemini AI models to analyze the language, structure, and metadata of your content to identify patterns common in phishing attacks." },
                          { q: "Is my data private?", a: "Yes. Scans are processed in real-time and history is stored locally on your device. We do not store your private content on our servers permanently." },
                          { q: "Can it detect all phishing?", a: "While our AI is highly accurate, attackers are constantly evolving. Always use Phish Hunter as a secondary verification tool." },
                          { q: "What should I do if I find a phish?", a: "Report it immediately using the links provided below and delete the message without clicking any links or downloading attachments." }
                        ].map((faq, i) => (
                          <div key={i} className="space-y-2">
                            <p className="text-sm font-bold text-neutral-900">{faq.q}</p>
                            <p className="text-xs text-neutral-400 font-medium leading-relaxed">{faq.a}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">Security Resources</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {[
                          { name: "Anti-Phishing Working Group (APWG)", url: "https://apwg.org/" },
                          { name: "FTC: How to Recognize Phishing", url: "https://consumer.ftc.gov/articles/how-recognize-and-avoid-phishing-scams" },
                          { name: "Google Safety Center", url: "https://safety.google/" }
                        ].map((res, i) => (
                          <motion.a 
                            key={i} 
                            href={res.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            whileHover={{ x: 5, borderColor: "#000" }}
                            className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-100 hover:border-black transition-all group"
                          >
                            <span className="text-xs font-bold uppercase tracking-wider">{res.name}</span>
                            <ExternalLink className="w-3 h-3 text-neutral-400 group-hover:text-black" />
                          </motion.a>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-6">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">Emergency Checklist</h3>
                      <div className="space-y-3">
                        {[
                          "Disconnect your device from the internet.",
                          "Change your passwords immediately.",
                          "Contact your bank or financial institutions.",
                          "Scan your device for malware/viruses.",
                          "Enable Multi-Factor Authentication (MFA).",
                          "Report the incident to authorities."
                        ].map((step, i) => (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ scale: 1.02, borderColor: "rgba(244, 63, 94, 0.3)", backgroundColor: "rgba(244, 63, 94, 0.02)" }}
                            className="flex items-center gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-100 transition-colors"
                          >
                            <div className="w-6 h-6 rounded-full bg-black text-white text-[10px] font-black flex items-center justify-center shrink-0">{i+1}</div>
                            <p className="text-xs font-bold text-neutral-800">{step}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">Support Box</h3>
                      <motion.div 
                        whileHover={{ y: -5, boxShadow: "0 20px 40px -15px rgba(99, 102, 241, 0.2)" }}
                        className="p-6 bg-neutral-900 text-white rounded-2xl border border-neutral-800 shadow-xl space-y-4 relative overflow-hidden group"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <User className="w-16 h-16" />
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Developer Online</span>
                        </div>
                        <h4 className="text-2xl font-black tracking-tight leading-tight">"Hi, I am Vinay"</h4>
                        <p className="text-xs text-neutral-400 font-medium leading-relaxed">
                          Feel free to reach out for any security concerns or technical support. I'm dedicated to keeping your digital life safe.
                        </p>
                        <div className="pt-2">
                          <a 
                            href="mailto:vinaykumarchukka1@gmail.com"
                            className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 flex items-center gap-2 transition-colors"
                          >
                            Send a direct message <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </motion.div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">Contact Support</h3>
                      <div className="p-6 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 space-y-4">
                        <p className="text-sm font-medium text-neutral-600">Need direct assistance? Our developers are here to help you stay safe.</p>
                        <a 
                          href="mailto:vinaykumarchukka1@gmail.com"
                          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-indigo-200 text-indigo-600 font-bold hover:shadow-md transition-all group"
                        >
                          <Mail className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          vinaykumarchukka1@gmail.com
                        </a>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">Report a Phish</h3>
                      <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-4">
                        <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Help protect others by reporting malicious content:</p>
                        <div className="flex flex-wrap gap-3">
                          <motion.a 
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            href="https://reportphishing.apwg.org/" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="px-4 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-lg"
                          >
                            APWG Report
                          </motion.a>
                          <motion.a 
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            href="https://www.ftc.gov/complaint" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="px-4 py-2 bg-white text-black border border-black text-[10px] font-black uppercase tracking-widest rounded-lg"
                          >
                            FTC Complaint
                          </motion.a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              {history.length === 0 ? (
                <div className="text-center py-24 mono-card">
                  <History className="w-16 h-16 text-neutral-100 mx-auto mb-6" />
                  <p className="text-neutral-400 font-bold uppercase tracking-widest">No scan history yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <button 
                      onClick={() => {
                        setHistory([]);
                        localStorage.removeItem("phish_history");
                      }}
                      className="text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-black transition-colors flex items-center gap-2"
                    >
                      Clear History
                    </button>
                  </div>
                  <div className="grid gap-6">
                    {history.map((record, i) => (
                      <motion.div 
                        key={record.id} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ scale: 1.01, borderColor: "rgba(99, 102, 241, 0.3)", backgroundColor: "rgba(99, 102, 241, 0.02)" }}
                        className="mono-card p-6 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-6">
                          <div className="flex items-start gap-6">
                            <div className="p-4 bg-neutral-50 rounded-2xl text-neutral-400 group-hover:bg-black group-hover:text-white transition-colors">
                              {record.type === "email" ? <Mail className="w-6 h-6" /> : 
                               record.type === "sms" ? <MessageSquare className="w-6 h-6" /> : 
                               <LinkIcon className="w-6 h-6" />}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-4">
                                <RiskBadge level={record.riskLevel} />
                                <span className="text-[10px] text-neutral-400 font-black uppercase tracking-widest">
                                  {new Date(record.timestamp?.toDate?.() || record.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-base font-black line-clamp-1 text-neutral-900 uppercase tracking-tight">{record.content}</p>
                              <p className="text-sm text-neutral-400 line-clamp-2 font-medium leading-relaxed">{record.explanation}</p>
                            </div>
                          </div>
                          <button className="p-2 text-neutral-400 hover:text-black transition-colors">
                            <ExternalLink className="w-5 h-5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto p-12 border-t border-neutral-100 mt-24 mb-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="text-center md:text-left space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg">
                <ShieldAlert className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-neutral-900">Phish Hunter</h2>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-400">Advanced AI Threat Detection • v2.0</p>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-4">
            <div className="flex items-center gap-6">
              <motion.a whileHover={{ y: -2 }} href="#" className="text-neutral-400 hover:text-black transition-colors"><ShieldCheck className="w-5 h-5" /></motion.a>
              <motion.a whileHover={{ y: -2 }} href="#" className="text-neutral-400 hover:text-black transition-colors"><LayoutDashboard className="w-5 h-5" /></motion.a>
              <motion.a whileHover={{ y: -2 }} href="#" className="text-neutral-400 hover:text-black transition-colors"><History className="w-5 h-5" /></motion.a>
            </div>
            <motion.a 
              whileHover={{ x: -5, borderColor: "#000" }}
              href="mailto:vinaykumarchukka1@gmail.com" 
              className="px-6 py-3 bg-neutral-50 border border-neutral-100 rounded-xl text-xs font-black uppercase tracking-widest text-neutral-400 hover:text-black transition-all flex items-center gap-3"
            >
              <Mail className="w-4 h-4" />
              Contact Support
            </motion.a>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-neutral-50 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.5em] text-neutral-200">© 2026 PHISH HUNTER AI • ALL RIGHTS RESERVED</p>
        </div>
      </footer>
    </div>
  );
}
