import raw from '../content/guides.json';
export type Guide={slug:string;title:string;description:string;category:string;sport:string;publishedOn:string;reviewedOn:string;readMinutes:number;takeaway:string;sections:{id:string;heading:string;paragraphs:string[]}[];sources:{title:string;url:string;reference:string}[];related:string[]};
export const guides=raw as Guide[];
export function getGuide(slug:string){return guides.find(g=>g.slug===slug)||null}
export function guideForRace(sport:string,discipline:string){if(sport==='biathlon')return getGuide('biatlon-sprint-presledovanie-individualnaya');if(/sprint|спринт/i.test(discipline))return getGuide('lyzhnyy-sprint-kvalifikaciya-final');return getGuide('klassika-svobodnyy-stil-skiatlon')}
