<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>CredentialCompass — Clinical License Navigator</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js"></script>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#080d18;font-family:'Palatino Linotype','Book Antiqua',Palatino,Georgia,serif;color:#ddd8cc;min-height:100vh}
  @keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes shimmer{from{background-position:200% center}to{background-position:-200% center}}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  .fade-up{animation:fadeUp 0.45s ease both}
  select{appearance:none;-webkit-appearance:none}
  ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#080d18}::-webkit-scrollbar-thumb{background:#1e2d45;border-radius:3px}
  .prof-btn:hover{border-color:#b8962e !important;color:#e0b84a !important;background:rgba(184,150,46,0.08) !important}
  .dest-btn:hover{border-color:#b8962e !important;color:#e0b84a !important;background:rgba(184,150,46,0.08) !important}
  .res-link:hover{border-color:#b8962e !important;color:#e0b84a !important}
</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel">
const { useState, useRef, useEffect } = React;

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

const DIFF = {
  "Low":{color:"#22c55e",bg:"rgba(34,197,94,0.1)",border:"rgba(34,197,94,0.25)"},
  "Low-Medium":{color:"#84cc16",bg:"rgba(132,204,18,0.1)",border:"rgba(132,204,18,0.25)"},
  "Medium":{color:"#f59e0b",bg:"rgba(245,158,11,0.1)",border:"rgba(245,158,11,0.25)"},
  "High":{color:"#f97316",bg:"rgba(249,115,22,0.1)",border:"rgba(249,115,22,0.25)"},
  "Very High":{color:"#ef4444",bg:"rgba(239,68,68,0.1)",border:"rgba(239,68,68,0.25)"},
};

const PRIORITY_COLOR = {"Critical":"#ef4444","Important":"#f59e0b","Optional":"#6b7c99"};

const SYSTEM_PROMPT = `You are CredentialCompass, an expert clinical licensing and credentialing advisor. Respond ONLY with a valid JSON object (no markdown, no backticks, no preamble):
{"timeline":"X-Y months","difficulty":"Low|Low-Medium|Medium|High|Very High","language":"language requirement","governing_body":"primary regulatory body","cost_estimate":"cost range","phases":[{"phase":"name","icon":"emoji","duration":"time","priority":"Critical|Important|Optional","items":["step"]}],"tips":["tip"],"watch_out":["pitfall"],"resources":[{"label":"name","url":"https://..."}]}
Be specific: real org names, exam names, fee amounts. For international moves include visa steps. For US transfers mention interstate compacts. 4-7 phases, 3-6 items each.`;

function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('cc_api_key') || '');
  const [showKeySetup, setShowKeySetup] = useState(() => !localStorage.getItem('cc_api_key'));
  const [keyInput, setKeyInput] = useState('');
  const [keyError, setKeyError] = useState('');
  const [step, setStep] = useState(1);
  const [profession, setProfession] = useState('');
  const [currentState, setCurrentState] = useState('');
  const [destType, setDestType] = useState('international');
  const [destination, setDestination] = useState('');
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState('');
  const [expandedPhase, setExpandedPhase] = useState(null);
  const topRef = useRef(null);
  const selectedIntl = INTL.find(d => d.value === destination);

  const saveKey = () => {
    if (!keyInput.trim()) { setKeyError('Please enter your API key'); return; }
    if (!keyInput.startsWith('sk-')) { setKeyError('API key should start with sk-'); return; }
    localStorage.setItem('cc_api_key', keyInput.trim());
    setApiKey(keyInput.trim());
    setShowKeySetup(false);
    setKeyError('');
  };

  const handleGenerate = async () => {
    if (!profession || !currentState || !destination) return;
    setLoading(true); setError(''); setRoadmap(null); setStep(4);
    if (topRef.current) topRef.current.scrollIntoView({behavior:'smooth'});
    const dest = destType === 'international' ? destination : destination + ', USA';
    try {
      setLoadingText('Analyzing your credentials...');
      await new Promise(r => setTimeout(r, 600));
      setLoadingText('Researching requirements...');
      await new Promise(r => setTimeout(r, 700));
      setLoadingText('Building your roadmap...');
      const res = await fetch('/api/generate-roadmap', {
        method: 'POST',
        headers: {'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-request-override':'true'},
        body: JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:2000,system:SYSTEM_PROMPT,messages:[{role:'user',content:'Profession: '+profession+'\nCurrently licensed in: '+currentState+', USA\nRelocating to: '+dest+'\n\nProvide the complete JSON roadmap.'}]})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error && data.error.message ? data.error.message : 'API error');
      const text = data.content ? data.content.map(function(b){return b.text||''}).join('') : '';
      const clean = text.trim().replace(/```json|```/g,'').trim();
      const parsed = JSON.parse(clean);
      setRoadmap(parsed);
      setExpandedPhase(0);
    } catch(err) {
      setError('Something went wrong. Please check your API key and try again.');
      setStep(3);
    } finally {
      setLoading(false); setLoadingText('');
    }
  };

  const reset = () => {
    setStep(1); setProfession(''); setCurrentState('');
    setDestination(''); setRoadmap(null); setError(''); setExpandedPhase(null);
    if (topRef.current) topRef.current.scrollIntoView({behavior:'smooth'});
  };

  const goldBtn = (active) => ({
    width:'100%',padding:'16px',
    background:active?'linear-gradient(135deg,#b8962e,#e0b84a)':'#0c1422',
    border:active?'none':'2px solid #152035',borderRadius:'12px',
    color:active?'#080d18':'#2a3d55',fontSize:15,fontWeight:700,
    cursor:active?'pointer':'not-allowed',fontFamily:'inherit',
    boxShadow:active?'0 8px 30px rgba(184,150,46,0.3)':'none',transition:'all 0.3s'
  });

  if (showKeySetup) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
      <div className="fade-up" style={{background:'#0c1422',border:'1px solid #152035',borderRadius:'20px',padding:'44px',maxWidth:480,width:'100%',boxShadow:'0 40px 100px rgba(0,0,0,0.6)'}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{width:56,height:56,background:'linear-gradient(135deg,#b8962e,#e0b84a)',borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 16px',boxShadow:'0 0 30px rgba(184,150,46,0.35)'}}>🧭</div>
          <h1 style={{fontSize:24,fontWeight:700,color:'#ede8dc',marginBottom:4}}>CredentialCompass</h1>
          <p style={{fontSize:13,color:'#5a6e8a'}}>AI-Powered Clinical License Navigator</p>
        </div>
        <div style={{background:'#080d18',border:'1px solid #152035',borderRadius:'12px',padding:'18px',marginBottom:22}}>
          <div style={{fontSize:13,color:'#b8962e',fontWeight:600,marginBottom:6}}>One-time setup required</div>
          <p style={{fontSize:13,color:'#6b7c99',lineHeight:1.7}}>Enter your Anthropic API key. It's stored only in your browser and sent directly to Anthropic — never to any third party. Get one at <a href="https://console.anthropic.com" target="_blank" style={{color:'#b8962e'}}>console.anthropic.com</a>.</p>
        </div>
        <label style={{display:'block',fontSize:12,letterSpacing:'0.08em',textTransform:'uppercase',color:'#b8962e',marginBottom:8,fontWeight:600}}>Your Anthropic API Key</label>
        <input type="password" placeholder="sk-ant-api03-..." value={keyInput} onChange={function(e){setKeyInput(e.target.value)}} onKeyDown={function(e){if(e.key==='Enter')saveKey()}}
          style={{width:'100%',padding:'14px 16px',background:'#0a1020',border:'2px solid #1e2d45',borderRadius:'10px',color:'#ede8dc',fontSize:14,fontFamily:'monospace',outline:'none',marginBottom:10}}
          onFocus={function(e){e.target.style.borderColor='#b8962e'}} onBlur={function(e){e.target.style.borderColor='#1e2d45'}}/>
        {keyError && <div style={{color:'#f87171',fontSize:13,marginBottom:10}}>⚠ {keyError}</div>}
        <button onClick={saveKey} style={{width:'100%',padding:'14px',background:'linear-gradient(135deg,#b8962e,#e0b84a)',border:'none',borderRadius:'10px',color:'#080d18',fontSize:15,fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginBottom:12}}>Get Started →</button>
        <p style={{fontSize:11,color:'#2a3d55',textAlign:'center'}}>Key is saved in your browser's local storage only.</p>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#080d18'}} ref={topRef}>
      <nav style={{padding:'16px 28px',borderBottom:'1px solid #111c2e',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(8,13,24,0.95)',position:'sticky',top:0,zIndex:100,backdropFilter:'blur(12px)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={reset}>
          <div style={{width:34,height:34,background:'linear-gradient(135deg,#b8962e,#e0b84a)',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17}}>🧭</div>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:'#ede8dc',lineHeight:1}}>CredentialCompass</div>
            <div style={{fontSize:10,color:'#4a5d75',letterSpacing:'0.1em',textTransform:'uppercase'}}>Clinical License Navigator</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:5,background:'rgba(34,197,94,0.08)',border:'1px solid rgba(34,197,94,0.2)',borderRadius:'20px',padding:'4px 10px'}}>
            <div style={{width:5,height:5,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 6px #22c55e'}}/>
            <span style={{fontSize:10,color:'#22c55e',letterSpacing:'0.06em'}}>AI POWERED</span>
          </div>
          <button onClick={function(){setShowKeySetup(true)}} style={{background:'transparent',border:'1px solid #1e2d45',color:'#4a5d75',padding:'5px 12px',borderRadius:'6px',cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>🔑 API Key</button>
        </div>
      </nav>

      <div style={{maxWidth:780,margin:'0 auto',padding:'44px 20px 80px'}}>

        {step === 1 && (
          <div className="fade-up">
            <div style={{textAlign:'center',marginBottom:36}}>
              <div style={{display:'inline-block',background:'rgba(184,150,46,0.08)',border:'1px solid rgba(184,150,46,0.2)',borderRadius:'20px',padding:'5px 16px',marginBottom:16,fontSize:11,color:'#b8962e',letterSpacing:'0.1em',textTransform:'uppercase'}}>Step 1 of 3</div>
              <h1 style={{fontSize:'clamp(26px,4vw,40px)',fontWeight:700,color:'#ede8dc',marginBottom:10,lineHeight:1.2}}>What is your clinical profession?</h1>
              <p style={{color:'#6b7c99',fontSize:15,maxWidth:420,margin:'0 auto'}}>Select your license type to get started.</p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))',gap:10,marginBottom:28}}>
              {PROFESSIONS.map(function(p){return (
                <button key={p} className="prof-btn" onClick={function(){setProfession(p)}} style={{padding:'13px 15px',background:profession===p?'rgba(184,150,46,0.12)':'#0c1422',border:'2px solid '+(profession===p?'#b8962e':'#152035'),borderRadius:'10px',color:profession===p?'#e0b84a':'#9aacbf',cursor:'pointer',fontSize:14,textAlign:'left',fontFamily:'inherit',transition:'all 0.15s',display:'flex',alignItems:'center',gap:10}}>
                  {profession===p
                    ? <span style={{width:22,height:22,borderRadius:'50%',background:'#b8962e',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#080d18',flexShrink:0,fontWeight:700}}>✓</span>
                    : <span style={{width:22,height:22,borderRadius:'50%',border:'2px solid #1e2d45',display:'inline-block',flexShrink:0}}/>
                  }
                  {p}
                </button>
              );})}
            </div>
            <button onClick={function(){if(profession)setStep(2)}} disabled={!profession} style={goldBtn(!!profession)}>
              {profession ? 'Continue with ' + profession + ' →' : 'Select a profession to continue'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="fade-up">
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:32,padding:'12px 16px',background:'rgba(184,150,46,0.06)',border:'1px solid rgba(184,150,46,0.15)',borderRadius:'10px',flexWrap:'wrap'}}>
              <span style={{fontSize:13,color:'#b8962e',fontWeight:600}}>✓ {profession}</span>
              <span style={{color:'#2a3d55',fontSize:16}}>→</span>
              <span style={{fontSize:13,color:'#b8962e',fontWeight:600}}>Current License State</span>
              <span style={{color:'#2a3d55',fontSize:16}}>→</span>
              <span style={{fontSize:13,color:'#3a4d65'}}>Destination</span>
            </div>
            <div style={{textAlign:'center',marginBottom:32}}>
              <div style={{display:'inline-block',background:'rgba(184,150,46,0.08)',border:'1px solid rgba(184,150,46,0.2)',borderRadius:'20px',padding:'5px 16px',marginBottom:16,fontSize:11,color:'#b8962e',letterSpacing:'0.1em',textTransform:'uppercase'}}>Step 2 of 3</div>
              <h1 style={{fontSize:'clamp(24px,4vw,38px)',fontWeight:700,color:'#ede8dc',marginBottom:10,lineHeight:1.2}}>Where are you currently licensed?</h1>
              <p style={{color:'#6b7c99',fontSize:15,maxWidth:400,margin:'0 auto'}}>Select the US state where your license is currently active.</p>
            </div>
            <div style={{background:'#0c1422',border:'2px solid #1e2d45',borderRadius:'16px',padding:'28px',marginBottom:22}}>
              <label style={{display:'block',fontSize:17,fontWeight:700,color:'#ede8dc',marginBottom:6}}>Your current license state</label>
              <p style={{fontSize:14,color:'#6b7c99',marginBottom:18}}>This is the state you are licensed in right now.</p>
              <div style={{position:'relative'}}>
                <select value={currentState} onChange={function(e){setCurrentState(e.target.value)}}
                  style={{width:'100%',padding:'16px 48px 16px 18px',background:'#080d18',border:'2px solid '+(currentState?'#b8962e':'#1e2d45'),borderRadius:'10px',color:currentState?'#ede8dc':'#4a5d75',fontSize:16,fontFamily:'inherit',outline:'none',cursor:'pointer'}}
                  onFocus={function(e){e.target.style.borderColor='#b8962e'}}
                  onBlur={function(e){if(!currentState)e.target.style.borderColor='#1e2d45'}}>
                  <option value="">— Choose your state —</option>
                  {US_STATES.map(function(s){return <option key={s} value={s}>{s}</option>})}
                </select>
                <span style={{position:'absolute',right:16,top:'50%',transform:'translateY(-50%)',color:'#4a5d75',pointerEvents:'none',fontSize:20}}>▾</span>
              </div>
              {currentState && (
                <div style={{marginTop:14,padding:'12px 16px',background:'rgba(34,197,94,0.06)',border:'1px solid rgba(34,197,94,0.2)',borderRadius:'8px',display:'flex',alignItems:'center',gap:8}}>
                  <span style={{color:'#22c55e',fontSize:18}}>✓</span>
                  <span style={{fontSize:14,color:'#a0c8a0'}}>Currently licensed in <strong style={{color:'#ede8dc'}}>{currentState}</strong></span>
                </div>
              )}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={function(){setStep(1)}} style={{flex:1,padding:'14px',background:'transparent',border:'2px solid #152035',borderRadius:'12px',color:'#5a6e8a',fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>← Back</button>
              <button onClick={function(){if(currentState)setStep(3)}} disabled={!currentState} style={{...goldBtn(!!currentState),flex:3,padding:'14px'}}>
                {currentState ? 'Next: Choose Destination →' : 'Select a state to continue'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="fade-up">
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:32,padding:'12px 16px',background:'rgba(184,150,46,0.06)',border:'1px solid rgba(184,150,46,0.15)',borderRadius:'10px',flexWrap:'wrap'}}>
              <span style={{fontSize:13,color:'#b8962e',fontWeight:600}}>✓ {profession}</span>
              <span style={{color:'#2a3d55',fontSize:16}}>→</span>
              <span style={{fontSize:13,color:'#b8962e',fontWeight:600}}>✓ Licensed in {currentState}</span>
              <span style={{color:'#2a3d55',fontSize:16}}>→</span>
              <span style={{fontSize:13,color:'#b8962e',fontWeight:600}}>Where to?</span>
            </div>
            <div style={{textAlign:'center',marginBottom:28}}>
              <div style={{display:'inline-block',background:'rgba(184,150,46,0.08)',border:'1px solid rgba(184,150,46,0.2)',borderRadius:'20px',padding:'5px 16px',marginBottom:16,fontSize:11,color:'#b8962e',letterSpacing:'0.1em',textTransform:'uppercase'}}>Step 3 of 3</div>
              <h1 style={{fontSize:'clamp(24px,4vw,38px)',fontWeight:700,color:'#ede8dc',marginBottom:10,lineHeight:1.2}}>Where are you moving?</h1>
              <p style={{color:'#6b7c99',fontSize:15,maxWidth:400,margin:'0 auto'}}>Select your destination country or US state.</p>
            </div>

            <div style={{display:'flex',gap:0,marginBottom:24,background:'#0c1422',border:'2px solid #152035',borderRadius:'12px',padding:'4px'}}>
              {[['international','🌍  Moving Abroad'],['domestic','🇺🇸  Staying in the US']].map(function(pair){var v=pair[0],l=pair[1];return (
                <button key={v} onClick={function(){setDestType(v);setDestination('');}} style={{flex:1,padding:'13px',background:destType===v?'linear-gradient(135deg,#b8962e,#e0b84a)':'transparent',border:'none',borderRadius:'9px',color:destType===v?'#080d18':'#6b7c99',cursor:'pointer',fontSize:14,fontWeight:destType===v?700:400,fontFamily:'inherit',transition:'all 0.2s'}}>{l}</button>
              );})}
            </div>

            {destType === 'international' ? (
              <div style={{marginBottom:22}}>
                <p style={{fontSize:14,color:'#6b7c99',marginBottom:14,textAlign:'center'}}>Select the country you are relocating to:</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(165px,1fr))',gap:10}}>
                  {INTL.map(function(d){return (
                    <button key={d.value} className="dest-btn" onClick={function(){setDestination(d.value)}} style={{padding:'14px 14px',background:destination===d.value?'rgba(184,150,46,0.12)':'#0c1422',border:'2px solid '+(destination===d.value?'#b8962e':'#152035'),borderRadius:'10px',color:destination===d.value?'#e0b84a':'#9aacbf',cursor:'pointer',fontSize:14,fontFamily:'inherit',textAlign:'left',transition:'all 0.15s',display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:22}}>{d.flag}</span>
                      <span style={{fontWeight:destination===d.value?600:400}}>{d.value}</span>
                    </button>
                  );})}
                </div>
              </div>
            ) : (
              <div style={{background:'#0c1422',border:'2px solid #1e2d45',borderRadius:'16px',padding:'26px',marginBottom:22}}>
                <label style={{display:'block',fontSize:17,fontWeight:700,color:'#ede8dc',marginBottom:6}}>Your destination state</label>
                <p style={{fontSize:14,color:'#6b7c99',marginBottom:16}}>Which state are you moving to?</p>
                <div style={{position:'relative'}}>
                  <select value={destination} onChange={function(e){setDestination(e.target.value)}}
                    style={{width:'100%',padding:'16px 48px 16px 18px',background:'#080d18',border:'2px solid '+(destination?'#b8962e':'#1e2d45'),borderRadius:'10px',color:destination?'#ede8dc':'#4a5d75',fontSize:16,fontFamily:'inherit',outline:'none',cursor:'pointer'}}
                    onFocus={function(e){e.target.style.borderColor='#b8962e'}}
                    onBlur={function(e){if(!destination)e.target.style.borderColor='#1e2d45'}}>
                    <option value="">— Choose a state —</option>
                    {US_STATES.filter(function(s){return s!==currentState}).map(function(s){return <option key={s} value={s}>{s}</option>})}
                  </select>
                  <span style={{position:'absolute',right:16,top:'50%',transform:'translateY(-50%)',color:'#4a5d75',pointerEvents:'none',fontSize:20}}>▾</span>
                </div>
              </div>
            )}

            {error && <div style={{padding:'14px 18px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'10px',color:'#f87171',fontSize:14,marginBottom:18}}>⚠ {error}</div>}

            {destination && (
              <div style={{background:'rgba(184,150,46,0.06)',border:'1px solid rgba(184,150,46,0.2)',borderRadius:'12px',padding:'16px 20px',marginBottom:18}}>
                <div style={{fontSize:11,color:'#b8962e',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:8}}>Ready to generate:</div>
                <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                  <span style={{fontSize:15,color:'#ede8dc',fontWeight:600}}>{profession}</span>
                  <span style={{color:'#b8962e',fontSize:18}}>→</span>
                  <span style={{fontSize:14,color:'#9aacbf'}}>{currentState}</span>
                  <span style={{color:'#b8962e',fontSize:18}}>→</span>
                  <span style={{fontSize:15,color:'#ede8dc',fontWeight:600}}>{selectedIntl ? selectedIntl.flag+' ' : ''}{destination}</span>
                </div>
              </div>
            )}

            <div style={{display:'flex',gap:10}}>
              <button onClick={function(){setStep(2)}} style={{flex:1,padding:'14px',background:'transparent',border:'2px solid #152035',borderRadius:'12px',color:'#5a6e8a',fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>← Back</button>
              <button onClick={handleGenerate} disabled={!destination} style={{...goldBtn(!!destination),flex:3,padding:'16px'}}>
                {destination ? '🧭  Generate My Roadmap' : 'Select a destination to continue'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && loading && (
          <div className="fade-up" style={{textAlign:'center',padding:'80px 20px'}}>
            <div style={{width:60,height:60,border:'3px solid #152035',borderTop:'3px solid #b8962e',borderRadius:'50%',margin:'0 auto 28px',animation:'spin 1s linear infinite'}}/>
            <div style={{fontSize:20,color:'#ede8dc',marginBottom:10,fontWeight:600}}>{loadingText}</div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,color:'#6b7c99',fontSize:15}}>
              <span>{currentState}</span><span style={{color:'#b8962e'}}>→</span>
              <span>{selectedIntl ? selectedIntl.flag+' ' : ''}{destination}</span>
            </div>
          </div>
        )}

        {step === 4 && !loading && roadmap && (function(){
          var dc = DIFF[roadmap.difficulty] || DIFF['Medium'];
          return (
            <div className="fade-up">
              <div style={{background:'#0c1422',border:'1px solid #152035',borderRadius:'18px',padding:'28px',marginBottom:16,boxShadow:'0 20px 60px rgba(0,0,0,0.4)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:16}}>
                  <div>
                    <div style={{fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:'#4a5d75',marginBottom:8}}>Your Credential Roadmap</div>
                    <h2 style={{fontSize:22,fontWeight:700,color:'#ede8dc',marginBottom:6}}>{profession}</h2>
                    <div style={{display:'flex',alignItems:'center',gap:10,color:'#5a6e8a',fontSize:14}}>
                      <span>{currentState}</span><span style={{color:'#b8962e',fontSize:16}}>→</span>
                      <span>{selectedIntl ? selectedIntl.flag+' ' : ''}{destination}</span>
                    </div>
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                    {[['⏱','Timeline',roadmap.timeline],['💰','Cost',roadmap.cost_estimate],['🌐','Language',roadmap.language]].map(function(t){return (
                      <div key={t[1]} style={{background:'#0a1020',border:'1px solid #152035',borderRadius:'10px',padding:'10px 13px',minWidth:90}}>
                        <div style={{fontSize:10,color:'#3a4d65',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:4}}>{t[0]} {t[1]}</div>
                        <div style={{fontSize:12,fontWeight:600,color:'#b8962e'}}>{t[2]}</div>
                      </div>
                    );})}
                    <div style={{background:dc.bg,border:'1px solid '+dc.border,borderRadius:'10px',padding:'10px 13px',minWidth:90}}>
                      <div style={{fontSize:10,color:'#3a4d65',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:4}}>📊 Difficulty</div>
                      <div style={{fontSize:12,fontWeight:600,color:dc.color}}>{roadmap.difficulty}</div>
                    </div>
                  </div>
                </div>
                {roadmap.governing_body && <div style={{marginTop:16,paddingTop:14,borderTop:'1px solid #111c2e',fontSize:13,color:'#5a6e8a'}}><span style={{color:'#3a4d65'}}>Regulatory Body: </span>{roadmap.governing_body}</div>}
              </div>

              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,letterSpacing:'0.1em',textTransform:'uppercase',color:'#3a4d65',marginBottom:12,paddingLeft:4}}>Step-by-Step Process</div>
                {roadmap.phases && roadmap.phases.map(function(phase,i){
                  var open = expandedPhase === i;
                  return (
                    <div key={i} style={{marginBottom:8}}>
                      <button onClick={function(){setExpandedPhase(open?null:i)}} style={{width:'100%',background:open?'#0f1c30':'#0c1422',border:'1px solid '+(open?'#1e3050':'#152035'),borderRadius:open?'12px 12px 0 0':'12px',padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',textAlign:'left',transition:'all 0.2s'}}>
                        <div style={{display:'flex',alignItems:'center',gap:12}}>
                          <div style={{width:38,height:38,background:'rgba(184,150,46,0.08)',border:'1px solid rgba(184,150,46,0.15)',borderRadius:'9px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{phase.icon||'📌'}</div>
                          <div>
                            <div style={{fontSize:14,fontWeight:600,color:'#ddd8cc'}}><span style={{color:'#2a3d55',marginRight:6,fontSize:11}}>0{i+1}</span>{phase.phase}</div>
                            <div style={{display:'flex',alignItems:'center',gap:8,marginTop:2}}>
                              <span style={{fontSize:11,color:'#3a4d65'}}>{phase.duration}</span>
                              {phase.priority && <span style={{display:'flex',alignItems:'center',gap:3,fontSize:10}}><span style={{width:5,height:5,borderRadius:'50%',background:PRIORITY_COLOR[phase.priority]||'#6b7c99',display:'inline-block'}}/><span style={{color:PRIORITY_COLOR[phase.priority]||'#6b7c99'}}>{phase.priority}</span></span>}
                            </div>
                          </div>
                        </div>
                        <span style={{color:'#2a3d55',fontSize:16,transform:open?'rotate(180deg)':'rotate(0)',transition:'transform 0.2s'}}>⌄</span>
                      </button>
                      {open && (
                        <div style={{background:'#0f1c30',border:'1px solid #1e3050',borderTop:'none',borderRadius:'0 0 12px 12px',padding:'18px 20px'}}>
                          {phase.items && phase.items.map(function(item,j){return (
                            <div key={j} style={{display:'flex',gap:10,marginBottom:j<phase.items.length-1?12:0}}>
                              <div style={{width:5,height:5,borderRadius:'50%',background:'#b8962e',marginTop:7,flexShrink:0}}/>
                              <div style={{fontSize:13,color:'#8a9ab8',lineHeight:1.65}}>{item}</div>
                            </div>
                          );})}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                {roadmap.tips && roadmap.tips.length > 0 && (
                  <div style={{background:'rgba(184,150,46,0.04)',border:'1px solid rgba(184,150,46,0.12)',borderRadius:'14px',padding:'20px'}}>
                    <div style={{fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',color:'#b8962e',marginBottom:12}}>💡 Insider Tips</div>
                    {roadmap.tips.map(function(tip,i){return (
                      <div key={i} style={{display:'flex',gap:8,marginBottom:i<roadmap.tips.length-1?10:0}}>
                        <span style={{color:'#b8962e',flexShrink:0,marginTop:2}}>→</span>
                        <span style={{fontSize:12,color:'#8a9ab8',lineHeight:1.6}}>{tip}</span>
                      </div>
                    );})}
                  </div>
                )}
                {roadmap.watch_out && roadmap.watch_out.length > 0 && (
                  <div style={{background:'rgba(239,68,68,0.04)',border:'1px solid rgba(239,68,68,0.12)',borderRadius:'14px',padding:'20px'}}>
                    <div style={{fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',color:'#ef4444',marginBottom:12}}>⚠️ Watch Out For</div>
                    {roadmap.watch_out.map(function(w,i){return (
                      <div key={i} style={{display:'flex',gap:8,marginBottom:i<roadmap.watch_out.length-1?10:0}}>
                        <span style={{color:'#ef4444',flexShrink:0,marginTop:2}}>!</span>
                        <span style={{fontSize:12,color:'#8a9ab8',lineHeight:1.6}}>{w}</span>
                      </div>
                    );})}
                  </div>
                )}
              </div>

              {roadmap.resources && roadmap.resources.length > 0 && (
                <div style={{background:'#0c1422',border:'1px solid #152035',borderRadius:'14px',padding:'20px',marginBottom:14}}>
                  <div style={{fontSize:10,letterSpacing:'0.1em',textTransform:'uppercase',color:'#3a4d65',marginBottom:12}}>🔗 Key Resources</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(175px,1fr))',gap:8}}>
                    {roadmap.resources.map(function(r,i){return (
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="res-link" style={{display:'block',padding:'10px 13px',background:'#0a1020',border:'1px solid #152035',borderRadius:'9px',color:'#7a8fa8',textDecoration:'none',fontSize:12,transition:'all 0.15s'}}>
                        {r.label} ↗
                      </a>
                    );})}
                  </div>
                </div>
              )}

              <div style={{display:'flex',gap:10,marginBottom:16}}>
                <button onClick={reset} style={{flex:1,padding:'13px',background:'transparent',border:'1px solid #152035',borderRadius:'10px',color:'#5a6e8a',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}
                  onMouseEnter={function(e){e.target.style.borderColor='#b8962e';e.target.style.color='#b8962e'}}
                  onMouseLeave={function(e){e.target.style.borderColor='#152035';e.target.style.color='#5a6e8a'}}>← Start Over</button>
                <button onClick={function(){setStep(3);setRoadmap(null);}} style={{flex:1,padding:'13px',background:'rgba(184,150,46,0.1)',border:'1px solid rgba(184,150,46,0.3)',borderRadius:'10px',color:'#b8962e',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}
                  onMouseEnter={function(e){e.currentTarget.style.background='rgba(184,150,46,0.18)'}}
                  onMouseLeave={function(e){e.currentTarget.style.background='rgba(184,150,46,0.1)'}}>Try Another Destination ↻</button>
              </div>
              <div style={{padding:'12px 16px',background:'#060a12',borderRadius:'8px',fontSize:11,color:'#2a3d55',lineHeight:1.7,textAlign:'center'}}>
                CredentialCompass provides AI-generated guidance for informational purposes only. Always verify requirements directly with the governing regulatory body and consult a licensed immigration attorney for international moves.
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
</script>
</body>
</html>
