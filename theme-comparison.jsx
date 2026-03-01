import { useState, useEffect, useRef, useMemo } from "react";

const fmt = (n) => n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : `$${(n/1e3).toFixed(0)}K`;

/* ═══════════════════════════════════════
   INITIATIVE DATA
   v5.1: Added lastActivity (days since
   last milestone move) and blocker to
   ALL building tiles, not just stalled.
   ═══════════════════════════════════════ */
const BOXES = [
  // ── EMERALD (ROI >= 0.8x) ──
  { name:"Fraud Detection Pattern Recognizer", spend:9.7e6, roi:2.4, phase:"delivering", dev:-.05, benefitPct:.95, surplus:16.8e6 },
  { name:"M365 Copilot", spend:13.1e6, roi:1.8, phase:"live", dev:.04, benefitPct:.72, surplus:3.6e6 },
  { name:"KYC/AML Automation", spend:7.2e6, roi:2.1, phase:"delivering", dev:-.03, benefitPct:.92, surplus:1.1e6 },
  { name:"Sanctions Screening AI", spend:7.2e6, roi:1.6, phase:"delivering", dev:.02, benefitPct:.88, surplus:0.5e6 },
  { name:"Market Risk AI", spend:12.5e6, roi:1.4, phase:"live", dev:.03, benefitPct:.68, surplus:0 },
  { name:"Quantitative Strategy AI", spend:8.2e6, roi:1.1, phase:"live", dev:0, benefitPct:.60, surplus:0 },
  { name:"Unified Security", spend:11e6, roi:0.9, phase:"live", dev:.04, benefitPct:.55, surplus:0 },

  // ── AMBER (ROI 0.1x–0.7x) ──
  { name:"Stress Testing AI", spend:4.8e6, roi:0.7, phase:"live", dev:.03, benefitPct:.52, velocity:"up", velocityDelta:"+0.15x" },
  { name:"Client Insights Engine", spend:6.9e6, roi:0.6, phase:"live", dev:.10, benefitPct:.45, velocity:"up", velocityDelta:"+0.22x" },
  { name:"Doc Automation Suite", spend:6.2e6, roi:0.4, phase:"live", dev:.30, benefitPct:.48, velocity:"flat", velocityDelta:"+0.02x" },
  { name:"Regulatory Report Gen", spend:4e6, roi:0.5, phase:"live", dev:.20, benefitPct:.40, velocity:"down", velocityDelta:"-0.08x" },
  { name:"Operations Copilot", spend:5.5e6, roi:0.45, phase:"live", dev:.12, benefitPct:.42, velocity:"up", velocityDelta:"+0.12x" },
  { name:"Trading Analytics AI", spend:11.9e6, roi:0.3, phase:"live", dev:.18, benefitPct:.35, velocity:"down", velocityDelta:"-0.11x" },
  { name:"Order Management AI", spend:4.2e6, roi:0.15, phase:"live", dev:.08, benefitPct:.32, velocity:"flat", velocityDelta:"+0.01x" },
  { name:"Voice Analytics", spend:3.8e6, roi:0.2, phase:"live", dev:.06, benefitPct:.28, velocity:"down", velocityDelta:"-0.05x" },

  // ── CRIMSON (ROI < 0.1x) ──
  { name:"Personalization Engine", spend:8.3e6, roi:0.08, phase:"live", dev:.28, benefitPct:.18, rootCause:"budget" },
  { name:"Alternative Data Pipeline", spend:8.8e6, roi:0.05, phase:"live", dev:.04, benefitPct:.12, rootCause:"adoption" },
  { name:"Client Onboarding AI", spend:5e6, roi:0.03, phase:"live", dev:.32, benefitPct:.08, rootCause:"scope" },

  // ── BUILDING: now with lastActivity + blocker ──
  { name:"Agentic AI Platform", spend:7.1e6, roi:0, phase:"building", dev:0, benefitPct:0,
    milestones:.65, budgetBurn:.42, daysToLive:22, slips:0, confidence:"high",
    lastActivity:8, blocker:null },                             // healthy: moved 8 days ago

  { name:"GenAI Internal Use Cases", spend:3.2e6, roi:0, phase:"building", dev:0, benefitPct:0,
    milestones:.40, budgetBurn:.55, daysToLive:90, slips:1, confidence:"medium",
    lastActivity:34, blocker:"Infra" },                         // slowing: 34 days, infra blocked

  { name:"Data Quality AI", spend:3.5e6, roi:0, phase:"building", dev:0, benefitPct:0,
    milestones:.22, budgetBurn:.60, daysToLive:180, slips:2, confidence:"low",
    lastActivity:91, blocker:"Data Eng" },                      // ZOMBIE: 91 days stale

  // ── STALLED ──
  { name:"Revenue Attribution ML", spend:3e6, roi:0, phase:"stalled", dev:0, benefitPct:0,
    milestones:.10, budgetBurn:.78, daysToLive:null,
    lastActivity:142, blocker:"Legal" },                        // blocked by Legal
];

/* ═══════════════════════════════════════
   ZONE + BORDER LOGIC (unchanged)
   ═══════════════════════════════════════ */
function getZone(r) {
  if (r.phase === "stalled") return "stalled";
  if (r.phase === "building") return "building";
  if (r.roi >= 0.8) return "emerald";
  if (r.roi >= 0.1) return "amber";
  return "crimson";
}

const ZONE_GRAD = {
  emerald: "linear-gradient(180deg, #047857 0%, #022C22 100%)",
  amber:   "linear-gradient(180deg, #B45309 0%, #451A03 100%)",
  crimson: "linear-gradient(180deg, #9B0000 0%, #4A0000 100%)",
  building:"#262626",
  stalled: "#262626",
};
const ZONE_TX = { emerald:"#fff", amber:"#FEF3C7", crimson:"#fff", building:"#A3A3A3", stalled:"#A3A3A3" };

function getBorder(dev, zone) {
  if (zone === "building" || zone === "stalled") return "none";
  if (dev > 0.25) return "none";
  if (dev > 0.15) return "3px solid #EA580C";
  if (dev < -0.02) return "2px solid #38BDF8";
  return "none";
}

function isAtRisk(r) {
  const zone = getZone(r);
  return r.dev > 0.15 || r.phase === "stalled" || zone === "crimson" ||
    (r.phase === "building" && r.budgetBurn > (r.milestones||0) + 0.15) ||
    (r.phase === "building" && r.lastActivity > 60);
}

/* ═══════════════════════════════════════
   TREEMAP (unchanged)
   ═══════════════════════════════════════ */
function treemap(items, W, H) {
  const total=items.reduce((s,i)=>s+i.value,0);if(!total)return[];
  const sorted=[...items].sort((a,b)=>b.value-a.value);const rects=[];
  function lay(row,rT,hz,rx,ry,rw,rh){let off=0;for(const it of row){const fr=it.value/rT;if(hz){rects.push({...it,x:rx+off,y:ry,w:rw*fr,h:rh});off+=rw*fr;}else{rects.push({...it,x:rx,y:ry+off,w:rw,h:rh*fr});off+=rh*fr;}}}
  let rem=[...sorted],rx=0,ry=0,rw=W,rh=H,remT=total;
  while(rem.length>0){if(rem.length<=2){lay(rem,remT,rw>=rh,rx,ry,rw,rh);break;}const hz=rw<rh;let row=[rem[0]],rowT=rem[0].value,bestA=1e9;for(let i=1;i<rem.length;i++){const tr=[...row,rem[i]],tT=rowT+rem[i].value;const rSz=hz?rh*(tT/remT):rw*(tT/remT);let wa=0;for(const it of tr){const iw=hz?rw*(it.value/tT):rSz;const ih=hz?rSz:rh*(it.value/tT);wa=Math.max(wa,Math.max(iw/ih,ih/iw));}if(wa<bestA||i===1){bestA=wa;row=tr;rowT=tT;}else break;}const rFr=rowT/remT;if(hz){const rH=rh*rFr;lay(row,rowT,true,rx,ry,rw,rH);ry+=rH;rh-=rH;}else{const rW=rw*rFr;lay(row,rowT,false,rx,ry,rW,rh);rx+=rW;rw-=rW;}remT-=rowT;rem=rem.filter(r=>!row.includes(r));}
  return rects;
}

/* ═══════════════════════════════════════
   CRIMSON PULSE (unchanged)
   ═══════════════════════════════════════ */
function CrimsonPulse() {
  const ref=useRef(null);
  useEffect(()=>{
    let frame,start=null;
    const go=(ts)=>{if(!start)start=ts;const t=((ts-start)%2500)/2500;const v=0.4+0.4*Math.sin(t*Math.PI*2);const sp=5+15*Math.sin(t*Math.PI*2);if(ref.current)ref.current.style.boxShadow=`0 0 ${sp}px ${2+3*v}px rgba(155,0,0,${v})`;frame=requestAnimationFrame(go);};
    frame=requestAnimationFrame(go);return()=>cancelAnimationFrame(frame);
  },[]);
  return <div ref={ref} style={{position:"absolute",inset:-4,borderRadius:12,pointerEvents:"none",zIndex:0}}/>;
}

/* ═══════════════════════════════════════
   WHITE VELOCITY ARROWS (unchanged)
   ═══════════════════════════════════════ */
function VelocityBadge({velocity, delta}) {
  const arrows={up:"↗",flat:"→",down:"↘"};
  const glow = velocity==="down" ? "drop-shadow(0 0 4px rgba(255,120,120,0.6))" :
               velocity==="up" ? "drop-shadow(0 0 4px rgba(120,255,160,0.6))" : "none";
  return (
    <div style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:9,fontWeight:700,padding:"2.5px 8px",borderRadius:4,background:"rgba(0,0,0,0.35)",color:"#FFFFFF"}}>
      <span style={{fontSize:14,lineHeight:1,filter:glow}}>{arrows[velocity]}</span>
      <span style={{opacity:0.9}}>{delta}</span>
    </div>
  );
}

/* ═══════════════════════════════════════
   ROOT CAUSE ICONS (unchanged)
   ═══════════════════════════════════════ */
const ROOT_ICONS = { budget:"💰", adoption:"👤", scope:"📐", market:"📉" };
function RootCauseIcon({cause}) {
  return (
    <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:24,height:24,borderRadius:5,background:"rgba(0,0,0,0.35)",fontSize:13}}>
      {ROOT_ICONS[cause]||"❓"}
    </div>
  );
}

/* ═══════════════════════════════════════
   DUAL-TRACK SLIDER (unchanged)
   ═══════════════════════════════════════ */
function DualSlider({milestones, budgetBurn}) {
  const overrun = budgetBurn > milestones + 0.1;
  return (
    <div style={{position:"absolute",bottom:0,left:0,right:0,height:7,zIndex:5,display:"flex",flexDirection:"column",gap:1}}>
      <div style={{height:3,background:"rgba(255,255,255,0.08)",position:"relative"}}>
        <div style={{height:"100%",width:`${milestones*100}%`,background:"rgba(255,255,255,0.85)",boxShadow:"0 0 5px rgba(255,255,255,0.4)",borderRadius:"0 1px 1px 0",transition:"width 0.5s"}}/>
      </div>
      <div style={{height:3,background:"rgba(255,255,255,0.04)",position:"relative"}}>
        <div style={{height:"100%",width:`${budgetBurn*100}%`,background:overrun?"rgba(220,38,38,0.6)":"rgba(255,255,255,0.25)",boxShadow:overrun?"0 0 4px rgba(220,38,38,0.3)":"none",borderRadius:"0 1px 1px 0",transition:"width 0.5s"}}/>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   v5.1 NEW: ZOMBIE INDICATOR
   Shows days since last milestone move.
   Green <30d, Amber 30-60d, Red >60d.
   ═══════════════════════════════════════ */
function ZombieIndicator({ days }) {
  const isZombie = days > 60;
  const isWarning = days > 30;
  const color = isZombie ? "#FCA5A5" : isWarning ? "#FCD34D" : "#6B7280";
  const bg = isZombie ? "rgba(155,0,0,0.2)" : isWarning ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.04)";
  const border = isZombie ? "1px solid rgba(155,0,0,0.25)" : "none";
  const label = days < 14 ? `${days}d ago` : days < 60 ? `${Math.round(days/7)}w ago` : `${Math.round(days/30)}mo stale`;

  return (
    <div style={{
      display:"inline-flex", alignItems:"center", gap:4,
      fontSize:8, fontWeight:700, padding:"2px 7px", borderRadius:3,
      background:bg, color, border,
    }}>
      {/* Mini activity sparkline: 5 dots showing recency */}
      <div style={{display:"flex",gap:1.5,alignItems:"center"}}>
        {[4,3,2,1,0].map(i => {
          const age = i * 15; // each dot = ~15 days
          const active = days <= age + 15;
          return (
            <div key={i} style={{
              width:3, height: active ? 8 - i : 3,
              borderRadius:1,
              background: active ? color : "rgba(255,255,255,0.1)",
              transition:"height 0.3s",
            }}/>
          );
        })}
      </div>
      <span>{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════
   v5.1 NEW: DEPENDENCY BADGE
   Shows on ANY building/stalled tile
   with a blocker, not just stalled.
   ═══════════════════════════════════════ */
function DependencyBadge({ blocker }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:3,
      fontSize:8, fontWeight:700, padding:"2px 7px", borderRadius:3,
      background:"rgba(255,255,255,0.06)", color:"#A3A3A3",
      border:"1px solid rgba(255,255,255,0.06)",
    }}>
      <span style={{fontSize:10}}>🔗</span>{blocker}
    </span>
  );
}

/* ═══════════════════════════════════════
   TILE
   ═══════════════════════════════════════ */
function Tile({r, gap, dimmed}) {
  const zone = getZone(r);
  const border = getBorder(r.dev, zone);
  const isBuilding = zone==="building" || zone==="stalled";
  const isStalled = zone==="stalled";
  const isCriticalBudget = r.dev > 0.25 && !isBuilding;
  const buildingOverrun = isBuilding && r.budgetBurn > (r.milestones||0) + 0.15;
  const isZombie = isBuilding && !isStalled && r.lastActivity > 60;
  const needsPulse = isCriticalBudget || isStalled || buildingOverrun || isZombie;
  const isLaunch = zone==="building" && !isStalled && r.daysToLive && r.daysToLive <= 30;

  const launchColor = r.confidence==="high" ? {bg:"rgba(6,95,70,0.35)",border:"1px solid rgba(52,211,153,0.4)",tx:"#6EE7B7"} :
                      r.confidence==="medium" ? {bg:"rgba(251,191,36,0.2)",border:"1px solid rgba(251,191,36,0.3)",tx:"#FCD34D"} :
                      {bg:"rgba(220,38,38,0.2)",border:"1px solid rgba(220,38,38,0.3)",tx:"#FCA5A5"};

  const sm = r.w<95||r.h<70;
  const xs = r.w<58||r.h<48;
  const micro = r.w<40||r.h<32;

  if(micro) return (
    <div style={{position:"absolute",left:r.x+gap,top:r.y+gap,width:r.w-gap*2,height:r.h-gap*2,borderRadius:8,background:ZONE_GRAD[zone],opacity:dimmed?.1:1,transition:"opacity 0.4s"}}>
      {needsPulse && <CrimsonPulse/>}
    </div>
  );

  return (
    <div style={{position:"absolute",left:r.x+gap,top:r.y+gap,width:r.w-gap*2,height:r.h-gap*2,borderRadius:10,overflow:"hidden",border:border||"none",opacity:dimmed?.1:1,transition:"opacity 0.4s"}}>
      {needsPulse && <CrimsonPulse/>}

      {/* Background */}
      <div style={{position:"absolute",inset:0,background:ZONE_GRAD[zone]}}/>

      {/* Building stripes */}
      {isBuilding && (
        <div style={{position:"absolute",inset:0,opacity:isStalled?0.4:0.6,
          backgroundImage:"repeating-linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.05) 10px, transparent 10px, transparent 20px)"}}/>
      )}

      {/* Red-tinted stripes for stalled */}
      {isStalled && (
        <div style={{position:"absolute",inset:0,opacity:0.15,
          backgroundImage:"repeating-linear-gradient(135deg, rgba(155,0,0,0.8), rgba(155,0,0,0.8) 10px, transparent 10px, transparent 20px)"}}/>
      )}

      {/* Inner shadow (live only) */}
      {!isBuilding && (
        <div style={{position:"absolute",inset:0,boxShadow:"inset 0 2px 6px rgba(0,0,0,0.25), inset 0 -1px 3px rgba(255,255,255,0.04)",pointerEvents:"none"}}/>
      )}

      {/* Data Glass (live tiles) */}
      {!xs && !isBuilding && (
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:sm?"50%":"44%",background:"rgba(0,0,0,0.25)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)",borderRadius:"0 0 8px 8px",borderTop:"1px solid rgba(255,255,255,0.05)"}}/>
      )}

      {/* LIVE: White neon benefit slider */}
      {!isBuilding && (
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:"rgba(255,255,255,0.2)",zIndex:5}}>
          <div style={{height:"100%",width:`${r.benefitPct*100}%`,background:"#FFFFFF",boxShadow:"0 0 8px #FFFFFF",transition:"width 0.5s"}}/>
        </div>
      )}

      {/* BUILDING: Dual-track slider */}
      {isBuilding && <DualSlider milestones={r.milestones||0} budgetBurn={r.budgetBurn||0}/>}

      {/* ── CONTENT ── */}
      <div style={{position:"relative",zIndex:3,padding:xs?"5px 6px":sm?"7px 9px":"10px 13px",height:"100%",display:"flex",flexDirection:"column",justifyContent:"space-between",color:ZONE_TX[zone]}}>

        {/* TOP HALF: Identity */}
        <div>
          <div style={{fontSize:xs?9.5:sm?11.5:14,fontWeight:700,lineHeight:1.2,textShadow:isBuilding?"none":"0 1px 3px rgba(0,0,0,0.5)",overflow:"hidden",display:"-webkit-box",WebkitLineClamp:sm?1:2,WebkitBoxOrient:"vertical"}}>
            {r.name}
          </div>

          {!xs && (
            <div style={{marginTop:4,display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
              {/* Phase badge */}
              {isLaunch ? (
                <span style={{display:"inline-block",fontSize:8,fontWeight:800,textTransform:"uppercase",letterSpacing:1,padding:"3px 8px",borderRadius:4,background:launchColor.bg,color:launchColor.tx,border:launchColor.border}}>
                  LAUNCH T-{r.daysToLive}d
                </span>
              ) : isStalled ? (
                <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:7,fontWeight:700,textTransform:"uppercase",letterSpacing:1.3,padding:"2.5px 7px",borderRadius:3,background:"rgba(155,0,0,0.3)",color:"#FCA5A5",border:"1px solid rgba(155,0,0,0.3)"}}>
                  STALLED
                </span>
              ) : (
                <span style={{display:"inline-block",fontSize:7,fontWeight:700,textTransform:"uppercase",letterSpacing:1.3,padding:"2.5px 7px",borderRadius:3,background:isBuilding?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.3)",color:isBuilding?"#525252":zone==="emerald"?"#6EE7B7":zone==="crimson"?"#FCA5A5":"#FCD34D"}}>
                  {r.phase==="building"?"BUILDING":r.phase==="delivering"?"DELIVERING":"LIVE"}
                </span>
              )}

              {/* v5.1: Dependency blocker on ANY building/stalled tile */}
              {isBuilding && r.blocker && !sm && (
                <DependencyBadge blocker={r.blocker} />
              )}

              {/* v5.1: Zombie indicator on building tiles */}
              {zone==="building" && !isStalled && r.lastActivity != null && !sm && (
                <ZombieIndicator days={r.lastActivity} />
              )}

              {/* Building burn warning */}
              {zone==="building" && !isStalled && buildingOverrun && !sm && (
                <span style={{display:"inline-flex",alignItems:"center",gap:3,fontSize:8,fontWeight:700,padding:"2px 7px",borderRadius:3,background:"rgba(220,38,38,0.15)",color:"#FCA5A5",border:"1px solid rgba(220,38,38,0.2)"}}>
                  ⚠ Burn &gt; Progress
                </span>
              )}

              {/* Amber: velocity */}
              {zone==="amber" && r.velocity && !sm && (
                <VelocityBadge velocity={r.velocity} delta={r.velocityDelta}/>
              )}

              {/* Crimson: root cause */}
              {zone==="crimson" && r.rootCause && !sm && (
                <RootCauseIcon cause={r.rootCause}/>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM HALF: Data Glass zone */}
        {!sm && (
          <div style={{lineHeight:1.5,position:"relative",zIndex:4}}>
            {/* Emerald surplus */}
            {zone==="emerald" && r.surplus > 0 && (
              <div style={{fontSize:10,fontWeight:700,color:"#6EE7B7",marginBottom:2,display:"flex",alignItems:"center",gap:3,textShadow:"0 1px 2px rgba(0,0,0,0.3)"}}>
                <span style={{fontSize:11}}>▲</span>+{fmt(r.surplus)} surplus
              </div>
            )}

            {/* Stalled: sunk cost + last activity */}
            {isStalled && (
              <div style={{fontSize:9.5,fontWeight:700,color:"#FCA5A5",marginBottom:2,display:"flex",alignItems:"center",gap:3}}>
                <span style={{fontSize:11}}>⚠</span>{fmt(r.spend)} sunk cost
                {r.lastActivity && <span style={{fontSize:8,opacity:.7,marginLeft:4}}>· {Math.round(r.lastActivity/30)}mo dark</span>}
              </div>
            )}

            {/* Spend */}
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600,fontSize:12,textShadow:isBuilding?"none":"0 1px 2px rgba(0,0,0,0.4)",opacity:.9}}>
              {fmt(r.spend)}
            </div>

            {/* ROI (live only) */}
            {!isBuilding && (
              <div style={{display:"flex",alignItems:"baseline",gap:5}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:19,letterSpacing:"-.5px",textShadow:"0 1px 4px rgba(0,0,0,0.4)"}}>{r.roi.toFixed(1)}x</span>
                <span style={{fontSize:8,opacity:.55,fontWeight:500}}>12mo</span>
              </div>
            )}

            {/* Budget overrun text (>5%) */}
            {r.dev > 0.05 && !isBuilding && (
              <div style={{fontSize:9,fontWeight:700,color:r.dev>0.25?"#FCA5A5":"rgba(255,255,255,0.6)",textShadow:"0 1px 2px rgba(0,0,0,0.3)"}}>
                +{(r.dev*100).toFixed(0)}% over budget
              </div>
            )}

            {/* Building: milestone / budget status */}
            {zone==="building" && !isStalled && (
              <div style={{fontSize:9.5,opacity:.6,display:"flex",gap:8}}>
                <span>{Math.round((r.milestones||0)*100)}% built</span>
                <span style={{opacity:.4}}>|</span>
                <span style={{color:buildingOverrun?"#FCA5A5":undefined}}>{Math.round((r.budgetBurn||0)*100)}% budget used</span>
              </div>
            )}
          </div>
        )}

        {sm && !xs && (
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,fontWeight:600,textShadow:isBuilding?"none":"0 1px 2px rgba(0,0,0,0.3)"}}>
            {fmt(r.spend)}
            {!isBuilding && <span style={{marginLeft:6,fontSize:9,opacity:.7}}>{r.roi.toFixed(1)}x</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAP VIEW (unchanged)
   ═══════════════════════════════════════ */
function MapView({W, H, hotSeat}) {
  const gap=4;
  const items=BOXES.map(b=>({...b,value:b.spend}));
  const rects=treemap(items,W,H);
  return (
    <div style={{position:"relative",width:W,height:H,borderRadius:16,overflow:"hidden",background:"#121212",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.02), 0 12px 48px rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.05)"}}>
      {rects.map((r,i) => {
        const dimmed = hotSeat && !isAtRisk(r);
        return <Tile key={i} r={r} gap={gap} dimmed={dimmed}/>;
      })}
    </div>
  );
}

/* ═══════════════════════════════════════
   LEGEND (updated with zombie + dep)
   ═══════════════════════════════════════ */
function Legend() {
  return (
    <div style={{display:"flex",gap:16,justifyContent:"flex-end",alignItems:"center",flexWrap:"wrap"}}>
      {[
        {grad:"linear-gradient(135deg,#047857,#022C22)",l:"Emerald ≥ 0.8x"},
        {grad:"linear-gradient(135deg,#B45309,#451A03)",l:"Amber 0.1–0.7x"},
        {grad:"linear-gradient(135deg,#9B0000,#4A0000)",l:"Crimson < 0.1x"},
        {grad:"#262626",l:"Building",stripe:true},
      ].map(({grad,l,stripe})=>(
        <div key={l} style={{display:"flex",alignItems:"center",gap:6,fontSize:10,color:"#9CA3AF"}}>
          <div style={{width:13,height:13,borderRadius:4,background:grad,boxShadow:"inset 0 1px 2px rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.08)",position:"relative",overflow:"hidden"}}>
            {stripe && <div style={{position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.06) 3px, transparent 3px, transparent 6px)"}}/>}
          </div>{l}
        </div>
      ))}
      <div style={{width:1,height:16,background:"rgba(255,255,255,0.06)"}}/>
      <div style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:"#9CA3AF"}}>
        <span style={{color:"#fff",fontSize:12,filter:"drop-shadow(0 0 3px rgba(120,255,160,0.5))"}}>↗</span>
        <span style={{color:"#fff",fontSize:12}}>→</span>
        <span style={{color:"#fff",fontSize:12,filter:"drop-shadow(0 0 3px rgba(255,120,120,0.5))"}}>↘</span>
        Velocity
      </div>
      <div style={{width:1,height:16,background:"rgba(255,255,255,0.06)"}}/>
      <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#9CA3AF"}}>
        <div style={{display:"flex",flexDirection:"column",gap:1,width:22}}>
          <div style={{height:2.5,background:"rgba(255,255,255,0.12)",borderRadius:1,position:"relative",overflow:"hidden"}}><div style={{width:"60%",height:"100%",background:"rgba(255,255,255,0.8)",boxShadow:"0 0 3px rgba(255,255,255,0.3)"}}/></div>
          <div style={{height:2.5,background:"rgba(255,255,255,0.04)",borderRadius:1,position:"relative",overflow:"hidden"}}><div style={{width:"75%",height:"100%",background:"rgba(220,38,38,0.5)"}}/></div>
        </div>
        Build vs Burn
      </div>
      <div style={{width:1,height:16,background:"rgba(255,255,255,0.06)"}}/>
      <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#9CA3AF"}}>
        <span style={{fontSize:11}}>🔗</span> Blocker
      </div>
      <div style={{width:1,height:16,background:"rgba(255,255,255,0.06)"}}/>
      <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#9CA3AF"}}>
        <div style={{display:"flex",gap:1,alignItems:"flex-end"}}>
          {[6,5,3,2,2].map((h,i)=>(<div key={i} style={{width:2.5,height:h,borderRadius:1,background:i<2?"#6B7280":"rgba(255,255,255,0.1)"}}/>))}
        </div>
        Activity
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   SPEC TABLE (updated)
   ═══════════════════════════════════════ */
function SpecTable() {
  const rows = [
    {f:"Dual Slider", logic:"Top = milestone progress (white). Bottom = budget consumed (ghost). Red when burn > progress.", story:"Spending faster than building?"},
    {f:"Zombie Detection", logic:"Mini sparkline + time label. Green <30d, amber 30-60d, red >60d stale. Pulse if >60d.", story:"Is stagnant money parked here?"},
    {f:"Dependency 🔗", logic:"Shown on ALL building/stalled tiles with a blocker. Names the blocking department.", story:"Who do we pressure to unblock?"},
    {f:"Launch Confidence", logic:"T-minus badge: Emerald (0 slips), Amber (1 slip), Red (2+ slips).", story:"Can we trust this date?"},
    {f:"White ↗↘ Arrows", logic:"High-contrast white, directional glow. On amber tiles only.", story:"Improving or slow death?"},
    {f:"Crimson Pulse", logic:"Critical budget (>25%), stalled, zombie (>60d), or burn > progress.", story:"Where is capital bleeding?"},
    {f:"Hot Seat Toggle", logic:"Capital at Risk KPI dims everything except problem tiles.", story:"Show me only the fires."},
  ];
  return (
    <div style={{borderRadius:14,padding:24,background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.06)"}}>
      <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:"#6B7280",marginBottom:14}}>
        v5.1 Encoding Spec
      </div>
      <div style={{display:"grid",gridTemplateColumns:"140px 1fr 1fr",gap:0}}>
        {["Feature","Visual Logic","Boardroom Story"].map(h=>(
          <div key={h} style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,color:"#525252",padding:"8px 10px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>{h}</div>
        ))}
        {rows.map((r,i)=>(
          ["f","logic","story"].map(c=>(
            <div key={`${i}-${c}`} style={{fontSize:11,lineHeight:1.6,padding:"9px 10px",color:c==="f"?"#E2E8F0":c==="story"?"#9CA3AF":"#6B7280",fontWeight:c==="f"?600:400,borderBottom:i<rows.length-1?"1px solid rgba(255,255,255,0.03)":"none"}}>{r[c]}</div>
          ))
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN (unchanged except spec label)
   ═══════════════════════════════════════ */
export default function App() {
  const [hotSeat, setHotSeat] = useState(false);

  const capitalAtRisk = useMemo(()=>{
    return BOXES.filter(b=>isAtRisk(b)).reduce((s,b)=>s+b.spend,0);
  },[]);

  return (
    <div style={{fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",minHeight:"100vh",background:"#0D0F12",color:"#E2E8F0"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
      `}</style>

      <div style={{padding:"28px 40px 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <div>
            <div style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:1.5,color:"#525252",marginBottom:3}}>Enterprise AI Strategy</div>
            <h1 style={{fontSize:28,fontWeight:700,letterSpacing:"-.8px",color:"#F1F5F9"}}>
              Investment Portfolio
              <span style={{fontSize:12,fontWeight:500,color:"#525252",marginLeft:12}}>v5.1</span>
            </h1>
          </div>
          <div style={{fontFamily:"'JetBrains Mono'",fontSize:30,fontWeight:700,color:"#F1F5F9",letterSpacing:"-1px"}}>2025 · Q4</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginTop:22}}>
          {[
            {l:"Total Invested",v:"$411.2M",s:"24 initiatives",c:"#F1F5F9"},
            {l:"Total Benefit",v:"$67.4M",s:"cumulative realized",c:"#34D399"},
            {l:"Trailing 12mo ROI",v:"0.25x",s:"current run rate",c:"#FBBF24"},
            {l:"Lifetime ROI",v:"0.16x",s:"all-time return",c:"#FBBF24"},
            {l:"Capital at Risk",v:fmt(capitalAtRisk),s:hotSeat?"Click to reset":"Click for Hot Seat",c:"#EF4444",click:true},
          ].map((k,i)=>(
            <div key={i}
              onClick={k.click?()=>setHotSeat(!hotSeat):undefined}
              style={{
                borderRadius:14,padding:"15px 18px",
                background:k.click && hotSeat?"rgba(220,38,38,0.12)":"rgba(255,255,255,0.025)",
                border:k.click?(hotSeat?"1px solid rgba(220,38,38,0.35)":"1px solid rgba(220,38,38,0.15)"):"1px solid rgba(255,255,255,0.05)",
                cursor:k.click?"pointer":"default",transition:"all 0.3s",
              }}>
              <div style={{fontSize:9,fontWeight:600,textTransform:"uppercase",letterSpacing:1,color:"#525252",marginBottom:7,display:"flex",alignItems:"center",gap:5}}>
                {k.l}
                {k.click && <span style={{fontSize:7,padding:"1px 5px",borderRadius:3,background:hotSeat?"rgba(220,38,38,0.25)":"rgba(255,255,255,0.06)",color:hotSeat?"#FCA5A5":"#525252",fontWeight:700}}>{hotSeat?"HOT SEAT":"FILTER"}</span>}
              </div>
              <div style={{fontFamily:"'JetBrains Mono'",fontSize:22,fontWeight:700,color:k.c}}>{k.v}</div>
              <div style={{fontSize:10,color:k.click?(hotSeat?"#FCA5A5":"#6B7280"):"#4B5563",marginTop:4}}>{k.s}</div>
            </div>
          ))}
        </div>

        <div style={{marginTop:16}}><Legend/></div>
      </div>

      <div style={{padding:"16px 40px"}}>
        <MapView W={920} H={480} hotSeat={hotSeat}/>
      </div>

      <div style={{padding:"8px 40px 40px"}}>
        <SpecTable/>
      </div>
    </div>
  );
}
