# IBEM Semantic Length33 Phase 10 — Experimental Browser Trial

## Status

This is the strongest validation-selected checkpoint currently preserved in
the IBEM production-continuation lineage. It is being exported for local,
hands-on browser testing only. It is **not** release-qualified or production
ready, and its displayed token score is not a calibrated probability of
correctness.

Phase 13 is newer but was rejected because it regressed the production-critical
33–64-token slice. This bundle therefore deliberately uses the Phase 10
step-2,000 checkpoint selected on the document-disjoint validation split.

## Identity

- Model name: `ibem-semantic-length33-phase10-step002000`
- Checkpoint: `checkpoint-step-002000.pt`
- Checkpoint SHA-256:
  `29d4a51adc71526f395750bb12a1783fbfd9bfa5a4c68fc9bfb665b68c633d52`
- Training run ID:
  `64e092c2013ed43e35d3573e3e2a161c9948f12279ebb92513ab6b15c8811814`
- Parameters: 14,157,152
- Model implementation: `cnn-transformer-v3`
- Training implementation: `deterministic-trainer-v17`
- Vocabulary tokens: 528, including UTF-8 byte fallback
- Maximum trained output length: 512 tokens

## Architecture and preprocessing

The recognizer uses a compact convolutional image encoder, depthwise axial 2-D
context, a height-4 learned horizontal-preserving pool, and a three-layer
autoregressive Transformer decoder. It uses `d_model=384`, six attention
heads, a 1,280-wide feed-forward block, 256-pixel input height, and up to
2,048 pixels of input width.

Input is polarity-normalized, foreground-cropped, resized while preserving
aspect ratio, and padded. The app is intended for one tightly cropped printed
formula at a time; it is not a page segmenter or general OCR system.

## Training data and initialization

- 129,303 real training crops from the IBEM dataset, covering 480 training
  documents.
- Validation uses 16,899 crops from 60 different documents.
- Targets are deterministically converted package-free Typst with semantic
  spacing canonicalization.
- No Fusion dataset, synthetic formula corpus, teacher-generated labels,
  external pretrained model, or fused training samples are used.
- The lineage began from explicit seeded random initialization. Phase 10 is a
  same-lineage continuation from earlier IBEM checkpoints; it does not import
  external pretrained weights.

IBEM is published under CC BY 4.0 at
<https://zenodo.org/records/7963703>. The dataset itself is not included in
the model bundle.

## Validation evidence

The Phase 10 step-2,000 checkpoint was selected without opening calibration or
test data. On the complete 16,899-image validation split:

| Metric | FP32 result |
| --- | ---: |
| Exact match | 92.6268% |
| Package-free Typst compile rate | 99.5680% |
| Mean token similarity | 98.9404% |
| Embedded exact match | 96.8576% |
| Displayed exact match | 70.1197% |
| At most 32 tokens | 97.8519% |
| 33–64 tokens | 88.4282% |
| 65–128 tokens | 80.1895% |
| 129–256 tokens | 61.4443% |
| Over 256 tokens | 25.8675% |

The strict production gate requires at least 90% exact match for the 33–64
slice, so this checkpoint fails one production requirement. A smaller runtime
compact 33–64 probe scored 105/145 exact. These failures are why this model is
presented only as an experimental local trial.

## Known limitations

- Small top attachments, dot accents, matrices, and alignment structures remain
  the dominant compact-formula errors.
- Long and multiline displayed formulas are substantially weaker than short
  inline formulas.
- Handwriting, photographs, perspective distortion, surrounding prose, and
  arbitrary screenshot styles are not qualified.
- Exact-match evaluation is strict: one wrong token makes the formula
  non-exact even if it compiles.
- ONNX compression and built-in parity results are recorded in the generated
  `deployment.json`; they do not replace a full quantized-domain evaluation.
- Calibration and held-out test remain unopened for this candidate.

Always inspect and compile the returned Typst before relying on it.

