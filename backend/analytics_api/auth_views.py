import logging
import os

import requests

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.utils.encoding import force_bytes, force_str
from django.utils.html import escape
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


logger = logging.getLogger(__name__)


# =====================================================
# RESEND EMAIL HELPER
# =====================================================

def send_brevo_email(
    recipient_email,
    subject,
    html_message,
):
    api_key = os.getenv(
        "BREVO_API_KEY",
        "",
    ).strip()

    if not api_key:
        raise RuntimeError(
            "BREVO_API_KEY is not configured."
        )

    from_email = os.getenv(
        "BREVO_FROM_EMAIL",
        "",
    ).strip()

    from_name = os.getenv(
        "BREVO_FROM_NAME",
        "Learning Analytics",
    ).strip()

    if not from_email:
        raise RuntimeError(
            "BREVO_FROM_EMAIL is not configured."
        )

    payload = {
        "sender": {
            "name": from_name,
            "email": from_email,
        },
        "to": [
            {
                "email": recipient_email,
            }
        ],
        "subject": subject,
        "htmlContent": html_message,
    }

    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json",
    }

    try:
        response = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            headers=headers,
            json=payload,
            timeout=20,
        )

        if response.status_code != 201:

            logger.error(
                "Brevo API error %s: %s",
                response.status_code,
                response.text,
            )

            raise RuntimeError(
                "Brevo rejected the email request."
            )

        logger.info(
            "Password reset email sent through Brevo."
        )

        return response.json()

    except requests.RequestException as error:

        logger.exception(
            "Brevo email request failed: %s",
            error,
        )

        raise RuntimeError(
            "Unable to connect to Brevo."
        ) from error

# =====================================================
# SIGN UP
# =====================================================

@api_view(["POST"])
@permission_classes([AllowAny])
def lecturer_signup(request):

    name = str(
        request.data.get(
            "name",
            "",
        )
    ).strip()

    email = str(
        request.data.get(
            "email",
            "",
        )
    ).strip().lower()

    password = str(
        request.data.get(
            "password",
            "",
        )
    )

    confirm_password = str(
        request.data.get(
            "confirm_password",
            "",
        )
    )

    if (
        not name
        or not email
        or not password
        or not confirm_password
    ):

        return Response(
            {
                "status": "error",
                "message":
                    "All fields are required.",
            },
            status=(
                status.HTTP_400_BAD_REQUEST
            ),
        )

    if password != confirm_password:

        return Response(
            {
                "status": "error",
                "message":
                    "Passwords do not match.",
            },
            status=(
                status.HTTP_400_BAD_REQUEST
            ),
        )

    User = get_user_model()

    if User.objects.filter(
        email__iexact=email
    ).exists():

        return Response(
            {
                "status": "error",
                "message":
                    (
                        "An account with this "
                        "email already exists."
                    ),
            },
            status=(
                status.HTTP_400_BAD_REQUEST
            ),
        )

    user = User(
        username=email,
        email=email,
        first_name=name,
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
                "message":
                    (
                        "Password does not meet "
                        "the requirements."
                    ),
                "errors":
                    list(error.messages),
            },
            status=(
                status.HTTP_400_BAD_REQUEST
            ),
        )

    user.set_password(
        password
    )

    user.save()

    token = Token.objects.create(
        user=user
    )

    return Response(
        {
            "status": "success",
            "message":
                "Account created successfully.",
            "token":
                token.key,
            "lecturer": {
                "id":
                    user.id,
                "name":
                    (
                        user.get_full_name()
                        or user.username
                    ),
                "email":
                    user.email,
            },
        },
        status=(
            status.HTTP_201_CREATED
        ),
    )


# =====================================================
# LOGIN
# =====================================================

@api_view(["POST"])
@permission_classes([AllowAny])
def lecturer_login(request):

    email = str(
        request.data.get(
            "email",
            "",
        )
    ).strip().lower()

    password = str(
        request.data.get(
            "password",
            "",
        )
    )

    if not email or not password:

        return Response(
            {
                "status": "error",
                "message":
                    (
                        "Email and password "
                        "are required."
                    ),
            },
            status=(
                status.HTTP_400_BAD_REQUEST
            ),
        )

    User = get_user_model()

    try:
        user = User.objects.get(
            email__iexact=email
        )

    except User.DoesNotExist:

        return Response(
            {
                "status": "error",
                "message":
                    (
                        "Invalid email "
                        "or password."
                    ),
            },
            status=(
                status.HTTP_401_UNAUTHORIZED
            ),
        )

    if not user.check_password(
        password
    ):

        return Response(
            {
                "status": "error",
                "message":
                    (
                        "Invalid email "
                        "or password."
                    ),
            },
            status=(
                status.HTTP_401_UNAUTHORIZED
            ),
        )

    if not user.is_active:

        return Response(
            {
                "status": "error",
                "message":
                    "This account is inactive.",
            },
            status=(
                status.HTTP_403_FORBIDDEN
            ),
        )

    token, created = (
        Token.objects.get_or_create(
            user=user
        )
    )

    return Response(
        {
            "status": "success",
            "message":
                "Login successful.",
            "token":
                token.key,
            "lecturer": {
                "id":
                    user.id,
                "name":
                    (
                        user.get_full_name()
                        or user.username
                    ),
                "email":
                    user.email,
            },
        },
        status=status.HTTP_200_OK,
    )


# =====================================================
# LOGOUT
# =====================================================

@api_view(["POST"])
@authentication_classes(
    [TokenAuthentication]
)
@permission_classes(
    [IsAuthenticated]
)
def lecturer_logout(request):

    if request.auth:
        request.auth.delete()

    return Response(
        {
            "status": "success",
            "message":
                "Logout successful.",
        },
        status=status.HTTP_200_OK,
    )


# =====================================================
# FORGOT PASSWORD
# =====================================================

@api_view(["POST"])
@permission_classes([AllowAny])
def lecturer_forgot_password(request):

    email = str(
        request.data.get(
            "email",
            "",
        )
    ).strip().lower()

    if not email:

        return Response(
            {
                "status": "error",
                "message":
                    (
                        "Email address "
                        "is required."
                    ),
            },
            status=(
                status.HTTP_400_BAD_REQUEST
            ),
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
        "If an account exists for this "
        "email address, a password reset "
        "link has been sent."
    )

    if not user:

        return Response(
            {
                "status": "success",
                "message":
                    generic_success_message,
            },
            status=status.HTTP_200_OK,
        )

    # -------------------------------------------------
    # Generate Django password-reset UID and token
    # -------------------------------------------------

    uid = urlsafe_base64_encode(
        force_bytes(
            user.pk
        )
    )

    token = (
        default_token_generator
        .make_token(
            user
        )
    )

    # -------------------------------------------------
    # Build frontend reset URL
    # -------------------------------------------------

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

    # -------------------------------------------------
    # Plain-text email
    # -------------------------------------------------

    text_message = (
        f"Hello {lecturer_name},\n\n"
        "We received a request to reset "
        "the password for your Learning "
        "Analytics account.\n\n"
        "Use the link below to create "
        "a new password:\n\n"
        f"{reset_url}\n\n"
        "If you did not request a password "
        "reset, you can safely ignore "
        "this email.\n\n"
        "Learning Analytics System"
    )

    # -------------------------------------------------
    # HTML email
    # -------------------------------------------------

    safe_name = escape(
        lecturer_name
    )

    safe_reset_url = escape(
        reset_url
    )

    html_message = f"""
    <div style="
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: 0 auto;
        color: #222222;
        line-height: 1.6;
    ">
        <h2>
            Learning Analytics Password Reset
        </h2>

        <p>
            Hello {safe_name},
        </p>

        <p>
            We received a request to reset
            the password for your Learning
            Analytics account.
        </p>

        <p>
            Click the button below to create
            a new password.
        </p>

        <p style="margin: 28px 0;">
            <a
                href="{safe_reset_url}"
                style="
                    background: #5f4dee;
                    color: #ffffff;
                    padding: 12px 20px;
                    border-radius: 6px;
                    text-decoration: none;
                    display: inline-block;
                    font-weight: bold;
                "
            >
                Reset Password
            </a>
        </p>

        <p>
            If the button does not work,
            copy and paste this link into
            your browser:
        </p>

        <p style="
            word-break: break-all;
            font-size: 13px;
        ">
            {safe_reset_url}
        </p>

        <p>
            If you did not request a password
            reset, you can safely ignore
            this email.
        </p>

        <hr style="
            margin-top: 30px;
            border: none;
            border-top: 1px solid #dddddd;
        ">

        <p style="
            font-size: 12px;
            color: #777777;
        ">
            Learning Analytics System
        </p>
    </div>
    """

    # -------------------------------------------------
    # Send through Resend HTTPS API
    # -------------------------------------------------

    try:

       send_brevo_email(
    recipient_email=
        user.email,
    subject=
        subject,
    html_message=
        html_message,
)

    except Exception:

        # Full technical details remain in Render logs.
        # Do not expose API details to the frontend.
        logger.exception(
            (
                "Failed to send password "
                "reset email for user ID %s"
            ),
            user.id,
        )

        return Response(
            {
                "status": "error",
                "message":
                    (
                        "The password reset "
                        "email could not be sent "
                        "at this time. Please "
                        "try again."
                    ),
            },
            status=(
                status.HTTP_502_BAD_GATEWAY
            ),
        )

    return Response(
        {
            "status": "success",
            "message":
                generic_success_message,
        },
        status=status.HTTP_200_OK,
    )


# =====================================================
# RESET PASSWORD
# =====================================================

@api_view(["POST"])
@permission_classes([AllowAny])
def lecturer_reset_password(request):

    uid = str(
        request.data.get(
            "uid",
            "",
        )
    ).strip()

    token = str(
        request.data.get(
            "token",
            "",
        )
    ).strip()

    password = str(
        request.data.get(
            "password",
            "",
        )
    )

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
                "message":
                    "All fields are required.",
            },
            status=(
                status.HTTP_400_BAD_REQUEST
            ),
        )

    if password != confirm_password:

        return Response(
            {
                "status": "error",
                "message":
                    "Passwords do not match.",
            },
            status=(
                status.HTTP_400_BAD_REQUEST
            ),
        )

    User = get_user_model()

    try:

        user_id = force_str(
            urlsafe_base64_decode(
                uid
            )
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
                "message":
                    (
                        "This password reset "
                        "link is invalid or "
                        "has expired."
                    ),
            },
            status=(
                status.HTTP_400_BAD_REQUEST
            ),
        )

    if not (
        default_token_generator
        .check_token(
            user,
            token,
        )
    ):

        return Response(
            {
                "status": "error",
                "message":
                    (
                        "This password reset "
                        "link is invalid or "
                        "has expired."
                    ),
            },
            status=(
                status.HTTP_400_BAD_REQUEST
            ),
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
                "message":
                    (
                        "Password does not meet "
                        "the requirements."
                    ),
                "errors":
                    list(
                        error.messages
                    ),
            },
            status=(
                status.HTTP_400_BAD_REQUEST
            ),
        )

    user.set_password(
        password
    )

    user.save()

    # Invalidate any existing DRF auth token.
    Token.objects.filter(
        user=user
    ).delete()

    return Response(
        {
            "status": "success",
            "message":
                (
                    "Password reset successfully. "
                    "You can now sign in using "
                    "your new password."
                ),
        },
        status=status.HTTP_200_OK,
    )