export type StageHighlight={competitionKey:string;sport:'biathlon';season:'2025/26';title:string;youtubeId:string;publisher:string;publishedOn:string;eventYear:number;sourceUrl:string};
export function verifiedStageHighlight(entry:unknown):StageHighlight|null;
export function highlightForStage(competitionKey:string,sport:string):StageHighlight|null;
export const reviewedStageHighlights:ReadonlyArray<StageHighlight>;
