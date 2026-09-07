const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync('grow-room.js','utf8').replace(/^import .*;\n/gm,'');
const copy=x=>x===undefined?null:JSON.parse(JSON.stringify(x));
function fixture(){
 const categories=['Roots','Field','Garden','Vine','Seasons'];
 const state={phase:'grow',roomCode:'ABC123',players:[{id:'host',name:'Host'},{id:'guest',name:'Guest'}],settings:{playMode:'grow'},growDeckSet:{name:'Custom',decks:Object.fromEntries(categories.map(c=>[c,['Host '+c+' question']]))},growGame:{seq:0,type:'ready'}};
 const data={rooms:{ABC123:{meta:{hostUid:'host',phase:'grow',playMode:'grow'},players:{host:{name:'Host',connected:true},guest:{name:'Guest',connected:true}},private:{state},views:{host:copy(state),guest:copy(state)}}}},listeners=[];
 const read=p=>p==='.info/connected'?true:p.split('/').reduce((o,k)=>o?.[k],data);
 const write=(p,v)=>{const keys=p.split('/'),key=keys.pop();let o=data;for(const k of keys)o=o[k]??={};if(v===null)delete o[key];else o[key]=copy(v);};
 const notify=paths=>{for(const l of listeners)if(paths.some(p=>p===l.p||p.startsWith(l.p+'/')||l.p.startsWith(p+'/')))queueMicrotask(()=>l.fn({val:()=>copy(read(l.p))}));};
 async function client(id){
  const events={},calls=[];
  const element=()=>({style:{},setAttribute(){},append(){},hidden:false});
  const api={names:categories,isLocked:()=>false,restore:s=>calls.push(['restore',copy(s)]),roll:c=>calls.push(['roll',c]),closeQuestion(){}};
  const context={window:{GrowGameAPI:api},URLSearchParams,location:{search:'?room=ABC123&role=host',replace(url){calls.push(['redirect',url])}},document:{createElement:element,body:{append(){},classList:{contains:()=>false}},addEventListener:(e,f)=>events[e]=f},console,Date,Math,Map,Set,crypto:require('node:crypto').webcrypto,setTimeout,clearTimeout,localStorage:{setItem(){},removeItem(){}},initializeApp:()=>({}),getAuth:()=>({currentUser:{uid:id}}),getDatabase:()=>({}),setPersistence:async()=>{},signInAnonymously:async()=>{},browserLocalPersistence:{},ref:(_,p)=>p,serverTimestamp:()=>Date.now(),onDisconnect:()=>({set:async()=>{}}),get:async p=>({val:()=>copy(read(p))}),set:async(p,v)=>{write(p,v);notify([p]);},remove:async p=>{write(p,null);notify([p]);},update:async(p,values)=>{let paths=[];for(const [key,v]of Object.entries(values)){write(p+'/'+key,v);paths.push(p+'/'+key);}notify(paths);},onValue:(p,fn)=>{assert.notEqual(p,'rooms/ABC123/actions','Must listen at permitted player inbox path');const l={p,fn};listeners.push(l);queueMicrotask(()=>fn({val:()=>copy(read(p))}));return()=>listeners.splice(listeners.indexOf(l),1);}};
  vm.createContext(context);await vm.runInContext('(async()=>{'+source+'})()',context);await settle();
  return {context,calls,click:selector=>events.click({target:{closest:s=>s===selector?{dataset:{name:'Roots'}}:null},preventDefault(){},stopImmediatePropagation(){}})};
 }
 return {client,read,write,notify};
}
async function settle(){for(let i=0;i<15;i++)await new Promise(r=>setImmediate(r));}
test('guest requests use host deck, persist full state, and restore after refresh',async()=>{
 const f=fixture(),h=await f.client('host'),g=await f.client('guest');
 g.click('.deck');await settle();
 assert.equal(f.read('rooms/ABC123/private/state/growGame').prompt,'Host Roots question');
 assert.equal(f.read('rooms/ABC123/views/guest/growGame').prompt,'Host Roots question');
 assert.ok(h.calls.some(c=>c[1]?.prompt==='Host Roots question'));
 const reload=await f.client('guest');
 assert.ok(reload.calls.some(c=>c[1]?.prompt==='Host Roots question'));
 g.click('#doneBtn');await settle();
 assert.equal(f.read('rooms/ABC123/private/state/growGame').type,'close');
 g.click('#dieTap,#dieHit');await settle();
 assert.equal(f.read('rooms/ABC123/views/guest/growGame').category,f.read('rooms/ABC123/views/host/growGame').category);
});
test('late player receives complete session and URL role cannot grant hosting',async()=>{
 const f=fixture();await f.client('host');
 f.write('rooms/ABC123/players/late',{name:'Late',connected:true});f.notify(['rooms/ABC123/players']);await settle();
 assert.equal(f.read('rooms/ABC123/views/late').phase,'grow');
 const late=await f.client('late');assert.ok(late.calls.some(c=>c[0]==='restore'));
});
test('unknown identity is sent through join flow',async()=>{
 const f=fixture();const unknown=await f.client('stranger');assert.ok(unknown.calls.some(c=>c[0]==='redirect'&&c[1].includes('join=grow&code=ABC123')));
});
