import logging
import sys
from datetime import datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core import mail, signing
from django.test import RequestFactory, SimpleTestCase, override_settings

from config.tasks import _send_error_digest
from utils.error_digest import (
    COUNTS_KEY,
    SENDING_SUFFIX,
    ErrorDigestHandler,
    acknowledge_error_digest,
    build_sample,
    format_error_digest,
    record_error,
    take_error_digest,
)
from utils.exception_reporter import ConnectionSafeExceptionReporter

MSK = ZoneInfo('Europe/Moscow')


class FakeRedis:
    def __init__(self):
        self.data = {}

    def pipeline(self):
        return FakePipeline(self)

    def hincrby(self, key, field, amount):
        bucket = self.data.setdefault(key, {})
        bucket[field] = str(int(bucket.get(field, 0)) + amount)

    def hsetnx(self, key, field, value):
        self.data.setdefault(key, {}).setdefault(field, value)

    def hset(self, key, field, value):
        self.data.setdefault(key, {})[field] = str(value)

    def hgetall(self, key):
        return dict(self.data.get(key, {}))

    def exists(self, key):
        return int(key in self.data)

    def rename(self, src, dst):
        self.data[dst] = self.data.pop(src)

    def delete(self, *keys):
        for key in keys:
            self.data.pop(key, None)


class FakePipeline:
    def __init__(self, client):
        self.client = client
        self.calls = []

    def __getattr__(self, name):
        return lambda *args: self.calls.append((name, args))

    def execute(self):
        for name, args in self.calls:
            getattr(self.client, name)(*args)


def make_record(exc=None, path='/users/user/5/', message='Internal Server Error: %s', raiser=None):
    exc_info = None
    if exc is not None or raiser is not None:
        try:
            if raiser is not None:
                raiser()
            raise exc
        except Exception:
            exc_info = sys.exc_info()
    record = logging.LogRecord('django.request', logging.ERROR, __file__, 10, message, (path,), exc_info)
    record.request = RequestFactory().get(path)
    return record


def ts(day, hour, minute):
    return datetime(2026, 11, day, hour, minute, tzinfo=MSK).timestamp()


class ErrorDigestCollectTests(SimpleTestCase):
    def test_same_error_is_grouped_and_keeps_first_sample(self):
        client = FakeRedis()
        record_error(client, make_record(RuntimeError('first'), path='/a/'), now=ts(5, 13, 57))
        record_error(client, make_record(RuntimeError('second'), path='/b/'), now=ts(5, 14, 0))

        groups = take_error_digest(client)

        self.assertEqual(len(groups), 1)
        self.assertEqual(groups[0]['count'], 2)
        self.assertEqual(groups[0]['message'], 'first')
        self.assertEqual(groups[0]['path'], '/a/')
        self.assertEqual(groups[0]['last_seen'], ts(5, 14, 0))

    def test_different_exception_types_are_separate_groups_sorted_by_count(self):
        client = FakeRedis()
        record_error(client, make_record(KeyError('x')))
        for _ in range(3):
            record_error(client, make_record(RuntimeError('boom')))

        groups = take_error_digest(client)

        self.assertEqual([(g['type'], g['count']) for g in groups], [('RuntimeError', 3), ('KeyError', 1)])

    def test_location_points_to_project_code_not_site_packages(self):
        sample = build_sample(make_record(raiser=lambda: signing.loads('bad')), now=0)

        self.assertEqual(sample['type'], 'BadSignature')
        self.assertTrue(sample['location'].startswith('utils/tests.py:'), sample['location'])
        self.assertIn('django', sample['traceback'])

    def test_record_without_exception_uses_log_message(self):
        sample = build_sample(make_record(path='/x/'), now=0)

        self.assertEqual(sample['type'], 'ERROR')
        self.assertEqual(sample['message'], 'Internal Server Error: /x/')
        self.assertEqual(sample['traceback'], '')

    def test_handler_without_redis_does_nothing(self):
        with patch('utils.error_digest.get_redis_client', return_value=None):
            ErrorDigestHandler().emit(make_record(RuntimeError('boom')))

    def test_handler_writes_to_redis(self):
        client = FakeRedis()
        with patch('utils.error_digest.get_redis_client', return_value=client):
            ErrorDigestHandler().emit(make_record(RuntimeError('boom')))

        self.assertEqual(list(client.hgetall(COUNTS_KEY).values()), ['1'])


class ErrorDigestTakeTests(SimpleTestCase):
    def test_errors_logged_after_take_go_to_next_digest(self):
        client = FakeRedis()
        record_error(client, make_record(RuntimeError('old')))
        self.assertEqual(len(take_error_digest(client)), 1)

        record_error(client, make_record(KeyError('new')))
        acknowledge_error_digest(client)

        groups = take_error_digest(client)
        self.assertEqual([g['type'] for g in groups], ['KeyError'])

    def test_unacknowledged_batch_is_sent_again_before_new_errors(self):
        client = FakeRedis()
        record_error(client, make_record(RuntimeError('old')))
        take_error_digest(client)
        record_error(client, make_record(KeyError('new')))

        self.assertEqual([g['type'] for g in take_error_digest(client)], ['RuntimeError'])
        acknowledge_error_digest(client)
        self.assertEqual([g['type'] for g in take_error_digest(client)], ['KeyError'])

    def test_empty_digest(self):
        client = FakeRedis()

        self.assertEqual(take_error_digest(client), [])
        self.assertFalse(client.exists(COUNTS_KEY + SENDING_SUFFIX))


class ErrorDigestFormatTests(SimpleTestCase):
    def test_format_lists_groups_with_moscow_time(self):
        client = FakeRedis()
        for minute in (57, 58):
            record_error(client, make_record(RuntimeError('too many clients')), now=ts(5, 13, minute))
        record_error(client, make_record(KeyError('igdb_id'), path='/games/game/x/'), now=ts(5, 14, 0))

        subject, body = format_error_digest(take_error_digest(client))

        self.assertEqual(subject, 'Interests: 3 ошибки, видов: 2')
        self.assertIn('с 05.11 13:57 по 05.11 14:00 (МСК): 3 события, видов: 2.', body)
        self.assertIn('1. 2 × RuntimeError: too many clients', body)
        self.assertIn('2. 1 × KeyError: \'igdb_id\'', body)
        self.assertIn('Пример запроса: GET /games/game/x/', body)
        self.assertIn('--- #1 ---', body)


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    ADMINS=[('Admin', 'admin@example.com')],
    EMAIL_HOST_USER='robot@example.com',
)
class SendErrorDigestTests(SimpleTestCase):
    def test_sends_one_email_and_clears_errors(self):
        client = FakeRedis()
        record_error(client, make_record(RuntimeError('boom')))

        with patch('config.tasks.get_redis_client', return_value=client):
            self.assertEqual(_send_error_digest(), 1)
            self.assertEqual(_send_error_digest(), 0)

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['admin@example.com'])
        self.assertEqual(mail.outbox[0].from_email, 'robot@example.com')
        self.assertEqual(client.data, {})

    def test_failed_send_keeps_errors_for_next_run(self):
        client = FakeRedis()
        record_error(client, make_record(RuntimeError('boom')))

        with patch('config.tasks.get_redis_client', return_value=client), \
                patch('config.tasks.EmailMessage.send', side_effect=OSError('smtp down')):
            with self.assertRaises(OSError):
                _send_error_digest()

        self.assertTrue(client.exists(COUNTS_KEY + SENDING_SUFFIX))


class ConnectionSafeExceptionReporterTests(SimpleTestCase):
    def test_closes_connections_after_building_report(self):
        try:
            raise RuntimeError('boom')
        except RuntimeError:
            exc_info = sys.exc_info()
        reporter = ConnectionSafeExceptionReporter(RequestFactory().get('/'), *exc_info)

        with patch('utils.exception_reporter.close_old_connections') as close_old_connections:
            reporter.get_traceback_text()

        close_old_connections.assert_called_once()

    def test_is_configured_as_default_reporter(self):
        self.assertEqual(settings.DEFAULT_EXCEPTION_REPORTER, 'utils.exception_reporter.ConnectionSafeExceptionReporter')
