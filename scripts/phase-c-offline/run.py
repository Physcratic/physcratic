"""Offline-only Phase C runner. Python stdlib, existing dependencies/PG binaries.
No dotenv, credentials, remote target, browser or deployment commands. SQL is
applied only by existing main test fixtures to this runner's fresh loopback cluster.
"""
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
OUT = ROOT / 'build' / 'phase-c-offline'
BASELINE = 'c426aaf31f53328d2123e7b419920dd9a3d6fe23'
SAFE_ENV = {'PATH','SYSTEMROOT','WINDIR','COMSPEC','PATHEXT','TEMP','TMP',
            'USERPROFILE','LOCALAPPDATA','APPDATA','PROGRAMFILES','PROGRAMFILES(X86)',
            'COMMONPROGRAMFILES','NUMBER_OF_PROCESSORS','PROCESSOR_ARCHITECTURE'}
SELECTED = ['terms', 'verification-email', 'authoring-staging',
            'authored-numeric-grading', 'authored-symbolic-grading',
            'author-media-storage', 'submission-security', 'submission-request']

def clean_env(source):
    # Allowlist instead of an incomplete denylist. No inherited DATABASE_URL,
    # PG*, POSTGRES*, provider credentials, proxy, NODE_OPTIONS or test URL.
    env = {k:v for k,v in source.items() if k.upper() in SAFE_ENV}
    env.update({'NODE_ENV':'production','NEXT_TELEMETRY_DISABLED':'1','CI':'true',
                'NO_COLOR':'1','PGPASSFILE':str(OUT/'no-pgpass'),
                'NODE_OPTIONS':'--require='+json.dumps((HERE/'network-guard.cjs').as_posix()) if ' ' in str(HERE) else
                               '--require='+(HERE/'network-guard.cjs').as_posix()})
    return env

def local_url(value, port):
    try:
        u=urlsplit(value)
        if (u.scheme != 'postgresql' or u.hostname != '127.0.0.1' or u.port != port
            or u.path != '/physcratic_authoring_test' or u.query or u.fragment
            or u.username != 'postgres' or u.password is not None):
            raise ValueError()
    except (ValueError,TypeError):
        raise ValueError('Only the generated disposable loopback database is permitted') from None
    return value

class SafetyTests(unittest.TestCase):
    def test_scrub_all_inherited_credentials(self):
        dirty={'PATH':'path','DATABASE_URL':'remote','PGHOST':'remote',
               'PGSERVICE':'x','PGSERVICEFILE':'x','PGPASSWORD':'x','POSTGRES_URL':'x',
               'AUTH_TEST_DATABASE_URL':'x','AUTHORING_TEST_DATABASE_URL':'x',
               'RESEND_API_KEY':'x','BLOB_READ_WRITE_TOKEN':'x','BETTER_AUTH_SECRET':'x',
               'RECAPTCHA_SECRET_KEY':'x','VERCEL_OIDC_TOKEN':'x','NODE_OPTIONS':'x',
               'HTTP_PROXY':'x','NEON_API_KEY':'x','NEXT_PUBLIC_FAKE':'x',
               'PHASE_C_LOCAL_PORT':'5432','PGUNKNOWN':'x','POSTGRES_UNKNOWN':'x'}
        result=clean_env(dirty)
        self.assertEqual(result['PATH'],'path')
        for key in dirty.keys()-{'PATH','NODE_OPTIONS'}: self.assertNotIn(key,result)
        self.assertIn('network-guard.cjs',result['NODE_OPTIONS'])
    def test_reject_remote_ambiguous_or_redirecting_database_urls(self):
        good='postgresql://postgres@127.0.0.1:55431/physcratic_authoring_test'
        self.assertEqual(local_url(good,55431),good)
        for value in [good.replace('127.0.0.1','localhost'),good.replace('127.0.0.1','example.invalid'),
                      good.replace('55431','5432'),good+'?host=example.invalid',good+'#x',
                      good.replace('postgres@','postgres:password@'),good.replace('_test',''),
                      good.replace('postgresql:','https:'),good.replace('127.0.0.1','127.0.0.1.example.invalid')]:
            with self.assertRaises(ValueError): local_url(value,55431)

class Runner:
    def __init__(self):
        OUT.mkdir(parents=True,exist_ok=True)
        self.env=clean_env(os.environ)
        self.node=shutil.which('node',path=self.env.get('PATH'))
        if not self.node: raise RuntimeError('BLOCKED: Node unavailable')
        # Never import local environment or reuse another checkout's dependencies.
        if any(ROOT.glob('.env*')) or (ROOT/'.vercel').exists() or Path(self.env['PGPASSFILE']).exists():
            raise RuntimeError('BLOCKED: local environment/config files present; inspect without loading')
        self.results=[]
        self.path=OUT/'results.json'
        self.cli={name:ROOT/'node_modules'/path for name,path in {
          'tsx':'tsx/dist/cli.mjs','eslint':'eslint/bin/eslint.js',
          'tsc':'typescript/bin/tsc','next':'next/dist/bin/next'}.items()}
    def save(self):
        self.path.write_text(json.dumps({'baseline':BASELINE,'scope':'OFFLINE ONLY',
          'runtime_requests':0,'live_acceptance':'NOT TESTED','results':self.results},indent=2)+'\n')
    def run(self,name,args,env=None,timeout=240):
        active=env or self.env
        start=time.monotonic()
        log_name=name+'-'+str(len(self.results)+1)+'.log'
        log_path=OUT/log_name
        try:
            # A server grandchild can retain PIPE handles on Windows. A file
            # keeps wait/timeout bounded without waiting for inherited stdout.
            with log_path.open('w',encoding='utf8') as stream:
                r=subprocess.Popen([str(a) for a in args],cwd=ROOT,env=active,
                                   stdout=stream,stderr=subprocess.STDOUT)
                try:
                    r.wait(timeout=timeout)
                except (subprocess.TimeoutExpired, KeyboardInterrupt):
                    if os.name == 'nt':
                        subprocess.run([str(Path(os.environ['SYSTEMROOT'])/'System32/taskkill.exe'),
                          '/PID',str(r.pid),'/T','/F'],stdout=stream,stderr=subprocess.STDOUT,timeout=30)
                    else:
                        r.kill()
                    r.wait(timeout=30)
                    raise
            code=r.returncode; output=log_path.read_text(encoding='utf8',errors='replace')
        except subprocess.TimeoutExpired:
            code=124
            output=log_path.read_text(encoding='utf8',errors='replace')+'\nBLOCKED: bounded command timeout; inspect child lifecycle before retry.\n'
            log_path.write_text(output,encoding='utf8')
        counts={key:int(matches[-1]) for key in ['tests','pass','fail','skipped','todo']
                if (matches:=re.findall(r'^# '+key+r' (\d+)',output,re.M))}
        row={'baseline':BASELINE,'name':name,'command':[str(a) for a in args], 'exit_code':code,'seconds':round(time.monotonic()-start,2),
             'counts':counts,'log':str(Path('build/phase-c-offline')/log_name)}
        self.results.append(row); self.save(); print(json.dumps(row),flush=True)
        return code
    def node_test(self,name,files,env=None):
        return self.run(name,[self.node,'--require',ROOT/'tests/server-only-register.cjs',
          '--import','tsx','--test','--test-reporter=tap',*files],env=env,timeout=600)
    def install(self):
        cache=Path(self.env['LOCALAPPDATA'])/'npm-cache/_npx'
        candidates=list(cache.glob('*/node_modules/pnpm/bin/pnpm.cjs'))
        for cli in candidates:
            if json.loads((cli.parent.parent/'package.json').read_text())['version']!='10.34.9': continue
            r=subprocess.run([self.node,str(cli),'--version'],cwd=ROOT,env=self.env,
                             capture_output=True,text=True,timeout=30)
            if r.returncode==0 and r.stdout.strip()=='10.34.9':
                return self.run('install-frozen-offline',[self.node,cli,'install','--offline',
                  '--frozen-lockfile','--ignore-scripts'],timeout=600)
        raise RuntimeError('BLOCKED: exact cached pnpm 10.34.9 unavailable; no download authorized')
    def safety(self):
        return (self.run('runner-safety',[sys.executable,'-B',__file__,'self-test'])==0
                and self.run('transport-safety',[self.node,'--test','--test-reporter=tap',HERE/'safety.test.mjs'])==0)
    def pure(self):
        if not self.safety(): return
        self.node_test('selected-offline',['lib/'+name+'.test.ts' for name in SELECTED])
    def pg(self,test_file=None):
        if not self.safety(): return
        pg=Path(self.env.get('PROGRAMFILES',r'C:\Program Files'))/'PostgreSQL/18/bin'
        if not all((pg/(name+'.exe')).is_file() for name in ['initdb','pg_ctl','createdb']):
            raise RuntimeError('BLOCKED: existing PostgreSQL binaries unavailable; no installation')
        # Own fresh cluster only; never start/stop a Windows service or a shared DB.
        cluster=Path(tempfile.mkdtemp(prefix='pg-',dir=OUT)).resolve()
        assert cluster.parent==OUT.resolve() and cluster.name.startswith('pg-')
        with socket.socket() as sock:
            sock.bind(('127.0.0.1',0)); port=sock.getsockname()[1]
        url=local_url(f'postgresql://postgres@127.0.0.1:{port}/physcratic_authoring_test',port)
        env=self.env|{'PHASE_C_LOCAL_PORT':str(port)}
        started=False
        try:
            if self.run('pg-init',[pg/'initdb.exe','-D',cluster/'data','-U','postgres',
                       '-A','trust','--no-locale','--encoding=UTF8'],env): return
            if self.run('pg-start',[pg/'pg_ctl.exe','-D',cluster/'data','-l',cluster/'server.log',
                       '-o',f'-h 127.0.0.1 -p {port}','-w','-t','30','start'],env): return
            started=True
            if self.run('pg-create',[pg/'createdb.exe','-h','127.0.0.1','-p',port,'-U','postgres',
                       'physcratic_authoring_test'],env): return
            env|={'AUTH_TEST_DATABASE_URL':url,'AUTHORING_TEST_DATABASE_URL':url,
                   'AUTHORING_TEST_EXPECTED_VERSION':'18.6'}
            files=[str(p.relative_to(ROOT)) for p in sorted((ROOT/'lib').glob('*.test.ts'))
                   if 'AUTHORING_TEST_DATABASE_URL' in p.read_text(encoding='utf8')
                   and (test_file is None or p.name==test_file)]
            self.node_test('postgres-current-main',files,env)
        finally:
            if started or (cluster/'data/postmaster.pid').exists():
                stopped=self.run('pg-stop',[pg/'pg_ctl.exe','-D',cluster/'data',
                                    '-m','fast','-w','-t','30','stop'],env)==0
                if not stopped: raise RuntimeError('BLOCKED: owned local cluster did not stop; retained for recovery')
            # Cluster data contains synthetic fixtures only. Remove own exact directory.
            if cluster.parent==OUT.resolve() and cluster.name.startswith('pg-'): shutil.rmtree(cluster)
    def check(self,mode):
        if not self.safety(): return
        if mode in ('lint','lint-ci'):
            if self.run('eslint-config-scope',[self.node,'--test','--test-reporter=tap',HERE/'eslint-config.test.mjs']): return
            self.run(mode,[self.node,self.cli['eslint'],'.',*(['--max-warnings=0'] if mode=='lint-ci' else [])])
        if mode=='types':
            if self.run('next-typegen',[self.node,self.cli['next'],'typegen'])==0:
                self.run('typescript',[self.node,self.cli['tsc'],'--noEmit','--incremental','false'])
        if mode=='build': self.run('build',[self.node,self.cli['next'],'build'],
          env=self.env|{'BETTER_AUTH_SECRET':'offline-build-fixture-secret-00000000000000000000',
                        'BETTER_AUTH_URL':'http://localhost:3000'},timeout=600)
        if mode in ('suite','app-suite'):
            files=[str(p.relative_to(ROOT)) for p in sorted((ROOT/'lib').glob('*.test.ts'))
                   if mode!='app-suite' or p.name not in ('deploy-watch.test.ts','smoke-workflow.test.ts')]
            self.node_test('server-'+mode,files)
            self.run('ui-suite',[self.node,'--import','tsx','--test','--test-reporter=tap',
               *[str(p.relative_to(ROOT)) for p in sorted((ROOT/'tests').glob('*.test.ts'))]],timeout=600)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('mode',choices=['self-test','safety','install','pure','pg','lint','lint-ci','types','build','suite','app-suite'])
    parser.add_argument('--pg-test',choices=[p.name for p in (ROOT/'lib').glob('*.test.ts')
                        if 'AUTHORING_TEST_DATABASE_URL' in p.read_text(encoding='utf8')])
    options=parser.parse_args();mode=options.mode
    if options.pg_test and mode!='pg': parser.error('--pg-test requires pg mode')
    if mode=='self-test':
        result=unittest.TextTestRunner().run(unittest.defaultTestLoader.loadTestsFromTestCase(SafetyTests))
        return int(not result.wasSuccessful())
    runner=Runner()
    # Preserve previous bounded command results; repeated names are separate runs.
    if runner.path.exists(): runner.results=json.loads(runner.path.read_text())['results']
    start_index=len(runner.results)
    if mode=='safety':
        if runner.safety(): runner.run('eslint-config-scope',[runner.node,'--test','--test-reporter=tap',HERE/'eslint-config.test.mjs'])
    elif mode=='install': runner.install()
    elif mode=='pure': runner.pure()
    elif mode=='pg': runner.pg(options.pg_test)
    else: runner.check(mode)
    return int(any(row['exit_code']!=0 for row in runner.results[start_index:]))
if __name__=='__main__':
    try: sys.exit(main())
    except (RuntimeError,ValueError) as exc:
        print(str(exc),file=sys.stderr);sys.exit(2)
