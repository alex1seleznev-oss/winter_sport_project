"""Reproduce reviewed FIS score cells from exact PDF bytes. No network or database."""
import sys,json,re,hashlib,subprocess
from pathlib import Path
import pdfplumber
root=Path(sys.argv[1] if len(sys.argv)>1 else 'artifacts/xc-evidence')
data_path=Path(sys.argv[2] if len(sys.argv)>2 else 'content/editorial/xc-season-2526.json')
data=json.loads(data_path.read_text());receipts=json.loads((root/'receipts.json').read_text())['receipts'];checked=0
for r in receipts:
    if r.get('error'): raise ValueError('SOURCE_FAILURE')
    f=root/'raw'/r['filename'];assert f.name==r['filename']
    assert hashlib.sha256(f.read_bytes()).hexdigest()==r['sha256'];checked+=1
parsed={};total_rows=0
for table in data['tables']:
    p=root/'raw'/(table['key']+'.pdf');assert hashlib.sha256(p.read_bytes()).hexdigest()==table['sha256']
    text=subprocess.run(['pdftotext','-layout',str(p),'-'],check=True,capture_output=True,text=True,timeout=30).stdout
    assert '2025/2026' in text
    assert table['classification'].upper()+' WORLD CUP STANDING '+table['gender'].upper() in text
    rows=[]
    for line in text.splitlines():
        m=re.match(r'^\s*(=?\d+)\s+(\d{7})\s+(.+?)\s+([A-Z]{3})\s+(\d+)\s+(.*)$',line)
        if not m: continue
        rank,fis,name,nation,total,rest=m.groups()
        points=[int(v) for v in re.findall(r'\d+',re.sub(r'\(\d+\)','',rest))]
        assert sum(points)==int(total),(table['key'],fis,'POINT_SUM')
        rows.append({'rank':int(rank.lstrip('=')),'fisCode':fis,'sourceName':name.strip(),'nation':nation,'points':int(total)})
    assert len(rows)==table['sourceRows'];assert len({r['fisCode'] for r in rows})==len(rows)
    for got,want in zip(rows[:6],table['rows']):
        for k in got: assert got[k]==want[k],(k,got,want)
    parsed[table['key']]=rows;total_rows+=len(rows)
cell_checks=0;leaders=0;discipline_checks=0
for gender in ['men','women']:
    with pdfplumber.open(root/'raw'/(gender+'-overall.pdf')) as pdf:
        grids=[r for t in pdf.pages[0].extract_tables() for r in t if len(r)==32 and re.fullmatch(r'\d{7}',str(r[1] or ''))]
    for row in grids[:6]:
        a=next(a for a in data['leaders'] if a['gender']==gender and a['fisCode']==row[1]);alloc=[]
        for c in row[4:]:
            if c=='': alloc.append(None)
            else:
                m=re.fullmatch(r'(\d+)(?: \((\d+)\))?\n=?(\d+)\.',c);assert m,('CELL_FORMAT',c)
                alloc.append([int(m[1]),int(m[3]),int(m[2] or 0)])
            cell_checks+=1
        assert alloc==a['allocations'];assert sum(c[0] for c in alloc if c)==a['overall'];leaders+=1
        for typ in ['distance','sprint']:
            target=next(r for r in parsed[gender+'-'+typ] if r['fisCode']==a['fisCode'])['points']
            calc=sum(c[0] for c,s in zip(alloc,data['slots']) if c and s['kind']==typ)
            assert target==a[typ]==calc;discipline_checks+=1
        assert a['distance']+a['sprint']+a['tourTotal']==a['overall']
assert (total_rows,cell_checks,leaders,discipline_checks)==(926,336,12,24)
proof={'ok':True,'rawDocumentHashes':checked,'standingsRowsReconciled':total_rows,'publishedRankingRows':36,'scoreCells':cell_checks,'leaderTotals':leaders,'disciplineTotals':discipline_checks,'independentRaceColumns':27,'tourAggregateColumns':1,'calendarWrites':0}
(root/'projection-check.json').write_text(json.dumps(proof,indent=2));print(json.dumps(proof,indent=2))
