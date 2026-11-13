import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { questList, trackedQuest, currentStep, questMarkers, highlight, compass } from '../src/quests.js';
import { shopStock } from '../src/shop-screen.js';
const strip=s=>s.replace(/<[^>]+>/g,'');

test('the first quest is marked on Rowan, then counts seedlings with a direction and a target',()=>{
  const g=new Game();let list=questList(g),q=trackedQuest(list);
  assert.equal(q.id,'herd');assert.equal(q.state,'offered');assert.equal(questMarkers(g,list).givers.get('rowan'),'!');
  assert.match(strip(currentStep(q).html),/Speak to Rowan in Willowmere/);
  g.questAction('herd');q=trackedQuest(questList(g));const step=currentStep(q);
  assert.match(strip(step.html),/Defeat 3 Briar Seedlings at The Paired Pasture, ↑north of Willowmere/);
  assert.match(step.html,/qh-num">3</);assert.match(step.html,/qh-mob">Briar Seedlings</);assert.deepEqual(step.count,[0,3]);
  assert.ok(step.target.y<g.player.y,'the pasture lies north');assert.equal(questMarkers(g).mobs.size,3);
  const herd=g.creatures.filter(c=>c.quest==='herd');g.hurt(herd[0],999);
  assert.deepEqual(currentStep(trackedQuest(questList(g))).count,[1,3]);assert.equal(questMarkers(g).mobs.size,2);
  for(const c of herd)g.hurt(c,999);q=trackedQuest(questList(g));
  assert.equal(q.ready,true);assert.match(strip(currentStep(q).html),/Return to Rowan/);assert.equal(questMarkers(g).givers.get('rowan'),'?');
  g.questAction('herd');list=questList(g);
  assert.equal(list.find(x=>x.id==='herd').state,'complete');assert.equal(questMarkers(g,list).givers.get('rowan'),'!','the Briar Road bounty is offered next');
});
test('bounties list every camp with its creatures, live counts and a final hand-in',()=>{
  const g=new Game();g.quests.herd='complete';g.refreshHunts();g.questAction('briar-road');
  const q=questList(g).find(x=>x.id==='briar-road'),camps=q.steps.filter(s=>s.camp);
  assert.equal(camps.length,3);assert.ok(camps[0].current);assert.match(strip(camps[2].html),/The Thorn Den elite: defeat 2 Rootknives \+ 1 Briar Seedling/);
  for(const c of g.creatures.filter(c=>c.camp===camps[0].camp))g.hurt(c,999);
  const next=questList(g).find(x=>x.id==='briar-road');assert.ok(next.steps[0].done);assert.ok(next.steps[1].current);
  assert.deepEqual(next.reward.items.slice(0,1),['briarcoat']);
});
test('text highlighting marks creatures, numbers, places, people and compass directions',()=>{
  const html=highlight('Southeast of Willowmere, Rowan saw three Rootknives and 2 Barkjaws.');
  for(const cls of ['qh-dir','qh-place','qh-who','qh-num','qh-mob'])assert.match(html,new RegExp(cls));
  assert.match(html,/↘<\/i>Southeast/);assert.equal(compass({x:0,y:0},{x:0,y:-500}),'north');assert.equal(compass({x:0,y:0},{x:400,y:400}),'south-east');assert.equal(compass({x:0,y:0},{x:10,y:10}),'');
});
test('the market lists purchasable gear, unowned first',()=>{
  const g=new Game(),stock=shopStock(g);assert.ok(stock.length>5);g.inventory.push(stock[0]);assert.equal(shopStock(g).at(-1),stock[0]);
});
