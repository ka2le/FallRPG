// Species that have painted rigs. Anything not listed falls back to its emoji billboard.
import {seedling} from './seedling.js';
import {prowler} from './prowler.js';
import {spitter} from './spitter.js';
import {piper} from './piper.js';
import {stormbell} from './stormbell.js';
import {lanternwyrm} from './lanternwyrm.js';
import {abbess} from './abbess.js';
import {hoarscale} from './hoarscale.js';
import {dolmenstag} from './dolmenstag.js';
import {leviathan} from './leviathan.js';
import {ECO_PORTRAITS} from './ecological-portraits.js';
export const MONSTER_ART={seedling,prowler,spitter,swarm:piper,wisp:stormbell,ash:lanternwyrm,healer:abbess,ice:hoarscale,titan:dolmenstag,colossus:leviathan,...ECO_PORTRAITS};
