import data from '../../../../content/editorial/xc-season-2526.json';import {xcCsv} from '../../../../lib/xc-standings.mjs';
export const runtime='nodejs';export const dynamic='force-static';
export async function GET(){return new Response(xcCsv(data),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="wsh-cross-country-2025-26-score-cells.csv"','Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}})}
