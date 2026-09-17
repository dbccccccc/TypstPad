# Inference contract

The models recognize one tightly cropped printed formula and return the content
of a Typst math expression. Add `$` delimiters in the consuming application.
No LaTeX conversion is needed. This package contains weights and metadata only;
the consuming application supplies preprocessing, generation, and its runtime.

## Images

Composite transparency onto white, convert to RGB, and resize the complete image
to 384 by 384 using Pillow-compatible bicubic interpolation. Do not center-crop,
change aspect handling, invert polarity, or use the old Phase10 preprocessing.
Rescale each channel to float32 with `(pixel / 255 - 0.5) / 0.5`. The encoder
expects float32 `pixel_values` of shape `[1, 3, 384, 384]` in channel-first order.

## Cached ONNX graphs

Each ONNX variant contains an encoder and decoder; keep the two from the same
variant together. These are custom cached exports, not the upstream Pix2Text
filenames or a generic Optimum export layout.

The encoder outputs float32 `cross_keys` and `cross_values`, each shaped
`[6, 1, 8, 578, 32]`. Initialize `self_keys` and `self_values` as empty float32
tensors shaped `[6, 1, 8, 0, 32]`.

At each decoder step supply int64 `token_ids` of shape `[1, 1]`, the previous
`self_keys` and `self_values`, and the encoder's `cross_keys` and `cross_values`.
Outputs are `logits`, `self_keys_out`, and `self_values_out`. Select the first
maximum over the 1,199 vocabulary scores, pass that token into the next step,
and reuse the new self caches. The first input token is BOS=1. EOS=2 ends decoding.
Allow at most 1,023 generated tokens after BOS, including EOS. Do not fabricate
EOS at the limit or return a truncated formula as complete.

For each content token, append the bytes at that index in `token-bytes.json`,
then decode the full byte sequence as strict UTF-8. Reject generated reserved
IDs 0, 1, 3 or 4 and invalid UTF-8. Preserve the resulting Typst literally;
do not apply the original model's syntax repair or LaTeX conversion.

The compact model quantizes constant MatMul/Gemm weights dynamically with
per-channel signed INT8. Input, activations and caches remain floating-point.
Both exports were run with the WASM provider in desktop Chromium. Four threads
need cross-origin isolation headers. WebGPU and mobile behavior are not claimed.

## Safetensors

The Hugging Face pack additionally contains the optimizer-free FP32 parameters
as `model.safetensors`, with standard DeiT/TrOCR VisionEncoderDecoderModel keys.
The recorded architecture uses a DeiT encoder **without its unused pooling
layer**, a TrOCR causal decoder, and eager attention. Transformers 4.52.3 was
used for the recorded results. The tokenizer has 1,199 entries and is distinct
from the upstream LaTeX tokenizer. Use the supplied tokenizer metadata.

The packaged generation_config.json sets max_new_tokens to 1,023 to match the
reviewed browser budget. This adjusts metadata only; the learned parameters and
ONNX graph bytes are unchanged. No new benchmark was run for packaging.
