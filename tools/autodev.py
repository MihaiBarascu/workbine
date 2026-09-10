"""Bounded Workbine UI development. The model never receives a repository write token."""
from __future__ import annotations

import difflib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request

REPO = 'MihaiBarascu/workbine'
BRANCH = 'automation/workbine-continuation'
PROGRESS = 'docs/AUTODEV_PROGRESS.json'
ALLOWED = {
    'resources/js/components/copy-link-button.tsx',
    'resources/js/components/experience-form.tsx',
    'resources/js/components/public-shell.tsx',
    'resources/js/pages/topics/index.tsx',
    'resources/js/pages/topics/create.tsx',
    'resources/js/pages/topics/show.tsx',
    'resources/js/pages/experiences/index.tsx',
    'resources/css/workbine.css',
}
BLOCKED = re.compile(r'dangerouslySetInnerHTML|\beval\s*\(|new\s+Function|document\.cookie|\bfetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|https?://|["\']\s*//|child_process|javascript:', re.I)


def api(path: str, method: str = 'GET', data: dict | None = None, missing_ok: bool = False):
    token = os.environ.get('GH_TOKEN') or os.environ.get('GITHUB_TOKEN')
    if not token:
        raise RuntimeError('A scoped workflow token is required')
    request = urllib.request.Request(
        'https://api.github.com/repos/' + REPO + '/' + path,
        data=json.dumps(data).encode() if data is not None else None,
        headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json',
                 'User-Agent': 'Workbine-Development-Controller/1.0', 'Content-Type': 'application/json'},
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        if missing_ok and error.code == 404:
            return None
        raise RuntimeError(f'GitHub {method} {path}: HTTP {error.code}; ' + error.read().decode()[:500]) from None


def output(key: str, value: str) -> None:
    if '\n' in value or '\n' in key:
        raise ValueError('Workflow outputs must be single-line')
    with open(os.environ['GITHUB_OUTPUT'], 'a') as stream:
        stream.write(f'{key}={value}\n')


def note(message: str) -> None:
    print(message, flush=True)
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as stream:
        stream.write(message + '\n\n')


def git(*args: str) -> str:
    return subprocess.check_output(['git', *args], text=True).strip()


def verify_files(files: dict[str, str], originals: dict[str, str]) -> None:
    if not files or len(files) > 5 or not set(files).issubset(ALLOWED):
        raise ValueError('Only one small change to at most five approved public UI files is allowed')
    changed_lines = 0
    for name, content in files.items():
        if not isinstance(content, str) or '\x00' in content or len(content.encode()) > 90000:
            raise ValueError('Invalid or oversized text file: ' + name)
        before = originals[name]
        if before == content:
            raise ValueError('Unchanged file in proposal: ' + name)
        for line in difflib.ndiff(before.splitlines(), content.splitlines()):
            if line.startswith(('+ ', '- ')):
                changed_lines += 1
            if line.startswith('+ ') and BLOCKED.search(line[2:]):
                raise ValueError('New unsafe/external interaction requires human review: ' + name)
    if changed_lines > 320 or sum(len(x.encode()) for x in files.values()) > 180000:
        raise ValueError('Change exceeds the unattended scope')


def generate() -> None:
    base = api('git/ref/heads/main')['object']['sha']
    if git('rev-parse', 'HEAD') != base:
        raise RuntimeError('Main changed before the cycle began; retry next cycle')
    open_prs = api('pulls?state=open&per_page=100')
    if any(pr['head']['ref'] != BRANCH for pr in open_prs):
        note('A human development PR is open. No competing changes were generated.')
        output('ready', 'false')
        return
    branch = api('git/ref/heads/' + BRANCH, missing_ok=True)
    if branch:
        head = branch['object']['sha']
        comparison = api(f'compare/{base}...{head}')
        if comparison['ahead_by']:
            if comparison['behind_by']:
                raise RuntimeError('Pending branch diverged from main. Human reconciliation is required; no force push.')
            Path('/tmp/autodev-proposal.json').write_text(json.dumps({'mode': 'retry', 'main': base, 'head': head}))
            note('An existing development branch is pending. Reusing its checks/publication instead of consuming model credits or duplicating work.')
            output('ready', 'true')
            return
    tasks = json.loads(Path('docs/AUTODEV_TASKS.json').read_text())
    state = json.loads(Path(PROGRESS).read_text()) if Path(PROGRESS).exists() else {'completed': []}
    task = next((task for task in tasks if task['id'] not in state['completed']), None)
    if task is None:
        note('The approved unattended queue is complete. No invented work or repetitive redesign was created.')
        output('ready', 'false')
        return
    if not re.fullmatch(r'UI-[0-9]{3}', task['id']):
        raise ValueError('Invalid task ID')
    tracked = subprocess.check_output(['git', 'ls-files', '-z']).decode().split('\0')
    with tempfile.TemporaryDirectory(prefix='workbine-agent-') as folder:
        workspace = Path(folder)
        before: dict[str, bytes] = {}
        for name in filter(None, tracked):
            source = Path(name)
            if source.is_symlink():
                raise ValueError('Symlink in model snapshot: ' + name)
            before[name] = source.read_bytes()
            target = workspace / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(before[name])
        prompt = (
            'Implement exactly one small Workbine UI improvement in this copied workspace. '
            'First read README.md, AGENTS.md, docs/STATUS.md, docs/DESIGN.md and docs/BACKLOG.md. '
            'Do not run shell commands or access the network. Do not edit instructions, tests, workflows, '
            'dependencies, backend, authentication, secrets or database files. Do not create fake content, '
            'tracking, external requests, or redesign the established identity. Preserve visible labels used by tests. '
            'Only edit existing files from this allowlist: ' + ', '.join(sorted(ALLOWED)) + '. '
            'Task ' + task['id'] + ': ' + task['instruction'] + '. '
            'Actually edit the files, do not merely describe a patch. Keep the diff small. '
            'Do not claim tests ran: the separate trusted pipeline will run them. '
            'Finish with a brief explanation, not a ZIP or a download.'
        )
        command = [os.environ['COPILOT_BIN'], '-C', folder, '--model=auto', '--max-ai-credits=30',
                   '--no-custom-instructions', '--no-ask-user', '--no-auto-update', '--disable-builtin-mcps',
                   '--available-tools=view,edit,create,apply_patch,glob,grep', '--allow-tool=read',
                   '--allow-tool=write', '--deny-tool=shell', '--deny-tool=url', '-s', '-p', prompt]
        subprocess.run(command, check=True, timeout=360)
        after: dict[str, bytes] = {}
        for path in workspace.rglob('*'):
            if path.is_symlink():
                raise ValueError('Model created a symlink')
            if path.is_file():
                after[path.relative_to(workspace).as_posix()] = path.read_bytes()
        if set(before) != set(after):
            raise ValueError('Unattended cycles cannot add or delete files')
        files = {name: value.decode() for name, value in after.items() if value != before[name]}
        originals = {name: before[name].decode() for name in files}
        verify_files(files, originals)
        for name, content in files.items():
            Path(name).write_text(content)
    Path('/tmp/autodev-proposal.json').write_text(json.dumps({'mode': 'change', 'main': base, 'task': task['id'], 'files': files}))
    note('Generated bounded proposal for ' + task['id'] + '. Not merged or deployed.')
    output('ready', 'true')


def package() -> None:
    path = Path('/tmp/autodev-proposal.json')
    proposal = json.loads(path.read_text())
    if proposal['mode'] == 'change':
        changed = git('diff', '--name-only').splitlines()
        files = {name: Path(name).read_text() for name in changed}
        originals = {name: subprocess.check_output(['git', 'show', f'HEAD:{name}']).decode() for name in files}
        verify_files(files, originals)
        proposal['files'] = files
        path.write_text(json.dumps(proposal))


def publish() -> None:
    proposal = json.loads(Path('/tmp/proposal/autodev-proposal.json').read_text())
    base = proposal['main']
    if api('git/ref/heads/main')['object']['sha'] != base:
        raise RuntimeError('Main advanced. Refusing to overwrite or publish a stale proposal.')
    branch = api('git/ref/heads/' + BRANCH, missing_ok=True)
    if proposal['mode'] == 'retry':
        if not branch or branch['object']['sha'] != proposal['head']:
            raise RuntimeError('Pending branch changed')
        output('head', proposal['head'])
        output('main', base)
        return
    if branch and api(f"compare/{base}...{branch['object']['sha']}")['ahead_by']:
        raise RuntimeError('Another unmerged development cycle exists')
    if git('rev-parse', 'HEAD') != base:
        raise RuntimeError('Publisher checkout is not the approved base')
    files = proposal['files']
    originals = {name: subprocess.check_output(['git', 'show', f'{base}:{name}']).decode() for name in files}
    verify_files(files, originals)
    tasks = json.loads(Path('docs/AUTODEV_TASKS.json').read_text())
    state = json.loads(Path(PROGRESS).read_text()) if Path(PROGRESS).exists() else {'completed': []}
    expected = next(task['id'] for task in tasks if task['id'] not in state['completed'])
    if proposal['task'] != expected:
        raise RuntimeError('Task ordering changed')
    state['completed'].append(expected)
    state['last_task'] = expected
    state['last_run'] = os.environ['GITHUB_RUN_ID']
    entries = [{'path': name, 'mode': '100644', 'type': 'blob', 'content': value} for name, value in files.items()]
    entries.append({'path': PROGRESS, 'mode': '100644', 'type': 'blob', 'content': json.dumps(state, indent=2) + '\n'})
    tree = api('git/trees', 'POST', {'base_tree': api('git/commits/' + base)['tree']['sha'], 'tree': entries})
    commit = api('git/commits', 'POST', {'message': 'feat: improve Workbine public experience (' + expected + ')', 'tree': tree['sha'], 'parents': [base]})
    if branch:
        api('git/refs/heads/' + BRANCH, 'PATCH', {'sha': commit['sha'], 'force': False})
    else:
        api('git/refs', 'POST', {'ref': 'refs/heads/' + BRANCH, 'sha': commit['sha']})
    output('head', commit['sha'])
    output('main', base)
    note('Published a feature branch only. Full CI and browser checks are still required.')


def release() -> None:
    head, base = os.environ['APPROVED_HEAD'], os.environ['APPROVED_MAIN']
    if api('git/ref/heads/main')['object']['sha'] != base or api('git/ref/heads/' + BRANCH)['object']['sha'] != head:
        raise RuntimeError('A release ref moved after validation')
    comparison = api(f'compare/{base}...{head}')
    if comparison['behind_by'] or not comparison['ahead_by']:
        raise RuntimeError('Unexpected comparison at release')
    paths = {entry['filename'] for entry in comparison['files']}
    if not paths.issubset(ALLOWED | {PROGRESS}) or len(paths) > 6:
        raise RuntimeError('The final release diff is outside the approved scope')
    prs = api('pulls?state=open&head=MihaiBarascu:' + BRANCH)
    if prs:
        pr = prs[0]
    else:
        pr = api('pulls', 'POST', {
            'head': BRANCH, 'base': 'main', 'title': 'Improve the Workbine community experience',
            'body': 'One bounded automated UI increment. Full SQLite/PostgreSQL CI and Chromium contribution checks passed in run ' + os.environ['GITHUB_SERVER_URL'] + '/' + REPO + '/actions/runs/' + os.environ['GITHUB_RUN_ID'] + '. No authentication, backend, workflow, dependency or production-data changes. Generated in a read-only-token workspace; published by a separate deterministic job. Progress entries are proposed until this PR is merged.',
        })
    note('Validated PR #' + str(pr['number']) + ' is available.')
    if os.environ.get('AUTO_MERGE', 'false') != 'true' or 'resources/css/workbine.css' in paths:
        note('Human review is required by configuration or by a stylesheet change. No automatic merge.')
        return
    if pr.get('draft'):
        raise RuntimeError('Draft status is a human stop signal; not merging')
    merged = api(f"pulls/{pr['number']}/merge", 'PUT', {'sha': head, 'merge_method': 'merge'})
    if not merged.get('merged'):
        raise RuntimeError('GitHub did not allow the merge; required protections remain in force')
    note('Merged validated UI increment. Deployment must be verified separately.')
    for workflow in ['ci.yml', 'production-smoke.yml']:
        api('actions/workflows/' + workflow + '/dispatches', 'POST', {'ref': 'main'})


if __name__ == '__main__':
    actions = {'generate': generate, 'package': package, 'publish': publish, 'release': release}
    if len(sys.argv) != 2 or sys.argv[1] not in actions:
        raise SystemExit('Usage: autodev.py generate|package|publish|release')
    actions[sys.argv[1]]()
