# TypLens V1.1

For a runnable browser implementation, see [browser/README.md](https://github.com/dbccccccc/TypLens/blob/3d19c7d09c60c22913494efa0e803f2967ae14e6/browser/README.md).
The example contains inference code only; the training implementation is not included.

TypLens V1.1 converts an image of a printed mathematical formula directly into
Typst math source. Its 29.2-million-parameter model can run locally in a browser
using the supplied full-precision or compact ONNX graphs.

Repository name: **TypLens**. Model version: **V1.1**. Release tag: **v1.1**.

[Hugging Face model repository](https://huggingface.co/dbcccc/TypLens) · [GitHub repository](https://github.com/dbccccccc/TypLens)

## What changed from V1

- A newly trained **single-channel grayscale** model replaces V1's RGB encoder
  input. Training ran for eight epochs (33,544 updates) on the original 268,346
  training pairs, starting from the upstream-derived native-vocabulary
  initializer rather than continuing the released V1 checkpoint.
- Training and inference use the same luminance conversion, background polarity
  normalization, content bounding box, 2% margin and 384×384 bicubic resize.
- Full FP32 and compact dynamic INT8 ONNX exports come from the final checkpoint.
  The vocabulary and native Typst output format remain unchanged.

**Integration change:** V1.1 requires [1, 1, 384, 384] tensors and the custom
preprocessing described in [INFERENCE.md](INFERENCE.md). Replace the preprocessing
and both model graphs together. V1's RGB input pipeline is incompatible.

## Files and sizes

| Format | Files in the Hugging Face pack | Weight bytes | Download size, decimal MB |
|---|---|---:|---:|
| Native FP32 | model.safetensors | 116,870,000 | 116.9 |
| Browser FP32 | onnx/fp32/encoder.onnx + decoder.onnx | 117,177,351 | 117.2 |
| Browser compact | onnx/int8/encoder.onnx + decoder.onnx | 33,120,766 | 33.1 |

The compact ONNX weights are 71.7% smaller than the FP32 ONNX weights. These
numbers exclude tokenizer metadata and the application's runtime. Compact means
dynamic INT8 linear weights; some operations and the caches remain FP32.
Hugging Face provides both ONNX variants; the GitHub browser ZIP bundles both.

This distribution contains weights, tokenizer/configuration, documentation and
license notices. It contains no training code, optimizer state, training images
or inference runtime binaries. See [release-manifest.json](release-manifest.json)
for file hashes and [INFERENCE.md](INFERENCE.md) for integration.

## Recorded evaluation

The final server FP32 checkpoint was reviewed on **135 reused IBEM development
images** with greedy generation and a maximum of 1,023 new tokens:

| Measure | Result |
|---|---:|
| Natural end of generation | 135/135 |
| Typst compilation | 135/135 |
| Content accepted by source-image review | 127/135 (94.1%) |
| Exact match to one reference source string | 76/135 (56.3%) |
| Accepted despite a different reference source string | 51 |

Equivalent Typst spellings and nonessential spacing differences were accepted;
visible symbols, indices, accents and matrix structure still had to match.
The reviewer was an AI assistant, without an independent second annotator.
38 cases were reviewed anew; 97 judgments were inherited only when both the
source image hash and complete prediction matched the earlier source review.
This reused development set also informed checkpoint selection, so **94.1% is
not an independent test accuracy**. It is a server FP32 result, not a measured
compact-model accuracy. No controlled V1 versus V1.1 accuracy comparison is claimed.

Both ONNX variants completed three real desktop Edge/WASM smoke-test images
each. Input tensors matched the training preprocessing and generated tokens
matched their CPU ONNX references; on these three images both variants also
matched server FP32 outputs. One image retained a known accent error. These
checks establish basic execution/parity, not full accuracy or absence of
quantization loss. See [evaluation-summary.json](evaluation-summary.json).

## Intended use and limitations

Use one printed formula crop from a PDF, paper or screenshot per request.
This model does not convert full documents. Handwriting, mobile inference and
WebGPU performance have not been evaluated for this release. Small accents,
similar symbols, missing indices and complex block matrices remain failure cases.
Inspect the generated formula before use. Applications can show partial or
validation-failed output with a warning so that it remains editable.

## Provenance and license

The model derives from [Pix2Text-MFR-1.5](https://huggingface.co/breezedeus/pix2text-mfr-1.5)
(pinned revision `1cef9f0bdcd6a4c63df7de1311fb0894593340cc`), with a native Typst
vocabulary and a one-channel image projection. It has 29,206,656 parameters and
uses 1,199 tokens. Source checkpoint SHA-256:
`d42cfd2da242a11ecdb1fe8727ee01e6896a116cd46f74357c4fdce90eebe788`.

The release retains **MIT** for project contributions, with the Pix2Text and
Microsoft MIT notices. Training data came from UniMER and IBEM. Dataset attribution
and component-level provenance limits are retained in [NOTICE.md](NOTICE.md).
The model license does not relicense those datasets. Keep [LICENSE](LICENSE),
NOTICE.md and licenses/ when redistributing the weights.
