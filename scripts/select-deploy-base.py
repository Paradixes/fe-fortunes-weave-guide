"""Select a candidate deployment base; the receiver must verify it against live state."""
import json
import re
import sys

def select(payload, current_run):
    for run in payload.get('workflow_runs', []):
        sha = run.get('head_sha', '')
        if (run.get('id') != current_run and run.get('head_branch') == 'main'
                and run.get('status') == 'completed' and run.get('conclusion') == 'success'
                and isinstance(sha, str) and re.fullmatch(r'[0-9a-f]{40}', sha)):
            return sha
    return ''

if __name__ == '__main__':
    try:
        with open(sys.argv[1], encoding='utf-8') as source:
            print(select(json.load(source), int(sys.argv[2])))
    except (OSError, ValueError, KeyError, TypeError, IndexError, AttributeError):
        print('')
