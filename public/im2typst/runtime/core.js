const SPECIAL_TOKENS = new Set(["<pad>", "<bos>", "<eos>", "<unk>"]);
const BYTE_TOKEN = /^<0x[0-9A-F]{2}>$/;
const CONFIDENCE_SCHEMA = "formula-confidence-calibration-v1";
const CONFIDENCE_SCORE = "geometric_mean_selected_token_probability";
const SYNTHETIC_OUTPUT_POLICY_SCHEMA = "formula-output-policy-v3";
const IBEM_OUTPUT_POLICY_SCHEMA = "ibem-formula-output-policy-v1";
const ALLOWED_FORMULA_CHARACTERS =
  /^[A-Za-z0-9_+\-/<>=!.,;:()\x5B\x5D^| "]*$/;
const CALLED_NAME = /([A-Za-z][A-Za-z0-9.-]*)\(/g;
const QUOTED_TEXT = /"([^"]*)"/g;
const CODE_LITERAL = /#[A-Za-z][A-Za-z0-9._-]*/g;
const CODE_MARKERS = ["#", "\\", "@", "`", "$", "{", "}", "//", "/*", "*/"];
const IBEM_CALLED_NAME = /([A-Za-z][A-Za-z0-9.-]*)\s*\(/g;
const IBEM_APPROVED_CALLS = new Set([
  "acute",
  "arrow",
  "arrow.l",
  "attach",
  "breve",
  "caron",
  "dot",
  "dot.double",
  "dot.triple",
  "frac",
  "grave",
  "hat",
  "macron",
  "mat",
  "op",
  "overline",
  "sqrt",
  "tilde",
  "underline",
]);
const IBEM_APPROVED_ESCAPES = new Set([
  "\\",
  "\\ ",
  '\\"',
  "\\(",
  "\\)",
  "\\*",
  "\\,",
  "\\/",
  "\\;",
  "\\@",
  "\\[",
  "\\]",
  "\\{",
  "\\}",
  "\\√",
]);
const IBEM_FORBIDDEN_UNESCAPED = new Set([
  "#",
  "$",
  "@",
  "`",
  "{",
  "}",
  '"',
  "\\",
]);
const IBEM_FORBIDDEN_FRAGMENTS = ["//", "/*", "*/"];
const DELIMITER_PAIRS = new Map([
  ["(", ")"],
  ["[", "]"],
]);
const CLOSING_DELIMITERS = new Map([
  [")", "("],
  ["]", "["],
]);
export const DECODE_REPETITION_LIMIT = 32;

export function updateRepetitionGuard(
  previousToken,
  runLength,
  candidateToken,
  limit = DECODE_REPETITION_LIMIT,
) {
  if (!Number.isInteger(candidateToken) || !Number.isInteger(runLength)) {
    throw new Error("Repetition guard state must contain integer tokens and runs.");
  }
  if (!Number.isInteger(limit) || limit < 2) {
    throw new Error("Repetition guard limit must be an integer of at least two.");
  }
  const nextRunLength =
    runLength > 0 && candidateToken === previousToken ? runLength + 1 : 1;
  return {
    previousToken: candidateToken,
    runLength: nextRunLength,
    triggered: nextRunLength >= limit,
  };
}

export function delimiterClosureSuffix(text) {
  const stack = [];
  let quoted = false;
  for (const character of text) {
    if (character === '"') {
      quoted = !quoted;
    } else if (!quoted && DELIMITER_PAIRS.has(character)) {
      stack.push(character);
    } else if (!quoted && CLOSING_DELIMITERS.has(character)) {
      if (
        !stack.length ||
        stack[stack.length - 1] !== CLOSING_DELIMITERS.get(character)
      ) {
        return null;
      }
      stack.pop();
    }
  }
  if (quoted) {
    return null;
  }
  return stack
    .reverse()
    .map((character) => DELIMITER_PAIRS.get(character))
    .join("");
}

function encodeFormulaText(vocabulary, text) {
  const byteToken = /^<0x[0-9A-F]{2}>$/;
  const lookup = new Map(
    vocabulary.tokens.map((token, index) => [token, index]),
  );
  const pieces = vocabulary.tokens
    .filter(
      (token) => !SPECIAL_TOKENS.has(token) && !byteToken.test(token),
    )
    .sort((left, right) => right.length - left.length || left.localeCompare(right));
  const output = [];
  for (let position = 0; position < text.length; ) {
    const piece = pieces.find((candidate) => text.startsWith(candidate, position));
    if (piece !== undefined) {
      output.push(lookup.get(piece));
      position += piece.length;
      continue;
    }
    const character = String.fromCodePoint(text.codePointAt(position));
    for (const byte of new TextEncoder().encode(character)) {
      const tokenId = lookup.get(
        `<0x${byte.toString(16).toUpperCase().padStart(2, "0")}>`,
      );
      if (tokenId === undefined) {
        throw new Error("The vocabulary lacks a required byte token.");
      }
      output.push(tokenId);
    }
    position += character.length;
  }
  return output;
}

function removeUnapprovedQuoteMarks(text, allowedQuoted) {
  const protectedMarks = new Set();
  for (const value of new Set(allowedQuoted)) {
    const literal = `"${value}"`;
    let start = 0;
    while (true) {
      const position = text.indexOf(literal, start);
      if (position < 0) {
        break;
      }
      protectedMarks.add(position);
      protectedMarks.add(position + literal.length - 1);
      start = position + literal.length;
    }
  }
  return [...text]
    .filter(
      (character, index) =>
        character !== '"' || protectedMarks.has(index),
    )
    .join("");
}

function topLevelCommas(text, start, end) {
  let depth = 0;
  let quoted = false;
  let count = 0;
  for (let index = start; index < end; index += 1) {
    const character = text[index];
    if (character === '"') {
      quoted = !quoted;
    } else if (quoted) {
      continue;
    } else if (DELIMITER_PAIRS.has(character)) {
      depth += 1;
    } else if (CLOSING_DELIMITERS.has(character)) {
      depth = Math.max(depth - 1, 0);
    } else if (character === "," && depth === 0) {
      count += 1;
    }
  }
  return count;
}

function unwrapMalformedCalls(text) {
  const stack = [];
  const matchingCloser = new Map();
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      quoted = !quoted;
    } else if (!quoted && character === "(") {
      stack.push(index);
    } else if (!quoted && character === ")" && stack.length) {
      matchingCloser.set(stack.pop(), index);
    }
  }
  const unwrap = new Set();
  for (const match of text.matchAll(CALLED_NAME)) {
    const name = match[1];
    const opener = match.index + match[0].length - 1;
    const closer = matchingCloser.get(opener);
    if (name !== "cases" && closer !== undefined) {
      const body = text.slice(opener + 1, closer);
      if (body.includes('"if"') || body.includes('"else"')) {
        unwrap.add(opener);
        continue;
      }
    }
    if (
      (name === "frac" || name === "root") &&
      topLevelCommas(
        text,
        opener + 1,
        closer === undefined ? text.length : closer,
      ) !== 1
    ) {
      unwrap.add(opener);
    }
  }
  if (!unwrap.size) {
    return text;
  }
  return [...text]
    .map((character, index) => (unwrap.has(index) ? " " : character))
    .join("");
}

function replaceNonMatrixSemicolons(text) {
  const callOpeners = new Map();
  for (const match of text.matchAll(CALLED_NAME)) {
    callOpeners.set(match.index + match[0].length - 1, match[1]);
  }
  const callStack = [];
  const output = [];
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      quoted = !quoted;
      output.push(character);
    } else if (quoted) {
      output.push(character);
    } else if (character === "(") {
      callStack.push(callOpeners.get(index) ?? null);
      output.push(character);
    } else if (character === ")") {
      if (callStack.length) {
        callStack.pop();
      }
      output.push(character);
    } else if (character === ";" && !callStack.includes("mat")) {
      output.push(" ");
    } else {
      output.push(character);
    }
  }
  return output.join("");
}

export function repairFormulaTokenIds(
  vocabulary,
  tokenIds,
  allowedCalls,
  allowedQuoted,
  maxTotalTokens,
) {
  if (
    !Array.isArray(vocabulary?.tokens) ||
    !Array.isArray(tokenIds) ||
    !Array.isArray(allowedCalls) ||
    !Array.isArray(allowedQuoted) ||
    !Number.isInteger(maxTotalTokens)
  ) {
    throw new Error("Formula repair inputs are invalid.");
  }
  const originalText = decodeTokens(vocabulary, tokenIds);
  const allowed = new Set(allowedCalls);
  const callNormalized = unwrapMalformedCalls(
    removeUnapprovedQuoteMarks(originalText, allowedQuoted),
  )
    .replace(
      CALLED_NAME,
      (match, name) => (allowed.has(name) ? match : `${name} (`),
    );
  const separated = replaceNonMatrixSemicolons(callNormalized)
    .replace(/^(\s*)[_^]+/, "$1")
    .replace(/([_^])[_^]+/g, "$1")
    .replace(/[_^](?=\s|[,;:)\]]|$)/g, "");
  const output = [];
  const stack = [];
  let quoted = false;
  for (const character of separated) {
    if (character === '"') {
      quoted = !quoted;
      output.push(character);
    } else if (quoted) {
      output.push(character);
    } else if (DELIMITER_PAIRS.has(character)) {
      stack.push(character);
      output.push(character);
    } else if (CLOSING_DELIMITERS.has(character)) {
      if (
        stack.length &&
        stack[stack.length - 1] === CLOSING_DELIMITERS.get(character)
      ) {
        stack.pop();
        output.push(character);
      }
    } else {
      output.push(character);
    }
  }
  if (quoted) {
    return { editCount: 0, tokenIds: [...tokenIds] };
  }
  while (stack.length) {
    output.push(DELIMITER_PAIRS.get(stack.pop()));
  }
  const repairedText = output.join("");
  if (repairedText === originalText) {
    return { editCount: 0, tokenIds: [...tokenIds] };
  }
  const repaired = encodeFormulaText(vocabulary, repairedText);
  if (repaired.length + 2 > maxTotalTokens) {
    return { editCount: 0, tokenIds: [...tokenIds] };
  }
  const shared = tokenIds.reduce(
    (count, value, index) => count + Number(repaired[index] === value),
    0,
  );
  return {
    editCount: Math.max(1, Math.max(tokenIds.length, repaired.length) - shared),
    tokenIds: repaired,
  };
}

const ASCII_WHITESPACE = new Set([" ", "\t"]);
const UNARY_SIGN_CONTEXTS = new Set(
  [..."([_^=<>!,:;|*/+-"],
);

function isAsciiDigit(character) {
  return character >= "0" && character <= "9";
}

export function normalizeNumericLexemeText(text) {
  if (typeof text !== "string") {
    throw new Error("Numeric lexeme input must be text.");
  }
  const normalized = [];
  let quoted = false;
  for (let index = 0; index < text.length; ) {
    const character = text[index];
    if (character === '"') {
      quoted = !quoted;
      normalized.push(character);
      index += 1;
      continue;
    }
    if (!quoted && (character === "+" || character === "-")) {
      let previous;
      for (
        let position = normalized.length - 1;
        position >= 0;
        position -= 1
      ) {
        if (!ASCII_WHITESPACE.has(normalized[position])) {
          previous = normalized[position];
          break;
        }
      }
      let following = index + 1;
      while (
        following < text.length &&
        ASCII_WHITESPACE.has(text[following])
      ) {
        following += 1;
      }
      if (
        following > index + 1 &&
        following < text.length &&
        isAsciiDigit(text[following]) &&
        (previous === undefined || UNARY_SIGN_CONTEXTS.has(previous))
      ) {
        normalized.push(character);
        index = following;
        continue;
      }
    }
    normalized.push(character);
    index += 1;
  }
  return normalized.join("");
}

export function normalizeNumericLexemeTokenIds(
  vocabulary,
  tokenIds,
  maxTotalTokens,
) {
  if (
    !Array.isArray(vocabulary?.tokens) ||
    !Array.isArray(tokenIds) ||
    !Number.isInteger(maxTotalTokens)
  ) {
    throw new Error("Numeric lexeme token inputs are invalid.");
  }
  const originalText = decodeTokens(vocabulary, tokenIds);
  const normalizedText = normalizeNumericLexemeText(originalText);
  if (normalizedText === originalText) {
    return { editCount: 0, tokenIds: [...tokenIds] };
  }
  const normalized = encodeFormulaText(vocabulary, normalizedText);
  if (normalized.length + 2 > maxTotalTokens) {
    return { editCount: 0, tokenIds: [...tokenIds] };
  }
  const shared = tokenIds.reduce(
    (count, value, index) => count + Number(normalized[index] === value),
    0,
  );
  return {
    editCount: Math.max(
      1,
      Math.max(tokenIds.length, normalized.length) - shared,
    ),
    tokenIds: normalized,
  };
}

export function finalizeFormulaTokenIds(
  vocabulary,
  tokenIds,
  allowedCalls,
  allowedQuoted,
  maxTotalTokens,
) {
  const repaired = repairFormulaTokenIds(
    vocabulary,
    tokenIds,
    allowedCalls,
    allowedQuoted,
    maxTotalTokens,
  );
  const normalized = normalizeNumericLexemeTokenIds(
    vocabulary,
    repaired.tokenIds,
    maxTotalTokens,
  );
  return {
    numericNormalizationCount: normalized.editCount,
    syntaxRepairCount: repaired.editCount,
    tokenIds: normalized.tokenIds,
  };
}

export function argmax(values) {
  if (!values.length) {
    throw new Error("Cannot take argmax of an empty collection.");
  }
  let bestIndex = 0;
  let bestValue = values[0];
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] > bestValue) {
      bestIndex = index;
      bestValue = values[index];
    }
  }
  return bestIndex;
}

export function topTwoSoftmax(values) {
  if (values.length < 2) {
    throw new Error("At least two logits are required.");
  }
  let firstIndex = -1;
  let secondIndex = -1;
  let firstValue = Number.NEGATIVE_INFINITY;
  let secondValue = Number.NEGATIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    maximum = Math.max(maximum, value);
    if (value > firstValue) {
      secondIndex = firstIndex;
      secondValue = firstValue;
      firstIndex = index;
      firstValue = value;
    } else if (value > secondValue) {
      secondIndex = index;
      secondValue = value;
    }
  }
  let denominator = 0;
  for (const value of values) {
    denominator += Math.exp(value - maximum);
  }
  const firstProbability = Math.exp(firstValue - maximum) / denominator;
  const secondProbability = Math.exp(secondValue - maximum) / denominator;
  return {
    firstIndex,
    firstProbability,
    margin: firstProbability - secondProbability,
    secondIndex,
    secondProbability,
  };
}

export function confidenceDecision(score, eosReached, policy) {
  if (!Number.isFinite(score) || score < 0 || score > 1) {
    throw new Error("Confidence score must be a finite value from zero to one.");
  }
  if (typeof eosReached !== "boolean") {
    throw new Error("EOS state must be boolean.");
  }
  if (
    policy?.schema_version !== CONFIDENCE_SCHEMA ||
    policy?.score_name !== CONFIDENCE_SCORE ||
    policy?.acceptance_operator !== ">" ||
    !Number.isFinite(policy?.threshold) ||
    policy.threshold < 0 ||
    policy.threshold > 1
  ) {
    throw new Error("The confidence calibration policy is invalid.");
  }
  const accepted = eosReached && score > policy.threshold;
  return {
    accepted,
    reason: !eosReached
      ? "missing-eos"
      : accepted
        ? "threshold-passed"
        : "threshold-rejected",
    score,
    threshold: policy.threshold,
  };
}

export function experimentalQualificationDecision(deployment, gate) {
  const confidence = deployment?.confidence;
  const evidence = deployment?.experimental_evidence?.failed_fp32_domain_gate;
  if (
    deployment?.qualification !== "experimental-local-testing-only" ||
    confidence?.experimental_override?.enabled !== true ||
    confidence.experimental_override.reason !== "confidence-release-gates-failed" ||
    confidence.experimental_override.scope !== "local-browser-testing-only" ||
    confidence?.release_gates?.passed !== false ||
    confidence?.negative_test?.passed !== true ||
    deployment?.parity?.int8_all_match !== true ||
    gate?.schema_version !== "student-fp32-gate-outcome-v1" ||
    gate?.candidate_role !== "tuning" ||
    gate?.passed !== false ||
    gate?.training_exhausted !== true ||
    gate?.tuning_round_eligible !== false ||
    !Array.isArray(gate?.failed_gates) ||
    gate.failed_gates.length !== 7 ||
    evidence?.passed !== false ||
    evidence?.failed_gate_count !== gate.failed_gates.length ||
    evidence?.overall_student_exact !== gate?.gates?.overall?.student_exact ||
    evidence?.overall_required_minimum !==
      gate?.gates?.overall?.minimum_student_exact
  ) {
    throw new Error(
      "The experimental deployment does not preserve its failed qualification evidence.",
    );
  }
  return {
    acceptanceRate: confidence.positive_validation.acceptance_rate,
    acceptedPrecision: confidence.positive_validation.accepted_precision,
    failedGateCount: gate.failed_gates.length,
    overallExact: gate.gates.overall.student_exact,
    overallMinimum: gate.gates.overall.minimum_student_exact,
  };
}

export function teacherTrialQualificationDecision(deployment) {
  const confidence = deployment?.confidence;
  const evaluation = deployment?.evaluation;
  const evidence = deployment?.trial_evidence;
  const metrics = evaluation?.metrics;
  const audits = deployment?.quality_audits;
  const quantizedAuditComplete =
    evidence?.quantized_domain_evaluation_complete === true;
  const auditThresholds = audits?.thresholds;
  const validationAudit = audits?.int8_validation;
  const testAudit = audits?.int8_test;
  const requiredAuditGates = [
    "compile_rate_delta",
    "exact_match_delta",
    "token_parity_rate",
    "token_similarity_delta",
  ];
  const validAudit = (audit, split) =>
    audit?.split === split &&
    audit?.precision === "int8" &&
    Number.isInteger(audit?.sample_count) &&
    audit.sample_count > 0 &&
    Number.isFinite(audit?.metrics?.greedy_exact_match) &&
    audit.metrics.greedy_exact_match >= 0 &&
    audit.metrics.greedy_exact_match <= 1 &&
    Number.isFinite(audit?.metrics?.compile_rate) &&
    audit.metrics.compile_rate >= 0 &&
    audit.metrics.compile_rate <= 1 &&
    Number.isFinite(audit?.token_parity_rate) &&
    audit.token_parity_rate >= 0 &&
    audit.token_parity_rate <= 1 &&
    Object.keys(audit?.gates ?? {}).sort().join("|") ===
      requiredAuditGates.join("|") &&
    Object.values(audit.gates).every((value) => value === true);
  const validQuantizedEvidence =
    quantizedAuditComplete &&
    audits?.schema_version === "experimental-quantized-audits-v1" &&
    /^[0-9a-f]{64}$/.test(audits?.source_deployment_sha256 ?? "") &&
    audits?.passed === true &&
    auditThresholds?.minimum_exact_match_delta === -0.005 &&
    auditThresholds?.minimum_compile_rate_delta === -0.005 &&
    auditThresholds?.minimum_token_similarity_delta === -0.002 &&
    auditThresholds?.minimum_token_parity_rate === 0.9 &&
    validAudit(validationAudit, "val") &&
    validationAudit.sample_count === evaluation?.sample_count &&
    validAudit(testAudit, "test") &&
    evidence?.int8_validation_complete === true &&
    evidence?.int8_test_complete === true &&
    evidence?.built_in_int8_all_match ===
      deployment?.parity?.int8_all_match;
  const validParityOnlyEvidence =
    evidence?.quantized_domain_evaluation_complete === false &&
    deployment?.parity?.int8_all_match === true &&
    audits === undefined;
  if (
    deployment?.qualification !== "experimental-teacher-local-testing-only" ||
    (!validParityOnlyEvidence && !validQuantizedEvidence) ||
    confidence?.schema_version !== "uncalibrated-token-score-v1" ||
    confidence?.calibrated !== false ||
    confidence?.provisional !== true ||
    confidence?.score_name !==
      "geometric_mean_selected_token_probability" ||
    evaluation?.backend !== "pytorch-fp32" ||
    evaluation?.split !== "val" ||
    !Number.isInteger(evaluation?.sample_count) ||
    evaluation.sample_count < 1 ||
    !Number.isFinite(metrics?.greedy_exact_match) ||
    metrics.greedy_exact_match < 0 ||
    metrics.greedy_exact_match > 1 ||
    !Number.isFinite(metrics?.compile_rate) ||
    metrics.compile_rate < 0 ||
    metrics.compile_rate > 1 ||
    evidence?.fp32_evaluation_complete !== true ||
    evidence?.confidence_calibration_complete !== false ||
    evidence?.release_qualified !== false
  ) {
    throw new Error(
      "The teacher trial does not preserve its uncalibrated evaluation evidence.",
    );
  }
  const displayedMetrics = quantizedAuditComplete
    ? validationAudit.metrics
    : metrics;
  return {
    compileRate: displayedMetrics.compile_rate,
    exactMatch: displayedMetrics.greedy_exact_match,
    sampleCount: quantizedAuditComplete
      ? validationAudit.sample_count
      : evaluation.sample_count,
  };
}

function hasUniqueStrings(values) {
  return (
    Array.isArray(values) &&
    values.every((value) => typeof value === "string" && value) &&
    new Set(values).size === values.length
  );
}

function ibemOutputPolicyDecision(text, policy) {
  const allowedCharacters = policy?.allowed_characters;
  const allowedCalls = policy?.allowed_calls;
  const allowedEscapes = policy?.allowed_escapes;
  const validCharacterSurface =
    hasUniqueStrings(allowedCharacters) &&
    allowedCharacters.every((value) => {
      const characters = [...value];
      const codePoint = characters[0]?.codePointAt(0);
      return (
        characters.length === 1 &&
        codePoint >= 32 &&
        codePoint !== 127 &&
        !IBEM_FORBIDDEN_UNESCAPED.has(value)
      );
    });
  const validCalls =
    hasUniqueStrings(allowedCalls) &&
    allowedCalls.every((value) => IBEM_APPROVED_CALLS.has(value));
  const validEscapes =
    hasUniqueStrings(allowedEscapes) &&
    allowedEscapes.every((value) => IBEM_APPROVED_ESCAPES.has(value));
  if (
    typeof text !== "string" ||
    policy?.schema_version !== IBEM_OUTPUT_POLICY_SCHEMA ||
    !/^[0-9a-f]{64}$/.test(policy?.dataset_lock_hash ?? "") ||
    !/^[0-9a-f]{64}$/.test(policy?.policy_source_hash ?? "") ||
    policy?.policy_source_split !== "train" ||
    !Number.isInteger(policy?.maximum_characters) ||
    policy.maximum_characters < 1 ||
    policy.maximum_characters > 16_384 ||
    !validCharacterSurface ||
    !validCalls ||
    !validEscapes
  ) {
    throw new Error("The IBEM formula output policy is invalid.");
  }

  const characters = [...text];
  if (!characters.length || characters.length > policy.maximum_characters) {
    return { accepted: false, reason: "empty-or-overlong" };
  }
  const characterSet = new Set(allowedCharacters);
  const escapeSet = new Set(allowedEscapes);
  const skeleton = [];
  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];
    if (character === "\\") {
      const escaped =
        index + 1 < characters.length ? `\\${characters[index + 1]}` : "\\";
      if (!escapeSet.has(escaped)) {
        return { accepted: false, reason: "unapproved-escape" };
      }
      skeleton.push("x");
      if (escaped.length > 1) {
        index += 1;
      }
      continue;
    }
    const codePoint = character.codePointAt(0);
    if (
      codePoint < 32 ||
      codePoint === 127 ||
      !characterSet.has(character)
    ) {
      return { accepted: false, reason: "forbidden-character" };
    }
    if (IBEM_FORBIDDEN_UNESCAPED.has(character)) {
      return { accepted: false, reason: "code-marker" };
    }
    skeleton.push(character);
  }
  const formulaSkeleton = skeleton.join("");
  if (
    IBEM_FORBIDDEN_FRAGMENTS.some((fragment) =>
      formulaSkeleton.includes(fragment),
    )
  ) {
    return { accepted: false, reason: "code-marker" };
  }
  const delimiterSuffix = delimiterClosureSuffix(formulaSkeleton);
  if (delimiterSuffix === null || delimiterSuffix) {
    return { accepted: false, reason: "unbalanced-delimiter" };
  }
  const callSet = new Set(allowedCalls);
  for (const match of text.matchAll(IBEM_CALLED_NAME)) {
    if (!callSet.has(match[1])) {
      return { accepted: false, reason: "unapproved-call" };
    }
  }
  return { accepted: true, reason: "policy-passed" };
}

export function outputPolicyDecision(text, policy) {
  if (policy?.schema_version === IBEM_OUTPUT_POLICY_SCHEMA) {
    return ibemOutputPolicyDecision(text, policy);
  }
  if (
    typeof text !== "string" ||
    policy?.schema_version !== SYNTHETIC_OUTPUT_POLICY_SCHEMA ||
    typeof policy?.catalog_hash !== "string" ||
    !/^[0-9a-f]{64}$/.test(policy.catalog_hash) ||
    !Number.isInteger(policy?.maximum_characters) ||
    policy.maximum_characters < 1 ||
    policy.maximum_characters > 16_384 ||
    !Array.isArray(policy?.allowed_calls) ||
    !Array.isArray(policy?.allowed_quoted) ||
    !Array.isArray(policy?.allowed_code_literals) ||
    policy.allowed_calls.some((value) => typeof value !== "string" || !value) ||
    policy.allowed_quoted.some((value) => typeof value !== "string" || !value) ||
    policy.allowed_code_literals.some(
      (value) => typeof value !== "string" || !value,
    )
  ) {
    throw new Error("The formula output policy is invalid.");
  }
  if (!text || text.length > policy.maximum_characters) {
    return { accepted: false, reason: "empty-or-overlong" };
  }
  const quotes = text.match(/"/g)?.length ?? 0;
  if (quotes % 2 !== 0) {
    return { accepted: false, reason: "unbalanced-quote" };
  }
  const quotedValues = [...text.matchAll(QUOTED_TEXT)].map(
    (match) => match[1],
  );
  const unquoted = text.replace(QUOTED_TEXT, '""');
  const allowedCodeLiterals = new Set(policy.allowed_code_literals);
  const codeLiterals = [...unquoted.matchAll(CODE_LITERAL)].map(
    (match) => match[0],
  );
  if (codeLiterals.some((value) => !allowedCodeLiterals.has(value))) {
    return { accepted: false, reason: "forbidden-character" };
  }
  const formulaSkeleton = unquoted.replace(CODE_LITERAL, "");
  if (!ALLOWED_FORMULA_CHARACTERS.test(formulaSkeleton)) {
    return { accepted: false, reason: "forbidden-character" };
  }
  if (CODE_MARKERS.some((fragment) => formulaSkeleton.includes(fragment))) {
    return { accepted: false, reason: "code-marker" };
  }
  const delimiterSuffix = delimiterClosureSuffix(text);
  if (delimiterSuffix === null || delimiterSuffix) {
    return { accepted: false, reason: "unbalanced-delimiter" };
  }
  const allowedQuoted = new Set(policy.allowed_quoted);
  for (const value of quotedValues) {
    if (!allowedQuoted.has(value)) {
      return { accepted: false, reason: "unapproved-text" };
    }
  }
  const allowedCalls = new Set(policy.allowed_calls);
  for (const match of text.matchAll(CALLED_NAME)) {
    if (!allowedCalls.has(match[1])) {
      return { accepted: false, reason: "unapproved-call" };
    }
  }
  return { accepted: true, reason: "policy-passed" };
}

export function outputPolicyIdentityMatchesDataset(policy, dataset) {
  if (policy?.schema_version === IBEM_OUTPUT_POLICY_SCHEMA) {
    return (
      typeof policy.dataset_lock_hash === "string" &&
      policy.dataset_lock_hash === dataset?.lock_hash
    );
  }
  if (policy?.schema_version === SYNTHETIC_OUTPUT_POLICY_SCHEMA) {
    return (
      typeof policy.catalog_hash === "string" &&
      policy.catalog_hash === dataset?.catalog_hash
    );
  }
  return false;
}

export function decodeTokens(vocabulary, tokenIds) {
  if (!Array.isArray(vocabulary?.tokens)) {
    throw new Error("The vocabulary does not contain a token table.");
  }
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const output = [];
  let bytes = [];
  const flushBytes = () => {
    if (bytes.length) {
      output.push(decoder.decode(new Uint8Array(bytes)));
      bytes = [];
    }
  };

  for (const tokenId of tokenIds) {
    const token = vocabulary.tokens[tokenId];
    if (token === undefined) {
      throw new Error(`Invalid token id ${tokenId}.`);
    }
    if (SPECIAL_TOKENS.has(token)) {
      flushBytes();
    } else if (BYTE_TOKEN.test(token)) {
      bytes.push(Number.parseInt(token.slice(3, 5), 16));
    } else {
      flushBytes();
      output.push(token);
    }
  }
  flushBytes();
  return output.join("");
}

export function roundHalfToEven(value) {
  if (!Number.isFinite(value)) {
    throw new Error("Cannot round a non-finite value.");
  }
  const floor = Math.floor(value);
  const fraction = value - floor;
  if (Math.abs(fraction - 0.5) <= Number.EPSILON * Math.abs(value) * 2) {
    return floor % 2 === 0 ? floor : floor + 1;
  }
  return Math.round(value);
}

export function resizeGeometry(
  width,
  height,
  targetHeight,
  maxWidth,
  resizeMode,
) {
  if (
    ![width, height, targetHeight, maxWidth].every(
      (value) => Number.isInteger(value) && value > 0,
    )
  ) {
    throw new Error("Resize dimensions must be positive integers.");
  }
  if (resizeMode === "contain") {
    const scale = Math.min(maxWidth / width, targetHeight / height);
    const scaledWidth = Math.max(
      1,
      Math.min(maxWidth, roundHalfToEven(width * scale)),
    );
    const scaledHeight = Math.max(
      1,
      Math.min(targetHeight, roundHalfToEven(height * scale)),
    );
    return {
      height: scaledHeight,
      top: Math.floor((targetHeight - scaledHeight) / 2),
      width: scaledWidth,
    };
  }
  if (resizeMode === "stretch-height") {
    return {
      height: targetHeight,
      top: 0,
      width: Math.max(
        1,
        Math.min(maxWidth, roundHalfToEven((width * targetHeight) / height)),
      ),
    };
  }
  throw new Error(`Unsupported resize mode ${JSON.stringify(resizeMode)}.`);
}

export function selectWidthBucket(scaledWidth, widthBuckets, maxWidth) {
  if (!Number.isInteger(scaledWidth) || scaledWidth < 1) {
    throw new Error("Scaled width must be a positive integer.");
  }
  const bucket = widthBuckets.find((candidate) => scaledWidth <= candidate);
  return bucket ?? maxWidth;
}

export function grayscaleFromRgba(rgba) {
  if (rgba.length % 4 !== 0) {
    throw new Error("RGBA data length must be divisible by four.");
  }
  const grayscale = new Uint8Array(rgba.length / 4);
  for (let source = 0, target = 0; source < rgba.length; source += 4) {
    const alpha = rgba[source + 3] / 255;
    const red = rgba[source] * alpha + 255 * (1 - alpha);
    const green = rgba[source + 1] * alpha + 255 * (1 - alpha);
    const blue = rgba[source + 2] * alpha + 255 * (1 - alpha);
    grayscale[target] = Math.round(
      0.299 * red + 0.587 * green + 0.114 * blue,
    );
    target += 1;
  }
  return grayscale;
}

export function edgeMedian(grayscale, width, height) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    grayscale.length !== width * height
  ) {
    throw new Error("Grayscale dimensions do not match the pixel buffer.");
  }

  const histogram = new Uint32Array(256);
  for (let x = 0; x < width; x += 1) {
    histogram[grayscale[x]] += 1;
    histogram[grayscale[(height - 1) * width + x]] += 1;
  }
  for (let y = 0; y < height; y += 1) {
    histogram[grayscale[y * width]] += 1;
    histogram[grayscale[y * width + width - 1]] += 1;
  }

  const count = 2 * width + 2 * height;
  const lowerTarget = Math.floor((count - 1) / 2);
  const upperTarget = Math.floor(count / 2);
  let lower = 0;
  let upper = 0;
  let cumulative = 0;
  for (let value = 0; value < histogram.length; value += 1) {
    const next = cumulative + histogram[value];
    if (cumulative <= lowerTarget && lowerTarget < next) {
      lower = value;
    }
    if (cumulative <= upperTarget && upperTarget < next) {
      upper = value;
      break;
    }
    cumulative = next;
  }
  return (lower + upper) / 2;
}

export function normalizePolarity(grayscale, width, height, enabled = true) {
  const median = edgeMedian(grayscale, width, height);
  const inverted = enabled && median < 128;
  if (!inverted) {
    return {
      pixels: grayscale,
      edgeMedian: median,
      inverted: false,
    };
  }
  const pixels = new Uint8Array(grayscale.length);
  for (let index = 0; index < grayscale.length; index += 1) {
    pixels[index] = 255 - grayscale[index];
  }
  return {
    pixels,
    edgeMedian: median,
    inverted: true,
  };
}

export function foregroundBounds(
  grayscale,
  width,
  height,
  threshold = 12,
  minimumPixels = 4,
) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    grayscale.length !== width * height
  ) {
    throw new Error("Grayscale dimensions do not match the pixel buffer.");
  }
  if (
    !Number.isInteger(threshold) ||
    threshold < 1 ||
    threshold > 127 ||
    !Number.isInteger(minimumPixels) ||
    minimumPixels < 1
  ) {
    throw new Error("Foreground detection settings are invalid.");
  }
  const background = edgeMedian(grayscale, width, height);
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  let count = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (grayscale[y * width + x] <= background - threshold) {
        count += 1;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (count < minimumPixels) {
    return null;
  }
  return { bottom, count, left, right, top };
}

export function cropToForeground(
  grayscale,
  width,
  height,
  {
    threshold = 12,
    marginRatio = 0.12,
    minimumMargin = 2,
    minimumPixels = 4,
  } = {},
) {
  const bounds = foregroundBounds(
    grayscale,
    width,
    height,
    threshold,
    minimumPixels,
  );
  if (!bounds) {
    throw new Error("Image does not contain enough formula foreground.");
  }
  const inkHeight = bounds.bottom - bounds.top + 1;
  const margin = Math.max(
    minimumMargin,
    roundHalfToEven(inkHeight * marginRatio),
  );
  const left = Math.max(0, bounds.left - margin);
  const top = Math.max(0, bounds.top - margin);
  const right = Math.min(width - 1, bounds.right + margin);
  const bottom = Math.min(height - 1, bounds.bottom + margin);
  const croppedWidth = right - left + 1;
  const croppedHeight = bottom - top + 1;
  const pixels = new Uint8Array(croppedWidth * croppedHeight);
  for (let y = 0; y < croppedHeight; y += 1) {
    const sourceStart = (top + y) * width + left;
    pixels.set(
      grayscale.subarray(sourceStart, sourceStart + croppedWidth),
      y * croppedWidth,
    );
  }
  return {
    bounds: { bottom, left, right, top },
    height: croppedHeight,
    pixels,
    width: croppedWidth,
  };
}

export function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : value >= 10 ? 1 : 2)} ${units[unit]}`;
}

export async function sha256Hex(bytes) {
  const view =
    bytes instanceof Uint8Array
      ? bytes
      : bytes instanceof ArrayBuffer
        ? new Uint8Array(bytes)
        : null;
  if (!view) {
    throw new Error("SHA-256 input must be binary data.");
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", view);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}
