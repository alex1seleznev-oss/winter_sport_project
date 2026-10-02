import type {Race} from './data';
export function escapeIcsText(value:unknown):string;
export function foldIcsLine(value:string):string;
export function parseFeedFilters(params:URLSearchParams):{sport?:string;scope?:string;gender?:string;event?:number;competition?:number};
export function buildCalendarFeed(races:Race[],options?:{siteOrigin?:string|null}):{body:string;etag:string;count:number};
