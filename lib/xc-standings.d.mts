export type XcData={schemaVersion:number;sport:string;season:string;asOf:string;tables:{key:string;gender:string;classification:string;sourceId:string;sourceUrl:string;sourceRows:number;sha256:string;fetchedAt:string;rows:{rank:number;fisCode:string;name:string;points:number;nation:string}[]}[];slots:{column:number;date:string;venue:string;kind:string;label:string}[];leaders:{fisCode:string;name:string;gender:string;overall:number;distance:number;sprint:number;tourTotal:number;sourceId:string;allocations:(number[]|null)[]}[]};
export const xcClasses:Record<string,string>;export function fisDocument(value:string):string|null;
export function xcTable(data:XcData,gender:string,classification:string):XcData['tables'][number];
export function xcLeader(data:XcData,gender:string,fisCode:string):XcData['leaders'][number];
export function xcTotals(data:XcData,leader:XcData['leaders'][number]):{overall:number;distance:number;sprint:number;tourTotal:number;includedBonus:number};
export function validateXc(data:XcData):boolean;export function xcCsv(data:XcData):string;
