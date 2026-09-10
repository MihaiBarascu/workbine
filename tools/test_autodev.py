import unittest
from autodev import verify_files

NAME = 'resources/js/pages/topics/index.tsx'


class ScopeTests(unittest.TestCase):
    def test_small_public_ui_change_is_allowed(self):
        verify_files({NAME: 'const title = "New label";\n'}, {NAME: 'const title = "Old label";\n'})

    def test_workflows_and_backend_are_not_allowed(self):
        for name in ['.github/workflows/ci.yml', 'app/Models/User.php', '../outside.tsx', '.env']:
            with self.subTest(name=name), self.assertRaises(ValueError):
                verify_files({name: 'changed'}, {name: 'original'})

    def test_new_network_or_html_execution_requires_review(self):
        for value in ['fetch("/secret")', 'document.cookie', 'dangerouslySetInnerHTML', 'https://outside.example', '"//outside.example"', 'eval("x")']:
            with self.subTest(value=value), self.assertRaises(ValueError):
                verify_files({NAME: value}, {NAME: 'safe'})

    def test_existing_url_is_not_falsely_classified_as_new(self):
        before = 'const source = "https://example.com";\nconst label = "Old";\n'
        after = 'const source = "https://example.com";\nconst label = "New";\n'
        verify_files({NAME: after}, {NAME: before})

    def test_large_diffs_are_rejected(self):
        with self.assertRaises(ValueError):
            verify_files({NAME: '\n'.join('new' + str(n) for n in range(321))}, {NAME: 'old'})

    def test_empty_or_unchanged_proposals_are_not_progress(self):
        with self.assertRaises(ValueError):
            verify_files({}, {})
        with self.assertRaises(ValueError):
            verify_files({NAME: 'same'}, {NAME: 'same'})

    def test_binary_content_is_rejected(self):
        with self.assertRaises(ValueError):
            verify_files({NAME: 'null\x00byte'}, {NAME: 'original'})


if __name__ == '__main__':
    unittest.main()
