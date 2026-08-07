"use client";

import { useEffect, useMemo, useState } from "react";

const BRIDGE_URL = "http://127.0.0.1:4173";

type BridgeState = "checking" | "online" | "offline";
type Job = {
  id:string; status:string; current:string; completedReports:number; collectedRows:number;
  error:string|null; estimate:{reportRequests:number; estimatedRows:number; estimatedDays:number; estimatedActiveHours:number};
};

const SEGMENTS = [
  ["2W","Two wheelers",8],["3W","Three wheelers",5],["4W","Four wheelers",9],
  ["AH","Adapted / special",3],["CE","Construction equipment",7],["GV","Goods vehicles",4],
  ["PS","Passenger vehicles",5],["SC","Special categories",22],["TL","Trailers",7],["TR","Tractors",3],
] as const;
const BREAKDOWNS = [
  ["total","Total registrations",1],["vehicle_class","Vehicle class",9],["maker","Maker / manufacturer",250],
  ["fuel","Fuel",36],["norms","Emission norms",26],["vehicle_category","Vehicle category",8],
] as const;
const STATES = [
  ["AN","Andaman & Nicobar Islands",5],["AP","Andhra Pradesh",84],["AR","Arunachal Pradesh",29],["AS","Assam",35],["BR","Bihar",48],
  ["CG","Chhattisgarh",31],["CH","Chandigarh",1],["DD","Dadra & Nagar Haveli and Daman & Diu",3],["DL","Delhi",16],["GA","Goa",13],
  ["GJ","Gujarat",38],["HP","Himachal Pradesh",98],["HR","Haryana",104],["JH","Jharkhand",25],["JK","Jammu & Kashmir",21],
  ["KA","Karnataka",68],["KL","Kerala",87],["LA","Ladakh",3],["LD","Lakshadweep",9],["MH","Maharashtra",59],["ML","Meghalaya",14],
  ["MN","Manipur",17],["MP","Madhya Pradesh",53],["MZ","Mizoram",12],["NL","Nagaland",9],["OR","Odisha",39],["PB","Punjab",96],
  ["PY","Puducherry",8],["RJ","Rajasthan",60],["SK","Sikkim",9],["TG","Telangana",57],["TN","Tamil Nadu",148],["TR","Tripura",9],
  ["UK","Uttarakhand",21],["UP","Uttar Pradesh",77],["WB","West Bengal",59],
] as const;

export default function Home() {
  const now = new Date();
  const [segments,setSegments] = useState<string[]>(["TR"]);
  const [breakdown,setBreakdown] = useState("total");
  const [allStates,setAllStates] = useState(true);
  const [states,setStates] = useState<string[]>([]);
  const [mode,setMode] = useState<"month"|"quarter">("month");
  const [startYear,setStartYear] = useState(now.getFullYear()-1);
  const [startPeriod,setStartPeriod] = useState(8);
  const [endYear,setEndYear] = useState(now.getFullYear());
  const [endPeriod,setEndPeriod] = useState(7);
  const [output,setOutput] = useState<"xlsx"|"csv"|"pdf">("xlsx");
  const [browserChoice,setBrowserChoice] = useState<"edge"|"chrome">("edge");
  const [background,setBackground] = useState(true);
  const [consent,setConsent] = useState(false);
  const [bridge,setBridge] = useState<BridgeState>("checking");
  const [bridgeMessage,setBridgeMessage] = useState("Checking the secure local collector…");
  const [bridgeToken,setBridgeToken] = useState("");
  const [job,setJob] = useState<Job|null>(null);
  const [starting,setStarting] = useState(false);

  const estimate = useMemo(() => {
    const maxPeriod = mode === "month" ? 12 : 4;
    const periodCount = Math.max(0,(endYear*maxPeriod+endPeriod)-(startYear*maxPeriod+startPeriod)+1);
    const selectedStates: ReadonlyArray<readonly [string,string,number]> = allStates ? STATES : STATES.filter(s=>states.includes(s[0]));
    const rtos = selectedStates.reduce((sum,s)=>sum+s[2],0);
    const base = BREAKDOWNS.find(b=>b[0]===breakdown)?.[2] || 1;
    const classes = breakdown === "vehicle_class" ? Math.max(1,...SEGMENTS.filter(s=>segments.includes(s[0])).map(s=>s[2])) : base;
    const rows = rtos * periodCount * segments.length * classes;
    const years = Math.max(0,endYear-startYear+1);
    const reports = rtos * years * segments.length;
    const errors:string[] = [];
    if (!segments.length) errors.push("Select at least one vehicle segment.");
    if (!rtos) errors.push("Select at least one state.");
    if (!periodCount) errors.push("The timeline end must follow its start.");
    if (rows > 100000) errors.push(`Estimated output is ${format(rows)} rows; the hard limit is 1,00,000.`);
    if (output === "pdf" && rows > 2000) errors.push("PDF is limited to 2,000 detail rows. Choose XLSX/CSV or narrow the scope.");
    return {rows,rtos,reports,days:Math.max(1,Math.ceil(reports/80)),hours:(reports*60/3600).toFixed(1),errors};
  },[segments,breakdown,allStates,states,mode,startYear,startPeriod,endYear,endPeriod,output]);

  const toggle = (value:string,list:string[],set:(v:string[])=>void) => set(list.includes(value)?list.filter(x=>x!==value):[...list,value]);
  const allowed = !estimate.errors.length && consent;
  const periods = mode === "month" ? ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] : ["Q1","Q2","Q3","Q4"];
  const years = Array.from({length:16},(_,i)=>now.getFullYear()-i);
  const config = () => ({segments,breakdown,states:allStates?["ALL"]:states,periodMode:mode,startYear,startPeriod,endYear,endPeriod,output,browser:browserChoice,background,minDelaySeconds:45,maxDailyReports:80,consent:true});
  const downloadPlan = () => {
    const plan = {...config(),estimatedRows:estimate.rows};
    const url = URL.createObjectURL(new Blob([JSON.stringify(plan,null,2)],{type:"application/json"}));
    const a=document.createElement("a"); a.href=url; a.download="vaahan-safe-job.json"; a.click(); URL.revokeObjectURL(url);
  };

  const checkBridge = async () => {
    setBridge("checking");
    setBridgeMessage("Checking the secure local collector…");
    try {
      const response = await fetch(`${BRIDGE_URL}/api/health`,{cache:"no-store"});
      if (!response.ok) throw new Error("Collector health check failed");
      const sessionResponse = await fetch(`${BRIDGE_URL}/api/session`,{cache:"no-store"});
      if (!sessionResponse.ok) throw new Error("Secure session could not be established");
      const session = await sessionResponse.json();
      setBridgeToken(session.token);
      setBridge("online");
      setBridgeMessage("Secure local collector connected. Edge and Chrome are available.");
      return session.token as string;
    } catch {
      setBridgeToken("");
      setBridge("offline");
      setBridgeMessage("Collector not detected. Install or start the companion, then allow local-network access if your browser asks.");
      return null;
    }
  };

  const refreshJob = async (id:string) => {
    if (!bridgeToken) return;
    try {
      const response = await fetch(`${BRIDGE_URL}/api/jobs/${id}`,{cache:"no-store",headers:{"X-Collector-Token":bridgeToken}});
      if (!response.ok) throw new Error("Unable to read job");
      setJob(await response.json());
      setBridge("online");
    } catch {
      setBridge("offline");
      setBridgeMessage("Connection to the local collector was lost. Keep start.ps1 running and reconnect.");
    }
  };

  const startCollection = async () => {
    if (!allowed || starting) return;
    setStarting(true);
    setBridgeMessage("Sending the approved plan to your local collector…");
    try {
      const token = bridgeToken || await checkBridge();
      if (!token) throw new Error("Collector not detected. Start the companion and reconnect.");
      const response = await fetch(`${BRIDGE_URL}/api/jobs`,{method:"POST",headers:{"Content-Type":"application/json","X-Collector-Token":token},body:JSON.stringify(config())});
      const data = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(data.error || "The collector could not start this job.");
      setJob(data);
      setBridge("online");
      setBridgeMessage(`Collection started in ${background?"minimized background":"visible"} ${browserChoice==="chrome"?"Chrome":"Edge"} mode.`);
    } catch (error) {
      setBridge("offline");
      setBridgeMessage(error instanceof Error && !error.message.includes("fetch") ? error.message : "Collector not detected. Start the companion, then allow local-network access if asked.");
    } finally { setStarting(false); }
  };

  const stopJob = async () => {
    if (!job) return;
    const response = await fetch(`${BRIDGE_URL}/api/jobs/${job.id}/stop`,{method:"POST",headers:{"Content-Type":"application/json","X-Collector-Token":bridgeToken},body:"{}"});
    if (response.ok) setJob(await response.json());
  };

  const resumeJob = async () => {
    if (!job) return;
    const response = await fetch(`${BRIDGE_URL}/api/jobs/${job.id}/resume`,{method:"POST",headers:{"Content-Type":"application/json","X-Collector-Token":bridgeToken},body:"{}"});
    const data = await response.json().catch(()=>({}));
    if (response.ok) setJob(data); else setBridgeMessage(data.error || "This job could not be resumed.");
  };

  const downloadExport = async (format:"xlsx"|"csv"|"pdf") => {
    if (!job || !bridgeToken) return;
    const response = await fetch(`${BRIDGE_URL}/api/jobs/${job.id}/export?format=${format}`,{headers:{"X-Collector-Token":bridgeToken}});
    if (!response.ok) { const data=await response.json().catch(()=>({})); setBridgeMessage(data.error||"Export failed."); return; }
    const url=URL.createObjectURL(await response.blob()); const anchor=document.createElement("a"); anchor.href=url; anchor.download=`vaahan-${job.id}.${format}`; anchor.click(); URL.revokeObjectURL(url);
  };

  useEffect(()=>{ void checkBridge(); },[]);
  useEffect(()=>{
    if (!job || !["starting","running"].includes(job.status)) return;
    const timer=window.setInterval(()=>void refreshJob(job.id),4000);
    return ()=>window.clearInterval(timer);
  },[job?.id,job?.status,bridgeToken]);

  return <>
    <header className="topbar"><a className="brand" href="#top"><span className="brandMark">V</span><span className="brandCopy">Vaahan Safe Data Collector<small>REGISTRATION INTELLIGENCE SYSTEM</small></span></a><nav><a href="#builder">Planner</a><a href="#method">Architecture</a><a href="#limits">Protocol</a></nav><div className="systemStatus"><i/>PLANNER ONLINE</div></header>
    <main id="top">
      <section className="hero"><div className="heroCopy"><p className="eyebrow"><span>01</span> PUBLIC DATA CONTROL LAYER</p><h1>Plan the scope.<br/><em>Know the load.</em><br/>Collect carefully.</h1><p className="lead">Configure public Vaahan registration intelligence by segment, state, RTO and timeline—before a single dashboard request is made.</p><div className="actions"><a className="button primary" href="#builder">Initialize collection plan <b>↗</b></a><a className="button ghost" href="#method">View system architecture</a></div><div className="heroSignals"><span><i/>EDGE READY</span><span><i/>LOCAL FIRST</span><span><i/>OUTPUT SAFE</span></div></div><aside className="telemetry"><div className="telemetryHead"><span>LIVE SAFETY ENVELOPE</span><small>VHN / CTRL / 01</small></div><div className="radar"><div className="radarCore">SAFE<small>OPERATING<br/>RANGE</small></div></div><div className="telemetryGrid"><b>1,00,000<small>MAX ROWS</small></b><b>01<small>CONCURRENCY</small></b><b>45–75<small>DELAY / SEC</small></b><b>80<small>DAILY CAP</small></b></div></aside></section>

      <section id="builder" className="section builder"><div className="sectionHead"><div><p className="eyebrow"><span>02</span> MISSION CONFIGURATOR</p><h2>Define the data envelope</h2></div><p>This free hosted control layer calculates workload and securely instructs the background Chrome or Edge companion running on your computer.</p></div><div className="sourceNotice"><b>SOURCE TRANSITION / AUG 2026</b><span>The Vaahan legacy report currently used by the collector announces retirement after 15 August 2026. The collector now detects field changes and pauses safely instead of guessing. <a href="https://analytics.parivahan.gov.in/analytics/publicdashboard/vahan?lang=en" target="_blank" rel="noreferrer">Open the announced replacement dashboard ↗</a></span></div>
        <div className="formGrid">
          <fieldset><legend><span>01</span> Vehicle scope</legend><p className="hint">Choose dashboard category groups.</p><div className="choices">{SEGMENTS.map(s=><label className="choice" key={s[0]}><input type="checkbox" checked={segments.includes(s[0])} onChange={()=>toggle(s[0],segments,setSegments)}/><span>{s[1]}</span></label>)}</div><label className="field">Break rows down by<select value={breakdown} onChange={e=>setBreakdown(e.target.value)}>{BREAKDOWNS.map(b=><option value={b[0]} key={b[0]}>{b[1]}</option>)}</select><small>Vehicle model is not exposed by the public report; maker is the closest available detail.</small></label></fieldset>
          <fieldset><legend><span>02</span> Geography</legend><p className="hint">All India covers approximately 1,465 public reporting offices.</p><label className="toggle"><input type="checkbox" checked={allStates} onChange={e=>setAllStates(e.target.checked)}/><span><b>All India · all RTOs</b><small>Use state selection only to narrow the workload</small></span></label>{!allStates&&<div className="states">{STATES.map(s=><label key={s[0]}><input type="checkbox" checked={states.includes(s[0])} onChange={()=>toggle(s[0],states,setStates)}/>{s[1]} ({s[2]})</label>)}</div>}</fieldset>
          <fieldset><legend><span>03</span> Timeline & runtime</legend><div className="two"><label className="field">Time grain<select value={mode} onChange={e=>{const m=e.target.value as "month"|"quarter";setMode(m);setStartPeriod(1);setEndPeriod(m==="month"?12:4)}}><option value="month">Month</option><option value="quarter">Quarter</option></select></label><label className="field">Preferred export<select value={output} onChange={e=>setOutput(e.target.value as "xlsx"|"csv"|"pdf")}><option value="xlsx">Excel (.xlsx)</option><option value="csv">CSV (.csv)</option><option value="pdf">PDF (.pdf, up to 2,000 rows)</option></select></label></div><div className="two"><label className="field">Installed browser<select value={browserChoice} onChange={e=>setBrowserChoice(e.target.value as "edge"|"chrome")}><option value="edge">Microsoft Edge</option><option value="chrome">Google Chrome</option></select></label><label className="field">Execution mode<select value={background?"background":"visible"} onChange={e=>setBackground(e.target.value==="background")}><option value="background">Minimized background (recommended)</option><option value="visible">Visible troubleshooting</option></select><small>Vaahan rejects true headless access, so a normal browser is minimized and challenges still pause the job.</small></label></div><div className="four"><label className="field">Start year<select value={startYear} onChange={e=>setStartYear(+e.target.value)}>{years.map(y=><option key={y}>{y}</option>)}</select></label><label className="field">Start<select value={startPeriod} onChange={e=>setStartPeriod(+e.target.value)}>{periods.map((p,i)=><option value={i+1} key={p}>{p}</option>)}</select></label><label className="field">End year<select value={endYear} onChange={e=>setEndYear(+e.target.value)}>{years.map(y=><option key={y}>{y}</option>)}</select></label><label className="field">End<select value={endPeriod} onChange={e=>setEndPeriod(+e.target.value)}>{periods.map((p,i)=><option value={i+1} key={p}>{p}</option>)}</select></label></div></fieldset>
          <fieldset className="review"><legend><span>04</span> Review & run</legend><div className="metrics"><div><b>{format(estimate.rows)}</b><small>estimated rows</small></div><div><b>{format(estimate.rtos)}</b><small>RTOs in scope</small></div><div><b>{format(estimate.reports)}</b><small>dashboard reports</small></div><div><b>{estimate.days}</b><small>minimum days · ≈{estimate.hours}h</small></div></div>{estimate.errors.length?<div className="warning blocked">{estimate.errors.map(e=><p key={e}>{e}</p>)}</div>:<div className="warning">Conservative estimate. Availability can vary across Vaahan states and RTOs.</div>}
            <div className={`bridgeStatus ${bridge}`}><span><i/>SECURE LOCAL COMPANION</span><b>{bridge==="checking"?"CHECKING":bridge==="online"?"CONNECTED":"NOT CONNECTED"}</b><p>{bridgeMessage}</p>{bridge==="offline"&&<button type="button" onClick={()=>void checkBridge()}>RECHECK CONNECTION</button>}</div>
            <label className="consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I understand registrations are a sales proxy and the collector must stop on CAPTCHA, rate limits or access challenges.</span></label><button className="button primary wide" disabled={!allowed||starting} onClick={()=>void startCollection()}>{starting?"Starting secure collector…":"Start minimized background collection"}</button><a className="button secondary wide" href="/vaahan-safe-collector/vaahan-safe-companion.zip" download>Download free Windows companion</a><button className="button secondary wide" type="button" onClick={downloadPlan}>Download configuration only</button><p className="bridgeHint">First use: download and extract the companion, run <strong>install.ps1</strong> once, then keep <strong>start.ps1</strong> open. Your browser may ask for local-network access. <a href="/vaahan-safe-collector/vaahan-safe-companion.zip.sha256" target="_blank">Verify SHA-256 checksum.</a></p><a className="localLink" href={BRIDGE_URL}>Open local control room →</a>
            {job&&<div className="jobMonitor" aria-live="polite"><div className="jobTitle"><span>ACTIVE JOB / {job.id}</span><b>{job.status.toUpperCase()}</b></div><p>{job.current||"Preparing collection…"}</p><div className="progressTrack"><i style={{width:`${Math.min(100,Math.round((job.completedReports/Math.max(1,job.estimate.reportRequests))*100))}%`}}/></div><div className="jobStats"><span><b>{format(job.completedReports)}</b> / {format(job.estimate.reportRequests)} reports</span><span><b>{format(job.collectedRows)}</b> rows collected</span></div>{job.error&&<div className="jobError">{job.error}</div>}<div className="jobActions">{["starting","running"].includes(job.status)&&<button type="button" onClick={()=>void stopJob()}>STOP SAFELY</button>}{["paused","stopped"].includes(job.status)&&<button type="button" onClick={()=>void resumeJob()}>RESUME</button>}<button type="button" onClick={()=>void downloadExport(output)}>DOWNLOAD {output.toUpperCase()}</button></div></div>}
          </fieldset>
        </div>
      </section>

      <section id="method" className="section method"><div className="visual"><div className="visualChrome"><span>INDIA / NETWORK TOPOLOGY</span><small>AGGREGATE REGISTRATION FLOW</small></div><img src="/vaahan-safe-collector/og.png" alt="Illustration of responsible vehicle data collection across India"/></div><div className="methodCopy"><p className="eyebrow"><span>03</span> DISTRIBUTED ARCHITECTURE</p><h2>Hosted planning.<br/><em>Minimized local collection.</em></h2><p>Free public hosting cannot safely operate a persistent browser. The planner lives online; a token-protected companion runs a normal Chrome or Edge window minimized on each visitor&apos;s computer, keeps data local, and pauses on access challenges.</p><ul><li><b>01</b>Chrome + Edge</li><li><b>02</b>Restart-scoped token</li><li><b>03</b>No CAPTCHA bypass</li><li><b>04</b>Data remains local</li></ul></div></section>
      <section id="limits" className="section limits"><div><p className="eyebrow"><span>04</span> SAFETY PROTOCOL</p><h2>Designed to<br/>back off.</h2></div><div className="limitGrid"><article><span>01 / ACCESS</span><h3>No evasion</h3><p>No proxy rotation, fingerprint spoofing, CAPTCHA solving or login bypass.</p></article><article><span>02 / PRESSURE</span><h3>Low request load</h3><p>One report at a time with a 45–75 second randomized delay and 80-report daily limit.</p></article><article><span>03 / VOLUME</span><h3>Bounded output</h3><p>Plans above 1,00,000 estimated rows are blocked before collection.</p></article><article><span>04 / TRACE</span><h3>Transparent data</h3><p>Exports retain the public source URL and collection time.</p></article></div></section>
      <aside className="legalNotice" aria-label="Legal and responsible-use notice"><div className="legalLabel"><span>05</span> LEGAL / RESPONSIBLE USE</div><div className="legalCopy"><p><strong>Purpose notice.</strong> This independent tool is provided solely for educational, research and analytical purposes. It is not an official government service, legal advice, or a substitute for records obtained directly from the competent authority.</p><p><strong>Use and affiliation.</strong> This project is not affiliated with, sponsored by, or endorsed by MoRTH, NIC, Parivahan or Vaahan. Users must independently review and comply with current website terms, robots instructions, access controls, rate limits, copyright and database rights, and all applicable laws. Do not use it to access personal or vehicle-level records, bypass CAPTCHA or other safeguards, or continue after an access restriction.</p><p><strong>Data caution.</strong> Availability, accuracy, completeness and timeliness are not guaranteed. Registration counts are an analytical proxy and must not be represented as invoiced retail sales. Use of the tool and any resulting analysis is at the user&apos;s own responsibility; no warranty or liability is assumed for decisions, losses, blocks or third-party claims arising from its use.</p><a href="https://vahan.parivahan.gov.in/vahan4dashboard/vahan/view/reportview.xhtml" target="_blank" rel="noreferrer">Official Vaahan dashboard ↗</a></div></aside>
    </main><footer><div><span className="footerBrand">VAAHAN SAFE DATA COLLECTOR</span><small>FREE HOSTED PLANNER · SECURE LOCAL COMPANION</small></div><div className="credit">Built by <strong>Yash Jitendra Bhakat</strong><span>© 2026</span></div></footer>
  </>;
}

function format(value:number){return value.toLocaleString("en-IN")}
