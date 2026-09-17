
# TypLens-V1

**A small image-to-Typst model for printed formula screenshots.** It generates
native Typst formula text directly and can run entirely in a browser.

This is a separate model release from [IBEM-im2typst](https://huggingface.co/dbcccc/IBEM-im2typst).
It uses the best current native SX checkpoint, not the latest experimental run.
This is an **experimental weights-only release**; training code is not included.

| Format | Location | Model file size |
| --- | --- | ---: |
| Full precision, FP32 | model.safetensors | 117.7 MB |
| Full precision, cached ONNX | onnx/fp32/ | 118.0 MB |
| Compact, INT8 weight quantization | onnx/int8/ | 33.9 MB |

Sizes use decimal MB and exclude configuration and the consuming application's
runtime. The compact variant is 71.3% smaller than the full ONNX variant.
All variants share the same 29,403,264-parameter source checkpoint.

## Intended use

Input: a single tightly cropped, dark-on-light printed mathematical formula,
such as a PDF or paper screenshot. Output: native Typst math content. This is
formula recognition, not document conversion, page layout detection or general OCR.
The tokenizer, byte mapping and preprocessing configuration are required assets.

Use the full ONNX variant for best reviewed quality or the INT8 variant for a
smaller download. See [INFERENCE.md](INFERENCE.md) for the input, cache and decoding
contract. The graphs run in ONNX Runtime; the package does not bundle runtime
libraries or executable inference/training source.

## Existing development results

| Measure | Full precision | Compact |
| --- | ---: | ---: |
| Paper screenshots correct in content and symbol style | 38/47 (80.9%) | 38/47 (80.9%) |
| Other validation formulas correct in content and symbol style | 128/135 (94.8%) | 127/135 (94.1%) |
| Generation ended normally | 182/182 | 181/182 |
| Desktop browser median inference | 399 ms | 332 ms |
| Desktop browser P95 inference | 662 ms | 602 ms |

The results above come from the existing September 16, 2026 browser experiment,
using Chromium 152 on Windows with four WASM threads. Time excludes preprocessing,
model initialization and network download. It is not a promise for other devices.
The same development examples were used repeatedly, and content/style judgments
were made by one Codex reviewer, without an independent second reviewer. These
are **not independent test accuracy** and are not comparable to the old release's
92.63% strict text score on its different IBEM validation set.

The compact model failed to terminate on one validation example. Both variants
can produce mathematically wrong formulas, even when their Typst compiles.
Long expressions, subscripts, symbols and style distinctions remain error sources.
The checkpoint has not passed the project's existing release-quality gate;
publishing it as experimental does not change that result. Review outputs.

## Model and data provenance

Base: Pix2Text-MFR-1.5, revision
`1cef9f0bdcd6a4c63df7de1311fb0894593340cc`, adapted to native Typst targets.
The screenshot-adaptation stage used 268,346 training pairs drawn from UniMER
and IBEM. Source LaTeX annotations were used in data preparation; the released
model generates Typst directly and has no inference-time conversion bridge.

Source checkpoint SHA-256:
`900938e6cca81d62448fa8693a78a42d91aeea328b998887da7f1d65d7b11258`.
Version: **v1**. This release renames and packages the existing weights;
it does not retrain, merge, or otherwise change them.

## License

MIT for the released project contributions, with the upstream MIT notices
retained. See [LICENSE](LICENSE), [NOTICE.md](NOTICE.md), and `licenses/`.
Training datasets retain their own terms and are not included. The model license
does not provide rights to third-party images or annotations.
