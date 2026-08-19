from pathlib import Path
import json
import joblib
import pandas as pd

from sklearn.model_selection import (
    train_test_split,
    StratifiedKFold,
    cross_val_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)

RANDOM_STATE = 42
TEST_SIZE = 0.20
CLASS_ORDER = ["Low", "Medium", "High"]

FEATURE_COLUMNS = [
    "Coursework Performance %",
    "Assessment Average %",
    "Lowest Assessment Score %",
    "Assessment Score Std Dev %",
    "Average Chapter Score %",
    "Lowest Chapter Score %",
    "Weak Chapter Ratio %",
    "Chapter Score Std Dev %",
]

TARGET_COLUMN = "Risk Level"


def main():
    file_path = Path(
        "FYP_ML_Synthetic_Dataset_500_v2_Generic.xlsx"
    )

    if not file_path.exists():
        raise FileNotFoundError(
            f"Dataset not found: {file_path}"
        )

    data = pd.read_excel(
        file_path,
        sheet_name="ML Dataset",
        header=2
    ).dropna(how="all")

    X = data[FEATURE_COLUMNS].copy()
    y = data[TARGET_COLUMN].astype(str)

    print("\nSTEP 1 - GENERIC ML DATASET")
    print(f"Total records: {len(data)}")
    print("\nRisk distribution:")
    print(y.value_counts().reindex(CLASS_ORDER).to_string())

    X_train, X_test, y_train, y_test = (
        train_test_split(
            X,
            y,
            test_size=TEST_SIZE,
            random_state=RANDOM_STATE,
            stratify=y
        )
    )

    print("\nSTEP 2 - TRAIN / TEST SPLIT")
    print(f"Training records: {len(X_train)}")
    print(f"Testing records:  {len(X_test)}")

    models = {
        "Logistic Regression": Pipeline([
            ("scaler", StandardScaler()),
            ("model", LogisticRegression(
                max_iter=2000,
                random_state=RANDOM_STATE
            )),
        ]),
        "Decision Tree": DecisionTreeClassifier(
            random_state=RANDOM_STATE,
            max_depth=6
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=300,
            random_state=RANDOM_STATE,
            max_depth=8,
            min_samples_leaf=2
        ),
    }

    cv = StratifiedKFold(
        n_splits=5,
        shuffle=True,
        random_state=RANDOM_STATE
    )

    rows = []
    trained_models = {}
    matrices = {}
    reports = {}

    print("\nSTEP 3 - 5-FOLD CROSS-VALIDATION + TEST EVALUATION")

    for name, model in models.items():
        cv_scores = cross_val_score(
            model,
            X_train,
            y_train,
            cv=cv,
            scoring="f1_weighted"
        )

        model.fit(X_train, y_train)
        predictions = model.predict(X_test)

        rows.append({
            "Model": name,
            "CV F1 Mean": cv_scores.mean(),
            "CV F1 Std": cv_scores.std(),
            "Test Accuracy": accuracy_score(
                y_test, predictions
            ),
            "Test Precision": precision_score(
                y_test,
                predictions,
                average="weighted",
                zero_division=0
            ),
            "Test Recall": recall_score(
                y_test,
                predictions,
                average="weighted",
                zero_division=0
            ),
            "Test F1": f1_score(
                y_test,
                predictions,
                average="weighted",
                zero_division=0
            ),
        })

        trained_models[name] = model

        matrices[name] = confusion_matrix(
            y_test,
            predictions,
            labels=CLASS_ORDER
        )

        reports[name] = classification_report(
            y_test,
            predictions,
            labels=CLASS_ORDER,
            zero_division=0
        )

    comparison = pd.DataFrame(rows).sort_values(
        by=["CV F1 Mean", "Test F1"],
        ascending=False
    ).reset_index(drop=True)

    printable = comparison.copy()

    for column in [
        "CV F1 Mean",
        "CV F1 Std",
        "Test Accuracy",
        "Test Precision",
        "Test Recall",
        "Test F1",
    ]:
        printable[column] = (
            printable[column] * 100
        ).round(2).astype(str) + "%"

    print("\n--- MODEL COMPARISON ---")
    print(printable.to_string(index=False))

    best_model_name = comparison.loc[0, "Model"]
    best_model = trained_models[best_model_name]

    print("\nBEST MODEL")
    print(best_model_name)

    matrix_df = pd.DataFrame(
        matrices[best_model_name],
        index=[
            f"Actual {risk}"
            for risk in CLASS_ORDER
        ],
        columns=[
            f"Predicted {risk}"
            for risk in CLASS_ORDER
        ]
    )

    print("\nConfusion Matrix")
    print(matrix_df.to_string())

    print("\nClassification Report")
    print(reports[best_model_name])

    package = {
        "model": best_model,
        "feature_columns": FEATURE_COLUMNS,
        "class_order": CLASS_ORDER,
        "model_name": best_model_name,
        "model_version": "generic_v2",
        "random_state": RANDOM_STATE,
        "test_size": TEST_SIZE,
    }

    joblib.dump(
        package,
        "best_risk_model.pkl"
    )

    comparison.to_csv(
        "model_comparison.csv",
        index=False
    )

    matrix_df.to_csv(
        "best_model_confusion_matrix.csv"
    )

    metadata = {
        "model_version": "generic_v2",
        "best_model": best_model_name,
        "training_records": len(X_train),
        "testing_records": len(X_test),
        "features": FEATURE_COLUMNS,
        "note": (
            "Generic feature model supports variable assessment "
            "counts, variable chapter counts, and variable total "
            "coursework weightage. Proof-of-concept model trained "
            "on synthetic data with proxy risk labels."
        ),
    }

    Path("model_metadata.json").write_text(
        json.dumps(metadata, indent=2),
        encoding="utf-8"
    )

    print("\nFILES UPDATED")
    print("best_risk_model.pkl")
    print("model_comparison.csv")
    print("best_model_confusion_matrix.csv")
    print("model_metadata.json")


if __name__ == "__main__":
    main()
