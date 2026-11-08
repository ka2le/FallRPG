import {readFile,writeFile} from 'node:fs/promises';
import {ITEM_SPRITES} from '../src/item-sprites.js';
const sheets={};for(const sheet of new Set(Object.values(ITEM_SPRITES).map(s=>s.sheet))){const data=await readFile(new URL(`../public/assets/${sheet}.png`,import.meta.url));sheets[sheet]={file:`${sheet}.png`,width:data.readUInt32BE(16),height:data.readUInt32BE(20)};}
await writeFile(new URL('../public/assets/items-manifest.json',import.meta.url),JSON.stringify({grid:[8,8],format:'PNG with transparency',cellBounds:'Round each cell edge from column/row * sheet width/height / 8; retain native pixels.',sheets,sprites:ITEM_SPRITES},null,2)+'\n');
console.log(`Indexed ${Object.keys(ITEM_SPRITES).length} pixel item sprites.`);
