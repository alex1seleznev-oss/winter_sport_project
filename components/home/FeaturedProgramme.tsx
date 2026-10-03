import {featureProgramme} from '../../lib/home-season.mjs';import type {StageModel} from '../../lib/stage-catalog.mjs';
export function FeaturedProgramme({summary}:{summary:StageModel['summary']}){return <p>{featureProgramme(summary)}{summary&&summary.total>0&&summary.timed===0?'. Точное время пока не установлено в базе.':''}</p>}
