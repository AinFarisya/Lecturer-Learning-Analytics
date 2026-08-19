import re

from PIL import Image

from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    parser_classes,
    permission_classes,
)
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import LecturerProfile


# =========================================================
# PROFILE RESPONSE
# =========================================================

def build_profile_response(request, user, profile):

    profile_photo_url = None

    if profile.profile_photo:

        profile_photo_url = request.build_absolute_uri(
            profile.profile_photo.url
        )

    return {
        "id": user.id,
        "name": (
            user.get_full_name()
            or user.username
        ),
        "email": user.email,
        "phone_number": profile.phone_number,
        "profile_photo": profile_photo_url,
    }


# =========================================================
# LECTURER PROFILE
# GET  -> Retrieve profile
# PUT  -> Update profile
# =========================================================

@api_view(["GET", "PUT"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@parser_classes([
    MultiPartParser,
    FormParser,
])
def lecturer_profile(request):

    user = request.user

    profile, created = (
        LecturerProfile.objects.get_or_create(
            lecturer=user
        )
    )


    # =====================================================
    # GET PROFILE
    # =====================================================

    if request.method == "GET":

        return Response(
            {
                "status": "success",
                "profile":
                    build_profile_response(
                        request,
                        user,
                        profile,
                    ),
            },
            status=status.HTTP_200_OK,
        )


    # =====================================================
    # UPDATE PROFILE
    # =====================================================

    name = str(
        request.data.get(
            "name",
            user.get_full_name(),
        )
    ).strip()

    phone_number = str(
        request.data.get(
            "phone_number",
            profile.phone_number,
        )
    ).strip()

    remove_photo = str(
        request.data.get(
            "remove_photo",
            "false",
        )
    ).lower() in [
        "true",
        "1",
        "yes",
    ]


    # =====================================================
    # VALIDATE NAME
    # =====================================================

    if not name:

        return Response(
            {
                "status": "error",
                "message":
                    "Full name is required.",
            },
            status=
                status.HTTP_400_BAD_REQUEST,
        )


    # =====================================================
    # VALIDATE PHONE NUMBER
    # =====================================================

    if phone_number:

        phone_pattern = (
            r"^[0-9+\-\s()]{7,30}$"
        )

        if not re.match(
            phone_pattern,
            phone_number,
        ):

            return Response(
                {
                    "status": "error",
                    "message":
                        "Please enter a valid phone number.",
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )


    # =====================================================
    # UPDATE NAME
    # =====================================================

    user.first_name = name
    user.save(
        update_fields=[
            "first_name"
        ]
    )


    # =====================================================
    # UPDATE PHONE
    # =====================================================

    profile.phone_number = phone_number


    # =====================================================
    # REMOVE PROFILE PHOTO
    # =====================================================

    if remove_photo:

        if profile.profile_photo:

            profile.profile_photo.delete(
                save=False
            )

        profile.profile_photo = None


    # =====================================================
    # UPLOAD / REPLACE PROFILE PHOTO
    # =====================================================

    uploaded_photo = (
        request.FILES.get(
            "profile_photo"
        )
    )

    if uploaded_photo:

        allowed_types = [
            "image/jpeg",
            "image/png",
        ]

        if (
            uploaded_photo.content_type
            not in allowed_types
        ):

            return Response(
                {
                    "status": "error",
                    "message":
                        "Profile photo must be a JPG, JPEG, or PNG image.",
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        max_size = (
            2 * 1024 * 1024
        )

        if uploaded_photo.size > max_size:

            return Response(
                {
                    "status": "error",
                    "message":
                        "Profile photo must not exceed 2 MB.",
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        try:

            image = Image.open(
                uploaded_photo
            )

            image.verify()

            uploaded_photo.seek(0)

        except Exception:

            return Response(
                {
                    "status": "error",
                    "message":
                        "The uploaded file is not a valid image.",
                },
                status=
                    status.HTTP_400_BAD_REQUEST,
            )


        if profile.profile_photo:

            profile.profile_photo.delete(
                save=False
            )


        profile.profile_photo = (
            uploaded_photo
        )


    profile.save()


    return Response(
        {
            "status": "success",
            "message":
                "Profile updated successfully.",
            "profile":
                build_profile_response(
                    request,
                    user,
                    profile,
                ),
        },
        status=status.HTTP_200_OK,
    )