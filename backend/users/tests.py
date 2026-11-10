from datetime import date
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, Client, override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APIClient

from integrations.telegram import TelegramChatUnavailableError, split_message
from users.tasks import _send_release_emails
from users.tokens import account_activation_token


class UsersManagersTests(TestCase):
    def test_create_user(self):
        User = get_user_model()
        user = User.objects.create_user(username='Jenya', email='normal@user.com', password='foo')
        self.assertEqual(user.username, 'Jenya')
        self.assertEqual(user.email, 'normal@user.com')
        self.assertFalse(user.is_active)
        self.assertFalse(user.is_superuser)

        with self.assertRaises(TypeError):
            User.objects.create_user()
        with self.assertRaises(TypeError):
            User.objects.create_user(username='')
        with self.assertRaises(TypeError):
            User.objects.create_user(email='')
        with self.assertRaises(ValueError):
            User.objects.create_user(username='', email='', password="foo")

    def test_create_superuser(self):
        User = get_user_model()
        admin_user = User.objects.create_superuser(username='admin', email='super@user.com', password='foo')
        self.assertEqual(admin_user.username, 'admin')
        self.assertEqual(admin_user.email, 'super@user.com')
        self.assertTrue(admin_user.is_active)
        self.assertTrue(admin_user.is_superuser)

        with self.assertRaises(ValueError):
            User.objects.create_superuser(username='admin',
                                          email='super@user.com', password='foo', is_superuser=False)


class AuthTests(TestCase):
    def test_signup(self):
        url = '/users/auth/signup/'
        c = Client()
        response = c.post(url, {'username': 'john', 'password': 'smith^', 'email': 'email'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = c.post(url, {'username': 'john', 'password': 'smith', 'email': 'email@email'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = c.post(url, {'username': 'john', 'password': 'sOme_g00d_pAssworD', 'email': 'email@email.com'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()['username'], 'john')

    def test_login(self):
        login_url = '/users/auth/login/'
        refresh_token_url = '/users/auth/refresh-token/'
        c = Client()

        User = get_user_model()
        email = 'email@email.com'
        password = 'smith'
        username = 'john'
        response = c.post(login_url, {'username': username, 'password': password, 'email': email})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        user = User.objects.create_user(username=username, email=email, password=password)
        response = c.post(login_url, {'username': username, 'password': password, 'email': email})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        response = c.post(login_url, {'password': password})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        user.is_active = True
        user.save()
        response = c.post(login_url, {'username': username, 'password': password, 'email': email})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue('access' in response.json())
        self.assertTrue('refresh' in response.json())
        access_token = response.json()['access']
        refresh_token = response.json()['refresh']

        response = c.post(refresh_token_url, {'refresh': refresh_token})
        self.assertTrue('accessToken' in response.json())
        new_access_token = response.json()['accessToken']
        self.assertNotEqual(access_token, new_access_token)

        response = c.post(login_url, {'username': username, 'password': password})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = c.post(login_url, {'username': email, 'password': password})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_email_confirmation(self):
        c = Client()

        User = get_user_model()
        email = 'kononkov98@mail.ru'
        password = 'smith'
        username = 'john'
        user = User.objects.create_user(username=username, email=email, password=password)
        self.assertEqual(user.is_active, False)

        url = '/users/auth/confirm_email/'
        uid64 = urlsafe_base64_encode(force_bytes(user.pk))
        token = account_activation_token.make_token(user)

        activation_link = f"{url}?uid64={uid64}&token=random_string/"
        response = c.patch(activation_link)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        activation_link = f"{url}?uid64={uid64}&token={token}"
        response = c.patch(activation_link)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


TELEGRAM_TEST_SETTINGS = {
    'TELEGRAM_TOKEN': 'test-token',
    'TELEGRAM_WEBHOOK_SECRET': 'webhook-secret',
    'CACHES': {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}},
}


@override_settings(**TELEGRAM_TEST_SETTINGS)
class TelegramLinkTests(TestCase):
    webhook_url = '/users/telegram/webhook/'

    def setUp(self):
        cache.clear()
        self.user = get_user_model().objects.create_user(username='john', email='john@mail.com', password='foo')
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.webhook_client = APIClient()

    def _post_update(self, update, secret='webhook-secret'):
        return self.webhook_client.post(
            self.webhook_url,
            update,
            format='json',
            HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN=secret,
        )

    def _start_update(self, update_id, text, chat_id=555):
        return {
            'update_id': update_id,
            'message': {
                'chat': {'id': chat_id, 'type': 'private'},
                'from': {'id': chat_id, 'username': 'john_tg'},
                'text': text,
            },
        }

    @patch('users.services.telegram.telegram.send_message')
    @patch('users.services.telegram.telegram.get_bot_username', return_value='TestBot')
    def test_link_and_stop(self, _get_bot_username, send_message):
        response = self.client.post('/users/auth/telegram_link/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        url = response.json()['url']
        self.assertTrue(url.startswith('https://t.me/TestBot?start='))
        token = url.split('start=', 1)[1]

        response = self._post_update(self._start_update(1, f'/start {token}'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.telegram_chat_id, 555)
        self.assertEqual(self.user.telegram_username, 'john_tg')
        self.assertIn('подключён', send_message.call_args.args[1])

        status_response = self.client.get('/users/auth/telegram_link_status/').json()
        self.assertTrue(status_response['is_linked'])
        self.assertEqual(status_response['telegram_username'], 'john_tg')

        self._post_update(self._start_update(2, f'/start {token}', chat_id=777))
        self.assertIn('устарела', send_message.call_args.args[1])
        self.assertFalse(get_user_model().objects.filter(telegram_chat_id=777).exists())

        self._post_update(self._start_update(3, '/stop'))
        self.user.refresh_from_db()
        self.assertIsNone(self.user.telegram_chat_id)

    @patch('users.services.telegram.telegram.send_message')
    def test_webhook_rejects_wrong_secret(self, send_message):
        response = self._post_update(self._start_update(1, '/start'), secret='wrong')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        send_message.assert_not_called()

    @patch('users.services.telegram.telegram.send_message')
    def test_repeated_update_is_handled_once(self, send_message):
        self._post_update(self._start_update(10, '/help'))
        self._post_update(self._start_update(10, '/help'))
        self.assertEqual(send_message.call_count, 1)

    @patch('users.services.telegram.telegram.send_message')
    def test_blocked_bot_unlinks_chat(self, _send_message):
        self.user.telegram_chat_id = 555
        self.user.save()
        self._post_update({
            'update_id': 20,
            'my_chat_member': {
                'chat': {'id': 555, 'type': 'private'},
                'new_chat_member': {'status': 'kicked'},
            },
        })
        self.user.refresh_from_db()
        self.assertIsNone(self.user.telegram_chat_id)


@override_settings(**TELEGRAM_TEST_SETTINGS)
class ReleaseNotificationChannelTests(TestCase):
    sections = [{'title': 'Новые игры', 'items': [[('Half-Life <3>', 'https://example.com/game/hl3/')]]}]

    def setUp(self):
        self.user = get_user_model().objects.create_user(username='john', email='john@mail.com', password='foo')
        self.user.receive_games_releases = True
        self.user.telegram_chat_id = 555
        self.user.save()

    def _run(self):
        with patch('users.tasks._build_user_sections', return_value=(self.sections, {'games': 1})):
            return _send_release_emails(date.today())

    def _set_channels(self, email, telegram):
        self.user.notify_by_email = email
        self.user.notify_by_telegram = telegram
        self.user.save()

    @patch('users.tasks.telegram.send_message')
    def test_both_channels(self, send_message):
        self._set_channels(email=True, telegram=True)
        result = self._run()
        self.assertEqual((result['emails_sent'], result['telegram_sent']), (1, 1))
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Half-Life &lt;3&gt;', mail.outbox[0].body)
        chat_id, text = send_message.call_args.args
        self.assertEqual(chat_id, 555)
        self.assertIn('• <a href="https://example.com/game/hl3/">Half-Life &lt;3&gt;</a>', text)
        self.assertNotIn('<br>', text)

    @patch('users.tasks.telegram.send_message')
    def test_telegram_only(self, _send_message):
        self._set_channels(email=False, telegram=True)
        result = self._run()
        self.assertEqual((result['emails_sent'], result['telegram_sent']), (0, 1))
        self.assertEqual(len(mail.outbox), 0)

    @patch('users.tasks.telegram.send_message')
    def test_telegram_requires_linked_chat(self, send_message):
        self._set_channels(email=False, telegram=True)
        self.user.telegram_chat_id = None
        self.user.save()
        result = self._run()
        self.assertEqual(result['candidates'], 0)
        send_message.assert_not_called()

    @patch('users.tasks.telegram.send_message', side_effect=TelegramChatUnavailableError('blocked', 403))
    def test_blocked_chat_is_unlinked(self, _send_message):
        self._set_channels(email=True, telegram=True)
        result = self._run()
        self.assertEqual((result['sent'], result['errors']), (1, 1))
        self.user.refresh_from_db()
        self.assertIsNone(self.user.telegram_chat_id)


class TelegramSplitMessageTests(TestCase):
    def test_splits_on_lines(self):
        text = '\n'.join(['a' * 10] * 5)
        chunks = split_message(text, limit=25)
        self.assertEqual(chunks, ['a' * 10 + '\n' + 'a' * 10] * 2 + ['a' * 10])
        self.assertTrue(all(len(chunk) <= 25 for chunk in chunks))
