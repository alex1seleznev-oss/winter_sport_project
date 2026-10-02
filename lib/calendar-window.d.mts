export const SEASON_START:string;export const SEASON_END:string;
export function shiftDate(date:string,days:number):string;
export function calendarWindow(value:unknown,now?:Date):{from:string;to:string;label:string};
export function competitionMatches(race:{competition_id:number|null;sport:string;scope:string;event_date:string|null},competition:{id:number;sport:string;scope:string;start_date:string;end_date:string}):boolean;
