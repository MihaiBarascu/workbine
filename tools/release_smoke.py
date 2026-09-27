"""Read-only release checks for a deployed Workbine environment.

Confirms health, the served revision, the production frontend build, SSR, the
sitemap, PHP header hardening and a sample of public pages. It never creates
accounts, content or uploads.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from xml.etree import ElementTree

from inertia_page import parse_page

USER_AGENT = 'Workbine-Deployment-Smoke/3.0'
REVISION_HEADER = 'x-workbine-revision'


class AppRootParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.app_depth = 0
        self.found_app = False
        self.has_rendered_content = False

    def handle_starttag(self, tag, attrs):
        if self.app_depth:
            self.app_depth += 1
            self.has_rendered_content = True
            return

        if dict(attrs).get('id') == 'app':
            self.found_app = True
            self.app_depth = 1

    def handle_startendtag(self, tag, attrs):
        if self.app_depth:
            self.has_rendered_content = True

    def handle_endtag(self, tag):
        if self.app_depth:
            self.app_depth -= 1

    def handle_data(self, data):
        if self.app_depth and data.strip():
            self.has_rendered_content = True


def confirm_ssr(html: str) -> None:
    parser = AppRootParser()
    parser.feed(html)
    assert parser.found_app, 'Inertia application root was not found in live HTML'
    assert parser.has_rendered_content, 'Live HTML has an empty Inertia root; SSR does not appear active'


def sitemap_urls(xml: str) -> list:
    root = ElementTree.fromstring(xml)
    assert root.tag.rsplit('}', 1)[-1] == 'urlset', 'Sitemap root is not <urlset>'
    return [
        element.text.strip()
        for element in root.iter()
        if element.tag.rsplit('}', 1)[-1] == 'loc' and element.text
    ]


def entry_asset(manifest: dict) -> str:
    entry = manifest.get('resources/js/app.tsx')
    if not isinstance(entry, dict) or not isinstance(entry.get('file'), str):
        raise ValueError('Production build manifest is missing the application entry asset')
    return entry['file']


def access_headers(environ) -> dict:
    """Cloudflare Access service-token headers for protected environments."""
    client_id = environ.get('CF_ACCESS_CLIENT_ID', '')
    client_secret = environ.get('CF_ACCESS_CLIENT_SECRET', '')
    if bool(client_id) != bool(client_secret):
        raise ValueError('Set both CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET, or neither')
    if not client_id:
        return {}
    return {'CF-Access-Client-Id': client_id, 'CF-Access-Client-Secret': client_secret}


class ReleaseSmoke:
    def __init__(self, base, expected_manifest, expected_source, expected_revision=None, extra_headers=None):
        self.base = base.rstrip('/')
        self.expected_manifest = expected_manifest
        self.expected_entry = entry_asset(expected_manifest)
        self.expected_source = expected_source
        self.expected_revision = expected_revision
        self.headers = {
            'User-Agent': USER_AGENT,
            'Accept': 'text/html, application/xhtml+xml',
            'Cache-Control': 'no-cache',
            **(extra_headers or {}),
        }
        self.stage = 'health'

    def response(self, path, accept=None):
        self.stage = path
        headers = dict(self.headers)
        if accept:
            headers['Accept'] = accept
        request = urllib.request.Request(self.base + path, headers=headers)
        with urllib.request.urlopen(request, timeout=15) as response:
            assert response.status == 200, 'Public route did not return HTTP 200'
            return (
                response.read(4000000),
                response.headers.get_content_charset() or 'utf-8',
                {key.lower(): value for key, value in response.headers.items()},
            )

    def text(self, path, accept=None):
        content, charset, _ = self.response(path, accept)
        return content.decode(charset)

    def page(self, path):
        return parse_page(self.text(path))

    def confirm_health(self):
        _, _, headers = self.response('/up')
        if self.expected_revision:
            served = headers.get(REVISION_HEADER, '')
            assert served == self.expected_revision, (
                f'Health check serves revision {served or "(none)"}, expected {self.expected_revision}'
            )
            return self.expected_revision
        return headers.get(REVISION_HEADER, 'not reported')

    def confirm_frontend_fingerprint(self):
        try:
            live_manifest = json.loads(self.text('/build/manifest.json', 'application/json'))
            assert live_manifest == self.expected_manifest, 'Live Vite manifest does not match the expected production build'
            return 'full Vite manifest'
        except urllib.error.HTTPError as error:
            if error.code != 404:
                raise

        html = self.text('/', 'text/html, application/xhtml+xml')
        assert self.expected_entry in html, 'Live HTML does not reference the expected application entry asset'
        return 'application entry asset'

    def confirm_sitemap(self):
        urls = sitemap_urls(self.text('/sitemap.xml', 'application/xml, text/xml;q=0.9, */*;q=0.8'))
        assert urls, 'Sitemap has no <loc> entries'
        assert any(url.startswith(self.base + '/') for url in urls), 'Sitemap does not contain URLs for this environment'
        return len(urls)

    def run_once(self):
        served_revision = self.confirm_health()
        fingerprint = self.confirm_frontend_fingerprint()

        homepage, charset, homepage_headers = self.response('/', 'text/html, application/xhtml+xml')
        powered_by = homepage_headers.get('x-powered-by', '')
        assert 'php' not in powered_by.lower(), 'PHP version/runtime is exposed through X-Powered-By'
        confirm_ssr(homepage.decode(charset))

        sitemap_url_count = self.confirm_sitemap()

        query = 'workbine-deploy-' + self.expected_source
        result = self.page('/topics?q=' + urllib.parse.quote(query, safe=''))
        assert result.get('component') == 'topics/index', 'Unexpected public page'
        assert result.get('props', {}).get('search') == query, 'Search behavior is not visible yet'

        listing = self.page('/topics')
        assert listing.get('component') == 'topics/index', 'Explore page failed'
        topics = listing.get('props', {}).get('topics', {}).get('data', [])
        checked = {'topic': 0, 'method': 0, 'experience': 0, 'member': 0}
        if topics:
            first_topic = topics[0]
            topic_path = '/topics/' + urllib.parse.quote(first_topic['slug'], safe='')
            topic = self.page(topic_path)
            assert topic.get('component') == 'topics/show', 'Topic detail failed'
            checked['topic'] = 1

            username = (first_topic.get('user') or {}).get('username')
            if username:
                member = self.page('/members/' + urllib.parse.quote(username, safe=''))
                assert member.get('component') == 'members/show', 'Public member profile failed'
                assert member.get('props', {}).get('member', {}).get('username') == username, 'Wrong public member profile'
                checked['member'] = 1

            for method in topic.get('props', {}).get('methods', {}).get('data', [])[:1]:
                assert 'experiences_count' in method, 'Experience release is not visible yet'
                method_path = topic_path + '/methods/' + str(method['id'])
                detail = self.page(method_path)
                assert detail.get('component') == 'topics/method-show', 'Public method page failed'
                assert detail.get('props', {}).get('method', {}).get('id') == method['id'], 'Wrong method detail'
                assert detail.get('props', {}).get('canonicalUrl') == self.base + method_path, 'Method canonical URL failed'
                checked['method'] += 1
                experience = self.page(method_path + '/experiences')
                assert experience.get('component') == 'topics/method-show', 'Legacy experience link failed'
                assert isinstance(experience.get('props', {}).get('experiences', {}).get('data'), list), 'Integrated experiences missing'
                checked['experience'] += 1

        return {
            'base_url': self.base,
            'expected_source': self.expected_source,
            'served_revision': served_revision,
            'frontend_fingerprint': fingerprint,
            'expected_entry_asset': self.expected_entry,
            'health': 'HTTP 200',
            'ssr': 'confirmed',
            'sitemap': 'confirmed',
            'sitemap_url_count': sitemap_url_count,
            'php_x_powered_by': 'not exposed',
            'search_behavior': 'confirmed',
            'explore_page': 'confirmed',
            'topic_pages_checked': checked['topic'],
            'method_pages_checked': checked['method'],
            'experience_pages_checked': checked['experience'],
            'member_pages_checked': checked['member'],
            'public_topic_total': listing.get('props', {}).get('topics', {}).get('total'),
        }


def write_summary(label, message, coverage):
    summary_path = os.environ.get('GITHUB_STEP_SUMMARY')
    if not summary_path:
        return
    with open(summary_path, 'a', encoding='utf-8') as summary:
        summary.write(
            f'## {label}\n'
            + message
            + '\n\n```json\n'
            + json.dumps(coverage, indent=2)
            + '\n```\n\n'
            + 'The expected frontend build is compared with the public Vite manifest when available, with the application entry asset as a 404 fallback. '
            + 'When an expected revision is given, the health check must report exactly that commit. '
            + 'SSR is confirmed from rendered content inside the Inertia application root. The sitemap must parse as XML and contain URLs for this environment, and the homepage must not expose PHP through X-Powered-By. '
            + 'It does not prove runtime environment values or external providers. '
            + 'Zero sampled topic/method/experience/member pages is not coverage of those flows. No authenticated session is tested and no content is created.\n'
        )


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', required=True)
    parser.add_argument('--manifest', required=True, help='Vite manifest.json of the expected release build')
    parser.add_argument('--expected-source', help='Commit used in the search probe; defaults to the expected revision')
    parser.add_argument('--expected-revision', help='Commit the health check must report')
    parser.add_argument('--attempts', type=int, default=24)
    parser.add_argument('--delay', type=int, default=10)
    parser.add_argument('--label', default='Release smoke')
    args = parser.parse_args(argv)

    expected_source = args.expected_source or args.expected_revision
    if not expected_source:
        parser.error('--expected-source or --expected-revision is required')

    with open(args.manifest, encoding='utf-8') as manifest_file:
        expected_manifest = json.load(manifest_file)

    smoke = ReleaseSmoke(
        args.base_url,
        expected_manifest,
        expected_source,
        args.expected_revision,
        access_headers(os.environ),
    )
    print('Expected frontend entry:', smoke.expected_entry, flush=True)

    last_error = ''
    for attempt in range(1, args.attempts + 1):
        try:
            coverage = smoke.run_once()
        except urllib.error.HTTPError as error:
            last_error = f'{smoke.stage}: HTTP {error.code}; cf-mitigated={error.headers.get("cf-mitigated", "not present")}'
        except Exception as error:
            last_error = f'{smoke.stage}: {type(error).__name__}: {error}'
        else:
            message = (
                f'PASS: {smoke.base} health, served revision, frontend build fingerprint, SSR, sitemap, '
                'PHP header hardening, search behavior and public routes. No content was created.'
            )
            print(message)
            print(json.dumps(coverage))
            write_summary(args.label, message, coverage)
            return 0

        print(f'Attempt {attempt}/{args.attempts}: {last_error}', flush=True)
        if attempt < args.attempts:
            time.sleep(args.delay)

    print(f'{smoke.base} release could not be confirmed from the runner: {last_error}', file=sys.stderr)
    return 1


if __name__ == '__main__':
    sys.exit(main())
