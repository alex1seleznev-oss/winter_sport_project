"""Read only a previous artifact of this same trusted workflow. No source-site credentials."""
import io,json,os,pathlib,re,subprocess,zipfile
ROOT=pathlib.Path('artifacts/previous-media-watch');ROOT.mkdir(parents=True,exist_ok=True)
REPO='alex1seleznev-oss/winter_sport_project'
def api(path):
    return subprocess.run(['gh','api',path],check=True,capture_output=True,timeout=20).stdout
try:
    ref=os.environ.get('GITHUB_REF_NAME','')
    if ref not in ('main','automation/public-media-watch'): raise ValueError('Unsupported branch')
    current=int(os.environ['GITHUB_RUN_ID'])
    listing=json.loads(api(f'repos/{REPO}/actions/workflows/public-media-watch.yml/runs?branch={ref}&per_page=10&status=completed'))
    saved=False
    for run in listing.get('workflow_runs',[]):
        if run['id']==current or run.get('event') not in ('push','schedule','workflow_dispatch') or run.get('head_repository',{}).get('full_name')!=REPO: continue
        artifacts=json.loads(api(f'repos/{REPO}/actions/runs/{run["id"]}/artifacts')).get('artifacts',[])
        artifact=next((a for a in artifacts if a.get('name')=='public-media-review' and not a.get('expired') and a.get('size_in_bytes',0)<2_000_000),None)
        if not artifact: continue
        blob=api(f'repos/{REPO}/actions/artifacts/{int(artifact["id"])}/zip')
        if len(blob)>2_000_000: raise ValueError('Oversized artifact')
        with zipfile.ZipFile(io.BytesIO(blob)) as archive:
            names=[i for i in archive.infolist() if i.filename=='packet.json']
            if len(names)!=1 or names[0].file_size>3_000_000: raise ValueError('Invalid artifact member')
            packet=json.loads(archive.read(names[0]))
        if packet.get('schemaVersion')!=2 or not isinstance(packet.get('items'),list) or len(packet['items'])>500: raise ValueError('Packet contract')
        if not isinstance(packet.get('sources'),list) or len(packet['sources'])>20: raise ValueError('Source contract')
        if any(not isinstance(i,dict) or not isinstance(i.get('url'),str) or not isinstance(i.get('sourceKey'),str) or not re.fullmatch('[a-f0-9]{64}',i.get('revision','')) for i in packet['items']): raise ValueError('Record contract')
        (ROOT/'packet.json').write_text(json.dumps(packet,ensure_ascii=False),encoding='utf-8')
        (ROOT/'receipt.json').write_text(json.dumps({'runId':run['id'],'artifactId':artifact['id'],'mode':'previous_completed_run_in_same_branch'}))
        print(json.dumps({'previousRun':run['id'],'baselineDownloaded':True}));saved=True;break
    if not saved: print(json.dumps({'baselineDownloaded':False,'reason':'no_valid_unexpired_artifact'}))
except (KeyError,ValueError,OSError,subprocess.SubprocessError,zipfile.BadZipFile) as error:
    print(json.dumps({'baselineDownloaded':False,'reason':type(error).__name__}))
