export type PublicChange={id:number;eventId:number;action:string;field:string;detectedAt:string;title:string;eventDate:string|null;gender:string;sport:string;before:string|null;after:string|null;sourceUrl:string;sourceIsHistorical:boolean;titleFromSnapshot:boolean};
export function publicChange(row:unknown):PublicChange|null;
