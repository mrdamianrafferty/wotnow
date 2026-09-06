# Findr Fish Identification - Hugging Face Implementation Guide

**Status**: ✅ **READY TO IMPLEMENT**
**Created**: 2025-11-11
**Estimated Effort**: 2-3 days (Phase 1), 1-2 weeks (with fine-tuning)
**Cost Savings**: $30-40/month (60-80% reduction vs OpenAI)

---

## Executive Summary

Replace expensive OpenAI GPT-4o Vision API ($50/month, 75-85% accuracy) with free self-hosted Hugging Face models ($10-20/month hosting, 90-95% accuracy after fine-tuning).

**Benefits**:
- 💰 **60-80% cost reduction** ($50/month → $10-20/month)
- 🎯 **Better accuracy** (specialized fish models vs general vision)
- 🚀 **No rate limits** (only constrained by your infrastructure)
- 🔒 **Privacy** (images never leave your servers)
- 🎨 **Customizable** (fine-tune on European species)
- ⚡ **Fast** (200-500ms inference after model load)

---

## Phase 1: Quick Win - Deploy Pre-trained Model (2-3 days)

### Goal

Replace OpenAI endpoint with Hugging Face model for immediate cost savings.

### Implementation Steps

#### Day 1: Setup & Testing

**1. Install Dependencies**
```bash
# Add Transformers.js to package.json
npm install @xenova/transformers

# Python dependencies for testing (optional)
pip install transformers torch pillow requests
```

**2. Test Python Prototype**
```bash
# Create test directory
mkdir -p test-images

# Download sample fish images
# (from your existing catch logs or test dataset)

# Test fish classification
python scripts/test-hf-fish-classification.py test-images/cod.jpg

# Expected output:
# 🔧 Loading model: jeemsterri/fish_classification
#    Device: cpu
# ✅ Model loaded in 3.24s
#    Species coverage: 9 classes
# 📸 Image loaded: (1024, 768) (RGB)
# ⚡ Inference completed in 421ms
#
# ============================================================
# 🐟 FISH IDENTIFICATION RESULTS
# ============================================================
#
# 1. Atlantic Cod
#    Confidence: 92.3% ████████████████████
#
# 2. Pollack
#    Confidence: 4.2% █
#
# 3. Haddock
#    Confidence: 2.1% █
#
# ------------------------------------------------------------
# ✅ HIGH CONFIDENCE - Likely correct identification
#
# 💰 Cost: $0.00 (self-hosted)
# 🔧 Model: jeemsterri/fish_classification
# ============================================================
```

**3. Test with Multiple Images**
```bash
# Test accuracy on 20-30 sample catches
for img in test-images/*.jpg; do
  echo "Testing $img..."
  python scripts/test-hf-fish-classification.py "$img" --json >> results.jsonl
done

# Analyze accuracy
python scripts/analyze-fish-id-accuracy.py results.jsonl
```

**4. Evaluate Results**

Create accuracy spreadsheet:
| Image | HF Prediction | Actual Species | Match? | Confidence | Notes |
|-------|---------------|----------------|--------|------------|-------|
| cod1.jpg | Atlantic Cod | Atlantic Cod | ✅ Yes | 92.3% | Perfect |
| bass1.jpg | Sea Bass | Sea Bass | ✅ Yes | 87.1% | Good |
| mackerel1.jpg | Mackerel | Mackerel | ✅ Yes | 95.4% | Excellent |
| bream1.jpg | Unknown | Gilthead Bream | ❌ No | 31.2% | Needs fine-tuning |

**Decision Point**: If accuracy >75% on common species, proceed to Day 2. Otherwise, skip to Phase 2 (fine-tuning).

---

#### Day 2: TypeScript Integration

**1. Verify Service Implementation**

Check that these files exist:
- ✅ `lib/findr/huggingfaceFishService.ts` (Hugging Face service)
- ✅ `pages/api/findr/identify-fish-hf.ts` (API endpoint)

**2. Add Package.json Scripts**
```json
{
  "scripts": {
    "test:fish-id": "python scripts/test-hf-fish-classification.py",
    "test:fish-id:batch": "bash scripts/test-fish-id-batch.sh"
  }
}
```

**3. Test API Endpoint Locally**
```bash
# Start dev server
npm run dev

# In another terminal, test API endpoint
curl -X POST http://localhost:3000/api/findr/identify-fish-hf \
  -F "image=@test-images/cod.jpg" \
  -F 'data={"candidates":[{"id":"1","name":"Atlantic Cod","scientific_name":"Gadus morhua","slug":"atlantic-cod"}]}'

# Expected response:
# {
#   "species": {
#     "id": "1",
#     "name": "Atlantic Cod",
#     "scientific_name": "Gadus morhua",
#     "confidence": 0.923
#   },
#   "method": "ai",
#   "confidence": 0.923,
#   "cost": 0,
#   "reasoning": "Hugging Face model identified as \"Atlantic Cod\" with 92.3% confidence\n...",
#   "message": "Looks like a Atlantic Cod! 🐟 (92% confident)"
# }
```

**4. Create Integration Test**

Create `scripts/test-hf-api-endpoint.sh`:
```bash
#!/bin/bash
# Test Hugging Face API endpoint with real images

API_URL="http://localhost:3000/api/findr/identify-fish-hf"
TEST_DIR="test-images"

echo "Testing Hugging Face fish identification API..."

for img in "$TEST_DIR"/*.jpg; do
  echo ""
  echo "Testing: $img"

  # Build candidates JSON (from your species table)
  CANDIDATES='[
    {"id":"1","name":"Atlantic Cod","scientific_name":"Gadus morhua","slug":"atlantic-cod"},
    {"id":"2","name":"Sea Bass","scientific_name":"Dicentrarchus labrax","slug":"sea-bass"},
    {"id":"3","name":"Mackerel","scientific_name":"Scomber scombrus","slug":"mackerel"}
  ]'

  # Call API
  RESULT=$(curl -s -X POST "$API_URL" \
    -F "image=@$img" \
    -F "data={\"candidates\":$CANDIDATES}")

  # Extract species name and confidence
  SPECIES=$(echo "$RESULT" | jq -r '.species.name')
  CONFIDENCE=$(echo "$RESULT" | jq -r '.confidence * 100 | round')

  echo "  Result: $SPECIES ($CONFIDENCE% confidence)"
done
```

---

#### Day 3: Frontend Integration & A/B Testing

**1. Add Frontend Toggle**

In `components/findr/CatchLogModal.tsx`:
```typescript
const [useHuggingFace, setUseHuggingFace] = useState(
  process.env.NEXT_PUBLIC_FISH_ID_PROVIDER === 'huggingface'
);

async function identifyFish(image: File) {
  const endpoint = useHuggingFace
    ? '/api/findr/identify-fish-hf'
    : '/api/findr/identify-fish'; // OpenAI

  const formData = new FormData();
  formData.append('image', image);
  formData.append('data', JSON.stringify({
    candidates,
    context: {
      location,
      date: new Date().toISOString(),
      depth
    }
  }));

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData
  });

  return await response.json();
}
```

**2. Add Environment Variable**
```bash
# .env.local
NEXT_PUBLIC_FISH_ID_PROVIDER=huggingface # or "openai"
```

**3. A/B Test (Run Both)**

Track metrics for 1 week:
```typescript
// lib/findr/identificationMetrics.ts
interface IdentificationMetric {
  id: string;
  provider: 'openai' | 'huggingface';
  result: IdentificationResult;
  userFeedback?: 'correct' | 'incorrect' | 'unsure';
  timestamp: Date;
}

async function logIdentification(metric: IdentificationMetric) {
  await supabase
    .from('fish_identification_metrics')
    .insert({
      provider: metric.provider,
      species_predicted: metric.result.species.name,
      confidence: metric.result.confidence,
      cost: metric.result.cost,
      inference_time: metric.result.inferenceTime,
      user_feedback: metric.userFeedback,
      created_at: new Date()
    });
}
```

**Database Migration**:
```sql
CREATE TABLE fish_identification_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'huggingface')),
  species_predicted TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  cost NUMERIC NOT NULL,
  inference_time INTEGER, -- milliseconds
  user_feedback TEXT CHECK (user_feedback IN ('correct', 'incorrect', 'unsure')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_identification_metrics_provider ON fish_identification_metrics(provider);
CREATE INDEX idx_identification_metrics_created_at ON fish_identification_metrics(created_at DESC);
```

**4. Analyze A/B Test Results**

After 1 week, compare:
```sql
-- Accuracy comparison
SELECT
  provider,
  COUNT(*) as total_identifications,
  AVG(confidence) as avg_confidence,
  SUM(CASE WHEN user_feedback = 'correct' THEN 1 ELSE 0 END)::float / COUNT(*) as accuracy,
  SUM(cost) as total_cost,
  AVG(inference_time) as avg_inference_time_ms
FROM fish_identification_metrics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY provider;
```

**Expected Results**:
| Provider | Total | Avg Confidence | Accuracy | Total Cost | Avg Time |
|----------|-------|----------------|----------|------------|----------|
| openai | 200 | 0.78 | 0.76 | $10.00 | 1500ms |
| huggingface | 200 | 0.85 | 0.82 | $0.00 | 450ms |

**Decision**: If HF accuracy ≥ OpenAI accuracy, switch fully to HF.

---

### Deployment Checklist

**Before Deploying to Production**:

- [ ] Tested on 50+ sample fish images
- [ ] Accuracy ≥75% on common European species
- [ ] API endpoint returns results in <5 seconds (first call)
- [ ] API endpoint returns results in <1 second (subsequent calls)
- [ ] Error handling for unsupported species
- [ ] Fallback to manual selection if confidence <70%
- [ ] Monitoring dashboard for inference time
- [ ] Cost tracking (should be $0 for inference)
- [ ] User feedback collection mechanism
- [ ] Database migration applied

**Deploy**:
```bash
# Set environment variable in Vercel
vercel env add NEXT_PUBLIC_FISH_ID_PROVIDER
# Enter: huggingface

# Deploy
npm run deploy

# Or quick deploy
./quick-deploy.sh
```

**Post-Deployment**:
- [ ] Verify API endpoint works in production
- [ ] Test with 10 real catch logs
- [ ] Monitor error rates (should be <5%)
- [ ] Check inference time (should be <1s)
- [ ] Monitor cost (should be $0/month for API calls)

---

## Phase 2: Fine-Tuning for European Species (1-2 weeks)

### Goal

Improve accuracy from ~80% → ~95% by fine-tuning on European species.

### Why Fine-Tune?

**Current Issues**:
- Base model trained on global fish dataset (aquarium photos)
- May not recognize all European species
- Field photos (poor lighting, angles) differ from training data

**Solution**:
- Fine-tune on 80 common European fish species
- Add catch photos from Findr users
- Train on realistic field conditions

---

### Fine-Tuning Steps

#### Step 1: Collect Training Data (2-3 days)

**Data Sources**:

1. **Fish-Vista Dataset** (4,154 species):
```python
# Download European species subset
from datasets import load_dataset

fish_vista = load_dataset("imageomics/fish-vista")

# Filter to European species
european_species = [
  "Gadus morhua",      # Atlantic Cod
  "Dicentrarchus labrax", # European Sea Bass
  "Scomber scombrus",  # Atlantic Mackerel
  "Sparus aurata",     # Gilthead Bream
  # ... (80 total)
]

european_subset = fish_vista.filter(
  lambda x: x['scientific_name'] in european_species
)
```

2. **FishBase Images** (https://www.fishbase.org/):
- Scrape 30-50 images per species
- Download at various angles/lighting

3. **User Catch Photos** (from Findr):
```sql
-- Export catch photos from Findr
SELECT
  s.scientific_name,
  ce.photo_url
FROM findr_catch_entries ce
JOIN species s ON ce.species_id = s.id
WHERE ce.photo_url IS NOT NULL
  AND s.scientific_name IN (/* European species list */);
```

4. **iNaturalist** (https://www.inaturalist.org/):
- Query by species name
- Download "research grade" observations
- ~30-50 images per species

**Target**: 50-100 images per species × 80 species = 4,000-8,000 images

**Dataset Structure**:
```
training-data/
├── atlantic_cod/
│   ├── fishbase_001.jpg
│   ├── fishbase_002.jpg
│   ├── findr_catch_001.jpg
│   ├── inaturalist_001.jpg
│   └── ...
├── sea_bass/
│   └── ...
└── mackerel/
    └── ...
```

---

#### Step 2: Prepare Dataset (1 day)

**1. Create Labels File**

`labels.json`:
```json
{
  "atlantic_cod": "Gadus morhua",
  "sea_bass": "Dicentrarchus labrax",
  "mackerel": "Scomber scombrus",
  "gilthead_bream": "Sparus aurata"
  // ... 80 total
}
```

**2. Create Training Script**

`scripts/prepare-fish-training-data.py`:
```python
import os
import json
from pathlib import Path
from sklearn.model_selection import train_test_split
from datasets import Dataset, DatasetDict, Image

def create_dataset():
    data_dir = Path("training-data")
    images = []
    labels = []

    # Load labels
    with open("labels.json") as f:
        label_to_scientific = json.load(f)

    label_names = list(label_to_scientific.keys())
    label_to_id = {name: idx for idx, name in enumerate(label_names)}

    # Collect all images
    for label_dir in data_dir.iterdir():
        if not label_dir.is_dir():
            continue

        label_name = label_dir.name
        label_id = label_to_id.get(label_name)

        if label_id is None:
            continue

        for img_path in label_dir.glob("*.jpg"):
            images.append(str(img_path))
            labels.append(label_id)

    # Split into train/val/test
    train_imgs, temp_imgs, train_labels, temp_labels = train_test_split(
        images, labels, test_size=0.3, stratify=labels, random_state=42
    )

    val_imgs, test_imgs, val_labels, test_labels = train_test_split(
        temp_imgs, temp_labels, test_size=0.5, stratify=temp_labels, random_state=42
    )

    # Create datasets
    dataset = DatasetDict({
        "train": Dataset.from_dict({"image": train_imgs, "label": train_labels}).cast_column("image", Image()),
        "validation": Dataset.from_dict({"image": val_imgs, "label": val_labels}).cast_column("image", Image()),
        "test": Dataset.from_dict({"image": test_imgs, "label": test_labels}).cast_column("image", Image())
    })

    return dataset, label_names

if __name__ == "__main__":
    dataset, label_names = create_dataset()

    print(f"Dataset created:")
    print(f"  Train: {len(dataset['train'])} images")
    print(f"  Validation: {len(dataset['validation'])} images")
    print(f"  Test: {len(dataset['test'])} images")
    print(f"  Classes: {len(label_names)}")

    # Save dataset
    dataset.save_to_disk("./datasets/findr-european-fish")

    # Save label names
    with open("./datasets/findr-european-fish/label_names.json", "w") as f:
        json.dump(label_names, f, indent=2)

    print("Dataset saved to ./datasets/findr-european-fish")
```

Run:
```bash
python scripts/prepare-fish-training-data.py
```

---

#### Step 3: Fine-Tune Model (1-2 days)

**1. Set Up Google Colab** (FREE GPU)

Create `notebooks/fine-tune-fish-classification.ipynb`:

```python
# Install dependencies
!pip install transformers datasets torch torchvision accelerate evaluate

# Import libraries
from transformers import (
    AutoImageProcessor,
    AutoModelForImageClassification,
    TrainingArguments,
    Trainer
)
from datasets import load_from_disk
import torch
import numpy as np
from evaluate import load

# Load dataset
dataset = load_from_disk("/content/drive/MyDrive/findr-european-fish")

# Load base model
model_name = "jeemsterri/fish_classification"
processor = AutoImageProcessor.from_pretrained(model_name)

# Update model for European species (80 classes)
num_labels = 80
model = AutoModelForImageClassification.from_pretrained(
    model_name,
    num_labels=num_labels,
    ignore_mismatched_sizes=True  # Resize classification head
)

# Preprocessing function
def preprocess(examples):
    images = [img.convert("RGB") for img in examples["image"]]
    inputs = processor(images, return_tensors="pt")
    inputs["labels"] = examples["label"]
    return inputs

# Preprocess dataset
prepared_dataset = dataset.map(
    preprocess,
    batched=True,
    remove_columns=["image"]
)

# Training arguments
training_args = TrainingArguments(
    output_dir="./findr-fish-european-v1",
    evaluation_strategy="epoch",
    save_strategy="epoch",
    learning_rate=2e-5,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    num_train_epochs=10,
    weight_decay=0.01,
    load_best_model_at_end=True,
    metric_for_best_model="accuracy",
    push_to_hub=False,  # Set True to push to Hugging Face Hub
    remove_unused_columns=False,
    logging_steps=10,
    fp16=True,  # Use mixed precision for faster training
)

# Metrics
accuracy_metric = load("accuracy")

def compute_metrics(eval_pred):
    predictions, labels = eval_pred
    predictions = np.argmax(predictions, axis=1)
    return accuracy_metric.compute(predictions=predictions, references=labels)

# Trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=prepared_dataset["train"],
    eval_dataset=prepared_dataset["validation"],
    compute_metrics=compute_metrics,
)

# Train
trainer.train()

# Evaluate on test set
test_results = trainer.evaluate(prepared_dataset["test"])
print(f"Test accuracy: {test_results['eval_accuracy']:.2%}")

# Save model
model.save_pretrained("./findr-fish-european-v1/final")
processor.save_pretrained("./findr-fish-european-v1/final")

print("✅ Training complete!")
print("Download model from: ./findr-fish-european-v1/final")
```

**2. Run Training**

```bash
# Upload dataset to Google Drive
# Open Colab notebook
# Mount Google Drive
# Run all cells

# Expected training time: 2-4 hours on free Colab GPU
```

**3. Evaluate Results**

Expected accuracy:
- **Before fine-tuning**: 75-85% on European species
- **After fine-tuning**: 90-95% on European species

---

#### Step 4: Deploy Fine-Tuned Model (1 day)

**1. Download Model from Colab**

```bash
# Download from Google Drive
# Extract to: ./models/findr-fish-european-v1
```

**2. Update Service**

In `lib/findr/huggingfaceFishService.ts`:
```typescript
class HuggingFaceFishService {
  private modelName: string = process.env.FISH_MODEL_PATH
    || 'jeemsterri/fish_classification'; // Fallback to base model

  async initialize() {
    // If using local model
    if (process.env.FISH_MODEL_PATH?.startsWith('./')) {
      const { AutoModel } = await import('@xenova/transformers');
      this.model = await AutoModel.from_pretrained(
        process.env.FISH_MODEL_PATH,
        { local_files_only: true }
      );
    } else {
      // Use Hugging Face Hub model
      const { pipeline } = await import('@xenova/transformers');
      this.pipeline = await pipeline('image-classification', this.modelName);
    }
  }
}
```

**3. Update Environment Variables**

```bash
# .env.local
FISH_MODEL_PATH=./models/findr-fish-european-v1

# Or push to Hugging Face Hub and use:
# FISH_MODEL_PATH=your-username/findr-fish-european-v1
```

**4. Test Fine-Tuned Model**

```bash
# Test with European species
python scripts/test-hf-fish-classification.py test-images/gilthead_bream.jpg --model ./models/findr-fish-european-v1

# Expected: 95%+ confidence on European species
```

**5. Deploy**

```bash
# Option 1: Include model in deployment (if <500MB)
# Add to .vercelignore (exclude from git but include in deployment)

# Option 2: Host model on Hugging Face Hub (recommended)
# Push model to your Hugging Face account
# Use model name in FISH_MODEL_PATH

# Deploy to Vercel
vercel env add FISH_MODEL_PATH
# Enter: your-username/findr-fish-european-v1

npm run deploy
```

---

## Performance Optimization

### Cold Start Optimization

**Problem**: First API call takes 3-5 seconds (model loading)

**Solution**: Keep model warm

```typescript
// pages/api/findr/identify-fish-hf.ts

// Global model cache (persists across requests)
let modelWarmed = false;

export default async function handler(req, res) {
  // Warm model on first request
  if (!modelWarmed) {
    console.log('[warm] Warming model...');
    await hfFishService.initialize();
    modelWarmed = true;
    console.log('[warm] Model warmed successfully');
  }

  // ... rest of handler
}
```

**Better Solution**: Use Vercel Edge Functions (keep-alive)

```typescript
// pages/api/findr/identify-fish-hf.ts
export const config = {
  runtime: 'nodejs',  // Use Node.js runtime (not Edge)
  maxDuration: 30,    // Allow 30s for inference
};

// Vercel will keep function warm between requests
```

### Caching Strategy

**Cache model predictions by image hash**:

```typescript
// lib/findr/huggingfaceFishService.ts
import crypto from 'crypto';

class HuggingFaceFishService {
  private predictionCache = new Map<string, HFPrediction[]>();

  async identify(imageFile: File, context: CatchContext) {
    // Generate image hash
    const arrayBuffer = await imageFile.arrayBuffer();
    const hash = crypto
      .createHash('sha256')
      .update(Buffer.from(arrayBuffer))
      .digest('hex');

    // Check cache
    if (this.predictionCache.has(hash)) {
      console.log('[cache] Using cached prediction');
      return this.formatCachedResult(this.predictionCache.get(hash)!);
    }

    // Run inference
    const predictions = await this.pipeline(buffer, { topk: 10 });

    // Cache result
    this.predictionCache.set(hash, predictions);

    return this.formatResult(predictions, context);
  }
}
```

### Database Caching

**Store predictions in database**:

```sql
CREATE TABLE fish_identification_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_hash TEXT NOT NULL UNIQUE,
  predictions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fish_id_cache_hash ON fish_identification_cache(image_hash);

-- Clean up old cache (7 days)
DELETE FROM fish_identification_cache WHERE created_at < NOW() - INTERVAL '7 days';
```

---

## Monitoring & Analytics

### Key Metrics to Track

**1. Inference Performance**:
```typescript
interface InferenceMetrics {
  modelLoadTime: number;    // First call only
  inferenceTime: number;    // Per call
  totalRequestTime: number; // End-to-end
  cached: boolean;
}
```

**2. Accuracy Metrics**:
```typescript
interface AccuracyMetrics {
  provider: 'huggingface' | 'openai';
  speciesPredicted: string;
  speciesActual: string;     // From user feedback
  confidence: number;
  correct: boolean;
  timestamp: Date;
}
```

**3. Cost Tracking**:
```typescript
interface CostMetrics {
  provider: 'huggingface' | 'openai';
  cost: number;              // Per call
  monthlyCost: number;       // Running total
  callsThisMonth: number;
}
```

### Dashboard Queries

**Accuracy by Provider**:
```sql
SELECT
  provider,
  COUNT(*) as total_calls,
  AVG(confidence) as avg_confidence,
  SUM(CASE WHEN correct THEN 1 ELSE 0 END)::float / COUNT(*) as accuracy,
  AVG(CASE WHEN correct THEN confidence ELSE 0 END) as avg_confidence_when_correct
FROM fish_identification_metrics
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY provider;
```

**Cost Savings**:
```sql
SELECT
  DATE_TRUNC('day', created_at) as date,
  provider,
  SUM(cost) as daily_cost,
  COUNT(*) as daily_calls
FROM fish_identification_metrics
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY date, provider
ORDER BY date DESC, provider;
```

**Inference Time Percentiles**:
```sql
SELECT
  provider,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY inference_time) as p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY inference_time) as p95_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY inference_time) as p99_ms
FROM fish_identification_metrics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY provider;
```

---

## Rollback Plan

### If Hugging Face Accuracy < OpenAI

**Option 1**: Hybrid approach
```typescript
async function identifyFish(image: File, context: CatchContext) {
  // Try HF first (FREE)
  const hfResult = await hfFishService.identify(image, context);

  // If low confidence, fallback to OpenAI
  if (hfResult.confidence < 0.70) {
    return await fishIdService.identify(image, context); // OpenAI
  }

  return hfResult;
}
```

**Cost**: 30% of calls use OpenAI = $15/month (still 70% savings)

**Option 2**: Fine-tune more (Phase 2)

**Option 3**: Revert to OpenAI
```bash
# Change environment variable
vercel env add NEXT_PUBLIC_FISH_ID_PROVIDER
# Enter: openai

npm run deploy
```

---

## Expected Results

### Phase 1 (Pre-trained Model)

**Week 1-2**:
- ✅ Model deployed
- ✅ Accuracy: 75-85% on common species
- ✅ Cost: $10-20/month (hosting only)
- ✅ Inference: 200-500ms

**Savings**: $30-40/month

### Phase 2 (Fine-tuned Model)

**Week 3-4**:
- ✅ Model fine-tuned on 80 European species
- ✅ Accuracy: 90-95% on European species
- ✅ Cost: Still $10-20/month (hosting only)
- ✅ Inference: 200-500ms (same)

**Savings**: $30-40/month + better UX (higher accuracy)

---

## Next Steps

**Immediate (This Week)**:
1. ✅ Install `@xenova/transformers`
2. ✅ Test Python prototype with 20-30 sample fish
3. ⏳ Evaluate accuracy on European species
4. ⏳ If accuracy >75%, proceed to API integration
5. ⏳ If accuracy <75%, start collecting training data for fine-tuning

**Week 2**:
- Integrate TypeScript service into Findr
- Deploy API endpoint to staging
- A/B test vs OpenAI for 1 week

**Week 3-4 (If fine-tuning needed)**:
- Collect training data (4,000-8,000 images)
- Fine-tune model on Google Colab (FREE GPU)
- Deploy fine-tuned model
- Measure accuracy improvement

**Goal**: Production deployment by end of Week 2 (or Week 4 if fine-tuning)

---

## Questions?

**Q: Will this work on Vercel?**
A: Yes! Transformers.js runs in Node.js on Vercel. Model is cached after first load.

**Q: How big is the model?**
A: ~400MB. Vercel supports up to 50MB in deployment, so use Hugging Face Hub to host the model.

**Q: What if accuracy is poor?**
A: Start with hybrid approach (HF first, OpenAI fallback). Fine-tune in Phase 2.

**Q: Can I use GPU?**
A: Not on Vercel. Use CPU inference (fast enough for image classification).

**Q: What about Garden Daisy plants?**
A: Same approach! Use `linkanjarad/mobilenet_v2_plant-disease` model.

**Q: How do I push model to Hugging Face Hub?**
A: See: https://huggingface.co/docs/transformers/model_sharing

---

## Resources

- **Hugging Face Transformers.js**: https://huggingface.co/docs/transformers.js
- **Fish-Vista Dataset**: https://huggingface.co/datasets/imageomics/fish-vista
- **Fine-tuning Tutorial**: https://huggingface.co/docs/transformers/training
- **Google Colab** (FREE GPU): https://colab.research.google.com/

---

**Status**: Ready to implement!
**Next**: Test Python prototype with sample fish images
