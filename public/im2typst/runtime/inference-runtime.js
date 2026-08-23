import {
  decodeTokens,
  finalizeFormulaTokenIds,
  topTwoSoftmax,
  updateRepetitionGuard,
} from "./core.js?release=phase10-step002000-29d4a51adc71";

function safeDispose(tensor) {
  try {
    tensor?.dispose?.();
  } catch {
    // Session-owned and already-disposed tensors do not need a second cleanup.
  }
}

export async function runCachedGreedy(model, prepared, onProgress = () => {}) {
  const {
    ort,
    encoder,
    decoder,
    config,
    deployment,
    outputPolicy,
    vocabulary,
  } = model;
  const image = new ort.Tensor(
    "float32",
    prepared.tensorData,
    [1, 1, prepared.height, prepared.bucket],
  );
  const pixelWidths = new ort.Tensor(
    "int64",
    BigInt64Array.from([BigInt(prepared.pixelWidth)]),
    [1],
  );
  let encoded = null;
  let selfKeys = null;
  let selfValues = null;

  const totalStarted = performance.now();
  let encoderMilliseconds = 0;
  let decoderMilliseconds = 0;
  const tokenIds = [];
  const selectedMargins = [];
  const selectedProbabilities = [];
  let eosReached = false;
  let repetitionGuardTriggered = false;
  let numericNormalizationCount = 0;
  let previousToken = -1;
  let repetitionRunLength = 0;

  try {
    const encoderStarted = performance.now();
    encoded = await encoder.run({
      images: image,
      pixel_widths: pixelWidths,
    });
    encoderMilliseconds = performance.now() - encoderStarted;
    onProgress({ phase: "decoder", tokenCount: 0 });

    const headWidth = config.d_model / config.attention_heads;
    selfKeys = new ort.Tensor(
      "float32",
      new Float32Array(0),
      [config.decoder_layers, 1, config.attention_heads, 0, headWidth],
    );
    selfValues = new ort.Tensor(
      "float32",
      new Float32Array(0),
      [config.decoder_layers, 1, config.attention_heads, 0, headWidth],
    );

    let current = config.bos_id;
    const maxOutputTokens = deployment.max_output_tokens;
    const decoderStarted = performance.now();
    for (let position = 0; position < maxOutputTokens - 1; position += 1) {
      const tokenTensor = new ort.Tensor(
        "int64",
        BigInt64Array.from([BigInt(current)]),
        [1, 1],
      );
      const positionTensor = new ort.Tensor(
        "int64",
        BigInt64Array.from([BigInt(position)]),
        [1],
      );
      const previousKeys = selfKeys;
      const previousValues = selfValues;
      let result;
      try {
        result = await decoder.run({
          token_ids: tokenTensor,
          position: positionTensor,
          self_keys: previousKeys,
          self_values: previousValues,
          cross_keys: encoded.cross_keys,
          cross_values: encoded.cross_values,
          memory_padding_mask: encoded.memory_padding_mask,
        });
      } finally {
        safeDispose(tokenTensor);
        safeDispose(positionTensor);
      }

      const tokenScore = topTwoSoftmax(result.logits.data);
      current = tokenScore.firstIndex;
      selectedProbabilities.push(tokenScore.firstProbability);
      selectedMargins.push(tokenScore.margin);
      selfKeys = result.self_keys_out;
      selfValues = result.self_values_out;
      safeDispose(previousKeys);
      safeDispose(previousValues);
      safeDispose(result.logits);

      if (current !== config.eos_id) {
        const repetition = updateRepetitionGuard(
          previousToken,
          repetitionRunLength,
          current,
        );
        previousToken = repetition.previousToken;
        repetitionRunLength = repetition.runLength;
        if (repetition.triggered) {
          current = config.eos_id;
          repetitionGuardTriggered = true;
          selectedProbabilities[selectedProbabilities.length - 1] = 1e-12;
          selectedMargins[selectedMargins.length - 1] = -1;
        }
      }
      if (current === config.eos_id) {
        eosReached = true;
        break;
      }
      tokenIds.push(current);
      if (tokenIds.length === 1 || tokenIds.length % 4 === 0) {
        onProgress({ phase: "decoder", tokenCount: tokenIds.length });
      }
      if (tokenIds.length % 8 === 0) {
        await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
      }
    }
    decoderMilliseconds = performance.now() - decoderStarted;
    let syntaxRepairCount = 0;
    if (eosReached) {
      const finalized = finalizeFormulaTokenIds(
        vocabulary,
        tokenIds,
        outputPolicy.allowed_calls,
        outputPolicy.allowed_quoted ?? [],
        maxOutputTokens,
      );
      tokenIds.splice(0, tokenIds.length, ...finalized.tokenIds);
      syntaxRepairCount = finalized.syntaxRepairCount;
      numericNormalizationCount = finalized.numericNormalizationCount;
      if (syntaxRepairCount || numericNormalizationCount) {
        selectedProbabilities.push(1e-12);
        selectedMargins.push(-1);
      }
    }
    const geometricMeanProbability = selectedProbabilities.length
      ? Math.exp(
          selectedProbabilities.reduce(
            (sum, probability) => sum + Math.log(Math.max(probability, 1e-12)),
            0,
          ) / selectedProbabilities.length,
        )
      : 0;

    return {
      confidence: {
        geometricMeanProbability,
        meanMargin: selectedMargins.length
          ? selectedMargins.reduce((sum, value) => sum + value, 0) /
            selectedMargins.length
          : 0,
        minimumMargin: selectedMargins.length
          ? Math.min(...selectedMargins)
          : 0,
        minimumProbability: selectedProbabilities.length
          ? Math.min(...selectedProbabilities)
          : 0,
      },
      decoderMilliseconds,
      encoderMilliseconds,
      eosReached,
      numericNormalizationCount,
      repetitionGuardTriggered,
      syntaxRepairCount,
      text: decodeTokens(vocabulary, tokenIds),
      tokenIds,
      totalMilliseconds: performance.now() - totalStarted,
    };
  } finally {
    safeDispose(image);
    safeDispose(pixelWidths);
    safeDispose(selfKeys);
    safeDispose(selfValues);
    if (encoded) {
      for (const tensor of Object.values(encoded)) {
        safeDispose(tensor);
      }
    }
  }
}
