# Third-party notices

## TypLens-V1 (compact INT8)

TypstPad redistributes only the INT8 encoder and decoder from
[TypLens-V1](https://github.com/dbccccccc/TypLens), plus its model metadata and
tokenizer. The weights are pinned to Hugging Face revision
`10f682efb9791d57fd36d12f7baa8736bc5d92ae` of
[dbcccc/TypLens](https://huggingface.co/dbcccc/TypLens).
The model card and project license are from GitHub revision
`32fad5443f7075301ea4a0458556ee21dd665bcb`.

The project contributions are MIT licensed. TypLens is a fine-tuned derivative
of Pix2Text-MFR-1.5 and retains the Pix2Text and Microsoft TrOCR MIT notices.
Keep [model/LICENSE](model/LICENSE), [model/NOTICE.md](model/NOTICE.md), and
the [Pix2Text](model/licenses/PIX2TEXT-MIT.txt) and
[TrOCR](model/licenses/TROCR-MIT.txt) notices with redistributed weights.
The model notice also records IBEM and UniMER training-data attribution and
limitations. No dataset images or training source are bundled.

The upstream [model card](model/MODEL_CARD.md) and
[release manifest](model/release-manifest.json) describe both upstream variants
for provenance; TypstPad ships and loads only INT8 (33,907,198 bytes of weights).
The original ONNX files are named `onnx/int8/encoder.onnx` and
`onnx/int8/decoder.onnx`; this bundle names them `encoder.int8.onnx` and
`decoder.int8.onnx`. [asset-manifest.json](asset-manifest.json) inventories the
local files, and [model/SHA256SUMS](model/SHA256SUMS) lists their checksums.

## Pillow resampling

The TypeScript image preprocessor adapts Pillow 11.2.1's separable bicubic
resampling algorithm and rounding to match the model's inference contract.
See [PILLOW-LICENSE](PILLOW-LICENSE) and the
[upstream implementation](https://github.com/python-pillow/Pillow/blob/11.2.1/src/libImaging/Resample.c).

## ONNX Runtime Web

The browser package redistributes the pinned JavaScript/WASM runtime from ONNX
Runtime Web 1.22.0. ONNX Runtime is copyright Microsoft Corporation and is
licensed under the MIT License. See [ONNXRUNTIME-LICENSE](ONNXRUNTIME-LICENSE)
and <https://github.com/microsoft/onnxruntime/tree/v1.22.0>.

