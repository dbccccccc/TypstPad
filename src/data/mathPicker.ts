import { mathSymbolCategories, type MathSymbol, type SymbolCategory } from './mathSymbols'

export interface MathPickerGroup {
  id: 'symbols' | 'structures' | 'functions' | 'templates'
  categories: SymbolCategory[]
}

const allSymbols = mathSymbolCategories.flatMap(category => category.symbols)
const symbolsByCode = new Map([...allSymbols].reverse().map(symbol => [symbol.code, symbol]))

function pickSymbols(codes: string[]): MathSymbol[] {
  return codes.flatMap(code => {
    const symbol = symbolsByCode.get(code)
    return symbol ? [symbol] : []
  })
}

function categories(ids: string[]): SymbolCategory[] {
  return ids.flatMap(id => mathSymbolCategories.filter(category => category.id === id))
}

function templateCategory(id: string, symbols: MathSymbol[]): SymbolCategory {
  return {
    id,
    name: id,
    icon: 'LayoutTemplate',
    symbols: symbols.map(symbol => ({ ...symbol, selectionPlaceholder: 0 })),
  }
}

function alignedTemplate(display: string, tooltip: string, lines: string[], snippetLines: string[]): MathSymbol {
  return {
    display,
    tooltip,
    code: lines.join(" \\\n"),
    // Monaco snippets escape the backslash that Typst uses for a line break.
    snippet: snippetLines.join(" \\\\\n") + '$0',
  }
}

export const mathPickerGroups: MathPickerGroup[] = [
  {
    id: 'symbols',
    categories: [
      { id: 'operators', name: 'Operators', icon: 'Plus', symbols: pickSymbols(['+', '-', 'times', 'div', 'plus.minus', 'minus.plus', 'dot', 'compose', 'infinity', '...']) },
      { id: 'relations', name: 'Relations', icon: 'Equal', symbols: pickSymbols(['=', '!=', '<', '>', '<=', '>=', '<<', '>>', 'approx', 'equiv', 'prop']) },
      ...categories(['greek']),
      { id: 'sets', name: 'Sets & logic', icon: 'Braces', symbols: pickSymbols(['in', 'in.not', 'subset', 'supset', 'subset.eq', 'supset.eq', 'union', 'sect', 'emptyset', 'forall', 'exists', 'not', 'and', 'or', 'xor']) },
      ...categories(['arrows']),
    ],
  },
  { id: 'structures', categories: categories(['fractions', 'scripts', 'brackets', 'matrices']) },
  { id: 'functions', categories: categories(['integrals', 'sums', 'limits', 'trig']) },
  {
    id: 'templates',
    categories: [
      templateCategory('equations', [
        alignedTemplate('a = b + c', 'Aligned equations',
          ['a &= b + c', 'x &= y + z'],
          ['${1:a} &= ${2:b + c}', '${3:x} &= ${4:y + z}']),
        alignedTemplate('(x + 1)² = …', 'Derivation steps',
          ['(x + 1)^2 &= (x + 1)(x + 1)', '&= x^2 + 2 x + 1'],
          ['${1:(x + 1)^2} &= ${2:(x + 1)(x + 1)}', '&= ${3:x^2 + 2 x + 1}']),
        alignedTemplate('x + 2 = 5', 'Equations with notes',
          ['x + 2 &= 5 && "given"', 'x &= 3 && "subtract 2"'],
          ['${1:x + 2} &= ${2:5} && "${3:given}"', '${4:x} &= ${5:3} && "${6:subtract 2}"']),
        {
          display: 'f(x) = {…', tooltip: 'Piecewise function',
          code: 'f(x) = cases(x^2 & "if" x >= 0, -x & "otherwise")',
          snippet: 'f(x) = cases(${1:x^2} & "if" ${2:x >= 0}, ${3:-x} & "otherwise")$0',
        },
        {
          display: '{ ax + by = c', tooltip: 'System of equations',
          code: 'cases(a x + b y = c, d x + e y = f)',
          snippet: 'cases(${1:a} x + ${2:b} y = ${3:c}, ${4:d} x + ${5:e} y = ${6:f})$0',
        },
      ]),
      templateCategory('algebra', [
        {
          display: 'x = (−b ± √Δ) / 2a', tooltip: 'Quadratic formula',
          code: 'x = (-b plus.minus sqrt(b^2 - 4 a c)) / (2 a)',
          snippet: 'x = (-${2:b} plus.minus sqrt($2^2 - 4 ${1:a} ${3:c})) / (2 $1)$0',
        },
        {
          display: 'a² + b² = c²', tooltip: 'Pythagorean theorem',
          code: 'a^2 + b^2 = c^2',
          snippet: '${1:a}^2 + ${2:b}^2 = ${3:c}^2$0',
        },
        {
          display: '(a + b)ⁿ', tooltip: 'Binomial theorem',
          code: '(a + b)^n = sum_(k=0)^n binom(n, k) a^(n-k) b^k',
          snippet: '(${1:a} + ${2:b})^${3:n} = sum_(k=0)^$3 binom($3, k) $1^($3-k) $2^k$0',
        },
      ]),
      templateCategory('calculus', [
        {
          display: '∫ f(x) dx', tooltip: 'Integral with bounds',
          code: 'integral_a^b f(x) dif x',
          snippet: 'integral_${1:a}^${2:b} ${3:f(x)} dif ${4:x}$0',
        },
        {
          display: 'df/dx', tooltip: 'Derivative',
          code: '(dif f) / (dif x)',
          snippet: '(dif ${1:f}) / (dif ${2:x})$0',
        },
        {
          display: '∂f/∂x', tooltip: 'Partial derivative',
          code: '(partial f) / (partial x)',
          snippet: '(partial ${1:f}) / (partial ${2:x})$0',
        },
        {
          display: 'dⁿf/dxⁿ', tooltip: 'Higher-order derivative',
          code: '(dif^n f) / (dif x^n)',
          snippet: '(dif^${1:n} ${2:f}) / (dif ${3:x}^$1)$0',
        },
        {
          display: '∂²f/∂x∂y', tooltip: 'Mixed partial derivative',
          code: '(partial^2 f) / (partial x partial y)',
          snippet: '(partial^2 ${1:f}) / (partial ${2:x} partial ${3:y})$0',
        },
        {
          display: '∇f', tooltip: 'Gradient',
          code: 'nabla f = vec((partial f) / (partial x), (partial f) / (partial y), (partial f) / (partial z))',
          snippet: 'nabla ${1:f} = vec((partial $1) / (partial ${2:x}), (partial $1) / (partial ${3:y}), (partial $1) / (partial ${4:z}))$0',
        },
        {
          display: 'lim sin(x)/x = 1', tooltip: 'Standard limit',
          code: 'lim_(x -> 0) (sin x) / x = 1',
          snippet: 'lim_(${1:x} -> ${2:0}) ${3:(sin x) / x} = ${4:1}$0',
        },
        {
          display: 'f(x) = ∑ …', tooltip: 'Taylor series',
          code: 'f(x) = sum_(n=0)^infinity (f^((n))(a)) / (n!) (x - a)^n',
          snippet: '${1:f}(x) = sum_(n=0)^infinity ($1^((n))(${2:a})) / (n!) (x - $2)^n$0',
        },
      ]),
      templateCategory('linearAlgebra', [
        {
          display: 'A = [a b; c d]', tooltip: 'Matrix equation',
          code: 'A = mat(a, b; c, d)',
          snippet: '${1:A} = mat(${2:a}, ${3:b}; ${4:c}, ${5:d})$0',
        },
        {
          display: 'I₃', tooltip: 'Identity matrix',
          code: 'I_3 = mat(1, 0, 0; 0, 1, 0; 0, 0, 1)',
          snippet: '${1:I}_3 = mat(1, 0, 0; 0, 1, 0; 0, 0, 1)$0',
        },
        {
          display: '[a b | c]', tooltip: 'Augmented matrix',
          code: 'mat(a, b, c; d, e, f; augment: #2)',
          snippet: 'mat(${1:a}, ${2:b}, ${3:c}; ${4:d}, ${5:e}, ${6:f}; augment: #2)$0',
        },
        {
          display: 'Aₘₓₙ', tooltip: 'General matrix',
          code: 'A = mat(a_(1,1), ..., a_(1,n); dots.v, dots.down, dots.v; a_(m,1), ..., a_(m,n))',
          snippet: '${1:A} = mat(${2:a}_(1,1), ..., $2_(1,${3:n}); dots.v, dots.down, dots.v; $2_(${4:m},1), ..., $2_($4,$3))$0',
        },
        {
          display: 'v = (x, y, z)', tooltip: 'Vector equation',
          code: 'bold(v) = vec(x, y, z)',
          snippet: 'bold(${1:v}) = vec(${2:x}, ${3:y}, ${4:z})$0',
        },
        {
          display: 'a · b = ∑ aᵢbᵢ', tooltip: 'Dot product',
          code: 'bold(a) dot bold(b) = sum_(i=1)^n a_i b_i',
          snippet: 'bold(${1:a}) dot bold(${2:b}) = sum_(i=1)^${3:n} $1_i $2_i$0',
        },
      ]),
      templateCategory('statistics', [
        {
          display: 'x̄ = ∑xᵢ/n', tooltip: 'Sample mean',
          code: 'overline(x) = 1 / n sum_(i=1)^n x_i',
          snippet: 'overline(${1:x}) = 1 / ${2:n} sum_(i=1)^$2 $1_i$0',
        },
        {
          display: 's² = ∑(xᵢ−x̄)²/(n−1)', tooltip: 'Sample variance',
          code: 's^2 = 1 / (n - 1) sum_(i=1)^n (x_i - overline(x))^2',
          snippet: '${1:s}^2 = 1 / (${2:n} - 1) sum_(i=1)^$2 (${3:x}_i - overline($3))^2$0',
        },
        {
          display: 's = √(∑…/(n−1))', tooltip: 'Standard deviation',
          code: 's = sqrt(1 / (n - 1) sum_(i=1)^n (x_i - overline(x))^2)',
          snippet: '${1:s} = sqrt(1 / (${2:n} - 1) sum_(i=1)^$2 (${3:x}_i - overline($3))^2)$0',
        },
      ]),
      templateCategory('probability', [
        {
          display: 'P(A|B)', tooltip: 'Bayes theorem',
          code: 'P(A | B) = (P(B | A) P(A)) / P(B)',
          snippet: 'P(${1:A} | ${2:B}) = (P($2 | $1) P($1)) / P($2)$0',
        },
        {
          display: 'E[X] = ∑ xᵢpᵢ', tooltip: 'Expected value',
          code: 'E[X] = sum_(i=1)^n x_i p_i',
          snippet: 'E[${1:X}] = sum_(i=1)^${2:n} ${3:x}_i ${4:p}_i$0',
        },
        {
          display: 'Var(X) = E[X²] − E[X]²', tooltip: 'Variance',
          code: 'op("Var")(X) = E[X^2] - E[X]^2',
          snippet: 'op("Var")(${1:X}) = E[$1^2] - E[$1]^2$0',
        },
        {
          display: 'f(x) = … e⁻ˣ²', tooltip: 'Normal distribution',
          code: 'f(x) = 1 / (sigma sqrt(2 pi)) e^(-(x - mu)^2 / (2 sigma^2))',
          snippet: 'f(x) = 1 / (${1:sigma} sqrt(2 pi)) e^(-(x - ${2:mu})^2 / (2 $1^2))$0',
        },
        {
          display: 'P(X=k)', tooltip: 'Binomial distribution',
          code: 'P(X = k) = binom(n, k) p^k (1 - p)^(n - k)',
          snippet: 'P(${1:X} = ${2:k}) = binom(${3:n}, $2) ${4:p}^$2 (1 - $4)^($3 - $2)$0',
        },
      ]),
    ],
  },
]

export const quickInsertSymbols = pickSymbols([
  'a / b', 'sqrt(x)', 'x^2', 'x_i',
  'sum_(i=0)^n', 'integral_a^b', 'mat(a, b; c, d)',
])
