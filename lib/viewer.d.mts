export type ViewerFilters={sport?:string;scope?:string;gender?:string;state?:string;when:string;q:string};
export function disciplineLabel(value:unknown):string;
export function raceLabel(race:{discipline:string;distance?:string|null}):string;
export function normalizeViewerFilters(params?:Record<string,string|string[]|undefined>):ViewerFilters;
export function filterViewerRaces<T extends {gender:string;status:string;discipline:string;location:string|null;distance?:string|null;series:string;country?:string|null}>(races:T[],filters:Partial<ViewerFilters>):T[];
export function coverage(races:{event_date:string|null;start_time_msk:string|null;status:string}[]):{total:number;dated:number;timed:number;cancelled:number;tentative:number};
export function calendarFeedPath(filters?:{sport?:string;scope?:string;gender?:string}):string;
export type ProgrammeRace={id?:number;competition_id?:number|null;event_date?:string|null;start_time_msk?:string|null;discipline:string};
export function compareProgrammeRaces(a:ProgrammeRace,b:ProgrammeRace):number;
