/* Shared deck storage; room sessions take an immutable copy at start. */
window.GrowDecks = (() => {
const defaults = {
  Roots:[
    "What is something about your spiritual life right now that you don’t want to overlook while thinking about the future?",
    "If neither of you received a new assignment or privilege this year, what could still make it spiritually rich and satisfying?",
    "What growth can you see in yourself that didn’t require a new title or assignment?",
    "What spiritual quality have you watched grow in your spouse that you don’t want them to overlook?"
  ],
  Field:[
    "Is there someone you met in the ministry who has stayed in your mind? What was it about that person or conversation?",
    "Which part of the ministry has been bringing you the most genuine joy lately, and why?",
    "Without hours, placements, or measurable results, what would make a month in the ministry feel meaningful?",
    "What form of the ministry, territory, approach, or habit would be enjoyable for you to experience together?"
  ],
  Garden:[
    "Who among the friends has quietly made your spiritual life better lately, and what did they do?",
    "Who in the congregation would you simply enjoy getting to know better?",
    "What has the example of someone with limiting circumstances taught you about what Jehovah values?",
    "What do you currently contribute to the congregation as a couple, apart from any assignment?"
  ],
  Vine:[
    "What have you learned or been reminded about Jehovah recently that affected how you see him?",
    "What circumstances or activities tend to make you feel especially close to Jehovah?",
    "What spiritual quality would you like to become a more natural part of you?",
    "What would you like your spouse to include more often when praying for you or when you pray together?"
  ],
  Seasons:[
    "What spiritual hope do you have for someday, and what do you never want to lose while waiting?",
    "Choose one spiritual goal. What do you hope to give, experience, or become through it—and can part of that happen now?",
    "How can you keep working toward something you want without mentally living in the future?",
    "Name one hope for your spiritual future. What can you do, what belongs in Jehovah’s hands, and what would contentment look like now?"
  ]
};
const categories = ['Roots','Field','Garden','Vine','Seasons'];
const key='growWherePlanted.deckSets.v1', activeKey='growWherePlanted.activeSet.v1';
function active(){
 let sets; try { sets=JSON.parse(localStorage.getItem(key)); } catch {}
 const set=Array.isArray(sets)&&sets.length ? sets.find(s=>s.id===localStorage.getItem(activeKey))||sets[0] : {id:'married-couples',name:'Married Couples',audience:'Married Couples',decks:defaults};
 return JSON.parse(JSON.stringify(set));
}
function validate(set){return categories.every(c=>Array.isArray(set?.decks?.[c])&&set.decks[c].some(q=>typeof q==='string'&&q.trim()));}
return {active,validate,categories};
})();
