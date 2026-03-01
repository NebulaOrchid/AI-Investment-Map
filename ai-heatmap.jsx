import { useState, useMemo, useCallback, useRef, useEffect } from "react";

// ── DATA GENERATION ──
const CATEGORIES = ["Risk & Compliance","Operations","Revenue Growth","Customer Experience","Data & Analytics","Infrastructure","Wealth Management","Trading & Markets"];
const DIVISIONS = ["Risk","Ops","Credit","CX","Marketing","Finance","Legal","WM","Trading","Tech","HR","Compliance"];
const STATUSES = { dev: "In Development", pilot: "Pilot", live: "Production", completed: "Realized" };
const NAMES = [
  "Fraud Detection","AML Scanner","KYC Automation","Credit Scoring","Loan Origination","Claims Processing",
  "Client Onboarding","Document Extraction","Email Triage","Meeting Summarizer","Contract Analysis",
  "Regulatory Reporting","Trade Surveillance","Market Risk Model","Liquidity Forecaster","Portfolio Optimizer",
  "Chatbot Service","Voice Analytics","Sentiment Engine","Churn Predictor","Next Best Action",
  "Personalization Engine","Dynamic Pricing","Cross-sell Model","Robo Advisor","Wealth Planner",
  "Expense Classifier","Invoice Processor","Reconciliation Bot","Data Quality Monitor",
  "Code Assistant","Test Automation","Infra Optimizer","Capacity Planner","Security Scanner",
  "Talent Matcher","Resume Screener","Learning Recommender","Compliance Checker","Audit Assistant",
  "M365 Copilot","GitHub Copilot","Salesforce Einstein","ServiceNow AI","SAP Joule",
  "GenAI Platform","ML Ops Pipeline","Feature Store","Model Registry","Data Mesh",
  "Customer 360","Real-time Scoring","Streaming Analytics","Graph Analytics","NLP Platform",
  "Image Processing","Video Analytics","Geospatial AI","Climate Risk Model","ESG Scorer",
  "Digital Twin","Process Mining","RPA Orchestrator","Workflow AI","Decision Engine"
];

function genData() {
  const inits = [];
  const qtrs = [];
  for (let y = 2026; y <= 2030; y++) for (let q = 1; q <= 4; q++) qtrs.push({ year: y, quarter: q, label: `Q${q} ${y}`, idx: qtrs.length });
  const curve = qtrs.map((_, i) => Math.floor(50 + (i / (qtrs.length - 1)) * 175 + Math.random() * 10));
  let id = 0;
  for (let qi = 0; qi < qtrs.length; qi++) {
    while (inits.filter(p => p.startQtr <= qi).length < curve[qi]) {
      const budget = Math.round((200000 + Math.random() * 14800000) / 100000) * 100000;
      const dur = Math.floor(2 + Math.random() * 12);
      const start = Math.max(0, qi - Math.floor(Math.random() * 3));
      const end = Math.min(qtrs.length - 1, start + dur);
      const perp = Math.random() < 0.25;
      const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const div = DIVISIONS[Math.floor(Math.random() * DIVISIONS.length)];
      const nm = NAMES[Math.floor(Math.random() * NAMES.length)] + (Math.random() < 0.4 ? ` v${Math.floor(Math.random() * 4) + 1}` : Math.random() < 0.3 ? ` ${div}` : "");
      const overB = Math.random() > 0.7;
      const overPct = overB ? 0.05 + Math.random() * 0.45 : 0;
      const realStart = Math.min(end, start + Math.floor(dur * 0.6));
      const fullReal = Math.min(qtrs.length - 1, end + Math.floor(2 + Math.random() * 6));
      const qd = [];
      let cum = 0, cumR = 0;
      const qSpend = budget / dur;
      for (let q = 0; q < qtrs.length; q++) {
        if (q < start) { qd.push({ cum: 0, cumR: 0, phase: "future", over: false, rpct: 0 }); continue; }
        if (q <= end) {
          cum += qSpend * (1 + (overB ? overPct * Math.random() : 0));
          const ph = q < start + Math.floor(dur * 0.3) ? "dev" : q < start + Math.floor(dur * 0.5) ? "pilot" : "live";
          if (q >= realStart) { const p = Math.min(1, (q - realStart) / Math.max(1, fullReal - realStart)); cumR = budget * p * (overB ? 0.6 : 1); }
          qd.push({ cum, cumR, phase: ph, over: cum > budget * 1.05, rpct: budget > 0 ? cumR / budget : 0 });
        } else if (perp) {
          cum += qSpend * 0.3;
          const p = Math.min(1, (q - realStart) / Math.max(1, fullReal - realStart));
          cumR = budget * p * (overB ? 0.6 : 1);
          qd.push({ cum, cumR, phase: "live", over: cum > budget * 1.3, rpct: budget > 0 ? cumR / budget : 0 });
        } else {
          const p = Math.min(1, (q - realStart) / Math.max(1, fullReal - realStart));
          cumR = budget * p;
          qd.push({ cum, cumR, phase: cumR >= budget * 0.95 ? "completed" : "live", over: cum > budget * 1.05, rpct: Math.min(cumR / budget, 1) });
        }
      }
      inits.push({ id: id++, ticker: `${cat.substring(0, 3).toUpperCase()}-${String(id).padStart(3, "0")}`, name: nm, category: cat, division: div, budget, perp, startQtr: start, endQtr: perp ? qtrs.length - 1 : end, fullReal, qd, owner: ["J. Chen","M. Patel","S. Williams","R. Kumar","A. Johnson","T. Nakamura","L. Santos","K. O'Brien","D. Schmidt","P. Okafor"][Math.floor(Math.random() * 10)], risk: overB ? (overPct > 0.25 ? "high" : "medium") : "low", hrs: Math.floor(Math.random() * 3000) });
    }
  }
  return { inits, qtrs };
}
const { inits: ALL, qtrs: QS } = genData();

// ── TREEMAP LAYOUT ──
function treemap(items, W, H) {
  if (!items.length) return [];
  const tot = items.reduce((s, i) => s + i.val, 0);
  if (tot === 0) return [];
  const sorted = [...items].sort((a, b) => b.val - a.val).map(i => ({ ...i, val: Math.max(i.val, tot * 0.001) }));
  const out = [];
  function sq(data, x, y, w, h) {
    if (!data.length) return;
    if (data.length === 1) { out.push({ ...data[0], x, y, w, h }); return; }
    const t = data.reduce((s, d) => s + d.val, 0);
    const vert = w >= h;
    const side = vert ? h : w;
    let row = [data[0]], rs = data[0].val, best = Infinity;
    for (let i = 1; i < data.length; i++) {
      const ts = rs + data[i].val, tr = [...row, data[i]], rl = (ts / t) * (vert ? w : h);
      let wr = 0;
      for (const it of tr) { const il = (it.val / ts) * side; wr = Math.max(wr, Math.max(rl / il, il / rl)); }
      if (i === 1 || wr <= best) { best = wr; row = tr; rs = ts; } else break;
    }
    const rl = (rs / t) * (vert ? w : h);
    let off = 0;
    for (const it of row) {
      const il = (it.val / rs) * side;
      out.push(vert ? { ...it, x, y: y + off, w: rl, h: il } : { ...it, x: x + off, y, w: il, h: rl });
      off += il;
    }
    const rem = data.slice(row.length);
    if (vert) sq(rem, x + rl, y, w - rl, h); else sq(rem, x, y + rl, w, h - rl);
  }
  sq(sorted, 0, 0, W, H);
  return out;
}

const fmt = n => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n}`;

// ── CSS: Black Glass Design System ──
const STYLES = `
  /* Slow ambient gradient drift — navy to plum, 60s cycle */
  @property --bg-angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
  }
  @keyframes bg-drift {
    0% { --bg-angle: 0deg; }
    50% { --bg-angle: 180deg; }
    100% { --bg-angle: 360deg; }
  }
  .bg-drift {
    animation: bg-drift 60s ease-in-out infinite;
    background: linear-gradient(var(--bg-angle), #0a0e1a 0%, #12101f 25%, #0d1117 50%, #140e1c 75%, #0a0e1a 100%);
  }

  /* Accent line — thin gold gradient at the very top */
  .accent-line {
    height: 2px;
    background: linear-gradient(90deg, transparent 0%, #c8a650 20%, #dfc06a 50%, #c8a650 80%, transparent 100%);
    opacity: 0.6;
  }

  /* Glass panels */
  .glass-panel {
    background: rgba(14, 17, 28, 0.75);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.06);
  }
  .glass-panel-solid {
    background: rgba(14, 17, 28, 0.92);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  /* Slider: refined minimal track + gold-accent thumb */
  .slider-glass::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #c8a650;
    box-shadow: 0 0 10px rgba(200, 166, 80, 0.35), 0 2px 6px rgba(0, 0, 0, 0.4);
    cursor: pointer;
    margin-top: -6px;
    transition: box-shadow 0.2s ease;
  }
  .slider-glass::-webkit-slider-thumb:hover {
    box-shadow: 0 0 16px rgba(200, 166, 80, 0.55), 0 2px 8px rgba(0, 0, 0, 0.5);
  }
  .slider-glass::-webkit-slider-runnable-track {
    height: 4px;
    background: linear-gradient(90deg, rgba(200, 166, 80, 0.15), rgba(200, 166, 80, 0.4));
    border-radius: 2px;
  }
  .slider-glass {
    -webkit-appearance: none;
    background: transparent;
  }

  /* Box hover: clean white outline lift */
  .box-tile {
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .box-tile:hover {
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.18), 0 4px 16px rgba(0, 0, 0, 0.4);
    z-index: 5;
  }

  /* Box selected: refined white glow + lift */
  .box-selected {
    box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.3), 0 8px 24px rgba(0, 0, 0, 0.5) !important;
    z-index: 10 !important;
  }

  /* Detail drawer slide-up */
  @keyframes drawer-up {
    from { transform: translateY(100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .drawer-enter {
    animation: drawer-up 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }

  /* Dim overlay when drawer is open */
  .map-dimmed {
    opacity: 0.55;
    transition: opacity 0.3s ease;
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }

  /* Number tabular figures */
  .tabular-nums { font-variant-numeric: tabular-nums; }
`;

// ── Color constants ──
const GOLD = "#c8a650";
const GOLD_DIM = "rgba(200, 166, 80, 0.5)";
const TEXT_PRIMARY = "#e2e8f0";
const TEXT_SECONDARY = "#94a3b8";
const TEXT_MUTED = "#475569";
const BORDER_SUBTLE = "rgba(255, 255, 255, 0.06)";

export default function AIHeatMap() {
  const [qIdx, setQIdx] = useState(0);
  const [selId, setSelId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [showChat, setShowChat] = useState(true);
  const [chatIn, setChatIn] = useState("");
  const [msgs, setMsgs] = useState([{ role: "agent", text: "Portfolio intelligence active. Drag the timeline to watch your AI portfolio evolve. Scroll to zoom. Click any cell for details." }]);
  const [showBadges, setShowBadges] = useState(true);
  const mapRef = useRef(null);
  const q = QS[qIdx];

  // Scroll-to-zoom
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const handler = (e) => { e.preventDefault(); setZoom(z => Math.max(0.2, Math.min(4, z + (e.deltaY < 0 ? 0.1 : -0.1)))); };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const { active, graduated, stats } = useMemo(() => {
    const a = [], g = [];
    let tb = 0, tr = 0, ob = 0, ar = 0;
    for (const init of ALL) {
      if (qIdx < init.startQtr) continue;
      const d = init.qd[qIdx];
      if (!d || d.cum === 0) continue;
      const item = { ...init, cd: d, val: d.cum };
      tb += d.cum; tr += d.cumR;
      if (d.over) ob++;
      if (d.phase === "dev" && qIdx > init.startQtr + 4) ar++;
      if (d.phase === "completed") g.push(item); else a.push(item);
    }
    return { active: a, graduated: g, stats: { tb, tr, ac: a.length, gc: g.length, ob, ar, rr: tb > 0 ? tr / tb : 0 } };
  }, [qIdx]);

  // Dynamic map size
  const baseW = 800, baseH = 500;
  const growthFactor = useMemo(() => {
    const q1Budget = ALL.reduce((s, i) => { const d = i.qd[0]; return s + (d ? d.cum : 0); }, 0);
    return q1Budget > 0 ? Math.max(1, Math.sqrt(stats.tb / q1Budget)) : 1;
  }, [stats.tb]);
  const mapW = baseW * growthFactor;
  const mapH = baseH * growthFactor;

  const rects = useMemo(() => treemap(active, mapW, mapH), [active, mapW, mapH]);
  const selInit = selId !== null ? ALL.find(i => i.id === selId) : null;
  const selData = selInit ? selInit.qd[qIdx] : null;

  const boxColor = useCallback((d) => {
    if (!d) return { bg: "rgba(15,20,35,0.6)", bd: BORDER_SUBTLE, glow: "none", topEdge: "rgba(255,255,255,0.03)" };
    if (d.phase === "completed") return {
      bg: "rgba(25, 40, 30, 0.7)",
      bd: "rgba(200, 166, 80, 0.35)",
      glow: "0 2px 8px rgba(0,0,0,0.3)",
      topEdge: "rgba(200, 166, 80, 0.15)"
    };
    if (d.over) {
      const intensity = Math.min(0.7, 0.25 + d.rpct * 0.15);
      return {
        bg: `rgba(120, 25, 25, ${intensity})`,
        bd: "rgba(220, 70, 70, 0.35)",
        glow: "0 2px 8px rgba(0,0,0,0.3)",
        topEdge: "rgba(220, 70, 70, 0.12)"
      };
    }
    if (d.phase === "live" && d.rpct > 0) {
      const g = Math.floor(80 + d.rpct * 100);
      return {
        bg: `rgba(15, ${Math.floor(35 + d.rpct * 40)}, ${Math.floor(25 + d.rpct * 30)}, 0.65)`,
        bd: `rgba(40, ${Math.min(200, g + 40)}, 80, 0.3)`,
        glow: "0 2px 8px rgba(0,0,0,0.3)",
        topEdge: `rgba(40, ${Math.min(220, g + 60)}, 80, 0.1)`
      };
    }
    if (d.phase === "pilot") return {
      bg: "rgba(50, 40, 15, 0.45)",
      bd: "rgba(180, 150, 50, 0.2)",
      glow: "0 2px 8px rgba(0,0,0,0.3)",
      topEdge: "rgba(180, 150, 50, 0.08)"
    };
    if (d.phase === "dev") return {
      bg: "rgba(15, 25, 50, 0.5)",
      bd: "rgba(60, 120, 200, 0.2)",
      glow: "0 2px 8px rgba(0,0,0,0.3)",
      topEdge: "rgba(60, 120, 200, 0.08)"
    };
    return { bg: "rgba(15,20,35,0.6)", bd: BORDER_SUBTLE, glow: "none", topEdge: "rgba(255,255,255,0.03)" };
  }, []);

  const chat = () => {
    if (!chatIn.trim()) return;
    const ql = chatIn.toLowerCase();
    let r = "";
    if (ql.includes("summary")) r = `${q.label}: ${stats.ac} active initiatives, ${stats.gc} graduated. Total deployed: ${fmt(stats.tb)}. Realized value: ${fmt(stats.tr)} (${(stats.rr * 100).toFixed(0)}% ROI). ${stats.ob} flagged over budget.`;
    else if (ql.includes("over") || ql.includes("red") || ql.includes("risk")) { const o = active.filter(i => i.cd.over).slice(0, 5); r = `${stats.ob} initiatives over budget. Top concerns: ${o.map(i => `${i.ticker} (${fmt(i.cd.cum)} vs ${fmt(i.budget)} plan)`).join(", ")}`; }
    else if (ql.includes("top") || ql.includes("best")) { const t = [...active].filter(i => i.cd.rpct > 0).sort((a, b) => b.cd.rpct - a.cd.rpct).slice(0, 5); r = `Top performers: ${t.map(i => `${i.ticker} at ${(i.cd.rpct * 100).toFixed(0)}% realized`).join(", ")}`; }
    else if (ql.includes("growth")) { r = `Portfolio grew from ~50 initiatives in Q1 2026 to ${stats.ac} active + ${stats.gc} graduated at ${q.label}. Total investment: ${fmt(stats.tb)}. Map scale: ${(growthFactor).toFixed(1)}x from origin.`; }
    else r = `${q.label}: ${stats.ac} active, ${fmt(stats.tb)} deployed. Try "summary", "over budget", "top performers", or "growth".`;
    setMsgs(p => [...p, { role: "user", text: chatIn }, { role: "agent", text: r }]);
    setChatIn("");
  };

  const legend = [
    { l: "DEV", c: "rgba(60,120,200,0.5)", bc: "rgba(60,120,200,0.8)" },
    { l: "PILOT", c: "rgba(180,150,50,0.5)", bc: "rgba(180,150,50,0.8)" },
    { l: "LIVE", c: "rgba(40,160,80,0.5)", bc: "rgba(40,160,80,0.8)" },
    { l: "OVER", c: "rgba(200,60,60,0.5)", bc: "rgba(200,60,60,0.8)" },
    { l: "DONE", c: "rgba(200,166,80,0.5)", bc: GOLD },
  ];

  return (
    <div className="h-screen bg-drift text-white flex flex-col overflow-hidden relative" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <style>{STYLES}</style>

      {/* ── TOP ACCENT LINE ── */}
      <div className="accent-line flex-shrink-0" />

      {/* ── HUD TOP BAR ── */}
      <div className="flex items-center justify-between px-5 py-2 flex-shrink-0 relative z-10 glass-panel-solid" style={{ borderTop: "none", borderLeft: "none", borderRight: "none" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold" style={{ background: "rgba(200, 166, 80, 0.12)", color: GOLD, border: `1px solid rgba(200, 166, 80, 0.2)` }}>AI</div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide" style={{ color: TEXT_PRIMARY }}>AI Investment Map</h1>
            <p className="text-xs" style={{ color: TEXT_MUTED, fontSize: 10 }}>Enterprise Portfolio Intelligence &middot; 2026–2030</p>
          </div>
        </div>

        <div className="flex items-center gap-5 tabular-nums">
          {[
            ["Active", stats.ac, TEXT_PRIMARY],
            ["Graduated", stats.gc, GOLD],
            ["Deployed", fmt(stats.tb), "#60a5fa"],
            ["Realized", fmt(stats.tr), "#4ade80"],
            ["ROI", `${(stats.rr * 100).toFixed(0)}%`, stats.rr > 0.5 ? "#4ade80" : stats.rr > 0.25 ? "#fbbf24" : "#f87171"],
            ["Over Budget", stats.ob, stats.ob > 10 ? "#f87171" : "#fbbf24"],
          ].map(([l, v, c]) => (
            <div key={l} className="flex flex-col items-center">
              <span style={{ fontSize: 9, color: TEXT_MUTED, letterSpacing: "0.05em" }} className="uppercase">{l}</span>
              <span className="font-semibold text-sm" style={{ color: c }}>{v}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {legend.map(l => (
            <div key={l.l} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm" style={{ background: l.c, border: `1px solid ${l.bc}` }} />
              <span style={{ fontSize: 9, color: TEXT_MUTED }}>{l.l}</span>
            </div>
          ))}
          <div className="ml-3 pl-3 flex items-center gap-1.5" style={{ borderLeft: `1px solid ${BORDER_SUBTLE}` }}>
            <span style={{ fontSize: 9, color: TEXT_MUTED }}>ZOOM</span>
            <span className="font-semibold tabular-nums" style={{ fontSize: 11, color: TEXT_SECONDARY, width: 32, textAlign: "center" }}>{(zoom * 100).toFixed(0)}%</span>
          </div>
          <button onClick={() => setShowBadges(!showBadges)}
            className="px-2 py-1 rounded-md text-xs transition-all"
            style={{
              fontSize: 9,
              background: showBadges ? "rgba(200, 166, 80, 0.1)" : "transparent",
              color: showBadges ? GOLD : TEXT_MUTED,
              border: `1px solid ${showBadges ? "rgba(200, 166, 80, 0.25)" : BORDER_SUBTLE}`,
            }}>BADGES</button>
          <button onClick={() => setShowChat(!showChat)}
            className="px-2 py-1 rounded-md text-xs transition-all"
            style={{
              fontSize: 9,
              background: showChat ? "rgba(200, 166, 80, 0.1)" : "transparent",
              color: showChat ? GOLD : TEXT_MUTED,
              border: `1px solid ${showChat ? "rgba(200, 166, 80, 0.25)" : BORDER_SUBTLE}`,
            }}>INSIGHTS</button>
        </div>
      </div>

      {/* ── TIMELINE SLIDER ── */}
      <div className="px-5 py-2.5 flex-shrink-0 glass-panel-solid" style={{ borderTop: "none", borderLeft: "none", borderRight: "none" }}>
        <div className="flex items-center gap-5">
          <div className="w-24">
            <div className="text-lg font-semibold tabular-nums" style={{ color: TEXT_PRIMARY }}>{q.label}</div>
          </div>
          <div className="flex-1 relative">
            <input type="range" min={0} max={QS.length - 1} value={qIdx} onChange={e => setQIdx(Number(e.target.value))} className="w-full slider-glass" />
            <div className="flex justify-between mt-1 px-1">
              {QS.filter((_, i) => i % 4 === 0).map(qq => (
                <span key={qq.label} style={{ fontSize: 9, color: TEXT_MUTED }}>{qq.year}</span>
              ))}
            </div>
          </div>
          <div className="text-right w-36">
            <div style={{ fontSize: 9, color: TEXT_MUTED }} className="uppercase tracking-wide">Total Investment</div>
            <div className="text-xl font-semibold tabular-nums" style={{ color: TEXT_PRIMARY }}>{fmt(stats.tb)}</div>
          </div>
          <div className="text-right w-28">
            <div style={{ fontSize: 9, color: TEXT_MUTED }} className="uppercase tracking-wide">Map Scale</div>
            <div className="text-sm font-semibold tabular-nums" style={{ color: TEXT_SECONDARY }}>{growthFactor.toFixed(1)}x</div>
            <div className="w-20 h-1 rounded-full overflow-hidden mt-1" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min((growthFactor / 4) * 100, 100)}%`, background: `linear-gradient(90deg, rgba(200,166,80,0.3), rgba(200,166,80,0.6))` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map viewport */}
        <div className={`flex-1 overflow-auto relative ${selInit ? "map-dimmed" : ""}`} ref={mapRef} style={{ transition: "opacity 0.3s ease" }}>
          <div className="relative" style={{ width: mapW * zoom + 16, height: mapH * zoom + (showBadges && graduated.length > 0 ? 50 : 16), padding: 8, transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1), height 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}>
            {rects.map(r => {
              const col = boxColor(r.cd);
              const isSel = selId === r.id;
              const w = r.w * zoom, h = r.h * zoom;
              const sl = w > 45 && h > 25, sd = w > 75 && h > 45, sp = w > 55 && h > 35;
              const rp = r.cd ? r.cd.rpct : 0;
              return (
                <div key={r.id} onClick={() => setSelId(isSel ? null : r.id)}
                  className={`absolute cursor-pointer box-tile ${isSel ? "box-selected" : ""}`}
                  style={{
                    left: r.x * zoom, top: r.y * zoom,
                    width: Math.max(w - 1.5, 1), height: Math.max(h - 1.5, 1),
                    background: col.bg,
                    border: `1px solid ${col.bd}`,
                    borderTop: `1px solid ${col.topEdge}`,
                    borderLeftWidth: r.cd?.over ? 3 : 1,
                    borderLeftColor: r.cd?.over ? "rgba(200, 60, 60, 0.6)" : col.bd,
                    boxShadow: isSel ? undefined : col.glow,
                    borderRadius: 4,
                  }}>
                  {/* Realization progress bar */}
                  {rp > 0 && h > 8 && (
                    <div className="absolute bottom-0 left-0 right-0" style={{ height: 2, background: "rgba(0,0,0,0.3)", borderRadius: "0 0 3px 3px" }}>
                      <div style={{ height: "100%", width: `${rp * 100}%`, background: `rgba(60, ${Math.floor(160 + rp * 60)}, 100, 0.7)`, borderRadius: "0 0 3px 0" }} />
                    </div>
                  )}
                  {sl && (
                    <div className="p-1.5 overflow-hidden h-full flex flex-col">
                      <div className="leading-none truncate" style={{ fontSize: Math.max(8, Math.min(11, w / 10)), color: "rgba(255,255,255,0.35)", fontFamily: "'Inter', monospace", fontWeight: 500 }}>{r.ticker}</div>
                      {sd && <div className="font-medium truncate mt-0.5" style={{ fontSize: Math.max(8, Math.min(10, w / 12)), color: "rgba(255,255,255,0.7)" }}>{r.name}</div>}
                      {sp && (
                        <div className="mt-auto flex items-end justify-between">
                          <span className="font-semibold tabular-nums" style={{ fontSize: Math.max(8, Math.min(11, w / 10)), color: "rgba(255,255,255,0.55)" }}>{fmt(r.cd?.cum || 0)}</span>
                          {rp > 0 && <span className="tabular-nums font-medium" style={{ fontSize: 9, color: `rgba(60, ${Math.floor(180 + rp * 75)}, 100, 0.85)` }}>{(rp * 100).toFixed(0)}%</span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Graduated badges */}
            {showBadges && graduated.length > 0 && (
              <div className="absolute flex flex-wrap gap-1" style={{ top: mapH * zoom + 10, left: 0 }}>
                {graduated.slice(0, 50).map(g => (
                  <div key={g.id} onClick={() => setSelId(g.id)}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-all"
                    style={{
                      fontSize: 8,
                      border: "1px solid rgba(200, 166, 80, 0.15)",
                      background: "rgba(200, 166, 80, 0.04)",
                      color: "rgba(200, 166, 80, 0.5)",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(200, 166, 80, 0.1)"; e.currentTarget.style.borderColor = "rgba(200, 166, 80, 0.3)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(200, 166, 80, 0.04)"; e.currentTarget.style.borderColor = "rgba(200, 166, 80, 0.15)"; }}
                  >
                    <div className="w-1 h-1 rounded-full" style={{ background: GOLD_DIM }} />
                    <span>{g.ticker}</span>
                  </div>
                ))}
                {graduated.length > 50 && <span style={{ fontSize: 8, color: TEXT_MUTED }} className="self-center">+{graduated.length - 50}</span>}
              </div>
            )}
          </div>
        </div>

        {/* ── INSIGHTS PANEL ── */}
        {showChat && (
          <div className="w-64 flex flex-col flex-shrink-0 glass-panel-solid" style={{ borderTop: "none", borderBottom: "none", borderRight: "none" }}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${BORDER_SUBTLE}` }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD, opacity: 0.7 }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: TEXT_SECONDARY, fontSize: 10 }}>Portfolio Intelligence</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[92%] rounded-lg px-3 py-2 text-xs leading-relaxed"
                    style={{
                      background: m.role === "user" ? "rgba(200, 166, 80, 0.08)" : "rgba(255, 255, 255, 0.03)",
                      border: `1px solid ${m.role === "user" ? "rgba(200, 166, 80, 0.15)" : BORDER_SUBTLE}`,
                      color: m.role === "user" ? "rgba(200, 166, 80, 0.8)" : TEXT_SECONDARY,
                    }}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3" style={{ borderTop: `1px solid ${BORDER_SUBTLE}` }}>
              <div className="flex gap-1.5">
                <input
                  className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${BORDER_SUBTLE}`,
                    color: TEXT_PRIMARY,
                  }}
                  onFocus={e => e.target.style.borderColor = "rgba(200, 166, 80, 0.25)"}
                  onBlur={e => e.target.style.borderColor = BORDER_SUBTLE}
                  placeholder="Ask about the portfolio..."
                  value={chatIn}
                  onChange={e => setChatIn(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && chat()}
                />
                <button onClick={chat}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                  style={{ background: "rgba(200, 166, 80, 0.1)", color: GOLD, border: `1px solid rgba(200, 166, 80, 0.2)` }}>
                  Go
                </button>
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {["Summary", "Over budget", "Top performers", "Growth"].map(qq => (
                  <button key={qq} onClick={() => setChatIn(qq)}
                    className="rounded-md px-2 py-0.5 transition-all"
                    style={{ fontSize: 9, color: TEXT_MUTED, border: `1px solid ${BORDER_SUBTLE}` }}
                    onMouseEnter={e => { e.currentTarget.style.color = TEXT_SECONDARY; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = TEXT_MUTED; e.currentTarget.style.borderColor = BORDER_SUBTLE; }}
                  >{qq}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM DETAIL DRAWER ── */}
      {selInit && selData && (
        <div className="flex-shrink-0 drawer-enter relative" style={{ height: 190 }}>
          {/* Frosted glass background */}
          <div className="absolute inset-0 glass-panel" style={{ borderLeft: "none", borderRight: "none", borderBottom: "none" }} />
          <div className="flex h-full relative z-10">
            {/* Identity */}
            <div className="w-56 p-4" style={{ borderRight: `1px solid ${BORDER_SUBTLE}` }}>
              <div className="flex items-center justify-between">
                <span className="font-medium tabular-nums" style={{ fontSize: 11, color: TEXT_MUTED, fontFamily: "'Inter', monospace" }}>{selInit.ticker}</span>
                <button onClick={() => setSelId(null)} className="transition-colors" style={{ fontSize: 9, color: TEXT_MUTED }}
                  onMouseEnter={e => e.currentTarget.style.color = TEXT_SECONDARY}
                  onMouseLeave={e => e.currentTarget.style.color = TEXT_MUTED}
                >CLOSE</button>
              </div>
              <h3 className="text-sm font-semibold mt-1.5 truncate" style={{ color: TEXT_PRIMARY }}>{selInit.name}</h3>
              <div className="mt-1" style={{ fontSize: 10, color: TEXT_MUTED }}>{selInit.division} &middot; {selInit.category}</div>
              <div style={{ fontSize: 10, color: TEXT_MUTED }}>Owner: {selInit.owner}</div>
              <div className="mt-2.5 flex gap-1.5 flex-wrap">
                {[
                  { show: true, label: STATUSES[selData.phase] || selData.phase, color: selData.phase === "live" ? "#4ade80" : selData.phase === "dev" ? "#60a5fa" : selData.phase === "pilot" ? "#fbbf24" : GOLD },
                  { show: selData.over, label: "Over Budget", color: "#f87171" },
                  { show: selInit.perp, label: "Perpetual", color: "#a78bfa" },
                ].filter(b => b.show).map(b => (
                  <span key={b.label} className="px-2 py-0.5 rounded-md" style={{ fontSize: 9, color: b.color, border: `1px solid ${b.color}33`, background: `${b.color}0a` }}>{b.label}</span>
                ))}
              </div>
            </div>

            {/* Financials */}
            <div className="w-48 p-4" style={{ borderRight: `1px solid ${BORDER_SUBTLE}` }}>
              <div className="uppercase tracking-wide mb-2" style={{ fontSize: 9, color: TEXT_MUTED }}>Financials</div>
              {[
                ["Budget", fmt(selInit.budget), TEXT_SECONDARY],
                ["Actual", fmt(selData.cum), selData.over ? "#f87171" : TEXT_PRIMARY],
                ["Variance", `${selData.cum > selInit.budget ? "+" : ""}${((selData.cum - selInit.budget) / selInit.budget * 100).toFixed(0)}%`, selData.cum > selInit.budget ? "#f87171" : "#4ade80"],
                ["Realized", fmt(selData.cumR), "#4ade80"],
                ["Realization", `${(selData.rpct * 100).toFixed(0)}%`, TEXT_PRIMARY],
              ].map(([k, v, c]) => (
                <div key={k} className="flex justify-between py-0.5">
                  <span style={{ fontSize: 10, color: TEXT_MUTED }}>{k}</span>
                  <span className="font-semibold tabular-nums" style={{ fontSize: 10, color: c }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Budget Curve */}
            <div className="w-72 p-4" style={{ borderRight: `1px solid ${BORDER_SUBTLE}` }}>
              <div className="uppercase tracking-wide mb-2" style={{ fontSize: 9, color: TEXT_MUTED }}>Budget Curve &middot; Q1 2026 – Q4 2030</div>
              <div className="h-24 flex items-end gap-px">
                {selInit.qd.map((d, i) => {
                  if (d.cum === 0 && d.cumR === 0) return null;
                  const mx = Math.max(...selInit.qd.map(x => x.cum));
                  const bh = mx > 0 ? (d.cum / mx) * 100 : 0;
                  const rh = mx > 0 ? (d.cumR / mx) * 100 : 0;
                  const cur = i === qIdx;
                  return (
                    <div key={i} className="flex-1 flex flex-col justify-end items-center relative" style={{ minWidth: 2 }}>
                      <div className="w-full rounded-t-sm" style={{
                        height: `${bh}%`,
                        background: cur ? "rgba(200, 166, 80, 0.7)" : d.over ? "rgba(200, 60, 60, 0.45)" : "rgba(60, 120, 200, 0.3)",
                        boxShadow: cur ? "0 0 6px rgba(200, 166, 80, 0.3)" : "none",
                      }} />
                      {rh > 0 && <div className="w-full absolute bottom-0 rounded-t-sm" style={{ height: `${rh}%`, background: "rgba(60, 180, 100, 0.25)" }} />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status */}
            <div className="flex-1 p-4">
              <div className="uppercase tracking-wide mb-2" style={{ fontSize: 9, color: TEXT_MUTED }}>Status</div>
              {[
                ["Risk", selInit.risk, selInit.risk === "high" ? "#f87171" : selInit.risk === "medium" ? "#fbbf24" : "#4ade80"],
                ["Started", QS[selInit.startQtr]?.label, TEXT_SECONDARY],
                ["Target", selInit.perp ? "Perpetual" : QS[selInit.endQtr]?.label, TEXT_SECONDARY],
                ["Full ROI", QS[selInit.fullReal]?.label, TEXT_SECONDARY],
                ["Hrs/mo", selInit.hrs.toLocaleString(), TEXT_SECONDARY],
              ].map(([k, v, c]) => (
                <div key={k} className="flex justify-between py-0.5">
                  <span style={{ fontSize: 10, color: TEXT_MUTED }}>{k}</span>
                  <span className="font-semibold tabular-nums" style={{ fontSize: 10, color: c }}>{v}</span>
                </div>
              ))}
              <div className="mt-3">
                <div className="flex justify-between mb-1">
                  <span style={{ fontSize: 9, color: TEXT_MUTED }}>REALIZATION</span>
                  <span className="font-semibold tabular-nums" style={{ fontSize: 10, color: TEXT_PRIMARY }}>{(selData.rpct * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{
                    width: `${selData.rpct * 100}%`,
                    background: `linear-gradient(90deg, rgba(60,160,100,0.5), rgba(60,200,120,${0.4 + selData.rpct * 0.4}))`,
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
