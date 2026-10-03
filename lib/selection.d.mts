import type {StageModel} from './stage-catalog.mjs';import type {Race} from './data';
export type Selection={version:1;season:string;stages:number[];races:number[]};
export const SELECTION_KEY:string;export const SELECTION_SEASON:string;export const MAX_STAGES:number;export const MAX_RACES:number;
export function emptySelection():Selection;
export function validId(id:unknown):boolean;
export function decodeSelection(raw:unknown):{selection:Selection;error:string|null};
export function toggleSelection(selection:Selection,kind:'stage'|'race',id:number):Selection;
export function projectSelection(selection:Selection,models:StageModel[]):{stages:StageModel[];races:Race[];missingStages:number[];missingRaces:number[]};
export function parseSelectionExport(value:unknown):number[];
