from pathlib import Path
import joblib
import pandas as pd

ANALYTICS_FILE = Path("analytics_results.xlsx")
MODEL_FILE = Path("best_risk_model.pkl")
OUTPUT_FILE = Path("student_risk_predictions.xlsx")


def main():
    if not ANALYTICS_FILE.exists():
        raise FileNotFoundError(
            "analytics_results.xlsx not found. "
            "Run analytics_processor.py first."
        )

    if not MODEL_FILE.exists():
        raise FileNotFoundError(
            "best_risk_model.pkl not found. "
            "Run ml_training.py first."
        )

    package = joblib.load(MODEL_FILE)

    model = package["model"]
    feature_columns = package["feature_columns"]
    model_name = package["model_name"]

    data = pd.read_excel(
        ANALYTICS_FILE,
        sheet_name="Student Analytics"
    )

    missing_features = [
        col for col in feature_columns
        if col not in data.columns
    ]

    if missing_features:
        raise ValueError(
            "Missing generic ML feature(s): "
            + ", ".join(missing_features)
        )

    X = data[feature_columns].apply(
        pd.to_numeric,
        errors="raise"
    )

    data["Predicted Risk Level"] = (
        model.predict(X)
    )

    data["ML Model"] = model_name

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(X)
        classes = getattr(model, "classes_", None)

        if classes is not None:
            probability_df = pd.DataFrame(
                probabilities,
                columns=[
                    f"Probability {risk}"
                    for risk in classes
                ],
                index=data.index
            )

            for column in probability_df.columns:
                data[column] = (
                    probability_df[column] * 100
                ).round(2)

            data["Prediction Confidence %"] = (
                probability_df.max(axis=1) * 100
            ).round(2)

    counts = (
        data["Predicted Risk Level"]
        .value_counts()
        .reindex(
            ["Low", "Medium", "High"],
            fill_value=0
        )
    )

    summary = pd.DataFrame({
        "Risk Level": ["Low", "Medium", "High"],
        "Students": [
            int(counts["Low"]),
            int(counts["Medium"]),
            int(counts["High"]),
        ],
    })

    summary["Percentage"] = (
        summary["Students"]
        / len(data)
        * 100
    ).round(2)

    with pd.ExcelWriter(
        OUTPUT_FILE,
        engine="openpyxl"
    ) as writer:
        data.to_excel(
            writer,
            sheet_name="Student Risk Predictions",
            index=False
        )
        summary.to_excel(
            writer,
            sheet_name="Risk Summary",
            index=False
        )

    print("\n--- GENERIC RISK PREDICTION COMPLETE ---")
    print(f"Model: {model_name}")
    print(f"Students: {len(data)}")
    print("\nRisk distribution:")
    print(summary.to_string(index=False))
    print(f"\nOutput created: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
