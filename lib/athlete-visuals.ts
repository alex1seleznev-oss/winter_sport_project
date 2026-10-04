import photos from '../content/visual/athletes.json';import assets from '../content/visual/assets.json';
export const athleteVisuals=photos.map(p=>{const a=assets.find(a=>a.key===p.key);if(!a||a.sourceSha256!==p.sourceSha256)throw new Error('PHOTO_VERSION_MISMATCH');return {...p,variants:a.variants}});
export type AthleteVisual=typeof athleteVisuals[number];
export const visualCopy:Record<string,string>={laegreid:'За точностью на рубеже — целая история сезона.',klaebo:'Гонка начинается задолго до последнего ускорения.',korostelev:'Российские имена. Большая лыжная история.',bjoerndalen:'Эпохи меняются. История гонок остаётся.',latypov:'Биатлон России. Лица, ради которых мы смотрим.'};
export function editorialAthleteVisual(athletes:string[]|undefined){if(!Array.isArray(athletes)||!athletes.length)return null;const first=athleteVisuals.find(v=>v.key===athletes[0]);return first||null}
