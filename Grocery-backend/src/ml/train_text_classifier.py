from __future__ import annotations

import os
import argparse
import json
import pandas as pd
from joblib import dump
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--train-csv", default=os.path.join("data", "ml", "train_v1.csv"))
    ap.add_argument("--label-col", default="category_l2", help="category_l2 (recommended) or category_l1")
    ap.add_argument("--model-out", default=os.path.join("models", "ml_v1.joblib"))
    ap.add_argument("--report-out", default=os.path.join("reports", "ml_v1_metrics.json"))
    ap.add_argument("--min-rows-per-class", type=int, default=5, help="drop tiny classes to stabilize training")
    args = ap.parse_args()

    df = pd.read_csv(args.train_csv)
    df["normalized_name"] = df["normalized_name"].fillna("").astype(str).str.strip()

    if args.label_col not in df.columns:
        raise RuntimeError(f"Label column {args.label_col} not found in CSV")

    # Drop empty names
    df = df[df["normalized_name"].str.len() > 0].copy()

    # Drop very small classes (optional but helpful for first ML)
    vc = df[args.label_col].value_counts()
    keep = vc[vc >= args.min_rows_per_class].index
    df = df[df[args.label_col].isin(keep)].copy()

    if df.empty:
        raise RuntimeError("No rows left after filtering small classes. Lower --min-rows-per-class.")

    X = df["normalized_name"].tolist()
    y = df[args.label_col].tolist()

    # Stratified split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.2,
        random_state=42,
        stratify=y
    )

    # Model pipeline
    pipe = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_features=200000)),
        ("clf", LogisticRegression(
            max_iter=2000,
            n_jobs=-1,
            class_weight="balanced",
            solver="lbfgs"
        ))
    ])

    pipe.fit(X_train, y_train)
    preds = pipe.predict(X_test)

    acc = float(accuracy_score(y_test, preds))
    report = classification_report(y_test, preds, output_dict=True, zero_division=0)

    os.makedirs(os.path.dirname(args.model_out), exist_ok=True)
    os.makedirs(os.path.dirname(args.report_out), exist_ok=True)

    dump(
        {
            "model_version": "ml_v1",
            "label_col": args.label_col,
            "pipeline": pipe,
        },
        args.model_out
    )

    with open(args.report_out, "w", encoding="utf-8") as f:
        json.dump({"accuracy": acc, "report": report}, f, indent=2)

    print("======================================")
    print("ML training completed")
    print(f"Train rows: {len(X_train)}")
    print(f"Test rows : {len(X_test)}")
    print(f"Accuracy  : {acc:.4f}")
    print(f"Model out : {args.model_out}")
    print(f"Report out: {args.report_out}")
    print("======================================")

if __name__ == "__main__":
    main()
