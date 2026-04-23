# -*- coding: utf-8 -*-
"""
AegisFlow AI — Flood Risk Model Training
Train RandomForest Classifier cho flood risk prediction.
"""

import json
import joblib
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import (
    classification_report, f1_score, precision_score, recall_score,
    accuracy_score, confusion_matrix, roc_auc_score
)
from sklearn.pipeline import Pipeline

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "data"
MODEL_DIR = SCRIPT_DIR


def load_dataset() -> tuple:
    """Load and prepare dataset."""
    df = pd.read_csv(DATA_DIR / "flood_danang_2019_2024.csv")
    features = ["water_level_m", "rainfall_mm", "hours_rain", "tide_level", "historical_score"]
    X = df[features].values
    y = df["risk_level"].values
    return X, y, df


def train_model(X_train, y_train, X_test, y_test, label_encoder):
    """Train RandomForest with hyperparameter tuning."""
    
    # Compute class weights for imbalanced data
    label_counts = pd.Series(y_train).value_counts()
    n_samples = len(y_train)
    n_classes = len(label_counts)
    class_weight = {
        cls: n_samples / (n_classes * count)
        for cls, count in label_counts.items()
    }
    
    print(f"Class weights: {class_weight}")
    
    # RandomForest with reasonable defaults
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight=class_weight,
        random_state=42,
        n_jobs=-1,
        bootstrap=True,
    )
    
    print("\nTraining RandomForest...")
    model.fit(X_train, y_train)
    
    return model


def evaluate_model(model, X_train, X_test, y_train, y_test, label_encoder):
    """Comprehensive model evaluation."""
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)
    
    results = {}
    
    # Overall metrics
    results["accuracy"] = accuracy_score(y_test, y_pred)
    results["f1_weighted"] = f1_score(y_test, y_pred, average="weighted")
    results["f1_macro"] = f1_score(y_test, y_pred, average="macro")
    results["precision_weighted"] = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    results["recall_weighted"] = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    
    # Per-class metrics
    for cls in label_encoder.classes_:
        mask = y_test == cls
        if mask.sum() > 0:
            cls_pred = y_pred[mask]
            tp = (cls_pred == cls).sum()
            results[f"precision_{cls}"] = precision_score(
                [c == cls for c in y_test], [c == cls for c in y_pred], zero_division=0
            )
            results[f"recall_{cls}"] = recall_score(
                [c == cls for c in y_test], [c == cls for c in y_pred], zero_division=0
            )
    
    # AUC-ROC (OvR)
    try:
        from sklearn.preprocessing import label_binarize
        y_test_bin = label_binarize(y_test, classes=range(len(label_encoder.classes_)))
        results["auc_roc"] = roc_auc_score(y_test_bin, y_proba, multi_class="ovr", average="weighted")
    except Exception as e:
        print(f"Warning: Could not compute AUC-ROC: {e}")
        results["auc_roc"] = None
    
    # Cross-validation
    print("\nRunning 5-fold cross-validation...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    X_all = np.vstack([X_train, X_test])
    y_all = np.concatenate([y_train, y_test])
    cv_scores = cross_val_score(model, X_all, y_all, cv=cv, scoring="f1_weighted")
    results["cv_f1_mean"] = float(cv_scores.mean())
    results["cv_f1_std"] = float(cv_scores.std())
    
    # Confusion matrix
    results["confusion_matrix"] = confusion_matrix(y_test, y_pred).tolist()
    
    # Classification report
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=label_encoder.classes_))
    
    # Feature importance
    results["feature_importance"] = dict(zip(
        ["water_level_m", "rainfall_mm", "hours_rain", "tide_level", "historical_score"],
        model.feature_importances_.tolist()
    ))
    
    return results, y_pred


def main():
    print("=" * 60)
    print("AegisFlow AI — Flood Risk Model Training")
    print("=" * 60)
    print(f"Started at: {datetime.now().isoformat()}\n")
    
    # Load dataset
    print("Loading dataset...")
    X, y, df = load_dataset()
    print(f"Dataset: {X.shape[0]} samples, {X.shape[1]} features")
    print(f"Classes: {pd.Series(y).value_counts().to_dict()}")
    
    # Encode labels
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    print(f"Label encoding: {dict(zip(label_encoder.classes_, range(len(label_encoder.classes_))))}")
    
    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    print(f"\nTrain: {len(X_train)} | Test: {len(X_test)}")
    
    # Train
    model = train_model(X_train, y_train, X_test, y_test, label_encoder)
    
    # Evaluate
    results, y_pred = evaluate_model(model, X_train, X_test, y_train, y_test, label_encoder)
    
    # Save model
    model_path = MODEL_DIR / "flood_risk_model.pkl"
    joblib.dump({
        "model": model,
        "label_encoder": label_encoder,
        "feature_names": ["water_level_m", "rainfall_mm", "hours_rain", "tide_level", "historical_score"],
        "version": "1.0.0",
        "trained_at": datetime.now().isoformat(),
    }, model_path)
    print(f"\nModel saved to: {model_path}")
    
    # Save metrics
    metrics_path = MODEL_DIR / "model_metrics.json"
    # Convert non-serializable
    metrics_out = {k: v for k, v in results.items() if k not in ["confusion_matrix"]}
    with open(metrics_path, "w") as f:
        json.dump(metrics_out, f, indent=2, default=str)
    print(f"Metrics saved to: {metrics_path}")
    
    # Print summary
    print("\n" + "=" * 60)
    print("MODEL PERFORMANCE SUMMARY")
    print("=" * 60)
    print(f"  Accuracy:         {results['accuracy']:.4f}")
    print(f"  F1 Score (w):    {results['f1_weighted']:.4f}")
    print(f"  F1 Score (macro): {results['f1_macro']:.4f}")
    print(f"  Precision (w):   {results['precision_weighted']:.4f}")
    print(f"  Recall (w):      {results['recall_weighted']:.4f}")
    if results.get("auc_roc"):
        print(f"  AUC-ROC:         {results['auc_roc']:.4f}")
    print(f"  CV F1 Mean:      {results['cv_f1_mean']:.4f} ± {results['cv_f1_std']:.4f}")
    print(f"\nFeature Importance:")
    for feat, imp in sorted(results["feature_importance"].items(), key=lambda x: -x[1]):
        print(f"  {feat}: {imp:.4f}")
    
    print(f"\nCompleted at: {datetime.now().isoformat()}")
    
    return results


if __name__ == "__main__":
    main()
