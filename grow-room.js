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
const tableShell=document.getElementById('tableShell');
const table=document.getElementById('table');
// Keep the illustrated outer rim stationary and rotate the actual playing
// layer above it. Moving the existing deck nodes preserves all standalone
// click/keyboard listeners already attached to them.
const tableTurner=document.createElement('div');
tableTurner.className='grow-table-turner';
Array.from(table.querySelectorAll('.deck')).forEach(deck=>tableTurner.appendChild(deck));
table.appendChild(tableTurner);

const tableStyle=document.createElement('style');
tableStyle.textContent=`
  /* A real lazy-Susan structure: the heavy outer board stays in the camera
     plane while a raised inner platter and the card layer rotate above it.
     This prevents the baked highlights/shadows in the board artwork from
     rotating like a flat photograph. */
  .table{
    /* Preserve the board's original absolute square. Changing this to
       position:relative collapses the board because all of its playing pieces
       are absolutely positioned; that is what made the board disappear and
       sent the decks to the top of the screen. */
    position:absolute!important;
    inset:0!important;
    transform:rotateX(52deg)!important;
    transform-origin:50% 50%!important;
    transform-style:preserve-3d!important;
    isolation:isolate
  }
  .table::before{
    content:"";
    position:absolute;
    inset:8.5%;
    border-radius:50%;
    background:var(--board-art) center/120.5% 120.5% no-repeat;
    transform:translateZ(3px) rotateZ(var(--table-rotation));
    transform-origin:50% 50%;
    pointer-events:none;
    z-index:0;
    box-shadow:inset 0 0 0 2px rgba(126,80,45,.32),inset 0 8px 15px rgba(255,225,177,.08),0 3px 5px rgba(36,19,10,.38)
  }
  .grow-table-turner{
    position:absolute;
    inset:0;
    width:100%;
    height:100%;
    border-radius:50%;
    transform-style:preserve-3d;
    transform:translateZ(7px) rotateZ(var(--table-rotation));
    transform-origin:50% 50%;
    z-index:2;
    pointer-events:none
  }
  .grow-table-turner .deck{pointer-events:auto}
  @media(max-width:620px){
    .table{transform:rotateX(44deg)!important}
  }
  .table-shell.grow-turning .grow-table-turner,
  .table-shell.grow-spinning .grow-table-turner,
  .table-shell.grow-turning .table::before,
  .table-shell.grow-spinning .table::before{transition:none!important}

  /* Keep the full-size dice canvas fixed. The cube itself now receives the
     table rotation as a true 3D yaw inside drawDice(), so its landed face stays
     on top while its side faces rotate naturally through view. */
  .die-hit{
    transform:none!important;
    transform-origin:50% 50%!important;
    transition:none!important
  }
  /* The invisible tap target stays centered and does not need to rotate. */
  .die-tap{
    transform:translate(-50%,-50%)!important
  }
  .table-shell.grow-turning .die-hit,
  .table-shell.grow-spinning .die-hit{transition:none!important}
  .table-shell{cursor:grab!important;touch-action:none!important}
  .table-shell.grow-turning{cursor:grabbing!important}
`;
document.head.append(tableStyle);

let tableRotation=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--table-rotation'))||0;
let tableTurning=false,lastPointerAngle=0,lastPointerTime=0,angularVelocity=0,inertiaFrame=0;

function pointerAngle(event){
 const box=tableShell.getBoundingClientRect();
 return Math.atan2(event.clientY-(box.top+box.height/2),event.clientX-(box.left+box.width/2))*180/Math.PI;
}
function normalizeTurn(delta){
 while(delta>180)delta-=360;
 while(delta<-180)delta+=360;
 return delta;
}
function paintTableRotation(){
 document.documentElement.style.setProperty('--table-rotation',tableRotation+'deg');
 api.setTableRotation?.(tableRotation);
}
paintTableRotation();
function stopTableSpin(){
 if(inertiaFrame)cancelAnimationFrame(inertiaFrame);
 inertiaFrame=0;
 tableShell.classList.remove('grow-spinning');
}
function startTableInertia(velocity){
 stopTableSpin();
 velocity=Math.max(-0.35,Math.min(0.35,Number(velocity)||0));
 if(Math.abs(velocity)<0.015)return;
 tableShell.classList.add('grow-spinning');
 let last=performance.now();
 const frame=now=>{
   const dt=Math.min(32,Math.max(8,now-last||16));
   last=now;
   tableRotation+=velocity*dt;
   paintTableRotation();
   velocity*=Math.pow(.96,dt/16);
   if(Math.abs(velocity)>0.01)inertiaFrame=requestAnimationFrame(frame);
   else{inertiaFrame=0;tableShell.classList.remove('grow-spinning');}
 };
 inertiaFrame=requestAnimationFrame(frame);
}
tableShell.addEventListener('pointerdown',event=>{
 if(event.button!==undefined&&event.button!==0)return;
 if(event.target.closest('#dieTap,#dieHit,.deck'))return;
 if(document.getElementById('questionLayer')?.classList.contains('show'))return;
 stopTableSpin();
 tableTurning=true;
 lastPointerAngle=pointerAngle(event);
 lastPointerTime=performance.now();
 angularVelocity=0;
 tableShell.classList.add('grow-turning');
 try{tableShell.setPointerCapture(event.pointerId);}catch{}
});
tableShell.addEventListener('pointermove',event=>{
 if(!tableTurning)return;
 const now=performance.now();
 const angle=pointerAngle(event);
 const delta=normalizeTurn(angle-lastPointerAngle);
 const dt=Math.max(1,now-lastPointerTime);
 tableRotation+=delta;
 angularVelocity=delta/dt;
 lastPointerAngle=angle;
 lastPointerTime=now;
 paintTableRotation();
});
function endTableTurn(event){
 if(!tableTurning)return;
 tableTurning=false;
 tableShell.classList.remove('grow-turning');
 try{tableShell.releasePointerCapture(event.pointerId);}catch{}
 if(performance.now()-lastPointerTime>90)angularVelocity=0;
 startTableInertia(angularVelocity);
}
tableShell.addEventListener('pointerup',endTableTurn);
tableShell.addEventListener('pointercancel',endTableTurn);
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
 if(snapshot.type==='roll'&&!first&&!api.isLocked()){stopTableSpin();api.closeQuestion();api.roll(snapshot.category);}else draw();
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
 if(die){stopTableSpin();send('grow-roll');}else if(deck){stopTableSpin();send('grow-draw',{category:deck.dataset.name});}else send('grow-close');
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
