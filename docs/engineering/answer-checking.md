# Answer input and checking

Phase 0 audit, 5 November 2026. This page changes no product code. It records how an answer is typed today, why part (a) of `arena-a-grin-and-a-wiggle` fails for a correct answer, and every place an answer is checked. The base commit is `ed8c860`.

## 1. Every way an answer is typed today

| Where | Control | What the reader types | Syntax accepted |
| --- | --- | --- | --- |
| Practice problems (12) and Arena problems (18) | One single-line box per part (`ArchiveAnswerPanel`), 1024 characters at most, with a live KaTeX preview | A number or a LaTeX expression without dollar signs | See "LaTeX answer syntax" below |
| Practice and Arena, optional working | A text area inside a closed "Optional working" disclosure | Words and equations in double dollar signs, such as `$$a = g\sin\theta$$` | Not parsed for grading. Not saved |
| Guided reader (`pilot` collection) | "Your working" text area, disabled when signed out, plus a closed "Equation calculator" | Free text. The calculator takes an equation such as `a = g*sin(theta)` and values such as `g = 9.81` | Plain-text maths from `lib/plain-math.ts` (mathjs). Not graded. Saved only when signed in |
| Olympiad archive reader, "Your solution" tab | `SolutionSubmissionForm`: working, final answer, attachments | Working up to 12000 characters, final answer up to 1000, up to 5 files (JPEG, PNG, WebP, PDF, 3 MB each, 8 MB in total) with a confirmed transcription | Free text and plain-text maths. Marked by rubric, see section 3 |
| Authored problem, numeric part | A value box and a Units box | A decimal or scientific number such as `-0.5` or `1.2e3` (80 characters, binary64), and a unit label | Units are matched exactly. Blank and `1` both mean dimensionless |
| Authored problem, expression part | One text area, 180 characters | A plain-text expression | `+ - * / ^`, parentheses, `sqrt abs sin cos tan log`, decimals. Explicit `*` is required, so `3*x` and not `3x`. Integer exponents from -8 to 8. Only the variables the author declared. No `pi`, no `e`, no units, no equals sign |
| Authored problem, manual part | One text area, 4000 characters | Free text | Saved with an ungraded outcome |
| IPhO symbolic answer (`SymbolicAnswer`, not mounted anywhere) | Single-line box | A plain-text expression | `+ - * / ^`, parentheses, `sqrt`, `pi`, the listed variables, 180 characters, case-sensitive, ASCII only |
| Problem Studio, answer key | "Expected value", "Units", "Expected expression" boxes | The author's key, in the same plain-text and number formats as the authored rows above | As above |

### LaTeX answer syntax (practice and Arena)

Parsed by `parseLatexAnswer` in `lib/latex-answer.ts` with the Cortex compute engine, then checked against the part's declared symbols.

- **Allowed characters:** letters, digits, backslash, `{ } ( ) [ ]`, `. , + - * / ^ _ |` and spaces. Dollar signs, equals signs, the Unicode minus and any other symbol are rejected.
- **Allowed commands:** `\frac \dfrac \tfrac \sqrt \cdot \times \left \right \big` (and its larger forms), `\sin \cos \tan \cot \sinh \cosh \tanh \exp \ln \log`, `\operatorname \mathrm`, `\infty \pi \hbar`, the Greek letters, `\vert \lvert \rvert`, and the spacing commands `\, \; \! \ `.
- **Numbers:** decimals and scientific notation such as `1.2e3`, at most 32 digits, exponent between -100 and 100.
- **Multiplication:** explicit `*`, `\cdot`, `\times`, or by writing symbols next to each other.
- **Symbols:** only the ones listed under the box, spelled the same way and case-sensitive. A symbol such as `r_0` has to be typed with the digit zero.
- **Constants:** `\pi` and `e`. `e^x` is read as `\exp(x)`. `\infty` is accepted only where the key allows it (one Arena part).
- **Limits:** 16 levels of grouping, 96 nodes, 96 operators, exponents up to 100.
- **Units:** never typed. The unit is fixed by the box label, and no conversion is done.

## 2. The failure on `arena-a-grin-and-a-wiggle` part (a)

Part (a) is `a.trajectory`, "First-order signed ray trajectory". The key is `r_0\cos(kz)+\frac{\theta_0}{k}\sin(kz)`.

Input: `\theta_o\sin(kz)/k + r_o\cos(kz)`, with the letter o.

Result from the real route (`POST /api/archive-grade`) and from `checkArchivePart`: status `invalid`, message "Undeclared symbol or nonfinite value. Use the listed notation and omit unit suffixes."

### Cause, confirmed: the letter o where the symbols use zero

The symbols declared for the part are `r_0`, `k`, `z` and `\theta_0` (`lib/archive-grading/source-05.ts`, line 6). They use the digit zero. `parseLatexAnswer` turns `\theta_o` and `r_o` into the names `theta_o` and `r_o`. Neither is in the part's alias table (`aliasesFor`), so `convert` reaches the "Undeclared symbol" branch and throws `LatexAnswerError`. The check never gets as far as comparing values. Replacing the two letters o with zeros removes the error, which is the test:

| Input | Status |
| --- | --- |
| `\theta_o\sin(kz)/k + r_o\cos(kz)` (letter o) | `invalid` |
| `\theta_0\sin(kz)/k + r_0\cos(kz)` (zero) | `inconclusive` |
| `\frac{\theta_0}{k}\sin(kz)+r_0\cos(kz)` | `correct` |
| `r_0\cos(kz)+\frac{\theta_0}{k}\sin(kz)` (the key) | `correct` |

### A second cause, found while confirming the first

Fixing the letter does not make the answer correct. With zeros, the answer comes back `inconclusive` ("Could not verify automatically ... This is not marked incorrect"). The reasons are in `checkArchivePart` in `lib/archive-grading.ts`:

1. A first pass compares the answer's `structuralForm` with the key and its alternatives. This only reorders sums and products. `\theta_0\sin(kz)/k` is a different tree from `\frac{\theta_0}{k}\sin(kz)`, so it does not match.
2. A second pass uses the exact prover (`evaluateExpressionAnswer`), but only if `algebraExpression` can translate the answer. That function supports add, subtract, multiply, divide, power, negate, `sqrt` and `abs`. It returns null for `\sin` and `\cos`, so any answer with a trig function skips the prover.

So a trig answer is accepted only when it has the shape of the key or of a listed alternative. This affects every Arena part whose key contains `\sin`, `\cos`, `\tan`, `\ln` or `\exp`.

The message for the letter-o case does not name the symbol, and it is shown under a box whose help line already lists "Symbols: r_0, k, z, \theta_0". A reader has to compare the two by eye.

Reproduce with `pnpm exec tsx --conditions=react-server --test tests/phase0-answer-input.mts`.

## 3. Every checker path

Part counts for the archive checker, from `lib/archive-grading/catalog.ts`: 30 problems and 165 parts. Arena has 102 expression parts, 30 numeric parts (14 of them exact, with both tolerances 0), 1 special part (the infinite radius) and 20 self-review parts. The 12 practice problems have 1 numeric part each.

| Path | Used by | Where it lives | How tolerance is set |
| --- | --- | --- | --- |
| **A. Practice numeric** | The 12 practice problems, through the same answer panel as Arena | `ArchiveAnswerPanel` → `POST /api/archive-grade` → `lib/archive-grading.ts` (`checkArchivePart`, numeric branch) → `evaluateNumericAnswer` in `lib/authored-numeric-grading.ts`. Keys are built from `lib/physics.ts` in `lib/archive-grading/catalog.ts` | Per part in the key: absolute 0.005 or relative 0.005, whichever is looser. Set in `catalog.ts`. Comparison is exact on binary64 values. The unit is fixed by the box |
| **A2. Legacy practice check** | Nothing. No code calls it | `lib/practice.ts` (`checkPracticeAnswer`) → `POST /api/progress`, which stores a `practice_attempt` row | Hard-coded: the larger of 0.005 and 0.5% of the key. Same numbers as path A, a separate copy |
| **B. Arena symbolic** | The 18 Arena problems | Same route and function. Expression parts first compare the answer's `structuralForm` with the canonical and alternative forms, then try the exact prover (`evaluateExpressionAnswer`, policy in `SYMBOLIC_GRADING_POLICY.md`). Keys are in `lib/archive-grading/source-01.ts` to `source-06.ts` | None for expressions. The result is exact: `correct`, `incorrect` (a proven counterexample) or `inconclusive`. Numeric Arena parts use the `numeric()` helper: absolute and relative 0.005 by default, or exact when set to 0 and 0 |
| **C. Archive `SymbolicAnswer`** | Three adapted IPhO 2025 tasks in `lib/ipho-checks.ts`, through `IphoProblem` | `components/physics/symbolic-answer.tsx` → `lib/symbolic-worker.ts` (a browser worker) → `lib/symbolic-math.ts`, which uses mathjs `symbolicEqual` and `rationalize` after sorting commutative terms | None. No numeric comparison and no domain reasoning. `IphoProblem` is mounted only by `IphoContest`, and no page mounts `IphoContest`, so this path is unreachable from the site today |
| **D. Authored** | Problems published from Problem Studio | `lib/authored-grading.ts` (server, reads the private key for the exact problem, revision and part from PostgreSQL) → `lib/authored-numeric-grading.ts` or `lib/authored-symbolic-grading.ts` | Numeric: the author sets absolute and relative tolerance per part (Studio default: absolute 0.01, relative 0). The unit label must be on a fixed list and match exactly, otherwise `needs-review`. Expression: no tolerance, exact proof or `needs-review`. Manual: not graded |
| **E. Solution submissions** | IPhO, APhO and EuPhO problems with a reviewed rubric, through `/api/submissions` | `lib/solution-grading.ts` (`assessPracticeGrade`) and `lib/individual-rating-server.ts` | Points per rubric criterion, no tolerance. Credit needs an exact quote from the submitted work |

### Grading versions

| Version | Meaning | Where |
| --- | --- | --- |
| `latex-final-v1` plus `keyVersion` 1 | Paths A and B. The version sent with each check is a SHA-256 hash of the engine name and the whole problem definition, including the statement and solution text. Any edit changes it, and an out-of-date page gets a 409 and reloads its fields | `archiveVersion` in `lib/archive-grading/catalog.ts` |
| `numeric-v1` | Path D, numeric parts | `engineVersion` in `lib/authored-grading-contracts.ts` |
| `symbolic-v1` | Path D, expression parts. Path B uses the same prover | `SYMBOLIC_GRADING_POLICY.md` |
| Rubric `version` and `sourceSha256` | Path E. The rating version is stored with each check in `solution_check` | `lib/solution-grading.ts`, `lib/db/schema.ts` |
| None | Paths A2 and C | |

### Which results are rated or used in contests

| Path | Result saved? | Rated? | Used in contests? |
| --- | --- | --- | --- |
| A and B (practice, Arena) | No. The route stores nothing. The page says "Checks are not saved and do not change your rating" | No | No |
| A2 | Would be saved in `practice_attempt`, but nothing calls it | No | No |
| C | No | No | No |
| D (authored) | Yes, as an immutable attempt tied to a published revision | No code path turns an authored attempt into a rating | No |
| E (solution submissions) | Yes, in `solution_attempt` and `solution_check`, marked provisional or `needs-review` | Only where a problem has a reviewed rubric and `rated_enabled` on in `problem_rating`. Then `individual-rating-server.ts` updates the user's Elo | No |
| Contests | `contest_registration` is written when a user registers | `contest_rating` is read by `/api/rankings` and `/api/dashboard`, but no app code writes it. Ratings come from outside the app | A contest has a `rated` flag and a list of `problemIds` |

## 4. Gaps this audit shows

1. A symbol typed with the letter o, or any other spelling of a declared symbol, fails with a message that does not name it.
2. Correct trig answers that are not in the key's shape return `inconclusive`. In Arena, 26 of the 102 expression keys contain a trig, log or exponential function, and the prover skips all of them.
3. Path A2 duplicates the tolerance of path A in a second place and is not called.
4. Path C is a third, separate parser and is not reachable.
5. An authored expression key with no declared variables publishes and then can never mark a student correct.
6. Nothing records a correct Arena or practice check, so no later feature can use it yet.
