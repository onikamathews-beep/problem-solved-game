import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, signInAnonymously, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getDatabase, ref, get, set, onValue } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';

const firebaseConfig={
  apiKey:'AIzaSyDFAlX5qpDicALbcEMMq5LhprSp4LvhMfI',
  authDomain:'planning-with-ai-642ec.firebaseapp.com',
  databaseURL:'https://planning-with-ai-642ec-default-rtdb.firebaseio.com',
  projectId:'planning-with-ai-642ec',
  appId:'1:560868808729:web:1b0b6fc13eadb1c1047288'
};

const STORAGE_KEY='growWherePlanted.deckSets.v1';
const ACTIVE_KEY='growWherePlanted.activeSet.v1';
const SYNC_CODE_KEY='growWherePlanted.syncCode.v1';
const LAST_CLOUD_KEY='growWherePlanted.syncLastCloudAt.v1';
const CATS=['Roots','Field','Garden','Vine','Seasons'];
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const app=getApps().length?getApp():initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getDatabase(app);

let unsubscribe=null;
let pushTimer=0;
let applyingCloud=false;
let readyPromise=null;

function cleanCode(value){
  return String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,20);
}
function displayCode(value){
  return cleanCode(value).replace(/(.{5})/g,'$1-').replace(/-$/,'');
}
function randomCode(){
  const bytes=new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes,b=>ALPHABET[b%ALPHABET.length]).join('');
}
function validSets(value){
  return Array.isArray(value)&&value.length&&value.every(set=>
    set&&typeof set==='object'&&CATS.every(cat=>Array.isArray(set.decks?.[cat]))
  );
}
function localSnapshot(){
  let sets=[];
  try{sets=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');}catch{}
  return {
    version:1,
    sets:Array.isArray(sets)?sets:[],
    activeId:localStorage.getItem(ACTIVE_KEY)||null,
    updatedAt:Date.now(),
    updatedBy:auth.currentUser?.uid||null
  };
}
function syncRef(code=localStorage.getItem(SYNC_CODE_KEY)||''){
  const cleaned=cleanCode(code);
  return cleaned?ref(db,'growDeckSync/'+cleaned):null;
}
async function ensureAuth(){
  if(readyPromise)return readyPromise;
  readyPromise=(async()=>{
    await setPersistence(auth,browserLocalPersistence);
    if(!auth.currentUser)await signInAnonymously(auth);
    return auth.currentUser;
  })();
  return readyPromise;
}
function emit(type,detail={}){
  window.dispatchEvent(new CustomEvent(type,{detail}));
}
function applyCloud(value){
  if(!value||!validSets(value.sets))return false;
  applyingCloud=true;
  localStorage.setItem(STORAGE_KEY,JSON.stringify(value.sets));
  if(value.activeId&&value.sets.some(s=>s.id===value.activeId))localStorage.setItem(ACTIVE_KEY,value.activeId);
  else if(value.sets[0]?.id)localStorage.setItem(ACTIVE_KEY,value.sets[0].id);
  localStorage.setItem(LAST_CLOUD_KEY,String(Number(value.updatedAt)||Date.now()));
  applyingCloud=false;
  emit('grow-decks-cloud-update',{updatedAt:value.updatedAt||Date.now(),count:value.sets.length});
  return true;
}
async function pushNow(){
  if(applyingCloud)return false;
  const code=cleanCode(localStorage.getItem(SYNC_CODE_KEY));
  if(!code)return false;
  await ensureAuth();
  const snap=localSnapshot();
  if(!validSets(snap.sets))return false;
  await set(syncRef(code),snap);
  localStorage.setItem(LAST_CLOUD_KEY,String(snap.updatedAt));
  emit('grow-decks-sync-status',{status:'synced',code:displayCode(code),updatedAt:snap.updatedAt});
  return true;
}
function queuePush(delay=450){
  if(applyingCloud||!localStorage.getItem(SYNC_CODE_KEY))return;
  clearTimeout(pushTimer);
  pushTimer=setTimeout(()=>pushNow().catch(error=>emit('grow-decks-sync-status',{status:'error',message:error.message})),delay);
}
async function startListener(){
  const code=cleanCode(localStorage.getItem(SYNC_CODE_KEY));
  if(!code)return false;
  await ensureAuth();
  if(unsubscribe)unsubscribe();
  unsubscribe=onValue(syncRef(code),snapshot=>{
    const value=snapshot.val();
    if(!value)return;
    const cloudAt=Number(value.updatedAt)||0;
    const localAt=Number(localStorage.getItem(LAST_CLOUD_KEY)||0);
    const fromMe=value.updatedBy&&value.updatedBy===auth.currentUser?.uid;
    if(!fromMe&&cloudAt>localAt)applyCloud(value);
    emit('grow-decks-sync-status',{status:'synced',code:displayCode(code),updatedAt:cloudAt});
  },error=>emit('grow-decks-sync-status',{status:'error',message:error.message}));
  emit('grow-decks-sync-status',{status:'connected',code:displayCode(code)});
  return true;
}
async function create(){
  await ensureAuth();
  let code=randomCode();
  for(let tries=0;tries<5;tries++){
    const existing=await get(syncRef(code));
    if(!existing.exists())break;
    code=randomCode();
  }
  localStorage.setItem(SYNC_CODE_KEY,code);
  const snap=localSnapshot();
  await set(syncRef(code),snap);
  localStorage.setItem(LAST_CLOUD_KEY,String(snap.updatedAt));
  await startListener();
  emit('grow-decks-sync-status',{status:'created',code:displayCode(code)});
  return displayCode(code);
}
async function connect(input){
  const code=cleanCode(input);
  if(code.length!==20)throw new Error('Enter the full 20-character Grow sync code.');
  await ensureAuth();
  const snapshot=await get(syncRef(code));
  if(!snapshot.exists())throw new Error('No Grow deck library was found for that sync code.');
  const value=snapshot.val();
  if(!validSets(value?.sets))throw new Error('That sync library does not contain valid Grow deck sets.');
  localStorage.setItem(SYNC_CODE_KEY,code);
  applyCloud(value);
  await startListener();
  emit('grow-decks-sync-status',{status:'connected',code:displayCode(code)});
  return displayCode(code);
}
function disconnect(){
  if(unsubscribe)unsubscribe();
  unsubscribe=null;
  clearTimeout(pushTimer);
  localStorage.removeItem(SYNC_CODE_KEY);
  localStorage.removeItem(LAST_CLOUD_KEY);
  emit('grow-decks-sync-status',{status:'disconnected'});
}
function currentCode(){
  const code=cleanCode(localStorage.getItem(SYNC_CODE_KEY));
  return code?displayCode(code):'';
}
async function refresh(){
  const code=cleanCode(localStorage.getItem(SYNC_CODE_KEY));
  if(!code)return false;
  await ensureAuth();
  const snapshot=await get(syncRef(code));
  if(snapshot.exists())return applyCloud(snapshot.val());
  return false;
}

window.GrowDeckSync={create,connect,disconnect,currentCode,queuePush,pushNow,refresh,startListener,displayCode};
window.GrowDeckSyncReady=ensureAuth().then(async()=>{
  if(localStorage.getItem(SYNC_CODE_KEY))await startListener();
  return window.GrowDeckSync;
}).catch(error=>{
  emit('grow-decks-sync-status',{status:'error',message:error.message});
  return window.GrowDeckSync;
});
