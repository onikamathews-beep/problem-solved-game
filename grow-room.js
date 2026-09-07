import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {getAuth,signInAnonymously,setPersistence,browserLocalPersistence} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {getDatabase,ref,get,set,update,remove,onValue,onDisconnect,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
const api=window.GrowGameAPI;
const code=(new URLSearchParams(location.search).get('room')||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
const app=initializeApp({apiKey:'AIzaSyDFAlX5qpDicALbcEMMq5LhprSp4LvhMfI',authDomain:'planning-with-ai-642ec.firebaseapp.com',databaseURL:'https://planning-with-ai-642ec-default-rtdb.firebaseio.com',projectId:'planning-with-ai-642ec',appId:'1:560868808729:web:1b0b6fc13eadb1c1047288'});
const auth=getAuth(app), db=getDatabase(app), base='rooms/'+code;
const path=p=>ref(db,base+'/'+p);
let ready=false, online=false, host=false, uid, room, latest, lastSeq=-1, queue=Promise.resolve(), renderTimer, busyUntil=0;
const inboxes=new Map(), pending=new Set();
const menu=document.getElementById('roomMenu');
const badge=document.createElement('div');
badge.setAttribute('role','status');
badge.style.cssText='padding:12px 0;font:14px system-ui';
badge.textContent='Connecting to room '+code+'…';menu.append(badge);
const lobby=document.createElement('button');lobby.textContent='Return room to lobby';lobby.hidden=true;
lobby.className='setting-action';menu.append(lobby);
const turnNote=document.createElement('p');turnNote.setAttribute('role','status');turnNote.style.cssText='margin:6px 0 0;font:14px Georgia;color:#fff1d2';document.querySelector('.title-wrap').append(turnNote);
function controls(){
 const mine=latest?.turnPlayerId===uid;
 document.getElementById('dieHit').tabIndex=-1;
 document.getElementById('dieTap').disabled=!mine||!['ready','close'].includes(latest?.type);
 document.querySelectorAll('.deck').forEach(deck=>{const enabled=mine&&latest?.type==='roll'&&latest.category===deck.dataset.name;deck.setAttribute('aria-disabled',String(!enabled));deck.tabIndex=enabled?0:-1;});
 document.getElementById('doneBtn').hidden=!mine;
 turnNote.textContent=mine?'Your turn':(latest?.playerNames?.[latest.turnPlayerId]||'Another player')+'’s turn';
}
function fail(error){document.body.inert=false;console.error(error);badge.textContent='Connection interrupted. Your room is saved; refresh to reconnect.';ready=false;}
function enqueue(fn){queue=queue.then(fn).catch(fail);return queue;}
function apply(snapshot){
 if(!snapshot||snapshot.seq<=lastSeq)return;
 const first=lastSeq<0;lastSeq=snapshot.seq;latest=snapshot;
 controls();
 clearTimeout(renderTimer);
 const draw=()=>{if(api.isLocked()){renderTimer=setTimeout(draw,60);return;} api.restore(snapshot);};
 if(snapshot.type==='roll'&&!first&&!api.isLocked()){api.closeQuestion();api.roll(snapshot.category);}else draw();
}
async function publish(snapshot){
 const writes={'private/state/growGame':snapshot};
 for(const id of Object.keys(room.players||{})) writes['views/'+id+'/growGame']=snapshot;
 await update(ref(db,base),writes);
 latest=snapshot;
}
async function act(action,actorId){
 if(!ready||!online||Date.now()<busyUntil||actorId!==latest?.turnPlayerId||action.seq!==latest.seq)return;
 let next={...latest,seq:(latest?.seq||0)+1,at:Date.now()};
 if(action.type==='grow-roll'){
  if(!['ready','close'].includes(latest?.type))return;
  next={...next,type:'roll',category:api.names[Math.floor(Math.random()*api.names.length)],prompt:null};busyUntil=Date.now()+1700;
 }else if(action.type==='grow-draw'){
  if(latest?.type!=='roll'||action.category!==latest.category||Date.now()-latest.at<1700)return;
  const prompts=room.growDeckSet.decks[action.category];
  if(!prompts?.length)return;
  next={...next,type:'draw',category:action.category,prompt:prompts[Math.floor(Math.random()*prompts.length)]};
 }else if(action.type==='grow-close'){
  if(latest.type!=='draw')return;
  const order=[...latest.turnOrder,...Object.keys(room.players).filter(id=>!latest.turnOrder.includes(id))];
  const current=order.indexOf(actorId);
  const nextId=Array.from({length:order.length},(_,i)=>order[(current+i+1)%order.length]).find(id=>room.players[id]?.connected!==false)||actorId;
  next={...next,type:'close',prompt:null,category:null,turnPlayerId:nextId,turnOrder:order,playerNames:Object.fromEntries(Object.entries(room.players).map(([id,p])=>[id,p.name||'Player']))};
 }else return;
 await publish(next);
}
async function send(type,extra={}){
 if(!ready||!online||uid!==latest?.turnPlayerId)return;
 const action={type,...extra,seq:latest.seq,at:Date.now()};
 if(host)return enqueue(()=>act(action,uid));
 await set(path('actions/'+uid+'/'+crypto.randomUUID()),action).catch(fail);
}
// Capture every route that would otherwise mutate the standalone board.
document.addEventListener('click',event=>{
 const target=event.target;
 const die=target.closest('#dieTap,#dieHit'),deck=target.closest('.deck'),done=target.closest('#doneBtn'),home=target.closest('#homeBtn');
 const backdrop=target.id==='questionLayer';
 if(!die&&!deck&&!done&&!home&&!backdrop)return;
 event.preventDefault();event.stopImmediatePropagation();
 if(home){
  if(host){lobby.click();return;}
  localStorage.removeItem('problemSolved.activeFirebaseRoom.v1');
  update(path('players/'+uid),{connected:false}).finally(()=>{location.href='./?join=grow&code='+encodeURIComponent(code);});return;
 }
 if(die)send('grow-roll');else if(deck)send('grow-draw',{category:deck.dataset.name});else send('grow-close');
},true);
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&document.body.classList.contains('reading')){event.preventDefault();event.stopImmediatePropagation();send('grow-close');}
},true);
lobby.onclick=()=>enqueue(async()=>{
 if(!host||!online)return;
 const saved=(await get(path('private/state'))).val();
 saved.phase='room';delete saved.growGame;
 saved.players=Object.entries(room.players).map(([id,p])=>({id,...p}));
 const writes={'private/state':saved,'meta/phase':'room'};
 for(const id of Object.keys(room.players))writes['views/'+id]=saved;
 await update(ref(db,base),writes);
});
try{
 await setPersistence(auth,browserLocalPersistence);
 if(!auth.currentUser)await signInAnonymously(auth);
 uid=auth.currentUser.uid;
 const meta=(await get(path('meta'))).val(), player=(await get(path('players/'+uid))).val();
 if(!meta||meta.playMode!=='grow'||!player||meta.phase!=='grow'){
  location.replace('./?join=grow&code='+encodeURIComponent(code));
 }else{
 host=meta.hostUid===uid; // The URL never grants host authority.
 room=(await get(path(host?'private/state':'views/'+uid))).val();
 if(!room?.growDeckSet)throw new Error('Return to the lobby and start a new Grow session.');
 room.players=Object.fromEntries((room.players||[]).map(p=>[p.id,p]));
 latest=room.growGame;
 if(host&&!latest?.turnPlayerId){
  await publish({...latest,seq:(latest?.seq||0)+1,turnPlayerId:uid,turnOrder:Object.keys(room.players),playerNames:Object.fromEntries(Object.entries(room.players).map(([id,p])=>[id,p.name||'Player']))});
 }
 const name=player.name||'Player';
 localStorage.setItem('problemSolved.activeFirebaseRoom.v1',JSON.stringify({roomCode:code,role:host?'host':'guest',mode:'grow',name}));
 lobby.hidden=!host;
 onValue(ref(db,'.info/connected'),async snapshot=>{
  online=snapshot.val()===true;
  badge.textContent='Room '+code+' · '+(online?(host?'Host':'Player')+' · '+room.growDeckSet.name:'Reconnecting…');
  if(online){
   await onDisconnect(path('players/'+uid+'/connected')).set(false);
   await onDisconnect(path('presence/'+uid)).set({connected:false,lastSeen:serverTimestamp()});
   await update(path('players/'+uid),{connected:true});
   await set(path('presence/'+uid),{connected:true,lastSeen:serverTimestamp()});
  }
 },fail);
 onValue(path('meta'),snapshot=>{const m=snapshot.val();if(!m||m.phase==='closed'){localStorage.removeItem('problemSolved.activeFirebaseRoom.v1');location.replace(host?'./?game=grow':'./?join=grow');}else if(m.phase!=='grow')location.replace(host?'./':'./?join=grow&code='+encodeURIComponent(code));},fail);
 onValue(path('views/'+uid+'/growGame'),snapshot=>apply(snapshot.val()),fail);
 document.body.inert=false;
 ready=true;
 if(host){
  onValue(path('players'),snapshot=>enqueue(async()=>{
   room.players=snapshot.val()||{};
   // Supply a complete view to late joiners so the lobby can enter this session.
   const state=(await get(path('private/state'))).val();
   for(const [id,player] of Object.entries(room.players)){
    if(!inboxes.has(id)){
     const view={...state,players:Object.entries(room.players).map(([id,p])=>({id,...p})),growGame:latest};
     await set(path('views/'+id),view);
     inboxes.set(id,onValue(path('actions/'+id),snapshot=>{
      for(const [actionId,action] of Object.entries(snapshot.val()||{})){
       const key=id+'/'+actionId;if(pending.has(key))continue;pending.add(key);
       enqueue(async()=>{
        if(room.players[id]?.connected!==false&&Date.now()-Number(action.at)<15000)await act(action,id);
        await remove(path('actions/'+key));pending.delete(key);
       });
      }
     },fail));
    }
   }
  }),fail);
 }
 }
}catch(error){fail(error);}
