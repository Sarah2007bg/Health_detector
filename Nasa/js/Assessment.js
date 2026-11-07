/* =========================
   STORAGE AND HELPERS
========================= */

const KEY="spaceCrewAssessmentV5";

const TEST_NAMES={
  codingLearning:"Coding Memory — Learning",
  cpt:"Continuous Performance Test",
  match:"Match to Sample",
  math:"Mathematics",
  codingRecall:"Coding Memory — Delayed Recall",
  landolt:"Landolt C",
  amsler:"Amsler Grid"
};

const WIN_TESTS=[
  "codingLearning","cpt","match","math","codingRecall"
];

const VISION_TESTS=["landolt","amsler"];

function defaultData(){
  return {
    cycles:[],
    baseline:null,
    history:[],
    pending:{winscat:null,vision:null},
    alerts:[]
  };
}

function loadData(){
  try{
    const saved=JSON.parse(localStorage.getItem(KEY));
    return saved||defaultData();
  }catch{
    return defaultData();
  }
}

let data=loadData();

function saveData(){
  localStorage.setItem(KEY,JSON.stringify(data));
  updateDashboard();
  renderBaseline();
  renderHistory();
}

function escapeHTML(v){
  return String(v).replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function shuffleArray(array){
  const shuffled=[...array];
  for(let i=shuffled.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];
  }
  return shuffled;
}

function generateCodingPairs(){
  const symbols=["◆","●","▲","■","★","♥","✿","⬟","☀","♣","✦","⬢"];
  const numbers=["1","2","3","4","5","6","7","8","9"];
  const selectedSymbols=shuffleArray(symbols).slice(0,6);
  const selectedNumbers=shuffleArray(numbers).slice(0,6);
  return shuffleArray(selectedSymbols.map((symbol,index)=>[
    symbol,selectedNumbers[index]
  ]));
}

function showAssessmentView(id){
  const root=document.getElementById("performanceAssessment");
  if(!root)return;
  root.querySelectorAll(".pa-view").forEach(p=>p.classList.remove("active"));
  const target=document.getElementById(id);
  if(target)target.classList.add("active");
  root.querySelectorAll(".pa-tab").forEach(tab=>tab.classList.toggle("active",tab.getAttribute("onclick")?.includes(id)));
}

/* =========================
   DASHBOARD
========================= */

function updateDashboard(){
  const n=data.cycles.length;

  document.getElementById("pa-cycleCount").textContent=Math.min(n,3)+" / 3";
  document.getElementById("pa-cycleProgress").style.width=Math.min(n/3*100,100)+"%";
  document.getElementById("pa-baselineStatus").textContent=
    data.baseline?"Baseline established":"Collecting baseline";

  document.getElementById("pa-winStatus").textContent=
    data.pending.winscat?"Completed":"Not completed";

  document.getElementById("pa-visionStatus").textContent=
    data.pending.vision?"Completed":"Not completed";

  renderAlerts();
}

function renderAlerts(){
  const area=document.getElementById("pa-latestAlerts");

  if(!data.alerts.length){
    area.innerHTML='<p class="muted">No alerts yet.</p>';
    return;
  }

  area.innerHTML=data.alerts.slice(0,5).map(a=>`
    <div class="alert ${a.level==="CRITICAL"?"critical":""}">
      <p class="alert-label">${escapeHTML(a.level||"ALERT")}</p>
      <h3>${escapeHTML(a.title)}</h3>
      <p>${escapeHTML(a.message)}</p>
      <h4>RECOMMENDED ACTIONS</h4>
      <ul>${(a.actions||[]).map(x=>`<li>${escapeHTML(x)}</li>`).join("")}</ul>
      <p class="small">${escapeHTML(a.date)}</p>
      <p class="small">Simulation alert — not a medical diagnosis or an operational command.</p>
    </div>
  `).join("");
}

/* =========================
   BATTERY CONTROL
========================= */

let battery=null;
let tests=[];
let testIndex=0;
let results={};
let currentTest=null;
let questionIndex=0;
let score=0;
let testTimer=null;
let trialTimer=null;
let batteryCodingPairs=null;

function clearTimers(){
  clearTimeout(testTimer);
  clearTimeout(trialTimer);
  testTimer=null;
  trialTimer=null;
}

function startBattery(type){
  if(battery)return;

  battery=type;
  tests=type==="winscat"?WIN_TESTS:VISION_TESTS;
  testIndex=0;
  results={};

  if(type==="winscat"){
    batteryCodingPairs=generateCodingPairs();
  }

  startCurrentTest();
}

function startCurrentTest(){
  clearTimers();

  if(testIndex>=tests.length){
    finishBattery();
    return;
  }

  currentTest=tests[testIndex];
  questionIndex=0;
  score=0;

  showAssessmentView("pa-testPage");

  document.getElementById("pa-batteryLabel").textContent=
    battery==="winscat"?"WINSCAT BATTERY":"VISION BATTERY";

  document.getElementById("pa-testTitle").textContent=TEST_NAMES[currentTest];
  document.getElementById("pa-testFeedback").innerHTML="";

  const descriptions={
    codingLearning:"Memorize the randomly generated symbol-number associations.",
    cpt:"Press TARGET only when X immediately follows A.",
    match:"Memorize the three-symbol sequence before it disappears.",
    math:"Solve the arithmetic question.",
    codingRecall:"Recall the associations learned earlier.",
    landolt:"Identify the direction of the gap.",
    amsler:"Observe the grid and report visual irregularities."
  };

  document.getElementById("pa-testDescription").textContent=descriptions[currentTest];
  renderQuestion();
}

function updateProgress(total){
  document.getElementById("pa-testCounter").textContent=
    `Question ${Math.min(questionIndex+1,total)} of ${total}`;

  document.getElementById("pa-testProgress").style.width=
    (questionIndex/total*100)+"%";
}

function finishTest(total,extra={}){
  results[currentTest]={
    score:Math.round(score/total*100),
    raw:score,
    total,
    observations:null,
    ...extra
  };

  testIndex++;
  startCurrentTest();
}

function exitTest(){
  if(!confirm("Exit this battery? Incomplete results will be discarded."))return;

  clearTimers();
  battery=null;
  results={};
  batteryCodingPairs=null;
  showAssessmentView("pa-dashboard");
}

/* =========================
   QUESTION ROUTER
========================= */

function renderQuestion(){
  const area=document.getElementById("pa-testArea");
  document.getElementById("pa-testFeedback").innerHTML="";

  if(currentTest==="codingLearning")renderLearning(area);
  if(currentTest==="codingRecall")renderRecall(area);
  if(currentTest==="cpt")renderCPT(area);
  if(currentTest==="match")renderMatch(area);
  if(currentTest==="math")renderMath(area);
  if(currentTest==="landolt")renderLandolt(area);
  if(currentTest==="amsler")renderAmsler(area);
}

/* =========================
   CODING MEMORY LEARNING
========================= */

function renderLearning(area){
  updateProgress(1);
  const pairs=batteryCodingPairs;

  area.innerHTML=`
    <h3>Memorize the following associations</h3>
    <p class="muted">Each symbol is associated with a unique number.</p>
    <div class="grid">
      ${pairs.map(pair=>`
        <div class="card">
          <div class="symbol">${pair[0]}</div>
          <div class="big">${pair[1]}</div>
        </div>
      `).join("")}
    </div>
    <button class="green" id="learnButton">I have memorized them — Continue</button>
  `;

  document.getElementById("learnButton").onclick=()=>{
    score=1;
    finishTest(1);
  };
}

/* =========================
   CODING MEMORY DELAYED RECALL
========================= */

function renderRecall(area){
  const total=6;
  const pairs=batteryCodingPairs;
  updateProgress(total);

  const pair=pairs[questionIndex];
  const wrongOptions=shuffleArray(
    pairs.map(p=>p[1]).filter(n=>n!==pair[1])
  ).slice(0,3);

  const options=shuffleArray([pair[1],...wrongOptions]);

  area.innerHTML=`
    <p>Which number was associated with this symbol?</p>
    <div class="symbol">${pair[0]}</div>
    <div class="answer-grid">
      ${options.map(number=>`
        <button class="secondary" data-value="${number}">${number}</button>
      `).join("")}
    </div>
  `;

  area.querySelectorAll("button").forEach(button=>{
    button.onclick=()=>{
      if(button.dataset.value===pair[1])score++;
      questionIndex++;
      if(questionIndex>=total)finishTest(total);
      else renderRecall(area);
    };
  });
}

/* =========================
   CPT
========================= */

let cptLetters=[];
let cptTrial=0;
let cptCorrect=0;
let cptResponded=false;
let cptPrevious="";

function renderCPT(area){
  cptLetters=[
    "A","X","B","A","C","A","X","C","B","A",
    "X","A","B","A","X","C","A","X","B","C"
  ];

  cptTrial=0;
  cptCorrect=0;
  cptPrevious="";
  cptResponded=false;

  area.innerHTML=`
    <p>Press TARGET only when X immediately follows A.</p>
    <p class="small">All other letters require no response.</p>
    <div class="stimulus" id="cptStimulus">READY</div>
    <p id="cptInstruction">Press Start when ready.</p>
    <button id="cptStart">Start CPT</button>
    <button class="green" id="cptTarget" disabled>TARGET</button>
    <p id="cptFeedback" class="small"></p>
  `;

  document.getElementById("cptStart").onclick=()=>{
    document.getElementById("cptStart").disabled=true;
    nextCPTTrial();
  };

  document.getElementById("cptTarget").onclick=()=>{
    if(cptResponded||cptTrial>=cptLetters.length)return;

    const isTarget=cptLetters[cptTrial]==="X"&&cptPrevious==="A";
    cptResponded=true;

    if(isTarget){
      cptCorrect++;
      document.getElementById("cptFeedback").textContent="Correct response";
    }else{
      document.getElementById("cptFeedback").textContent="Incorrect response";
    }
  };
}

function nextCPTTrial(){
  const total=cptLetters.length;

  if(cptTrial>=total){
    score=cptCorrect;
    finishTest(total,{correctResponses:cptCorrect,totalTrials:total});
    return;
  }

  clearTimeout(trialTimer);
  cptResponded=false;

  const letter=cptLetters[cptTrial];
  const isTarget=letter==="X"&&cptPrevious==="A";

  updateProgress(total);
  document.getElementById("cptStimulus").textContent=letter;
  document.getElementById("cptInstruction").textContent=
    `Trial ${cptTrial+1} of ${total}`;
  document.getElementById("cptTarget").disabled=false;
  document.getElementById("cptFeedback").textContent="";

  trialTimer=setTimeout(()=>{
    if(!cptResponded&&!isTarget)cptCorrect++;

    document.getElementById("cptTarget").disabled=true;
    cptPrevious=letter;
    cptTrial++;
    trialTimer=setTimeout(nextCPTTrial,350);
  },1100);
}

/* =========================
   MATCH TO SAMPLE
========================= */

const symbolPool=[
  "🫥","🌛","⭐","🍀","🔷","🦋","🌻","🎈",
  "🌙","💎","🪐","🧩","🌵","🎭","🍎","☂️"
];

function randomSequence(){
  return shuffleArray(symbolPool).slice(0,3);
}

function renderMatch(area){
  const total=10;
  updateProgress(total);

  const target=randomSequence();
  const options=[target];

  while(options.length<4){
    const candidate=randomSequence();
    if(!options.some(o=>o.join("")===candidate.join(""))){
      options.push(candidate);
    }
  }

  const shuffledOptions=shuffleArray(options);

  area.innerHTML=`
    <h3>Memorize this sequence</h3>
    <div class="memory-sequence" id="memorySequence">
      ${target.map(s=>`<span>${s}</span>`).join("")}
    </div>
    <p id="memoryInstruction">The sequence will disappear shortly.</p>
  `;

  testTimer=setTimeout(()=>{
    area.innerHTML=`
      <h3>Which sequence did you see?</h3>
      <p>Choose the exact order of the three symbols.</p>
      <div class="grid">
        ${shuffledOptions.map((option,index)=>`
          <button class="secondary memory-option" data-index="${index}">
            ${option.join(" ")}
          </button>
        `).join("")}
      </div>
    `;

    area.querySelectorAll("button").forEach(button=>{
      button.onclick=()=>{
        const selected=shuffledOptions[Number(button.dataset.index)];
        if(selected.join("")===target.join(""))score++;
        questionIndex++;
        if(questionIndex>=total)finishTest(total);
        else renderMatch(area);
      };
    });
  },2500);
}

/* =========================
   MATHEMATICS
========================= */

function renderMath(area){
  const total=10;
  updateProgress(total);

  const a=Math.floor(Math.random()*20)+2;
  const b=Math.floor(Math.random()*15)+1;
  const op=Math.random()>.5?"+":"-";
  const correct=op==="+"?a+b:a-b;

  let options=[correct,correct+2,correct-1,correct+4];
  options=[...new Set(options)];
  while(options.length<4)options.push(correct+options.length+5);
  options=shuffleArray(options);

  area.innerHTML=`
    <p>Solve the following problem.</p>
    <div class="question">${a} ${op} ${b} = ?</div>
    <div class="answer-grid">
      ${options.map(n=>`<button class="secondary">${n}</button>`).join("")}
    </div>
  `;

  area.querySelectorAll("button").forEach(button=>{
    button.onclick=()=>{
      if(Number(button.textContent)===correct)score++;
      questionIndex++;
      if(questionIndex>=total)finishTest(total);
      else renderMath(area);
    };
  });
}

/* =========================
   LANDOLT C
========================= */

const directions=["UP","DOWN","LEFT","RIGHT"];

function makeLandoltSVG(direction,size){
  const center=100,radius=65,stroke=22,gap=34;
  const angles={RIGHT:0,DOWN:90,LEFT:180,UP:270};
  const angle=angles[direction];
  const start=angle+gap/2;
  const end=angle+360-gap/2;

  function point(deg){
    const rad=deg*Math.PI/180;
    return{
      x:center+radius*Math.cos(rad),
      y:center+radius*Math.sin(rad)
    };
  }

  const p1=point(start);
  const p2=point(end);

  const path=`M ${p1.x} ${p1.y} A ${radius} ${radius} 0 1 1 ${p2.x} ${p2.y}`;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 200 200">
      <path d="${path}" fill="none" stroke="#eaf1fb"
        stroke-width="${stroke}" stroke-linecap="butt"/>
    </svg>
  `;
}

function renderLandolt(area){
  const total=10;
  updateProgress(total);

  const sizes=[190,175,160,145,130,115,105,95,85,75];
  const correct=directions[Math.floor(Math.random()*4)];
  const size=sizes[questionIndex];

  area.innerHTML=`
    <p>Identify the direction of the opening.</p>
    <p class="small">Optotype size: ${size}px</p>
    ${makeLandoltSVG(correct,size)}
    <div class="answer-grid">
      <button class="secondary" data-dir="UP">UP ↑</button>
      <button class="secondary" data-dir="DOWN">DOWN ↓</button>
      <button class="secondary" data-dir="LEFT">LEFT ←</button>
      <button class="secondary" data-dir="RIGHT">RIGHT →</button>
    </div>
  `;

  area.querySelectorAll("button").forEach(button=>{
    button.onclick=()=>{
      if(button.dataset.dir===correct)score++;
      questionIndex++;
      if(questionIndex>=total)finishTest(total);
      else renderLandolt(area);
    };
  });
}

/* =========================
   AMSLER GRID
========================= */

function renderAmsler(area){
  updateProgress(1);

  area.innerHTML=`
    <p>Look at the center of the grid and observe the entire pattern.</p>
    <div style="width:min(85vw,320px);aspect-ratio:1;display:grid;
      grid-template-columns:repeat(12,1fr);border:2px solid #111;background:white;">
      ${Array.from({length:144},()=>`
        <div style="border:.6px solid #222"></div>
      `).join("")}
    </div>
    <p>Do you notice any irregularities?</p>
    <label><input type="checkbox" id="distortion"> Distorted or wavy lines</label><br>
    <label><input type="checkbox" id="missing"> Missing or dark areas</label><br>
    <label><input type="checkbox" id="blur"> Blurred or reduced clarity</label><br>
    <label><input type="checkbox" id="normal"> No noticeable irregularities</label><br><br>
    <button class="green" id="amslerSubmit">Submit</button>
  `;

  const normal=document.getElementById("normal");
  const abnormalIds=["distortion","missing","blur"];

  normal.onchange=()=>{
    if(normal.checked){
      abnormalIds.forEach(id=>document.getElementById(id).checked=false);
    }
  };

  abnormalIds.forEach(id=>{
    document.getElementById(id).onchange=()=>{
      if(document.getElementById(id).checked)normal.checked=false;
    };
  });

  document.getElementById("amslerSubmit").onclick=()=>{
    const observations={
      distortion:document.getElementById("distortion").checked,
      missing:document.getElementById("missing").checked,
      blur:document.getElementById("blur").checked,
      normal:normal.checked
    };

    const abnormal=
      observations.distortion||observations.missing||observations.blur;

    results.amsler={
      score:abnormal?0:100,
      raw:abnormal?0:1,
      total:1,
      observations
    };

    testIndex++;
    startCurrentTest();
  };
}

/* =========================
   ALERT DEFINITIONS
========================= */

const DROP_THRESHOLD=15;

function belowBaseline(key,result){
  if(!data.baseline||!result)return false;

  const base=data.baseline.tests[key];

  if(typeof base!=="number"||base<=0)return false;

  return ((base-result.score)/base*100)>=DROP_THRESHOLD;
}

function getCognitiveDecline(testResults){
  return WIN_TESTS.some(key=>
    belowBaseline(key,testResults[key])
  );
}

function getVisualDecline(testResults){
  const landoltDecline=belowBaseline("landolt",testResults.landolt);
  const a=testResults.amsler?.observations;

  const amslerAbnormal=!!(
    a&&(a.distortion||a.missing||a.blur)
  );

  return landoltDecline||amslerAbnormal;
}

/* Independent WinSCAT alert */
function createCognitiveAlert(){
  return{
    level:"WARNING",
    title:"COGNITIVE PERFORMANCE DECLINE",
    message:
      "A significant decline in cognitive performance has been detected compared with the established baseline. Changes may involve working memory, attention, or processing performance.",
    actions:[
      "Suspend or postpone EVA activities if cognitive performance may compromise crew safety, following mission protocols.",
      "Review spacecraft oxygen and carbon dioxide telemetry.",
      "Allow a screen break of up to four hours when operationally safe and appropriate.",
      "Notify the ground-based mission physician and report the affected cognitive subtests.",
      "Arrange further cognitive assessment as directed by the medical team.",
      "Determine rest and recovery requirements through the mission medical team."
    ]
  };
}

/* Independent Vision alert */
function createVisualAlert(){
  return{
    level:"WARNING",
    title:"VISUAL ANOMALIES AND PERFORMANCE DECLINE",
    message:
      "A change in visual performance or an abnormal Amsler Grid observation has been detected. Findings may include reduced visual acuity or scotoma-like visual disturbances and require medical assessment.",
    actions:[
      "Suspend or postpone EVA activities if visual changes may compromise operational safety, following mission protocols.",
      "Notify the ground-based mission physician and report the specific visual observations.",
      "Arrange a detailed visual assessment as directed by the medical team.",
      "Optical coherence tomography (OCT) or retinal examination may be considered if requested by the physician.",
      "Any LBNP suit adjustment or sodium/dietary intervention must be determined by the medical team.",
      "Continue visual monitoring according to the mission medical protocol."
    ]
  };
}

/* Combined critical alert */
function createCombinedAlert(){
  return{
    level:"CRITICAL",
    title:"SIMULTANEOUS COGNITIVE AND VISUAL DETERIORATION",
    message:
      "Significant declines in both cognitive performance and visual function have been detected during the same monitoring cycle. This combined pattern requires immediate review under the mission medical and operational safety protocols.",
    actions:[
      "Immediately suspend EVA activities and follow the mission emergency and crew-safety protocols.",
      "Verify spacecraft oxygen and carbon dioxide telemetry and report any abnormal readings to mission control.",
      "Arrange a screen break of up to four hours when operationally safe and appropriate.",
      "Notify the ground-based mission physician immediately and provide both cognitive and visual assessment results.",
      "Initiate a comprehensive medical evaluation as directed by the mission physician.",
      "Consider further cognitive testing and ophthalmological assessment, including OCT if requested by the medical team.",
      "Determine sleep and recovery duration according to the mission physician's assessment; do not assume a fixed recovery period.",
      "Any LBNP suit activation or sodium/dietary intervention must be prescribed and supervised by the medical team."
    ]
  };
}

/* =========================
   ALERT DISPLAY AND STORAGE
========================= */

function addAlert(alert){
  const saved={
    ...alert,
    date:new Date().toLocaleString(),
    timestamp:Date.now()
  };

  data.alerts.unshift(saved);
  saveData();
  // Host integration hook: the main Alerts page can subscribe to this event.
  try {
    const hostAlerts=JSON.parse(localStorage.getItem("performanceAssessmentAlerts")||"[]");
    hostAlerts.unshift(saved);
    localStorage.setItem("performanceAssessmentAlerts",JSON.stringify(hostAlerts.slice(0,100)));
  } catch (error) { console.warn("Could not persist host assessment alert",error); }
  window.dispatchEvent(new CustomEvent("performance:alert",{detail:saved}));
  return saved;
}

function showCompletionAlerts(alerts){
  const area=document.getElementById("pa-completionAlerts");

  if(!alerts.length){
    area.innerHTML=`
      <div class="card">
        <h3>No performance alert generated</h3>
        <p class="muted">No decline meeting the prototype threshold was detected in this battery.</p>
      </div>
    `;
    return;
  }

  area.innerHTML=alerts.map(a=>`
    <div class="alert ${a.level==="CRITICAL"?"critical":""}">
      <p class="alert-label">${escapeHTML(a.level)}</p>
      <h3>${escapeHTML(a.title)}</h3>
      <p>${escapeHTML(a.message)}</p>
      <h4>RECOMMENDED ACTIONS</h4>
      <ul>${a.actions.map(x=>`<li>${escapeHTML(x)}</li>`).join("")}</ul>
      <p class="small">${escapeHTML(a.date)}</p>
      <p class="small">Simulation alert — not a medical diagnosis or an operational command.</p>
    </div>
  `).join("");
}

/* Evaluate a battery immediately after its completion.
   This runs only after the baseline has been established. */
function evaluateCompletedBattery(type,result){
  if(!data.baseline)return false;

  if(type==="winscat"){
    const decline=getCognitiveDecline(result.tests);

    if(decline){
      addAlert(createCognitiveAlert());
    }

    return decline;
  }

  if(type==="vision"){
    const decline=getVisualDecline(result.tests);

    if(decline){
      addAlert(createVisualAlert());
    }

    return decline;
  }

  return false;
}

/* =========================
   BATTERY COMPLETION
========================= */

function finishBattery(){
  clearTimers();

  const result={
    date:new Date().toLocaleString(),
    timestamp:Date.now(),
    type:battery,
    tests:JSON.parse(JSON.stringify(results))
  };

  data.history.unshift(result);

  const completedType=battery;
  data.pending[completedType]=result;

  battery=null;
  results={};
  batteryCodingPairs=null;

  /* Evaluate this battery independently right now. */
  const individualDecline=evaluateCompletedBattery(completedType,result);

  saveData();

  document.getElementById("pa-completionMessage").textContent=
    "All tests in this battery have been completed.";

  document.getElementById("pa-completionResults").innerHTML=
    Object.entries(result.tests).map(([key,value])=>`
      <div class="card">
        <b>${TEST_NAMES[key]}</b>
        <p>Score: ${value.score}%</p>
      </div>
    `).join("");

  document.getElementById("pa-completionAlerts").innerHTML="";
  showAssessmentView("pa-completion");

  /* If the other battery is also available, check for a combined alert. */
  checkCompleteCycle();

  /* Show the alert generated by this completion, if any. */
  if(individualDecline){
    const latest=data.alerts[0];
    if(latest)showCompletionAlerts([latest]);
  }
}

/* =========================
   COMPLETE CYCLES
========================= */

function checkCompleteCycle(){
  const win=data.pending.winscat;
  const vision=data.pending.vision;

  if(!win||!vision)return;

  const cycle={
    number:data.cycles.length+1,
    date:new Date().toLocaleString(),
    tests:{
      ...win.tests,
      ...vision.tests
    }
  };

  data.cycles.push(cycle);

  /* During baseline collection, establish the baseline after 3 cycles. */
  if(data.cycles.length===3&&!data.baseline){
    establishBaseline();
  }
  /* After baseline, evaluate whether both batteries declined in this cycle. */
  else if(data.baseline){
    evaluateCombinedCycle(cycle);
  }

  data.pending={winscat:null,vision:null};
  saveData();

  document.getElementById("pa-completionMessage").textContent=
    data.baseline
      ?"Complete cycle recorded and compared with baseline."
      :`Complete cycle ${data.cycles.length} of 3 recorded.`;

  /* Display the combined alert on the completion page if one was generated. */
  if(data.baseline&&data.alerts[0]?.title===
    "SIMULTANEOUS COGNITIVE AND VISUAL DETERIORATION"){
    showCompletionAlerts([data.alerts[0]]);
  }
}

function establishBaseline(){
  const baseline={};

  Object.keys(TEST_NAMES).forEach(key=>{
    if(key==="amsler")return;

    const values=data.cycles
      .map(c=>c.tests[key]?.score)
      .filter(v=>typeof v==="number");

    if(values.length){
      baseline[key]=values.reduce((a,b)=>a+b,0)/values.length;
    }
  });

  data.baseline={
    created:new Date().toLocaleString(),
    cycles:3,
    tests:baseline
  };
}

/* =========================
   COMBINED ALERT CHECK
========================= */

function evaluateCombinedCycle(cycle){
  const cognitive=getCognitiveDecline(cycle.tests);
  const visual=getVisualDecline(cycle.tests);

  if(cognitive&&visual){
    addAlert(createCombinedAlert());
  }
}

/* =========================
   BASELINE DISPLAY
========================= */

function renderBaseline(){
  const n=data.cycles.length;

  document.getElementById("pa-baselineCycles").textContent=
    Math.min(n,3)+" / 3";

  document.getElementById("pa-baselineBar").style.width=
    Math.min(n/3*100,100)+"%";

  const area=document.getElementById("pa-baselineTable");

  if(!data.baseline){
    area.innerHTML='<p class="muted">Complete three full cycles first.</p>';
    return;
  }

  area.innerHTML=`
    <p class="small">Established: ${escapeHTML(data.baseline.created)}</p>
    <table>
      <thead><tr><th>Subtest</th><th>Baseline Average</th></tr></thead>
      <tbody>
        ${Object.entries(data.baseline.tests).map(([key,value])=>`
          <tr><td>${TEST_NAMES[key]}</td><td>${value.toFixed(1)}%</td></tr>
        `).join("")}
      </tbody>
    </table>
    <p class="small">Amsler observations are tracked separately.</p>
    <p class="small">Prototype alert threshold: ${DROP_THRESHOLD}% decline from baseline.</p>
  `;
}

/* =========================
   HISTORY AND EXPORT
========================= */

function renderHistory(){
  const area=document.getElementById("pa-historyTable");

  if(!data.history.length){
    area.innerHTML='<p class="muted">No saved sessions.</p>';
    return;
  }

  area.innerHTML=`
    <table>
      <thead><tr><th>Date</th><th>Battery</th><th>Tests</th></tr></thead>
      <tbody>
        ${data.history.map(h=>`
          <tr>
            <td>${escapeHTML(h.date)}</td>
            <td>${h.type==="winscat"?"WinSCAT":"Vision"}</td>
            <td>${Object.keys(h.tests).length}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function exportCSV(){
  const rows=[["Date","Battery","Subtest","Score","Observations"]];

  data.history.forEach(session=>{
    Object.entries(session.tests).forEach(([key,value])=>{
      rows.push([
        session.date,
        session.type,
        TEST_NAMES[key],
        value.score,
        JSON.stringify(value.observations||"")
      ]);
    });
  });

  const csv=rows.map(row=>
    row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")
  ).join("\n");

  const blob=new Blob(["\uFEFF"+csv],{
    type:"text/csv;charset=utf-8"
  });

  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="space_crew_assessment.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/* =========================
   MAIN SITE ALERTS BRIDGE
========================= */
function renderHostAssessmentAlert(alert){
  const hostAlerts=document.getElementById("alerts");
  if(!hostAlerts)return;

  let list=document.getElementById("performanceAssessmentAlerts");
  if(!list){
    list=document.createElement("div");
    list.id="performanceAssessmentAlerts";
    list.className="performance-host-alerts";
    const heading=document.createElement("h3");
    heading.textContent="Performance Assessment Alerts";
    list.appendChild(heading);
    hostAlerts.appendChild(list);
  }

  const card=document.createElement("article");
  card.className="performance-host-alert"+(alert.level==="CRITICAL"?" critical":"");
  const level=document.createElement("p");
  level.className="performance-host-alert-level";
  level.textContent=alert.level||"ALERT";
  const title=document.createElement("h4");
  title.textContent=alert.title||"Performance alert";
  const message=document.createElement("p");
  message.textContent=alert.message||"";
  const date=document.createElement("small");
  date.textContent=alert.date||new Date().toLocaleString();
  card.append(level,title,message);
  if(Array.isArray(alert.actions)&&alert.actions.length){
    const actionHeading=document.createElement("strong");
    actionHeading.textContent="Recommended actions";
    const actions=document.createElement("ul");
    alert.actions.forEach(item=>{const li=document.createElement("li");li.textContent=item;actions.appendChild(li);});
    card.append(actionHeading,actions);
  }
  card.appendChild(date);
  list.prepend(card);
}

window.addEventListener("performance:alert",event=>renderHostAssessmentAlert(event.detail));

function loadHostAssessmentAlerts(){
  try{
    const saved=JSON.parse(localStorage.getItem("performanceAssessmentAlerts")||"[]");
    saved.slice(0,20).reverse().forEach(renderHostAssessmentAlert);
  }catch(error){console.warn("Could not load performance assessment alerts",error);}
}

/* =========================
   RESET AND INITIALIZATION
========================= */

function resetData(){
  if(!confirm("Delete all assessment results and baseline?"))return;

  clearTimers();
  data=defaultData();
  battery=null;
  batteryCodingPairs=null;
  saveData();
  showAssessmentView("pa-dashboard");
}

if(document.getElementById("performanceAssessment")){
  updateDashboard();
  renderBaseline();
  renderHistory();
}
loadHostAssessmentAlerts();
