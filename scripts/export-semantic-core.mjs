import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const core=JSON.parse(readFileSync(new URL('../config/seo-clusters.json',import.meta.url),'utf8'));
const escape=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const rows=[['cluster','intent','query','target','readiness','monthly_volume','volume_source']];
for(const cluster of core.clusters)for(const query of cluster.queries)rows.push([cluster.id,cluster.intent,query,cluster.target,cluster.state,'','not_measured']);
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/semantic-core.csv','\ufeff'+rows.map(row=>row.map(escape).join(',')).join('\r\n'));
console.log(`${core.clusters.length} clusters, ${rows.length-1} candidate queries; volume not measured.`);
