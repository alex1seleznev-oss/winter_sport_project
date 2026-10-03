import type {StageModel} from './stage-catalog.mjs';import type {Race} from './data';
export function homeSeason(models:StageModel[],today:string):{stage:StageModel|null;stages:StageModel[];weekCount:number;races:Race[];showsLater:boolean;totalRaces:number;totalStages:number;timedRaces:number};
