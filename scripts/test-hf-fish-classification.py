#!/usr/bin/env python3
"""
Hugging Face Fish Classification Prototype
==========================================

Tests fish identification using Hugging Face models:
1. jeemsterri/fish_classification - Pre-trained ViT model (~99% lab accuracy)
2. Fish-Vista dataset (4,154 species) - For fine-tuning reference

Usage:
    python scripts/test-hf-fish-classification.py <image_path>
    python scripts/test-hf-fish-classification.py test-images/fish1.jpg
    python scripts/test-hf-fish-classification.py --url https://example.com/fish.jpg

Requirements:
    pip install transformers torch pillow requests

Cost: FREE (self-hosted inference)
"""

import sys
import argparse
import time
from pathlib import Path
from typing import Dict, List, Optional
import json

try:
    from transformers import AutoImageProcessor, AutoModelForImageClassification
    from PIL import Image
    import torch
    import requests
except ImportError as e:
    print("❌ Missing dependencies. Install with:")
    print("   pip install transformers torch pillow requests")
    sys.exit(1)


class FishClassifier:
    """Hugging Face fish classification wrapper"""

    def __init__(self, model_name: str = "jeemsterri/fish_classification"):
        self.model_name = model_name
        self.processor = None
        self.model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

    def initialize(self):
        """Load model and processor (cached after first run)"""
        print(f"🔧 Loading model: {self.model_name}")
        print(f"   Device: {self.device}")

        start = time.time()

        self.processor = AutoImageProcessor.from_pretrained(self.model_name)
        self.model = AutoModelForImageClassification.from_pretrained(self.model_name)
        self.model.to(self.device)
        self.model.eval()  # Set to evaluation mode

        elapsed = time.time() - start
        print(f"✅ Model loaded in {elapsed:.2f}s")

        # Print model info
        num_labels = len(self.model.config.id2label)
        print(f"   Species coverage: {num_labels} classes")

    def predict(self, image_path: str, top_k: int = 5) -> List[Dict]:
        """
        Predict fish species from image

        Args:
            image_path: Path to image file or URL
            top_k: Number of top predictions to return

        Returns:
            List of predictions with label, score, and confidence percentage
        """
        # Load image
        if image_path.startswith('http'):
            print(f"📥 Downloading image from URL...")
            image = Image.open(requests.get(image_path, stream=True).raw)
        else:
            image = Image.open(image_path)

        print(f"📸 Image loaded: {image.size} ({image.mode})")

        # Preprocess
        inputs = self.processor(images=image, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        # Inference
        start = time.time()
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits

        # Get probabilities
        probs = torch.nn.functional.softmax(logits, dim=-1)
        top_k_results = torch.topk(probs, k=min(top_k, probs.size(1)))

        elapsed = time.time() - start
        print(f"⚡ Inference completed in {elapsed*1000:.0f}ms")

        # Format results
        predictions = []
        for idx, prob in zip(top_k_results.indices[0], top_k_results.values[0]):
            label = self.model.config.id2label[idx.item()]
            score = prob.item()
            predictions.append({
                'label': label,
                'score': score,
                'confidence_pct': round(score * 100, 2)
            })

        return predictions

    def predict_and_display(self, image_path: str, top_k: int = 5):
        """Predict and display formatted results"""
        predictions = self.predict(image_path, top_k)

        print("\n" + "="*60)
        print("🐟 FISH IDENTIFICATION RESULTS")
        print("="*60)

        for i, pred in enumerate(predictions, 1):
            confidence_bar = "█" * int(pred['confidence_pct'] / 5)
            print(f"\n{i}. {pred['label']}")
            print(f"   Confidence: {pred['confidence_pct']}% {confidence_bar}")

        # Suggest action based on top confidence
        top_confidence = predictions[0]['confidence_pct']
        print("\n" + "-"*60)
        if top_confidence >= 85:
            print("✅ HIGH CONFIDENCE - Likely correct identification")
        elif top_confidence >= 70:
            print("⚠️  MODERATE CONFIDENCE - Review alternatives")
        else:
            print("❌ LOW CONFIDENCE - Manual verification needed")

        print(f"\n💰 Cost: $0.00 (self-hosted)")
        print(f"🔧 Model: {self.model_name}")
        print("="*60)

        return predictions


def main():
    parser = argparse.ArgumentParser(
        description="Test Hugging Face fish classification",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/test-hf-fish-classification.py test-images/fish1.jpg
  python scripts/test-hf-fish-classification.py --url https://example.com/fish.jpg
  python scripts/test-hf-fish-classification.py fish.jpg --top-k 10 --json
        """
    )

    parser.add_argument(
        'image',
        nargs='?',
        help='Path to fish image (or use --url)'
    )
    parser.add_argument(
        '--url',
        help='URL to fish image (alternative to file path)'
    )
    parser.add_argument(
        '--top-k',
        type=int,
        default=5,
        help='Number of top predictions to return (default: 5)'
    )
    parser.add_argument(
        '--json',
        action='store_true',
        help='Output results as JSON'
    )
    parser.add_argument(
        '--model',
        default='jeemsterri/fish_classification',
        help='Hugging Face model name (default: jeemsterri/fish_classification)'
    )

    args = parser.parse_args()

    # Validate input
    if not args.image and not args.url:
        parser.error("Either provide an image path or use --url")

    image_path = args.url if args.url else args.image

    # Check if file exists (for local paths)
    if not args.url:
        if not Path(image_path).exists():
            print(f"❌ Error: Image not found: {image_path}")
            sys.exit(1)

    try:
        # Initialize classifier
        classifier = FishClassifier(model_name=args.model)
        classifier.initialize()

        # Run prediction
        if args.json:
            predictions = classifier.predict(image_path, top_k=args.top_k)
            print(json.dumps(predictions, indent=2))
        else:
            classifier.predict_and_display(image_path, top_k=args.top_k)

    except Exception as e:
        print(f"\n❌ Error during classification: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
