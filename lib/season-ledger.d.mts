export type Ledger={schemaVersion:number;season:string;cupId:string;athletes:{key:string;name:string;ibuId:string;finalPoints:number}[];races:{raceId:string;date:string;venue:string;discipline:string;shootings:number;results:((string|number)[]|null)[];documentSha256:string;fetchedAt:string;sourceRows:number}[]};
export type LedgerRow={index:number;raceId:string;date:string;venue:string;discipline:string;left:(number|string)[]|null;right:(number|string)[]|null;leftTotal:number;rightTotal:number;gap:number};
export const phaseLabel:Record<string,string>;export const disciplineLabel:Record<string,string>;export const venueLabel:Record<string,string>;
export function validateLedger(data:Ledger):boolean;
export function sourceUrl(raceId:string):string;
export function phaseRaces(data:Ledger,phase?:string):Ledger['races'];
export function athleteStats(data:Ledger,key:string,phase?:string):{key:string;points:number;finishes:number;notListed:number;wins:number;podiums:number;top5:number;top10:number;podiumPoints:number;otherPoints:number;medianRank:number|null;meanPoints:number|null};
export function comparison(data:Ledger,left:string,right:string):LedgerRow[];
export function ledgerCsv(data:Ledger):string;
