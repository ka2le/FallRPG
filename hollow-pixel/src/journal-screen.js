// Journal window: everything about the world in one place, on tabs.
// Quests (J), Map (M) and Creatures. The Character window (I / K) holds
// items, spells and stats; together these are the game's only two windows.
import { WIDTH, HEIGHT } from './world.js';
import { knownQuests } from './quests.js';
import { journalQuests } from './quest-journal.js';
import { gicon } from './ui-art.js';

export const JOURNAL_TABS=['quests','map','wildlife'];

export class JournalScreen{
  constructor(ui){this.ui=ui;}
  get game(){return this.ui.game;}
  get tab(){return this.ui.journalTab;}

  topBar(){
    const list=knownQuests(this.game),live=list.filter(q=>q.state!=='complete'),ready=live.some(q=>q.ready),offered=live.some(q=>q.state==='offered');
    const tab=(id,icon,name,key,extra='')=>`<button role="tab" data-journal-tab="${id}" aria-label="${name}" aria-selected="${this.tab===id}" class="${this.tab===id?'selected':''}">${gicon(icon)}<span>${name}</span>${extra}${key?`<kbd class="tab-key">${key}</kbd>`:''}</button>`;
    const pip=ready?'<i class="badge tab-mark ready" aria-hidden="true">?</i>':offered?'<i class="badge tab-mark" aria-hidden="true">!</i>':'';
    return `<div class="char-top journal-top">
      <nav class="char-tabs" role="tablist">${tab('quests','scroll','Quests','J',pip)}${tab('map','map','Map','M')}${tab('wildlife','sprout','Creatures','')}</nav>
      <div class="journal-count" aria-label="${live.length} open quests">${gicon('scroll')}<b>${live.length}</b><small>open quest${live.length===1?'':'s'}</small></div>
    </div>`;
  }
  render(){
    const body=this.tab==='map'?this.mapPanel():this.tab==='wildlife'?`<div class="journal-panel">${this.ui.fieldLog()}</div>`:`<div class="journal-panel">${journalQuests(this.ui)}</div>`;
    return this.topBar()+body;
  }
  mapPanel(){
    const w=960,h=Math.round(w*HEIGHT/WIDTH);
    return `<div class="map-panel"><div class="map-tools"><button data-map-zoom="out" aria-label="Zoom map out">−</button><button data-map-zoom="in" aria-label="Zoom map in">+</button><button data-map-zoom="quest" class="map-quest">★ Quest</button><button data-map-zoom="player">Find me</button><button data-map-zoom="overview">Whole world</button><small>Drag to pan when zoomed</small></div><div class="map-frame"><canvas id="atlas-canvas" width="${w}" height="${h}" aria-label="World map and player location"></canvas></div></div>`;
  }
  // Fit the map inside the fixed-height window without distorting it.
  fitMap(){
    const frame=document.querySelector('.map-frame'),canvas=document.getElementById('atlas-canvas');if(!frame||!canvas)return;
    const box=frame.getBoundingClientRect(),k=Math.min(box.width/canvas.width,box.height/canvas.height);
    if(k>0){canvas.style.width=`${Math.floor(canvas.width*k)}px`;canvas.style.height=`${Math.floor(canvas.height*k)}px`;}
  }
}
