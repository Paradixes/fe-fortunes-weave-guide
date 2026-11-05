import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('select_base', Path(__file__).with_name('select-deploy-base.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
sha = 'a' * 40
runs = {'workflow_runs': [
 {'id': 10, 'head_branch': 'main', 'status': 'completed', 'conclusion': 'success', 'head_sha': 'b'*40},
 {'id': 9, 'head_branch': 'main', 'status': 'completed', 'conclusion': 'failure', 'head_sha': 'c'*40},
 {'id': 8, 'head_branch': 'other', 'status': 'completed', 'conclusion': 'success', 'head_sha': 'd'*40},
 {'id': 7, 'head_branch': 'main', 'status': 'completed', 'conclusion': 'success', 'head_sha': sha},
]}
assert m.select(runs, 10) == sha
assert m.select({'workflow_runs': []}, 10) == ''
assert m.select({'workflow_runs': [{'id': 1, 'head_branch':'main','status':'completed','conclusion':'success','head_sha':'../not-a-sha'}]}, 10) == ''
print('PASS deployment base selection: skip current, failures, other branches and invalid SHA.')
