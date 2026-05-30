# -*- coding: utf-8 -*-
"""
AegisFlow AI — Enhanced Flood Risk Model Training
So sánh RandomForest, XGBoost, Neural Network (MLP) và ensemble model.
"""

import json
import joblib
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Tuple

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import (
    classification_report, f1_score, precision_score, recall_score,
    accuracy_score, confusion_matrix, roc_auc_score, balanced_accuracy_score
)
from sklearn.pipeline import Pipeline

# Optional: Try importing XGBoost
try:
    from xgboost import XGBClassifier
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False
    print("XGBoost not available, skipping XGBoost model...")

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "data"
MODEL_DIR = SCRIPT_DIR


def load_dataset() -> Tuple[np.ndarray, np.ndarray, pd.DataFrame]:
    """Load and prepare dataset."""
    df = pd.read_csv(DATA_DIR / "flood_danang_2019_2024.csv")
    features = ["water_level_m", "rainfall_mm", "hours_rain", "tide_level", "historical_score"]
    X = df[features].values
    y = df["risk_level"].values
    return X, y, df


def compute_class_weights(y: np.ndarray) -> Dict:
    """Compute balanced class weights."""
    label_counts = pd.Series(y).value_counts()
    n_samples = len(y)
    n_classes = len(label_counts)
    return {
        cls: n_samples / (n_classes * count)
        for cls, count in label_counts.items()
    }


def create_models(class_weight: Dict) -> Dict[str, Any]:
    """Create all candidate models."""
    models = {}

    # 1. RandomForest (original)
    models["random_forest"] = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight=class_weight,
        random_state=42,
        n_jobs=-1,
        bootstrap=True,
    )

    # 2. XGBoost (if available)
    if HAS_XGBOOST:
        # Map class names to indices for XGBoost
        label_encoder = LabelEncoder()
        label_encoder.fit(["critical", "high", "medium", "low"])
        
        models["xgboost"] = XGBClassifier(
            n_estimators=200,
            max_depth=8,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            n_jobs=-1,
            use_label_encoder=False,
            eval_metric='mlogloss',
        )
        models["xgboost"]._label_encoder = label_encoder

    # 3. Neural Network (MLP)
    models["neural_network"] = MLPClassifier(
        hidden_layer_sizes=(128, 64, 32),
        activation='relu',
        solver='adam',
        alpha=0.001,
        batch_size=32,
        learning_rate='adaptive',
        learning_rate_init=0.001,
        max_iter=500,
        early_stopping=True,
        validation_fraction=0.1,
        n_iter_no_change=20,
        random_state=42,
    )

    return models


def train_model(name: str, model, X_train, y_train) -> Any:
    """Train a single model."""
    print(f"\n  Training {name}...")
    start = datetime.now()
    model.fit(X_train, y_train)
    elapsed = (datetime.now() - start).total_seconds()
    print(f"    Done in {elapsed:.2f}s")
    return model


def evaluate_model(name: str, model, X_test, y_test, label_encoder) -> Dict[str, Any]:
    """Comprehensive model evaluation."""
    y_pred = model.predict(X_test)
    
    results = {
        "name": name,
        "accuracy": accuracy_score(y_test, y_pred),
        "balanced_accuracy": balanced_accuracy_score(y_test, y_pred),
        "f1_weighted": f1_score(y_test, y_pred, average="weighted", zero_division=0),
        "f1_macro": f1_score(y_test, y_pred, average="macro", zero_division=0),
        "precision_weighted": precision_score(y_test, y_pred, average="weighted", zero_division=0),
        "recall_weighted": recall_score(y_test, y_pred, average="weighted", zero_division=0),
    }

    # Per-class metrics
    results["per_class"] = {}
    for cls in label_encoder.classes_:
        mask_true = [1 if y == cls else 0 for y in y_test]
        mask_pred = [1 if y == cls else 0 for y in y_pred]
        results["per_class"][cls] = {
            "precision": precision_score(mask_true, mask_pred, zero_division=0),
            "recall": recall_score(mask_true, mask_pred, zero_division=0),
            "f1": f1_score(mask_true, mask_pred, zero_division=0),
        }

    # AUC-ROC if available
    try:
        if hasattr(model, 'predict_proba'):
            y_proba = model.predict_proba(X_test)
            from sklearn.preprocessing import label_binarize
            y_test_bin = label_binarize(y_test, classes=range(len(label_encoder.classes_)))
            results["auc_roc"] = roc_auc_score(y_test_bin, y_proba, multi_class="ovr", average="weighted")
        else:
            results["auc_roc"] = None
    except Exception as e:
        results["auc_roc"] = None

    # Cross-validation
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X_test, y_test, cv=cv, scoring="f1_weighted")
    results["cv_f1_mean"] = float(cv_scores.mean())
    results["cv_f1_std"] = float(cv_scores.std())

    print(f"\n  {name} Results:")
    print(f"    Accuracy:          {results['accuracy']:.4f}")
    print(f"    Balanced Accuracy: {results['balanced_accuracy']:.4f}")
    print(f"    F1 (weighted):     {results['f1_weighted']:.4f}")
    print(f"    F1 (macro):        {results['f1_macro']:.4f}")
    if results.get("auc_roc"):
        print(f"    AUC-ROC:          {results['auc_roc']:.4f}")
    print(f"    CV F1:             {results['cv_f1_mean']:.4f} ± {results['cv_f1_std']:.4f}")

    return results


def create_ensemble(rf_model, xgb_model, nn_model, label_encoder) -> VotingClassifier:
    """Create ensemble model from best individual models."""
    estimators = [
        ('rf', rf_model),
        ('nn', nn_model),
    ]
    if HAS_XGBOOST:
        estimators.append(('xgb', xgb_model))
    
    ensemble = VotingClassifier(
        estimators=estimators,
        voting='soft',  # Use probability averaging
        n_jobs=-1,
    )
    return ensemble


def save_model(name: str, model, label_encoder, feature_names: List[str], 
               version: str, metrics: Dict) -> Path:
    """Save model with metadata."""
    model_path = MODEL_DIR / f"flood_risk_model.pkl"
    
    # Save metadata alongside
    metadata = {
        "model_name": name,
        "model_version": version,
        "trained_at": datetime.now().isoformat(),
        "feature_names": feature_names,
        "label_classes": list(label_encoder.classes_),
        "metrics": metrics,
    }
    
    joblib.dump({
        "model": model,
        "label_encoder": label_encoder,
        "feature_names": feature_names,
        "version": version,
        "trained_at": datetime.now().isoformat(),
        "metadata": metadata,
    }, model_path)
    
    return model_path


def main():
    print("=" * 70)
    print("AegisFlow AI — Enhanced Flood Risk Model Training")
    print("=" * 70)
    print(f"Started at: {datetime.now().isoformat()}\n")

    # Load dataset
    print("Loading dataset...")
    X, y, df = load_dataset()
    print(f"Dataset: {X.shape[0]} samples, {X.shape[1]} features")
    print(f"Classes: {pd.Series(y).value_counts().to_dict()}")

    # Encode labels
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    feature_names = ["water_level_m", "rainfall_mm", "hours_rain", "tide_level", "historical_score"]
    print(f"Label encoding: {dict(zip(label_encoder.classes_, range(len(label_encoder.classes_))))}")

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    print(f"\nTrain: {len(X_train)} | Test: {len(X_test)}")

    # Scale features for Neural Network
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Compute class weights
    class_weight = compute_class_weights(y_train)
    print(f"\nClass weights: {class_weight}")

    # Create models
    print("\n" + "=" * 50)
    print("TRAINING MODELS")
    print("=" * 50)
    
    models = create_models(class_weight)
    trained_models = {}
    all_results = []

    # Train and evaluate each model
    for name, model in models.items():
        print(f"\n[{name.upper()}]")
        
        # Use scaled data for neural network
        if name == "neural_network":
            model = train_model(name, model, X_train_scaled, y_train)
            results = evaluate_model(name, model, X_test_scaled, y_test, label_encoder)
            trained_models[name] = {"model": model, "scaled": True}
        else:
            model = train_model(name, model, X_train, y_train)
            results = evaluate_model(name, model, X_test, y_test, label_encoder)
            trained_models[name] = {"model": model, "scaled": False}
        
        all_results.append(results)

    # Create and evaluate ensemble
    print("\n" + "=" * 50)
    print("ENSEMBLE MODEL")
    print("=" * 50)
    
    rf_model = trained_models["random_forest"]["model"]
    nn_model = trained_models["neural_network"]["model"]
    
    if HAS_XGBOOST:
        xgb_model = trained_models["xgboost"]["model"]
        ensemble = create_ensemble(rf_model, xgb_model, nn_model, label_encoder)
    else:
        ensemble = create_ensemble(rf_model, None, nn_model, label_encoder)
    
    # Train ensemble with scaled data
    X_train_combined = np.hstack([X_train, X_train_scaled[:, :1]])  # Add scaled features
    X_test_combined = np.hstack([X_test, X_test_scaled[:, :1]])
    
    # Actually, let's use a simpler approach - train ensemble on original features
    ensemble = create_ensemble(
        rf_model, 
        trained_models.get("xgboost", {}).get("model"),
        nn_model,
        label_encoder
    )
    
    print("\n  Training ensemble (soft voting)...")
    ensemble.fit(X_train, y_train)
    print("    Done")
    
    ensemble_results = evaluate_model("ensemble", ensemble, X_test, y_test, label_encoder)
    all_results.append(ensemble_results)
    trained_models["ensemble"] = {"model": ensemble, "scaled": False}

    # Find best model
    print("\n" + "=" * 50)
    print("MODEL COMPARISON")
    print("=" * 50)
    
    print(f"\n{'Model':<20} {'Accuracy':<12} {'F1 (w)':<12} {'AUC-ROC':<12} {'CV F1':<12}")
    print("-" * 70)
    
    best_model = None
    best_score = 0
    
    for r in all_results:
        auc = f"{r['auc_roc']:.4f}" if r.get('auc_roc') else "N/A"
        cv = f"{r['cv_f1_mean']:.4f}±{r['cv_f1_std']:.2f}"
        print(f"{r['name']:<20} {r['accuracy']:<12.4f} {r['f1_weighted']:<12.4f} {auc:<12} {cv:<12}")
        
        # Use F1 weighted as primary metric
        if r['f1_weighted'] > best_score:
            best_score = r['f1_weighted']
            best_model = r['name']

    print(f"\nBest model: {best_model} (F1 weighted: {best_score:.4f})")

    # Select and save best model
    print("\n" + "=" * 50)
    print("SAVING BEST MODEL")
    print("=" * 50)
    
    # Use ensemble as default if it's competitive
    if ensemble_results['f1_weighted'] >= best_score - 0.005:
        final_model_name = "ensemble"
        print("Using ensemble model (competitive performance)")
    else:
        final_model_name = best_model
        print(f"Using {final_model_name} (best individual performance)")
    
    final_model = trained_models[final_model_name]["model"]
    final_results = next(r for r in all_results if r["name"] == final_model_name)
    
    # Version bump
    version = "2.0.0"
    
    model_path = save_model(
        final_model_name,
        final_model,
        label_encoder,
        feature_names,
        version,
        final_results
    )
    print(f"\nModel saved: {model_path}")
    print(f"Version: {version}")

    # Save scaler for neural network preprocessing
    scaler_path = MODEL_DIR / "feature_scaler.pkl"
    joblib.dump(scaler, scaler_path)
    print(f"Scaler saved: {scaler_path}")

    # Save comparison results
    comparison_path = MODEL_DIR / "model_comparison.json"
    with open(comparison_path, "w") as f:
        json.dump({
            "trained_at": datetime.now().isoformat(),
            "dataset_samples": len(X),
            "test_samples": len(X_test),
            "features": feature_names,
            "results": all_results,
            "best_model": best_model,
            "selected_model": final_model_name,
        }, f, indent=2, default=str)
    print(f"Comparison saved: {comparison_path}")

    # Print final summary
    print("\n" + "=" * 70)
    print("FINAL MODEL PERFORMANCE")
    print("=" * 70)
    print(f"Model: {final_model_name}")
    print(f"Version: {version}")
    print(f"\nMetrics:")
    print(f"  Accuracy:           {final_results['accuracy']:.4f}")
    print(f"  Balanced Accuracy:   {final_results['balanced_accuracy']:.4f}")
    print(f"  F1 Score (weighted): {final_results['f1_weighted']:.4f}")
    print(f"  F1 Score (macro):    {final_results['f1_macro']:.4f}")
    print(f"  Precision (weighted):{final_results['precision_weighted']:.4f}")
    print(f"  Recall (weighted):   {final_results['recall_weighted']:.4f}")
    if final_results.get('auc_roc'):
        print(f"  AUC-ROC:             {final_results['auc_roc']:.4f}")
    print(f"  CV F1:               {final_results['cv_f1_mean']:.4f} ± {final_results['cv_f1_std']:.4f}")
    
    print(f"\nPer-class F1:")
    for cls, metrics in final_results['per_class'].items():
        print(f"  {cls:10s}: P={metrics['precision']:.2f}, R={metrics['recall']:.2f}, F1={metrics['f1']:.2f}")

    # Feature importance (only for tree-based models)
    if final_model_name in ["random_forest", "ensemble"]:
        if final_model_name == "ensemble":
            rf_importance = rf_model.feature_importances_
        else:
            rf_importance = final_model.feature_importances_
        
        print(f"\nFeature Importance (from RandomForest component):")
        for fname, imp in sorted(zip(feature_names, rf_importance), key=lambda x: -x[1]):
            print(f"  {fname:20s}: {imp:.4f}")
    
    print(f"\nCompleted at: {datetime.now().isoformat()}")
    
    return all_results


if __name__ == "__main__":
    main()
