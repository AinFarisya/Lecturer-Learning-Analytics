from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.generics import GenericAPIView
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    AnalysisUpload,
    LecturerClass,
    StudentResult,
    AssessmentSummary,
    ChapterSummary,
)

from .persistence import save_analysis_result
from .serializers import AssessmentUploadSerializer
from .services import process_assessment_upload


# =========================================================
# HEALTH CHECK - PUBLIC
# =========================================================
@api_view(["GET"])
def health_check(request):

    return Response({
        "status": "ok",
        "message": "Learning Analytics API is running"
    })


# =========================================================
# ANALYSIS HISTORY - LOGIN REQUIRED
# =========================================================
@api_view(["GET"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def analysis_list(request):

    analyses = AnalysisUpload.objects.filter(
        lecturer=request.user
    ).select_related(
        "lecturer_class"
    ).order_by(
        "-uploaded_at"
    )

    data = []

    for analysis in analyses:

        low_count = analysis.students.filter(
            predicted_risk="Low"
        ).count()

        medium_count = analysis.students.filter(
            predicted_risk="Medium"
        ).count()

        high_count = analysis.students.filter(
            predicted_risk="High"
        ).count()

        data.append({
            "analysis_id": analysis.id,

            "class_id": (
                analysis.lecturer_class.id
                if analysis.lecturer_class
                else None
            ),

            "class_code": (
                analysis.lecturer_class.code
                if analysis.lecturer_class
                else ""
            ),

            "class_name": (
                analysis.lecturer_class.name
                if analysis.lecturer_class
                else ""
            ),

            "filename": analysis.filename,

            "uploaded_at":
                analysis.uploaded_at,

            "total_students":
                analysis.total_students,

            "total_coursework_weightage":
                analysis.total_coursework_weightage,

            "average_coursework_performance":
                analysis.average_coursework_performance,

            "weakest_class_chapter":
                analysis.weakest_class_chapter,

            "strongest_class_chapter":
                analysis.strongest_class_chapter,

            "model":
                analysis.model_name,

            "model_version":
                analysis.model_version,

            "risk_distribution": {
                "low": low_count,
                "medium": medium_count,
                "high": high_count,
            }
        })

    return Response({
        "total_analyses": len(data),
        "analyses": data
    })


# =========================================================
# ANALYSIS DETAIL - LOGIN REQUIRED + OWNER ONLY
# =========================================================
@api_view(["GET"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def analysis_detail(request, analysis_id):

    try:

        analysis = AnalysisUpload.objects.select_related(
            "lecturer_class"
        ).get(
            id=analysis_id,
            lecturer=request.user
        )

    except AnalysisUpload.DoesNotExist:

        return Response(
            {
                "status": "error",
                "message": "Analysis not found."
            },
            status=status.HTTP_404_NOT_FOUND
        )


    # -----------------------------------------------------
    # RISK COUNTS
    # -----------------------------------------------------

    low_count = analysis.students.filter(
        predicted_risk="Low"
    ).count()

    medium_count = analysis.students.filter(
        predicted_risk="Medium"
    ).count()

    high_count = analysis.students.filter(
        predicted_risk="High"
    ).count()


    # -----------------------------------------------------
    # ASSESSMENT SUMMARY
    # -----------------------------------------------------

    assessment_summary = []

    for item in analysis.assessment_summaries.all():

        assessment_summary.append({
            "assessment":
                item.assessment_name,

            "class_average":
                item.class_average
        })


    # -----------------------------------------------------
    # CHAPTER SUMMARY
    # -----------------------------------------------------

    chapter_summary = []

    for item in analysis.chapter_summaries.all():

        chapter_summary.append({
            "chapter":
                item.chapter_name,

            "class_average":
                item.class_average
        })


    # -----------------------------------------------------
    # STUDENTS
    # -----------------------------------------------------

    students = []

    for student in analysis.students.all():

        students.append({
            "student_id":
                student.student_id,

            "student_name":
                student.student_name,

            "coursework_performance":
                student.coursework_performance,

            "predicted_risk":
                student.predicted_risk,

            "prediction_confidence":
                student.prediction_confidence,

            "generic_features":
                student.generic_features,

            "assessment_results":
                student.assessment_results,

            "chapter_results":
                student.chapter_results,
        })


    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return Response({

        "analysis_id":
            analysis.id,

        "class_id": (
            analysis.lecturer_class.id
            if analysis.lecturer_class
            else None
        ),

        "class_code": (
            analysis.lecturer_class.code
            if analysis.lecturer_class
            else ""
        ),

        "class_name": (
            analysis.lecturer_class.name
            if analysis.lecturer_class
            else ""
        ),

        "filename":
            analysis.filename,

        "uploaded_at":
            analysis.uploaded_at,

        "total_students":
            analysis.total_students,

        "total_coursework_weightage":
            analysis.total_coursework_weightage,

        "average_coursework_performance":
            analysis.average_coursework_performance,

        "weakest_class_chapter":
            analysis.weakest_class_chapter,

        "strongest_class_chapter":
            analysis.strongest_class_chapter,

        "model":
            analysis.model_name,

        "model_version":
            analysis.model_version,

        "risk_distribution": {
            "low": low_count,
            "medium": medium_count,
            "high": high_count,
        },

        "assessment_summary":
            assessment_summary,

        "chapter_summary":
            chapter_summary,

        "students":
            students,
    })


# =========================================================
# LATEST ANALYSIS FOR SELECTED CLASS
# LOGIN REQUIRED + CLASS OWNER ONLY
# =========================================================
@api_view(["GET"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def class_latest_analysis(request, class_id):

    # -----------------------------------------------------
    # CHECK CLASS OWNERSHIP
    # -----------------------------------------------------

    try:

        lecturer_class = LecturerClass.objects.get(
            id=class_id,
            lecturer=request.user,
        )

    except LecturerClass.DoesNotExist:

        return Response(
            {
                "status": "error",
                "message":
                    "Class not found or you do not have permission to access it."
            },
            status=status.HTTP_404_NOT_FOUND
        )


    # -----------------------------------------------------
    # GET LATEST ANALYSIS FOR THIS CLASS
    # -----------------------------------------------------

    analysis = (
        AnalysisUpload.objects
        .filter(
            lecturer=request.user,
            lecturer_class=lecturer_class,
        )
        .order_by("-uploaded_at")
        .first()
    )


    # -----------------------------------------------------
    # NO ANALYSIS YET
    # -----------------------------------------------------

    if not analysis:

        return Response(
            {
                "status": "success",

                "has_analysis": False,

                "class": {
                    "id":
                        lecturer_class.id,

                    "code":
                        lecturer_class.code,

                    "name":
                        lecturer_class.name,

                    "semester":
                        lecturer_class.semester,

                    "is_archived":
                        lecturer_class.is_archived,
                },

                "analysis": None,
            },
            status=status.HTTP_200_OK
        )


    # -----------------------------------------------------
    # RISK COUNTS
    # -----------------------------------------------------

    low_count = analysis.students.filter(
        predicted_risk="Low"
    ).count()

    medium_count = analysis.students.filter(
        predicted_risk="Medium"
    ).count()

    high_count = analysis.students.filter(
        predicted_risk="High"
    ).count()


    # -----------------------------------------------------
    # ASSESSMENT SUMMARY
    # -----------------------------------------------------

    assessment_summary = []

    for item in analysis.assessment_summaries.all():

        assessment_summary.append({
            "assessment":
                item.assessment_name,

            "class_average":
                item.class_average,
        })


    # -----------------------------------------------------
    # CHAPTER SUMMARY
    # -----------------------------------------------------

    chapter_summary = []

    for item in analysis.chapter_summaries.all():

        chapter_summary.append({
            "chapter":
                item.chapter_name,

            "class_average":
                item.class_average,
        })


    # -----------------------------------------------------
    # STUDENT RESULTS
    # -----------------------------------------------------

    students = []

    for student in analysis.students.all().order_by(
        "student_id"
    ):

        students.append({

            "student_id":
                student.student_id,

            "student_name":
                student.student_name,

            "coursework_performance":
                student.coursework_performance,

            "predicted_risk":
                student.predicted_risk,

            "prediction_confidence":
                student.prediction_confidence,

            "generic_features":
                student.generic_features or {},

            "assessment_results":
                student.assessment_results or {},

            "chapter_results":
                student.chapter_results or {},
        })


    # -----------------------------------------------------
    # RESPONSE
    # -----------------------------------------------------

    return Response(
        {
            "status": "success",

            "has_analysis": True,

            "class": {
                "id":
                    lecturer_class.id,

                "code":
                    lecturer_class.code,

                "name":
                    lecturer_class.name,

                "semester":
                    lecturer_class.semester,

                "is_archived":
                    lecturer_class.is_archived,
            },

            "analysis": {

                "analysis_id":
                    analysis.id,

                "filename":
                    analysis.filename,

                "uploaded_at":
                    analysis.uploaded_at,

                "total_students":
                    analysis.total_students,

                "total_coursework_weightage":
                    analysis.total_coursework_weightage,

                "average_coursework_performance":
                    analysis.average_coursework_performance,

                "weakest_class_chapter":
                    analysis.weakest_class_chapter,

                "strongest_class_chapter":
                    analysis.strongest_class_chapter,

                "model":
                    analysis.model_name,

                "model_version":
                    analysis.model_version,

                "risk_distribution": {
                    "low":
                        low_count,

                    "medium":
                        medium_count,

                    "high":
                        high_count,
                },

                "assessment_summary":
                    assessment_summary,

                "chapter_summary":
                    chapter_summary,

                "students":
                    students,
            },
        },
        status=status.HTTP_200_OK
    )


# =========================================================
# EXCEL UPLOAD - LOGIN REQUIRED
# =========================================================
class UploadAssessmentView(GenericAPIView):

    serializer_class = AssessmentUploadSerializer

    parser_classes = [
        MultiPartParser,
        FormParser,
    ]

    authentication_classes = [
        TokenAuthentication,
    ]

    permission_classes = [
        IsAuthenticated,
    ]


    def post(self, request, *args, **kwargs):

        # -------------------------------------------------
        # VALIDATE REQUEST
        # -------------------------------------------------

        serializer = self.get_serializer(
            data=request.data
        )

        if not serializer.is_valid():

            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )


        # -------------------------------------------------
        # GET FILE + SELECTED CLASS
        # -------------------------------------------------

        uploaded_file = serializer.validated_data[
            "file"
        ]

        class_id = serializer.validated_data[
            "class_id"
        ]


        # -------------------------------------------------
        # CHECK FILE TYPE
        # -------------------------------------------------

        if not uploaded_file.name.lower().endswith(
            ".xlsx"
        ):

            return Response(
                {
                    "status": "error",
                    "message":
                        "Only .xlsx Excel files are allowed."
                },
                status=status.HTTP_400_BAD_REQUEST
            )


        # -------------------------------------------------
        # CHECK CLASS OWNERSHIP + ACTIVE STATUS
        # -------------------------------------------------

        try:

            lecturer_class = LecturerClass.objects.get(
                id=class_id,
                lecturer=request.user,
                is_archived=False,
            )

        except LecturerClass.DoesNotExist:

            return Response(
                {
                    "status": "error",
                    "message":
                        "Active class not found or you do not have permission to access it."
                },
                status=status.HTTP_404_NOT_FOUND
            )


        # -------------------------------------------------
        # PROCESS + SAVE ANALYSIS
        # -------------------------------------------------

        try:

            result = process_assessment_upload(
                uploaded_file
            )


            analysis = save_analysis_result(
                result,
                request.user,
                lecturer_class,
            )


            # Add database information to response
            result["analysis_id"] = analysis.id

            result["class_id"] = lecturer_class.id

            result["class_code"] = lecturer_class.code

            result["class_name"] = lecturer_class.name


            return Response(
                result,
                status=status.HTTP_200_OK
            )


        # -------------------------------------------------
        # VALIDATION / PROCESSING ERROR
        # -------------------------------------------------

        except ValueError as error:

            return Response(
                {
                    "status": "error",
                    "message": str(error)
                },
                status=status.HTTP_400_BAD_REQUEST
            )


        # -------------------------------------------------
        # REQUIRED FILE / MODEL NOT FOUND
        # -------------------------------------------------

        except FileNotFoundError as error:

            return Response(
                {
                    "status": "error",
                    "message": str(error)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


        # -------------------------------------------------
        # UNEXPECTED ERROR
        # -------------------------------------------------

        except Exception as error:

            return Response(
                {
                    "status": "error",
                    "message":
                        "Processing failed: "
                        + str(error)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )