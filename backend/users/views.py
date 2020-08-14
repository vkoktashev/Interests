from django.core.mail import EmailMessage
from django.utils.encoding import force_bytes, force_text
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from config.settings import EMAIL_HOST_USER
from users.serializers import UserSerializer
from .models import User
from .tokens import account_activation_token


@swagger_auto_schema(method='POST', request_body=openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'username': openapi.Schema(type=openapi.TYPE_STRING),
        'email': openapi.Schema(type=openapi.TYPE_STRING),
        'password': openapi.Schema(type=openapi.TYPE_STRING),
    }
))
@api_view(['POST'])
@permission_classes([AllowAny, ])
def signup(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        mail_subject = 'Activate your account.'
        confirmation_url = 'http://127.0.0.1:8000/users/auth/confirm-email'  # get_current_site(request)
        uid64 = urlsafe_base64_encode(force_bytes(user.pk))
        token = account_activation_token.make_token(user)
        activation_link = f"{confirmation_url}/{uid64}/{token}"
        message = f"Hello {user.username},\n {activation_link}"
        email = EmailMessage(mail_subject, message, to=[user.email], from_email=EMAIL_HOST_USER)
        # email.send()
        print(activation_link)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


uid64_param = openapi.Parameter('uid64', openapi.IN_QUERY, description="Зашифрованный первичный ключ пользователя",
                                type=openapi.TYPE_STRING)
token_param = openapi.Parameter('token', openapi.IN_QUERY, description="Специальный токен для подтверждения",
                                type=openapi.TYPE_STRING)


@swagger_auto_schema(method='PATCH', manual_parameters=[uid64_param, token_param])
@api_view(['PATCH'])
def confirmation(request, uid64, token):
    try:
        uid = force_text(urlsafe_base64_decode(uid64))
        user = User.objects.get(pk=uid)
    except(TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user is not None and account_activation_token.check_token(user, token):
        user.is_active = True
        user.save()
        return Response(status=status.HTTP_200_OK)
    else:
        return Response('Confirmation link is invalid!', status=status.HTTP_400_BAD_REQUEST)
