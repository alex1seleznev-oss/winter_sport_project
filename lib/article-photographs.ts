import photographs from '../content/editorial/photographs.json';
import {athleteVisuals} from './athlete-visuals';

export const articlePhotographs = [
  ...photographs,
  ...athleteVisuals.map(p => ({...p, athlete:p.key, archival:true})),
];
export type ArticlePhotograph = typeof articlePhotographs[number];
export type ArticleIllustration = {beforeHeading:number; photo:ArticlePhotograph};
const pick = (key:string) => articlePhotographs.find(p => p.key === key);
const inline:Record<string,{beforeHeading:number;key:string}[]> = {
  'perrot-2025-26':[{beforeHeading:3,key:'perrot-135791872'}],
  'perrot-giacomel-37-points':[{beforeHeading:3,key:'giacomel-131423396'}],
  'accuracy-is-not-season':[{beforeHeading:3,key:'laegreid'}],
  'oslo-pursuit-2026':[{beforeHeading:3,key:'laegreid'}],
  'botn-laegreid-16-points':[{beforeHeading:5,key:'laegreid'}],
  'diggins-last-season':[{beforeHeading:4,key:'diggins-18439004'}],
  'oeberg-vittozzi-common-races':[{beforeHeading:4,key:'hanna-oeberg-128870981'}],
  'kontiolahti-2026-preview':[{beforeHeading:4,key:'perrot-147220215'},{beforeHeading:5,key:'laegreid'},{beforeHeading:6,key:'giacomel-131423396'}],
};
export function articleMedia(article:{slug:string;athletes:string[];articleType:string}){
  // A preview concerns the venue/programme, not a confirmed athlete entry list.
  const reviewedComparisonCover=article.slug==='botn-laegreid-16-points'?pick('laegreid'):null;
  const cover=reviewedComparisonCover||(article.articleType==='preview'?null:articlePhotographs.filter(p=>p.athlete===article.athletes[0]).sort((a,b)=>(b.capturedOn||'').localeCompare(a.capturedOn||''))[0]||null);
  const illustrations:ArticleIllustration[]=(inline[article.slug]||[]).flatMap(slot=>{
    const photo=pick(slot.key);
    return photo&&photo.key!==cover?.key&&article.athletes.includes(photo.athlete)?[{beforeHeading:slot.beforeHeading,photo}]:[];
  });
  return {cover,illustrations};
}
