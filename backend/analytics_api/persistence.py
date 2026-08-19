from django.db import transaction

from .models import (
    AnalysisUpload,
    StudentResult,
    AssessmentSummary,
    ChapterSummary,
)


GENERIC_FEATURES = [
    "Coursework Performance %",
    "Assessment Average %",
    "Lowest Assessment Score %",
    "Assessment Score Std Dev %",
    "Average Chapter Score %",
    "Lowest Chapter Score %",
    "Weak Chapter Ratio %",
    "Chapter Score Std Dev %",
]


@transaction.atomic
def save_analysis_result(
    result,
    lecturer,
    lecturer_class,
):
    """
    Save one complete processed Excel analysis.

    The analysis belongs to both:
    - the logged-in lecturer
    - the selected lecturer class

    If any part fails, the whole database
    transaction is rolled back.
    """

    # -------------------------------------------------
    # 1. Save main upload / analysis information
    # -------------------------------------------------
    analysis = AnalysisUpload.objects.create(
        lecturer=lecturer,
        lecturer_class=lecturer_class,
        filename=result["filename"],
        total_students=result["total_students"],
        total_coursework_weightage=result[
            "total_coursework_weightage"
        ],
        average_coursework_performance=result[
            "average_coursework_performance"
        ],
        weakest_class_chapter=result.get(
            "weakest_class_chapter",
            ""
        ),
        strongest_class_chapter=result.get(
            "strongest_class_chapter",
            ""
        ),
        model_name=result["model"],
        model_version=result.get(
            "model_version",
            ""
        ),
    )

    # -------------------------------------------------
    # 2. Save assessment summaries
    # -------------------------------------------------
    assessment_objects = []

    for item in result.get(
        "assessment_summary",
        []
    ):
        assessment_objects.append(
            AssessmentSummary(
                analysis=analysis,
                assessment_name=item[
                    "Assessment"
                ],
                class_average=item[
                    "Class Average %"
                ],
            )
        )

    AssessmentSummary.objects.bulk_create(
        assessment_objects
    )

    # -------------------------------------------------
    # 3. Save chapter summaries
    # -------------------------------------------------
    chapter_objects = []

    for item in result.get(
        "chapter_summary",
        []
    ):
        chapter_objects.append(
            ChapterSummary(
                analysis=analysis,
                chapter_name=item[
                    "Chapter"
                ],
                class_average=item[
                    "Class Average %"
                ],
            )
        )

    ChapterSummary.objects.bulk_create(
        chapter_objects
    )

    # -------------------------------------------------
    # Dynamic assessment / chapter names
    # -------------------------------------------------
    assessment_names = [
        item["Assessment"]
        for item in result.get(
            "assessment_summary",
            []
        )
    ]

    chapter_names = [
        item["Chapter"]
        for item in result.get(
            "chapter_summary",
            []
        )
    ]

    # -------------------------------------------------
    # 4. Save every student
    # -------------------------------------------------
    student_objects = []

    for student in result.get(
        "students",
        []
    ):

        # Generic ML features
        generic_features = {
            feature: student.get(feature)
            for feature in GENERIC_FEATURES
        }

        # Flexible assessment results
        assessment_results = {}

        for assessment_name in assessment_names:

            key = f"{assessment_name} %"

            if key in student:
                assessment_results[
                    assessment_name
                ] = student[key]

        # Flexible chapter results
        chapter_results = {}

        for chapter_name in chapter_names:

            key = f"{chapter_name} %"

            if key in student:
                chapter_results[
                    chapter_name
                ] = student[key]

        confidence = student.get(
            "Prediction Confidence %"
        )

        student_objects.append(
            StudentResult(
                analysis=analysis,

                student_id=str(
                    student[
                        "Student ID"
                    ]
                ),

                student_name=(
                    student.get(
                        "Student Name/Alias"
                    )
                    or ""
                ),

                coursework_performance=student[
                    "Coursework Performance %"
                ],

                predicted_risk=student[
                    "Predicted Risk Level"
                ],

                prediction_confidence=
                    confidence,

                generic_features=
                    generic_features,

                assessment_results=
                    assessment_results,

                chapter_results=
                    chapter_results,
            )
        )

    StudentResult.objects.bulk_create(
        student_objects
    )

    return analysis