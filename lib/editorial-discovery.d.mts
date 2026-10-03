import type {EditorialFilters} from './editorial-content.mjs';
export type DiscoveryOptions=EditorialFilters&{query:string;terms:string[];queryError:string|null;sort:string};
export const MAX_QUERY_LENGTH:number;export const searchSortLabels:Record<string,string>;
export function normalizeSearch(value:unknown):string;
export function discoveryOptions(params?:Record<string,string|string[]|undefined>):DiscoveryOptions;
export function searchScore(article:{title:string;dek:string;body?:string;athletes:string[]},terms:string[]):number|null;
export function discoverArticles<T extends {slug:string;title:string;dek:string;body?:string;athletes:string[];articleType:string;sport?:string;publishedAt:string;readMinutes:number}>(articles:T[],options:DiscoveryOptions):T[];
export function discoveryHref(options:DiscoveryOptions,patch?:Record<string,string>):string;
