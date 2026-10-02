import type {Race,Competition} from './data';
export type SeasonAudit={season:string;groups:{sport:string;scope:string;stages:number;stagesWithRaces:number;stageOnly:number;races:number;withTime:number;cancelled:number;tentative:number}[];totals:{stages:number;races:number;withTime:number;structuralWarnings:number};issues:{code:string;eventId:number;relatedEventId?:number}[];scope:string};
export function auditSeason(races:Race[],competitions:Competition[]):SeasonAudit;
export function sourceRole(kind:string):'primary'|'context';
