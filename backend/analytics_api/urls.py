from django.urls import path

from .views import (
    health_check,
    analysis_list,
    analysis_detail,
    class_latest_analysis,
    UploadAssessmentView,
)

from .auth_views import (
    lecturer_login,
    lecturer_logout,
    lecturer_signup,
    lecturer_forgot_password,
    lecturer_reset_password,
)

from .profile_views import (
    lecturer_profile,
)

from .class_views import (
    class_list,
    class_detail,
    archive_class,
    class_history,
    restore_class,
)


urlpatterns = [

    # =====================================================
    # HEALTH
    # =====================================================
    path(
        "health/",
        health_check,
        name="health-check"
    ),


    # =====================================================
    # AUTHENTICATION
    # =====================================================
    path(
        "login/",
        lecturer_login,
        name="lecturer-login"
    ),

    path(
        "logout/",
        lecturer_logout,
        name="lecturer-logout"
    ),

    path(
        "signup/",
        lecturer_signup,
        name="lecturer-signup"
    ),

    path(
        "forgot-password/",
        lecturer_forgot_password,
        name="lecturer-forgot-password"
    ),

    path(
        "reset-password/",
        lecturer_reset_password,
        name="lecturer-reset-password"
    ),


    # =====================================================
    # LECTURER PROFILE
    # =====================================================
    path(
        "profile/",
        lecturer_profile,
        name="lecturer-profile"
    ),


    # =====================================================
    # CLASS MANAGEMENT
    # =====================================================
    path(
        "classes/",
        class_list,
        name="class-list"
    ),

    path(
        "classes/history/",
        class_history,
        name="class-history"
    ),

    path(
        "classes/<int:class_id>/",
        class_detail,
        name="class-detail"
    ),

    path(
        "classes/<int:class_id>/archive/",
        archive_class,
        name="archive-class"
    ),

    path(
        "classes/<int:class_id>/restore/",
        restore_class,
        name="restore-class"
    ),


    # =====================================================
    # CLASS ANALYTICS
    # =====================================================
    path(
        "classes/<int:class_id>/latest-analysis/",
        class_latest_analysis,
        name="class-latest-analysis"
    ),


    # =====================================================
    # ANALYSIS
    # =====================================================
    path(
        "analyses/",
        analysis_list,
        name="analysis-list"
    ),

    path(
        "analyses/<int:analysis_id>/",
        analysis_detail,
        name="analysis-detail"
    ),


    # =====================================================
    # UPLOAD
    # =====================================================
    path(
        "upload/",
        UploadAssessmentView.as_view(),
        name="upload-assessment"
    ),
]