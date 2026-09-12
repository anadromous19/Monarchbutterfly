#!/usr/bin/env python3
"""
Validation script to check numeric parity between Keras .h5 and .tflite outputs.
Section 8.1 parity test gate.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Input, Reshape, Conv2D, Activation, MaxPooling2D, Flatten, Dense

try:
    from ai_edge_litert.interpreter import Interpreter
except ImportError:
    from tensorflow.lite.python.interpreter import Interpreter


def build_monarch_model() -> Sequential:
    return Sequential([
        Input(shape=(224, 224, 3), name='input_layer'),
        Reshape((224, 224, 3), name='reshape'),
        Conv2D(32, (3, 3), padding='same', name='conv2d'),
        Activation('relu', name='activation'),
        MaxPooling2D(pool_size=(2, 2), name='max_pooling2d'),
        Conv2D(64, (3, 3), padding='same', name='conv2d_1'),
        Activation('relu', name='activation_1'),
        MaxPooling2D(pool_size=(2, 2), name='max_pooling2d_1'),
        Flatten(name='flatten'),
        Dense(64, name='dense'),
        Activation('relu', name='activation_2'),
        Dense(1, name='dense_1'),
        Activation('sigmoid', name='activation_3'),
    ])


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate parity between Keras H5 and TFLite")
    parser.add_argument("--keras-model", type=Path, default=Path("model/monarch_classifier.h5"))
    parser.add_argument("--tflite-model", type=Path, default=Path("assets/models/monarch_classifier_float16.tflite"))
    parser.add_argument("--samples", type=int, default=20, help="Number of test samples to run")
    parser.add_argument("--tolerance", type=float, default=5e-2, help="Max absolute difference tolerance for float16")
    parser.add_argument("--output", type=Path, default=Path("assets/models/parity_report.json"))
    args = parser.parse_args()

    if not args.keras_model.exists():
        print(f"Error: Keras model not found at {args.keras_model}", file=sys.stderr)
        sys.exit(1)
    if not args.tflite_model.exists():
        print(f"Error: TFLite model not found at {args.tflite_model}", file=sys.stderr)
        sys.exit(1)

    print(f"Loading Keras model: {args.keras_model}")
    keras_model = build_monarch_model()
    keras_model.load_weights(str(args.keras_model))

    print(f"Loading LiteRT model: {args.tflite_model}")
    interpreter = Interpreter(model_path=str(args.tflite_model))
    interpreter.allocate_tensors()

    input_details = interpreter.get_input_details()[0]
    output_details = interpreter.get_output_details()[0]

    np.random.seed(42)
    diffs = []
    sample_records = []

    print(f"Running parity tests on {args.samples} synthetic test images...")
    for i in range(args.samples):
        # Generate normalized image batch (1, 224, 224, 3) in [0.0, 1.0]
        test_img = np.random.uniform(0.0, 1.0, size=(1, 224, 224, 3)).astype(np.float32)

        # Keras prediction
        k_out = float(keras_model(test_img, training=False).numpy().ravel()[0])

        # TFLite prediction
        interpreter.set_tensor(input_details["index"], test_img)
        interpreter.invoke()
        t_out = float(interpreter.get_tensor(output_details["index"]).ravel()[0])

        diff = abs(k_out - t_out)
        diffs.append(diff)
        sample_records.append({
            "sample": i + 1,
            "keras_pred": round(k_out, 6),
            "tflite_pred": round(t_out, 6),
            "abs_diff": round(diff, 6),
        })

    max_diff = max(diffs)
    mean_diff = float(np.mean(diffs))
    passed = bool(max_diff <= args.tolerance)

    report = {
        "status": "PASSED" if passed else "FAILED",
        "evaluated_samples": args.samples,
        "mean_absolute_difference": round(mean_diff, 8),
        "max_absolute_difference": round(max_diff, 8),
        "configured_tolerance": args.tolerance,
        "sample_records": sample_records[:5],
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("\n--- Parity Report ---")
    print(f"Evaluated Samples:         {args.samples}")
    print(f"Mean Absolute Difference:  {mean_diff:.6f}")
    print(f"Max Absolute Difference:   {max_diff:.6f}")
    print(f"Configured Tolerance:      {args.tolerance:.6f}")
    print(f"Status:                    {report['status']}")

    if not passed:
        print(f"FAILED: Max difference {max_diff:.6f} exceeded tolerance {args.tolerance:.6f}")
        sys.exit(1)
    else:
        print("PASSED: TFLite float16 model satisfies numeric parity requirements with Keras baseline.")


if __name__ == "__main__":
    main()
