import json
from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from games.integrations.igdb import get_game_search_results


class GameSearchPaginationTests(SimpleTestCase):
    @staticmethod
    def _build_games(count):
        return [
            {
                'id': index,
                'name': f'Game {index}',
                'slug': f'game-{index}',
            }
            for index in range(count)
        ]

    @patch('games.integrations.igdb.get_igdb_wrapper')
    def test_second_page_keeps_results_returned_with_igdb_offset(self, get_igdb_wrapper_mock):
        wrapper = Mock()
        wrapper.api_request.return_value = json.dumps(self._build_games(13)).encode('utf-8')
        get_igdb_wrapper_mock.return_value = wrapper

        response = get_game_search_results('Overwatch 2', page=2, page_size=12)

        request_body = wrapper.api_request.call_args.args[1]
        self.assertIn('limit 13;', request_body)
        self.assertIn('offset 12;', request_body)
        self.assertEqual(len(response['results']), 12)
        self.assertEqual(response['results'][0]['name'], 'Game 0')
        self.assertTrue(response['has_next'])

    @patch('games.integrations.igdb.get_igdb_wrapper')
    def test_full_last_page_does_not_report_next_page(self, get_igdb_wrapper_mock):
        wrapper = Mock()
        wrapper.api_request.return_value = json.dumps(self._build_games(12)).encode('utf-8')
        get_igdb_wrapper_mock.return_value = wrapper

        response = get_game_search_results('Overwatch 2', page=1, page_size=12)

        self.assertEqual(len(response['results']), 12)
        self.assertFalse(response['has_next'])

    @patch('games.integrations.igdb.get_igdb_wrapper')
    def test_game_types_are_filtered_before_pagination(self, get_igdb_wrapper_mock):
        wrapper = Mock()
        wrapper.api_request.return_value = json.dumps(self._build_games(12)).encode('utf-8')
        get_igdb_wrapper_mock.return_value = wrapper

        get_game_search_results('The Witcher 3', page=1, page_size=12, game_types=[0, 2, 4])

        request_body = wrapper.api_request.call_args.args[1]
        self.assertIn('where game_type = (0,2,4);', request_body)

    @patch('games.integrations.igdb.get_igdb_wrapper')
    def test_platforms_are_combined_with_game_types_before_pagination(self, get_igdb_wrapper_mock):
        wrapper = Mock()
        wrapper.api_request.return_value = json.dumps(self._build_games(12)).encode('utf-8')
        get_igdb_wrapper_mock.return_value = wrapper

        get_game_search_results(
            'The Witcher 3',
            page=1,
            page_size=12,
            game_types=[0, 2, 4],
            platform_ids=[6, 48],
        )

        request_body = wrapper.api_request.call_args.args[1]
        self.assertIn('where game_type = (0,2,4) & platforms = (6,48);', request_body)

    @patch('games.integrations.igdb.get_igdb_wrapper')
    def test_empty_game_types_skip_igdb_request(self, get_igdb_wrapper_mock):
        response = get_game_search_results('The Witcher 3', page=1, page_size=12, game_types=[])

        get_igdb_wrapper_mock.assert_not_called()
        self.assertEqual(response, {'results': [], 'has_next': False})

    @patch('games.integrations.igdb.get_igdb_wrapper')
    def test_empty_platforms_skip_igdb_request(self, get_igdb_wrapper_mock):
        response = get_game_search_results('The Witcher 3', page=1, page_size=12, platform_ids=[])

        get_igdb_wrapper_mock.assert_not_called()
        self.assertEqual(response, {'results': [], 'has_next': False})
