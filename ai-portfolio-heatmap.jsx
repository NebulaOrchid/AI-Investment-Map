import { useState, useMemo, useRef, useEffect, useCallback } from "react";

/* ═══════════════════════════════════════════
   MONTHS  (Dec 2024 → Dec 2027 — 37 entries)
   Growth narrative: 20 use cases → ~100 by Feb 2026 → projections through 2027
   ═══════════════════════════════════════════ */
const QS = [];
for (let y = 2024; y <= 2027; y++) {
  const mStart = y === 2024 ? 12 : 1;
  for (let m = mStart; m <= 12; m++) QS.push({ y, m, key: `${y}-${String(m).padStart(2,"0")}` });
}
// QS[0]="2024-12", QS[14]="2026-02" (now), QS[36]="2027-12"
const qi = (y, m) => QS.findIndex((x) => x.y === y && x.m === m);
const SLIDER_MIN = 1; // Start at Jan 2025 (skip Dec 2024)
const NOW_IDX = qi(2026, 2); // Feb 2026 = "today"
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtMonthKey(key) { if (!key) return ""; const [y,m] = key.split("-"); return `${MONTH_NAMES[parseInt(m)-1]} ${y}`; }

/* ═══════════════════════════════════════════
   SEEDED RNG  (deterministic for reproducibility)
   ═══════════════════════════════════════════ */
let _seed = 20251031;
function rng() { _seed = (_seed * 16807 + 0) % 2147483647; return _seed / 2147483647; }
function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
function rBetween(a, b) { return a + rng() * (b - a); }
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ═══════════════════════════════════════════
   TIMELINE BUILDER  (monthly snapshots)
   mkTL(startYear, startMonth, endYear, endMonth, options)
   options: { budget, sS, bY, bM, maxB, bS, dev, cY, cM, oBpM }
   ═══════════════════════════════════════════ */
function mkTL(sy, sm, ey, em, o) {
  const si = Math.max(qi(sy, sm), 0), ei = Math.min(qi(ey, em), QS.length - 1);
  const bi = Math.min(qi(o.bY, o.bM), QS.length - 1);
  const ci = o.cY ? qi(o.cY, o.cM) : null;
  const tM = Math.max(ei - si + 1, 1), adj = o.budget * (1 + o.dev);
  let cS = 0, cB = 0; const snaps = [];
  return QS.map((qr, i) => {
    let mSp = 0, mBn = 0;
    if (i >= si && i <= (ci ?? ei)) {
      const p = (i - si) / Math.max(tM - 1, 1);
      mSp = adj * (o.sS === "front" ? (1 - p * .55) / tM : 1 / tM); cS += mSp;
    }
    // Post-completion maintenance trickle
    if (ci !== null && i > ci) { mSp = o.budget * .005; cS += mSp; }
    // Perpetual maintenance (no completion date, past end)
    if (ci === null && i > ei) { mSp = o.budget * .00667; cS += mSp; }
    if (i >= bi) {
      const bp = Math.min((i - bi) / Math.max(QS.length - bi - 5, 8), 1);
      const bf = o.bS === "slow" ? Math.pow(bp, 2.3) : o.bS === "ramp" ? Math.pow(bp, 1.5) : bp;
      const nB = o.maxB * bf;
      if (nB >= o.maxB * .95 && o.oBpM) { mBn = o.oBpM * (.8 + Math.sin(i * 1.7) * .2); cB += mBn; }
      else { mBn = Math.max(nB - cB, 0); cB = Math.max(cB, nB); }
    }
    snaps.push({ mSp, mBn });
    // Trailing 12-month lookback for ROI
    const l12 = snaps.slice(Math.max(0, snaps.length - 12));
    const t12S = l12.reduce((s, x) => s + x.mSp, 0), t12B = l12.reduce((s, x) => s + x.mBn, 0);
    const commitMet = cB >= o.maxB * .95;
    const surplus = commitMet ? Math.max(cB - o.maxB, 0) : 0;
    const bPct = o.maxB > 0 ? Math.min(cB / o.maxB, 1) : 0;
    const t12R = t12S > 0 ? t12B / t12S : 0;
    let phase = "future";
    if (i >= si && i < bi) phase = "building";
    else if (i >= bi && !commitMet) phase = "value_capture";
    else if (commitMet && t12R >= .8) phase = "commitment_met";
    else if (commitMet && t12R < .8) phase = "declining";
    if (i < si) phase = "future";
    return { key: qr.key, spend: Math.round(cS), benefit: Math.round(cB), budget: o.budget,
      actualBudget: Math.round(adj), dev: o.dev, committedB: o.maxB, phase, projected: si > NOW_IDX,
      t12ROI: Math.round(t12R * 100) / 100, t12Spend: Math.round(t12S), t12Benefit: Math.round(t12B),
      lifetimeROI: cS > 0 ? Math.round((cB / cS) * 100) / 100 : 0, benefitPct: bPct,
      surplus: Math.round(surplus), goLiveQ: QS[bi]?.key || "", endQ: QS[ei]?.key || "" };
  });
}

/* ═══════════════════════════════════════════
   ORG STRUCTURE  — 6 BUs, 51 Divisions
   ═══════════════════════════════════════════ */
const BU_LIST = ["WM", "ISG", "IM", "OPS", "Tech", "Co"];
const BU_NAMES = { WM:"Wealth Management", ISG:"Institutional Securities", IM:"Investment Management", OPS:"Operations", Tech:"Technology", Co:"Company" };
const BU_COLORS = { WM:"#0891B2", ISG:"#6366F1", IM:"#7C3AED", OPS:"#D97706", Tech:"#475569", Co:"#059669" };

const BU_DIVS = {
  Co: ["Administration","Company Management","Finance","Human Capital Management","Internal Audit","Legal and Compliance","Risk Management"],
  IM: ["Active Fundamental Equity","Global Sales and Marketing","IM Fixed Income","IM Management","IM Risk Management","Liquidity","Office of COO","Parametric","Private Credit & Equity","Product & Corp Development","Real Assets","Solutions & Multi-Asset"],
  ISG: ["Fixed Income Division","GCM - Joint Venture","IBD","Institutional Equity Division","ISG Management","ISG Operations","Research","Senior Relationship Management","US Residential"],
  OPS: ["Firmwide Ops","IM Aligned Operations","ISG Aligned Operations","WM Aligned Operations"],
  WM: ["1L Financial Crimes Risk","Investment Solutions","U.S. Banks","Wealth Management Field","WM & IM Administration","WM Administration","WM Client Segments","WM Global Investment Office","WM Platforms","WM Risk"],
  Tech: ["Cyber Data Risk & Resilience","ENTERPRISE TECH & SERVICES","Fin-Risk-Prog & Prod Eng Tech","IM Technology","Innovation","Institutional Securities Tech","ISG SETI","Tech COO","WM Technology"],
};

/* ═══════════════════════════════════════════
   CATEGORIES  (banking-specific)
   ═══════════════════════════════════════════ */
const CATS = ["Client Experience","Risk & Compliance","Trading & Markets","Operations & Automation","Wealth Advisory","Enterprise AI Platform","Data & Analytics"];

/* ═══════════════════════════════════════════
   INITIATIVE NAME POOLS
   ═══════════════════════════════════════════ */
const NAME_POOLS = {
  "Client Experience": [
    "Client Onboarding AI","Digital Client Portal","Client Sentiment Analytics","Personalized Insights Engine",
    "Client Communication AI","Omnichannel Experience Platform","Client Journey Optimizer","Voice of Client Analytics",
    "Client Retention Predictor","Smart Notifications Engine","Client Health Scoring","Relationship Intelligence AI",
    "Client Self-Service AI","Next Best Conversation AI","Client Feedback Analyzer","Smart CRM Assistant",
    "Client Risk Profiler","Digital Engagement Tracker","Client Lifecycle AI","Interaction Summarizer"],
  "Risk & Compliance": [
    "AML Transaction Monitoring","Sanctions Screening AI","Regulatory Change Tracker","Model Risk Validator",
    "Credit Risk Scoring ML","Market Risk Analyzer","Operational Risk Monitor","Compliance Surveillance AI",
    "Trade Surveillance ML","Insider Trading Detector","Conduct Risk Analytics","Risk Appetite Dashboard AI",
    "Stress Testing Automation","Counterparty Risk AI","Basel IV Compliance Engine","CCAR Automation Suite",
    "Reg Reporting Automation","Privacy Compliance AI","Third-Party Risk Monitor","Liquidity Risk Predictor"],
  "Trading & Markets": [
    "Equity Execution Optimizer","FX Trading Signals AI","Rates Strategy AI","Credit Spread Predictor",
    "Commodities Price Forecaster","Options Pricing ML","Algo Trading Optimizer","Market Making AI",
    "Trade Matching Engine","Pre-Trade Analytics AI","Post-Trade Allocator","Dark Pool Analytics",
    "Volatility Surface Modeler","Order Flow Analyzer","Structured Notes Pricer","Cross-Asset Correlator",
    "Liquidity Forecast AI","Smart Order Router AI","Trade Anomaly Detector","Swap Valuation AI"],
  "Operations & Automation": [
    "Trade Settlement Automation","Invoice Processing AI","Reconciliation Automation","Exception Management AI",
    "Corporate Actions Processor","Margin Call Automation","Collateral Optimization AI","Reference Data Cleaner",
    "Break Resolution AI","Cash Management Optimizer","Account Opening Automation","Data Quality Monitor",
    "Workflow Orchestration AI","STP Rate Optimizer","Nostro Reconciliation AI","Confirmation Matching AI",
    "Payment Routing Optimizer","Fee Billing Automation","Custody Processing AI","Statement Generation AI"],
  "Wealth Advisory": [
    "Portfolio Rebalancer AI","Tax-Loss Harvesting AI","Estate Planning Advisor","Financial Plan Generator",
    "Goal-Based Planning AI","Retirement Income Optimizer","Charitable Giving Advisor AI","Insurance Needs Analyzer",
    "Investment Proposal Generator","Client Review Prep AI","Wealth Transfer Planner","Risk Tolerance Profiler AI",
    "Model Portfolio Constructor","Direct Indexing Engine","Unified Managed Household AI","Cash Flow Optimizer",
    "Alternative Investment Advisor","Impact Investing Matcher","Trust Administration AI","FA Productivity Copilot"],
  "Enterprise AI Platform": [
    "ML Feature Store","AI Model Registry","Prompt Engineering Platform","LLM Gateway & Orchestrator",
    "AI Governance Framework","Responsible AI Monitor","Data Labeling Platform","AutoML Pipeline",
    "Inference Optimization Engine","AI Cost Management Dashboard","Embedding Search Service","RAG Pipeline Service",
    "AI Security Scanner","Model Performance Monitor","Synthetic Data Generator","AI Training Infrastructure",
    "Vector Database Service","Knowledge Graph Builder","AI Experimentation Platform","Conversational AI Builder"],
  "Data & Analytics": [
    "Enterprise Data Catalog","Real-Time Analytics Engine","Client 360 Data Platform","Revenue Attribution AI",
    "Data Lineage Tracker","Data Quality Scorecard","Business Intelligence Copilot","Advanced Visualization Engine",
    "Predictive Analytics Suite","NLP Document Analyzer","Unstructured Data Processor","Data Mesh Orchestrator",
    "Streaming Analytics Pipeline","Data Monetization Platform","Cross-Entity Data Linker","Alternative Data Integrator",
    "Regulatory Data Lake","Market Data Aggregator AI","Firmwide KPI Dashboard AI","Data Governance Automation"],
};

/* ═══════════════════════════════════════════
   FLAGSHIP INITIATIVES  (hand-crafted, ~30)
   sM/eM/bM/cM = month (1-12), Q1→1, Q2→4, Q3→7, Q4→10
   Founding 20: sY ≤ 2024, Wave 2: sY = 2025
   ═══════════════════════════════════════════ */
const FLAGSHIPS = [
  // ── Founding 20  (active at Dec 2024) ──────────────────────
  // Enterprise Platforms — Tech: slow indirect ROI, high budget → mostly amber by Feb 2026
  {id:"copilot",name:"M365 Copilot",cat:"Enterprise AI Platform",bu:"Tech",div:"ENTERPRISE TECH & SERVICES",
    sY:2024,sM:1,eY:2027,eM:12,bY:2024,bM:7,budget:45e6,maxB:52e6,sS:"front",bS:"slow",dev:.10,perp:true},
  {id:"chatgpt",name:"ChatGPT Enterprise",cat:"Enterprise AI Platform",bu:"Tech",div:"Innovation",
    sY:2024,sM:4,eY:2027,eM:12,bY:2025,bM:1,budget:22e6,maxB:28e6,sS:"steady",bS:"slow",dev:.06,perp:true},
  {id:"ghcopilot",name:"GitHub Copilot",cat:"Enterprise AI Platform",bu:"Tech",div:"ENTERPRISE TECH & SERVICES",
    sY:2024,sM:1,eY:2027,eM:12,bY:2024,bM:4,budget:18e6,maxB:55e6,sS:"steady",bS:"ramp",dev:.04,perp:true},
  {id:"genaiplatform",name:"GenAI Platform",cat:"Enterprise AI Platform",bu:"Tech",div:"Innovation",
    sY:2024,sM:7,eY:2027,eM:6,bY:2025,bM:10,budget:28e6,maxB:35e6,sS:"front",bS:"slow",dev:.12,perp:false},
  {id:"mlops",name:"ML Ops Pipeline",cat:"Enterprise AI Platform",bu:"Tech",div:"ENTERPRISE TECH & SERVICES",
    sY:2024,sM:4,eY:2027,eM:10,bY:2025,bM:7,budget:15e6,maxB:22e6,sS:"steady",bS:"slow",dev:.05,perp:false},

  // Compliance & Risk — proven use cases, early starters → emerald by Feb 2026
  {id:"fraud",name:"Fraud Detection ML",cat:"Risk & Compliance",bu:"OPS",div:"Firmwide Ops",
    sY:2023,sM:7,eY:2026,eM:4,bY:2024,bM:4,budget:16e6,maxB:58e6,sS:"front",bS:"ramp",dev:-.06,perp:false,cY:2026,cM:4},
  {id:"kyc",name:"KYC/AML Automation",cat:"Risk & Compliance",bu:"Co",div:"Legal and Compliance",
    sY:2024,sM:1,eY:2027,eM:4,bY:2024,bM:10,budget:14e6,maxB:48e6,sS:"front",bS:"ramp",dev:.08,perp:false},
  {id:"amlmon",name:"AML Transaction Monitoring",cat:"Risk & Compliance",bu:"Co",div:"Risk Management",
    sY:2024,sM:4,eY:2027,eM:10,bY:2025,bM:1,budget:12e6,maxB:40e6,sS:"front",bS:"ramp",dev:.05,perp:false},
  {id:"regreport",name:"Regulatory Reporting AI",cat:"Risk & Compliance",bu:"Co",div:"Finance",
    sY:2024,sM:7,eY:2027,eM:1,bY:2025,bM:7,budget:10e6,maxB:18e6,sS:"front",bS:"ramp",dev:.22,perp:false},

  // Trading & Markets — revenue-linked, measurable but complex → amber/emerald mix
  {id:"tradingai",name:"Trading Analytics AI",cat:"Trading & Markets",bu:"ISG",div:"Institutional Equity Division",
    sY:2024,sM:4,eY:2027,eM:10,bY:2025,bM:1,budget:28e6,maxB:72e6,sS:"steady",bS:"ramp",dev:.15,perp:false},
  {id:"eqresearch",name:"Equity Research Copilot",cat:"Trading & Markets",bu:"ISG",div:"Research",
    sY:2024,sM:7,eY:2027,eM:4,bY:2025,bM:4,budget:12e6,maxB:32e6,sS:"steady",bS:"ramp",dev:.03,perp:false},
  {id:"fipricing",name:"Fixed Income Pricing AI",cat:"Trading & Markets",bu:"ISG",div:"Fixed Income Division",
    sY:2024,sM:10,eY:2027,eM:7,bY:2025,bM:10,budget:18e6,maxB:30e6,sS:"steady",bS:"slow",dev:.10,perp:false},

  // Wealth Management — soft ROI, adoption-dependent → amber, some crimson
  {id:"clientins",name:"Client Insights Engine",cat:"Client Experience",bu:"WM",div:"WM Client Segments",
    sY:2024,sM:4,eY:2027,eM:10,bY:2025,bM:4,budget:14e6,maxB:22e6,sS:"front",bS:"slow",dev:.09,perp:false},
  {id:"wmadvisory",name:"WM Advisory AI",cat:"Wealth Advisory",bu:"WM",div:"WM Global Investment Office",
    sY:2024,sM:10,eY:2027,eM:4,bY:2025,bM:10,budget:16e6,maxB:18e6,sS:"steady",bS:"slow",dev:.14,perp:false},

  // Investment Management — quantitative, high ceiling but slower ramp
  {id:"quantai",name:"Quant Strategy AI",cat:"Trading & Markets",bu:"IM",div:"Active Fundamental Equity",
    sY:2024,sM:4,eY:2027,eM:4,bY:2025,bM:4,budget:18e6,maxB:50e6,sS:"steady",bS:"ramp",dev:.11,perp:false},
  {id:"portopt",name:"Portfolio Optimization AI",cat:"Data & Analytics",bu:"IM",div:"Solutions & Multi-Asset",
    sY:2024,sM:10,eY:2027,eM:10,bY:2025,bM:10,budget:12e6,maxB:20e6,sS:"steady",bS:"slow",dev:.07,perp:false},

  // Operations — fast measurable ROI → emerald candidates
  {id:"docauto",name:"Doc Automation Platform",cat:"Operations & Automation",bu:"OPS",div:"Firmwide Ops",
    sY:2024,sM:4,eY:2027,eM:4,bY:2024,bM:10,budget:10e6,maxB:36e6,sS:"front",bS:"ramp",dev:.18,perp:false},
  {id:"contractai",name:"Contract Review AI",cat:"Operations & Automation",bu:"Co",div:"Legal and Compliance",
    sY:2024,sM:7,eY:2027,eM:1,bY:2025,bM:4,budget:7e6,maxB:22e6,sS:"front",bS:"ramp",dev:.10,perp:false},

  // Data & Analytics — enabling infrastructure, slow indirect value
  {id:"client360",name:"Client 360 Data Platform",cat:"Data & Analytics",bu:"Tech",div:"ENTERPRISE TECH & SERVICES",
    sY:2024,sM:7,eY:2027,eM:10,bY:2025,bM:10,budget:20e6,maxB:28e6,sS:"front",bS:"slow",dev:.16,perp:false},
  {id:"datacat",name:"Enterprise Data Catalog",cat:"Data & Analytics",bu:"Tech",div:"ENTERPRISE TECH & SERVICES",
    sY:2024,sM:10,eY:2027,eM:4,bY:2025,bM:10,budget:10e6,maxB:14e6,sS:"steady",bS:"slow",dev:.06,perp:false},

  // ── Wave 2  (start 2025) — mostly building/amber by Feb 2026 ─────
  {id:"agentplatform",name:"Agentic AI Platform",cat:"Enterprise AI Platform",bu:"Tech",div:"Innovation",
    sY:2025,sM:1,eY:2027,eM:10,bY:2026,bM:7,budget:35e6,maxB:45e6,sS:"steady",bS:"slow",dev:.05,perp:false},
  {id:"tradesurv",name:"Trade Surveillance AI",cat:"Risk & Compliance",bu:"Co",div:"Internal Audit",
    sY:2025,sM:1,eY:2027,eM:4,bY:2025,bM:10,budget:9e6,maxB:26e6,sS:"steady",bS:"ramp",dev:.05,perp:false},
  {id:"algoopt",name:"Algo Execution Optimizer",cat:"Trading & Markets",bu:"ISG",div:"Institutional Equity Division",
    sY:2025,sM:4,eY:2027,eM:1,bY:2026,bM:4,budget:20e6,maxB:48e6,sS:"steady",bS:"slow",dev:.07,perp:false},
  {id:"nba",name:"Next Best Action Engine",cat:"Client Experience",bu:"WM",div:"Wealth Management Field",
    sY:2025,sM:1,eY:2027,eM:10,bY:2026,bM:1,budget:11e6,maxB:15e6,sS:"steady",bS:"slow",dev:.08,perp:false},
  {id:"portrebal",name:"Portfolio Rebalancer AI",cat:"Wealth Advisory",bu:"WM",div:"Investment Solutions",
    sY:2025,sM:4,eY:2027,eM:7,bY:2026,bM:7,budget:8e6,maxB:12e6,sS:"steady",bS:"slow",dev:.02,perp:false},
  {id:"esg",name:"ESG Analytics Platform",cat:"Data & Analytics",bu:"IM",div:"Real Assets",
    sY:2025,sM:1,eY:2027,eM:4,bY:2025,bM:10,budget:8e6,maxB:20e6,sS:"steady",bS:"ramp",dev:.00,perp:false},
  {id:"hrcopilot",name:"HR Service Copilot",cat:"Enterprise AI Platform",bu:"Co",div:"Human Capital Management",
    sY:2025,sM:1,eY:2027,eM:10,bY:2025,bM:10,budget:5e6,maxB:14e6,sS:"steady",bS:"ramp",dev:.03,perp:false},
  {id:"talent",name:"Talent Analytics AI",cat:"Data & Analytics",bu:"Co",div:"Human Capital Management",
    sY:2025,sM:4,eY:2027,eM:1,bY:2026,bM:4,budget:4e6,maxB:6e6,sS:"steady",bS:"slow",dev:.00,perp:false},
  {id:"compltrain",name:"Compliance Training AI",cat:"Risk & Compliance",bu:"Co",div:"Legal and Compliance",
    sY:2025,sM:7,eY:2027,eM:4,bY:2026,bM:7,budget:3e6,maxB:7e6,sS:"steady",bS:"ramp",dev:.05,perp:false},
];

/* ═══════════════════════════════════════════
   BU PROFILES  — realistic zone distribution biases
   ═══════════════════════════════════════════ */
const BU_PROFILE = {
  OPS:  { roiMult:[2.8,4.5], rampSpeed:[.1,.3,.6], goLive:[2,7],  failRate:.05, overBudgetRate:.12 },
  ISG:  { roiMult:[2.2,4.0], rampSpeed:[.2,.3,.5], goLive:[3,10], failRate:.08, overBudgetRate:.18 },
  Co:   { roiMult:[2.0,3.5], rampSpeed:[.2,.5,.3], goLive:[4,12], failRate:.06, overBudgetRate:.15 },
  WM:   { roiMult:[1.8,3.2], rampSpeed:[.2,.4,.4], goLive:[4,12], failRate:.10, overBudgetRate:.18 },
  IM:   { roiMult:[2.0,3.8], rampSpeed:[.3,.3,.4], goLive:[3,11], failRate:.10, overBudgetRate:.16 },
  Tech: { roiMult:[1.4,2.5], rampSpeed:[.4,.3,.3], goLive:[6,15], failRate:.12, overBudgetRate:.22 },
};
const CAT_ROI_BIAS = {
  "Risk & Compliance": 1.3, "Operations & Automation": 1.4, "Trading & Markets": 1.1,
  "Data & Analytics": 0.9, "Client Experience": 0.85, "Wealth Advisory": 0.8, "Enterprise AI Platform": 0.7,
};

/* ═══════════════════════════════════════════
   INITIATIVE GENERATOR
   20 founding (Dec 2024) → ~100 by Feb 2026 → projected through Dec 2027
   ═══════════════════════════════════════════ */
function genInitiatives() {
  const inits = [];
  let idCounter = 0;

  // Add flagships first
  FLAGSHIPS.forEach(f => {
    inits.push({
      id: f.id, name: f.name, cat: f.cat, owner: f.bu, bu: f.bu, div: f.div,
      tl: mkTL(f.sY, f.sM, f.eY, f.eM, {
        budget: f.budget, sS: f.sS, bY: f.bY, bM: f.bM, maxB: f.maxB, bS: f.bS,
        dev: f.dev, cY: f.cY || null, cM: f.cM || null,
        oBpM: f.perp ? f.maxB * .02 : f.maxB * .02
      })
    });
  });

  // BU weight distribution — skewed so revenue-generating BUs dominate
  const buWeights = { ISG: .28, Tech: .22, WM: .18, IM: .13, OPS: .10, Co: .09 };

  // Category affinity per BU
  const buCatAffinity = {
    Tech: ["Enterprise AI Platform","Data & Analytics","Operations & Automation"],
    ISG: ["Trading & Markets","Data & Analytics","Client Experience","Risk & Compliance"],
    WM: ["Wealth Advisory","Client Experience","Data & Analytics","Operations & Automation"],
    IM: ["Trading & Markets","Data & Analytics","Risk & Compliance","Wealth Advisory"],
    OPS: ["Operations & Automation","Data & Analytics","Risk & Compliance","Enterprise AI Platform"],
    Co: ["Risk & Compliance","Enterprise AI Platform","Data & Analytics","Operations & Automation","Client Experience"],
  };

  // Wave schedule: [startYear, startMonth, count]
  // Monthly batches: 20 founding → ~40 by Mar → ~70 by Jun → ~100 by Dec 2025 → ~105 by Feb 2026
  const waves = [
    // Jan-Mar 2025: +20 gen → ~40 active
    [2025,1,7],[2025,2,7],[2025,3,6],
    // Apr-Jun 2025: +30 gen → ~70 ("big wave")
    [2025,4,12],[2025,5,10],[2025,6,8],
    // Jul-Dec 2025: +25 gen → ~100 by year end
    [2025,7,6],[2025,8,5],[2025,9,4],[2025,10,4],[2025,11,3],[2025,12,3],
    // Jan-Feb 2026: +5 → ~105 ("today")
    [2026,1,3],[2026,2,2],
    // Mar-Dec 2026: projected (quarterly cadence)
    [2026,4,4],[2026,7,5],[2026,10,5],
    // 2027: planned (quarterly cadence)
    [2027,1,4],[2027,4,5],[2027,7,4],[2027,10,3],
  ];

  // Track used names per category to avoid duplicates
  const usedNames = new Set(inits.map(i => i.name));
  const catNameIdx = {};
  CATS.forEach(c => { catNameIdx[c] = shuffle([...NAME_POOLS[c]]); });

  function getName(cat) {
    const pool = catNameIdx[cat];
    for (let i = 0; i < pool.length; i++) {
      if (!usedNames.has(pool[i])) { usedNames.add(pool[i]); return pool.splice(i, 1)[0]; }
    }
    // Fallback: generate numbered name
    return `${cat.split(" ")[0]} Initiative ${++idCounter}`;
  }

  // Budget tiers by BU × wave era — revenue BUs get bigger individual budgets
  const BU_BUDGET = {
    ISG:  { early: [4e6,18e6], mid: [3e6,14e6], late: [3e6,16e6] },
    Tech: { early: [3e6,15e6], mid: [2.5e6,12e6], late: [2e6,14e6] },
    WM:   { early: [2e6,10e6], mid: [1.5e6,8e6],  late: [1.5e6,10e6] },
    IM:   { early: [2e6,12e6], mid: [1.5e6,9e6],  late: [2e6,11e6] },
    OPS:  { early: [1e6,6e6],  mid: [.8e6,5e6],   late: [1e6,6e6] },
    Co:   { early: [1e6,5e6],  mid: [.7e6,4e6],   late: [.8e6,5e6] },
  };
  function getBudget(sY, bu) {
    const tier = BU_BUDGET[bu] || BU_BUDGET.Co;
    const era = sY <= 2024 ? "early" : sY <= 2025 ? "mid" : sY <= 2026 ? "mid" : "late";
    return rBetween(tier[era][0], tier[era][1]);
  }

  // Helper: add months to (year, month)
  function addMonths(y, m, n) {
    const total = (y * 12 + m - 1) + n;
    return [Math.floor(total / 12), (total % 12) + 1];
  }

  waves.forEach(([wY, wM, count]) => {
    for (let i = 0; i < count; i++) {
      const r = rng();
      let cum = 0, bu = "Tech";
      for (const [b, w] of Object.entries(buWeights)) { cum += w; if (r < cum) { bu = b; break; } }

      const affCats = buCatAffinity[bu];
      const cat = rng() < .75 ? pick(affCats) : pick(CATS);
      const div = pick(BU_DIVS[bu]);
      const prof = BU_PROFILE[bu];
      const catBias = CAT_ROI_BIAS[cat] || 1.0;

      const budget = Math.round(getBudget(wY, bu) / 1e5) * 1e5;

      // Benefit multiple biased by BU profile + category
      const baseMultiple = rBetween(prof.roiMult[0], prof.roiMult[1]);
      const isFailing = rng() < prof.failRate;
      const effectiveMult = isFailing ? rBetween(0.3, 0.8) : baseMultiple * catBias;
      const maxB = Math.round(budget * effectiveMult / 1e5) * 1e5;

      // Duration: 6-30 months
      const duration = Math.floor(rBetween(6, 30));
      let [eY, eM] = addMonths(wY, wM, duration);
      if (eY > 2027 || (eY === 2027 && eM > 12)) { eY = 2027; eM = 12; }

      // Go-live biased by BU (OPS fast, Tech slow)
      const goLiveOffset = Math.floor(rBetween(prof.goLive[0], prof.goLive[1]));
      let [bY, bM] = addMonths(wY, wM, goLiveOffset);
      if (bY > eY || (bY === eY && bM > eM)) { bY = eY; bM = eM; }

      // Over-budget biased by BU profile
      const isOverBudget = rng() < prof.overBudgetRate;
      const dev = isOverBudget
        ? rBetween(.06, .30)
        : rng() < .12 ? rBetween(-.08, -.02) : rBetween(-.01, .04);

      const sS = rng() < .4 ? "front" : "steady";

      // Benefit shape biased by BU: pick based on rampSpeed distribution
      const bsRoll = rng();
      const bS = bsRoll < prof.rampSpeed[0] ? "slow" : bsRoll < prof.rampSpeed[0] + prof.rampSpeed[1] ? "ramp" : "steady";

      // Some early projects complete (started ≤ Jun 2025)
      let cY = null, cM = null;
      if (wY <= 2025 && wM <= 6 && rng() < .20) {
        const compOffset = Math.floor(rBetween(18, 30));
        [cY, cM] = addMonths(wY, wM, compOffset);
        if (qi(cY, cM) < 0) { cY = null; cM = null; }
      }

      const name = getName(cat);
      const id = `gen_${inits.length}`;

      inits.push({
        id, name, cat, owner: bu, bu, div,
        tl: mkTL(wY, wM, eY, eM, {
          budget, sS, bY, bM, maxB, bS,
          dev: Math.round(dev * 100) / 100,
          cY, cM, oBpM: maxB * .02
        })
      });
    }
  });

  return inits;
}

const INITS = genInitiatives();

/* ═══════════════════════════════════════════
   DIVISION DATA  — 51 divisions with aggregated timelines
   ═══════════════════════════════════════════ */
// Investment weight tiers — flagship divisions get disproportionately more
const DIV_WEIGHT = {
  // Tech heavyweights
  "ENTERPRISE TECH & SERVICES":3.5,"Cyber Data Risk & Resilience":2.8,"Innovation":2.2,"Institutional Securities Tech":2.5,
  // ISG revenue engines
  "Fixed Income Division":3.2,"IBD":3.0,"Institutional Equity Division":2.8,"Research":2.0,"ISG Operations":1.2,
  // WM high-touch
  "Wealth Management Field":3.0,"WM Platforms":2.5,"Investment Solutions":2.2,"WM Global Investment Office":1.8,
  // IM flagships
  "Active Fundamental Equity":2.6,"Liquidity":2.2,"Private Credit & Equity":2.4,"Solutions & Multi-Asset":2.0,
  // Everything else gets a mild random weight
};
const DIV_DEFS = [];
BU_LIST.forEach(bu => {
  BU_DIVS[bu].forEach(divName => {
    const w = DIV_WEIGHT[divName] || (0.5 + rng() * 1.0); // 0.5–1.5x for unlisted
    const baseBudget = bu === "Tech" ? rBetween(3e6, 8e6) * w
      : bu === "ISG" ? rBetween(2.5e6, 7e6) * w
      : bu === "WM" ? rBetween(2e6, 6e6) * w
      : bu === "IM" ? rBetween(2e6, 6e6) * w
      : bu === "OPS" ? rBetween(1.5e6, 4e6) * w
      : rBetween(1.5e6, 4e6) * w;
    const b = Math.round(baseBudget / 1e5) * 1e5;
    const prof = BU_PROFILE[bu];
    // Benefit multiple biased by BU character
    const divMult = rBetween(prof.roiMult[0], prof.roiMult[1]);
    const mB = Math.round(b * divMult / 1e5) * 1e5;
    // Stagger starts across 2024-2025
    const sY = 2024 + Math.floor(rng() * 2);
    const sM = Math.floor(rng() * 12) + 1;
    const durMonths = Math.floor(rBetween(18, 42));
    let eY = sY + Math.floor((sM + durMonths - 1) / 12);
    let eM = ((sM + durMonths - 1) % 12) + 1;
    if (eY > 2027) { eY = 2027; eM = 12; }
    // Go-live biased by BU profile
    const goLiveOffset = Math.floor(rBetween(prof.goLive[0], prof.goLive[1]));
    let bY = sY + Math.floor((sM + goLiveOffset - 1) / 12);
    let bM = ((sM + goLiveOffset - 1) % 12) + 1;
    if (bY > eY || (bY === eY && bM > eM)) { bY = eY; bM = eM; }
    // Over-budget biased by BU
    const isOverBudget = rng() < prof.overBudgetRate;
    const dev = isOverBudget ? rBetween(.06, .25) : rBetween(-.03, .06);
    // Benefit shape biased by BU
    const bsRoll = rng();
    const bS = bsRoll < prof.rampSpeed[0] ? "slow" : bsRoll < prof.rampSpeed[0] + prof.rampSpeed[1] ? "ramp" : "steady";
    DIV_DEFS.push({ n: divName, bu, b, mB, sY, sM, eY, eM, bY, bM, dev: Math.round(dev * 100) / 100, bS });
  });
});

const DIVS = DIV_DEFS.map((d, i) => ({ id: `div_${i}`, name: d.n, bu: d.bu }));

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */
const fmt = (n) => {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
};

const ZONE_LABEL = {
  build_ontrack:"ON TRACK", build_atrisk:"AT RISK", build_distressed:"STALLED",
  prod_performing:"PERFORMING", prod_underperforming:"UNDER-PERFORMING", prod_nonperforming:"NON-PERFORMING"
};
const PHASE_LABEL = { future:"FUTURE", building:"BUILDING", value_capture:"LIVE", commitment_met:"LIVE", declining:"LIVE" };

/* ═══════════════════════════════════════════
   SIX-STATUS COLOR SYSTEM
   3 Production (flat solid) × 3 Building (tinted gray + stripes)
   ═══════════════════════════════════════════ */
function simpleHash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h); }

function getZone(d) {
  if (d.phase === "future") return "build_ontrack";
  if (d.phase === "building") {
    if ((d.lastActivity || 0) > 90) return "build_distressed";
    if ((d.budgetBurn || 0) > ((d.milestones || 0) + .15) ||
        (d.lastActivity || 0) > 60 || d.confidence === "low") return "build_atrisk";
    return "build_ontrack";
  }
  if (d.phase === "commitment_met") return "prod_performing";
  if (d.phase === "declining") return d.t12ROI < .1 ? "prod_nonperforming" : "prod_underperforming";
  if (d.t12ROI >= .8) return "prod_performing";
  if (d.t12ROI >= .1) return "prod_underperforming";
  return "prod_nonperforming";
}

// Flat single colors — no gradients
const ZONE_GRAD = {
  prod_performing: "#1A5C44",
  prod_underperforming: "#6B5528",
  prod_nonperforming: "#6B2828",
  build_ontrack: "#182B25",
  build_atrisk: "#2B2518",
  build_distressed: "#2B1818",
};
// Stripe colors for building zones
const BUILD_STRIPE = {
  build_ontrack: "rgba(26, 92, 68, 0.25)",
  build_atrisk: "rgba(107, 85, 40, 0.25)",
  build_distressed: "rgba(107, 40, 40, 0.3)",
};
const ZONE_LEGEND = { prod_performing:"#1A5C44", prod_underperforming:"#6B5528", prod_nonperforming:"#6B2828", build_ontrack:"#182B25", build_atrisk:"#2B2518", build_distressed:"#2B1818" };
const ZONE_TX = { prod_performing:"#FFFFFF", prod_underperforming:"#FFFFFF", prod_nonperforming:"#FFFFFF", build_ontrack:"#FFFFFF", build_atrisk:"#FFFFFF", build_distressed:"#FFFFFF" };
const ZONE_BADGE = { prod_performing:"#7ECDB3", prod_underperforming:"#D4B46A", prod_nonperforming:"#D98E8E", build_ontrack:"#7ECDB3", build_atrisk:"#D4B46A", build_distressed:"#D98E8E" };
const BLOCKERS = ["Legal","Infra","Data Eng","Privacy","Vendor","Security"];
const ROOT_CAUSES = ["budget","adoption","scope","market"];

function getBorder(dev, zone) {
  if (zone === "build_distressed") return "1px solid rgba(107,40,40,0.6)";
  return "none";
}

function isAtRisk(d) {
  const z = d.zone || getZone(d);
  return z === "build_distressed" || z === "build_atrisk" || z === "prod_nonperforming";
}

// Enrich quarterly data with zone-specific fields
function enrichData(d, initId, qI, prevROI) {
  const h = simpleHash(initId);
  // Building fields FIRST — getZone needs them for 3-way building classification
  if (d.phase === "building") {
    const goLiveQI = QS.findIndex(q => q.key === d.goLiveQ);
    const firstBuildM = Math.max(goLiveQI - 18, 0);
    const calPct = goLiveQI > firstBuildM ? Math.min(Math.max((qI - firstBuildM) / (goLiveQI - firstBuildM), 0), 1) : .5;
    // Count-based milestones: 4-12 based on budget size + hash variance
    const budgetM = d.actualBudget || d.budget || 5e6;
    d.totalMilestones = budgetM < 5e6 ? 4 + (h % 3) : budgetM < 15e6 ? 6 + (h % 4) : 8 + (h % 5);
    // Delivery variance: 0.65–1.15 per initiative (some behind, some ahead)
    const deliveryFactor = 0.65 + ((h * 13) % 51) / 100;
    const expectedDone = calPct * deliveryFactor * d.totalMilestones;
    d.milestonesHit = Math.max(0, Math.min(Math.floor(expectedDone), d.totalMilestones - 1));
    d.milestones = d.milestonesHit / d.totalMilestones;
    d.budgetBurn = d.actualBudget > 0 ? Math.min(d.spend / d.actualBudget, 1) : 0;
    d.daysToLive = goLiveQI > qI ? (goLiveQI - qI) * 30 : null;
    d.slips = h % 5 < 2 ? 0 : h % 5 < 4 ? 1 : 2;
    d.confidence = d.slips === 0 ? "high" : d.slips === 1 ? "medium" : "low";
    d.lastActivity = ((h * 7 + qI * 3) % 130) + 3;
    d.blocker = (h % 3 === 0) ? BLOCKERS[h % BLOCKERS.length] : null;
  } else {
    d.milestones = 0; d.budgetBurn = 0; d.daysToLive = null;
    d.totalMilestones = 0; d.milestonesHit = 0;
    d.slips = 0; d.confidence = "high"; d.lastActivity = 0; d.blocker = null;
  }
  // Now determine zone (can use building fields)
  const zone = getZone(d);
  // Velocity
  const roiDelta = prevROI != null ? d.t12ROI - prevROI : 0;
  d.velocity = roiDelta > .05 ? "up" : roiDelta < -.05 ? "down" : "flat";
  // Root cause (non-performing)
  d.rootCause = d.dev > .15 ? "budget" : ROOT_CAUSES[h % ROOT_CAUSES.length];
  d.zone = zone;
  return d;
}

// boxColor for side panel borders
function boxColor(phase, t12) {
  if (phase === "future" || phase === "building") return { bg:"#334155", tx:"#FFFFFF" };
  if (t12 >= .8) return { bg:"#1A5C44", tx:"#FFFFFF" };
  if (t12 >= .1) return { bg:"#6B5528", tx:"#FFFFFF" };
  return { bg:"#6B2828", tx:"#FFFFFF" };
}

/* ═══════════════════════════════════════════
   CRIMSON PULSE ANIMATION
   ═══════════════════════════════════════════ */
function CrimsonPulse() {
  const ref = useRef(null);
  useEffect(() => {
    let frame, start = null;
    const go = (ts) => {
      if (!start) start = ts;
      const t = ((ts - start) % 2500) / 2500;
      const v = 0.4 + 0.4 * Math.sin(t * Math.PI * 2);
      const sp = 5 + 15 * Math.sin(t * Math.PI * 2);
      if (ref.current) ref.current.style.boxShadow = `0 0 ${sp}px ${2 + 3 * v}px rgba(155,0,0,${v})`;
      frame = requestAnimationFrame(go);
    };
    frame = requestAnimationFrame(go);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <div ref={ref} style={{position:"absolute",inset:-4,borderRadius:12,pointerEvents:"none",zIndex:0}}/>;
}

/* ═══════════════════════════════════════════
   VELOCITY BADGE (Amber zone)
   ═══════════════════════════════════════════ */
function VelocityBadge({velocity, zInv = 1}) {
  const arrows = {up:"↗", flat:"→", down:"↘"};
  const colors = {up:"#6EE7B7", flat:"rgba(255,255,255,0.7)", down:"#FCA5A5"};
  return (
    <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:22*zInv,height:22*zInv,borderRadius:4,background:"rgba(0,0,0,0.35)",fontSize:14*zInv,fontWeight:700,color:colors[velocity],lineHeight:1}}>
      {arrows[velocity]}
    </div>
  );
}

/* ═══════════════════════════════════════════
   ROOT CAUSE ICON (Crimson zone)
   ═══════════════════════════════════════════ */
const ROOT_ICONS = { budget:"💰", adoption:"👤", scope:"📐", market:"📉" };
function RootCauseIcon({cause, zInv = 1}) {
  return (
    <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:24*zInv,height:24*zInv,borderRadius:5,background:"rgba(0,0,0,0.35)",fontSize:13*zInv}}>
      {ROOT_ICONS[cause] || "❓"}
    </div>
  );
}

/* ═══════════════════════════════════════════
   DUAL-TRACK SLIDER (Building tiles)
   ═══════════════════════════════════════════ */
function ProgressBar({pct}) {
  return (
    <div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:"rgba(255,255,255,0.08)",zIndex:5}}>
      <div style={{height:"100%",width:`${Math.min(pct,1)*100}%`,background:"rgba(255,255,255,0.85)",borderRadius:"0 1px 1px 0",transition:"width 0.5s"}}/>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LIFECYCLE CHART (Side Panel)
   Monthly-rate: spend peaks at go-live then decays;
   benefit ramp with projected (dashed) vs realized (solid)
   ═══════════════════════════════════════════ */
function LifecycleChart({ tl, qKey, committedB, budget }) {
  const W = 352, H = 130, PAD = { t: 16, r: 8, b: 22, l: 40 };
  const cW = W - PAD.l - PAD.r, cH = H - PAD.t - PAD.b;

  // Filter to active months only (has spend or benefit)
  const active = tl.filter(t => t.phase !== "future" || t.spend > 0 || t.benefit > 0);
  if (active.length < 2) return null;

  const startIdx = tl.indexOf(active[0]);
  const endIdx = tl.indexOf(active[active.length - 1]);
  const points = tl.slice(startIdx, endIdx + 1);
  const n = points.length;

  // Key indices
  const goLiveKey = points[0]?.goLiveQ;
  const goLiveIdx = goLiveKey ? points.findIndex(p => p.key === goLiveKey) : -1;
  const nowIdx = points.findIndex(p => p.key === qKey);
  const glI = goLiveIdx >= 0 ? goLiveIdx : Math.floor(n * 0.6);
  const postN = Math.max(n - 1 - glI, 1);
  const isLive = goLiveIdx >= 0 && nowIdx >= goLiveIdx;

  // ── Stylized cumulative SPEND: steep build-up to go-live, then flattens (maintenance) ──
  const totalBudget = budget || 5e6;
  const buildPortion = 0.72; // ~72% of budget spent during building
  const spendPts = points.map((_, i) => {
    if (i <= glI) {
      const t = glI > 0 ? i / glI : 1;
      return totalBudget * buildPortion * Math.pow(t, 1.25); // convex: accelerating during build
    }
    const t = (i - glI) / postN;
    const atGoLive = totalBudget * buildPortion;
    const remaining = totalBudget * (1 - buildPortion);
    return atGoLive + remaining * (1 - Math.exp(-t * 2.5)); // flattening maintenance tail
  });

  // ── Projected BENEFIT (cumulative): 0 before go-live, concave ramp to committed target ──
  const targetVal = committedB || totalBudget * 0.7;
  const projPts = points.map((_, i) => {
    if (i < glI || goLiveIdx < 0) return 0;
    const t = (i - glI) / postN;
    return targetVal * Math.pow(Math.min(t, 1), 0.6); // concave: fast initial ramp, then slowing
  });

  // ── Realized BENEFIT (cumulative): tracks projected × performance, live only up to NOW ──
  const perfRatio = (() => {
    if (!isLive || nowIdx < 0) return 1;
    const roi = points[nowIdx]?.t12ROI ?? 0.5;
    if (roi >= 0.8) return 0.85 + Math.min(roi * 0.25, 0.35);
    if (roi >= 0.1) return 0.4 + roi * 0.55;
    return 0.08 + roi;
  })();
  const realPts = isLive ? points.map((_, i) => {
    if (i < glI) return 0;
    if (nowIdx >= 0 && i > nowIdx) return null;
    const t = (i - glI) / postN;
    const base = targetVal * Math.pow(Math.min(t, 1), 0.6);
    const blend = Math.min((i - glI) / Math.max(nowIdx - glI, 1), 1);
    return base * (1 * (1 - blend) + perfRatio * blend);
  }) : null;

  // ── Y scale ──
  const maxVal = Math.max(
    ...spendPts, ...projPts,
    ...(realPts ? realPts.filter(v => v !== null) : [0]),
    1
  );

  // Scale helpers
  const x = i => PAD.l + (i / Math.max(n - 1, 1)) * cW;
  const y = v => PAD.t + cH - (v / maxVal) * cH;

  // ── Build SVG paths ──
  // Spend
  const spendPath = spendPts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const spendArea = `${spendPath} L${x(n-1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;

  // Projected benefit (from go-live to end)
  const projPath = glI < n ? projPts.slice(glI).map((v, i) =>
    `${i === 0 ? "M" : "L"}${x(glI + i).toFixed(1)},${y(v).toFixed(1)}`).join(" ") : null;

  // Realized benefit (from go-live to now, solid)
  let realPath = null, realArea = null;
  if (realPts) {
    const rv = [];
    for (let i = glI; i < n; i++) { if (realPts[i] === null) break; rv.push({ i, v: realPts[i] }); }
    if (rv.length > 1) {
      realPath = rv.map((p, j) => `${j === 0 ? "M" : "L"}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
      const lastI = rv[rv.length - 1].i;
      realArea = `${realPath} L${x(lastI).toFixed(1)},${y(0).toFixed(1)} L${x(glI).toFixed(1)},${y(0).toFixed(1)} Z`;
    }
  }

  // ── Markers ──
  const nowX = nowIdx >= 0 ? x(nowIdx) : null;
  const goLiveX = goLiveIdx >= 0 ? x(goLiveIdx) : null;

  // Break-even: where realized benefit crosses spend
  let breakI = -1;
  if (realPts) { for (let i = glI + 1; i < n; i++) { if (realPts[i] === null) break; if (realPts[i] >= spendPts[i]) { breakI = i; break; } } }
  const breakX = breakI > 0 ? x(breakI) : null;

  // Budget envelope (total budget ceiling for building)
  const budgetY = !isLive && totalBudget > 0 ? y(totalBudget) : null;

  // Phase bar segments
  const phases = [];
  let pStart = 0;
  for (let i = 1; i <= n; i++) {
    if (i === n || points[i].phase !== points[pStart].phase) {
      phases.push({ phase: points[pStart].phase, x1: x(pStart), x2: x(i === n ? n - 1 : i) });
      pStart = i;
    }
  }

  // Y-axis labels
  const yTicks = [0, maxVal * 0.5, maxVal];
  const startLabel = fmtMonthKey(points[0].key);
  const endLabel = fmtMonthKey(points[n - 1].key);

  const phaseColor = p => p === "building" ? "#334155" : p === "value_capture" ? "#1A5C44" :
    p === "commitment_met" ? "#065F46" : p === "declining" ? "#6B5528" : "#1E293B";

  return (
    <div style={{marginBottom:14}}>
      <div style={{fontSize:10,fontWeight:600,color:"#9CA3AF",marginBottom:6,textTransform:"uppercase",letterSpacing:.8}}>Project Lifecycle</div>
      <svg width={W} height={H} style={{display:"block",overflow:"visible"}}>
        {/* Grid lines */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={PAD.l} y1={y(v)} x2={W - PAD.r} y2={y(v)} stroke="rgba(255,255,255,0.06)" strokeWidth={1}/>
            <text x={PAD.l - 4} y={y(v) + 3} textAnchor="end" fill="#6B7280" fontSize={8} fontFamily="'JetBrains Mono'">{fmt(v)}</text>
          </g>
        ))}

        {/* Budget envelope (building only — monthly rate ceiling) */}
        {budgetY !== null && budgetY >= PAD.t && (
          <g>
            <line x1={PAD.l} y1={budgetY} x2={goLiveX || W - PAD.r} y2={budgetY} stroke="#94A3B8" strokeWidth={1} strokeDasharray="3 3" opacity={0.3}/>
            <text x={(goLiveX || W - PAD.r) + 2} y={budgetY + 3} fill="#94A3B8" fontSize={7} fontFamily="'JetBrains Mono'" opacity={0.5}>budget</text>
          </g>
        )}

        {/* Spend area + line (solid gray) */}
        <path d={spendArea} fill="rgba(148,163,184,0.10)"/>
        <path d={spendPath} fill="none" stroke="#94A3B8" strokeWidth={1.5}/>

        {/* Projected benefit (dashed green — the plan) */}
        {projPath && (
          <path d={projPath} fill="none" stroke="#6EE7B7" strokeWidth={1.2} strokeDasharray="4 3" opacity={0.5}/>
        )}

        {/* Realized benefit (solid green area + line — live projects only, up to NOW) */}
        {realArea && (
          <>
            <path d={realArea} fill="rgba(52,211,153,0.10)"/>
            <path d={realPath} fill="none" stroke="#34D399" strokeWidth={1.5}/>
          </>
        )}

        {/* Go-live marker */}
        {goLiveX !== null && (
          <g>
            <line x1={goLiveX} y1={PAD.t} x2={goLiveX} y2={H - PAD.b} stroke="#6EE7B7" strokeWidth={1} strokeDasharray="3 2" opacity={0.5}/>
            <text x={goLiveX} y={PAD.t - 3} textAnchor="middle" fill="#6EE7B7" fontSize={7} fontWeight={600}>GO-LIVE</text>
          </g>
        )}

        {/* Break-even marker (where realized benefit crosses spend) */}
        {breakX !== null && (
          <g>
            <circle cx={breakX} cy={y(spendPts[breakI])} r={3} fill="#0F172A" stroke="#34D399" strokeWidth={1.5}/>
            <text x={breakX} y={y(spendPts[breakI]) - 6} textAnchor="middle" fill="#34D399" fontSize={7} fontWeight={600}>B/E</text>
          </g>
        )}

        {/* NOW marker */}
        {nowX !== null && (
          <g>
            <line x1={nowX} y1={PAD.t} x2={nowX} y2={H - PAD.b} stroke="#F1F5F9" strokeWidth={1.5} opacity={0.5}/>
            <circle cx={nowX} cy={y(spendPts[nowIdx])} r={3} fill="#94A3B8" stroke="#F1F5F9" strokeWidth={1}/>
            {realPts && realPts[nowIdx] !== null && (
              <circle cx={nowX} cy={y(realPts[nowIdx])} r={3} fill="#34D399" stroke="#F1F5F9" strokeWidth={1}/>
            )}
          </g>
        )}

        {/* Phase bar at bottom */}
        {phases.map((p, i) => (
          <rect key={i} x={p.x1} y={H - PAD.b + 4} width={Math.max(p.x2 - p.x1, 2)} height={5} rx={2} fill={phaseColor(p.phase)} opacity={0.8}/>
        ))}

        {/* X-axis labels */}
        <text x={PAD.l} y={H - 2} fill="#6B7280" fontSize={8} fontFamily="'JetBrains Mono'">{startLabel}</text>
        <text x={W - PAD.r} y={H - 2} textAnchor="end" fill="#6B7280" fontSize={8} fontFamily="'JetBrains Mono'">{endLabel}</text>

        {/* Legend */}
        <line x1={W - PAD.r - 105} y1={PAD.t - 6} x2={W - PAD.r - 93} y2={PAD.t - 6} stroke="#94A3B8" strokeWidth={1.5}/>
        <text x={W - PAD.r - 90} y={PAD.t - 3} fill="#94A3B8" fontSize={7}>Spend</text>
        <line x1={W - PAD.r - 60} y1={PAD.t - 6} x2={W - PAD.r - 48} y2={PAD.t - 6} stroke="#6EE7B7" strokeWidth={1.2} strokeDasharray="3 2"/>
        <text x={W - PAD.r - 45} y={PAD.t - 3} fill="#6EE7B7" fontSize={7}>Target</text>
        {isLive && (
          <>
            <line x1={W - PAD.r - 25} y1={PAD.t - 6} x2={W - PAD.r - 13} y2={PAD.t - 6} stroke="#34D399" strokeWidth={1.5}/>
            <text x={W - PAD.r - 10} y={PAD.t - 3} fill="#34D399" fontSize={7}>Actual</text>
          </>
        )}
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ABBREVIATION HELPER  (for semantic zoom medium tier)
   ═══════════════════════════════════════════ */
function abbrev(name) {
  // Take uppercase first letters of each word, max 4 chars
  const parts = name.replace(/[^a-zA-Z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 4).toUpperCase();
  return parts.map(w => w[0]).join("").substring(0, 4).toUpperCase();
}

function truncName(name, maxChars) {
  if (name.length <= maxChars) return name;
  // Try to break at a word boundary
  const trimmed = name.substring(0, maxChars - 1);
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace > maxChars * 0.4) return trimmed.substring(0, lastSpace) + ".";
  return trimmed + ".";
}

/* ═══════════════════════════════════════════
   LEGEND
   ═══════════════════════════════════════════ */
function Legend({ activeZones, onToggleZone }) {
  const zones = [
    { id:"prod_performing", label:"Live – Performing", grad:ZONE_LEGEND.prod_performing, tint:"rgba(26,92,68,.1)" },
    { id:"prod_underperforming", label:"Live – Under-Performing", grad:ZONE_LEGEND.prod_underperforming, tint:"rgba(107,85,40,.1)" },
    { id:"prod_nonperforming", label:"Live – Non-Performing", grad:ZONE_LEGEND.prod_nonperforming, tint:"rgba(107,40,40,.1)" },
    { id:"build_ontrack", label:"Building – On Track", grad:ZONE_LEGEND.build_ontrack, stripe:true, stripeColor:BUILD_STRIPE.build_ontrack, tint:"rgba(26,92,68,.08)" },
    { id:"build_atrisk", label:"Building – At Risk", grad:ZONE_LEGEND.build_atrisk, stripe:true, stripeColor:BUILD_STRIPE.build_atrisk, tint:"rgba(107,85,40,.08)" },
    { id:"build_distressed", label:"Building – Stalled", grad:ZONE_LEGEND.build_distressed, stripe:true, stripeColor:BUILD_STRIPE.build_distressed, tint:"rgba(107,40,40,.08)" },
  ];
  const anyActive = activeZones.size > 0;
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center",fontSize:14,fontWeight:500,color:"#D1D5DB"}}>
      {zones.map(z => {
        const isOn = activeZones.has(z.id);
        const dimmed = anyActive && !isOn;
        return (
          <div key={z.id} className="lg-item" onClick={() => onToggleZone(z.id)}
            style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",
              padding:"5px 14px",borderRadius:100,
              background:isOn?"rgba(255,255,255,.12)":z.tint,
              border:isOn?"1px solid rgba(255,255,255,.3)":"1px solid rgba(255,255,255,.08)",
              opacity:dimmed?0.35:1,
              transition:"all .2s",userSelect:"none"}}>
            <div style={{width:14,height:14,borderRadius:3,background:z.grad,position:"relative",overflow:"hidden",flexShrink:0}}>
              {z.stripe && <div style={{position:"absolute",inset:0,backgroundImage:`repeating-linear-gradient(135deg,${z.stripeColor},${z.stripeColor} 3px,transparent 3px,transparent 6px)`}}/>}
            </div>
            <span>{z.label}</span>
          </div>
        );
      })}
      {anyActive && (
        <div onClick={() => onToggleZone(null)}
          style={{cursor:"pointer",fontSize:13,color:"#9CA3AF",padding:"5px 14px",borderRadius:100,
            border:"1px dashed rgba(255,255,255,.18)",userSelect:"none",transition:"all .2s"}}>
          Clear
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   TREEMAP ALGORITHM
   ═══════════════════════════════════════════ */
function tmLayout(items, W, H, ox = 0, oy = 0) {
  if (!items.length || W < 1 || H < 1) return [];
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) return [];
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const rects = [];
  function lay(row, rT, hz, rx, ry, rw, rh) {
    let off = 0;
    for (const it of row) {
      const fr = it.value / rT;
      if (hz) { rects.push({...it, x: rx+off, y: ry, w: rw*fr, h: rh}); off += rw*fr; }
      else { rects.push({...it, x: rx, y: ry+off, w: rw, h: rh*fr}); off += rh*fr; }
    }
  }
  let rem = [...sorted], rx = ox, ry = oy, rw = W, rh = H, remT = total;
  while (rem.length > 0) {
    if (rem.length <= 2) { lay(rem, remT, rw >= rh, rx, ry, rw, rh); break; }
    const hz = rw < rh;
    let row = [rem[0]], rowT = rem[0].value, bestA = 1e9;
    for (let i = 1; i < rem.length; i++) {
      const tr = [...row, rem[i]], tT = rowT + rem[i].value;
      const rSz = hz ? rh * (tT / remT) : rw * (tT / remT);
      let wa = 0;
      for (const it of tr) { const iw = hz ? rw*(it.value/tT) : rSz; const ih = hz ? rSz : rh*(it.value/tT); wa = Math.max(wa, Math.max(iw/ih, ih/iw)); }
      if (wa < bestA || i === 1) { bestA = wa; row = tr; rowT = tT; } else break;
    }
    const rFr = rowT / remT;
    if (hz) { const rH = rh*rFr; lay(row, rowT, true, rx, ry, rw, rH); ry += rH; rh -= rH; }
    else { const rW = rw*rFr; lay(row, rowT, false, rx, ry, rW, rh); rx += rW; rw -= rW; }
    remT -= rowT; rem = rem.filter(r => !row.includes(r));
  }
  return rects;
}

/* ═══════════════════════════════════════════
   AGGREGATE DATA
   ═══════════════════════════════════════════ */
function aggregate(items) {
  const t = { spend:0, benefit:0, budget:0, t12S:0, t12B:0, phases:{} };
  items.forEach(d => {
    t.spend += d.spend; t.benefit += d.benefit; t.budget += d.budget;
    t.t12S += d.t12Spend; t.t12B += d.t12Benefit;
    t.phases[d.phase] = (t.phases[d.phase]||0) + 1;
  });
  t.t12ROI = t.t12S > 0 ? t.t12B/t.t12S : 0;
  t.lifetimeROI = t.spend > 0 ? t.benefit/t.spend : 0;
  t.dev = t.budget > 0 ? (t.spend - t.budget) / t.budget : 0;
  // composite phase — derived from underlying initiative mix
  const buildCount = t.phases.building || 0;
  const totalCount = Object.values(t.phases).reduce((s, v) => s + v, 0);
  if (buildCount === totalCount) t.phase = "building";
  else if (buildCount > totalCount / 2) t.phase = "building";
  else if (t.t12ROI >= 1) t.phase = "commitment_met";
  else if (t.t12ROI >= .1) t.phase = "value_capture";
  else t.phase = "value_capture";
  if (t.t12ROI > 0 && t.t12ROI < .8 && t.lifetimeROI > 1) t.phase = "declining";
  return t;
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export default function AIPortfolio() {
  const [qI, setQI] = useState(NOW_IDX);
  const [orgLevel, setOrgLevel] = useState("div"); // firm | bu | div
  const [selected, setSelected] = useState(null);
  const [drillDiv, setDrillDiv] = useState(null); // { id, name, bu } — drill-down into a division
  const [drillBU, setDrillBU] = useState(null); // { bu } — drill-down into a BU
  const [hovered, setHovered] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [activeZones, setActiveZones] = useState(new Set());
  const toggleZone = useCallback((zoneId) => {
    if (zoneId === null) { setActiveZones(new Set()); setSelected(null); return; }
    setHotSeat(false); // auto-clear Capital at Risk when using legend
    setActiveZones(prev => {
      const next = new Set(prev);
      if (next.has(zoneId)) next.delete(zoneId); else next.add(zoneId);
      return next;
    });
    setSelected(null);
  }, []);
  const [tooltip, setTooltip] = useState(null);
  const [hotSeat, setHotSeat] = useState(false);
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const mapRef = useRef(null);
  const viewRef = useRef(null);
  const [viewDims, setViewDims] = useState({ w: 900, h: 480 });
  const playRef = useRef(null);

  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const obs = new ResizeObserver(e => {
      for (const en of e) setViewDims({ w: Math.max(en.contentRect.width, 500), h: Math.max(en.contentRect.height, 300) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (isPlaying) {
      playRef.current = setInterval(() => {
        setQI(p => { if (p >= QS.length - 1) { setIsPlaying(false); return p; } return p + 1; });
      }, 450);
    }
    return () => clearInterval(playRef.current);
  }, [isPlaying]);

  // Reset zoom/pan on org level change
  useEffect(() => { setZoom(1); setPan({x:0,y:0}); setSelected(null); setDrillDiv(null); setDrillBU(null); }, [orgLevel]);

  // Escape key exits drill-down (one level at a time)
  useEffect(() => {
    if (!drillDiv && !drillBU) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (drillDiv) { setDrillDiv(null); setSelected(null); setZoom(1); setPan({x:0,y:0}); }
        else if (drillBU) { setDrillBU(null); setSelected(null); setZoom(1); setPan({x:0,y:0}); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drillDiv, drillBU]);

  const qKey = QS[qI]?.key || "2024-12";

  // Compute spend at NOW — used as 100% baseline so map fills viewport at NOW, shrinks for past months
  const maxTotalSpend = useMemo(() => {
    const nowKey = QS[NOW_IDX]?.key;
    let s = 0;
    const scope = drillDiv ? INITS.filter(i => i.div === drillDiv.name && i.bu === drillDiv.bu)
      : drillBU ? INITS.filter(i => i.bu === drillBU.bu)
      : INITS;
    scope.forEach(i => { const d = i.tl.find(t => t.key === nowKey); if (d && d.phase !== "future") s += d.spend; });
    return Math.max(s, 1);
  }, [orgLevel, drillDiv, drillBU]);

  // Data for current view
  const { items, buRegions, totalSpend, totals } = useMemo(() => {
    if (orgLevel === "firm") {
      const data = INITS.map(init => {
        const dIdx = init.tl.findIndex(t => t.key === qKey);
        const d = init.tl[dIdx];
        if (!d || d.phase === "future") return null;
        const prevROI = dIdx > 0 ? init.tl[dIdx - 1]?.t12ROI : null;
        enrichData(d, init.id, dIdx, prevROI);
        return { id: init.id, name: init.name, cat: init.cat, owner: init.owner, bu: init.bu, d, type: "initiative", value: Math.max(d.spend, 200000) };
      }).filter(Boolean);
      // Group initiatives by BU for basket layout
      const buData = {};
      data.forEach(item => {
        if (!buData[item.bu]) buData[item.bu] = [];
        buData[item.bu].push(item);
      });
      const ts = data.reduce((s,i) => s+i.d.spend, 0);
      const agg = aggregate(data.map(i => i.d));
      return { items: data, buRegions: buData, totalSpend: ts, totals: { ...agg, count: data.length } };
    }

    // 3-month-ago key for momentum calculation
    const prevIdx = Math.max(qI - 3, 0);
    const prevKey = QS[prevIdx]?.key;

    // BU drill-down: initiative detail (BU → Division → Initiative)
    if (orgLevel === "bu" && drillBU && drillDiv) {
      const divInits = INITS.filter(i => i.div === drillDiv.name && i.bu === drillDiv.bu);
      const data = divInits.map(init => {
        const dIdx = init.tl.findIndex(t => t.key === qKey);
        const d = init.tl[dIdx];
        if (!d || d.phase === "future") return null;
        const prevROI = dIdx > 0 ? init.tl[dIdx - 1]?.t12ROI : null;
        enrichData(d, init.id, dIdx, prevROI);

        return { id: init.id, name: init.name, cat: init.cat, owner: init.bu, bu: init.bu, div: init.div, d, type: "initiative", value: Math.max(d.spend, 200000) };
      }).filter(Boolean);
      const ts = data.reduce((s, i) => s + i.d.spend, 0);
      const agg = aggregate(data.map(i => i.d));
      return { items: data, buRegions: null, totalSpend: ts, totals: { ...agg, count: data.length } };
    }

    // BU drill-down: show divisions within the drilled BU
    if (orgLevel === "bu" && drillBU) {
      const divItems = DIVS.filter(d => d.bu === drillBU.bu).map(d => {
        const divInits = INITS.filter(i => i.div === d.name && i.bu === drillBU.bu);
        const activeData = divInits.map(init => {
          const dIdx = init.tl.findIndex(t => t.key === qKey);
          const snap = init.tl[dIdx];
          if (!snap || snap.phase === "future") return null;
          const prevROI = dIdx > 0 ? init.tl[dIdx - 1]?.t12ROI : null;
          enrichData(snap, init.id, dIdx, prevROI);
          return snap;
        }).filter(Boolean);
        if (!activeData.length) return null;
        const agg = aggregate(activeData);
        const prevActiveData = divInits.map(init => {
          const snap = init.tl.find(t => t.key === prevKey);
          return snap && snap.phase !== "future" ? snap : null;
        }).filter(Boolean);
        const prevAgg = prevActiveData.length ? aggregate(prevActiveData) : null;
        const momentum = prevAgg ? agg.t12ROI - prevAgg.t12ROI : 0;
        const nonPerfCount = activeData.filter(dd => { const z = dd.zone || getZone(dd); return z === "prod_nonperforming" || z === "build_distressed"; }).length;
        const crimsonRatio = activeData.length > 0 ? nonPerfCount / activeData.length : 0;
        return { id: d.id, name: d.name, bu: d.bu, d: agg, type: "division", value: Math.max(agg.spend, 100000), momentum, crimsonRatio };
      }).filter(Boolean);
      const ts = divItems.reduce((s, i) => s + i.d.spend, 0);
      const allAgg = aggregate(divItems.map(i => i.d));
      return { items: divItems, buRegions: null, totalSpend: ts, totals: { ...allAgg, count: divItems.length } };
    }

    if (orgLevel === "bu") {
      const data = BU_LIST.map(bu => {
        const buInits = INITS.filter(i => i.bu === bu);
        const activeData = buInits.map(init => {
          const dIdx = init.tl.findIndex(t => t.key === qKey);
          const snap = init.tl[dIdx];
          if (!snap || snap.phase === "future") return null;
          const prevROI = dIdx > 0 ? init.tl[dIdx - 1]?.t12ROI : null;
          enrichData(snap, init.id, dIdx, prevROI);
          return snap;
        }).filter(Boolean);
        if (!activeData.length) return null;
        const agg = aggregate(activeData);
        // 3-month momentum
        const prevData = buInits.map(i => i.tl.find(t => t.key === prevKey)).filter(d => d && d.phase !== "future");
        const prevAgg = prevData.length ? aggregate(prevData) : null;
        const momentum = prevAgg ? agg.t12ROI - prevAgg.t12ROI : 0;
        // crimsonRatio from enriched zones
        const nonPerfCount = activeData.filter(d => { const z = d.zone || getZone(d); return z === "prod_nonperforming" || z === "build_distressed"; }).length;
        const crimsonRatio = activeData.length > 0 ? nonPerfCount / activeData.length : 0;
        const divCount = new Set(buInits.map(i => i.div)).size;
        return { id: bu, name: BU_NAMES[bu], bu, d: agg, type: "bu", value: Math.max(agg.spend, 200000),
          divCount, initCount: activeData.length, momentum, crimsonRatio };
      }).filter(Boolean);
      const ts = data.reduce((s,i) => s+i.d.spend, 0);
      const allAgg = aggregate(data.map(i => ({ ...i.d, budget: i.d.budget })));
      return { items: data, buRegions: null, totalSpend: ts, totals: { ...allAgg, count: data.length } };
    }

    // Division drill-down: show individual initiatives inside the drilled division
    if (drillDiv) {
      const divInits = INITS.filter(i => i.div === drillDiv.name && i.bu === drillDiv.bu);
      const data = divInits.map(init => {
        const dIdx = init.tl.findIndex(t => t.key === qKey);
        const d = init.tl[dIdx];
        if (!d || d.phase === "future") return null;
        const prevROI = dIdx > 0 ? init.tl[dIdx - 1]?.t12ROI : null;
        enrichData(d, init.id, dIdx, prevROI);

        return { id: init.id, name: init.name, cat: init.cat, owner: init.bu, bu: init.bu, div: init.div, d, type: "initiative", value: Math.max(d.spend, 200000) };
      }).filter(Boolean);
      const ts = data.reduce((s, i) => s + i.d.spend, 0);
      const agg = aggregate(data.map(i => i.d));
      return { items: data, buRegions: null, totalSpend: ts, totals: { ...agg, count: data.length } };
    }

    // Division level - nested (derived from underlying initiatives)
    const buData = {};
    BU_LIST.forEach(bu => {
      const divItems = DIVS.filter(d => d.bu === bu).map(d => {
        const divInits = INITS.filter(i => i.div === d.name && i.bu === bu);
        const activeData = divInits.map(init => {
          const dIdx = init.tl.findIndex(t => t.key === qKey);
          const snap = init.tl[dIdx];
          if (!snap || snap.phase === "future") return null;
          const prevROI = dIdx > 0 ? init.tl[dIdx - 1]?.t12ROI : null;
          enrichData(snap, init.id, dIdx, prevROI);
          return snap;
        }).filter(Boolean);
        if (!activeData.length) return null;
        const agg = aggregate(activeData);
        // 3-month momentum from initiatives
        const prevActiveData = divInits.map(init => {
          const snap = init.tl.find(t => t.key === prevKey);
          return snap && snap.phase !== "future" ? snap : null;
        }).filter(Boolean);
        const prevAgg = prevActiveData.length ? aggregate(prevActiveData) : null;
        const momentum = prevAgg ? agg.t12ROI - prevAgg.t12ROI : 0;
        // crimsonRatio from enriched zones
        const nonPerfCount = activeData.filter(dd => { const z = dd.zone || getZone(dd); return z === "prod_nonperforming" || z === "build_distressed"; }).length;
        const crimsonRatio = activeData.length > 0 ? nonPerfCount / activeData.length : 0;
        return { id: d.id, name: d.name, bu: d.bu, d: agg, type: "division", value: Math.max(agg.spend, 100000), momentum, crimsonRatio };
      }).filter(Boolean);
      if (divItems.length) buData[bu] = divItems;
    });

    const allDivs = Object.values(buData).flat();
    const ts = allDivs.reduce((s,i) => s+i.d.spend, 0);
    const allAgg = aggregate(allDivs.map(i => i.d));
    return { items: allDivs, buRegions: buData, totalSpend: ts, totals: { ...allAgg, count: allDivs.length } };
  }, [qKey, orgLevel, drillDiv, drillBU]);

  // Max value across items — used for visual weight scaling
  const maxVal = useMemo(() => items.reduce((m, i) => Math.max(m, i.value), 0), [items]);

  // Map scaling — fills viewport (minus inset) at NOW, shrinks proportionally for past months
  const MAP_INSET = 16; // px from top-left corner of viewport
  const spendRatio = Math.max(totalSpend / maxTotalSpend, 0.15);
  const scaleFactor = Math.min(spendRatio, 1);
  const mapW = (viewDims.w - MAP_INSET * 2) * scaleFactor;
  const mapH = (viewDims.h - MAP_INSET * 2) * scaleFactor;
  // Text scale: sqrt of spend ratio — text shrinks proportionally to tile side length, not area
  const tS = Math.max(Math.sqrt(Math.min(spendRatio, 1)), 0.55);
  // Firm view + initiative drill-down gets lighter weight for crisper text on small tiles
  const showingInits = orgLevel === "firm" || drillDiv;
  const tW = showingInits ? 600 : 700;
  const tLs = showingInits ? ".4px" : ".8px";

  // Compute treemap rects
  const rects = useMemo(() => {
    if (buRegions) {
      // Nested: first layout BU regions, then items within
      const isFirm = orgLevel === "firm";
      const buItems = Object.keys(buRegions).map(bu => ({
        id: bu, name: BU_NAMES[bu], bu,
        value: buRegions[bu].reduce((s,d) => s + d.value, 0),
        children: buRegions[bu],
      }));
      const buRects = tmLayout(buItems, mapW, mapH);
      const allRects = [];
      const buBorders = [];
      buRects.forEach(br => {
        const pad = isFirm ? 14 : 22; // top padding for BU label (tighter for firm)
        const innerPad = isFirm ? 2 : 3; // gutter half-width (tighter for firm)
        buBorders.push({ id: br.id, name: br.name, bu: br.bu, x: br.x, y: br.y, w: br.w, h: br.h });
        const innerRects = tmLayout(br.children, br.w - innerPad*2, br.h - pad - innerPad, br.x + innerPad, br.y + pad);
        allRects.push(...innerRects);
      });
      return { rects: allRects, buBorders };
    }
    return { rects: tmLayout(items, mapW, mapH), buBorders: null };
  }, [items, buRegions, mapW, mapH, orgLevel]);

  // Zoom handlers
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.min(Math.max(z * delta, 0.5), 5));
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return;
    setPan({ x: panStart.current.px + (e.clientX - panStart.current.x), y: panStart.current.py + (e.clientY - panStart.current.y) });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const resetView = () => { setZoom(1); setPan({x:0,y:0}); };

  const capitalAtRisk = useMemo(() => {
    return items.filter(i => isAtRisk(i.d)).reduce((s, i) => s + i.d.spend, 0);
  }, [items]);

  const selItem = selected ? rects.rects.find(r => r.id === selected) : null;
  const selTL = selItem && showingInits ? INITS.find(i => i.id === selItem.id)?.tl : null;

  // Get initiatives for side panel (org tiles show their initiative list)
  const selChildren = useMemo(() => {
    if (!selItem) return [];
    if (drillDiv) return []; // Drill-down into initiatives: no children
    // Org tiles (BU, division, BU drill-down showing divisions): show initiative list
    const scope = selItem.type === "bu" ? INITS.filter(i => i.bu === selItem.bu)
      : selItem.type === "division" ? INITS.filter(i => i.div === selItem.name && i.bu === selItem.bu)
      : [];
    return scope.map(i => {
      const d = i.tl.find(t => t.key === qKey);
      if (!d || d.phase === "future") return null;
      return { id: i.id, name: i.name, d };
    }).filter(Boolean);
  }, [selItem, orgLevel, qKey, drillDiv, drillBU]);

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif", background:"#0F172A", minHeight:"100vh", color:"#E2E8F0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .kc{background:rgba(255,255,255,.06);border-radius:14px;padding:15px 18px;border:1px solid rgba(255,255,255,.08);transition:all .25s}
        .kc-action{border:1px dashed rgba(255,255,255,.15)}
        .kc-action:hover{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.3)}
        .kc-active{background:rgba(220,38,38,0.12)!important;border:1px solid rgba(220,38,38,0.35)!important;box-shadow:0 0 12px rgba(220,38,38,0.12)!important}
        .kc-active:hover{background:rgba(220,38,38,0.18)!important;border:1px solid rgba(220,38,38,0.45)!important}
        .kc:hover{background:rgba(255,255,255,.09);transform:translateY(-1px)}
        .kl{font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#FFFFFF;margin-bottom:7px}
        .kv{font-family:'JetBrains Mono',monospace;font-size:30px;font-weight:700;line-height:1}
        .ks{font-size:13px;color:#D1D5DB;margin-top:5px;font-weight:500}
        .cp{padding:6px 14px;border-radius:100px;font-size:11px;font-weight:600;cursor:pointer;border:1.5px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:#9CA3AF;transition:all .2s;user-select:none}
        .cp:hover{border-color:rgba(255,255,255,.2)}.cp.on{background:#F1F5F9;color:#0F172A;border-color:#F1F5F9}
        .lg-item{transition:all .15s}
        .lg-item:hover{background:rgba(255,255,255,.1)!important;border-color:rgba(255,255,255,.2)!important;color:#FFFFFF}
        .sl{-webkit-appearance:none;appearance:none;width:100%;height:5px;border-radius:3px;background:rgba(255,255,255,.08);outline:none;cursor:pointer}
        .sl::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:#F1F5F9;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.4),0 0 0 4px rgba(241,245,249,.12)}
        .pb{width:40px;height:40px;border-radius:50%;border:2px solid rgba(255,255,255,.2);background:rgba(255,255,255,.05);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;color:#F1F5F9;flex-shrink:0}
        .pb:hover{background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.3)}.pb svg{fill:currentColor}
        .dp{position:absolute;top:0;right:0;width:400px;height:100%;background:rgba(15,23,42,.95);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-left:1px solid rgba(255,255,255,.06);box-shadow:-12px 0 48px rgba(0,0,0,.3);z-index:30;overflow-y:auto;padding:28px 24px;animation:si .3s cubic-bezier(.4,0,.2,1)}
        @keyframes si{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes tile-in{from{transform:scale(0.92)}to{transform:scale(1)}}
        .drill-tile{animation:tile-in .35s cubic-bezier(.4,0,.2,1)}
        .dc{position:absolute;top:14px;right:14px;background:rgba(255,255,255,.06);border:none;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;color:#9CA3AF;transition:all .15s}
        .dc:hover{background:rgba(255,255,255,.12);color:#F1F5F9}
        .bt{height:7px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden}.bf{height:100%;border-radius:4px;transition:width .5s ease}
        .st{display:inline-block;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;padding:2px 7px;border-radius:3px}
        .tb{position:absolute;border-radius:6px;overflow:hidden;cursor:pointer;transition:transform .25s cubic-bezier(.4,0,.2,1),box-shadow .25s}
        .tb:hover{transform:scale(1.012);z-index:10!important}
        .org-sl{-webkit-appearance:none;appearance:none;width:160px;height:5px;border-radius:3px;background:rgba(255,255,255,.08);outline:none;cursor:pointer;transform:rotate(-90deg);transform-origin:center center}
        .org-sl::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:#F1F5F9;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.4),0 0 0 4px rgba(241,245,249,.12)}
        .mini-bar{display:flex;height:6px;border-radius:3px;overflow:hidden;gap:1px}
        .zoom-ctrl{display:flex;align-items:center;gap:6px}
        .zoom-btn{width:32px;height:32px;border:1px solid rgba(255,255,255,.1);border-radius:6px;background:rgba(255,255,255,.04);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;color:#9CA3AF;transition:all .15s}
        .zoom-btn:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2)}
      `}</style>

      {/* HEADER */}
      <div style={{padding:"16px 40px 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <div>
            <h1 style={{fontSize:28,fontWeight:700,letterSpacing:"-0.8px",color:"#F1F5F9"}}>
              AI Portfolio Heatmap
            </h1>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"'JetBrains Mono'",fontSize:30,fontWeight:700,color:"#F1F5F9",lineHeight:1,letterSpacing:"-1px"}}>
              {fmtMonthKey(qKey)}
            </div>
            <div style={{fontSize:12,color:"#D1D5DB",marginTop:2}}>
              {drillDiv ? `${BU_NAMES[drillDiv.bu]} > ${drillDiv.name} · ${items.length} initiatives`
                : drillBU ? `${BU_NAMES[drillBU.bu]} · ${items.length} divisions`
                : `${orgLevel === "firm" ? "All Initiatives" : orgLevel === "bu" ? "Business Units" : "Divisions"} · ${items.length} ${orgLevel === "firm" ? "projects" : orgLevel === "bu" ? "units" : "divisions"}`}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginTop:16}}>
          <div className="kc">
            <div className="kl">Total Invested</div>
            <div className="kv" style={{color:"#FFFFFF"}}>{fmt(totals.spend)}</div>
            <div className="ks">{totals.count} {drillDiv ? "initiatives" : drillBU ? "divisions" : orgLevel === "firm" ? "initiatives" : orgLevel === "bu" ? "business units" : "divisions"}</div>
          </div>
          <div className="kc">
            <div className="kl">Total Benefit</div>
            <div className="kv" style={{color:"#34D399"}}>{fmt(totals.benefit)}</div>
            <div className="ks">cumulative realized</div>
          </div>
          <div className="kc">
            <div className="kl">Trailing 12mo ROI</div>
            <div className="kv" style={{color:"#FBBF24"}}>{totals.t12ROI.toFixed(2)}x</div>
            <div className="ks">current run rate</div>
          </div>
          <div className="kc">
            <div className="kl">Lifetime ROI</div>
            <div className="kv" style={{color:"#FBBF24"}}>{totals.lifetimeROI.toFixed(2)}x</div>
            <div className="ks">all-time return</div>
          </div>
          <div className={`kc kc-action${hotSeat?" kc-active":""}`} onClick={() => { setActiveZones(new Set()); setHotSeat(!hotSeat); }} style={{cursor:"pointer"}}>
            <div className="kl">Capital at Risk</div>
            <div className="kv" style={{color:"#EF4444"}}>{fmt(capitalAtRisk)}</div>
            <div className="ks" style={{color:hotSeat?"#FCA5A5":"#D1D5DB"}}>{hotSeat ? "click to reset" : "click to isolate"}</div>
          </div>
        </div>

        {/* Legend + Zoom controls */}
        <div style={{marginTop:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <Legend activeZones={activeZones} onToggleZone={toggleZone}/>
          <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.04)",padding:"4px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
            <button className="zoom-btn" onClick={() => setZoom(z => Math.max(z*.7,.5))}>−</button>
            <span style={{fontSize:13,fontFamily:"'JetBrains Mono'",color:"#9CA3AF",minWidth:48,textAlign:"center",fontWeight:600}}>{(zoom*100).toFixed(0)}%</span>
            <button className="zoom-btn" onClick={() => setZoom(z => Math.min(z*1.3,5))}>+</button>
            <div style={{width:1,height:16,background:"rgba(255,255,255,0.1)",margin:"0 2px"}}/>
            <button className="zoom-btn" onClick={resetView} style={{fontSize:12,fontWeight:600,letterSpacing:".5px",padding:"3px 10px",width:"auto"}}>Reset</button>
          </div>
        </div>

        {/* TIMELINE */}
        <div style={{marginTop:14,display:"flex",alignItems:"center",gap:14}}>
          <button className="pb" onClick={()=>{if(qI>=QS.length-1)setQI(SLIDER_MIN);setIsPlaying(!isPlaying)}}>
            {isPlaying?(
              <svg width="12" height="12" viewBox="0 0 14 14"><rect x="1" y="1" width="4" height="12" rx="1"/><rect x="9" y="1" width="4" height="12" rx="1"/></svg>
            ):(
              <svg width="12" height="12" viewBox="0 0 14 14"><polygon points="3,0 14,7 3,14"/></svg>
            )}
          </button>
          <div style={{flex:1,position:"relative",paddingBottom:26}}>
            {(() => {
              const slRange = QS.length - 1 - SLIDER_MIN;
              const pct = v => ((v - SLIDER_MIN) / slRange) * 100;
              const thumbR = 11; // half of 22px thumb
              return <>
                <input type="range" min={SLIDER_MIN} max={QS.length-1} value={qI} onChange={e=>setQI(parseInt(e.target.value))} className="sl" style={{background:`linear-gradient(to right, rgba(241,245,249,.35) ${pct(qI)}%, rgba(255,255,255,.08) ${pct(qI)}%)`}}/>
                {/* NOW marker — padded to match thumb dead zone */}
                <div style={{position:"absolute",left:thumbR,right:thumbR,top:-20,pointerEvents:"none"}}>
                  <div style={{position:"absolute",left:`${pct(NOW_IDX)}%`,transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center"}}>
                    <span style={{fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono'",color:"#34D399",letterSpacing:1,marginBottom:2}}>NOW</span>
                    <div style={{width:2,height:14,background:"#34D399",borderRadius:1}}/>
                  </div>
                </div>
                {/* Year labels — padded container matches thumb dead zone */}
                <div style={{position:"absolute",left:thumbR,right:thumbR,top:22,fontSize:13,fontFamily:"'JetBrains Mono'",color:"#9CA3AF",letterSpacing:.5,height:18}}>
                  {[2025,2026,2027].map(y=>{
                    const yIdx = QS.findIndex(q=>q.y===y&&q.m===1);
                    const isActive = QS[qI]?.y===y;
                    // Always count from INITS (raw initiatives), not view-specific items
                    const activeInits = isActive ? INITS.filter(init => { const d = init.tl.find(t => t.key === qKey); return d && d.phase !== "future"; }) : [];
                    const liveCount = activeInits.filter(init => { const d = init.tl.find(t => t.key === qKey); return d.phase !== "building"; }).length;
                    const buildCount = activeInits.length - liveCount;
                    const total = activeInits.length;
                    return <span key={y} style={{position:"absolute",left:`${pct(yIdx)}%`,fontWeight:isActive?700:500,color:isActive?"#FFFFFF":"#9CA3AF",whiteSpace:"nowrap"}}>
                      {y}{isActive && <span style={{color:"#9CA3AF",fontWeight:500,fontSize:11,marginLeft:8}}>{total} use cases ({liveCount} live · {buildCount} building){qI > NOW_IDX && <span style={{color:"#FBBF24",fontWeight:700,fontSize:10,marginLeft:8,letterSpacing:1}}>PROJECTED</span>}</span>}
                    </span>;
                  })}
                </div>
              </>;
            })()}
          </div>
        </div>

      </div>

      {/* DRILL-DOWN BREADCRUMB */}
      {(drillDiv || drillBU) && (
        <div style={{padding:"6px 40px 0",display:"flex",alignItems:"center",gap:8,fontSize:13,fontWeight:600}}>
          <span onClick={() => { setDrillDiv(null); setDrillBU(null); setSelected(null); setZoom(1); setPan({x:0,y:0}); }}
            style={{cursor:"pointer",color:"#9CA3AF",transition:"color .15s"}}
            onMouseEnter={e => e.target.style.color = "#FFFFFF"}
            onMouseLeave={e => e.target.style.color = "#9CA3AF"}>
            PORTFOLIO
          </span>
          {drillBU && (
            <>
              <span style={{color:"#475569"}}>/</span>
              {drillDiv ? (
                <span onClick={() => { setDrillDiv(null); setSelected(null); setZoom(1); setPan({x:0,y:0}); }}
                  style={{cursor:"pointer",color:BU_COLORS[drillBU.bu],fontWeight:700,transition:"opacity .15s"}}
                  onMouseEnter={e => e.target.style.opacity = "0.7"}
                  onMouseLeave={e => e.target.style.opacity = "1"}>
                  {BU_NAMES[drillBU.bu]}
                </span>
              ) : (
                <span style={{color:BU_COLORS[drillBU.bu],fontWeight:700}}>{BU_NAMES[drillBU.bu]}</span>
              )}
            </>
          )}
          {!drillBU && drillDiv && (
            <>
              <span style={{color:"#475569"}}>/</span>
              <span style={{color:BU_COLORS[drillDiv.bu],fontWeight:700}}>{BU_NAMES[drillDiv.bu]}</span>
            </>
          )}
          {drillDiv && (
            <>
              <span style={{color:"#475569"}}>/</span>
              <span style={{color:"#F1F5F9",fontWeight:700}}>{drillDiv.name}</span>
            </>
          )}
          <span style={{marginLeft:8,fontSize:10,color:"#64748B",padding:"3px 8px",borderRadius:4,
            background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)"}}>
            ESC to return
          </span>
        </div>
      )}

      {/* MAIN AREA: Treemap + Org Slider */}
      <div style={{padding:"8px 16px",display:"flex",gap:16}}>
        {/* TREEMAP VIEWPORT */}
        <div ref={viewRef} style={{
          flex:1,position:"relative",height:480,
          background:"#0F172A",borderRadius:16,
          border:"1px solid rgba(255,255,255,.05)",
          boxShadow:"inset 0 1px 0 rgba(255,255,255,.02), 0 12px 48px rgba(0,0,0,.5)",
          overflow:"hidden",cursor:isPanning?"grabbing":"grab",
        }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Future overlay — dims the map when viewing projected months */}
          {qI > NOW_IDX && (
            <div style={{position:"absolute",inset:0,background:"rgba(15,23,42,0.25)",zIndex:20,pointerEvents:"none",transition:"opacity 0.4s"}}/>
          )}

          {/* Transformed container */}
          <div ref={mapRef} style={{
            position:"absolute",
            left:16, top:16,
            width:mapW, height:mapH,
            transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
            transformOrigin:"top left",
            transition: isPanning ? "none" : "width 0.5s ease, height 0.5s ease",
          }}>
            {/* BU baskets — bordered for both Division and All views */}
            {rects.buBorders && rects.buBorders.map(br => {
              const isFirm = orgLevel === "firm";
              const zInv = 1/Math.sqrt(zoom);
              return (
              <div key={`bu_${br.id}`} style={{
                position:"absolute", left:br.x, top:br.y, width:br.w, height:br.h,
                border:`${1/zoom}px solid rgba(255,255,255,.12)`,
                borderRadius:8/zoom,
                background:"rgba(255,255,255,.02)",
              }}>
                <div style={{
                  position:"absolute",top:isFirm?2:4,left:isFirm?4:8,
                  fontSize:(isFirm ? 10 : 13) * zInv,
                  fontWeight:700,
                  color:"#FFFFFF",
                  letterSpacing:isFirm ? .6 : 1,
                  textTransform:"uppercase",
                  pointerEvents:"none",
                }}>
                  {br.name}
                </div>
              </div>
            );})}

            {/* Boxes — Semantic Zoom Tiers
                 LOW  (zoom ≤ 0.6): color dots only, no text
                 MED  (0.6 < zoom ≤ 1.3): acronym + health indicator
                 HIGH (zoom > 1.3): full titles, badges, metrics — zInv counter-scaled
            */}
            {rects.rects.map(r => {
              const d = r.d;
              const isOrgTile = r.type === "bu";
              const zone = d.zone || getZone(d);
              const isBuilding = zone.startsWith("build_");
              const isStalled = zone === "build_distressed";
              const isLive = zone.startsWith("prod_");
              const border = isOrgTile ? "none" : getBorder(d.dev, zone);
              const orgSystemicRisk = isOrgTile && (r.crimsonRatio || 0) > 0.3;
              const needsPulse = isOrgTile ? orgSystemicRisk : ((d.dev > .25 && isLive) || isStalled ||
                (d.phase === "building" && (d.budgetBurn||0) > ((d.milestones||0) + .15)) ||
                (d.phase === "building" && (d.lastActivity||0) > 60));
              const dimmed = (hotSeat && !isAtRisk(d)) || (activeZones.size > 0 && !activeZones.has(zone));
              const isProjected = !!d.projected;

              const isH = hovered === r.id;
              const isS = selected === r.id;

              // ─── SEMANTIC ZOOM TIER ───
              const zoomLow = zoom <= 0.6;
              const zoomMed = !zoomLow && zoom <= 1.3;
              const zoomHigh = !zoomLow && !zoomMed;

              // Counter-scaled gap: 5px visual on screen regardless of zoom
              const gap = 5 / zoom; // layout-space gap that appears as 5px after CSS scale(zoom)
              const bx = Math.max(r.w - gap * 2, 1), by = Math.max(r.h - gap * 2, 1);
              const rad = 6 / zoom; // counter-scaled border radius: 6px visual

              // Visual weight: larger tiles glow brighter to amplify size perception
              // r.value is the investment amount — compute relative weight vs max
              const valRatio = maxVal > 0 ? r.value / maxVal : 0; // 0..1
              const sizeGlow = valRatio > 0.5 ? `0 0 ${8 + 20 * valRatio}px rgba(255,255,255,${0.03 + 0.06 * valRatio})` : "none";

              // Common event handlers
              const handlers = {
                onClick: (e) => {
                  e.stopPropagation();
                  if (orgLevel === "bu" && !drillBU && r.type === "bu") {
                    setDrillBU({ bu: r.bu });
                    setSelected(null); setZoom(1); setPan({x:0,y:0});
                  } else if (orgLevel === "bu" && drillBU && !drillDiv && r.type === "division") {
                    setDrillDiv({ id: r.id, name: r.name, bu: r.bu });
                    setSelected(null); setZoom(1); setPan({x:0,y:0});
                  } else if (orgLevel === "div" && !drillDiv && r.type === "division") {
                    setDrillDiv({ id: r.id, name: r.name, bu: r.bu });
                    setSelected(null); setZoom(1); setPan({x:0,y:0});
                  } else {
                    setSelected(isS ? null : r.id);
                  }
                },
                onMouseEnter: (e) => { setHovered(r.id); if (!zoomHigh) setTooltip({ x: e.clientX, y: e.clientY, name: r.name, spend: d.spend, phase: d.phase, zone: d.zone, t12ROI: d.t12ROI, dev: d.dev }); },
                onMouseMove: (e) => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null),
                onMouseLeave: () => { setHovered(null); setTooltip(null); },
              };

              // ═══ LOW ZOOM: Color dots only — pure heatmap ═══
              if (zoomLow) return (
                <div key={r.id} className={`tb${(drillDiv||drillBU)?' drill-tile':''}`} {...handlers}
                  style={{left:r.x+gap,top:r.y+gap,width:bx,height:by,background:ZONE_GRAD[zone],
                    opacity:dimmed?.1:isProjected?0.4:(0.55 + 0.45 * valRatio),transition:"opacity 0.4s",
                    borderRadius:rad, border:isProjected?"1px dashed rgba(255,255,255,0.2)":"none",
                    boxShadow:sizeGlow}}>
                  {needsPulse && <CrimsonPulse/>}
                </div>
              );

              // ═══ MED ZOOM: Flat single-color tile ═══
              if (zoomMed) {
                const showText = bx > 28 && by > 22;
                const showData = bx > 50 && by > 40;
                const isLargeMed = bx > 100 && by > 50;
                const isMidMed = bx > 55 && by > 35;
                const momArrow = isOrgTile ? ((r.momentum||0) > .05 ? "▲" : (r.momentum||0) < -.05 ? "▼" : "—") : null;
                const momColor = isOrgTile ? ((r.momentum||0) > .05 ? "#34D399" : (r.momentum||0) < -.05 ? "#EF4444" : "rgba(255,255,255,0.5)") : null;
                const tileLabel = isOrgTile
                  ? (isLargeMed ? r.name : truncName(r.name, Math.max(10, Math.floor(bx / 7))))
                  : (isLargeMed ? r.name : isMidMed ? truncName(r.name, Math.max(10, Math.floor(bx / 7))) : abbrev(r.name));
                const titleFontSz = Math.max(10, Math.min(15, bx / 5)) * tS;
                return (
                  <div key={r.id} className={`tb${(drillDiv||drillBU)?' drill-tile':''}`} {...handlers}
                    style={{left:r.x+gap,top:r.y+gap,width:bx,height:by,
                      border: isProjected?"1px dashed rgba(255,255,255,0.2)":(border || "none"), borderRadius:rad,
                      opacity:dimmed?.1:isProjected?0.5:(0.6 + 0.4 * valRatio),transition:"opacity 0.4s",zIndex:isH?10:1,
                      boxShadow:sizeGlow}}>
                    {needsPulse && <CrimsonPulse/>}
                    {/* Flat background */}
                    <div style={{position:"absolute",inset:0,background:ZONE_GRAD[zone]}}/>
                    {/* Color-coded stripes for building tiles */}
                    {!isOrgTile && isBuilding && BUILD_STRIPE[zone] && (
                      <div style={{position:"absolute",inset:0,opacity:.7,
                        backgroundImage:`repeating-linear-gradient(135deg, ${BUILD_STRIPE[zone]}, ${BUILD_STRIPE[zone]} 10px, transparent 10px, transparent 20px)`}}/>
                    )}
                    {/* Content */}
                    {showText && (
                      <div style={{position:"relative",zIndex:3,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                        height:"100%",overflow:"hidden",padding:"6px 8px",gap:4}}>
                        <div style={{fontSize:titleFontSz,fontWeight:tW,letterSpacing:tLs,lineHeight:1.2,color:"#FFFFFF",
                          whiteSpace:isLargeMed?"normal":"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%",
                          textAlign:"center"}}>
                          {tileLabel}
                        </div>
                        {showData && (
                          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                            {isOrgTile && (
                              <>
                                <span style={{fontSize:Math.max(12, Math.min(15, bx/3.5))*tS,fontFamily:"'JetBrains Mono',monospace",fontWeight:tW,color:"#FFFFFF"}}>
                                  {d.t12ROI.toFixed(1)}x
                                </span>
                                <span style={{fontSize:Math.max(11, Math.min(13, bx/4))*tS,color:momColor,fontWeight:tW}}>{momArrow}</span>
                              </>
                            )}
                            {!isOrgTile && isLive && (
                              <>
                                <span style={{fontSize:Math.max(11, Math.min(14, bx/4))*tS,fontFamily:"'JetBrains Mono',monospace",fontWeight:tW,color:"#FFFFFF"}}>
                                  {d.t12ROI.toFixed(1)}x
                                </span>
                                {bx > 80 && <span style={{fontSize:10*tS,fontFamily:"'JetBrains Mono',monospace",fontWeight:tW,color:"#FFFFFF"}}>
                                  {fmt(d.spend)}
                                </span>}
                              </>
                            )}
                            {!isOrgTile && isBuilding && (
                              <span style={{fontSize:Math.max(10, Math.min(12, bx/5))*tS,color:"#FFFFFF",fontWeight:tW}}>
                                {isStalled ? "STALLED" : `${Math.round((d.milestones||0)*10)*10}% built`}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {(isLive || isBuilding) && bx > 20 && (
                      <ProgressBar pct={isLive ? (d.benefitPct||0) : (d.milestones||0)}/>
                    )}
                  </div>
                );
              }

              // ═══ HIGH ZOOM: Full content — partial counter-scale via 1/√zoom ═══
              // Text grows ~65% from 100%→285% (12px→20px on screen), not 1:1 with zoom
              const zInv = 1 / Math.sqrt(Math.max(zoom, 1.3));
              const isLaunch = isBuilding && !isStalled && d.daysToLive && d.daysToLive <= 30;
              const launchColor = d.confidence === "high" ? {bg:"rgba(6,95,70,0.35)",border:"1px solid rgba(52,211,153,0.4)",tx:"#6EE7B7"} :
                d.confidence === "medium" ? {bg:"rgba(251,191,36,0.2)",border:"1px solid rgba(251,191,36,0.3)",tx:"#FCD34D"} :
                {bg:"rgba(220,38,38,0.2)",border:"1px solid rgba(220,38,38,0.3)",tx:"#FCA5A5"};

              // Space tiers within high zoom — use effective visual size (layout × zoom)
              const ew = bx * zoom, eh = by * zoom;
              const isCompact = ew < 90 || eh < 65;
              const isMedium = !isCompact && (ew < 160 || eh < 100);
              const isFullSz = !isCompact && !isMedium;

              // Momentum arrow for high zoom org tiles
              const hiMomArrow = isOrgTile ? ((r.momentum||0) > .05 ? "▲" : (r.momentum||0) < -.05 ? "▼" : "—") : null;
              const hiMomColor = isOrgTile ? ((r.momentum||0) > .05 ? "#34D399" : (r.momentum||0) < -.05 ? "#EF4444" : "rgba(255,255,255,0.5)") : null;

              return (
                <div key={r.id} className={`tb${(drillDiv||drillBU)?' drill-tile':''}`} {...handlers}
                  style={{
                    left:r.x+gap, top:r.y+gap, width:bx, height:by,
                    border: isProjected?"1px dashed rgba(255,255,255,0.2)":(border || "none"), borderRadius:rad,
                    opacity: dimmed ? .1 : isProjected ? 0.5 : 1, transition:"opacity 0.4s",
                    zIndex:isH?10:1,
                    boxShadow:sizeGlow,
                  }}>
                  {needsPulse && <CrimsonPulse/>}

                  {/* Flat background */}
                  <div style={{position:"absolute",inset:0,background:ZONE_GRAD[zone]}}/>

                  {/* Color-coded stripes for building tiles */}
                  {!isOrgTile && isBuilding && BUILD_STRIPE[zone] && (
                    <div style={{position:"absolute",inset:0,opacity:.7,
                      backgroundImage:`repeating-linear-gradient(135deg, ${BUILD_STRIPE[zone]}, ${BUILD_STRIPE[zone]} ${10*zInv}px, transparent ${10*zInv}px, transparent ${20*zInv}px)`}}/>
                  )}

                  {/* Unified progress bar: benefit realization (prod) or milestone delivery (building) */}
                  {(isLive || isBuilding) && (
                    <ProgressBar pct={isLive ? (d.benefitPct||0) : (d.milestones||0)}/>
                  )}

                  {/* ── CONTENT (all font sizes × zInv) ── */}
                  <div style={{position:"relative",zIndex:3,
                    padding:isCompact?`${5*zInv}px ${6*zInv}px`:isMedium?`${7*zInv}px ${9*zInv}px`:`${10*zInv}px ${13*zInv}px`,
                    height:"100%",display:"flex",flexDirection:"column",justifyContent:"space-between",color:ZONE_TX[zone]}}>

                    {/* TOP: Identity */}
                    <div>
                      <div style={{fontSize:(isCompact?8:isMedium?10:12)*zInv*tS,fontWeight:tW,letterSpacing:tLs,lineHeight:1.2,color:"#FFFFFF",
                        overflow:"hidden",display:"-webkit-box",WebkitLineClamp:isCompact?1:2,WebkitBoxOrient:"vertical"}}>
                        {isCompact ? truncName(r.name, Math.max(8, Math.floor(bx*zoom / 8))) : r.name}
                      </div>

                      {/* Org tile: ROI + 3-month momentum arrow */}
                      {!isCompact && isOrgTile && (
                        <div style={{marginTop:4*zInv,display:"flex",gap:5*zInv,alignItems:"center"}}>
                          <span style={{fontSize:(isMedium?11:13)*zInv*tS,fontFamily:"'JetBrains Mono',monospace",fontWeight:tW,color:"#FFFFFF"}}>
                            {d.t12ROI.toFixed(1)}x
                          </span>
                          <span style={{fontSize:(isMedium?10:12)*zInv*tS,fontWeight:tW,color:hiMomColor}}>{hiMomArrow}</span>
                          <span style={{fontSize:7*zInv*tS,fontWeight:tW,color:"#FFFFFF",opacity:.7}}>3mo</span>
                        </div>
                      )}

                      {!isCompact && !isOrgTile && (
                        <div style={{marginTop:4*zInv,display:"flex",gap:5*zInv,alignItems:"center",flexWrap:"wrap"}}>
                          {isLaunch ? (
                            <span style={{display:"inline-block",fontSize:8*zInv,fontWeight:800,textTransform:"uppercase",letterSpacing:1,padding:`${3*zInv}px ${8*zInv}px`,borderRadius:4,background:launchColor.bg,color:launchColor.tx,border:launchColor.border}}>
                              LAUNCH T-{d.daysToLive}d
                            </span>
                          ) : isStalled ? (
                            <span style={{fontSize:7*zInv,fontWeight:700,textTransform:"uppercase",letterSpacing:1.3,padding:`${2.5*zInv}px ${7*zInv}px`,borderRadius:3,background:"rgba(155,0,0,0.3)",color:"#FCA5A5",border:"1px solid rgba(155,0,0,0.3)"}}>
                              STALLED
                            </span>
                          ) : (
                            <span style={{fontSize:7*zInv,fontWeight:700,textTransform:"uppercase",letterSpacing:1.3,padding:`${2.5*zInv}px ${7*zInv}px`,borderRadius:3,
                              background:isBuilding?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.3)",
                              color:ZONE_BADGE[zone]}}>
                              {PHASE_LABEL[d.phase]}
                            </span>
                          )}

                          {/* Story badges */}
                          {isFullSz && zone === "prod_underperforming" && d.velocity && <VelocityBadge velocity={d.velocity} zInv={zInv}/>}
                          {isFullSz && zone === "prod_nonperforming" && d.rootCause && <RootCauseIcon cause={d.rootCause} zInv={zInv}/>}
                        </div>
                      )}
                    </div>

                    {/* BOTTOM: Data Glass zone (full size) */}
                    {isFullSz && (
                      <div style={{lineHeight:1.5,position:"relative",zIndex:4}}>
                        {zone === "prod_performing" && d.surplus > 0 && (
                          <div style={{fontSize:9*zInv*tS,fontWeight:tW,color:"#6EE7B7",marginBottom:2*zInv,display:"flex",alignItems:"center",gap:3*zInv}}>
                            <span style={{fontSize:10*zInv*tS}}>▲</span>+{fmt(d.surplus)} surplus
                          </div>
                        )}

                        {isStalled ? (
                          <div style={{fontSize:8*zInv*tS,fontWeight:tW,color:"#FCA5A5",marginBottom:2*zInv,display:"flex",alignItems:"center",gap:3*zInv}}>
                            <span style={{fontSize:9*zInv*tS}}>⚠</span>{fmt(d.spend)} sunk
                            {d.lastActivity > 0 && <span style={{fontSize:7*zInv*tS,opacity:.7,marginLeft:4*zInv}}>· {Math.round(d.lastActivity/30)}mo dark</span>}
                          </div>
                        ) : (
                          <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:tW,fontSize:9*zInv*tS,color:"#FFFFFF"}}>
                            {fmt(d.spend)}
                          </div>
                        )}

                        {isLive && (
                          <div style={{display:"flex",alignItems:"baseline",gap:4*zInv}}>
                            <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:tW,fontSize:13*zInv*tS,letterSpacing:"-.5px",color:"#FFFFFF"}}>{d.t12ROI.toFixed(1)}x</span>
                            <span style={{fontSize:7*zInv*tS,color:"#FFFFFF",fontWeight:tW,opacity:.7}}>12mo</span>
                          </div>
                        )}

                        {d.dev > .05 && isLive && (
                          <div style={{fontSize:8*zInv*tS,fontWeight:tW,color:d.dev>.25?"#FCA5A5":"#FFFFFF"}}>
                            +{(d.dev*100).toFixed(0)}% over budget
                          </div>
                        )}

                        {isBuilding && !isStalled && (
                          <div style={{fontSize:8*zInv*tS,color:"#FFFFFF",fontWeight:tW}}>
                            {Math.round((d.milestones||0)*10)*10}% built
                          </div>
                        )}
                      </div>
                    )}

                    {/* Medium: compact spend + ROI */}
                    {isMedium && (
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8*zInv*tS,fontWeight:tW,color:"#FFFFFF"}}>
                        {fmt(d.spend)}
                        {isLive && <span style={{marginLeft:5*zInv,fontSize:8*zInv*tS,fontWeight:tW,color:"#FFFFFF"}}>{d.t12ROI.toFixed(1)}x</span>}
                      </div>
                    )}

                    {/* Compact: just spend */}
                    {isCompact && eh > 40 && (
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:7.5*zInv*tS,fontWeight:600,color:"#FFFFFF"}}>
                        {fmt(d.spend)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>


          {/* DETAIL PANEL (dark theme) */}
          {selItem && (
            <div className="dp" onClick={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}>
              <button className="dc" onClick={() => setSelected(null)}>✕</button>

              <div style={{marginBottom:20}}>
                {orgLevel !== "firm" && selItem.bu && (
                  <div style={{fontSize:10,fontWeight:600,color:BU_COLORS[selItem.bu],marginBottom:4}}>{BU_NAMES[selItem.bu]}</div>
                )}
                <span className="st" style={{
                  background: ZONE_GRAD[selItem.d.zone] || "rgba(255,255,255,.06)",
                  color:"#FFFFFF",fontSize:8,padding:"3px 10px"
                }}>{PHASE_LABEL[selItem.d.phase]}</span>
                <h2 style={{fontSize:20,fontWeight:700,marginTop:8,color:"#F1F5F9"}}>{selItem.name}</h2>
                {showingInits && <div style={{fontSize:12,color:"#D1D5DB",marginTop:2}}>{selItem.cat} · {selItem.owner}</div>}
                {!showingInits && selItem.bu && <div style={{fontSize:12,color:"#D1D5DB",marginTop:2}}>{BU_NAMES[selItem.bu]}</div>}
              </div>

              {/* Lifecycle Chart (initiative tiles only) */}
              {showingInits && selTL && (
                <LifecycleChart tl={selTL} qKey={qKey} committedB={selItem.d.committedB} budget={selItem.d.budget}/>
              )}

              {/* Key numbers grid (initiative tiles) */}
              {showingInits && (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                  {selItem.d.phase !== "building" && (
                    <div style={{background:"rgba(255,255,255,.03)",borderRadius:8,padding:"10px 12px",border:"1px solid rgba(255,255,255,.05)"}}>
                      <div style={{fontSize:9,fontWeight:600,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:.8}}>12mo ROI</div>
                      <div style={{fontFamily:"'JetBrains Mono'",fontSize:22,fontWeight:700,lineHeight:1.2,marginTop:2,
                        color:selItem.d.t12ROI>=.8?"#6EE7B7":selItem.d.t12ROI>=.1?"#FCD34D":"#FCA5A5"}}>{selItem.d.t12ROI.toFixed(2)}x</div>
                    </div>
                  )}
                  {selItem.d.phase !== "building" && (
                    <div style={{background:"rgba(255,255,255,.03)",borderRadius:8,padding:"10px 12px",border:"1px solid rgba(255,255,255,.05)"}}>
                      <div style={{fontSize:9,fontWeight:600,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:.8}}>Lifetime ROI</div>
                      <div style={{fontFamily:"'JetBrains Mono'",fontSize:22,fontWeight:700,lineHeight:1.2,marginTop:2,
                        color:selItem.d.lifetimeROI>=.8?"#6EE7B7":selItem.d.lifetimeROI>=.1?"#FCD34D":"#FCA5A5"}}>{selItem.d.lifetimeROI.toFixed(2)}x</div>
                    </div>
                  )}
                  <div style={{background:"rgba(255,255,255,.03)",borderRadius:8,padding:"10px 12px",border:"1px solid rgba(255,255,255,.05)"}}>
                    <div style={{fontSize:9,fontWeight:600,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:.8}}>Total Spend</div>
                    <div style={{fontFamily:"'JetBrains Mono'",fontSize:16,fontWeight:700,lineHeight:1.2,marginTop:2,color:"#FFFFFF"}}>{fmt(selItem.d.spend)}</div>
                  </div>
                  <div style={{background:"rgba(255,255,255,.03)",borderRadius:8,padding:"10px 12px",border:"1px solid rgba(255,255,255,.05)"}}>
                    <div style={{fontSize:9,fontWeight:600,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:.8}}>Budget</div>
                    <div style={{fontFamily:"'JetBrains Mono'",fontSize:16,fontWeight:700,lineHeight:1.2,marginTop:2,color:"#FFFFFF"}}>{fmt(selItem.d.budget)}</div>
                    {selItem.d.dev > .005 && <div style={{fontSize:9,fontWeight:600,color:"#FCA5A5",marginTop:1}}>+{(selItem.d.dev*100).toFixed(0)}% over</div>}
                  </div>
                  {selItem.d.goLiveQ && (() => {
                    const glI = QS.findIndex(q => q.key === selItem.d.goLiveQ);
                    const nowI = QS.findIndex(q => q.key === qKey);
                    const diff = nowI - glI;
                    const isLive = selItem.d.phase !== "building";
                    return (
                      <div style={{background:"rgba(255,255,255,.03)",borderRadius:8,padding:"10px 12px",border:"1px solid rgba(255,255,255,.05)"}}>
                        <div style={{fontSize:9,fontWeight:600,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:.8}}>{isLive ? "Live For" : "To Go-Live"}</div>
                        <div style={{fontFamily:"'JetBrains Mono'",fontSize:16,fontWeight:700,lineHeight:1.2,marginTop:2,color:isLive?"#6EE7B7":"#94A3B8"}}>
                          {isLive ? `${Math.max(diff,0)} mo` : `${Math.max(-diff,0)} mo`}
                        </div>
                      </div>
                    );
                  })()}
                  {selItem.d.phase !== "building" && (
                    <div style={{background:"rgba(255,255,255,.03)",borderRadius:8,padding:"10px 12px",border:"1px solid rgba(255,255,255,.05)"}}>
                      <div style={{fontSize:9,fontWeight:600,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:.8}}>12mo Net</div>
                      <div style={{fontFamily:"'JetBrains Mono'",fontSize:16,fontWeight:700,lineHeight:1.2,marginTop:2,
                        color:selItem.d.t12Benefit-selItem.d.t12Spend>=0?"#6EE7B7":"#FCA5A5"}}>{fmt(selItem.d.t12Benefit-selItem.d.t12Spend)}</div>
                    </div>
                  )}
                  {selItem.d.phase === "building" && (
                    <div style={{background:"rgba(255,255,255,.03)",borderRadius:8,padding:"10px 12px",border:"1px solid rgba(255,255,255,.05)"}}>
                      <div style={{fontSize:9,fontWeight:600,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:.8}}>Progress</div>
                      <div style={{fontFamily:"'JetBrains Mono'",fontSize:16,fontWeight:700,lineHeight:1.2,marginTop:2,color:"#FFFFFF"}}>{selItem.d.milestonesHit}/{selItem.d.totalMilestones} milestones</div>
                    </div>
                  )}
                  {selItem.d.phase === "building" && selItem.d.blocker && (
                    <div style={{background:"rgba(255,255,255,.03)",borderRadius:8,padding:"10px 12px",border:"1px solid rgba(255,255,255,.05)"}}>
                      <div style={{fontSize:9,fontWeight:600,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:.8}}>Blocker</div>
                      <div style={{fontSize:13,fontWeight:700,lineHeight:1.2,marginTop:2,color:"#FCA5A5"}}>🔗 {selItem.d.blocker}</div>
                    </div>
                  )}
                  {selItem.d.phase === "building" && selItem.d.confidence && (
                    <div style={{background:"rgba(255,255,255,.03)",borderRadius:8,padding:"10px 12px",border:"1px solid rgba(255,255,255,.05)"}}>
                      <div style={{fontSize:9,fontWeight:600,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:.8}}>Confidence</div>
                      <div style={{fontSize:13,fontWeight:700,lineHeight:1.2,marginTop:2,
                        color:selItem.d.confidence==="high"?"#6EE7B7":selItem.d.confidence==="medium"?"#FCD34D":"#FCA5A5"}}>{selItem.d.confidence.toUpperCase()}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Budget bar (org tiles only — initiatives show budget in grid above) */}
              {!showingInits && (
                <div style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:5}}>
                    <span style={{color:"#9CA3AF",fontWeight:600}}>Budget</span>
                    <span style={{fontFamily:"'JetBrains Mono'",fontWeight:600,fontSize:12,color:"#FFFFFF"}}>{fmt(selItem.d.spend)} / {fmt(selItem.d.budget)}</span>
                  </div>
                  <div className="bt"><div className="bf" style={{
                    width:`${Math.min((selItem.d.spend/Math.max(selItem.d.budget*(1+(selItem.d.dev||0)),1))*100,100)}%`,
                    background:selItem.d.dev>.2?"linear-gradient(90deg,#F97316,#DC2626)":selItem.d.dev>.05?"linear-gradient(90deg,#FBBF24,#F59E0B)":"linear-gradient(90deg,#34D399,#059669)"
                  }}/></div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#94A3B8",marginTop:3}}>
                    <span>Original</span>
                    <span style={{fontWeight:600,color:selItem.d.dev>.005?"#FCA5A5":"#9CA3AF"}}>
                      {selItem.d.dev>.005?`+${(selItem.d.dev*100).toFixed(0)}% over`:selItem.d.dev<-.02?`${(Math.abs(selItem.d.dev)*100).toFixed(0)}% under`:"On budget"}
                    </span>
                  </div>
                </div>
              )}

              {/* Phase breakdown for BU/Div (not in drill-down) */}
              {!showingInits && selItem.d.phases && (
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:10,fontWeight:600,color:"#9CA3AF",marginBottom:6}}>Phase Breakdown</div>
                  <div className="mini-bar">
                    {(()=>{
                      const buildCnt = selItem.d.phases["building"]||0;
                      const liveCnt = (selItem.d.phases["value_capture"]||0)+(selItem.d.phases["commitment_met"]||0)+(selItem.d.phases["declining"]||0);
                      return <>
                        {buildCnt > 0 && <div style={{flex:buildCnt,background:"#334155",borderRadius:2}} title={`Building: ${buildCnt}`}/>}
                        {liveCnt > 0 && <div style={{flex:liveCnt,background:"#1A5C44",borderRadius:2}} title={`Live: ${liveCnt}`}/>}
                      </>;
                    })()}
                  </div>
                  <div style={{display:"flex",gap:10,marginTop:6,flexWrap:"wrap"}}>
                    {(()=>{
                      const buildCnt = selItem.d.phases["building"]||0;
                      const liveCnt = (selItem.d.phases["value_capture"]||0)+(selItem.d.phases["commitment_met"]||0)+(selItem.d.phases["declining"]||0);
                      return <>
                        {buildCnt > 0 && <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#FFFFFF"}}>
                          <div style={{width:7,height:7,borderRadius:2,background:"#334155"}}/>Building: {buildCnt}
                        </div>}
                        {liveCnt > 0 && <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#FFFFFF"}}>
                          <div style={{width:7,height:7,borderRadius:2,background:"#1A5C44"}}/>Live: {liveCnt}
                        </div>}
                      </>;
                    })()}
                  </div>
                </div>
              )}

              {/* Initiative list for BU/Div (not in drill-down) */}
              {!showingInits && selChildren.length > 0 && (
                <div>
                  <div style={{fontSize:10,fontWeight:600,color:"#9CA3AF",marginBottom:8,textTransform:"uppercase",letterSpacing:.8}}>Initiatives</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {selChildren.sort((a,b) => b.d.spend - a.d.spend).map(ch => {
                      const cc = boxColor(ch.d.phase, ch.d.t12ROI);
                      return (
                        <div key={ch.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",
                          background:"rgba(255,255,255,.03)",borderRadius:8,borderLeft:`4px solid ${cc.bg}`,border:"1px solid rgba(255,255,255,.04)"}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:600,color:"#E2E8F0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ch.name}</div>
                            <div style={{fontSize:10,color:"#94A3B8"}}>{fmt(ch.d.spend)} invested</div>
                          </div>
                          <div style={{textAlign:"right",flexShrink:0}}>
                            {ch.d.phase !== "building" ? (
                              <div style={{fontFamily:"'JetBrains Mono'",fontSize:14,fontWeight:700,
                                color:ch.d.t12ROI>=.8?"#6EE7B7":ch.d.t12ROI>=.1?"#FCD34D":"#FCA5A5"}}>
                                {ch.d.t12ROI.toFixed(1)}x
                              </div>
                            ) : (
                              <span className="st" style={{background:"rgba(255,255,255,.08)",color:"#94A3B8",fontSize:7}}>BUILD</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Initiative details */}
              {showingInits && (
                <div style={{background:"rgba(255,255,255,.03)",borderRadius:10,padding:12,fontSize:12,lineHeight:2,border:"1px solid rgba(255,255,255,.05)"}}>
                  {[["Go-live",fmtMonthKey(selItem.d.goLiveQ)],["Target End",fmtMonthKey(selItem.d.endQ)],["Owner",selItem.owner||""],["Category",selItem.cat||""]].filter(([,v])=>v).map(([k,v])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{color:"#9CA3AF"}}>{k}</span><span style={{fontWeight:600,color:"#FFFFFF"}}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ORG SLIDER — vertical, same pattern as timeline */}
        {(() => {
          // BU=2 (top), DIV=1 (mid, default), FIRM=0 (bottom) — because rotate(-90deg) flips min→bottom, max→top
          const orgVal = orgLevel==="bu"?2:orgLevel==="div"?1:0;
          const fillPct = ((2-orgVal)/2)*100; // fill from top (BU) down to current
          const labels = [{key:"bu",label:"BU",pos:0},{key:"div",label:"Division",pos:50},{key:"firm",label:"All",pos:100}];
          return (
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",width:90,flexShrink:0}}>
              {/* Labels on the left */}
              <div style={{position:"relative",height:160,width:40,marginRight:8}}>
                {labels.map(l=>(
                  <span key={l.key} onClick={()=>{setOrgLevel(l.key);setSelected(null);}}
                    style={{position:"absolute",top:`${l.pos}%`,transform:"translateY(-50%)",
                      fontSize:12,fontFamily:"'JetBrains Mono',monospace",letterSpacing:.5,cursor:"pointer",
                      fontWeight:orgLevel===l.key?700:500,
                      color:orgLevel===l.key?"#FFFFFF":"#9CA3AF",
                      transition:"color .15s,font-weight .15s"
                    }}>{l.label}</span>
                ))}
              </div>
              {/* Vertical track wrapper */}
              <div style={{position:"relative",width:22,height:160,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <input type="range" min={0} max={2} step={1}
                  value={orgVal}
                  onChange={e=>{const v=parseInt(e.target.value);setOrgLevel(v===2?"bu":v===1?"div":"firm");setSelected(null);}}
                  className="org-sl"
                  style={{
                    background:`linear-gradient(to right, rgba(255,255,255,.08) ${fillPct}%, rgba(241,245,249,.35) ${fillPct}%)`,
                  }}/>
              </div>
            </div>
          );
        })()}
      </div>


      {/* Hover tooltip */}
      {tooltip && (
        <div style={{
          position:"fixed", left:tooltip.x+14, top:tooltip.y-12, zIndex:9999,
          background:"#1E293B", color:"white", padding:"10px 14px",
          borderRadius:10, fontSize:11, fontFamily:"'DM Sans',sans-serif",
          boxShadow:"0 8px 32px rgba(0,0,0,.5)", pointerEvents:"none",
          maxWidth:240, lineHeight:1.5, border:"1px solid rgba(255,255,255,.08)"
        }}>
          <div style={{fontWeight:700,fontSize:12,marginBottom:2}}>{tooltip.name}</div>
          <div style={{color:"#9CA3AF",fontSize:10}}>{PHASE_LABEL[tooltip.phase]}</div>
          <div style={{fontFamily:"'JetBrains Mono'",fontWeight:600,marginTop:3}}>{fmt(tooltip.spend)}</div>
          {tooltip.phase !== "building" && tooltip.phase !== "future" && (
            <div style={{fontFamily:"'JetBrains Mono'",fontWeight:600,
              color:tooltip.t12ROI>=.8?"#6EE7B7":tooltip.t12ROI>=.1?"#FCD34D":"#FCA5A5"}}>
              {tooltip.t12ROI.toFixed(1)}x ROI
            </div>
          )}
          {tooltip.dev > .05 && <div style={{color:"#FCA5A5",fontSize:10,fontWeight:600}}>+{(tooltip.dev*100).toFixed(0)}% over budget</div>}
        </div>
      )}
    </div>
  );
}
