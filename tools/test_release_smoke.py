import unittest
from release_smoke import access_headers, confirm_ssr, entry_asset, sitemap_urls


class SsrTests(unittest.TestCase):
    def test_rendered_inertia_root_passes(self):
        confirm_ssr('<html><body><div id="app" data-page="{}"><main><h1>Workbine</h1></main></div></body></html>')

    def test_empty_inertia_root_means_ssr_is_inactive(self):
        with self.assertRaisesRegex(AssertionError, 'SSR does not appear active'):
            confirm_ssr('<html><body><div id="app" data-page="{}"></div></body></html>')

    def test_missing_inertia_root_fails(self):
        with self.assertRaisesRegex(AssertionError, 'application root was not found'):
            confirm_ssr('<html><body><main>Static page</main></body></html>')


class SitemapTests(unittest.TestCase):
    def test_namespaced_locations_are_read(self):
        xml = (
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            '<url><loc> https://staging.workbine.com/ </loc></url>'
            '<url><loc>https://staging.workbine.com/community/guide</loc></url>'
            '</urlset>'
        )
        self.assertEqual(
            sitemap_urls(xml),
            ['https://staging.workbine.com/', 'https://staging.workbine.com/community/guide'],
        )

    def test_other_roots_are_rejected(self):
        with self.assertRaisesRegex(AssertionError, 'not <urlset>'):
            sitemap_urls('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>')


class ManifestTests(unittest.TestCase):
    def test_application_entry_is_returned(self):
        self.assertEqual(entry_asset({'resources/js/app.tsx': {'file': 'assets/app-abc123.js'}}), 'assets/app-abc123.js')

    def test_missing_entry_is_rejected(self):
        with self.assertRaises(ValueError):
            entry_asset({'resources/css/app.css': {'file': 'assets/app.css'}})


class AccessHeaderTests(unittest.TestCase):
    def test_public_environments_send_no_access_headers(self):
        self.assertEqual(access_headers({}), {})

    def test_service_token_is_sent_as_cloudflare_access_headers(self):
        self.assertEqual(
            access_headers({'CF_ACCESS_CLIENT_ID': 'id.access', 'CF_ACCESS_CLIENT_SECRET': 'secret'}),
            {'CF-Access-Client-Id': 'id.access', 'CF-Access-Client-Secret': 'secret'},
        )

    def test_partial_service_token_is_a_configuration_error(self):
        with self.assertRaises(ValueError):
            access_headers({'CF_ACCESS_CLIENT_ID': 'id.access'})


if __name__ == '__main__':
    unittest.main()
