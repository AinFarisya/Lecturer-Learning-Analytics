from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import (
    urlsafe_base64_decode,
    urlsafe_base64_encode,
)

from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response


# =========================
# SIGN UP
# =========================

@api_view(["POST"])
@permission_classes([AllowAny])
def lecturer_signup(request):
    name = str(request.data.get("name", "")).strip()
    email = str(request.data.get("email", "")).strip().lower()
    password = str(request.data.get("password", ""))
    confirm_password = str(request.data.get("confirm_password", ""))

    if not name or not email or not password or not confirm_password:
        return Response(
            {
                "status": "error",
                "message": "All fields are required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if password != confirm_password:
        return Response(
            {
                "status": "error",
                "message": "Passwords do not match.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    User = get_user_model()

    if User.objects.filter(email__iexact=email).exists():
        return Response(
            {
                "status": "error",
                "message": "An account with this email already exists.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = User(
        username=email,
        email=email,
        first_name=name,
    )

    try:
        validate_password(password, user=user)

    except ValidationError as error:
        return Response(
            {
                "status": "error",
                "message": "Password does not meet the requirements.",
                "errors": list(error.messages),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(password)
    user.save()

    token = Token.objects.create(user=user)

    return Response(
        {
            "status": "success",
            "message": "Account created successfully.",
            "token": token.key,
            "lecturer": {
                "id": user.id,
                "name": user.get_full_name() or user.username,
                "email": user.email,
            },
        },
        status=status.HTTP_201_CREATED,
    )


# =========================
# LOGIN
# =========================

@api_view(["POST"])
@permission_classes([AllowAny])
def lecturer_login(request):
    email = str(request.data.get("email", "")).strip().lower()
    password = str(request.data.get("password", ""))

    if not email or not password:
        return Response(
            {
                "status": "error",
                "message": "Email and password are required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    User = get_user_model()

    try:
        user = User.objects.get(email__iexact=email)

    except User.DoesNotExist:
        return Response(
            {
                "status": "error",
                "message": "Invalid email or password.",
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.check_password(password):
        return Response(
            {
                "status": "error",
                "message": "Invalid email or password.",
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.is_active:
        return Response(
            {
                "status": "error",
                "message": "This account is inactive.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    token, created = Token.objects.get_or_create(user=user)

    return Response(
        {
            "status": "success",
            "message": "Login successful.",
            "token": token.key,
            "lecturer": {
                "id": user.id,
                "name": user.get_full_name() or user.username,
                "email": user.email,
            },
        },
        status=status.HTTP_200_OK,
    )


# =========================
# LOGOUT
# =========================

@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def lecturer_logout(request):

    if request.auth:
        request.auth.delete()

    return Response(
        {
            "status": "success",
            "message": "Logout successful.",
        },
        status=status.HTTP_200_OK,
    )


# =========================
# FORGOT PASSWORD
# =========================

@api_view(["POST"])
@permission_classes([AllowAny])
def lecturer_forgot_password(request):
    email = str(request.data.get("email", "")).strip().lower()

    if not email:
        return Response(
            {
                "status": "error",
                "message": "Email address is required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    User = get_user_model()

    user = (
        User.objects
        .filter(
            email__iexact=email,
            is_active=True,
        )
        .first()
    )

    # Do not reveal whether an account exists.
    generic_success_message = (
        "If an account exists for this email address, "
        "a password reset link has been sent."
    )

    if not user:
        return Response(
            {
                "status": "success",
                "message": generic_success_message,
            },
            status=status.HTTP_200_OK,
        )

    uid = urlsafe_base64_encode(
        force_bytes(user.pk)
    )

    token = default_token_generator.make_token(
        user
    )

    frontend_url = getattr(
        settings,
        "FRONTEND_URL",
        "http://localhost:5173",
    ).rstrip("/")

    reset_url = (
        f"{frontend_url}/"
        f"?reset_password=1"
        f"&uid={uid}"
        f"&token={token}"
    )

    lecturer_name = (
        user.get_full_name()
        or user.username
        or "Lecturer"
    )

    subject = (
        "Reset Your Learning Analytics Password"
    )

    message = (
        f"Hello {lecturer_name},\n\n"
        "We received a request to reset the password "
        "for your Learning Analytics account.\n\n"
        "Use the link below to create a new password:\n"
        f"{reset_url}\n\n"
        "If you did not request a password reset, "
        "you can ignore this email.\n\n"
        "Learning Analytics System"
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=getattr(
            settings,
            "DEFAULT_FROM_EMAIL",
            None,
        ),
        recipient_list=[user.email],
        fail_silently=False,
    )

    return Response(
        {
            "status": "success",
            "message": generic_success_message,
        },
        status=status.HTTP_200_OK,
    )


# =========================
# RESET PASSWORD
# =========================

@api_view(["POST"])
@permission_classes([AllowAny])
def lecturer_reset_password(request):
    uid = str(request.data.get("uid", "")).strip()
    token = str(request.data.get("token", "")).strip()
    password = str(request.data.get("password", ""))
    confirm_password = str(
        request.data.get(
            "confirm_password",
            "",
        )
    )

    if (
        not uid
        or not token
        or not password
        or not confirm_password
    ):
        return Response(
            {
                "status": "error",
                "message": "All fields are required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if password != confirm_password:
        return Response(
            {
                "status": "error",
                "message": "Passwords do not match.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    User = get_user_model()

    try:
        user_id = force_str(
            urlsafe_base64_decode(uid)
        )

        user = User.objects.get(
            pk=user_id,
            is_active=True,
        )

    except (
        TypeError,
        ValueError,
        OverflowError,
        User.DoesNotExist,
    ):
        return Response(
            {
                "status": "error",
                "message": (
                    "This password reset link is invalid "
                    "or has expired."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not default_token_generator.check_token(
        user,
        token,
    ):
        return Response(
            {
                "status": "error",
                "message": (
                    "This password reset link is invalid "
                    "or has expired."
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        validate_password(
            password,
            user=user,
        )

    except ValidationError as error:
        return Response(
            {
                "status": "error",
                "message": (
                    "Password does not meet "
                    "the requirements."
                ),
                "errors": list(
                    error.messages
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(password)
    user.save()

    # Invalidate any existing DRF auth token.
    Token.objects.filter(
        user=user
    ).delete()

    return Response(
        {
            "status": "success",
            "message": (
                "Password reset successfully. "
                "You can now sign in using "
                "your new password."
            ),
        },
        status=status.HTTP_200_OK,
    )
