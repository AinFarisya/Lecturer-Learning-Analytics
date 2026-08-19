import json
import sys
import tempfile
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


def dataframe_to_records(df):
    return json.loads(
        df.to_json(orient="records")
    )


def process_assessment_upload(uploaded_file):
    temp_path = None

    try:
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

            temp_path = Path(temp_file.name)

        if not validate_excel(str(temp_path)):
            raise ValueError(
                "Uploaded Excel file failed validation."
            )

        assessment, students, mapping = (
            load_template(temp_path)
        )

        assessment_analytics, _ = (
            calculate_assessment_analytics(
                students,
                assessment,
                mapping
            )
        )

        chapter_analytics, chapter_columns = (
            calculate_chapter_analytics(
                students,
                mapping
            )
        )

        student_analytics = (
            assessment_analytics.merge(
                chapter_analytics,
                on="Student ID",
                how="left"
            )
        )

        assessment_names = (
            assessment["Assessment"]
            .astype(str)
            .tolist()
        )

        (
            assessment_summary,
            chapter_summary,
            overall_summary
        ) = build_class_summaries(
            student_analytics,
            chapter_columns,
            assessment_names
        )

        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Trained model not found: {MODEL_PATH}"
            )

        package = joblib.load(MODEL_PATH)

        model = package["model"]
        feature_columns = package["feature_columns"]
        model_name = package["model_name"]

        missing_features = [
            column
            for column in feature_columns
            if column not in student_analytics.columns
        ]

        if missing_features:
            raise ValueError(
                "Analytics output missing generic ML feature(s): "
                + ", ".join(missing_features)
            )

        X = student_analytics[
            feature_columns
        ].apply(
            pd.to_numeric,
            errors="raise"
        )

        student_analytics[
            "Predicted Risk Level"
        ] = model.predict(X)

        student_analytics[
            "ML Model"
        ] = model_name

        if hasattr(model, "predict_proba"):
            probabilities = model.predict_proba(X)
            classes = getattr(
                model,
                "classes_",
                None
            )

            if classes is not None:
                probability_df = pd.DataFrame(
                    probabilities,
                    columns=[
                        f"Probability {risk}"
                        for risk in classes
                    ],
                    index=student_analytics.index
                )

                for column in probability_df.columns:
                    student_analytics[column] = (
                        probability_df[column]
                        * 100
                    ).round(2)

                student_analytics[
                    "Prediction Confidence %"
                ] = (
                    probability_df.max(axis=1)
                    * 100
                ).round(2)

        counts = (
            student_analytics[
                "Predicted Risk Level"
            ]
            .value_counts()
            .reindex(
                ["Low", "Medium", "High"],
                fill_value=0
            )
        )

        total_students = len(student_analytics)

        risk_distribution = {
            "low": int(counts["Low"]),
            "medium": int(counts["Medium"]),
            "high": int(counts["High"]),
            "low_percentage": round(
                counts["Low"]
                / total_students
                * 100,
                2
            ),
            "medium_percentage": round(
                counts["Medium"]
                / total_students
                * 100,
                2
            ),
            "high_percentage": round(
                counts["High"]
                / total_students
                * 100,
                2
            ),
        }

        weakest_class_chapter = (
            chapter_summary.loc[
                chapter_summary[
                    "Class Average %"
                ].idxmin(),
                "Chapter"
            ]
        )

        strongest_class_chapter = (
            chapter_summary.loc[
                chapter_summary[
                    "Class Average %"
                ].idxmax(),
                "Chapter"
            ]
        )

        return {
            "status": "success",
            "filename": uploaded_file.name,
            "model": model_name,
            "model_version": package.get(
                "model_version",
                "unknown"
            ),
            "total_students": total_students,
            "total_coursework_weightage": float(
                student_analytics[
                    "Total Coursework Weightage %"
                ].iloc[0]
            ),
            "average_coursework_performance": round(
                float(
                    student_analytics[
                        "Coursework Performance %"
                    ].mean()
                ),
                2
            ),
            "weakest_class_chapter": (
                weakest_class_chapter
            ),
            "strongest_class_chapter": (
                strongest_class_chapter
            ),
            "risk_distribution": (
                risk_distribution
            ),
            "assessment_summary": (
                dataframe_to_records(
                    assessment_summary
                )
            ),
            "chapter_summary": (
                dataframe_to_records(
                    chapter_summary
                )
            ),
            "students": (
                dataframe_to_records(
                    student_analytics
                )
            ),
        }

    finally:
        if (
            temp_path is not None
            and temp_path.exists()
        ):
            temp_path.unlink()
