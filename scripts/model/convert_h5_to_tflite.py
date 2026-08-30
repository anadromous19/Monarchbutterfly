#!/usr/bin/env python3
"""
Convert legacy Keras H5 model to TFLite format with versioned metadata.
Matches specifications in architecture.md section 8.1.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys

import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Input, Reshape, Conv2D, Activation, MaxPooling2D, Flatten, Dense


def build_monarch_model() -> Sequential:
    """Recreates the exact CNN model architecture from CNN_model.ipynb Cell 88."""
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


def load_monarch_model(h5_path: Path) -> Sequential:
    """Loads weights from legacy H5 model into the canonical architecture."""
    try:
        model = tf.keras.models.load_model(h5_path, compile=False)
        return model
    except Exception:
        model = build_monarch_model()
        model.load_weights(str(h5_path))
        return model


def representative_dataset(directory: Path, height: int, width: int):
    paths = [
        p for p in directory.rglob("*")
        if p.suffix.lower() in {".jpg", ".jpeg", ".png"}
    ][:500]
    if not paths:
        raise ValueError(f"No calibration images found in {directory}")

    for path in paths:
        raw = tf.io.read_file(str(path))
        image = tf.io.decode_image(raw, channels=3, expand_animations=False)
        image = tf.image.resize(image, [height, width], antialias=True)
        # Preprocessing verified from CNN_model.ipynb: RGB resize to (224, 224), normalized via / 255.0
        image = tf.cast(image, tf.float32) / 255.0
        yield [tf.expand_dims(image, 0).numpy()]


def tensor_metadata(tensor):
    return {
        "name": tensor["name"],
        "shape": tensor["shape"].tolist(),
        "dtype": str(tensor["dtype"]),
        "quantization": list(tensor["quantization"]),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert Keras H5 model to TFLite")
    parser.add_argument("--input", type=Path, default=Path("model/monarch_classifier.h5"), help="Path to input H5 model")
    parser.add_argument("--output", type=Path, default=Path("assets/models/monarch_classifier_float16.tflite"), help="Output TFLite path")
    parser.add_argument(
        "--quantization",
        choices=("float32", "dynamic", "float16", "int8"),
        default="float16",
        help="Quantization method",
    )
    parser.add_argument("--representative-data", type=Path, help="Directory for INT8 representative calibration")
    parser.add_argument("--metadata-output", type=Path, help="Optional path for metadata JSON file")
    args = parser.parse_args()

    if not args.input.exists():
        raise FileNotFoundError(f"Input model file not found: {args.input}")

    print(f"Loading model from {args.input}...")
    model = load_monarch_model(args.input)
    model.summary()

    height, width = 224, 224
    converter = tf.lite.TFLiteConverter.from_keras_model(model)

    if args.quantization == "dynamic":
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
    elif args.quantization == "float16":
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.target_spec.supported_types = [tf.float16]
    elif args.quantization == "int8":
        if args.representative_data is None:
            raise ValueError("--representative-data is required for int8")
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.representative_dataset = lambda: representative_dataset(
            args.representative_data, height, width
        )
        converter.target_spec.supported_ops = [
            tf.lite.OpsSet.TFLITE_BUILTINS_INT8
        ]
        converter.inference_input_type = tf.int8
        converter.inference_output_type = tf.int8

    print(f"Converting model with {args.quantization} optimization...")
    tflite_bytes = converter.convert()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(tflite_bytes)
    print(f"Saved TFLite model to {args.output} ({len(tflite_bytes)} bytes)")

    interpreter = tf.lite.Interpreter(model_content=tflite_bytes)
    interpreter.allocate_tensors()
    sha256_hash = hashlib.sha256(tflite_bytes).hexdigest()

    metadata = {
        "model_version": "1.0.0",
        "source": str(args.input),
        "quantization": args.quantization,
        "sha256": sha256_hash,
        "input_dimensions": [height, width, 3],
        "channel_order": "RGB",
        "preprocessing_version": "v1-rgb-scale-0-1",
        "normalization": "pixel_value / 255.0",
        "default_confidence_threshold": 0.90,
        "labels": ["non_monarch", "monarch"],
        "output_type": "binary_sigmoid",
        "inputs": [tensor_metadata(x) for x in interpreter.get_input_details()],
        "outputs": [tensor_metadata(x) for x in interpreter.get_output_details()],
    }

    metadata_path = args.metadata_output or args.output.with_suffix(".json")
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"Saved model metadata to {metadata_path}")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
