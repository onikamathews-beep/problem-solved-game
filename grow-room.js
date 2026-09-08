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

const tableStyle=document.createElement('style');
tableStyle.textContent=`
  /* Rotate the real illustrated board and every card stack as one rigid
     lazy-Susan surface. Keeping a single transform prevents the platter,
     artwork, and cards from drifting out of alignment. */
  .table{
    position:absolute!important;
    inset:0!important;
    transform:rotateX(52deg) rotateZ(var(--table-rotation))!important;
    transform-origin:50% 50%!important;
    transform-style:preserve-3d!important;
    will-change:transform;
    backface-visibility:hidden
  }
  @media(max-width:620px){
    .table{transform:rotateX(44deg) rotateZ(var(--table-rotation))!important}
  }
  .table-shell.grow-turning .table,
  .table-shell.grow-spinning .table{transition:none!important}

  /* The die remains physically centered. Its cube receives the same table yaw
     inside GrowGameAPI so the correct landed face remains on top while the
     visible side faces turn with the table. */
  .die-hit{
    transform:none!important;
    transform-origin:50% 50%!important;
    transition:none!important
  }
  .die-tap{transform:translate(-50%,-50%)!important}
  .table-shell{cursor:grab!important;touch-action:none!important}
  .table-shell.grow-turning{cursor:grabbing!important}

  /* Make the rolled category unmistakable without covering the card art. */
  .deck.selected{
    z-index:14!important;
    filter:drop-shadow(0 0 10px rgba(255,224,139,.95))
           drop-shadow(0 0 22px rgba(245,190,66,.78))!important
  }
  .deck.selected .deck-card,
  .deck.selected:hover .deck-card{
    transform:translateZ(32px) scale(1.045)!important;
    box-shadow:
      inset 1px 1px 0 #fff8e6,
      0 0 0 3px rgba(255,232,166,.98),
      0 0 15px 5px rgba(255,218,120,.88),
      0 0 32px 10px rgba(242,180,55,.58),
      0 5px 0 #9c7745,
      2px 19px 18px rgba(39,23,12,.48)!important;
    animation:growDeckSelectedGlow 1.55s ease-in-out infinite
  }
  @keyframes growDeckSelectedGlow{
    0%,100%{
      filter:brightness(1.03);
      box-shadow:
        inset 1px 1px 0 #fff8e6,
        0 0 0 3px rgba(255,232,166,.94),
        0 0 14px 4px rgba(255,218,120,.80),
        0 0 28px 8px rgba(242,180,55,.48),
        0 5px 0 #9c7745,
        2px 19px 18px rgba(39,23,12,.48)
    }
    50%{
      filter:brightness(1.10);
      box-shadow:
        inset 1px 1px 0 #fffaf0,
        0 0 0 4px rgba(255,240,190,1),
        0 0 20px 7px rgba(255,222,128,.98),
        0 0 42px 14px rgba(244,184,57,.68),
        0 5px 0 #9c7745,
        2px 19px 18px rgba(39,23,12,.48)
    }
  }
  @media(prefers-reduced-motion:reduce){
    .deck.selected .deck-card{animation:none!important}
  }
`;
document.head.append(tableStyle);

let tableRotation=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--table-rotation'))||0;
let tableTurning=false,lastPointerPoint=null,lastPointerTime=0,angularVelocity=0,inertiaFrame=0,paintFrame=0;

function projectedPointer(event){
 const box=tableShell.getBoundingClientRect();
 const cx=box.left+box.width/2;
 const cy=box.top+box.height/2;
 const tilt=(matchMedia('(max-width:620px)').matches?44:52)*Math.PI/180;
 const planeScale=Math.max(.48,Math.cos(tilt));
 return {
   x:event.clientX-cx,
   y:(event.clientY-cy)/planeScale,
   minRadius:box.width*.19
 };
}

function tangentRotationDelta(from,to){
 const radius=Math.max(from.minRadius,Math.hypot(from.x,from.y));
 const tx=-from.y/radius;
 const ty= from.x/radius;
 const dx=to.x-from.x;
 const dy=to.y-from.y;
 const tangentialPixels=dx*tx+dy*ty;
 const degrees=tangentialPixels/radius*180/Math.PI;
 return Math.max(-14,Math.min(14,degrees));
}

function applyTablePaint(){
 document.documentElement.style.setProperty('--table-rotation',tableRotation+'deg');
 api.setTableRotation?.(tableRotation);
}

function requestTablePaint(){
 if(paintFrame)return;
 paintFrame=requestAnimationFrame(()=>{
   paintFrame=0;
   applyTablePaint();
 });
}

applyTablePaint();

function stopTableSpin(){
 if(inertiaFrame)cancelAnimationFrame(inertiaFrame);
 inertiaFrame=0;
 tableShell.classList.remove('grow-spinning');
}

function startTableInertia(velocity){
 stopTableSpin();
 velocity=Math.max(-.22,Math.min(.22,Number(velocity)||0));
 if(Math.abs(velocity)<.012)return;
 tableShell.classList.add('grow-spinning');
 let last=performance.now();
 const frame=now=>{
   const dt=Math.min(28,Math.max(8,now-last||16));
   last=now;
   tableRotation+=velocity*dt;
   applyTablePaint();
   velocity*=Math.pow(.945,dt/16);
   if(Math.abs(velocity)>.008)inertiaFrame=requestAnimationFrame(frame);
   else{
     inertiaFrame=0;
     tableShell.classList.remove('grow-spinning');
   }
 };
 inertiaFrame=requestAnimationFrame(frame);
}

tableShell.addEventListener('pointerdown',event=>{
 if(event.button!==undefined&&event.button!==0)return;
 if(event.target.closest('#dieTap,#dieHit,.deck'))return;
 if(document.getElementById('questionLayer')?.classList.contains('show'))return;
 stopTableSpin();
 tableTurning=true;
 lastPointerPoint=projectedPointer(event);
 lastPointerTime=performance.now();
 angularVelocity=0;
 tableShell.classList.add('grow-turning');
 try{tableShell.setPointerCapture(event.pointerId);}catch{}
});

tableShell.addEventListener('pointermove',event=>{
 if(!tableTurning||!lastPointerPoint)return;
 const now=performance.now();
 const point=projectedPointer(event);
 const delta=tangentRotationDelta(lastPointerPoint,point);
 const dt=Math.max(1,now-lastPointerTime);
 tableRotation+=delta;
 const instantVelocity=delta/dt;
 angularVelocity=angularVelocity*.68+instantVelocity*.32;
 lastPointerPoint=point;
 lastPointerTime=now;
 requestTablePaint();
});

function endTableTurn(event){
 if(!tableTurning)return;
 tableTurning=false;
 tableShell.classList.remove('grow-turning');
 try{tableShell.releasePointerCapture(event.pointerId);}catch{}
 if(performance.now()-lastPointerTime>95)angularVelocity=0;
 startTableInertia(angularVelocity);
 lastPointerPoint=null;
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
 window.GrowNotesAPI?.clearSession?.();
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
 onValue(path('meta'),snapshot=>{const m=snapshot.val();if(!m||m.phase==='closed'){window.GrowNotesAPI?.clearSession?.();localStorage.removeItem('problemSolved.activeFirebaseRoom.v1');location.replace(host?'./?game=grow':'./?join=grow');}else if(m.phase!=='grow'){window.GrowNotesAPI?.clearSession?.();location.replace(host?'./':'./?join=grow&code='+encodeURIComponent(code));}},fail);
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
