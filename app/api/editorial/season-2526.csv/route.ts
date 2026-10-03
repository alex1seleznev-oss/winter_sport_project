import data from '../../../../content/editorial/full-season-2526.json';import {ledgerCsv} from '../../../../lib/season-ledger.mjs';
export const runtime='nodejs';export const dynamic='force-static';
export async function GET(){return new Response(ledgerCsv(data),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="wsh-biathlon-2025-26-six-athletes.csv"','Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}})}
