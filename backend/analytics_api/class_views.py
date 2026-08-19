from django.utils import timezone

from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import LecturerClass


# =========================================================
# HELPER - CONVERT CLASS OBJECT TO JSON
# =========================================================
def serialize_class(class_obj):

    latest_analysis = (
        class_obj.analysis_uploads
        .order_by("-uploaded_at")
        .first()
    )

    student_count = (
        latest_analysis.total_students
        if latest_analysis
        else 0
    )

    return {
        "id": class_obj.id,
        "code": class_obj.code,
        "name": class_obj.name,
        "semester": class_obj.semester,
        "students": student_count,
        "is_archived": class_obj.is_archived,
        "created_at": class_obj.created_at,
        "updated_at": class_obj.updated_at,
        "archived_at": class_obj.archived_at,
    }


# =========================================================
# ACTIVE CLASSES
# GET  = LIST CURRENT LECTURER'S CLASSES
# POST = CREATE NEW CLASS
# =========================================================
@api_view(["GET", "POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def class_list(request):

    # -----------------------------------------------------
    # GET ACTIVE CLASSES
    # -----------------------------------------------------
    if request.method == "GET":

        classes = LecturerClass.objects.filter(
            lecturer=request.user,
            is_archived=False
        ).order_by("-created_at")

        data = [
            serialize_class(class_obj)
            for class_obj in classes
        ]

        return Response(
            {
                "status": "success",
                "total_classes": len(data),
                "classes": data,
            },
            status=status.HTTP_200_OK
        )

    # -----------------------------------------------------
    # CREATE CLASS
    # -----------------------------------------------------
    code = str(
        request.data.get("code", "")
    ).strip()

    name = str(
        request.data.get("name", "")
    ).strip()

    semester = str(
        request.data.get("semester", "")
    ).strip()

    if not code or not name or not semester:
        return Response(
            {
                "status": "error",
                "message":
                    "Code, class name and semester are required."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    duplicate_exists = LecturerClass.objects.filter(
        lecturer=request.user,
        code__iexact=code,
        semester__iexact=semester,
    ).exists()

    if duplicate_exists:
        return Response(
            {
                "status": "error",
                "message":
                    "This class already exists for this semester."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    new_class = LecturerClass.objects.create(
        lecturer=request.user,
        code=code.upper(),
        name=name,
        semester=semester,
    )

    return Response(
        {
            "status": "success",
            "message": "Class created successfully.",
            "class": serialize_class(new_class),
        },
        status=status.HTTP_201_CREATED
    )


# =========================================================
# CLASS DETAIL
# PUT / PATCH = EDIT CLASS
# DELETE      = PERMANENT DELETE
# =========================================================
@api_view(["GET", "PUT", "PATCH", "DELETE"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def class_detail(request, class_id):

    try:
        class_obj = LecturerClass.objects.get(
            id=class_id,
            lecturer=request.user,
        )

    except LecturerClass.DoesNotExist:
        return Response(
            {
                "status": "error",
                "message": "Class not found."
            },
            status=status.HTTP_404_NOT_FOUND
        )

    # -----------------------------------------------------
    # GET ONE CLASS
    # -----------------------------------------------------
    if request.method == "GET":
        return Response(
            {
                "status": "success",
                "class": serialize_class(class_obj),
            },
            status=status.HTTP_200_OK
        )

    # -----------------------------------------------------
    # EDIT CLASS
    # -----------------------------------------------------
    if request.method in ["PUT", "PATCH"]:

        code = str(
            request.data.get(
                "code",
                class_obj.code
            )
        ).strip()

        name = str(
            request.data.get(
                "name",
                class_obj.name
            )
        ).strip()

        semester = str(
            request.data.get(
                "semester",
                class_obj.semester
            )
        ).strip()

        if not code or not name or not semester:
            return Response(
                {
                    "status": "error",
                    "message":
                        "Code, class name and semester are required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        duplicate_exists = LecturerClass.objects.filter(
            lecturer=request.user,
            code__iexact=code,
            semester__iexact=semester,
        ).exclude(
            id=class_obj.id
        ).exists()

        if duplicate_exists:
            return Response(
                {
                    "status": "error",
                    "message":
                        "Another class with this code and semester already exists."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        class_obj.code = code.upper()
        class_obj.name = name
        class_obj.semester = semester
        class_obj.save()

        return Response(
            {
                "status": "success",
                "message": "Class updated successfully.",
                "class": serialize_class(class_obj),
            },
            status=status.HTTP_200_OK
        )

    # -----------------------------------------------------
    # PERMANENT DELETE
    # -----------------------------------------------------
    if class_obj.analysis_uploads.exists():
        return Response(
            {
                "status": "error",
                "message":
                    "This class contains analysis data and cannot be permanently deleted. Archive it instead."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    class_obj.delete()

    return Response(
        {
            "status": "success",
            "message": "Class permanently deleted."
        },
        status=status.HTTP_200_OK
    )


# =========================================================
# ARCHIVE CLASS
# =========================================================
@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def archive_class(request, class_id):

    try:
        class_obj = LecturerClass.objects.get(
            id=class_id,
            lecturer=request.user,
        )

    except LecturerClass.DoesNotExist:
        return Response(
            {
                "status": "error",
                "message": "Class not found."
            },
            status=status.HTTP_404_NOT_FOUND
        )

    if class_obj.is_archived:
        return Response(
            {
                "status": "error",
                "message": "Class is already archived."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    class_obj.is_archived = True
    class_obj.archived_at = timezone.now()
    class_obj.save()

    return Response(
        {
            "status": "success",
            "message": "Class moved to History.",
            "class": serialize_class(class_obj),
        },
        status=status.HTTP_200_OK
    )


# =========================================================
# CLASS HISTORY
# =========================================================
@api_view(["GET"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def class_history(request):

    classes = LecturerClass.objects.filter(
        lecturer=request.user,
        is_archived=True
    ).order_by("-archived_at")

    data = [
        serialize_class(class_obj)
        for class_obj in classes
    ]

    return Response(
        {
            "status": "success",
            "total_classes": len(data),
            "classes": data,
        },
        status=status.HTTP_200_OK
    )

    # =========================================================
# RESTORE ARCHIVED CLASS
# =========================================================
@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def restore_class(request, class_id):

    try:
        class_obj = LecturerClass.objects.get(
            id=class_id,
            lecturer=request.user,
        )

    except LecturerClass.DoesNotExist:
        return Response(
            {
                "status": "error",
                "message": "Class not found."
            },
            status=status.HTTP_404_NOT_FOUND
        )

    if not class_obj.is_archived:
        return Response(
            {
                "status": "error",
                "message": "Class is already active."
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    class_obj.is_archived = False
    class_obj.archived_at = None
    class_obj.save()

    return Response(
        {
            "status": "success",
            "message": "Class restored successfully.",
            "class": serialize_class(class_obj),
        },
        status=status.HTTP_200_OK
    )