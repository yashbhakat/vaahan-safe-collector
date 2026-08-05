"use client";

import { useMemo, useState } from "react";

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
  const [consent,setConsent] = useState(false);

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
    return {rows,rtos,reports,days:Math.max(1,Math.ceil(reports/80)),hours:(reports*60/3600).toFixed(1),errors};
  },[segments,breakdown,allStates,states,mode,startYear,startPeriod,endYear,endPeriod]);

  const toggle = (value:string,list:string[],set:(v:string[])=>void) => set(list.includes(value)?list.filter(x=>x!==value):[...list,value]);
  const allowed = !estimate.errors.length && consent;
  const periods = mode === "month" ? ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] : ["Q1","Q2","Q3","Q4"];
  const years = Array.from({length:16},(_,i)=>now.getFullYear()-i);
  const downloadPlan = () => {
    const config = {segments,breakdown,states:allStates?["ALL"]:states,periodMode:mode,startYear,startPeriod,endYear,endPeriod,output:"xlsx",minDelaySeconds:45,maxDailyReports:80,consent:true,estimatedRows:estimate.rows};
    const url = URL.createObjectURL(new Blob([JSON.stringify(config,null,2)],{type:"application/json"}));
    const a=document.createElement("a"); a.href=url; a.download="vaahan-safe-job.json"; a.click(); URL.revokeObjectURL(url);
  };

  return <>
    <header className="topbar"><a className="brand" href="#top"><span className="brandMark">V</span><span className="brandCopy">Vaahan Safe Data Collector<small>REGISTRATION INTELLIGENCE SYSTEM</small></span></a><nav><a href="#builder">Planner</a><a href="#method">Architecture</a><a href="#limits">Protocol</a></nav><div className="systemStatus"><i/>SYSTEM ONLINE</div></header>
    <main id="top">
      <section className="hero"><div className="heroCopy"><p className="eyebrow"><span>01</span> PUBLIC DATA CONTROL LAYER</p><h1>Plan the scope.<br/><em>Know the load.</em><br/>Collect carefully.</h1><p className="lead">Configure public Vaahan registration intelligence by segment, state, RTO and timeline—before a single dashboard request is made.</p><div className="actions"><a className="button primary" href="#builder">Initialize collection plan <b>↗</b></a><a className="button ghost" href="#method">View system architecture</a></div><div className="heroSignals"><span><i/>EDGE READY</span><span><i/>LOCAL FIRST</span><span><i/>OUTPUT SAFE</span></div></div><aside className="telemetry"><div className="telemetryHead"><span>LIVE SAFETY ENVELOPE</span><small>VHN / CTRL / 01</small></div><div className="radar"><div className="radarCore">SAFE<small>OPERATING<br/>RANGE</small></div></div><div className="telemetryGrid"><b>1,00,000<small>MAX ROWS</small></b><b>01<small>CONCURRENCY</small></b><b>45–75<small>DELAY / SEC</small></b><b>80<small>DAILY CAP</small></b></div></aside></section>

      <section id="builder" className="section builder"><div className="sectionHead"><div><p className="eyebrow"><span>02</span> MISSION CONFIGURATOR</p><h2>Define the data envelope</h2></div><p>This free hosted control layer calculates workload and creates a configuration for the visible Edge collector running on your computer.</p></div>
        <div className="formGrid">
          <fieldset><legend><span>01</span> Vehicle scope</legend><p className="hint">Choose dashboard category groups.</p><div className="choices">{SEGMENTS.map(s=><label className="choice" key={s[0]}><input type="checkbox" checked={segments.includes(s[0])} onChange={()=>toggle(s[0],segments,setSegments)}/><span>{s[1]}</span></label>)}</div><label className="field">Break rows down by<select value={breakdown} onChange={e=>setBreakdown(e.target.value)}>{BREAKDOWNS.map(b=><option value={b[0]} key={b[0]}>{b[1]}</option>)}</select><small>Vehicle model is not exposed by the public report; maker is the closest available detail.</small></label></fieldset>
          <fieldset><legend><span>02</span> Geography</legend><p className="hint">All India covers approximately 1,465 public reporting offices.</p><label className="toggle"><input type="checkbox" checked={allStates} onChange={e=>setAllStates(e.target.checked)}/><span><b>All India · all RTOs</b><small>Use state selection only to narrow the workload</small></span></label>{!allStates&&<div className="states">{STATES.map(s=><label key={s[0]}><input type="checkbox" checked={states.includes(s[0])} onChange={()=>toggle(s[0],states,setStates)}/>{s[1]} ({s[2]})</label>)}</div>}</fieldset>
          <fieldset><legend><span>03</span> Timeline</legend><div className="two"><label className="field">Time grain<select value={mode} onChange={e=>{const m=e.target.value as "month"|"quarter";setMode(m);setStartPeriod(1);setEndPeriod(m==="month"?12:4)}}><option value="month">Month</option><option value="quarter">Quarter</option></select></label><label className="field">Preferred export<select><option>Excel (.xlsx)</option><option>CSV (.csv)</option><option>PDF (.pdf, up to 2,000 rows)</option></select></label></div><div className="four"><label className="field">Start year<select value={startYear} onChange={e=>setStartYear(+e.target.value)}>{years.map(y=><option key={y}>{y}</option>)}</select></label><label className="field">Start<select value={startPeriod} onChange={e=>setStartPeriod(+e.target.value)}>{periods.map((p,i)=><option value={i+1} key={p}>{p}</option>)}</select></label><label className="field">End year<select value={endYear} onChange={e=>setEndYear(+e.target.value)}>{years.map(y=><option key={y}>{y}</option>)}</select></label><label className="field">End<select value={endPeriod} onChange={e=>setEndPeriod(+e.target.value)}>{periods.map((p,i)=><option value={i+1} key={p}>{p}</option>)}</select></label></div></fieldset>
          <fieldset className="review"><legend><span>04</span> Review & download</legend><div className="metrics"><div><b>{format(estimate.rows)}</b><small>estimated rows</small></div><div><b>{format(estimate.rtos)}</b><small>RTOs in scope</small></div><div><b>{format(estimate.reports)}</b><small>dashboard reports</small></div><div><b>{estimate.days}</b><small>minimum days · ≈{estimate.hours}h</small></div></div>{estimate.errors.length?<div className="warning blocked">{estimate.errors.map(e=><p key={e}>{e}</p>)}</div>:<div className="warning">Conservative estimate. Availability can vary across Vaahan states and RTOs.</div>}<label className="consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I understand registrations are a sales proxy and the collector must stop on CAPTCHA, rate limits or access challenges.</span></label><button className="button primary wide" disabled={!allowed} onClick={downloadPlan}>Download free collector configuration</button><a className="localLink" href="http://127.0.0.1:4173">Already running the collector? Open local control room →</a></fieldset>
        </div>
      </section>

      <section id="method" className="section method"><div className="visual"><div className="visualChrome"><span>INDIA / NETWORK TOPOLOGY</span><small>AGGREGATE REGISTRATION FLOW</small></div><img src="/vaahan-safe-collector/og.png" alt="Illustration of responsible vehicle data collection across India"/></div><div className="methodCopy"><p className="eyebrow"><span>03</span> DISTRIBUTED ARCHITECTURE</p><h2>Hosted planning.<br/><em>Visible local collection.</em></h2><p>Free public hosting cannot safely operate a persistent browser or let you respond when Vaahan presents an access challenge. The planner lives online; the collector stays on your computer where you can see it, stop it and resume it.</p><ul><li><b>01</b>No paid server</li><li><b>02</b>No proxy network</li><li><b>03</b>No CAPTCHA bypass</li><li><b>04</b>Data remains local</li></ul></div></section>
      <section id="limits" className="section limits"><div><p className="eyebrow"><span>04</span> SAFETY PROTOCOL</p><h2>Designed to<br/>back off.</h2></div><div className="limitGrid"><article><span>01 / ACCESS</span><h3>No evasion</h3><p>No proxy rotation, fingerprint spoofing, CAPTCHA solving or login bypass.</p></article><article><span>02 / PRESSURE</span><h3>Low request load</h3><p>One report at a time with a 45–75 second randomized delay and 80-report daily limit.</p></article><article><span>03 / VOLUME</span><h3>Bounded output</h3><p>Plans above 1,00,000 estimated rows are blocked before collection.</p></article><article><span>04 / TRACE</span><h3>Transparent data</h3><p>Exports retain the public source URL and collection time.</p></article></div></section>
    </main><footer><div><span className="footerBrand">VAAHAN SAFE DATA COLLECTOR</span><small>FREE HOSTED PLANNER · LOCAL VISIBLE COLLECTOR</small></div><div className="credit">Built by <strong>Yash Jitendra Bhakat</strong><span>© 2026</span></div></footer>
  </>;
}

function format(value:number){return value.toLocaleString("en-IN")}
