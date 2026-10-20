export type OperationsSnapshot={
 available:boolean;checkedAt:string;counts:null|{queued:number;running:number;review:number;failed:number;legacy:number};
 readyCandidates:number|null;readyCapped:boolean;latestCompletedAt:string|null;
 state:'attention'|'review'|'running'|'ready'|'idle'|'unknown'
};
export function readOperationsSnapshot(client:any,options?:{now?:Date}):Promise<OperationsSnapshot>;
