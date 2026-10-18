import gc
import json
import sys
import tempfile
from functools import lru_cache
from pathlib import Path

import joblib
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[2]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


from excel_validator import validate_excel
from analytics_processor import (
    load_template,
    calculate_assessment_analytics,
    calculate_chapter_analytics,
    build_class_summaries,
)


MODEL_PATH = PROJECT_ROOT / "best_risk_model.pkl"


# =========================================================
# DATAFRAME -> JSON-SAFE RECORDS
# =========================================================

def dataframe_to_records(df):
    return json.loads(
        df.to_json(
            orient="records"
        )
    )


# =========================================================
# LOAD ML MODEL
#
# Load only once per Django worker instead of loading the
# .pkl file again for every assessment upload.
# =========================================================

@lru_cache(maxsize=1)
def load_model_package():

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Trained model not found: {MODEL_PATH}"
        )

    return joblib.load(
        MODEL_PATH
    )


# =========================================================
# PROCESS ASSESSMENT UPLOAD
# =========================================================

def process_assessment_upload(uploaded_file):

    temp_path = None

    try:

        # =================================================
        # SAVE UPLOADED FILE TEMPORARILY
        # =================================================

        suffix = (
            Path(uploaded_file.name).suffix
            or ".xlsx"
        )

        with tempfile.NamedTemporaryFile(
            suffix=suffix,
            delete=False
        ) as temp_file:

            for chunk in uploaded_file.chunks():
                temp_file.write(chunk)

            temp_path = Path(
                temp_file.name
            )


        # =================================================
        # VALIDATE EXCEL
        # =================================================

        if not validate_excel(
            str(temp_path)
        ):

            raise ValueError(
                "Uploaded Excel file failed validation."
            )


        # =================================================
        # LOAD EXCEL TEMPLATE
        # =================================================

        assessment, students, mapping = (
            load_template(
                temp_path
            )
        )


        # =================================================
        # ASSESSMENT ANALYTICS
        # =================================================

        assessment_analytics, _ = (
            calculate_assessment_analytics(
                students,
                assessment,
                mapping,
            )
        )


        # =================================================
        # CHAPTER ANALYTICS
        # =================================================

        chapter_analytics, chapter_columns = (
            calculate_chapter_analytics(
                students,
                mapping,
            )
        )


        # =================================================
        # COMBINE STUDENT ANALYTICS
        # =================================================

        student_analytics = (
            assessment_analytics.merge(
                chapter_analytics,
                on="Student ID",
                how="left",
            )
        )


        assessment_names = (
            assessment[
                "Assessment"
            ]
            .astype(str)
            .tolist()
        )


        # =================================================
        # BUILD CLASS SUMMARIES
        # =================================================

        (
            assessment_summary,
            chapter_summary,
            _
        ) = build_class_summaries(
            student_analytics,
            chapter_columns,
            assessment_names,
        )


        # =================================================
        # RELEASE EXCEL INTERMEDIATE OBJECTS
        #
        # They are no longer required after analytics have
        # been calculated. Releasing them BEFORE loading
        # the ML model reduces peak memory usage.
        # =================================================

        del assessment
        del students
        del mapping
        del assessment_analytics
        del chapter_analytics
        del assessment_names

        gc.collect()


        # =================================================
        # LOAD ML MODEL
        # =================================================

        package = (
            load_model_package()
        )

        model = package[
            "model"
        ]

        feature_columns = package[
            "feature_columns"
        ]

        model_name = package[
            "model_name"
        ]


        # =================================================
        # CHECK ML FEATURES
        # =================================================

        missing_features = [
            column
            for column in feature_columns
            if column not in student_analytics.columns
        ]

        if missing_features:

            raise ValueError(
                "Analytics output missing generic ML feature(s): "
                + ", ".join(
                    missing_features
                )
            )


        # =================================================
        # PREPARE MODEL INPUT
        # =================================================

        X = (
            student_analytics[
                feature_columns
            ]
            .apply(
                pd.to_numeric,
                errors="raise",
            )
        )


        # =================================================
        # RISK PREDICTION
        # =================================================

        student_analytics[
            "Predicted Risk Level"
        ] = model.predict(
            X
        )


        student_analytics[
            "ML Model"
        ] = model_name


        # =================================================
        # PREDICTION PROBABILITIES
        #
        # Avoid creating another DataFrame because that
        # unnecessarily duplicates the probability data.
        # =================================================

        if hasattr(
            model,
            "predict_proba",
        ):

            probabilities = (
                model.predict_proba(
                    X
                )
            )

            classes = getattr(
                model,
                "classes_",
                None,
            )

            if classes is not None:

                for index, risk in enumerate(
                    classes
                ):

                    student_analytics[
                        f"Probability {risk}"
                    ] = (
                        probabilities[
                            :,
                            index
                        ]
                        * 100
                    ).round(2)


                student_analytics[
                    "Prediction Confidence %"
                ] = (
                    probabilities.max(
                        axis=1
                    )
                    * 100
                ).round(2)


            del probabilities


        # X is no longer required
        del X

        gc.collect()


        # =================================================
        # RISK DISTRIBUTION
        # =================================================

        counts = (
            student_analytics[
                "Predicted Risk Level"
            ]
            .value_counts()
            .reindex(
                [
                    "Low",
                    "Medium",
                    "High",
                ],
                fill_value=0,
            )
        )


        total_students = len(
            student_analytics
        )


        risk_distribution = {
            "low": int(
                counts["Low"]
            ),

            "medium": int(
                counts["Medium"]
            ),

            "high": int(
                counts["High"]
            ),

            "low_percentage": round(
                counts["Low"]
                / total_students
                * 100,
                2,
            ),

            "medium_percentage": round(
                counts["Medium"]
                / total_students
                * 100,
                2,
            ),

            "high_percentage": round(
                counts["High"]
                / total_students
                * 100,
                2,
            ),
        }


        # =================================================
        # WEAKEST / STRONGEST CHAPTER
        # =================================================

        weakest_class_chapter = (
            chapter_summary.loc[
                chapter_summary[
                    "Class Average %"
                ].idxmin(),
                "Chapter",
            ]
        )


        strongest_class_chapter = (
            chapter_summary.loc[
                chapter_summary[
                    "Class Average %"
                ].idxmax(),
                "Chapter",
            ]
        )


        # =================================================
        # TOP-LEVEL VALUES
        # =================================================

        total_coursework_weightage = float(
            student_analytics[
                "Total Coursework Weightage %"
            ].iloc[0]
        )


        average_coursework_performance = round(
            float(
                student_analytics[
                    "Coursework Performance %"
                ].mean()
            ),
            2,
        )


        # =================================================
        # CONVERT DATAFRAMES TO RECORDS
        # =================================================

        assessment_records = (
            dataframe_to_records(
                assessment_summary
            )
        )

        del assessment_summary

        gc.collect()


        chapter_records = (
            dataframe_to_records(
                chapter_summary
            )
        )

        del chapter_summary

        gc.collect()


        student_records = (
            dataframe_to_records(
                student_analytics
            )
        )

        del student_analytics
        del counts

        gc.collect()


        # =================================================
        # FINAL RESPONSE
        # =================================================

        result = {
            "status": "success",

            "filename":
                uploaded_file.name,

            "model":
                model_name,

            "model_version":
                package.get(
                    "model_version",
                    "unknown",
                ),

            "total_students":
                total_students,

            "total_coursework_weightage":
                total_coursework_weightage,

            "average_coursework_performance":
                average_coursework_performance,

            "weakest_class_chapter":
                weakest_class_chapter,

            "strongest_class_chapter":
                strongest_class_chapter,

            "risk_distribution":
                risk_distribution,

            "assessment_summary":
                assessment_records,

            "chapter_summary":
                chapter_records,

            "students":
                student_records,
        }


        return result


    # =====================================================
    # CLEAN TEMPORARY FILE
    # =====================================================

    finally:

        if (
            temp_path is not None
            and temp_path.exists()
        ):

            temp_path.unlink()

        gc.collect()