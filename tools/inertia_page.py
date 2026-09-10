"""Read a public Inertia page object from a normal initial HTML response."""
import json
from html.parser import HTMLParser


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.payload = None
        self.collecting = False
        self.chunks = []

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if 'data-page' not in attrs:
            return
        if tag == 'script' and attrs.get('type') == 'application/json':
            self.collecting = True
            self.chunks = []
        elif (attrs.get('data-page') or '').lstrip().startswith('{'):
            self.payload = attrs['data-page']

    def handle_data(self, data):
        if self.collecting:
            self.chunks.append(data)

    def handle_endtag(self, tag):
        if tag == 'script' and self.collecting:
            self.payload = ''.join(self.chunks)
            self.collecting = False


def parse_page(markup: str) -> dict:
    parser = PageParser()
    parser.feed(markup)
    parser.close()
    if parser.payload is None:
        raise ValueError('Response did not contain an Inertia page object')
    page = json.loads(parser.payload)
    if not isinstance(page, dict) or not isinstance(page.get('component'), str) or not isinstance(page.get('props'), dict):
        raise ValueError('Invalid Inertia page object')
    return page
