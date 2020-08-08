from django.core.mail import EmailMessage
from django.utils.encoding import force_bytes, force_text
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from config.settings import EMAIL_HOST_USER
from users.serializers import UserSerializer
from .models import User
from .tokens import account_activation_token


class UserView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            mail_subject = 'Activate your account.'
            confirmation_url = 'http://127.0.0.1:8000/users/auth/confirm-email'  # get_current_site(request)
            uid64 = urlsafe_base64_encode(force_bytes(user.pk))
            token = account_activation_token.make_token(user)
            activation_link = f"{confirmation_url}/{uid64}/{token}/"
            message = f"Hello {user.username},\n {activation_link}"
            email = EmailMessage(mail_subject, message, to=[user.email], from_email=EMAIL_HOST_USER)
            email.send()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, uid64, token):
        try:
            uid = force_text(urlsafe_base64_decode(uid64))
            user = User.objects.get(pk=uid)
        except(TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None
        if user is not None and account_activation_token.check_token(user, token):
            user.is_active = True
            user.save()
            return Response({'Successful activation'}, status=status.HTTP_200_OK)
        else:
            return Response({'Activation link is invalid!'}, status=status.HTTP_400_BAD_REQUEST)
