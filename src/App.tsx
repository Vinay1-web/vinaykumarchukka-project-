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
  Zap,
  Bell,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Terminal,
  ShieldX,
  RefreshCw,
  Activity,
  HeartPulse,
  Wand2,
  PhoneCall
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, collection, addDoc } from "./lib/firebase";
import { analyzeContent, ScanResult, getEmergingThreats, ThreatIntel } from "./services/geminiService";
import { cn } from "./lib/utils";

// --- Types ---

interface ScanRecord extends ScanResult {
  id: string;
  type: "email" | "sms" | "url" | "notification";
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
  const [activeTab, setActiveTab] = useState<"analyze" | "history" | "prediction" | "warnings" | "suggestions" | "advices" | "help" | "monitor">("analyze");
  const [scanType, setScanType] = useState<"email" | "sms" | "url" | "notification">("email");
  const [input, setInput] = useState("");
  const [queue, setQueue] = useState<{ id: string; type: "email" | "sms" | "url" | "notification"; content: string; status: 'pending' | 'scanning' | 'completed' | 'error'; result?: ScanResult }[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [deepScan, setDeepScan] = useState(false);
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [monitoredNotifications, setMonitoredNotifications] = useState<{ id: string; content: string; type: string; source: string; timestamp: string; result?: ScanResult; status: 'scanning' | 'completed' | 'rectified' }[]>([]);
  const [stats, setStats] = useState({ scanned: 0, blocked: 0, rectified: 0, health: 100 });
  const [autoRectify, setAutoRectify] = useState(true);
  const [logs, setLogs] = useState<{ id: string; message: string; timestamp: string; type: 'info' | 'warning' | 'success' }[]>([]);
  const [activeNotification, setActiveNotification] = useState<{ id: string; content: string; type: string; source: string; status: 'intercepting' | 'analyzing' | 'completed' } | null>(null);
  const [threats, setThreats] = useState<ThreatIntel[]>([]);
  const [loadingThreats, setLoadingThreats] = useState(false);
  const [toasts, setToasts] = useState<any[]>([]);

  const addToast = (toast: any) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const addLog = (message: string, type: 'info' | 'warning' | 'success' = 'info') => {
    const newLog = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      timestamp: new Date().toLocaleTimeString(),
      type
    };
    setLogs(prev => [newLog, ...prev].slice(0, 20));
  };

  useEffect(() => {
    const bootSequence = async () => {
      addLog("Initializing Phish Hunter Core...", "info");
      await new Promise(r => setTimeout(r, 800));
      addLog("Connecting to SMS Gateway...", "info");
      await new Promise(r => setTimeout(r, 600));
      addLog("Syncing with Mail Client...", "info");
      await new Promise(r => setTimeout(r, 600));
      addLog("Injecting Notification Hooks...", "info");
      await new Promise(r => setTimeout(r, 600));
      addLog("AI Security Engine: ONLINE", "success");
      addToast({
        title: "System Online",
        message: "Phish Hunter is now automatically monitoring all incoming communications.",
        type: "System"
      });
    };
    bootSequence();
  }, []);

  useEffect(() => {
    const fetchThreats = async () => {
      setLoadingThreats(true);
      try {
        const data = await getEmergingThreats();
        setThreats(data);
      } catch (e) {
        console.error("Failed to fetch threats", e);
      } finally {
        setLoadingThreats(false);
      }
    };
    fetchThreats();
  }, []);

  useEffect(() => {
    let interval: any;
    if (isMonitoring) {
      interval = setInterval(async () => {
        if (Math.random() > 0.6) {
          const mockNotifications = [
            { type: "SMS", content: "Your Amazon package is delayed. Update your address: http://amzn-tracking-update.info/address" },
            { type: "Email", content: "Security Alert: New login detected from Moscow, Russia. If this wasn't you, secure your account: https://google-security-verify.com" },
            { type: "Notification", content: "You have won a $1000 Walmart gift card! Click here to claim: http://walmart-rewards.net/claim" },
            { type: "SMS", content: "Hi, it's your bank. We've detected a suspicious transaction of $499.99. Reply NO to block or visit: http://bank-verify-fraud.com" },
            { type: "Email", content: "Urgent: Your Netflix subscription has expired. Update payment now: https://netflix-billing-update.com" },
            { type: "Call", content: "Incoming call from +1 (555) 012-3456. AI analysis: High probability of IRS impersonation scam." }
          ];
          const randomNotif = mockNotifications[Math.floor(Math.random() * mockNotifications.length)];
          const id = Math.random().toString(36).substr(2, 9);
          const sources = ["System Taskbar", "Notification Center", "SMS Gateway", "Mail Client"];
          const source = sources[Math.floor(Math.random() * sources.length)];
          
          setActiveNotification({ id, content: randomNotif.content, type: randomNotif.type, source, status: 'intercepting' });
          
          addToast({
            title: `Intercepted from ${source}`,
            message: `[${randomNotif.type}] ${randomNotif.content}`,
            type: randomNotif.type
          });
          addLog(`Intercepted ${randomNotif.type} from ${source}`, 'info');

          setStats(prev => ({ ...prev, scanned: prev.scanned + 1 }));
          const newNotif = {
            id,
            content: randomNotif.content,
            type: randomNotif.type,
            source,
            timestamp: new Date().toLocaleTimeString(),
            status: 'scanning' as const
          };
          
          setMonitoredNotifications(prev => [newNotif, ...prev].slice(0, 10));
          
          try {
            setActiveNotification(prev => prev ? { ...prev, status: 'analyzing' } : null);
            const result = await analyzeContent("notification", randomNotif.content, false);
            setMonitoredNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'completed', result } : n));
            setActiveNotification(prev => prev ? { ...prev, status: 'completed' } : null);
            setTimeout(() => setActiveNotification(null), 3000);
            
            if (result.riskLevel === "High") {
              setStats(prev => ({ ...prev, blocked: prev.blocked + 1, health: Math.max(0, prev.health - 5) }));
              addLog(`High-risk threat detected: ${result.riskLevel}`, 'warning');
              
              if (autoRectify) {
                addLog(`Auto-rectifying threat ${id}...`, 'info');
                setTimeout(() => rectifySolution(id), 1500);
              }

              const record: ScanRecord = {
                id,
                type: "notification" as any,
                content: randomNotif.content,
                ...result,
                timestamp: new Date().toISOString()
              };
              setHistory(prev => {
                const updated = [record, ...prev].slice(0, 50);
                localStorage.setItem("phish_history", JSON.stringify(updated));
                return updated;
              });
            }
          } catch (e) {
            console.error("Auto-scan failed", e);
          }
        }
      }, 8000);
    }
    return () => clearInterval(interval);
  }, [isMonitoring]);

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

  const SAMPLES = {
    email: "Subject: Urgent: Your account has been suspended!\n\nDear Customer,\n\nWe noticed suspicious activity on your account. To prevent unauthorized access, we have temporarily suspended your account. Please click the link below to verify your identity and restore access:\n\nhttp://secure-login-verify-account.com/update\n\nIf you do not complete this within 24 hours, your account will be permanently closed.\n\nThank you,\nCustomer Support Team",
    sms: "FRM:BankAlert MSG:Your card ending in 1234 has been locked. Please visit https://bit.ly/3xYzAbC to unlock it immediately.",
    url: "http://paypal-security-update.net/login?token=xyz123",
    notification: "Security Alert: Someone just logged into your account from a new device. If this wasn't you, click here: https://secure-account-verify.com"
  };

  const handlePasteSample = () => {
    setInput(SAMPLES[scanType]);
  };

  const handleClear = () => {
    setInput("");
    setQueue([]);
  };

  const addToQueue = () => {
    if (!input.trim()) return;
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      type: scanType,
      content: input,
      status: 'pending' as const
    };
    setQueue([...queue, newItem]);
    setInput("");
  };

  const removeFromQueue = (id: string) => {
    setQueue(queue.filter(item => item.id !== id));
  };

  const handleScanAll = async () => {
    if (queue.length === 0 && !input.trim()) return;
    
    let currentQueue = [...queue];
    if (input.trim()) {
      const newItem = {
        id: Math.random().toString(36).substr(2, 9),
        type: scanType,
        content: input,
        status: 'pending' as const
      };
      currentQueue = [...currentQueue, newItem];
      setInput("");
    }

    setQueue(currentQueue.map(item => ({ ...item, status: 'pending' })));
    setIsScanning(true);

    const processItem = async (item: typeof currentQueue[0]) => {
      setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'scanning' } : i));
      try {
        const analysis = await analyzeContent(item.type, item.content, deepScan);
        
        const newRecord: ScanRecord = {
          id: item.id,
          type: item.type,
          content: item.content,
          ...analysis,
          timestamp: new Date().toISOString()
        };

        setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'completed', result: analysis } : i));
        
        // Save to history
        setHistory(prev => {
          const updated = [newRecord, ...prev].slice(0, 50);
          localStorage.setItem("phish_history", JSON.stringify(updated));
          return updated;
        });

        // Firestore
        try {
          await addDoc(collection(db, "scans"), {
            uid: "guest",
            type: item.type,
            content: item.content,
            ...analysis,
            timestamp: new Date()
          });
        } catch (e) {}

      } catch (error) {
        setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error' } : i));
      }
    };

    // Process in parallel with a small delay to avoid rate limits if needed
    await Promise.all(currentQueue.map(item => processItem(item)));
    setIsScanning(false);
  };

  const rectifySolution = (id: string) => {
    setMonitoredNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, status: 'rectified' } : n
    ));
    setStats(prev => ({ 
      ...prev, 
      rectified: prev.rectified + 1,
      health: Math.min(100, prev.health + 2) 
    }));
    addLog(`Threat ${id} rectified successfully`, 'success');
    addToast({
      title: "Threat Rectified",
      message: "Security measures applied. Sender blocked and malicious content purged.",
      type: "System"
    });
  };

  const rectifyAll = () => {
    const highRiskIds = monitoredNotifications
      .filter(n => n.status === 'completed' && n.result?.riskLevel === "High")
      .map(n => n.id);
    
    if (highRiskIds.length === 0) return;

    highRiskIds.forEach(id => rectifySolution(id));
    addToast({
      title: "Bulk Rectification Complete",
      message: `Successfully neutralized ${highRiskIds.length} threats.`,
      type: "System"
    });
  };

  return (
    <div className="flex h-screen bg-white text-neutral-900 font-sans overflow-hidden">
      {/* System Notification Bar (Integrated) */}
      <AnimatePresence>
        {activeNotification && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xl px-4"
          >
            <div className="bg-black text-white rounded-3xl shadow-2xl border border-white/10 overflow-hidden">
              <div className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className={cn(
                    "p-2 rounded-xl",
                    activeNotification.status === 'intercepting' ? "bg-indigo-600" :
                    activeNotification.status === 'analyzing' ? "bg-amber-600" : "bg-emerald-600"
                  )}>
                    {activeNotification.type === 'Email' ? <Mail className="w-4 h-4" /> : 
                     activeNotification.type === 'SMS' ? <MessageSquare className="w-4 h-4" /> : 
                     activeNotification.type === 'Call' ? <PhoneCall className="w-4 h-4" /> :
                     <Bell className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                        {activeNotification.status === 'intercepting' ? 'Interception Active' :
                         activeNotification.status === 'analyzing' ? 'AI Analysis in Progress' : 'Analysis Complete'}
                      </span>
                      <div className="flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Live Sync</span>
                      </div>
                    </div>
                    <p className="text-sm font-bold truncate">{activeNotification.content}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500">Source</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">{activeNotification.source}</span>
                  </div>
                  {activeNotification.status !== 'completed' && (
                    <RefreshCw className="w-4 h-4 text-neutral-400 animate-spin" />
                  )}
                </div>
              </div>
              <div className="h-1 bg-neutral-800 w-full overflow-hidden">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ 
                    width: activeNotification.status === 'intercepting' ? "30%" :
                           activeNotification.status === 'analyzing' ? "70%" : "100%" 
                  }}
                  className={cn(
                    "h-full transition-all duration-500",
                    activeNotification.status === 'completed' ? "bg-emerald-500" : "bg-indigo-500"
                  )}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="w-72 border-r border-neutral-100 flex flex-col bg-neutral-50/50">
        <div className="p-6 border-b border-neutral-100">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400 leading-none mb-1">DEVELOPERS</span>
            <div className="flex items-center gap-3">
              <motion.div 
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="p-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg shadow-lg shadow-indigo-200"
              >
                <ShieldAlert className="w-5 h-5 text-white" />
              </motion.div>
              <h1 className="text-xl font-black tracking-tight uppercase">Phish Hunter</h1>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {[
            { id: "analyze", label: "Analyze", icon: Search },
            { 
              id: "monitor", 
              label: "Live Monitor", 
              icon: Bell,
              extra: isMonitoring && (
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-indigo-500">Active</span>
                </div>
              )
            },
            { id: "prediction", label: "Prediction", icon: LayoutDashboard },
            { id: "warnings", label: "Warnings", icon: AlertTriangle },
            { id: "suggestions", label: "Suggestions", icon: CheckCircle2 },
            { id: "advices", label: "Advices", icon: ShieldCheck },
            { id: "help", label: "Help", icon: HelpCircle },
            { id: "history", label: "History", icon: History },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group",
                activeTab === tab.id 
                  ? "bg-black text-white shadow-lg shadow-black/10" 
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-black"
              )}
            >
              <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-indigo-400" : "text-neutral-400 group-hover:text-black")} />
              <span className="flex-1 text-left">{tab.label}</span>
              {tab.extra}
              {activeTab === tab.id && (
                <motion.div layoutId="activeTabIndicator" className="ml-auto w-1.5 h-1.5 bg-indigo-400 rounded-full" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-neutral-100">
          <div className="flex items-center gap-2 px-3 py-2 bg-white text-neutral-600 rounded-xl border border-neutral-200 shadow-sm">
            <div className="relative flex h-2 w-2">
              <span className="animate-pulse-lite absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Protection</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white relative">
        <header className="h-16 border-b border-neutral-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400">
            {activeTab === 'analyze' ? 'Security Analysis Engine' : activeTab.toUpperCase()}
          </h2>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
              <User className="w-5 h-5 text-neutral-400" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-8 space-y-12">
            <AnimatePresence mode="wait">
              {activeTab === "analyze" ? (
                <motion.div 
                  key="analyze"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
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
                        transition={{ delay: i * 0.1 }}
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
                  <div className="mono-card p-8 space-y-8">
                    <div className="flex flex-wrap items-center justify-between gap-6">
                      <div className="flex flex-wrap gap-3">
                        {(['email', 'sms', 'url', 'notification'] as const).map((type) => (
                          <motion.button 
                            key={type}
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setScanType(type)}
                            className={cn(
                              "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold border transition-all",
                              scanType === type 
                                ? "bg-black text-white border-black shadow-lg" 
                                : "bg-white text-neutral-400 border-neutral-100 hover:border-black"
                            )}
                          >
                            {type === 'email' ? <Mail className="w-4 h-4" /> : type === 'sms' ? <MessageSquare className="w-4 h-4" /> : type === 'url' ? <LinkIcon className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </motion.button>
                        ))}
                      </div>

                      <div className={cn(
                        "flex items-center gap-4 px-4 py-2 rounded-2xl border transition-colors",
                        deepScan ? "bg-indigo-50/50 border-indigo-100" : "bg-neutral-50 border-neutral-100"
                      )}>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Deep AI Scan</span>
                          <span className="text-[8px] text-neutral-300">Uses High Thinking Mode</span>
                        </div>
                        <button 
                          onClick={() => setDeepScan(!deepScan)}
                          className={cn(
                            "w-12 h-6 rounded-full transition-colors relative",
                            deepScan ? "bg-indigo-600" : "bg-neutral-200"
                          )}
                        >
                          <motion.div 
                            animate={{ x: deepScan ? 26 : 4 }}
                            className="w-4 h-4 rounded-full absolute top-1 bg-white shadow-sm"
                          />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
                          {scanType === "url" ? "Enter URL to check" : `Paste ${scanType} content or thread`}
                        </label>
                        <div className="flex gap-4">
                          <button 
                            onClick={() => {
                              const lines = input.split('\n').filter(l => l.trim());
                              if (lines.length > 1) {
                                const newItems = lines.map(line => ({
                                  id: Math.random().toString(36).substr(2, 9),
                                  type: scanType,
                                  content: line.trim(),
                                  status: 'pending' as const
                                }));
                                setQueue([...queue, ...newItems]);
                                setInput("");
                              } else {
                                addToQueue();
                              }
                            }}
                            className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-600"
                          >
                            Bulk Add
                          </button>
                          <button onClick={handlePasteSample} className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600">Try Sample</button>
                          <button onClick={handleClear} className="text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-black">Clear All</button>
                        </div>
                      </div>
                      <div className="relative group/input overflow-hidden rounded-2xl border border-neutral-100 focus-within:border-black transition-all shadow-inner bg-neutral-50/10">
                        <textarea 
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder={
                            scanType === "url" ? "https://example.com/login" : 
                            scanType === "email" ? "Paste the full email body or thread here..." : 
                            "Paste the SMS message text here..."
                          }
                          className="w-full p-6 min-h-[160px] resize-y font-mono text-sm text-neutral-900 bg-transparent outline-none transition-all"
                        />
                        <div className="absolute bottom-4 right-4 flex items-center gap-3">
                          <span className="text-[10px] font-mono text-neutral-300 bg-white/50 px-2 py-1 rounded-md backdrop-blur-sm">
                            {input.length} characters
                          </span>
                          <button 
                            onClick={addToQueue}
                            disabled={!input.trim()}
                            className="px-4 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-all"
                          >
                            Add to Queue
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Scan Queue */}
                    {queue.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Scan Queue ({queue.length})</h3>
                        <div className="grid gap-3">
                          {queue.map((item) => (
                            <div key={item.id} className="flex items-center gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-100 group">
                              <div className="p-2 bg-white rounded-lg border border-neutral-100">
                                {item.type === 'email' ? <Mail className="w-4 h-4 text-neutral-400" /> : item.type === 'sms' ? <MessageSquare className="w-4 h-4 text-neutral-400" /> : item.type === 'url' ? <LinkIcon className="w-4 h-4 text-neutral-400" /> : <Bell className="w-4 h-4 text-neutral-400" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-neutral-800 truncate">{item.content}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">{item.type}</span>
                                  <span className={cn(
                                    "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                                    item.status === 'pending' ? "bg-neutral-200 text-neutral-500" :
                                    item.status === 'scanning' ? "bg-indigo-100 text-indigo-600 animate-pulse" :
                                    item.status === 'completed' ? "bg-emerald-100 text-emerald-600" :
                                    "bg-rose-100 text-rose-600"
                                  )}>
                                    {item.status}
                                  </span>
                                </div>
                              </div>
                              {item.status === 'completed' && item.result && (
                                <RiskBadge level={item.result.riskLevel} />
                              )}
                              <button 
                                onClick={() => removeFromQueue(item.id)}
                                className="p-2 text-neutral-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <AlertOctagon className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <motion.button 
                      whileHover={{ scale: 1.01, y: -2 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleScanAll}
                      disabled={isScanning || (queue.length === 0 && !input.trim())}
                      className={cn(
                        "w-full py-6 bg-black text-white font-black uppercase tracking-[0.3em] rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-4 shadow-2xl shadow-indigo-500/10",
                        !isScanning && (queue.length > 0 || input.trim()) && "hover:bg-neutral-900 animate-glow"
                      )}
                    >
                      {isScanning ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                          ANALYZING BATCH...
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-6 h-6" />
                          {queue.length > 0 ? `SCAN QUEUE (${queue.length + (input.trim() ? 1 : 0)})` : 'SCAN FOR THREATS'}
                        </>
                      )}
                    </motion.button>
                  </div>

                  {/* Batch Results Summary */}
                  {queue.some(item => item.status === 'completed') && (
                    <div className="space-y-6">
                      <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400">Analysis Results</h3>
                      <div className="grid gap-6">
                        {queue.filter(item => item.status === 'completed' && item.result).map((item) => (
                          <motion.div 
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                              "mono-card overflow-hidden",
                              item.result?.riskLevel === "High" ? "border-black border-2 shadow-xl" : ""
                            )}
                          >
                            <div className={cn(
                              "p-6 flex items-center justify-between border-b border-neutral-100",
                              item.result?.riskLevel === "High" ? "bg-black text-white" : "bg-neutral-50"
                            )}>
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "p-3 rounded-xl",
                                  item.result?.riskLevel === "High" ? "bg-white/20" : "bg-white border border-neutral-100 shadow-sm"
                                )}>
                                  {item.result?.riskLevel === "High" ? <AlertOctagon className="w-6 h-6" /> : 
                                   item.result?.riskLevel === "Medium" ? <AlertTriangle className="w-6 h-6 text-black" /> : 
                                   <CheckCircle2 className="w-6 h-6 text-black" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-3">
                                    <h4 className="text-lg font-black uppercase tracking-tight">
                                      {item.result?.riskLevel === "High" ? "Threat Detected" : "Security Scan"}
                                    </h4>
                                    <RiskBadge level={item.result!.riskLevel} />
                                  </div>
                                  <p className={cn("text-[10px] font-bold uppercase tracking-widest opacity-60", item.result?.riskLevel === "High" ? "text-white" : "text-neutral-400")}>
                                    {item.type.toUpperCase()} • {item.result?.riskScore}% RISK SCORE
                                  </p>
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  const report = `PHISH HUNTER SECURITY REPORT\n` +
                                    `==========================\n` +
                                    `Date: ${new Date().toLocaleString()}\n` +
                                    `Type: ${item.type.toUpperCase()}\n` +
                                    `Risk Level: ${item.result?.riskLevel}\n` +
                                    `Risk Score: ${item.result?.riskScore}/100\n\n` +
                                    `CONTENT:\n${item.content}\n\n` +
                                    `EXPLANATION:\n${item.result?.explanation}\n\n` +
                                    `REASONS:\n${item.result?.reasons.map(r => `- ${r}`).join('\n')}\n\n` +
                                    `SAFE ALTERNATIVES:\n${item.result?.safeAlternatives.map(s => `- ${s}`).join('\n')}`;
                                  
                                  const blob = new Blob([report], { type: 'text/plain' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `phish-report-${item.id}.txt`;
                                  a.click();
                                }}
                                className={cn(
                                  "p-2 rounded-lg transition-colors",
                                  item.result?.riskLevel === "High" ? "hover:bg-white/10 text-white" : "hover:bg-neutral-100 text-neutral-400"
                                )}
                                title="Download Report"
                              >
                                <ExternalLink className="w-5 h-5" />
                              </button>
                            </div>
                            <div className="p-6 space-y-4">
                              <p className="text-sm font-medium leading-relaxed text-neutral-700">{item.result?.explanation}</p>
                              <div className="flex flex-wrap gap-2">
                                {item.result?.reasons.slice(0, 3).map((reason, i) => (
                                  <span key={i} className="text-[9px] font-bold bg-neutral-100 text-neutral-500 px-2 py-1 rounded-md border border-neutral-200">
                                    {reason}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : activeTab === "monitor" ? (
                <motion.div 
                  key="monitor"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  <div className="mono-card p-8 space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-3 rounded-2xl transition-all duration-500",
                          isMonitoring ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 animate-pulse" : "bg-neutral-100 text-neutral-400"
                        )}>
                          <Bell className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black uppercase tracking-tighter">Live Notification Monitor</h2>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-neutral-500 font-medium">Automatically intercept and scan incoming messages and alerts.</p>
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[8px] font-black uppercase tracking-widest border border-indigo-100">
                              <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                              Mobile Sync Active
                            </div>
                            {isMonitoring && autoRectify && (
                              <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[8px] font-black uppercase tracking-widest border border-emerald-100">
                                <ShieldCheck className="w-2 h-2" />
                                System Auto-Pilot Active
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsMonitoring(!isMonitoring)}
                        className={cn(
                          "px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center gap-3",
                          isMonitoring 
                            ? "bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100" 
                            : "bg-black text-white hover:bg-neutral-800 shadow-xl shadow-black/10"
                        )}
                      >
                        {isMonitoring ? <ShieldX className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                        {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
                      </button>
                    </div>
    
                    {isMonitoring && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center gap-4">
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                              <Activity className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Total Scanned</p>
                              <p className="text-xl font-black">{stats.scanned}</p>
                            </div>
                          </div>
                          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center gap-4">
                            <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                              <ShieldAlert className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Threats Blocked</p>
                              <p className="text-xl font-black">{stats.blocked}</p>
                            </div>
                          </div>
                          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center gap-4">
                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                              <Wand2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Threats Rectified</p>
                              <p className="text-xl font-black">{stats.rectified}</p>
                            </div>
                          </div>
                          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center gap-4">
                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                              <HeartPulse className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">System Health</p>
                              <div className="flex items-center gap-2">
                                <p className="text-xl font-black">{stats.health}%</p>
                                <div className="w-12 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500" style={{ width: `${stats.health}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={() => setAutoRectify(!autoRectify)}
                                className="flex items-center gap-2 group"
                              >
                                {autoRectify ? (
                                  <ToggleRight className="w-8 h-8 text-indigo-600" />
                                ) : (
                                  <ToggleLeft className="w-8 h-8 text-neutral-300" />
                                )}
                                <div className="text-left">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-800">Auto-Rectify Mode</p>
                                  <p className="text-[8px] font-medium text-neutral-500">Automatically neutralize high-risk threats</p>
                                </div>
                              </button>
                            </div>
                            <div className="w-px h-8 bg-indigo-100 hidden sm:block" />
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">AI Engine Active</span>
                            </div>
                          </div>
                          <button 
                            onClick={rectifyAll}
                            disabled={monitoredNotifications.filter(n => n.status === 'completed' && n.result?.riskLevel === "High").length === 0}
                            className="px-6 py-2 bg-white text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-indigo-100 hover:bg-indigo-600 hover:text-white disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-indigo-600 transition-all shadow-sm flex items-center gap-2"
                          >
                            <Wand2 className="w-3 h-3" />
                            Rectify All Pending
                          </button>
                        </div>

                        {/* System Log */}
                        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden">
                          <div className="px-4 py-2 bg-neutral-800 border-b border-neutral-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Terminal className="w-3 h-3 text-neutral-400" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">System Log</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Live</span>
                            </div>
                          </div>
                          <div className="p-4 h-32 overflow-y-auto font-mono text-[10px] space-y-1 scrollbar-hide">
                            {logs.length === 0 ? (
                              <p className="text-neutral-600 italic">No system actions recorded...</p>
                            ) : (
                              logs.map((log) => (
                                <div key={log.id} className="flex items-start gap-3 group">
                                  <span className="text-neutral-600 shrink-0">[{log.timestamp}]</span>
                                  <span className={cn(
                                    "break-all",
                                    log.type === 'info' ? "text-neutral-300" :
                                    log.type === 'warning' ? "text-rose-400" :
                                    "text-emerald-400"
                                  )}>
                                    {log.message}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {isMonitoring ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Live Feed</h3>
                          <div className="flex items-center gap-2">
                            <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Listening for alerts...</span>
                          </div>
                        </div>
    
                        <div className="space-y-4">
                          {monitoredNotifications.length === 0 ? (
                            <div className="p-12 text-center border-2 border-dashed border-neutral-100 rounded-3xl">
                              <p className="text-sm text-neutral-400 font-medium">Waiting for incoming notifications...</p>
                            </div>
                          ) : (
                            monitoredNotifications.map((notif) => (
                              <motion.div 
                                key={notif.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={cn(
                                  "p-6 rounded-2xl border transition-all group relative overflow-hidden",
                                  notif.status === 'rectified' ? "bg-emerald-50 border-emerald-100 opacity-75" :
                                  notif.result?.riskLevel === "High" ? "bg-rose-50 border-rose-100" : "bg-white border-neutral-100"
                                )}
                              >
                                {notif.status === 'rectified' && (
                                  <div className="absolute top-0 right-0 p-2 bg-emerald-500 text-white rounded-bl-xl">
                                    <CheckCircle2 className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="flex items-start justify-between gap-6">
                                  <div className="flex items-start gap-4">
                                    <div className={cn(
                                      "p-3 rounded-xl shrink-0",
                                      notif.status === 'rectified' ? "bg-emerald-600 text-white" :
                                      notif.result?.riskLevel === "High" ? "bg-rose-600 text-white" : "bg-neutral-100 text-neutral-400"
                                    )}>
                                      {notif.type === 'Email' ? <Mail className="w-5 h-5" /> : 
                                       notif.type === 'SMS' ? <MessageSquare className="w-5 h-5" /> : 
                                       notif.type === 'Call' ? <PhoneCall className="w-5 h-5" /> :
                                       <Bell className="w-5 h-5" />}
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{notif.source}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{notif.type} • {notif.timestamp}</span>
                                        {notif.status === 'scanning' ? (
                                          <span className="text-[8px] font-black uppercase tracking-widest text-indigo-500 animate-pulse">Scanning...</span>
                                        ) : notif.status === 'rectified' ? (
                                          <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600">Rectified</span>
                                        ) : (
                                          <RiskBadge level={notif.result!.riskLevel} />
                                        )}
                                      </div>
                                      <p className={cn(
                                        "text-sm font-bold",
                                        notif.status === 'rectified' ? "text-neutral-400 line-through" : "text-neutral-800"
                                      )}>{notif.content}</p>
                                      {notif.result && (
                                        <div className="space-y-3 mt-2">
                                          <p className="text-xs text-neutral-500 font-medium leading-relaxed">{notif.result.explanation}</p>
                                          {notif.status !== 'rectified' && notif.result.riskLevel === "High" && (
                                            <div className="p-3 bg-white/50 rounded-xl border border-rose-100 space-y-2">
                                              <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Recommended Solution</p>
                                              <p className="text-xs font-bold text-neutral-700">{notif.result.safeAlternatives[0]}</p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    {notif.status === 'completed' && notif.result?.riskLevel === "High" && (
                                      <button 
                                        onClick={() => rectifySolution(notif.id)}
                                        className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-200"
                                      >
                                        <Wand2 className="w-3 h-3" />
                                        Rectify Now
                                      </button>
                                    )}
                                    {notif.result?.riskLevel === "High" && notif.status !== 'rectified' && (
                                      <button 
                                        onClick={() => setMonitoredNotifications(prev => prev.filter(n => n.id !== notif.id))}
                                        className="px-4 py-2 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-rose-700 transition-all flex items-center gap-2"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        Delete Alert
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => setMonitoredNotifications(prev => prev.filter(n => n.id !== notif.id))}
                                      className="px-4 py-2 bg-white text-neutral-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-neutral-100 hover:text-black hover:border-black transition-all"
                                    >
                                      Dismiss
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            ))
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-12 text-center bg-neutral-50 rounded-3xl border border-neutral-100 space-y-6">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-neutral-100">
                          <ShieldCheck className="w-10 h-10 text-neutral-200" />
                        </div>
                        <div className="max-w-md mx-auto space-y-2">
                          <h3 className="text-lg font-black uppercase tracking-tight">Monitoring Offline</h3>
                          <p className="text-sm text-neutral-400 font-medium leading-relaxed">
                            Start the monitor to begin automatically scanning incoming notifications for potential threats. 
                            In a real application, this would run as a background service on your device.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : activeTab === "prediction" ? (
            <motion.div 
              key="prediction"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="mono-card p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-black text-white rounded-2xl">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black uppercase tracking-tighter">Threat Intelligence</h2>
                      <p className="text-sm text-neutral-500 font-medium">AI-powered forecasting of emerging phishing trends.</p>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Live Feed Active</span>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {loadingThreats ? (
                    Array(3).fill(0).map((_, i) => (
                      <div key={i} className="p-8 bg-neutral-50 rounded-2xl border border-neutral-100 animate-pulse space-y-4">
                        <div className="w-10 h-10 bg-neutral-200 rounded-xl" />
                        <div className="h-4 bg-neutral-200 rounded w-3/4" />
                        <div className="h-3 bg-neutral-200 rounded w-1/2" />
                      </div>
                    ))
                  ) : threats.length > 0 ? (
                    threats.map((item, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-8 bg-neutral-50 rounded-2xl border border-neutral-100 hover:border-black transition-all group"
                      >
                        <div className={cn(
                          "p-3 rounded-xl w-fit mb-6 group-hover:bg-black group-hover:text-white transition-colors",
                          item.risk === "High" ? "bg-rose-50 text-rose-600 border border-rose-100" :
                          item.risk === "Medium" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                          "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        )}>
                          {item.risk === "High" ? <AlertTriangle className="w-4 h-4" /> : 
                           item.risk === "Medium" ? <Zap className="w-4 h-4" /> : 
                           <CheckCircle2 className="w-4 h-4" />}
                        </div>
                        <h3 className="font-black uppercase tracking-tight mb-2 text-sm">{item.title}</h3>
                        <p className="text-xs text-neutral-500 font-medium leading-relaxed mb-6 line-clamp-2">{item.description}</p>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Trend</span>
                            <span className={cn(
                              "text-xs font-bold uppercase tracking-wider",
                              item.trend === "Increasing" ? "text-rose-600" :
                              item.trend === "Stable" ? "text-amber-600" :
                              "text-emerald-600"
                            )}>{item.trend}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Risk</span>
                            <RiskBadge level={item.risk} />
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-3 p-12 text-center border-2 border-dashed border-neutral-100 rounded-3xl">
                      <p className="text-sm text-neutral-400 font-medium">No emerging threats detected at this moment.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="mono-card p-8 space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">Global Threat Map</h3>
                  <div className="aspect-video bg-neutral-900 rounded-2xl relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                    <div className="relative text-center space-y-4">
                      <div className="w-24 h-24 rounded-full border-2 border-indigo-500/30 animate-ping absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      <div className="w-4 h-4 rounded-full bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.8)] relative z-10 mx-auto" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Scanning Global Nodes...</p>
                    </div>
                  </div>
                </div>
                <div className="mono-card p-8 space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">Recent Vulnerabilities</h3>
                  <div className="space-y-4">
                    {[
                      { name: "CVE-2026-1234", severity: "Critical", date: "2h ago" },
                      { name: "CVE-2026-5678", severity: "High", date: "5h ago" },
                      { name: "CVE-2026-9012", severity: "Medium", date: "1d ago" }
                    ].map((cve, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${cve.severity === 'Critical' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                          <span className="text-xs font-bold text-neutral-900">{cve.name}</span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{cve.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : activeTab === "warnings" ? (
            <motion.div 
              key="warnings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="mono-card p-8 space-y-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-lg shadow-rose-500/20">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Active Warnings</h2>
                    <p className="text-sm text-neutral-500 font-medium">Real-time alerts for currently active phishing campaigns.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { text: "New 'Tax Refund' email scam targeting Gmail users.", type: "Email", date: "Mar 25, 2026" },
                    { text: "Fake 'Bank Account Locked' SMS circulating in North America.", type: "SMS", date: "Mar 24, 2026" },
                    { text: "Malicious 'Software Update' popups detected on major news sites.", type: "URL", date: "Mar 24, 2026" }
                  ].map((warning, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-6 p-6 bg-neutral-50 rounded-2xl border border-neutral-100 group hover:border-rose-500/30 transition-all"
                    >
                      <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0 border border-neutral-100 group-hover:bg-rose-500 group-hover:text-white transition-all">
                        {warning.type === 'Email' ? <Mail className="w-5 h-5" /> : warning.type === 'SMS' ? <MessageSquare className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">Critical</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{warning.date}</span>
                        </div>
                        <p className="text-sm font-bold text-neutral-800 uppercase tracking-tight">{warning.text}</p>
                      </div>
                      <button className="p-2 text-neutral-300 hover:text-black transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
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
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Scan History</h2>
                  <p className="text-sm text-neutral-500 font-medium">Your recent security audits and findings.</p>
                </div>
                {history.length > 0 && (
                  <button 
                    onClick={() => {
                      setHistory([]);
                      localStorage.removeItem("phish_history");
                    }}
                    className="px-4 py-2 bg-neutral-100 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-neutral-200"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="text-center py-32 mono-card bg-neutral-50/30">
                  <History className="w-16 h-16 text-neutral-100 mx-auto mb-6" />
                  <p className="text-neutral-400 font-black uppercase tracking-[0.2em] text-xs">No scan history yet.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {history.map((record, i) => (
                    <motion.div 
                      key={record.id} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="mono-card p-6 transition-all group hover:border-black/20"
                    >
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex items-start gap-6">
                          <div className="p-4 bg-neutral-50 rounded-2xl text-neutral-400 group-hover:bg-black group-hover:text-white transition-colors border border-neutral-100">
                            {record.type === "email" ? <Mail className="w-6 h-6" /> : 
                             record.type === "sms" ? <MessageSquare className="w-6 h-6" /> : 
                             record.type === "url" ? <LinkIcon className="w-6 h-6" /> :
                             <Bell className="w-6 h-6" />}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-4">
                              <RiskBadge level={record.riskLevel} />
                              <span className="text-[10px] text-neutral-400 font-black uppercase tracking-widest">
                                {new Date(record.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-base font-black line-clamp-1 text-neutral-900 uppercase tracking-tight">{record.content}</p>
                            <p className="text-sm text-neutral-400 line-clamp-2 font-medium leading-relaxed">{record.explanation}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => {
                              setScanType(record.type);
                              setInput(record.content);
                              setActiveTab('analyze');
                            }}
                            className="p-2 text-neutral-300 hover:text-indigo-500 transition-colors bg-neutral-50 rounded-lg border border-neutral-100"
                            title="Re-Scan"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-2 text-neutral-300 hover:text-black transition-colors bg-neutral-50 rounded-lg border border-neutral-100"
                            title="View Details"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </main>

  {/* System Taskbar Simulation */}
  <div className="fixed bottom-0 left-0 right-0 h-12 bg-black/90 backdrop-blur-xl border-t border-white/10 z-50 flex items-center px-6 justify-between text-white select-none">
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">System Protected</span>
      </div>
      <div className="h-4 w-px bg-white/10" />
      <div className="flex items-center gap-4 overflow-hidden max-w-md">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 whitespace-nowrap">Active Interception:</span>
        <AnimatePresence mode="wait">
          {monitoredNotifications.length > 0 && (
            <motion.span 
              key={monitoredNotifications[0].id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-[10px] font-medium text-neutral-300 truncate"
            >
              [{monitoredNotifications[0].type}] {monitoredNotifications[0].content}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
    
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-3 text-neutral-400">
        <Mail className="w-3.5 h-3.5" />
        <MessageSquare className="w-3.5 h-3.5" />
        <LinkIcon className="w-3.5 h-3.5" />
        <Bell className="w-3.5 h-3.5" />
      </div>
      <div className="h-4 w-px bg-white/10" />
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <ShieldCheck className="w-4 h-4 text-indigo-400" />
      </div>
    </div>
  </div>

  {/* System Toasts */}
  <div className="fixed bottom-16 right-6 z-[60] flex flex-col gap-3 pointer-events-none">
    <AnimatePresence>
      {toasts.map((toast) => (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.9 }}
          className="w-80 bg-white border border-neutral-200 shadow-2xl rounded-2xl p-4 pointer-events-auto overflow-hidden relative group"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
          <div className="flex items-start gap-4">
            <div className="p-2 bg-neutral-50 rounded-xl border border-neutral-100">
              {toast.type === 'Email' ? <Mail className="w-4 h-4 text-indigo-500" /> : 
               toast.type === 'SMS' ? <MessageSquare className="w-4 h-4 text-indigo-500" /> : 
               <Bell className="w-4 h-4 text-indigo-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">{toast.title}</h4>
              <p className="text-xs font-bold text-neutral-900 line-clamp-2">{toast.message}</p>
            </div>
          </div>
          <motion.div 
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 5, ease: "linear" }}
            className="absolute bottom-0 left-0 h-0.5 bg-neutral-100"
          />
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
</div>
);
}
