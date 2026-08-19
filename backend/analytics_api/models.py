from django.conf import settings
from django.db import models


# =========================================================
# LECTURER PROFILE
# =========================================================
class LecturerProfile(models.Model):

    lecturer = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="lecturer_profile",
    )

    phone_number = models.CharField(
        max_length=30,
        blank=True,
    )

    profile_photo = models.ImageField(
        upload_to="lecturer_profiles/",
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return (
            self.lecturer.get_full_name()
            or self.lecturer.email
            or self.lecturer.username
        )


# =========================================================
# LECTURER CLASS
# =========================================================
class LecturerClass(models.Model):

    lecturer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="lecturer_classes",
    )

    code = models.CharField(
        max_length=50
    )

    name = models.CharField(
        max_length=255
    )

    semester = models.CharField(
        max_length=100
    )

    is_archived = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    archived_at = models.DateTimeField(
        null=True,
        blank=True
    )

    class Meta:
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "lecturer",
                    "code",
                    "semester",
                ],
                name="unique_class_per_lecturer_semester",
            )
        ]

    def __str__(self):
        return (
            f"{self.code} - "
            f"{self.name} - "
            f"{self.semester}"
        )


# =========================================================
# ANALYSIS UPLOAD
# =========================================================
class AnalysisUpload(models.Model):

    lecturer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="analysis_uploads",
        null=True,
        blank=True,
    )

    lecturer_class = models.ForeignKey(
        LecturerClass,
        on_delete=models.PROTECT,
        related_name="analysis_uploads",
        null=True,
        blank=True,
    )

    filename = models.CharField(
        max_length=255
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True
    )

    total_students = models.PositiveIntegerField()

    total_coursework_weightage = models.FloatField()

    average_coursework_performance = models.FloatField()

    weakest_class_chapter = models.CharField(
        max_length=100,
        blank=True
    )

    strongest_class_chapter = models.CharField(
        max_length=100,
        blank=True
    )

    model_name = models.CharField(
        max_length=100
    )

    model_version = models.CharField(
        max_length=100,
        blank=True
    )

    def __str__(self):
        return (
            f"{self.filename} - "
            f"{self.uploaded_at}"
        )


# =========================================================
# STUDENT RESULT
# =========================================================
class StudentResult(models.Model):

    RISK_CHOICES = [
        ("Low", "Low"),
        ("Medium", "Medium"),
        ("High", "High"),
    ]

    analysis = models.ForeignKey(
        AnalysisUpload,
        on_delete=models.CASCADE,
        related_name="students"
    )

    student_id = models.CharField(
        max_length=100
    )

    student_name = models.CharField(
        max_length=255,
        blank=True
    )

    coursework_performance = models.FloatField()

    predicted_risk = models.CharField(
        max_length=10,
        choices=RISK_CHOICES
    )

    prediction_confidence = models.FloatField(
        null=True,
        blank=True
    )

    # Flexible ML input values
    generic_features = models.JSONField(
        default=dict
    )

    # Flexible assessment results:
    # Test 1, Test 2, Test 3, Quiz 3, etc.
    assessment_results = models.JSONField(
        default=dict
    )

    # Flexible chapter results:
    # Chapter 1 ... Chapter 6, etc.
    chapter_results = models.JSONField(
        default=dict
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "analysis",
                    "student_id"
                ],
                name="unique_student_per_analysis"
            )
        ]

    def __str__(self):
        return (
            f"{self.student_id} - "
            f"{self.predicted_risk}"
        )


# =========================================================
# ASSESSMENT SUMMARY
# =========================================================
class AssessmentSummary(models.Model):

    analysis = models.ForeignKey(
        AnalysisUpload,
        on_delete=models.CASCADE,
        related_name="assessment_summaries"
    )

    assessment_name = models.CharField(
        max_length=100
    )

    class_average = models.FloatField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "analysis",
                    "assessment_name"
                ],
                name="unique_assessment_per_analysis"
            )
        ]

    def __str__(self):
        return self.assessment_name


# =========================================================
# CHAPTER SUMMARY
# =========================================================
class ChapterSummary(models.Model):

    analysis = models.ForeignKey(
        AnalysisUpload,
        on_delete=models.CASCADE,
        related_name="chapter_summaries"
    )

    chapter_name = models.CharField(
        max_length=100
    )

    class_average = models.FloatField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "analysis",
                    "chapter_name"
                ],
                name="unique_chapter_per_analysis"
            )
        ]

    def __str__(self):
        return self.chapter_name
