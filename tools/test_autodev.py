import json
import unittest
from autodev import progress_document, verify_files

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

    def test_progress_migrates_lists_without_mutating_or_duplicating_entries(self):
        before = {'completed': ['UI-001']}
        result = progress_document(before, 'UI-002', '123')
        parsed = json.loads(result)
        self.assertEqual(before, {'completed': ['UI-001']})
        self.assertEqual(parsed['completed'], {'UI-001': True, 'UI-002': True})
        self.assertEqual(result, progress_document(parsed, 'UI-002', '123'))

    def test_progress_uses_four_space_object_format_and_final_newline(self):
        expected = '{\n    "completed": {\n        "UI-001": true\n    },\n    "last_task": "UI-001",\n    "last_run": "123"\n}\n'
        self.assertEqual(progress_document({}, 'UI-001', '123'), expected)

    def test_invalid_progress_identifiers_and_states_are_rejected(self):
        for state, task, run in [({}, 'other', '123'), ({}, 'UI-001', 'bad'), ({'completed': 'bad'}, 'UI-001', '123')]:
            with self.subTest(state=state, task=task, run=run), self.assertRaises(ValueError):
                progress_document(state, task, run)


if __name__ == '__main__':
    unittest.main()
