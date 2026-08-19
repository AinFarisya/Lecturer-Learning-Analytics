from pathlib import Path
import re
import sys
import pandas as pd

WEAK_CHAPTER_THRESHOLD = 50.0


def normalize_assessment_column(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9]", "", str(name)).upper()


def choose_input_file():
    if len(sys.argv) > 1:
        return Path(sys.argv[1])

    candidates = [
        p for p in Path(".").glob("*.xlsx")
        if not p.name.startswith("analytics_results")
        and not p.name.startswith("student_risk_predictions")
        and not p.name.startswith("FYP_ML_Synthetic_Dataset")
        and not p.name.startswith("~$")
    ]

    test_files = [
        p for p in candidates
        if "TEST" in p.name.upper()
    ]

    if len(test_files) == 1:
        return test_files[0]

    if len(candidates) == 1:
        return candidates[0]

    if not candidates:
        raise FileNotFoundError(
            "No suitable Excel input file found."
        )

    raise RuntimeError(
        "More than one possible input Excel file was found. "
        'Run: python analytics_processor.py "filename.xlsx"'
    )


def load_template(file_path: Path):
    assessment = pd.read_excel(
        file_path,
        sheet_name="Assessment Structure",
        header=7
    ).dropna(how="all").dropna(axis=1, how="all")

    students = pd.read_excel(
        file_path,
        sheet_name="Student Marks",
        header=3
    ).dropna(how="all").dropna(axis=1, how="all")

    mapping = pd.read_excel(
        file_path,
        sheet_name="Question-Chapter Mapping",
        header=2
    ).dropna(how="all").dropna(axis=1, how="all")

    assessment = assessment[
        assessment["Assessment Type"].notna()
        & pd.to_numeric(
            assessment["Assessment Weightage (%)"],
            errors="coerce"
        ).notna()
        & pd.to_numeric(
            assessment["Full Marks"],
            errors="coerce"
        ).notna()
    ].copy()

    mapping = mapping[
        mapping["Column Name"].notna()
        & mapping["Assessment"].notna()
        & mapping["Question"].notna()
        & mapping["Chapter"].notna()
        & pd.to_numeric(
            mapping["Full Marks"],
            errors="coerce"
        ).notna()
    ].copy()

    assessment["Assessment"] = (
        assessment["Assessment"].astype(str).str.strip()
    )
    mapping["Assessment"] = (
        mapping["Assessment"].astype(str).str.strip()
    )
    mapping["Column Name"] = (
        mapping["Column Name"].astype(str).str.strip()
    )

    return assessment, students, mapping


def calculate_assessment_analytics(
    students,
    assessment,
    mapping
):
    result = pd.DataFrame({
        "Student ID": students["Student ID"].astype(str)
    })

    if "Student Name/Alias" in students.columns:
        result["Student Name/Alias"] = (
            students["Student Name/Alias"]
        )

    percentage_columns = []
    weighted_columns = []

    for _, row in assessment.iterrows():
        assessment_name = str(row["Assessment"]).strip()
        weightage = float(row["Assessment Weightage (%)"])
        full_mark = float(row["Full Marks"])
        mapping_flag = str(
            row["Question-Level Chapter Mapping?"]
        ).strip().lower()

        percentage_col = f"{assessment_name} %"
        weighted_col = f"{assessment_name} Weighted Mark"

        if mapping_flag in {"yes", "y", "true", "1"}:
            mapped_rows = mapping[
                mapping["Assessment"] == assessment_name
            ]

            question_columns = (
                mapped_rows["Column Name"].astype(str).tolist()
            )

            mapped_full_marks = pd.to_numeric(
                mapped_rows["Full Marks"],
                errors="raise"
            ).sum()

            raw_total = (
                students[question_columns]
                .apply(pd.to_numeric, errors="raise")
                .sum(axis=1)
            )

            percentage = (
                raw_total / mapped_full_marks * 100
            )

        else:
            raw_column = normalize_assessment_column(
                assessment_name
            )

            raw_marks = pd.to_numeric(
                students[raw_column],
                errors="raise"
            )

            percentage = raw_marks / full_mark * 100

        result[percentage_col] = percentage.round(2)
        result[weighted_col] = (
            percentage / 100 * weightage
        ).round(2)

        percentage_columns.append(percentage_col)
        weighted_columns.append(weighted_col)

    total_coursework_weight = float(
        pd.to_numeric(
            assessment["Assessment Weightage (%)"],
            errors="raise"
        ).sum()
    )

    result["Weighted Coursework Mark"] = (
        result[weighted_columns].sum(axis=1)
    ).round(2)

    result["Total Coursework Weightage %"] = (
        total_coursework_weight
    )

    result["Coursework Performance %"] = (
        result["Weighted Coursework Mark"]
        / total_coursework_weight
        * 100
    ).round(2)

    assessment_scores = result[percentage_columns]

    result["Assessment Average %"] = (
        assessment_scores.mean(axis=1)
    ).round(2)

    result["Lowest Assessment Score %"] = (
        assessment_scores.min(axis=1)
    ).round(2)

    result["Assessment Score Std Dev %"] = (
        assessment_scores.std(axis=1, ddof=0)
    ).round(2)

    return result, percentage_columns


def calculate_chapter_analytics(students, mapping):
    chapter_result = pd.DataFrame({
        "Student ID": students["Student ID"].astype(str)
    })

    chapters = list(dict.fromkeys(
        mapping["Chapter"].astype(str).tolist()
    ))

    chapter_columns = []

    for chapter in chapters:
        chapter_map = mapping[
            mapping["Chapter"].astype(str) == chapter
        ]

        question_columns = (
            chapter_map["Column Name"].astype(str).tolist()
        )

        full_marks = pd.to_numeric(
            chapter_map["Full Marks"],
            errors="raise"
        ).sum()

        earned_marks = (
            students[question_columns]
            .apply(pd.to_numeric, errors="raise")
            .sum(axis=1)
        )

        col = f"{chapter} %"

        chapter_result[col] = (
            earned_marks / full_marks * 100
        ).round(2)

        chapter_columns.append(col)

    if not chapter_columns:
        raise ValueError(
            "At least one mapped chapter is required "
            "for chapter analytics."
        )

    chapter_only = chapter_result[chapter_columns]

    chapter_result["Strongest Chapter"] = (
        chapter_only.idxmax(axis=1)
        .str.replace(" %", "", regex=False)
    )

    chapter_result["Weakest Chapter"] = (
        chapter_only.idxmin(axis=1)
        .str.replace(" %", "", regex=False)
    )

    chapter_result["Highest Chapter Score %"] = (
        chapter_only.max(axis=1)
    ).round(2)

    chapter_result["Lowest Chapter Score %"] = (
        chapter_only.min(axis=1)
    ).round(2)

    chapter_result["Average Chapter Score %"] = (
        chapter_only.mean(axis=1)
    ).round(2)

    chapter_result["Number of Chapters"] = (
        len(chapter_columns)
    )

    chapter_result["Number of Weak Chapters"] = (
        chapter_only.lt(WEAK_CHAPTER_THRESHOLD)
        .sum(axis=1)
        .astype(int)
    )

    chapter_result["Weak Chapter Ratio %"] = (
        chapter_result["Number of Weak Chapters"]
        / len(chapter_columns)
        * 100
    ).round(2)

    chapter_result["Chapter Score Std Dev %"] = (
        chapter_only.std(axis=1, ddof=0)
    ).round(2)

    return chapter_result, chapter_columns


def build_class_summaries(
    student_analytics,
    chapter_columns,
    assessment_names
):
    assessment_summary = pd.DataFrame({
        "Assessment": assessment_names,
        "Class Average %": [
            round(
                student_analytics[f"{name} %"].mean(),
                2
            )
            for name in assessment_names
        ]
    })

    chapter_summary = pd.DataFrame({
        "Chapter": [
            col.replace(" %", "")
            for col in chapter_columns
        ],
        "Class Average %": [
            round(student_analytics[col].mean(), 2)
            for col in chapter_columns
        ]
    })

    weakest_class_chapter = chapter_summary.loc[
        chapter_summary["Class Average %"].idxmin(),
        "Chapter"
    ]

    strongest_class_chapter = chapter_summary.loc[
        chapter_summary["Class Average %"].idxmax(),
        "Chapter"
    ]

    overall_summary = pd.DataFrame({
        "Metric": [
            "Total Students",
            "Total Coursework Weightage %",
            "Average Coursework Performance %",
            "Weakest Class Chapter",
            "Strongest Class Chapter",
        ],
        "Value": [
            len(student_analytics),
            student_analytics[
                "Total Coursework Weightage %"
            ].iloc[0],
            round(
                student_analytics[
                    "Coursework Performance %"
                ].mean(),
                2
            ),
            weakest_class_chapter,
            strongest_class_chapter,
        ]
    })

    return (
        assessment_summary,
        chapter_summary,
        overall_summary
    )


def main():
    file_path = choose_input_file()

    try:
        from excel_validator import validate_excel

        print("\nSTEP 1 - VALIDATING EXCEL FILE")

        if not validate_excel(str(file_path)):
            print(
                "\nAnalytics stopped because "
                "the Excel file failed validation."
            )
            return

    except ImportError:
        print(
            "Warning: excel_validator.py not found. "
            "Continuing without validation."
        )

    print("\nSTEP 2 - CALCULATING FLEXIBLE ANALYTICS")

    assessment, students, mapping = load_template(
        file_path
    )

    assessment_analytics, assessment_percentage_columns = (
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

    student_analytics = assessment_analytics.merge(
        chapter_analytics,
        on="Student ID",
        how="left"
    )

    assessment_names = (
        assessment["Assessment"].astype(str).tolist()
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

    output_file = Path("analytics_results.xlsx")

    with pd.ExcelWriter(
        output_file,
        engine="openpyxl"
    ) as writer:
        student_analytics.to_excel(
            writer,
            sheet_name="Student Analytics",
            index=False
        )
        assessment_summary.to_excel(
            writer,
            sheet_name="Assessment Summary",
            index=False
        )
        chapter_summary.to_excel(
            writer,
            sheet_name="Chapter Summary",
            index=False
        )
        overall_summary.to_excel(
            writer,
            sheet_name="Overall Summary",
            index=False
        )

    print("\n--- Flexible analytics completed ---")
    print(f"Students processed: {len(student_analytics)}")
    print(
        "Coursework weightage detected: "
        f"{student_analytics['Total Coursework Weightage %'].iloc[0]:g}%"
    )
    print(
        "Average coursework performance: "
        f"{student_analytics['Coursework Performance %'].mean():.2f}%"
    )
    print(f"Output created: {output_file}")

    print("\nGeneric ML features now available:")
    generic_features = [
        "Coursework Performance %",
        "Assessment Average %",
        "Lowest Assessment Score %",
        "Assessment Score Std Dev %",
        "Average Chapter Score %",
        "Lowest Chapter Score %",
        "Weak Chapter Ratio %",
        "Chapter Score Std Dev %",
    ]

    for feature in generic_features:
        print(f"  - {feature}")


if __name__ == "__main__":
    main()
