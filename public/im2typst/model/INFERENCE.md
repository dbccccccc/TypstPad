# TypLens V1.1 inference contract

TypLens V1.1 recognizes a single printed formula crop and directly generates the
content of a Typst math expression. The consuming application may add `$`
delimiters. No LaTeX conversion is involved in inference. This is a weights-only
release: preprocessing, generation and runtime libraries are supplied by the
application.

## Required single-channel preprocessing

V1.1 expects float32 `pixel_values` shaped **[1, 1, 384, 384]** (NCHW).
Do not reuse V1's three-channel input or duplicate luminance into RGB.
The contract is `native-content-box-gray-v2`, also recorded in
`preprocessor_config.json`. Apply these operations in order:

1. Decode the image to 8-bit RGBA. Composite each color channel C onto white:
   `floor((C*A + 255*(255-A) + 127) / 255)`.
2. Convert the resulting RGB bytes to one luminance byte:
   `Y = floor((77*R + 150*G + 29*B + 128) / 256)`.
   Retain intermediate gray levels; do not threshold the image to black and white.
3. Collect the perimeter pixels, counting each corner once. Let b be the lower
   median (sorted index `floor((N-1)/2)`). If b is below 128, replace every Y
   with `255-Y` and replace b with `255-b`.
4. Find the inclusive bounding box of all pixels satisfying `Y <= b-12`.
   Retain isolated dots and accents. If no pixel qualifies, use the whole image.
5. For a nonempty box with ink height h, add `max(1, floor(0.02*h + 0.5))`
   pixels on each side. Copy the image pixels within this rectangle, filling
   only portions outside the source image with b.
6. Resize the resulting rectangle directly to 384 by 384 with Pillow-compatible
   uint8 bicubic interpolation (`pillow-bicubic-u8-v1`). This is the trained
   resize behavior; do not substitute an aspect-ratio letterbox or center crop.
7. Convert to float32 and calculate `(Y/255 - 0.5)/0.5`, using float32 arithmetic.
   Add batch and channel axes to obtain [1, 1, 384, 384].

The standard Transformers DeiT image processor does **not** implement the custom
grayscale, background polarity and content-box steps above. Its presence in the
configuration does not make a generic image-to-text pipeline sufficient. Supply
the fully preprocessed tensor to the model; do not apply normalization twice.
Browser canvas interpolation is not guaranteed to match Pillow bicubic.

## Cached ONNX graphs

The full variant is `onnx/fp32/`; the compact variant is `onnx/int8/`.
Each GitHub asset ZIP instead places its encoder and decoder in the ZIP root.
Keep the encoder and decoder from the same version and precision together.
These are custom cached exports, not a generic Optimum export layout.

| Graph | Name | Type and shape |
|---|---|---|
| Encoder input | pixel_values | float32 [1, 1, 384, 384] |
| Encoder outputs | cross_keys, cross_values | float32 [6, 1, 8, 578, 32] each |
| Decoder input | token_ids | int64 [1, 1] |
| Decoder inputs | self_keys, self_values | float32 [6, 1, 8, past, 32] each |
| Decoder inputs | cross_keys, cross_values | Encoder outputs, unchanged |
| Decoder output | logits | float32 [1, 1199] |
| Decoder outputs | self_keys_out, self_values_out | float32 [6, 1, 8, past+1, 32] each |

Initialize both self caches with past=0. Start with BOS=1. At each step select
the first maximum of the 1,199 logits, feed that token into the next step, and
reuse the returned self caches. EOS=2 ends generation. Allow at most **1,023 new
tokens after BOS, including EOS**. Do not force EOS when reaching the limit.

For each content token, append its byte array from `token-bytes.json`. Decode
the complete byte sequence as strict UTF-8. The first five entries are reserved;
generated IDs 0, 1, 3 and 4, or invalid UTF-8, indicate a decoding error. Preserve
the decoded Typst literally, without syntax repair or LaTeX conversion.

Applications should expose any available decoded text for editing and copying
even when generation is incomplete or formula checks fail. Display the warning
separately and keep completion/validation flags false. A syntax or compilation
check passing does not establish mathematical correctness. Empty or undecodable
output should produce a clear error rather than a fabricated formula.

The compact graphs use ONNX Runtime dynamic per-channel signed INT8 quantization
of constant MatMul/Gemm weights. Inputs and caches remain float32; convolution
and other unquantized operations also remain FP32. It is not an all-INT8 model.

Both variants were exercised with ONNX Runtime 1.22.0 and the WASM provider in
desktop Edge. Four WASM threads require cross-origin isolation. Runtime binaries
are not bundled. WebGPU and mobile inference have not been evaluated for V1.1.

## Native safetensors

The Hugging Face pack contains optimizer-free FP32 `model.safetensors`, the
one-channel architecture configuration, and the 1,199-entry tokenizer. The
recorded architecture is a DeiT encoder **without its unused pooling layer**
and a TrOCR causal decoder, combined as a VisionEncoderDecoderModel. Construct
DeiT with `add_pooling_layer=False` and use eager attention to match the recorded
setup. The encoder has 12 layers, hidden size 384 and 6 heads; the decoder has
6 layers, hidden size 256 and 8 heads. Transformers 4.52.3 was used.

The native configuration retains `use_cache: false`; the custom ONNX graphs
above provide their own explicit caches. The packaged generation configuration
sets greedy decoding, no forced EOS, and a 1,023-token generation budget. These
are inference metadata changes only. Checkpoint and ONNX weight bytes are
unchanged from the completed training/export run.
