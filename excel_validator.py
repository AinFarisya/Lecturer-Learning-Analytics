from pathlib import Path
import re
import pandas as pd

EXPECTED_SHEETS = [
    "Assessment Structure",
    "Student Marks",
    "Question-Chapter Mapping",
]


def normalize_assessment_column(name: str) -> str:
    """Convert 'Quiz 3' -> 'QUIZ3', 'Assignment 1' -> 'ASSIGNMENT1'."""
    return re.sub(r"[^A-Za-z0-9]", "", str(name)).upper()


def print_results(errors, warnings):
    print("\n--- Validation result ---")

    if errors:
        print(f"FAILED - {len(errors)} error(s) found")
        for i, error in enumerate(errors, start=1):
            print(f"  {i}. {error}")
    else:
        print("PASSED - no validation errors found")

    if warnings:
        print(f"\n{len(warnings)} warning(s)")
        for i, warning in enumerate(warnings, start=1):
            print(f"  {i}. {warning}")


def validate_excel(file_path: str) -> bool:
    file_path = Path(file_path)
    errors = []
    warnings = []

    if not file_path.exists():
        print(f"File not found: {file_path}")
        return False
    with pd.ExcelFile(file_path) as excel_file:
        sheet_names = excel_file.sheet_names

    missing_sheets = [
        sheet for sheet in EXPECTED_SHEETS
        if sheet not in sheet_names
    ]

    if missing_sheets:
        errors.append(
            "Missing required sheet(s): " + ", ".join(missing_sheets)
        )
        print_results(errors, warnings)
        return False

    # Header positions in the current official template.
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

    required_assessment_columns = {
        "Assessment",
        "Assessment Type",
        "Assessment Weightage (%)",
        "Full Marks",
        "Question-Level Chapter Mapping?",
    }

    required_student_columns = {"Student ID"}

    required_mapping_columns = {
        "Column Name",
        "Assessment",
        "Question",
        "Chapter",
        "Full Marks",
    }

    missing = required_assessment_columns - set(assessment.columns)
    if missing:
        errors.append(
            "Assessment Structure missing column(s): "
            + ", ".join(sorted(missing))
        )

    missing = required_student_columns - set(students.columns)
    if missing:
        errors.append(
            "Student Marks missing column(s): "
            + ", ".join(sorted(missing))
        )

    missing = required_mapping_columns - set(mapping.columns)
    if missing:
        errors.append(
            "Question-Chapter Mapping missing column(s): "
            + ", ".join(sorted(missing))
        )

    if errors:
        print_results(errors, warnings)
        return False

    # Keep real rows only.
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

    if assessment.empty:
        errors.append("No assessment rows were found.")

    # ---------------------------------------------------------
    # Student ID checks
    # ---------------------------------------------------------
    if students["Student ID"].isna().any():
        errors.append("Blank Student ID found.")

    duplicate_ids = students.loc[
        students["Student ID"].duplicated(keep=False),
        "Student ID"
    ].dropna().astype(str).unique()

    if len(duplicate_ids) > 0:
        errors.append(
            "Duplicate Student ID(s): "
            + ", ".join(duplicate_ids)
        )

    # ---------------------------------------------------------
    # Assessment structure checks
    # ---------------------------------------------------------
    assessment["Assessment"] = (
        assessment["Assessment"].astype(str).str.strip()
    )

    duplicate_assessments = assessment.loc[
        assessment["Assessment"].duplicated(keep=False),
        "Assessment"
    ].unique()

    if len(duplicate_assessments) > 0:
        errors.append(
            "Duplicate assessment name(s): "
            + ", ".join(duplicate_assessments)
        )

    weightages = pd.to_numeric(
        assessment["Assessment Weightage (%)"],
        errors="coerce"
    )

    full_marks_series = pd.to_numeric(
        assessment["Full Marks"],
        errors="coerce"
    )

    if (weightages <= 0).any():
        errors.append("Every assessment weightage must be greater than 0%.")

    if (full_marks_series <= 0).any():
        errors.append("Every assessment full mark must be greater than 0.")

    total_weight = float(weightages.sum())

    # Flexible: coursework can be 40%, 50%, 60%, etc.
    if total_weight <= 0 or total_weight > 100:
        errors.append(
            f"Total coursework weightage is {total_weight:g}%. "
            "It must be greater than 0% and not exceed 100%."
        )

    # ---------------------------------------------------------
    # Mapping checks
    # ---------------------------------------------------------
    mapping["Column Name"] = (
        mapping["Column Name"].astype(str).str.strip()
    )
    mapping["Assessment"] = (
        mapping["Assessment"].astype(str).str.strip()
    )

    duplicate_mappings = mapping.loc[
        mapping["Column Name"].duplicated(keep=False),
        "Column Name"
    ].unique()

    if len(duplicate_mappings) > 0:
        errors.append(
            "Duplicate mapping column(s): "
            + ", ".join(duplicate_mappings)
        )

    assessment_lookup = {
        row["Assessment"]: row
        for _, row in assessment.iterrows()
    }

    for _, map_row in mapping.iterrows():
        mapped_assessment = map_row["Assessment"]

        if mapped_assessment not in assessment_lookup:
            errors.append(
                f"Mapping refers to unknown assessment: "
                f"{mapped_assessment}"
            )
            continue

        flag = str(
            assessment_lookup[mapped_assessment][
                "Question-Level Chapter Mapping?"
            ]
        ).strip().lower()

        if flag not in {"yes", "y", "true", "1"}:
            errors.append(
                f"{mapped_assessment} has question mapping rows "
                "but is not marked Yes for question-level mapping."
            )

        if map_row["Column Name"] not in students.columns:
            errors.append(
                f"Mapped column '{map_row['Column Name']}' "
                "does not exist in Student Marks."
            )

        if float(map_row["Full Marks"]) <= 0:
            errors.append(
                f"{map_row['Column Name']}: mapping full mark "
                "must be greater than 0."
            )

    # ---------------------------------------------------------
    # Validate every assessment dynamically
    # ---------------------------------------------------------
    for _, row in assessment.iterrows():
        assessment_name = row["Assessment"]
        full_mark = float(row["Full Marks"])
        mapping_flag = str(
            row["Question-Level Chapter Mapping?"]
        ).strip().lower()

        if mapping_flag in {"yes", "y", "true", "1"}:
            mapped_rows = mapping[
                mapping["Assessment"] == assessment_name
            ]

            if mapped_rows.empty:
                errors.append(
                    f"{assessment_name}: no question mappings found."
                )
                continue

            mapped_total = pd.to_numeric(
                mapped_rows["Full Marks"],
                errors="coerce"
            ).sum()

            if abs(mapped_total - full_mark) > 1e-9:
                errors.append(
                    f"{assessment_name}: mapped question full marks "
                    f"total {mapped_total:g}, but Assessment Structure "
                    f"full mark is {full_mark:g}."
                )

            # Detect any question columns in Student Marks that belong
            # to this assessment but were forgotten in the mapping.
            prefix = normalize_assessment_column(assessment_name) + "_Q"
            detected_question_columns = [
                str(column)
                for column in students.columns
                if str(column).upper().startswith(prefix)
            ]

            mapped_columns = set(
                mapped_rows["Column Name"].astype(str)
            )

            unmapped = sorted(
                set(detected_question_columns) - mapped_columns
            )

            if unmapped:
                errors.append(
                    f"{assessment_name}: question column(s) missing "
                    "from Question-Chapter Mapping: "
                    + ", ".join(unmapped)
                )

            # Validate question marks.
            for _, mapped_row in mapped_rows.iterrows():
                column = str(mapped_row["Column Name"])
                question_full_mark = float(mapped_row["Full Marks"])

                if column not in students.columns:
                    continue

                values = pd.to_numeric(
                    students[column],
                    errors="coerce"
                )

                invalid_text = students[column].notna() & values.isna()
                if invalid_text.any():
                    errors.append(
                        f"{column}: contains non-numeric mark(s)."
                    )
                    continue

                if (values < 0).any():
                    errors.append(
                        f"{column}: contains negative mark(s)."
                    )

                if (values > question_full_mark).any():
                    errors.append(
                        f"{column}: contains mark(s) above "
                        f"the full mark {question_full_mark:g}."
                    )

        else:
            # Overall-score assessment such as Quiz 1, Quiz 3,
            # Assignment, Project, etc.
            column = normalize_assessment_column(assessment_name)

            if column not in students.columns:
                errors.append(
                    f"{assessment_name}: expected Student Marks "
                    f"column '{column}' was not found."
                )
                continue

            values = pd.to_numeric(
                students[column],
                errors="coerce"
            )

            invalid_text = students[column].notna() & values.isna()
            if invalid_text.any():
                errors.append(
                    f"{column}: contains non-numeric mark(s)."
                )
                continue

            if (values < 0).any():
                errors.append(
                    f"{column}: contains negative mark(s)."
                )

            if (values > full_mark).any():
                errors.append(
                    f"{column}: contains mark(s) above "
                    f"the full mark {full_mark:g}."
                )

    # Summary
    print("\n--- Excel file summary ---")
    print(f"File: {file_path.name}")
    print(f"Students detected: {len(students)}")
    print(f"Assessments detected: {len(assessment)}")
    print(f"Total coursework weightage: {total_weight:g}%")
    print(f"Mapped question rows detected: {len(mapping)}")

    chapters = sorted(
        mapping["Chapter"].dropna().astype(str).unique()
    )
    print(
        "Mapped chapters: "
        + (", ".join(chapters) if chapters else "None")
    )

    print_results(errors, warnings)
    return len(errors) == 0


if __name__ == "__main__":
    FILE = "FYP_Learning_Analytics_Excel_Template_TEST.xlsx"
    validate_excel(FILE)
