// Minimal Flashcards PWA (vanilla JS, localStorage)
const $ = (id) => document.getElementById(id);
const tabs = document.querySelectorAll('nav button');
const sections = {
  learn: $('tab-learn'),
  browse: $('tab-browse'),
  challenges: $('tab-challenges'),
  rewards: $('tab-rewards'),
  stats: $('tab-stats')
};

let TERMS = [];
let SESSION = [];
let CURRENT = null;
let STATE = {
  coins: 0,
  reviewsToday: 0,
  doneToday: 0,
  lastDate: null,
  progress: {}, // key: termId => { box, nextDue, seen, correct, wrong }
  history: []   // array of {ts, termId, result}
};

// Leitner intervals (days) for boxes 1..5
const INTERVALS = {1:1, 2:2, 3:4, 4:7, 5:14};

// Challenges (simple)
const CHALLENGES = [
  { id:'daily_20', name:'Tagesziel: 20 Karten', type:'daily', metric:'reviews', target:20, reward:10 },
  { id:'weekly_150', name:'Wochensziel: 150 Karten', type:'weekly', metric:'reviews', target:150, reward:50 },
  { id:'streak_7', name:'7‑Tage‑Streak', type:'streak', metric:'streak', target:7, reward:25 }
];
let CH_PROGRESS = {}; // id => {progress, achievedDates:[], lastGrant: null}

// Rewards examples
const REWARDS = [
  { id:'theme_space', name:'Theme: Space', cost:100, type:'digital', delivery:'immediate' },
  { id:'avatar_ninja_cat', name:'Avatar: Ninja Cat', cost:150, type:'digital', delivery:'immediate' },
  { id:'title_mastermind', name:'Titel: Mastermind', cost:250, type:'digital', delivery:'immediate' }
];

// --- Storage helpers ---
function loadState(){
  try{
    const s = localStorage.getItem('flashcards_state_v1');
    if(s){
      STATE = JSON.parse(s);
    }
    // reset counters if day changed
    const today = new Date().toISOString().slice(0,10);
    if(STATE.lastDate !== today){
      STATE.reviewsToday = 0;
      STATE.doneToday = 0;
      STATE.lastDate = today;
    }
    const ch = localStorage.getItem('flashcards_ch_v1');
    if(ch) CH_PROGRESS = JSON.parse(ch);
  }catch(e){ console.warn(e); }
}
function saveState(){
  localStorage.setItem('flashcards_state_v1', JSON.stringify(STATE));
  localStorage.setItem('flashcards_ch_v1', JSON.stringify(CH_PROGRESS));
}

// --- Data load ---
async function loadTerms(){
  const res = await fetch('data/terms.json');
  TERMS = await res.json();
}

// --- Tabs ---
tabs.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    tabs.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    Object.values(sections).forEach(s=>s.classList.add('hidden'));
    sections[btn.dataset.tab].classList.remove('hidden');
    if(btn.dataset.tab==='browse') renderBrowse();
    if(btn.dataset.tab==='challenges') renderChallenges();
    if(btn.dataset.tab==='rewards') renderRewards();
    if(btn.dataset.tab==='stats') renderStats();
  });
});

// --- Session creation ---
function newSession(){
  const level = $('levelFilter').value;
  const today = new Date().toISOString().slice(0,10);
  const due = TERMS.filter(t=>{
    if(level!=='all' && t.level!==level) return false;
    const p = STATE.progress[t.id] || {box:1,nextDue:today};
    return (p.nextDue||today) <= today; // fällig
  });
  // fallback: wenn nichts fällig, mischen wir 20 aus Level
  let pool = due.length>0 ? due : TERMS.filter(t=> level==='all' || t.level===level);
  pool = shuffle(pool).slice(0,20);
  SESSION = pool.map(t=>t.id);
  CURRENT = null;
  nextCard();
}

function nextCard(){
  if(SESSION.length===0){
    showMessage('Sitzung beendet! Erstelle eine neue Sitzung.');
    return;
  }
  const id = SESSION[0];
  const term = TERMS.find(t=>t.id===id);
  CURRENT = term;
  $('term').textContent = term.term;
  $('definition').textContent = term.definition;
  $('definition').classList.add('hidden');
  $('meta').textContent = `${term.subject} · ${term.topic} · ${term.level}`;
}

// --- Actions ---
$('flip').addEventListener('click',()=> $('definition').classList.toggle('hidden'));
$('btn-ok').addEventListener('click',()=> gradeCard('ok'));
$('btn-mid').addEventListener('click',()=> gradeCard('mid'));
$('btn-bad').addEventListener('click',()=> gradeCard('bad'));
$('newSession').addEventListener('click', newSession);
$('exportProgress').addEventListener('click', exportCSV);

function gradeCard(type){
  if(!CURRENT) return;
  const id = CURRENT.id;
  const today = new Date().toISOString().slice(0,10);
  let p = STATE.progress[id] || { box:1, nextDue: today, seen:0, correct:0, wrong:0 };
  p.seen++;
  if(type==='ok'){
    p.box = Math.min(5, (p.box||1)+1);
    p.correct++;
    STATE.coins += (CURRENT.level==='master' ? 2 : 1);
    STATE.doneToday++;
  }else if(type==='mid'){
    // stay in box, small reward
    STATE.coins += 0;
  }else{
    p.box = 1;
    p.wrong++;
  }
  const interval = INTERVALS[p.box] || 1;
  const next = new Date();
  next.setDate(next.getDate()+interval);
  p.nextDue = next.toISOString().slice(0,10);
  STATE.progress[id] = p;
  STATE.reviewsToday++;
  STATE.history.push({ts: new Date().toISOString(), termId: id, result: type});
  saveState();
  SESSION.shift();
  refreshChips();
  nextCard();
  checkChallenges();
}

function refreshChips(){
  // due count
  const today = new Date().toISOString().slice(0,10);
  const level = $('levelFilter').value;
  const due = TERMS.filter(t=> (level==='all'||t.level===level) && ((STATE.progress[t.id]?.nextDue||today) <= today));
  $('chip-due').textContent = `Fällig: ${due.length}`;
  $('chip-done').textContent = `Heute erledigt: ${STATE.doneToday}`;
  $('chip-coins').textContent = `Münzen: ${STATE.coins}`;
}

function showMessage(msg){
  $('term').textContent = msg;
  $('definition').classList.add('hidden');
  $('meta').textContent = '—';
}

// --- Browse ---
function renderBrowse(){
  const q = $('search').value?.toLowerCase()||'';
  const level = $('levelFilter').value;
  const list = $('termList');
  list.innerHTML='';
  TERMS.filter(t=> (level==='all'||t.level===level) && (t.term.toLowerCase().includes(q)||t.definition.toLowerCase().includes(q)))
    .slice(0,60)
    .forEach(t=>{
      const div = document.createElement('div');
      div.className='tile';
      div.innerHTML = `<h3>${t.term}</h3><div class="small">${t.definition}</div><div class="small">${t.subject} · ${t.topic} · ${t.level}</div>`;
      list.appendChild(div);
    });
}
$('search').addEventListener('input', renderBrowse);

// --- Challenges ---
function renderChallenges(){
  const list = $('challengeList'); list.innerHTML='';
  CHALLENGES.forEach(c=>{
    const st = challengeStatus(c);
    const div = document.createElement('div');
    div.className='tile';
    div.innerHTML = `<h3>${c.name}</h3><div class="small">Fortschritt: ${st.progress}/${c.target} · Status: ${st.done?'Erreicht':'Offen'}</div>`;
    list.appendChild(div);
  });
}
function challengeStatus(c){
  const today = new Date();
  if(!CH_PROGRESS[c.id]) CH_PROGRESS[c.id] = {progress:0, achievedDates:[], lastGrant:null};
  let progress = 0, done=false;
  if(c.type==='daily'){
    const todayStr = today.toISOString().slice(0,10);
    // count today's reviews
    progress = STATE.history.filter(h=>h.ts.slice(0,10)===todayStr).length;
    done = progress>=c.target;
  }else if(c.type==='weekly'){
    const start = new Date(); start.setDate(start.getDate()-6);
    progress = STATE.history.filter(h=> new Date(h.ts) >= start).length;
    done = progress>=c.target;
  }else if(c.type==='streak'){
    progress = streakCount();
    done = progress>=c.target;
  }
  return {progress, done};
}
function checkChallenges(){
  CHALLENGES.forEach(c=>{
    const st = challengeStatus(c);
    const key = c.id+'@'+(c.type==='daily'?new Date().toISOString().slice(0,10):c.type==='weekly'?'week'+weekOfYear(new Date()):'streak');
    const granted = CH_PROGRESS[c.id]?.lastGrant === key;
    if(st.done && !granted){
      STATE.coins += c.reward;
      CH_PROGRESS[c.id].lastGrant = key;
      saveState();
    }
  });
}

function weekOfYear(d){
  // ISO week number
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

function streakCount(){
  // count consecutive days with at least one review ending today
  const days = new Set(STATE.history.map(h=>h.ts.slice(0,10)));
  let cnt=0; let cur = new Date();
  while(true){
    const s = cur.toISOString().slice(0,10);
    if(days.has(s)){ cnt++; cur.setDate(cur.getDate()-1); }
    else break;
  }
  return cnt;
}

// --- Rewards ---
function renderRewards(){
  const list = $('rewardList'); list.innerHTML='';
  REWARDS.forEach(r=>{
    const div = document.createElement('div');
    div.className='tile';
    const can = STATE.coins>=r.cost;
    div.innerHTML = `<h3>${r.name}</h3><div class="small">Kosten: ${r.cost} Münzen · Typ: ${r.type}</div>
      <button class="btn" ${can?'':'disabled'}>Einlösen</button>`;
    const btn = div.querySelector('button');
    btn.addEventListener('click',()=>{
      if(STATE.coins<r.cost) return;
      STATE.coins -= r.cost;
      saveState();
      alert(`${r.name} freigeschaltet!`);
      refreshChips();
    });
    list.appendChild(div);
  });
}

// --- Stats ---
function renderStats(){
  const last7 = new Array(7).fill(0);
  const now = new Date();
  STATE.history.forEach(h=>{
    const d = new Date(h.ts);
    const diff = Math.floor((now - d)/86400000);
    if(diff>=0 && diff<7) last7[6-diff]++;
  });
  $('stats7').textContent = last7.map(n=>`${n}`).join(' | ');

  const counts = {starter:0,challenger:0,master:0};
  TERMS.forEach(t=>{
    if(STATE.progress[t.id]?.seen>0) counts[t.level]++;
  });
  $('levelProgress').textContent = `Starter: ${counts.starter} · Challenger: ${counts.challenger} · Master: ${counts.master}`;
}

// --- Export CSV ---
function exportCSV(){
  const rows = [['term_id','box','next_due','seen','correct','wrong']];
  Object.entries(STATE.progress).forEach(([id,p])=>{
    rows.push([id,p.box,p.nextDue,p.seen,p.correct,p.wrong]);
  });
  const csv = rows.map(r=>r.join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'progress_export.csv';
  a.click();
}

// --- Utils ---
function shuffle(a){ return a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]); }

// --- Init ---
async function init(){
  loadState();
  await loadTerms();
  newSession();
  refreshChips();
  if('serviceWorker' in navigator){
    try { navigator.serviceWorker.register('./service-worker.js'); } catch(e){ console.warn(e); }
  }
}
init();
