from django.contrib.auth import get_user_model
from django.test import TestCase, Client
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status

from users.tokens import account_activation_token


class UsersManagersTests(TestCase):
    def test_create_user(self):
        User = get_user_model()
        user = User.objects.create_user(username='Jenya', email='normal@user.com', password='foo')
        self.assertEqual(user.username, 'Jenya')
        self.assertEqual(user.email, 'normal@user.com')
        self.assertFalse(user.is_active)
        self.assertFalse(user.is_staff)
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
        self.assertTrue(admin_user.is_staff)
        self.assertTrue(admin_user.is_superuser)

        with self.assertRaises(ValueError):
            User.objects.create_superuser(username='admin',
                                          email='super@user.com', password='foo', is_superuser=False)


class AuthTests(TestCase):
    def test_signup(self):
        url = '/users/auth/signup'
        c = Client()
        response = c.post(url, {'username': 'john', 'password': 'smith^', 'email': 'email'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = c.post(url, {'username': 'john', 'password': 'smith', 'email': 'email@email'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = c.post(url, {'username': 'john', 'password': 'smith', 'email': 'email@email.com'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()['username'], 'john')
        self.assertEqual(response.json()['email'], 'email@email.com')

    def test_login(self):
        login_url = '/users/auth/login'
        refresh_token_url = '/users/auth/refresh-token'
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
        self.assertTrue('access' in response.json())
        new_access_token = response.json()['access']
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

        url = '/users/auth/confirm-email'
        uid64 = urlsafe_base64_encode(force_bytes(user.pk))
        token = account_activation_token.make_token(user)

        activation_link = f"{url}/{uid64}/random_string"
        response = c.get(activation_link)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        activation_link = f"{url}/{uid64}/{token}"
        response = c.get(activation_link)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
