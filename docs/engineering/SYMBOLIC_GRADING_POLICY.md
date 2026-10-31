# Restricted symbolic grading policy (symbolic-v1)

This is a small exact prover, not a general computer algebra equivalence checker. It extends the Phase 5A private, immutable revision-bound server service. It adds no public grading endpoint, student UI or result persistence. Expected expressions, variable declarations, exclusions, proof internals and counterexamples remain server-only.

## Results and proof obligation

- `correct / symbolic-equivalent`: polynomial cross-multiplication establishes exact equality AND every original expression is proven defined throughout the **entire declared nonempty domain**.
- `incorrect / symbolic-counterexample`: an exact rational assignment satisfies every declared variable's bounds, assumptions and exclusions; both original expressions are defined there; exact evaluation proves their values differ.
- `needs-review`: unsupported syntax/functions/domains, an unproved definedness obligation, no exact counterexample found, or a complexity/deadline limit. Fixed public reason codes contain no expected expression, witness, AST, key or exception details.

A finite collection of agreeing evaluations never establishes equivalence. There is no floating-point sampling, heuristic tolerance or unrestricted library simplification in the symbolic prover. The deterministic exact witness search is a rejection proof only. Failure to find a witness is inconclusive.

## Bounded expression language

The parser builds a real AST with explicit token/node/depth limits. It never evaluates JavaScript or invokes mathjs compile/evaluate. The legacy browser symbolic preview remains separate and unchanged; its unrestricted-domain `symbolicEqual`/`rationalize` behavior and default floating literal parsing are unsuitable as this grading proof boundary. The small grammar avoids adding a general CAS dependency.

```text
number     := unsigned decimal [ ("e" | "E") ["+" | "-"] digits ]
identifier := ASCII letter followed by up to 31 ASCII letters/digits/underscores
primary    := number | declared-variable | "(" expression ")" | function "(" expression ")"
function   := sqrt | abs | sin | cos | tan | log
expression := primary with unary +/-, and binary + - * / ^
```

Decimal examples: `12`, `.5`, `1.`, `1.25`, `1e-2`. Literals are **exact rational decimal values**, at most 32 mantissa digits and scientific exponent magnitude 24. No pi/e constants, Infinity/NaN constants, implicit multiplication, units, equals signs, assignments, arrays, property access, strings, factorial, `%`, `**`, commas or arbitrary function calls. An identifier is valid only if explicitly declared by the key; even a name such as `Infinity` can only be an ordinary declared real variable, never a special numeric value.

Precedence, highest to lowest: power `^` (right associative), unary `+/-`, multiplication/division (left associative), addition/subtraction (left associative). Thus `-x^2 = -(x^2)`, `x^-2 = 1/(x^2)` where defined, and `2^2^3 = 2^(2^3) = 256`. Explicit `*` is mandatory: `sin(3 x)` is unsupported.

Integer powers require a constant exact integer exponent with magnitude <=8. Exponent expressions are themselves bounded before exponentiation. Exponent `1/2` is accepted only through the limited principal-sqrt rules below. Other rational/variable exponents require review. For conservatism, zero powers require a nonzero base (`0^0` is not defined here).

## Proven subset

- Exact rational constants, rational-coefficient multivariate polynomials, and rational expressions using the supported powers/operators.
- Equality of rational functions is checked by exact polynomial cross-products. No cancellation erases original denominator, nested reciprocal or zero-power obligations.
- Division requires its divisor to be nonzero on the declared domain. Proofs recognize interval sign enclosures, nonzero monomials, and excluded/out-of-bounds roots of one-variable affine polynomials. A true higher-order nonvanishing claim can still require review.
- `abs` of constants; sign-proven rational expressions; and absolute values of declared real variables. The latter are represented by opaque atoms with exact real absolute-value semantics for witnesses.
- `sqrt` of nonnegative rational constants with perfect-square numerator and denominator; `sqrt(u^2)` via `abs(u)` when that absolute value is supported; and `sqrt(x*x)` for a declared real variable. No blanket `sqrt(x^2) -> x` rule.
- Only exact elementary function constants: `sin(0)=tan(0)=log(1)=0`, `cos(0)=1`. They hold for both stored radians/degrees conventions. All other trig/log expressions require review, including identical unsupported syntax or apparent cancellation.
- No general radical arithmetic, trig/log identities, transcendental constants, complex numbers, unit algebra or symbolic inequality solving. `sqrt(2)` versus `2^(1/2)` is intentionally inconclusive despite being mathematically equal.

## Declared real domain and singularities

All declared variables are checked, including unused variables. Min/max bounds are inclusive; `positive` means strictly >0, `nonnegative` means >=0, and `nonzero` removes 0. Exclusions support only `variable != constant-rational-expression`, for example `x != 1`, `x != 1/2`. Unknown variables, unsupported exclusion grammar and empty/contradictory domains require review; no declaration is silently ignored.

**Stored numeric bounds are their exact binary64 values; expression/exclusion decimal literals are exact decimal rationals.** For example, a singleton stored bound `0.1` differs slightly from the symbolic rational `1/10`. The prover does not round either value to pretend they coincide. Authors needing an exact rational exclusion can spell its exact fraction. Existing numeric grading retains its Phase 5A binary64 tolerance policy.

The domain must be demonstrably nonempty before any acceptance. Finite exclusion lists cannot exhaust a nontrivial real interval; a bounded rational candidate construction establishes membership, while excluded singleton bounds are rejected. Fixed variables are substituted by their exact bound values.

Definedness is checked before cancellation/zero multiplication can erase it. Thus `0*(1/x)`, `(1/x)^0`, and `x/x-x/x` still require `x != 0`. If the expression only agrees where defined but contains an unexcluded hole, the prover returns review. A domain mismatch alone is not guessed to be a Boolean grade.

| Student versus key | Domain | Result |
| --- | --- | --- |
| `x*x` versus `x^2` | all real x | proven equivalent |
| `(x^2-1)/(x-1)` versus `x+1` | all real x, including 1 | needs review |
| same cancellation | x != 1 | proven equivalent |
| same cancellation | singleton x=1 | needs review |
| `sqrt(x^2)` versus `x` | all real x | proven non-equivalent by exact negative witness |
| same radical | x>=0 | proven equivalent |
| `abs(x)` versus `sqrt(x^2)` | all real x | proven equivalent |
| `sin(x)^2+cos(x)^2` versus `1` | general x | needs review |
| `log(x^2)` versus `2*log(x)` | general/positive/negative x | needs review |

## Work and memory exposure limits

Per expression: 180 characters, 128 tokens, 96 AST nodes, depth16. Per grading: <=8 variables (16 variable/absolute-value atoms), <=128 terms per polynomial, total monomial degree16, integer exponent magnitude8, rational numerator/denominator <=2048 bits, <=128 retained definedness guards, <=64 witness assignments, <=40,000 budget ticks and a cooperative monotonic 100ms deadline. The existing key contract separately caps exclusions at20 and expression fields at180. Oversized transport answers are rejected by the Phase 5A input schema before dispatch.

All loops in parsing, gcd, root extraction, domain construction, polynomial operations and witness evaluation have bounded input sizes and/or budget checks; native BigInt operands are bounded before subsequent operations. Intermediate multiplication is at most twice the coefficient bit cap; maps/AST/monomial vectors and aggregate allocated work have fixed ceilings. There is no native CAS call, unbounded exponent, expression-generated code or untrusted library-function access. Limits may conservatively return review for valid identities. The cooperative deadline is not a hard OS-level preemption or heap quota; bounded algorithms prevent a single unchecked expensive call.

## Integration boundary

The existing exact problem/revision/part private query, verified-session authorization, publication gate, immutable historical selection and safe result allowlist remain unchanged. Numeric/manual responses retain `numeric-v1`; dispatched expression responses use `symbolic-v1`. Existing numeric tolerances and blank/ASCII `1` dimensionless aliases are preserved. Phase 6 must add transport origin/rate/idempotency/body/deadline controls before exposing any student API. No such endpoint is authorized by this implementation.
