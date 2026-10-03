export type EditorialBlock={kind:'heading'|'paragraph';level?:number;id?:string;text:string};
export function bodyDigest(body:string):string;
export function sourceIds(body:string):string[];
export function inspectArticle(row:unknown,manifest:unknown,now?:number):boolean;
export function editorialBlocks(body:string):EditorialBlock[];
export function inlineParts(value:string):{kind:string;text?:string;id?:string}[];
export function editorialFilters(params?:Record<string,string|string[]|undefined>):{type:string;athlete:string};
export function filterArticles<T extends {articleType:string;athletes:string[]}>(items:T[],filters:{type:string;athlete:string}):T[];
export function officialEditorialUrl(value:string):string|null;
