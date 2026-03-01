import { useState, useMemo, useRef, useEffect, useCallback } from "react";

/* ═══════════════════════════════════════════
   QUARTERS  (2023Q1 → 2030Q4)
   Timeline spans 2023-2030 but slider only shows Q4 2025 → Q4 2030
   ═══════════════════════════════════════════ */
const QS = [];
for (let y = 2023; y <= 2030; y++) for (let q = 1; q <= 4; q++) QS.push({ y, q, key: `${y}Q${q}` });
const qi = (y, q) => QS.findIndex((x) => x.y === y && x.q === q);
const SLIDER_MIN = qi(2025, 4); // index 11 — first visible quarter

/* ═══════════════════════════════════════════
   SEEDED RNG  (deterministic for reproducibility)
   ═══════════════════════════════════════════ */
let _seed = 20251031;
function rng() { _seed = (_seed * 16807 + 0) % 2147483647; return _seed / 2147483647; }
function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
function rBetween(a, b) { return a + rng() * (b - a); }
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ═══════════════════════════════════════════
   TIMELINE BUILDER
   ═══════════════════════════════════════════ */
function mkTL(sy, sq, ey, eq, o) {
  const si = qi(sy, sq), ei = qi(ey, eq), bi = qi(o.bY, o.bQ);
  const ci = o.cY ? qi(o.cY, o.cQ) : null;
  const tQ = ei - si + 1, adj = o.budget * (1 + o.dev);
  let cS = 0, cB = 0; const snaps = [];
  return QS.map((qr, i) => {
    let qSp = 0, qBn = 0;
    if (i >= si && i <= (ci ?? ei)) {
      const p = (i - si) / Math.max(tQ - 1, 1);
      qSp = adj * (o.sS === "front" ? (1 - p * .55) / tQ : 1 / tQ); cS += qSp;
    }
    if (ci !== null && i > ci) { qSp = o.budget * .015; cS += qSp; }
    if (ci === null && i > ei) { qSp = o.budget * .02; cS += qSp; }
    if (i >= bi) {
      const bp = Math.min((i - bi) / Math.max(QS.length - bi - 5, 8), 1);
      const bf = o.bS === "slow" ? Math.pow(bp, 2.3) : o.bS === "ramp" ? Math.pow(bp, 1.5) : bp;
      const nB = o.maxB * bf;
      if (nB >= o.maxB * .95 && o.oBpQ) { qBn = o.oBpQ * (.8 + Math.sin(i * 1.7) * .2); cB += qBn; }
      else { qBn = Math.max(nB - cB, 0); cB = Math.max(cB, nB); }
    }
    snaps.push({ qSp, qBn });
    const l4 = snaps.slice(Math.max(0, snaps.length - 4));
    const t12S = l4.reduce((s, x) => s + x.qSp, 0), t12B = l4.reduce((s, x) => s + x.qBn, 0);
    const completed = ci !== null && i >= ci, commitMet = cB >= o.maxB * .95;
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
      actualBudget: Math.round(adj), dev: o.dev, committedB: o.maxB, phase,
      t12ROI: Math.round(t12R * 100) / 100, t12Spend: Math.round(t12S), t12Benefit: Math.round(t12B),
      lifetimeROI: cS > 0 ? Math.round((cB / cS) * 100) / 100 : 0, benefitPct: bPct,
      surplus: Math.round(surplus), goLiveQ: QS[bi]?.key || "", endQ: `${ey}Q${eq}` };
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
   ═══════════════════════════════════════════ */
const FLAGSHIPS = [
  // Wave 1 — Enterprise Platforms (started pre-2025, big budget, some already live)
  {id:"copilot",name:"M365 Copilot",cat:"Enterprise AI Platform",bu:"Tech",div:"ENTERPRISE TECH & SERVICES",
    sY:2024,sQ:1,eY:2030,eQ:4,bY:2024,bQ:4,budget:45e6,maxB:68e6,sS:"front",bS:"slow",dev:.10,perp:true},
  {id:"chatgpt",name:"ChatGPT Enterprise",cat:"Enterprise AI Platform",bu:"Tech",div:"Innovation",
    sY:2024,sQ:2,eY:2030,eQ:4,bY:2025,bQ:1,budget:22e6,maxB:35e6,sS:"steady",bS:"steady",dev:.06,perp:true},
  {id:"ghcopilot",name:"GitHub Copilot",cat:"Enterprise AI Platform",bu:"Tech",div:"ENTERPRISE TECH & SERVICES",
    sY:2024,sQ:1,eY:2030,eQ:4,bY:2024,bQ:3,budget:18e6,maxB:42e6,sS:"steady",bS:"ramp",dev:.04,perp:true},
  {id:"agentplatform",name:"Agentic AI Platform",cat:"Enterprise AI Platform",bu:"Tech",div:"Innovation",
    sY:2025,sQ:1,eY:2029,eQ:4,bY:2026,bQ:2,budget:35e6,maxB:80e6,sS:"steady",bS:"slow",dev:.02,perp:false},
  {id:"genaiplatform",name:"GenAI Platform",cat:"Enterprise AI Platform",bu:"Tech",div:"Innovation",
    sY:2024,sQ:3,eY:2029,eQ:2,bY:2025,bQ:3,budget:28e6,maxB:55e6,sS:"front",bS:"slow",dev:.08,perp:false},
  {id:"mlops",name:"ML Ops Pipeline",cat:"Enterprise AI Platform",bu:"Tech",div:"ENTERPRISE TECH & SERVICES",
    sY:2024,sQ:2,eY:2028,eQ:4,bY:2025,bQ:2,budget:15e6,maxB:30e6,sS:"steady",bS:"ramp",dev:.05,perp:false},

  // Wave 1-2 — Compliance & Risk (early, high priority)
  {id:"fraud",name:"Fraud Detection ML",cat:"Risk & Compliance",bu:"OPS",div:"Firmwide Ops",
    sY:2023,sQ:3,eY:2026,eQ:2,bY:2024,bQ:3,budget:16e6,maxB:48e6,sS:"front",bS:"ramp",dev:-.06,perp:false,cY:2026,cQ:2},
  {id:"kyc",name:"KYC/AML Automation",cat:"Risk & Compliance",bu:"Co",div:"Legal and Compliance",
    sY:2024,sQ:1,eY:2027,eQ:2,bY:2025,bQ:1,budget:14e6,maxB:38e6,sS:"front",bS:"ramp",dev:.12,perp:false},
  {id:"amlmon",name:"AML Transaction Monitoring",cat:"Risk & Compliance",bu:"Co",div:"Risk Management",
    sY:2024,sQ:2,eY:2027,eQ:4,bY:2025,bQ:2,budget:12e6,maxB:32e6,sS:"front",bS:"ramp",dev:.08,perp:false},
  {id:"regreport",name:"Regulatory Reporting AI",cat:"Risk & Compliance",bu:"Co",div:"Finance",
    sY:2024,sQ:3,eY:2027,eQ:1,bY:2025,bQ:3,budget:10e6,maxB:24e6,sS:"front",bS:"ramp",dev:.18,perp:false},
  {id:"tradesurv",name:"Trade Surveillance AI",cat:"Risk & Compliance",bu:"Co",div:"Internal Audit",
    sY:2025,sQ:1,eY:2028,eQ:2,bY:2026,bQ:1,budget:9e6,maxB:22e6,sS:"steady",bS:"ramp",dev:.05,perp:false},

  // Wave 2-3 — Trading & Markets (ISG)
  {id:"tradingai",name:"Trading Analytics AI",cat:"Trading & Markets",bu:"ISG",div:"Institutional Equity Division",
    sY:2024,sQ:2,eY:2028,eQ:4,bY:2025,bQ:2,budget:28e6,maxB:75e6,sS:"steady",bS:"slow",dev:.15,perp:false},
  {id:"eqresearch",name:"Equity Research Copilot",cat:"Trading & Markets",bu:"ISG",div:"Research",
    sY:2024,sQ:3,eY:2028,eQ:2,bY:2025,bQ:3,budget:12e6,maxB:28e6,sS:"steady",bS:"ramp",dev:.03,perp:false},
  {id:"fipricing",name:"Fixed Income Pricing AI",cat:"Trading & Markets",bu:"ISG",div:"Fixed Income Division",
    sY:2024,sQ:4,eY:2028,eQ:3,bY:2025,bQ:4,budget:18e6,maxB:45e6,sS:"steady",bS:"slow",dev:.10,perp:false},
  {id:"algoopt",name:"Algo Execution Optimizer",cat:"Trading & Markets",bu:"ISG",div:"Institutional Equity Division",
    sY:2025,sQ:2,eY:2029,eQ:1,bY:2026,bQ:2,budget:20e6,maxB:50e6,sS:"steady",bS:"slow",dev:.07,perp:false},

  // Wave 2-3 — Wealth Management
  {id:"clientins",name:"Client Insights Engine",cat:"Client Experience",bu:"WM",div:"WM Client Segments",
    sY:2024,sQ:2,eY:2027,eQ:4,bY:2025,bQ:2,budget:14e6,maxB:38e6,sS:"front",bS:"ramp",dev:.09,perp:false},
  {id:"wmadvisory",name:"WM Advisory AI",cat:"Wealth Advisory",bu:"WM",div:"WM Global Investment Office",
    sY:2024,sQ:4,eY:2028,eQ:2,bY:2025,bQ:4,budget:16e6,maxB:40e6,sS:"steady",bS:"ramp",dev:.06,perp:false},
  {id:"nba",name:"Next Best Action Engine",cat:"Client Experience",bu:"WM",div:"Wealth Management Field",
    sY:2025,sQ:1,eY:2028,eQ:4,bY:2026,bQ:1,budget:11e6,maxB:28e6,sS:"steady",bS:"ramp",dev:.04,perp:false},
  {id:"portrebal",name:"Portfolio Rebalancer AI",cat:"Wealth Advisory",bu:"WM",div:"Investment Solutions",
    sY:2025,sQ:2,eY:2028,eQ:3,bY:2026,bQ:2,budget:8e6,maxB:20e6,sS:"steady",bS:"ramp",dev:.02,perp:false},

  // Wave 2-3 — Investment Management
  {id:"quantai",name:"Quant Strategy AI",cat:"Trading & Markets",bu:"IM",div:"Active Fundamental Equity",
    sY:2024,sQ:2,eY:2028,eQ:2,bY:2025,bQ:2,budget:18e6,maxB:48e6,sS:"steady",bS:"slow",dev:.11,perp:false},
  {id:"portopt",name:"Portfolio Optimization AI",cat:"Data & Analytics",bu:"IM",div:"Solutions & Multi-Asset",
    sY:2024,sQ:4,eY:2028,eQ:4,bY:2025,bQ:4,budget:12e6,maxB:30e6,sS:"steady",bS:"ramp",dev:.07,perp:false},
  {id:"esg",name:"ESG Analytics Platform",cat:"Data & Analytics",bu:"IM",div:"Real Assets",
    sY:2025,sQ:1,eY:2028,eQ:2,bY:2026,bQ:1,budget:8e6,maxB:18e6,sS:"steady",bS:"ramp",dev:.00,perp:false},

  // Wave 2 — Operations
  {id:"docauto",name:"Doc Automation Platform",cat:"Operations & Automation",bu:"OPS",div:"Firmwide Ops",
    sY:2024,sQ:2,eY:2027,eQ:2,bY:2025,bQ:1,budget:10e6,maxB:26e6,sS:"front",bS:"ramp",dev:.22,perp:false},
  {id:"contractai",name:"Contract Review AI",cat:"Operations & Automation",bu:"Co",div:"Legal and Compliance",
    sY:2024,sQ:3,eY:2027,eQ:1,bY:2025,bQ:3,budget:7e6,maxB:18e6,sS:"front",bS:"ramp",dev:.14,perp:false},

  // Wave 2 — Company / HR
  {id:"hrcopilot",name:"HR Service Copilot",cat:"Enterprise AI Platform",bu:"Co",div:"Human Capital Management",
    sY:2025,sQ:1,eY:2027,eQ:4,bY:2025,bQ:4,budget:5e6,maxB:12e6,sS:"steady",bS:"ramp",dev:.03,perp:false},
  {id:"talent",name:"Talent Analytics AI",cat:"Data & Analytics",bu:"Co",div:"Human Capital Management",
    sY:2025,sQ:2,eY:2028,eQ:1,bY:2026,bQ:2,budget:4e6,maxB:9e6,sS:"steady",bS:"ramp",dev:.00,perp:false},
  {id:"compltrain",name:"Compliance Training AI",cat:"Risk & Compliance",bu:"Co",div:"Legal and Compliance",
    sY:2025,sQ:3,eY:2028,eQ:2,bY:2026,bQ:3,budget:3e6,maxB:7e6,sS:"steady",bS:"ramp",dev:.05,perp:false},

  // Data & Analytics flagships
  {id:"client360",name:"Client 360 Data Platform",cat:"Data & Analytics",bu:"Tech",div:"ENTERPRISE TECH & SERVICES",
    sY:2024,sQ:3,eY:2028,eQ:4,bY:2025,bQ:4,budget:20e6,maxB:45e6,sS:"front",bS:"slow",dev:.13,perp:false},
  {id:"datacat",name:"Enterprise Data Catalog",cat:"Data & Analytics",bu:"Tech",div:"ENTERPRISE TECH & SERVICES",
    sY:2024,sQ:4,eY:2028,eQ:2,bY:2025,bQ:4,budget:10e6,maxB:22e6,sS:"steady",bS:"ramp",dev:.06,perp:false},
];

/* ═══════════════════════════════════════════
   INITIATIVE GENERATOR
   ~100 at Q4 2025, growing to ~300 by Q4 2030
   ═══════════════════════════════════════════ */
function genInitiatives() {
  const inits = [];
  let idCounter = 0;

  // Add flagships first
  FLAGSHIPS.forEach(f => {
    inits.push({
      id: f.id, name: f.name, cat: f.cat, owner: f.bu, bu: f.bu, div: f.div,
      tl: mkTL(f.sY, f.sQ, f.eY, f.eQ, {
        budget: f.budget, sS: f.sS, bY: f.bY, bQ: f.bQ, maxB: f.maxB, bS: f.bS,
        dev: f.dev, cY: f.cY || null, cQ: f.cQ || null,
        oBpQ: f.perp ? f.maxB * .05 : f.maxB * .06
      })
    });
  });

  // BU weight distribution (how many initiatives per BU, roughly)
  const buWeights = { Tech: .20, ISG: .22, WM: .20, IM: .14, OPS: .12, Co: .12 };
  // Category affinity per BU
  const buCatAffinity = {
    Tech: ["Enterprise AI Platform","Data & Analytics","Operations & Automation"],
    ISG: ["Trading & Markets","Data & Analytics","Client Experience","Risk & Compliance"],
    WM: ["Wealth Advisory","Client Experience","Data & Analytics","Operations & Automation"],
    IM: ["Trading & Markets","Data & Analytics","Risk & Compliance","Wealth Advisory"],
    OPS: ["Operations & Automation","Data & Analytics","Risk & Compliance","Enterprise AI Platform"],
    Co: ["Risk & Compliance","Enterprise AI Platform","Data & Analytics","Operations & Automation","Client Experience"],
  };

  // Wave schedule: when batches of new initiatives start
  // Each entry: [startYear, startQuarter, count] — initiatives starting around this time
  const waves = [
    // Pre-Q4-2025 initiatives (active at start)
    [2023,3,6],[2023,4,4],[2024,1,12],[2024,2,10],[2024,3,8],[2024,4,6],
    [2025,1,10],[2025,2,8],[2025,3,6],[2025,4,4],
    // 2026 new starts (~40)
    [2026,1,12],[2026,2,10],[2026,3,10],[2026,4,8],
    // 2027 new starts (~50)
    [2027,1,14],[2027,2,12],[2027,3,12],[2027,4,10],
    // 2028 new starts (~45)
    [2028,1,12],[2028,2,12],[2028,3,10],[2028,4,8],
    // 2029 new starts (~30)
    [2029,1,10],[2029,2,8],[2029,3,6],[2029,4,4],
    // 2030 new starts (~10)
    [2030,1,4],[2030,2,4],[2030,3,2],
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

  // Budget tiers by wave era
  function getBudget(sY) {
    if (sY <= 2024) return rBetween(2e6, 12e6);   // Early: moderate budgets
    if (sY <= 2025) return rBetween(1.5e6, 8e6);   // Wave 2: mix
    if (sY <= 2026) return rBetween(1e6, 10e6);     // Wave 3: scaling
    if (sY <= 2027) return rBetween(1.5e6, 12e6);   // Wave 4: enterprise scale
    if (sY <= 2028) return rBetween(1e6, 8e6);      // Wave 4-5
    return rBetween(.5e6, 5e6);                       // Wave 5: pilots
  }

  waves.forEach(([wY, wQ, count]) => {
    for (let i = 0; i < count; i++) {
      // Pick BU weighted
      const r = rng();
      let cum = 0, bu = "Tech";
      for (const [b, w] of Object.entries(buWeights)) { cum += w; if (r < cum) { bu = b; break; } }

      // Pick category with BU affinity
      const affCats = buCatAffinity[bu];
      const cat = rng() < .75 ? pick(affCats) : pick(CATS);

      // Pick division within BU
      const div = pick(BU_DIVS[bu]);

      // Budget & benefit
      const budget = Math.round(getBudget(wY) / 1e5) * 1e5; // Round to $100K
      const benefitMultiple = rBetween(1.8, 3.5);
      const maxB = Math.round(budget * benefitMultiple / 1e5) * 1e5;

      // Timeline: project duration 6-16 quarters
      const duration = Math.floor(rBetween(6, 16));
      const eY = wY + Math.floor((wQ + duration - 1) / 4);
      const eQ = ((wQ + duration - 1) % 4) + 1;
      const clampEY = Math.min(eY, 2030), clampEQ = eY > 2030 ? 4 : Math.min(eQ, 4);

      // Go-live: 3-8 quarters after start
      const goLiveOffset = Math.floor(rBetween(3, 8));
      const bY = wY + Math.floor((wQ + goLiveOffset - 1) / 4);
      const bQ = ((wQ + goLiveOffset - 1) % 4) + 1;

      // Budget deviation: ~20% over-budget, 5-35% over
      const dev = rng() < .20
        ? rBetween(.05, .35)
        : rng() < .15 ? rBetween(-.08, -.02) : rBetween(-.01, .04);

      // Spend & benefit shapes
      const sS = rng() < .4 ? "front" : "steady";
      const bS = pick(["slow", "ramp", "steady"]);

      // Some early projects complete
      let cY = null, cQ = null;
      if (wY <= 2024 && rng() < .25) {
        const compOffset = Math.floor(rBetween(8, 14));
        cY = wY + Math.floor((wQ + compOffset - 1) / 4);
        cQ = ((wQ + compOffset - 1) % 4) + 1;
        if (qi(cY, cQ) < 0) { cY = null; cQ = null; }
      }

      const name = getName(cat);
      const id = `gen_${inits.length}`;

      inits.push({
        id, name, cat, owner: bu, bu, div,
        tl: mkTL(wY, wQ, clampEY, clampEQ, {
          budget, sS, bY: Math.min(bY, clampEY), bQ: bY > clampEY ? clampEQ : bQ,
          maxB, bS, dev: Math.round(dev * 100) / 100,
          cY, cQ, oBpQ: maxB * .06
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
const DIV_DEFS = [];
BU_LIST.forEach(bu => {
  BU_DIVS[bu].forEach(divName => {
    // Derive budget/benefit from a realistic baseline per BU
    const baseBudget = bu === "Tech" ? rBetween(5e6, 15e6)
      : bu === "ISG" ? rBetween(4e6, 14e6)
      : bu === "WM" ? rBetween(3e6, 10e6)
      : bu === "IM" ? rBetween(3e6, 12e6)
      : bu === "OPS" ? rBetween(2e6, 8e6)
      : rBetween(2e6, 7e6);
    const b = Math.round(baseBudget / 1e5) * 1e5;
    const mB = Math.round(b * rBetween(2, 3.5) / 1e5) * 1e5;
    // Stagger starts across 2024-2026
    const sY = 2024 + Math.floor(rng() * 2);
    const sQ = Math.floor(rng() * 4) + 1;
    const eY = Math.min(sY + Math.floor(rBetween(2, 4)), 2030);
    const eQ = Math.floor(rng() * 4) + 1;
    const bY = sY + Math.floor(rBetween(1, 2));
    const bQ = Math.floor(rng() * 4) + 1;
    const dev = rng() < .2 ? rBetween(.05, .25) : rBetween(-.03, .08);
    const bS = pick(["slow", "ramp", "steady"]);
    DIV_DEFS.push({ n: divName, bu, b, mB, sY, sQ, eY: Math.min(eY, 2030), eQ, bY: Math.min(bY, 2030), bQ, dev: Math.round(dev * 100) / 100, bS });
  });
});

const DIVS = DIV_DEFS.map((d, i) => ({
  id: `div_${i}`, name: d.n, bu: d.bu,
  tl: mkTL(d.sY, d.sQ, d.eY, d.eQ, { budget: d.b, sS: "front", bY: d.bY, bQ: d.bQ,
    maxB: d.mB, bS: d.bS, dev: d.dev, cY: null, cQ: null, oBpQ: d.mB * .06 })
}));

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */
const fmt = (n) => {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
};

const PH = { future:"FUTURE", building:"BUILDING", value_capture:"LIVE", commitment_met:"DELIVERING", declining:"REVIEW" };

function boxColor(phase, t12, dev) {
  if (phase === "future") return { bg:"#F8FAFC", tx:"#94A3B8", lt:true };
  if (phase === "building") return { bg:"#E2E8F0", tx:"#475569", lt:true };
  if (phase === "declining") return { bg:"#FEF3C7", tx:"#92400E", lt:true };
  const pen = dev > .25 ? .35 : dev > .15 ? .15 : 0;
  const e = t12 - pen;
  if (e >= 2) return { bg:"#047857", tx:"#fff", lt:false };
  if (e >= 1.2) return { bg:"#059669", tx:"#fff", lt:false };
  if (e >= .8) return { bg:"#10B981", tx:"#fff", lt:false };
  if (e >= .5) return { bg:"#34D399", tx:"#064E3B", lt:false };
  if (e >= .3) return { bg:"#FBBF24", tx:"#78350F", lt:true };
  if (e >= .1) return { bg:"#F59E0B", tx:"#fff", lt:false };
  if (e > 0) return { bg:"#F97316", tx:"#fff", lt:false };
  return { bg:"#EF4444", tx:"#fff", lt:false };
}

function borderSt(dev, phase) {
  if (phase === "building" || phase === "future") return "1.5px solid #E2E8F0";
  if (phase === "declining") return "2.5px solid #D97706";
  if (dev > .25) return "3px solid #DC2626";
  if (dev > .15) return "3px solid #EA580C";
  if (dev > .05) return "2.5px solid #FBBF24";
  if (dev < -.02) return "2px solid #0EA5E9";
  return "1.5px solid rgba(0,0,0,0.05)";
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
  // composite phase
  if (t.t12ROI >= 1) t.phase = "commitment_met";
  else if (t.t12ROI >= .5) t.phase = "value_capture";
  else if (t.t12ROI >= .1) t.phase = "value_capture";
  else if (Object.keys(t.phases).length === 1 && t.phases.building) t.phase = "building";
  else t.phase = "value_capture";
  if (t.t12ROI > 0 && t.t12ROI < .8 && t.lifetimeROI > 1) t.phase = "declining";
  return t;
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export default function AIPortfolio() {
  const [qI, setQI] = useState(SLIDER_MIN);
  const [orgLevel, setOrgLevel] = useState("firm"); // firm | bu | div
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [activeCats, setActiveCats] = useState(new Set());
  const [tooltip, setTooltip] = useState(null);
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
  useEffect(() => { setZoom(1); setPan({x:0,y:0}); setSelected(null); }, [orgLevel]);

  const qKey = QS[qI]?.key || "2025Q4";

  // Compute max spend across all quarters for scaling
  const maxTotalSpend = useMemo(() => {
    let mx = 0;
    QS.forEach((q) => {
      let s = 0;
      if (orgLevel === "firm") INITS.forEach(i => { const d = i.tl.find(t => t.key === q.key); if (d && d.phase !== "future") s += d.spend; });
      else if (orgLevel === "bu") BU_LIST.forEach(bu => { DIVS.filter(d => d.bu === bu).forEach(d => { const td = d.tl.find(t => t.key === q.key); if (td && td.phase !== "future") s += td.spend; }); });
      else DIVS.forEach(d => { const td = d.tl.find(t => t.key === q.key); if (td && td.phase !== "future") s += td.spend; });
      mx = Math.max(mx, s);
    });
    return Math.max(mx, 1);
  }, [orgLevel]);

  // Data for current view
  const { items, buRegions, totalSpend, totals } = useMemo(() => {
    if (orgLevel === "firm") {
      const data = INITS.map(init => {
        const d = init.tl.find(t => t.key === qKey);
        if (!d || d.phase === "future") return null;
        if (activeCats.size > 0 && !activeCats.has(init.cat)) return null;
        return { id: init.id, name: init.name, cat: init.cat, owner: init.owner, bu: init.bu, d, type: "initiative", value: Math.max(d.spend, 200000) };
      }).filter(Boolean);
      const ts = data.reduce((s,i) => s+i.d.spend, 0);
      const agg = aggregate(data.map(i => i.d));
      return { items: data, buRegions: null, totalSpend: ts, totals: { ...agg, count: data.length } };
    }

    if (orgLevel === "bu") {
      const data = BU_LIST.map(bu => {
        const divData = DIVS.filter(d => d.bu === bu).map(d => d.tl.find(t => t.key === qKey)).filter(d => d && d.phase !== "future");
        if (!divData.length) return null;
        const agg = aggregate(divData);
        return { id: bu, name: BU_NAMES[bu], bu, d: agg, type: "bu", value: Math.max(agg.spend, 200000),
          divCount: divData.length, initCount: INITS.filter(i => i.bu === bu).length };
      }).filter(Boolean);
      const ts = data.reduce((s,i) => s+i.d.spend, 0);
      const allAgg = aggregate(data.map(i => ({ ...i.d, budget: i.d.budget })));
      return { items: data, buRegions: null, totalSpend: ts, totals: { ...allAgg, count: data.length } };
    }

    // Division level - nested
    const buData = {};
    BU_LIST.forEach(bu => {
      const divItems = DIVS.filter(d => d.bu === bu).map(d => {
        const td = d.tl.find(t => t.key === qKey);
        if (!td || td.phase === "future") return null;
        return { id: d.id, name: d.name, bu: d.bu, d: td, type: "division", value: Math.max(td.spend, 100000) };
      }).filter(Boolean);
      if (divItems.length) buData[bu] = divItems;
    });

    const allDivs = Object.values(buData).flat();
    const ts = allDivs.reduce((s,i) => s+i.d.spend, 0);
    const allAgg = aggregate(allDivs.map(i => i.d));
    return { items: allDivs, buRegions: buData, totalSpend: ts, totals: { ...allAgg, count: allDivs.length } };
  }, [qKey, orgLevel, activeCats]);

  // Map scaling
  const scaleFactor = Math.max(Math.sqrt(totalSpend / maxTotalSpend), 0.25);
  const mapW = viewDims.w * scaleFactor;
  const mapH = viewDims.h * scaleFactor;

  // Compute treemap rects
  const rects = useMemo(() => {
    if (orgLevel === "div" && buRegions) {
      // Nested: first layout BU regions, then divisions within
      const buItems = Object.keys(buRegions).map(bu => ({
        id: bu, name: BU_NAMES[bu], bu,
        value: buRegions[bu].reduce((s,d) => s + d.value, 0),
        divisions: buRegions[bu],
      }));
      const buRects = tmLayout(buItems, mapW, mapH);
      const allRects = [];
      const buBorders = [];
      buRects.forEach(br => {
        const pad = 22; // top padding for BU label
        const innerPad = 3;
        buBorders.push({ id: br.id, name: br.name, bu: br.bu, x: br.x, y: br.y, w: br.w, h: br.h });
        const divRects = tmLayout(br.divisions, br.w - innerPad*2, br.h - pad - innerPad, br.x + innerPad, br.y + pad);
        allRects.push(...divRects);
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

  const selItem = selected ? rects.rects.find(r => r.id === selected) : null;

  // Get initiatives/divisions for side panel
  const selChildren = useMemo(() => {
    if (!selItem) return [];
    if (orgLevel === "bu") {
      return INITS.filter(i => i.bu === selItem.bu).map(i => {
        const d = i.tl.find(t => t.key === qKey);
        if (!d || d.phase === "future") return null;
        return { id: i.id, name: i.name, d };
      }).filter(Boolean);
    }
    if (orgLevel === "div") {
      return INITS.filter(i => i.bu === selItem.bu).map(i => {
        const d = i.tl.find(t => t.key === qKey);
        if (!d || d.phase === "future") return null;
        return { id: i.id, name: i.name, d };
      }).filter(Boolean);
    }
    return [];
  }, [selItem, orgLevel, qKey]);

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif", background:"linear-gradient(180deg,#FFF,#F8FAFC)", minHeight:"100vh", color:"#1E293B" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .kc{background:white;border-radius:14px;padding:14px 18px;border:1px solid rgba(0,0,0,.04);box-shadow:0 1px 2px rgba(0,0,0,.03),0 4px 14px rgba(0,0,0,.02);transition:all .25s}
        .kc:hover{box-shadow:0 4px 20px rgba(0,0,0,.06);transform:translateY(-1px)}
        .kl{font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#94A3B8;margin-bottom:6px}
        .kv{font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;line-height:1}
        .ks{font-size:10.5px;color:#94A3B8;margin-top:4px}
        .cp{padding:6px 14px;border-radius:100px;font-size:11px;font-weight:600;cursor:pointer;border:1.5px solid #E2E8F0;background:white;color:#64748B;transition:all .2s;user-select:none}
        .cp:hover{border-color:#CBD5E1}.cp.on{background:#0F172A;color:white;border-color:#0F172A}
        .sl{-webkit-appearance:none;appearance:none;width:100%;height:5px;border-radius:3px;background:#E2E8F0;outline:none;cursor:pointer}
        .sl::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:#0F172A;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.2),0 0 0 4px rgba(15,23,42,.08)}
        .pb{width:40px;height:40px;border-radius:50%;border:2px solid #0F172A;background:white;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;color:#0F172A;flex-shrink:0}
        .pb:hover{background:#0F172A;color:white}.pb svg{fill:currentColor}
        .dp{position:absolute;top:0;right:0;width:360px;height:100%;background:white;border-left:1px solid #E2E8F0;box-shadow:-12px 0 48px rgba(0,0,0,.08);z-index:30;overflow-y:auto;padding:28px 24px;animation:si .3s cubic-bezier(.4,0,.2,1)}
        @keyframes si{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        .dc{position:absolute;top:14px;right:14px;background:#F1F5F9;border:none;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;color:#64748B;transition:all .15s}
        .dc:hover{background:#E2E8F0;color:#1E293B}
        .bt{height:7px;background:#F1F5F9;border-radius:4px;overflow:hidden}.bf{height:100%;border-radius:4px;transition:width .5s ease}
        .st{display:inline-block;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;padding:2px 7px;border-radius:3px}
        .tb{position:absolute;border-radius:8px;overflow:hidden;cursor:pointer;transition:transform .25s cubic-bezier(.4,0,.2,1),box-shadow .25s}
        .tb:hover{transform:scale(1.012);z-index:10!important}
        .org-slider{display:flex;flex-direction:column;align-items:center;gap:0;user-select:none}
        .org-dot{width:14px;height:14px;border-radius:50%;border:2px solid #CBD5E1;background:white;cursor:pointer;transition:all .2s;position:relative;z-index:2}
        .org-dot.active{background:#0F172A;border-color:#0F172A;transform:scale(1.2)}
        .org-dot:hover{border-color:#0F172A}
        .org-line{width:2px;height:20px;background:#E2E8F0}
        .org-label{font-size:9px;font-weight:600;color:#94A3B8;letter-spacing:.5px;writing-mode:horizontal-tb;white-space:nowrap;margin-top:2px}
        .org-label.active{color:#0F172A}
        .mini-bar{display:flex;height:6px;border-radius:3px;overflow:hidden;gap:1px}
        .zoom-ctrl{display:flex;align-items:center;gap:6px;position:absolute;bottom:12px;left:12px;z-index:15;background:rgba(255,255,255,.9);padding:6px 10px;border-radius:10px;border:1px solid rgba(0,0,0,.06);backdrop-filter:blur(8px)}
        .zoom-btn{width:28px;height:28px;border:1px solid #E2E8F0;border-radius:6px;background:white;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;color:#475569;transition:all .15s}
        .zoom-btn:hover{background:#F1F5F9;border-color:#CBD5E1}
      `}</style>

      {/* HEADER */}
      <div style={{padding:"24px 36px 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <div>
            <div style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:1.5,color:"#94A3B8",marginBottom:3}}>Enterprise AI Strategy</div>
            <h1 style={{fontSize:28,fontWeight:700,letterSpacing:"-0.8px",color:"#0F172A"}}>Investment Portfolio</h1>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"'JetBrains Mono'",fontSize:30,fontWeight:700,color:"#0F172A",lineHeight:1,letterSpacing:"-1px"}}>
              {qKey.replace("Q"," · Q")}
            </div>
            <div style={{fontSize:10,color:"#94A3B8",marginTop:2}}>
              {orgLevel === "firm" ? "All Initiatives" : orgLevel === "bu" ? "Business Units" : "Divisions"} · {items.length} {orgLevel === "firm" ? "projects" : orgLevel === "bu" ? "units" : "divisions"}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginTop:20}}>
          <div className="kc">
            <div className="kl">Total Invested</div>
            <div className="kv" style={{color:"#0F172A"}}>{fmt(totals.spend)}</div>
            <div className="ks">{totals.count} {orgLevel === "firm" ? "initiatives" : orgLevel === "bu" ? "business units" : "divisions"}</div>
          </div>
          <div className="kc">
            <div className="kl">Total Benefit</div>
            <div className="kv" style={{color:"#059669"}}>{fmt(totals.benefit)}</div>
            <div className="ks">cumulative</div>
          </div>
          <div className="kc">
            <div className="kl">Trailing 12mo ROI</div>
            <div className="kv" style={{color:totals.t12ROI>=1?"#059669":totals.t12ROI>=.5?"#D97706":"#DC2626"}}>
              {totals.t12ROI.toFixed(2)}x
            </div>
            <div className="ks">current performance</div>
          </div>
          <div className="kc">
            <div className="kl">Lifetime ROI</div>
            <div className="kv" style={{color:totals.lifetimeROI>=1?"#059669":totals.lifetimeROI>=.5?"#D97706":"#DC2626"}}>
              {totals.lifetimeROI.toFixed(2)}x
            </div>
            <div className="ks">all-time</div>
          </div>
          <div className="kc">
            <div className="kl">Budget Status</div>
            <div className="kv" style={{color:totals.spend>totals.budget?"#DC2626":"#475569",fontSize:18}}>
              {totals.spend > totals.budget ? `+${fmt(totals.spend - totals.budget)}` : "On Track"}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{display:"flex",justifyContent:"flex-end",gap:16,marginTop:14,alignItems:"center"}}>
          {[{c:"#059669",l:"Delivering"},{c:"#FBBF24",l:"Capturing"},{c:"#EF4444",l:"At Risk"},{c:"#E2E8F0",l:"Building"},{c:"#FEF3C7",l:"Review",b:"2px solid #D97706"}].map(({c,l,b})=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#94A3B8"}}>
              <div style={{width:10,height:10,borderRadius:3,background:c,border:b||"none",flexShrink:0}}/>{l}
            </div>
          ))}
          <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#94A3B8"}}>
            <div style={{width:14,height:9,border:"2.5px solid #DC2626",borderRadius:2}}/>Over Budget
          </div>
        </div>

        {/* Category Filters — Firm level only */}
        {orgLevel === "firm" && (
          <div style={{display:"flex",gap:6,marginTop:10}}>
            {CATS.map(cat => {
              const isOn = activeCats.has(cat);
              return (
                <button key={cat} className={`cp${isOn?" on":""}`} onClick={() => {
                  setActiveCats(prev => {
                    const next = new Set(prev);
                    if (next.has(cat)) next.delete(cat); else next.add(cat);
                    return next;
                  });
                  setSelected(null);
                }}>{cat}</button>
              );
            })}
            {activeCats.size > 0 && (
              <button className="cp" onClick={() => { setActiveCats(new Set()); setSelected(null); }}
                style={{borderStyle:"dashed",fontSize:10}}>Clear</button>
            )}
          </div>
        )}
      </div>

      {/* MAIN AREA: Treemap + Org Slider */}
      <div style={{padding:"14px 36px",display:"flex",gap:16}}>
        {/* TREEMAP VIEWPORT */}
        <div ref={viewRef} style={{
          flex:1,position:"relative",height:480,
          background:"white",borderRadius:20,
          border:"1px solid rgba(0,0,0,.04)",
          boxShadow:"0 1px 3px rgba(0,0,0,.02),0 12px 48px rgba(0,0,0,.04)",
          overflow:"hidden",cursor:isPanning?"grabbing":"grab",
        }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Transformed container */}
          <div ref={mapRef} style={{
            position:"absolute",
            left:"50%", top:"50%",
            width:mapW, height:mapH,
            transform:`translate(-50%,-50%) translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
            transformOrigin:"center center",
            transition: isPanning ? "none" : "width 0.5s ease, height 0.5s ease",
          }}>
            {/* BU borders for division view */}
            {rects.buBorders && rects.buBorders.map(br => (
              <div key={`bu_${br.id}`} style={{
                position:"absolute", left:br.x, top:br.y, width:br.w, height:br.h,
                border:`2px solid ${BU_COLORS[br.bu]}22`,
                borderRadius:10,
                background:`${BU_COLORS[br.bu]}06`,
              }}>
                <div style={{
                  position:"absolute",top:4,left:8,
                  fontSize:10/Math.max(zoom,0.5),fontWeight:700,color:BU_COLORS[br.bu],
                  letterSpacing:.5,opacity:.85,textTransform:"uppercase",
                }}>
                  {br.name}
                </div>
              </div>
            ))}

            {/* Boxes */}
            {rects.rects.map(r => {
              const d = r.d;
              const bc = boxColor(d.phase, d.t12ROI, d.dev);
              const brd = borderSt(d.dev, d.phase);
              const isH = hovered === r.id;
              const isS = selected === r.id;
              const isB = d.phase === "building";
              const isL = ["value_capture","commitment_met","declining"].includes(d.phase);
              const ew = r.w * zoom, eh = r.h * zoom;
              const zInv = 1 / Math.max(zoom, 0.5);
              const isHidden = ew < 50 || eh < 35;
              const isSmall = !isHidden && (ew < 85 || eh < 55);
              const isMedium = !isHidden && !isSmall && (ew < 130 || eh < 80);
              const isLarge = !isHidden && !isSmall && !isMedium;

              return (
                <div key={r.id} className="tb"
                  onClick={(e) => { e.stopPropagation(); setSelected(isS ? null : r.id); }}
                  onMouseEnter={(e) => { setHovered(r.id); if (isSmall || isHidden) setTooltip({ x: e.clientX, y: e.clientY, name: r.name, spend: d.spend, phase: d.phase, t12ROI: d.t12ROI, dev: d.dev }); }}
                  onMouseMove={(e) => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                  onMouseLeave={() => { setHovered(null); setTooltip(null); }}
                  style={{
                    left:r.x+2, top:r.y+2, width:r.w-4, height:r.h-4, border:brd,
                    zIndex:isH?10:1,
                    boxShadow:isH?`0 8px 32px rgba(0,0,0,.1),0 0 0 2px ${bc.bg}`:isS?"0 0 0 3px #0F172A":d.phase==="commitment_met"?"inset 0 0 12px rgba(5,150,105,.15), 0 1px 3px rgba(0,0,0,.02)":"0 1px 3px rgba(0,0,0,.02)",
                  }}>
                  <div style={{position:"absolute",inset:0,
                    background:isB?`repeating-linear-gradient(135deg,#E2E8F0,#E2E8F0 4px,#F1F5F9 4px,#F1F5F9 8px)`:bc.bg,
                    opacity:isB?.6:1}} />
                  {isL && d.benefitPct > 0 && (
                    <div style={{position:"absolute",bottom:0,left:0,right:0,
                      height:d.phase==="commitment_met"||d.phase==="declining"
                        ? `${Math.min((d.surplus / (d.committedB * 0.5)) * 100, 100)}%`
                        : `${Math.min(d.benefitPct*100,100)}%`,
                      background:"rgba(255,255,255,.14)",
                      borderTop:(d.phase==="commitment_met"||d.phase==="declining")?"none":d.benefitPct<.98?"1px dashed rgba(255,255,255,.25)":"none",
                      transition:"height .6s cubic-bezier(.4,0,.2,1)"}} />
                  )}
                  {!isHidden && <div style={{position:"relative",zIndex:2,padding:isSmall?`${4*zInv}px ${5*zInv}px`:isMedium?`${6*zInv}px ${8*zInv}px`:`${9*zInv}px ${12*zInv}px`,
                    height:"100%",display:"flex",flexDirection:"column",justifyContent:"space-between",color:bc.tx}}>
                    <div>
                      <div style={{fontSize:(isSmall?Math.max(8,Math.min(9,r.w/8)):isMedium?Math.max(10,Math.min(11,r.w/8)):Math.max(12,Math.min(14,r.w/8)))*zInv,fontWeight:700,lineHeight:1.15,
                        textShadow:bc.lt?"none":"0 1px 2px rgba(0,0,0,.08)",
                        ...(isSmall?{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}:{overflow:"hidden",wordBreak:"break-word",display:"-webkit-box",WebkitLineClamp:isMedium?1:2,WebkitBoxOrient:"vertical"})}}>
                        {r.name}
                      </div>
                      {!isSmall && <span className="st" style={{marginTop:2*zInv,
                        background:isB?"rgba(0,0,0,.06)":"rgba(255,255,255,.18)",
                        color:isB?"#64748B":bc.lt?"#475569":"rgba(255,255,255,.85)",
                        fontSize:(isLarge?8:7)*zInv,padding:`${1*zInv}px ${4*zInv}px`}}>{PH[d.phase]}</span>}
                    </div>
                    {isLarge && (
                      <div style={{lineHeight:1.45}}>
                        <div style={{fontFamily:"'JetBrains Mono'",fontWeight:600,fontSize:11*zInv}}>{fmt(d.spend)}</div>
                        {isL && <>
                          <div style={{fontSize:10*zInv,opacity:.8}}>{fmt(d.benefit)} returned</div>
                          <div style={{display:"flex",alignItems:"baseline",gap:4*zInv}}>
                            <span style={{fontFamily:"'JetBrains Mono'",fontWeight:700,fontSize:Math.max(14,Math.min(18,r.w/7))*zInv,letterSpacing:"-.5px"}}>{d.t12ROI.toFixed(1)}x</span>
                            <span style={{fontSize:8*zInv,opacity:.65}}>12mo</span>
                          </div>
                        </>}
                        {!isL && !isB && <div style={{fontSize:10*zInv,opacity:.6}}>Live {d.goLiveQ}</div>}
                        {d.dev>.05 && <div style={{fontSize:9*zInv,fontWeight:700,color:bc.lt?"#DC2626":"#FEE2E2"}}>+{(d.dev*100).toFixed(0)}% over</div>}
                      </div>
                    )}
                    {isMedium && <div style={{fontFamily:"'JetBrains Mono'",fontSize:Math.max(9,Math.min(11,r.w/8))*zInv,fontWeight:600}}>{fmt(d.spend)}</div>}
                  </div>}
                </div>
              );
            })}
          </div>

          {/* Zoom controls */}
          <div className="zoom-ctrl">
            <button className="zoom-btn" onClick={() => setZoom(z => Math.min(z*1.3,5))}>+</button>
            <span style={{fontSize:10,fontFamily:"'JetBrains Mono'",color:"#64748B",minWidth:36,textAlign:"center"}}>{(zoom*100).toFixed(0)}%</span>
            <button className="zoom-btn" onClick={() => setZoom(z => Math.max(z*.7,.5))}>−</button>
            <button className="zoom-btn" onClick={resetView} style={{fontSize:11,fontWeight:600}}>⟲</button>
          </div>

          {/* DETAIL PANEL */}
          {selItem && (
            <div className="dp" onClick={e => e.stopPropagation()}>
              <button className="dc" onClick={() => setSelected(null)}>✕</button>

              <div style={{marginBottom:20}}>
                {orgLevel !== "firm" && selItem.bu && (
                  <div style={{fontSize:10,fontWeight:600,color:BU_COLORS[selItem.bu],marginBottom:4}}>{BU_NAMES[selItem.bu]}</div>
                )}
                <span className="st" style={{
                  background:selItem.d.phase==="commitment_met"?"#059669":selItem.d.phase==="value_capture"?"#F59E0B":
                    selItem.d.phase==="declining"?"#D97706":"#94A3B8",
                  color:"white",fontSize:8,padding:"3px 10px"
                }}>{PH[selItem.d.phase]}</span>
                <h2 style={{fontSize:20,fontWeight:700,marginTop:8,color:"#0F172A"}}>{selItem.name}</h2>
                {orgLevel === "firm" && <div style={{fontSize:11,color:"#94A3B8",marginTop:2}}>{selItem.cat} · {selItem.owner}</div>}
                {orgLevel === "bu" && <div style={{fontSize:11,color:"#94A3B8",marginTop:2}}>{selItem.divCount} divisions · {selItem.initCount} initiatives</div>}
              </div>

              {/* ROI cards */}
              {selItem.d.phase !== "building" && (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                  {[{l:"Trailing 12mo",v:selItem.d.t12ROI,s:"current"},{l:"Lifetime",v:selItem.d.lifetimeROI,s:"all-time"}].map(({l,v,s})=>(
                    <div key={l} style={{background:"#F8FAFC",borderRadius:12,padding:14,textAlign:"center"}}>
                      <div style={{fontSize:8.5,fontWeight:600,color:"#94A3B8",textTransform:"uppercase",letterSpacing:1}}>{l}</div>
                      <div style={{fontFamily:"'JetBrains Mono'",fontSize:30,fontWeight:700,lineHeight:1.15,marginTop:2,
                        color:v>=1?"#059669":v>=.5?"#D97706":"#DC2626"}}>{v.toFixed(2)}x</div>
                      <div style={{fontSize:9,color:"#94A3B8",marginTop:1}}>{s}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Benefit Realization / Value Beyond Commitment */}
              {selItem.d.phase !== "building" && selItem.d.phase !== "future" && (
                <div style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:5}}>
                    <span style={{color:"#64748B",fontWeight:600}}>
                      {(selItem.d.phase==="commitment_met"||selItem.d.phase==="declining") ? "Value Beyond Commitment" : "Benefit Realization"}
                    </span>
                    <span style={{fontFamily:"'JetBrains Mono'",fontWeight:600,fontSize:11,color:"#059669"}}>
                      {(selItem.d.phase==="commitment_met"||selItem.d.phase==="declining") ? `+${fmt(selItem.d.surplus)}` : `${(selItem.d.benefitPct*100).toFixed(0)}%`}
                    </span>
                  </div>
                  <div className="bt"><div className="bf" style={{
                    width:(selItem.d.phase==="commitment_met"||selItem.d.phase==="declining")
                      ? `${Math.min((selItem.d.surplus / (selItem.d.committedB * 0.5)) * 100, 100)}%`
                      : `${Math.min(selItem.d.benefitPct*100,100)}%`,
                    background:"linear-gradient(90deg,#34D399,#059669)"
                  }}/></div>
                </div>
              )}

              {/* Budget bar */}
              <div style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:5}}>
                  <span style={{color:"#64748B",fontWeight:600}}>Budget</span>
                  <span style={{fontFamily:"'JetBrains Mono'",fontWeight:600,fontSize:11}}>{fmt(selItem.d.spend)} / {fmt(selItem.d.budget)}</span>
                </div>
                <div className="bt"><div className="bf" style={{
                  width:`${Math.min((selItem.d.spend/Math.max(selItem.d.budget*(1+(selItem.d.dev||0)),1))*100,100)}%`,
                  background:selItem.d.dev>.2?"linear-gradient(90deg,#F97316,#DC2626)":selItem.d.dev>.05?"linear-gradient(90deg,#FBBF24,#F59E0B)":"linear-gradient(90deg,#34D399,#059669)"
                }}/></div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#94A3B8",marginTop:3}}>
                  <span>Original</span>
                  <span style={{fontWeight:600,color:selItem.d.dev>.005?"#DC2626":"#64748B"}}>
                    {selItem.d.dev>.005?`+${(selItem.d.dev*100).toFixed(0)}% over`:selItem.d.dev<-.02?`${(Math.abs(selItem.d.dev)*100).toFixed(0)}% under`:"On budget"}
                  </span>
                </div>
              </div>

              {/* Phase breakdown for BU/Div */}
              {orgLevel !== "firm" && selItem.d.phases && (
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:10,fontWeight:600,color:"#64748B",marginBottom:6}}>Phase Breakdown</div>
                  <div className="mini-bar">
                    {[{p:"building",c:"#CBD5E1"},{p:"value_capture",c:"#FBBF24"},{p:"commitment_met",c:"#059669"},{p:"declining",c:"#D97706"}].map(({p,c})=>{
                      const cnt = selItem.d.phases[p]||0;
                      const total = Object.values(selItem.d.phases).reduce((s,v)=>s+v,0);
                      if (!cnt) return null;
                      return <div key={p} style={{flex:cnt,background:c,borderRadius:2}} title={`${PH[p]}: ${cnt}`}/>;
                    })}
                  </div>
                  <div style={{display:"flex",gap:10,marginTop:6,flexWrap:"wrap"}}>
                    {[{p:"building",c:"#CBD5E1",l:"Build"},{p:"value_capture",c:"#FBBF24",l:"Live"},{p:"commitment_met",c:"#059669",l:"Delivering"},{p:"declining",c:"#D97706",l:"Review"}].map(({p,c,l})=>{
                      const cnt = selItem.d.phases[p]||0;
                      if(!cnt) return null;
                      return <div key={p} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#64748B"}}>
                        <div style={{width:7,height:7,borderRadius:2,background:c}}/>{l}: {cnt}
                      </div>;
                    })}
                  </div>
                </div>
              )}

              {/* Initiative list for BU/Div drill-down */}
              {orgLevel !== "firm" && selChildren.length > 0 && (
                <div>
                  <div style={{fontSize:10,fontWeight:600,color:"#64748B",marginBottom:8,textTransform:"uppercase",letterSpacing:.8}}>Initiatives</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {selChildren.sort((a,b) => b.d.spend - a.d.spend).map(ch => {
                      const cc = boxColor(ch.d.phase, ch.d.t12ROI, ch.d.dev);
                      return (
                        <div key={ch.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",
                          background:"#F8FAFC",borderRadius:8,borderLeft:`4px solid ${cc.bg}`}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:600,color:"#0F172A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ch.name}</div>
                            <div style={{fontSize:10,color:"#94A3B8"}}>{fmt(ch.d.spend)} invested</div>
                          </div>
                          <div style={{textAlign:"right",flexShrink:0}}>
                            {ch.d.phase !== "building" ? (
                              <div style={{fontFamily:"'JetBrains Mono'",fontSize:14,fontWeight:700,
                                color:ch.d.t12ROI>=1?"#059669":ch.d.t12ROI>=.5?"#D97706":"#DC2626"}}>
                                {ch.d.t12ROI.toFixed(1)}x
                              </div>
                            ) : (
                              <span className="st" style={{background:"#E2E8F0",color:"#64748B",fontSize:7}}>BUILD</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Initiative detail for firm level */}
              {orgLevel === "firm" && selItem.d.phase !== "building" && (
                <div style={{background:"#F8FAFC",borderRadius:10,padding:12,fontSize:12,lineHeight:2}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"#94A3B8"}}>12mo Cost</span><span style={{fontFamily:"'JetBrains Mono'",fontWeight:600}}>{fmt(selItem.d.t12Spend)}</span></div>
                  <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"#94A3B8"}}>12mo Benefit</span><span style={{fontFamily:"'JetBrains Mono'",fontWeight:600,color:"#059669"}}>{fmt(selItem.d.t12Benefit)}</span></div>
                  <div style={{borderTop:"1px solid #E2E8F0",marginTop:2,paddingTop:2,display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontWeight:600}}>Net</span>
                    <span style={{fontFamily:"'JetBrains Mono'",fontWeight:700,color:selItem.d.t12Benefit-selItem.d.t12Spend>=0?"#059669":"#DC2626"}}>{fmt(selItem.d.t12Benefit-selItem.d.t12Spend)}</span>
                  </div>
                </div>
              )}
              {orgLevel === "firm" && (
                <div style={{background:"#F8FAFC",borderRadius:10,padding:12,fontSize:12,lineHeight:2,marginTop:10}}>
                  {[["Go-live",selItem.d.goLiveQ],["Target End",selItem.d.endQ],["Owner",selItem.owner||""],["Category",selItem.cat||""]].filter(([,v])=>v).map(([k,v])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{color:"#94A3B8"}}>{k}</span><span style={{fontWeight:600}}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ORG SLIDER */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",width:64,flexShrink:0}}>
          <div className="org-slider">
            {[{id:"firm",l:"FIRM"},{id:"bu",l:"BU"},{id:"div",l:"DIV"}].map(({id,l},i) => (
              <div key={id} style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                {i > 0 && <div className="org-line"/>}
                <div className={`org-dot ${orgLevel===id?"active":""}`} onClick={() => setOrgLevel(id)}/>
                <div className={`org-label ${orgLevel===id?"active":""}`}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:24,fontSize:8,color:"#94A3B8",textAlign:"center",lineHeight:1.4,fontWeight:500}}>
            ORG<br/>LEVEL
          </div>
        </div>
      </div>

      {/* TIMELINE */}
      <div style={{padding:"6px 36px 28px",display:"flex",alignItems:"center",gap:14}}>
        <button className="pb" onClick={()=>{if(qI>=QS.length-1)setQI(SLIDER_MIN);setIsPlaying(!isPlaying)}}>
          {isPlaying?(
            <svg width="12" height="12" viewBox="0 0 14 14"><rect x="1" y="1" width="4" height="12" rx="1"/><rect x="9" y="1" width="4" height="12" rx="1"/></svg>
          ):(
            <svg width="12" height="12" viewBox="0 0 14 14"><polygon points="3,0 14,7 3,14"/></svg>
          )}
        </button>
        <div style={{flex:1}}>
          <input type="range" min={SLIDER_MIN} max={QS.length-1} value={qI} onChange={e=>setQI(parseInt(e.target.value))} className="sl"/>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:9,fontFamily:"'JetBrains Mono'",color:"#94A3B8",letterSpacing:.5}}>
            {[2025,2026,2027,2028,2029,2030].map(y=>(
              <span key={y} style={{fontWeight:QS[qI]?.y===y?700:400,color:QS[qI]?.y===y?"#0F172A":"#94A3B8"}}>{y}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Hover tooltip for small/hidden boxes */}
      {tooltip && (
        <div style={{
          position:"fixed", left:tooltip.x+14, top:tooltip.y-12, zIndex:9999,
          background:"#0F172A", color:"white", padding:"10px 14px",
          borderRadius:10, fontSize:11, fontFamily:"'DM Sans',sans-serif",
          boxShadow:"0 8px 32px rgba(0,0,0,.25)", pointerEvents:"none",
          maxWidth:240, lineHeight:1.5
        }}>
          <div style={{fontWeight:700,fontSize:12,marginBottom:2}}>{tooltip.name}</div>
          <div style={{color:"#94A3B8",fontSize:10}}>{PH[tooltip.phase]}</div>
          <div style={{fontFamily:"'JetBrains Mono'",fontWeight:600,marginTop:3}}>{fmt(tooltip.spend)}</div>
          {tooltip.phase !== "building" && tooltip.phase !== "future" && (
            <div style={{fontFamily:"'JetBrains Mono'",fontWeight:600,
              color:tooltip.t12ROI>=1?"#34D399":tooltip.t12ROI>=.5?"#FBBF24":"#F87171"}}>
              {tooltip.t12ROI.toFixed(1)}x ROI
            </div>
          )}
          {tooltip.dev > .05 && <div style={{color:"#F87171",fontSize:10,fontWeight:600}}>+{(tooltip.dev*100).toFixed(0)}% over budget</div>}
        </div>
      )}
    </div>
  );
}
