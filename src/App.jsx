import { useState, useRef, useEffect } from "react";

const PROFESSIONS = [
  "Speech-Language Pathologist","Physical Therapist","Occupational Therapist",
  "Registered Nurse","Physician (MD/DO)","Licensed Clinical Social Worker",
  "Psychologist","Dentist","Pharmacist","Physician Assistant",
  "Nurse Practitioner","Respiratory Therapist","Radiologic Technologist",
  "Medical Laboratory Scientist","Dietitian / Nutritionist"
];

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming"
];

const INTL = [
  {value:"Portugal",flag:"🇵🇹"},{value:"United Kingdom",flag:"🇬🇧"},
  {value:"Canada",flag:"🇨🇦"},{value:"Australia",flag:"🇦🇺"},
  {value:"Germany",flag:"🇩🇪"},{value:"New Zealand",flag:"🇳🇿"},
  {value:"Ireland",flag:"🇮🇪"},{value:"Netherlands",flag:"🇳🇱"},
  {value:"Sweden",flag:"🇸🇪"},{value:"United Arab Emirates",flag:"🇦🇪"},
  {value:"Singapore",flag:"🇸🇬"},{value:"Spain",flag:"🇪🇸"},
];

const REQ_TYPES = {
  "Required for all": { bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5", dot: "#ef4444" },
  "Required for some": { bg: "#fef3c7", color: "#92400e", border: "#fcd34d", dot: "#f59e0b" },
  "Not required": { bg: "#dcfce7", color: "#166534", border: "#86efac", dot: "#22c55e" },
};

function inferRequirement(item) {
  const lower = item.toLowerCase();
  if (lower.includes("may ") || lower.includes("some ") || lower.includes("if required") || lower.includes("depending") || lower.includes("additional supervised") || lower.includes("varies")) {
    return "Required for some";
  }
  if (lower.includes("not required") || lower.includes("exempt") || lower.includes("waived")) {
    return "Not required";
  }
  return "Required for all";
}

export default function App() {
  const [step, setStep] = useState(1);
  const [profession, setProfession] = useState("");
  const [currentState, setCurrentState] = useState("");
  const [destType, setDestType] = useState("international");
  const [destination, setDestination] = useState("");
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [error, setError] = useState("");
  const [expandedPhase, setExpandedPhase] = useState(null);
  const [checked, setChecked] = useState({});
  const [expandedSection, setExpandedSection] = useState("overview");
  const topRef = useRef(null);
  const selectedIntl = INTL.find(d => d.value === destination);

  const toggleCheck = (phaseIdx, itemIdx) => {
    const key = phaseIdx + "-" + itemIdx;
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getProgress = () => {
    if (!roadmap) return { completed: 0, total: 0, pct: 0 };
    let total = 0, completed = 0;
    roadmap.phases && roadmap.phases.forEach((phase, pi) => {
      phase.items && phase.items.forEach((item, ii) => {
        total++;
        if (checked[pi + "-" + ii]) completed++;
      });
    });
    return { completed, total, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const getRemainingTimeline = () => {
    if (!roadmap) return roadmap && roadmap.timeline;
    const { pct } = getProgress();
    if (pct === 0) return roadmap.timeline;
    if (pct >= 100) return "Complete!";
    const match = roadmap.timeline && roadmap.timeline.match(/(\d+)[–-](\d+)/);
    if (!match) return roadmap.timeline;
    const min = parseInt(match[1]);
    const max = parseInt(match[2]);
    const remaining = Math.round(((100 - pct) / 100) * max);
    if (remaining <= 1) return "~1 month remaining";
    return "~" + remaining + " months remaining";
  };

  const getRemainingCost = () => {
    if (!roadmap) return roadmap && roadmap.cost_estimate;
    const { pct } = getProgress();
    if (pct === 0) return roadmap.cost_estimate;
    if (pct >= 100) return "$0 remaining";
    const match = roadmap.cost_estimate && roadmap.cost_estimate.match(/\$?([\d,]+)/g);
    if (!match || match.length < 1) return roadmap.cost_estimate;
    const nums = match.map(m => parseInt(m.replace(/[$,]/g, "")));
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    const remaining = Math.round(avg * ((100 - pct) / 100));
    return "~$" + remaining.toLocaleString() + " remaining";
  };

  const handleGenerate = async () => {
    if (!profession || !currentState || !destination) return;
    setLoading(true); setError(""); setRoadmap(null); setStep(4); setChecked({});
    if (topRef.current) topRef.current.scrollIntoView({ behavior: "smooth" });
    const dest = destType === "international" ? destination : destination + ", USA";
    const messages = [
      "Searching for licensing requirements...",
      "Verifying board websites...",
      "Building your personalized roadmap...",
      "Almost there..."
    ];
    let msgIdx = 0;
    setLoadingText(messages[0]);
    const interval = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, messages.length - 1);
      setLoadingText(messages[msgIdx]);
    }, 6000);
    try {
      const res = await fetch("/api/generate-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profession, currentState, destination, destType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "API error");
      setRoadmap(data);
      setExpandedPhase(0);
      setExpandedSection("checklist");
    } catch(err) {
      setError("Something went wrong. Please try again.");
      setStep(3);
    } finally {
      clearInterval(interval);
      setLoading(false); setLoadingText("");
    }
  };

  const reset = () => {
    setStep(1); setProfession(""); setCurrentState("");
    setDestination(""); setRoadmap(null); setError(""); setExpandedPhase(null); setChecked({});
    if (topRef.current) topRef.current.scrollIntoView({ behavior: "smooth" });
  };

  const progress = getProgress();

  return (
    <div style={{ minHeight: "100vh", background: "#faf7f2", fontFamily: "'Georgia', 'Times New Roman', serif", color: "#2d2418" }} ref={topRef}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:0.5 } 50% { opacity:1 } }
        @keyframes shimmer { 0% { background-position: -200% center } 100% { background-position: 200% center } }
        .fade-up { animation: fadeUp 0.4s ease both }
        select { appearance:none; -webkit-appearance:none }
        .prof-btn:hover { background: #fdf3e3 !important; border-color: #d4915a !important; }
        .dest-btn:hover { background: #fdf3e3 !important; border-color: #d4915a !important; }
        .check-row:hover { background: #fdf8f0 !important; }
        .nav-btn:hover { background: #fdf3e3 !important; }
        .res-link:hover { background: #fdf3e3 !important; border-color: #d4915a !important; color: #b05a2a !important; }
        ::-webkit-scrollbar { width: 6px }
        ::-webkit-scrollbar-track { background: #faf7f2 }
        ::-webkit-scrollbar-thumb { background: #e8d5b0; border-radius: 3px }
        .section-btn:hover { background: #fdf3e3 !important; }
        input[type="checkbox"] { accent-color: #c47b3a; width: 20px; height: 20px; cursor: pointer; flex-shrink: 0; }
      `}</style>

      {/* Nav */}
      <nav style={{ padding: "16px 32px", borderBottom: "2px solid #e8d5b0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff8ee", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(180,120,50,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={reset}>
          <div style={{ width: 40, height: 40, background: "linear-gradient(135deg,#c47b3a,#e8a85a)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 4px 12px rgba(196,123,58,0.3)" }}>🧭</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#7a3a10", letterSpacing: "-0.02em" }}>CredentialCompass</div>
            <div style={{ fontSize: 11, color: "#b08060", letterSpacing: "0.1em", textTransform: "uppercase" }}>Clinical License Navigator</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "20px", padding: "5px 12px" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
            <span style={{ fontSize: 11, color: "#166534", letterSpacing: "0.06em", fontFamily: "Georgia, serif" }}>AI + Web Search</span>
          </div>
          {step === 4 && roadmap && (
            <button onClick={reset} className="nav-btn" style={{ background: "transparent", border: "2px solid #e8d5b0", color: "#9a7050", padding: "6px 14px", borderRadius: "8px", cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif" }}>← New Search</button>
          )}
        </div>
      </nav>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 20px 80px" }}>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="fade-up">
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <div style={{ display: "inline-block", background: "#fdf3e3", border: "1px solid #e8c080", borderRadius: "20px", padding: "6px 18px", marginBottom: 16, fontSize: 13, color: "#b07030", letterSpacing: "0.08em" }}>Step 1 of 3</div>
              <h1 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 700, color: "#4a2008", marginBottom: 12, lineHeight: 1.2 }}>What is your clinical profession?</h1>
              <p style={{ color: "#8a6040", fontSize: 17, maxWidth: 440, margin: "0 auto", lineHeight: 1.6 }}>Select your license type to get a personalized relocation roadmap.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12, marginBottom: 32 }}>
              {PROFESSIONS.map(p => (
                <button key={p} className="prof-btn" onClick={() => setProfession(p)} style={{ padding: "16px 18px", background: profession === p ? "#fdf3e3" : "#fff", border: "2px solid " + (profession === p ? "#d4915a" : "#e8d5b0"), borderRadius: "12px", color: profession === p ? "#7a3a10" : "#5a4030", cursor: "pointer", fontSize: 16, textAlign: "left", fontFamily: "Georgia, serif", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 12, boxShadow: profession === p ? "0 4px 16px rgba(196,123,58,0.15)" : "0 1px 4px rgba(0,0,0,0.05)" }}>
                  {profession === p
                    ? <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#c47b3a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", flexShrink: 0, fontWeight: 700 }}>✓</span>
                    : <span style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid #e8d5b0", display: "inline-block", flexShrink: 0 }} />
                  }
                  <span style={{ fontWeight: profession === p ? 600 : 400 }}>{p}</span>
                </button>
              ))}
            </div>
            <button onClick={() => profession && setStep(2)} disabled={!profession} style={{ width: "100%", padding: "18px", background: profession ? "linear-gradient(135deg,#c47b3a,#e8a85a)" : "#f0e8dc", border: "none", borderRadius: "14px", color: profession ? "#fff" : "#c0a880", fontSize: 18, fontWeight: 700, cursor: profession ? "pointer" : "not-allowed", fontFamily: "Georgia, serif", boxShadow: profession ? "0 8px 24px rgba(196,123,58,0.35)" : "none", transition: "all 0.3s", letterSpacing: "0.01em" }}>
              {profession ? "Continue with " + profession + " →" : "Select a profession to continue"}
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="fade-up">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32, padding: "14px 20px", background: "#fff8ee", border: "2px solid #e8d5b0", borderRadius: "12px", flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, color: "#c47b3a", fontWeight: 600 }}>✓ {profession}</span>
              <span style={{ color: "#c8a870", fontSize: 18 }}>→</span>
              <span style={{ fontSize: 15, color: "#9a7050", fontWeight: 600 }}>Where licensed?</span>
              <span style={{ color: "#c8a870", fontSize: 18 }}>→</span>
              <span style={{ fontSize: 15, color: "#c0a880" }}>Destination</span>
            </div>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ display: "inline-block", background: "#fdf3e3", border: "1px solid #e8c080", borderRadius: "20px", padding: "6px 18px", marginBottom: 16, fontSize: 13, color: "#b07030" }}>Step 2 of 3</div>
              <h1 style={{ fontSize: "clamp(26px,4vw,42px)", fontWeight: 700, color: "#4a2008", marginBottom: 12, lineHeight: 1.2 }}>Where are you currently licensed?</h1>
              <p style={{ color: "#8a6040", fontSize: 17, maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>Select the US state where your license is currently active.</p>
            </div>
            <div style={{ background: "#fff", border: "2px solid #e8d5b0", borderRadius: "16px", padding: "32px", marginBottom: 24, boxShadow: "0 4px 20px rgba(180,120,50,0.08)" }}>
              <label style={{ display: "block", fontSize: 20, fontWeight: 700, color: "#4a2008", marginBottom: 8 }}>Your current license state</label>
              <p style={{ fontSize: 15, color: "#8a6040", marginBottom: 20, lineHeight: 1.6 }}>This is the state where you hold your active license right now.</p>
              <div style={{ position: "relative" }}>
                <select value={currentState} onChange={e => setCurrentState(e.target.value)}
                  style={{ width: "100%", padding: "16px 48px 16px 20px", background: "#faf7f2", border: "2px solid " + (currentState ? "#c47b3a" : "#e8d5b0"), borderRadius: "12px", color: currentState ? "#3a2010" : "#a08060", fontSize: 17, fontFamily: "Georgia, serif", outline: "none", cursor: "pointer" }}
                  onFocus={e => e.target.style.borderColor = "#c47b3a"}
                  onBlur={e => { if (!currentState) e.target.style.borderColor = "#e8d5b0"; }}>
                  <option value="">— Choose your state —</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", color: "#a08060", pointerEvents: "none", fontSize: 20 }}>▾</span>
              </div>
              {currentState && (
                <div style={{ marginTop: 16, padding: "14px 18px", background: "#f0fdf4", border: "2px solid #86efac", borderRadius: "10px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#22c55e", fontSize: 20 }}>✓</span>
                  <span style={{ fontSize: 16, color: "#166534", fontWeight: 500 }}>Currently licensed in <strong>{currentState}</strong></span>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: "16px", background: "#fff", border: "2px solid #e8d5b0", borderRadius: "12px", color: "#8a6040", fontSize: 16, cursor: "pointer", fontFamily: "Georgia, serif" }}>← Back</button>
              <button onClick={() => currentState && setStep(3)} disabled={!currentState} style={{ flex: 3, padding: "16px", background: currentState ? "linear-gradient(135deg,#c47b3a,#e8a85a)" : "#f0e8dc", border: "none", borderRadius: "12px", color: currentState ? "#fff" : "#c0a880", fontSize: 17, fontWeight: 700, cursor: currentState ? "pointer" : "not-allowed", fontFamily: "Georgia, serif", boxShadow: currentState ? "0 6px 20px rgba(196,123,58,0.3)" : "none", transition: "all 0.3s" }}>
                {currentState ? "Next: Choose Destination →" : "Select a state to continue"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="fade-up">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32, padding: "14px 20px", background: "#fff8ee", border: "2px solid #e8d5b0", borderRadius: "12px", flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, color: "#c47b3a", fontWeight: 600 }}>✓ {profession}</span>
              <span style={{ color: "#c8a870", fontSize: 18 }}>→</span>
              <span style={{ fontSize: 15, color: "#c47b3a", fontWeight: 600 }}>✓ {currentState}</span>
              <span style={{ color: "#c8a870", fontSize: 18 }}>→</span>
              <span style={{ fontSize: 15, color: "#9a7050", fontWeight: 600 }}>Where to?</span>
            </div>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ display: "inline-block", background: "#fdf3e3", border: "1px solid #e8c080", borderRadius: "20px", padding: "6px 18px", marginBottom: 16, fontSize: 13, color: "#b07030" }}>Step 3 of 3</div>
              <h1 style={{ fontSize: "clamp(26px,4vw,42px)", fontWeight: 700, color: "#4a2008", marginBottom: 12, lineHeight: 1.2 }}>Where are you moving?</h1>
              <p style={{ color: "#8a6040", fontSize: 17, maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>Select your destination country or US state.</p>
            </div>

            <div style={{ display: "flex", gap: 0, marginBottom: 28, background: "#fff", border: "2px solid #e8d5b0", borderRadius: "14px", padding: "4px" }}>
              {[["international", "🌍  Moving Abroad"], ["domestic", "🇺🇸  Staying in the US"]].map(([v, l]) => (
                <button key={v} onClick={() => { setDestType(v); setDestination(""); }} style={{ flex: 1, padding: "14px", background: destType === v ? "linear-gradient(135deg,#c47b3a,#e8a85a)" : "transparent", border: "none", borderRadius: "11px", color: destType === v ? "#fff" : "#8a6040", cursor: "pointer", fontSize: 16, fontWeight: destType === v ? 700 : 400, fontFamily: "Georgia, serif", transition: "all 0.2s" }}>{l}</button>
              ))}
            </div>

            {destType === "international" ? (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 16, color: "#8a6040", marginBottom: 16, textAlign: "center" }}>Select the country you are relocating to:</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 12 }}>
                  {INTL.map(d => (
                    <button key={d.value} className="dest-btn" onClick={() => setDestination(d.value)} style={{ padding: "16px", background: destination === d.value ? "#fdf3e3" : "#fff", border: "2px solid " + (destination === d.value ? "#d4915a" : "#e8d5b0"), borderRadius: "12px", color: destination === d.value ? "#7a3a10" : "#5a4030", cursor: "pointer", fontSize: 16, fontFamily: "Georgia, serif", textAlign: "left", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 10, boxShadow: destination === d.value ? "0 4px 16px rgba(196,123,58,0.15)" : "0 1px 4px rgba(0,0,0,0.04)" }}>
                      <span style={{ fontSize: 24 }}>{d.flag}</span>
                      <span style={{ fontWeight: destination === d.value ? 600 : 400 }}>{d.value}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ background: "#fff", border: "2px solid #e8d5b0", borderRadius: "16px", padding: "28px", marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 20, fontWeight: 700, color: "#4a2008", marginBottom: 8 }}>Your destination state</label>
                <p style={{ fontSize: 15, color: "#8a6040", marginBottom: 18 }}>Which state are you moving to?</p>
                <div style={{ position: "relative" }}>
                  <select value={destination} onChange={e => setDestination(e.target.value)}
                    style={{ width: "100%", padding: "16px 48px 16px 20px", background: "#faf7f2", border: "2px solid " + (destination ? "#c47b3a" : "#e8d5b0"), borderRadius: "12px", color: destination ? "#3a2010" : "#a08060", fontSize: 17, fontFamily: "Georgia, serif", outline: "none", cursor: "pointer" }}
                    onFocus={e => e.target.style.borderColor = "#c47b3a"}
                    onBlur={e => { if (!destination) e.target.style.borderColor = "#e8d5b0"; }}>
                    <option value="">— Choose a state —</option>
                    {US_STATES.filter(s => s !== currentState).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <span style={{ position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)", color: "#a08060", pointerEvents: "none", fontSize: 20 }}>▾</span>
                </div>
              </div>
            )}

            {error && <div style={{ padding: "16px 20px", background: "#fef2f2", border: "2px solid #fca5a5", borderRadius: "12px", color: "#b91c1c", fontSize: 16, marginBottom: 20 }}>⚠ {error}</div>}

            {destination && (
              <div style={{ background: "#fff8ee", border: "2px solid #e8c080", borderRadius: "14px", padding: "18px 22px", marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: "#b07030", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10, fontWeight: 600 }}>Ready to Generate</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 17, color: "#4a2008", fontWeight: 600 }}>{profession}</span>
                  <span style={{ color: "#c47b3a", fontSize: 22 }}>→</span>
                  <span style={{ fontSize: 16, color: "#8a6040" }}>{currentState}</span>
                  <span style={{ color: "#c47b3a", fontSize: 22 }}>→</span>
                  <span style={{ fontSize: 17, color: "#4a2008", fontWeight: 600 }}>{selectedIntl ? selectedIntl.flag + " " : ""}{destination}</span>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: "16px", background: "#fff", border: "2px solid #e8d5b0", borderRadius: "12px", color: "#8a6040", fontSize: 16, cursor: "pointer", fontFamily: "Georgia, serif" }}>← Back</button>
              <button onClick={handleGenerate} disabled={!destination} style={{ flex: 3, padding: "18px", background: destination ? "linear-gradient(135deg,#c47b3a,#e8a85a)" : "#f0e8dc", border: "none", borderRadius: "12px", color: destination ? "#fff" : "#c0a880", fontSize: 18, fontWeight: 700, cursor: destination ? "pointer" : "not-allowed", fontFamily: "Georgia, serif", boxShadow: destination ? "0 8px 24px rgba(196,123,58,0.35)" : "none", transition: "all 0.3s" }}>
                {destination ? "🧭  Generate My Roadmap" : "Select a destination to continue"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: LOADING */}
        {step === 4 && loading && (
          <div className="fade-up" style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ width: 64, height: 64, border: "4px solid #e8d5b0", borderTop: "4px solid #c47b3a", borderRadius: "50%", margin: "0 auto 28px", animation: "spin 1s linear infinite" }} />
            <div style={{ fontSize: 22, color: "#4a2008", marginBottom: 12, fontWeight: 600 }}>{loadingText}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, color: "#8a6040", fontSize: 17 }}>
              <span>{currentState}</span>
              <span style={{ color: "#c47b3a", fontSize: 22 }}>→</span>
              <span>{selectedIntl ? selectedIntl.flag + " " : ""}{destination}</span>
            </div>
            <div style={{ marginTop: 16, fontSize: 14, color: "#b08060", animation: "pulse 2s ease infinite" }}>This may take 20–30 seconds while we search for verified requirements</div>
          </div>
        )}

        {/* STEP 4: RESULTS */}
        {step === 4 && !loading && roadmap && (() => {
          return (
            <div className="fade-up">

              {/* Header Card */}
              <div style={{ background: "linear-gradient(135deg, #fff8ee, #fdf3e3)", border: "2px solid #e8c080", borderRadius: "20px", padding: "28px 32px", marginBottom: 20, boxShadow: "0 8px 32px rgba(180,120,50,0.12)" }}>
                <div style={{ fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", color: "#b07030", marginBottom: 8, fontWeight: 600 }}>Your Credential Roadmap</div>
                <h2 style={{ fontSize: 28, fontWeight: 700, color: "#4a2008", marginBottom: 6 }}>{profession}</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#8a6040", fontSize: 17, marginBottom: 20, flexWrap: "wrap" }}>
                  <span>{currentState}</span>
                  <span style={{ color: "#c47b3a", fontSize: 20 }}>→</span>
                  <span style={{ fontWeight: 600, color: "#4a2008" }}>{selectedIntl ? selectedIntl.flag + " " : ""}{destination}</span>
                </div>

                {/* Stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
                  {[
                    ["⏱", "Timeline", getRemainingTimeline()],
                    ["💰", "Est. Cost", getRemainingCost()],
                    ["🌐", "Language", roadmap.language],
                    ["📋", "Governing Body", roadmap.governing_body],
                  ].map(([icon, label, val]) => (
                    <div key={label} style={{ background: "#fff", border: "1px solid #e8d5b0", borderRadius: "12px", padding: "14px 16px", boxShadow: "0 2px 8px rgba(180,120,50,0.06)" }}>
                      <div style={{ fontSize: 12, color: "#b08060", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>{icon} {label}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#4a2008", lineHeight: 1.3 }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14, padding: "12px 16px", background: "#fff", border: "1px solid #e8d5b0", borderRadius: "10px", fontSize: 13, color: "#8a6040", lineHeight: 1.7 }}>
                  <strong style={{ color: "#7a4020" }}>💰 What the cost estimate includes:</strong> Licensing application fees, credential evaluation services, required exams, background checks, and document authentication. <strong style={{ color: "#b91c1c" }}>Not included:</strong> Travel, relocation expenses, housing, visa attorney fees, language courses, or lost income during the transition.
                </div>

                {/* Progress bar */}
                {progress.total > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 15, color: "#7a5030", fontWeight: 600 }}>Your Progress</span>
                      <span style={{ fontSize: 15, color: "#c47b3a", fontWeight: 700 }}>{progress.completed} of {progress.total} steps completed ({progress.pct}%)</span>
                    </div>
                    <div style={{ height: 12, background: "#f0e4d0", borderRadius: "6px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: progress.pct + "%", background: "linear-gradient(90deg,#c47b3a,#e8a85a)", borderRadius: "6px", transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Section tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                {[["checklist", "✅ Interactive Checklist"], ["tips", "💡 Tips & Warnings"], ["resources", "🔗 Resources"]].map(([id, label]) => (
                  <button key={id} className="section-btn" onClick={() => setExpandedSection(id)} style={{ padding: "10px 20px", background: expandedSection === id ? "linear-gradient(135deg,#c47b3a,#e8a85a)" : "#fff", border: "2px solid " + (expandedSection === id ? "#c47b3a" : "#e8d5b0"), borderRadius: "10px", color: expandedSection === id ? "#fff" : "#7a5030", cursor: "pointer", fontSize: 15, fontWeight: expandedSection === id ? 700 : 400, fontFamily: "Georgia, serif", transition: "all 0.2s" }}>{label}</button>
                ))}
              </div>

              {/* CHECKLIST SECTION */}
              {expandedSection === "checklist" && (
                <div>
                  <div style={{ background: "#fff8ee", border: "1px solid #e8c080", borderRadius: "12px", padding: "14px 18px", marginBottom: 16, fontSize: 14, color: "#8a6040", lineHeight: 1.6 }}>
                    ✨ <strong>Interactive Checklist:</strong> Check off completed items to see your timeline and cost automatically update above.
                  </div>

                  {/* Requirement legend */}
                  <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                    {Object.entries(REQ_TYPES).map(([label, style]) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, background: style.bg, border: "1px solid " + style.border, borderRadius: "20px", padding: "4px 12px" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: style.dot }} />
                        <span style={{ fontSize: 13, color: style.color, fontWeight: 600 }}>{label}</span>
                      </div>
                    ))}
                  </div>

                  {roadmap.phases && roadmap.phases.map((phase, pi) => {
                    const open = expandedPhase === pi;
                    const phaseChecked = phase.items ? phase.items.filter((_, ii) => checked[pi + "-" + ii]).length : 0;
                    const phaseTotal = phase.items ? phase.items.length : 0;
                    return (
                      <div key={pi} style={{ marginBottom: 12, borderRadius: "14px", overflow: "hidden", boxShadow: "0 2px 12px rgba(180,120,50,0.08)", border: "2px solid " + (open ? "#d4915a" : "#e8d5b0") }}>
                        <button onClick={() => setExpandedPhase(open ? null : pi)} style={{ width: "100%", background: open ? "#fff8ee" : "#fff", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", textAlign: "left", border: "none" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 44, height: 44, background: open ? "#fdf3e3" : "#faf7f2", border: "2px solid " + (open ? "#d4915a" : "#e8d5b0"), borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{phase.icon || "📌"}</div>
                            <div>
                              <div style={{ fontSize: 18, fontWeight: 700, color: "#4a2008" }}><span style={{ color: "#c8a060", marginRight: 8, fontSize: 14 }}>Phase {pi + 1}</span>{phase.phase}</div>
                              <div style={{ fontSize: 14, color: "#9a7050", marginTop: 3 }}>{phase.duration} · {phaseChecked}/{phaseTotal} completed</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {phaseChecked === phaseTotal && phaseTotal > 0 && <span style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "20px", padding: "3px 10px", fontSize: 12, color: "#166534", fontWeight: 600 }}>✓ Done</span>}
                            <span style={{ color: "#c8a060", fontSize: 22, transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>⌄</span>
                          </div>
                        </button>
                        {open && (
                          <div style={{ background: "#fffcf8", padding: "4px 0 12px 0", borderTop: "1px solid #f0e0c0" }}>
                            {phase.items && phase.items.map((item, ii) => {
                              const key = pi + "-" + ii;
                              const isChecked = checked[key];
                              const reqType = inferRequirement(item);
                              const reqStyle = REQ_TYPES[reqType];
                              return (
                                <div key={ii} className="check-row" onClick={() => toggleCheck(pi, ii)} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "14px 22px", cursor: "pointer", transition: "background 0.15s", borderBottom: ii < phase.items.length - 1 ? "1px solid #f5ece0" : "none", background: isChecked ? "#f0fdf4" : "transparent" }}>
                                  <input type="checkbox" checked={!!isChecked} onChange={() => toggleCheck(pi, ii)} onClick={e => e.stopPropagation()} style={{ marginTop: 2 }} />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 16, color: isChecked ? "#6b8060" : "#3a2010", lineHeight: 1.6, textDecoration: isChecked ? "line-through" : "none", opacity: isChecked ? 0.7 : 1 }}>{item}</div>
                                    <div style={{ marginTop: 6 }}>
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: reqStyle.bg, border: "1px solid " + reqStyle.border, borderRadius: "12px", padding: "2px 10px", fontSize: 12, color: reqStyle.color, fontWeight: 600 }}>
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: reqStyle.dot, display: "inline-block" }} />
                                        {reqType}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TIPS SECTION */}
              {expandedSection === "tips" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {roadmap.tips && roadmap.tips.length > 0 && (
                    <div style={{ background: "#fff", border: "2px solid #e8c080", borderRadius: "16px", padding: "24px", boxShadow: "0 4px 16px rgba(180,120,50,0.08)" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#7a5010", marginBottom: 16 }}>💡 Insider Tips</div>
                      {roadmap.tips.map((tip, i) => (
                        <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < roadmap.tips.length - 1 ? 16 : 0, paddingBottom: i < roadmap.tips.length - 1 ? 16 : 0, borderBottom: i < roadmap.tips.length - 1 ? "1px solid #f0e0c0" : "none" }}>
                          <span style={{ color: "#c47b3a", flexShrink: 0, fontSize: 18, marginTop: 1 }}>→</span>
                          <span style={{ fontSize: 16, color: "#5a3820", lineHeight: 1.65 }}>{tip}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {roadmap.watch_out && roadmap.watch_out.length > 0 && (
                    <div style={{ background: "#fff", border: "2px solid #fca5a5", borderRadius: "16px", padding: "24px", boxShadow: "0 4px 16px rgba(239,68,68,0.06)" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#b91c1c", marginBottom: 16 }}>⚠️ Watch Out For</div>
                      {roadmap.watch_out.map((w, i) => (
                        <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < roadmap.watch_out.length - 1 ? 16 : 0, paddingBottom: i < roadmap.watch_out.length - 1 ? 16 : 0, borderBottom: i < roadmap.watch_out.length - 1 ? "1px solid #fee2e2" : "none" }}>
                          <span style={{ color: "#ef4444", flexShrink: 0, fontSize: 18, marginTop: 1 }}>!</span>
                          <span style={{ fontSize: 16, color: "#5a3820", lineHeight: 1.65 }}>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* RESOURCES SECTION */}
              {expandedSection === "resources" && (
                <div style={{ background: "#fff", border: "2px solid #e8d5b0", borderRadius: "16px", padding: "24px", boxShadow: "0 4px 16px rgba(180,120,50,0.08)" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#4a2008", marginBottom: 6 }}>🔗 Key Resources</div>
                  <p style={{ fontSize: 15, color: "#8a6040", marginBottom: 20, lineHeight: 1.6 }}>These links were verified via web search. Always confirm they are current before relying on them.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
                    {roadmap.resources && roadmap.resources.map((r, i) => (
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="res-link" style={{ display: "block", padding: "14px 16px", background: "#faf7f2", border: "2px solid #e8d5b0", borderRadius: "12px", color: "#7a4020", textDecoration: "none", fontSize: 15, fontWeight: 500, transition: "all 0.15s", lineHeight: 1.4 }}>
                        {r.label} ↗
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div style={{ marginTop: 24, padding: "16px 20px", background: "#fef9f0", border: "2px solid #e8c080", borderRadius: "12px", fontSize: 14, color: "#8a6040", lineHeight: 1.7, textAlign: "center" }}>
                ⚠️ <strong>Important:</strong> CredentialCompass provides AI-generated guidance for informational purposes only. Always verify requirements and URLs directly with the governing regulatory body. Consult a licensed immigration attorney for international moves.
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
