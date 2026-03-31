from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken


class GeneralInitTests(TestCase):
    def test_init_without_token_keeps_current_behavior(self):
        response = Client().post('/init')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {})

    def test_init_with_invalid_token_returns_401(self):
        response = Client().post('/init', HTTP_AUTHORIZATION='Bearer invalid-token')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_init_with_valid_token_returns_user(self):
        user = get_user_model().objects.create_user(
            username='john',
            email='john@example.com',
            password='secret',
        )
        user.is_active = True
        user.save()
        access_token = str(RefreshToken.for_user(user).access_token)

        response = Client().post('/init', HTTP_AUTHORIZATION=f'Bearer {access_token}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['user']['id'], user.id)
        self.assertEqual(response.json()['user']['username'], user.username)
