const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const index=fs.readFileSync('index.html','utf8');
test('rules follow each selected game',()=>{
 const fn=index.slice(index.indexOf('    function showSelectedGameRules()'),index.indexOf("    ui.rulesBtn.addEventListener('click', showSelectedGameRules)"));
 for(const [mode,title] of [['grow','Grow Where'],['coop','Principles'],['pvp','Problem?']]){
  const ui={rulesTitle:{},rulesNote:{},selectedGameRules:{replaceChildren(...items){this.items=items;}},rulesDialog:{showModal(){}}};
  vm.runInNewContext(fn+';showSelectedGameRules();',{state:null,lobbySelectedMode:mode,inviteMode:null,ui,document:{createElement:()=>({})}});
  assert.ok(ui.rulesTitle.textContent.includes(title));
  if(mode==='grow')assert.ok(!ui.selectedGameRules.items.some(i=>i.textContent.includes('Solution Card')));
 }
});
test('Grow manage decks occupies its own row after room choices',()=>{
 const start=index.indexOf('id="multiplayerLobbyPanel"');const end=index.indexOf('id="manageDecksLobbyBtn"',start);
 const panel=index.slice(start,end);
 assert.ok(panel.indexOf('id="manageGrowDecksLobbyBtn"')>panel.indexOf('id="rulesBtn"'));
 assert.match(panel,/style="display:block;text-align:center;text-decoration:none"/);
});
test('selecting a Grow set survives reopening and is used by the game',()=>{
 const storage=new Map();const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 const script=fs.readFileSync('grow-decks.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
 function open(){
  const elements={};
  function element(id){return elements[id]??={value:'',options:[{value:'Custom'},{value:'Families'},{value:'Friends'},{value:'Married Couples'}],children:[],querySelectorAll:()=>[],replaceChildren(){this.children=[]},append(){this.children.push({})},set innerHTML(html){this.html=html;if(id==='setSelect')this.value=(html.match(/value="([^"]+)"/)||[])[1]||''},get innerHTML(){return this.html}};}
  vm.runInNewContext(script,{localStorage,document:{getElementById:element,createElement:()=>element(Math.random())},URLSearchParams,location:{search:''}});
  return elements;
 }
 const first=open();first.setSelect.value='starter-friends';first.setSelect.onchange();
 assert.equal(storage.get('growWherePlanted.activeSet.v1'),'starter-friends');
 const second=open();assert.equal(second.setSelect.value,'starter-friends');
 const context={window:{},localStorage};vm.runInNewContext(fs.readFileSync('grow-decks-store.js','utf8'),context);
 assert.equal(context.window.GrowDecks.active().id,'starter-friends');
 assert.equal(second.backLink.href,'./?game=grow');
});
