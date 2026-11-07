# Answer input and checking

Phase 0 audit and Phase 1 change, 5 November 2026. The first part of this page, "Current behaviour", describes how answers are read and checked after Phase 1. Sections 1 to 4 below it are the Phase 0 baseline, kept as the record of what was found. Where the two differ, "Current behaviour" is right.

## Current behaviour (Phase 1, 5 November 2026)

### One reader: what it accepts

`lib/answer-reader.ts` turns every typed expression or number into something that can be evaluated. Practice, Arena, authored problems and the keys themselves all go through it. It has no dependency on the server, so the browser can use it for a live preview. It does not know any problem, symbol or answer form.

| Kind of input | Accepted |
| --- | --- |
| LaTeX as MathLive writes it | `\frac{a}{b}`, `\frac12`, `\sqrt{x}`, `\sqrt[3]{x}`, `\left( \right)`, `\cdot`, `\times`, `x^{2}`, `r_{0}`, `\lvert x \rvert`, `\operatorname{abs}`, `\mathrm{k}_{B}` |
| Plain typing | `*`, `/`, `^`, `**`, `sqrt(x)`, `sin(x)`, `theta`, `r_0`, `theta_0`, `|x|`, `abs(x)` |
| Unicode | `θ`, `π`, `ħ`, `×`, `·`, `−`, `√`, `²`, `³`, `⁻¹`, `θ₀`, `r₀` |
| Numbers | `4.9`, `.5`, `5.`, `3e8`, `3E8`, `3e+8`, `3×10^8`, `3\times10^{8}`, `3*10^8`, `\frac{49}{10}`, `\sqrt{13}` |
| Functions | `sin cos tan cot sec csc sinh cosh tanh exp ln log abs sqrt arcsin arccos arctan` (`log` is the natural logarithm) |
| Constants | `pi` and `e`, unless the problem declares them as symbols |
| Writing things next to each other | Multiplies: `kz`, `2x`, `\cos(zk)r_0`, `sin kz`, `m_pm_n`, `k_BT`. After a plain `/` it is refused, see the rules below |

Rules that decide what an expression means:

- Symbols are matched by name after the spelling is folded, so `\theta_0`, `theta_0`, `θ_0` and `θ₀` are one symbol. Zero is the subscript and the letter o is not zero. Names the problem declares with several letters (`rho`, `c0`) stay whole. An alias a key lists (`u` for `\mu`) is accepted.
- `*`, `/` and writing things next to each other have the same precedence and go left to right, with one exception that is refused. A plain `/` followed by two or more things written next to each other is ambiguous, because `a/bc` can mean a/(bc) or (a/b)c. It is not guessed. The answer comes back invalid with both readings in the student's own symbols: "Add brackets: a/(bc) or (a/b)c." This covers `h/mc`, `kT/mc^2`, `a/2b` and `a/sin(x) y`. These are not refused:

  | Typed | Read as |
  | --- | --- |
  | `1/2 m v^2`, `-1/2 m v^2`, `3/4 x` | (1/2)·m·v², a plain number fraction before symbols, left to right |
  | `a/(bc)`, `(a/b)c`, `a/b*c`, `a/b/c`, `a/(b)c` | Exactly what the brackets and operators say |
  | `\frac{a}{bc}`, `\frac{a}{b}c` | MathLive's `\frac` is never ambiguous |
  | `a/\sqrt{b}c`, `tan(x)/y`, `a/b+c` | A divisor with its own brackets or a command, or nothing written next to it |
- `^` binds tighter than a minus sign and goes right to left: `-x^2` is -(x²), `2^3^2` is 2^9.
- A function without brackets takes the things written next to it: `sin kz` is sin(kz) and `sin x cos x` is two functions. `sin^2(x)` is (sin x)². `sin^-1` is refused, write `arcsin`.
- An undeclared symbol is named and the nearest declared one is suggested: "θ_o isn't used here. Did you mean θ₀?" A bare letter the problem only uses with a subscript gets the same suggestion ("r isn't used here. Did you mean r₀?").
- If a key declares no symbols, or leaves some out, the symbols in the key's own expression are used.
- Refused with a plain message: an equals sign, a comma, a semicolon, other characters, unknown LaTeX commands, `\infty` (except in the one Arena part that asks for it), more than 16 levels of brackets, more than 400 tokens or 300 nodes, a root index outside 2 to 8, a number that is too large, too small to be anything but zero, or that has more than 15 digits written out or cannot be held exactly in binary64. A result that is not finite, or `0^0`, is undefined. A product, quotient or power that underflows to zero is undefined.
- Degrees are used for trig functions when the key says so. Units are never typed or converted.

### One checker

`lib/sampled-check.ts` replaces the structural match and the exact prover.

1. Pick 10 sets of values for the problem's symbols. A symbol with no conditions takes a value from -5 to -0.5 or from 0.5 to 5. A symbol declared positive or nonnegative takes 0.5 to 5. A symbol with a minimum or maximum takes a value in that range. Excluded values (`x != 1`) are never drawn.
2. Evaluate the reference and the answer for each set. A set is skipped only when the reference is undefined or not finite there, and another is drawn. If the answer is undefined or not finite where the reference is fine, that set is a mismatch.
3. Correct when every set agrees within 1e-6 relative, with a 1e-9 absolute floor. Incorrect when any set differs. If an accepted alternative form is listed for a part, matching any one is correct.
4. Could not be decided only when 10 valid sets cannot be found in 300 draws, the key cannot be read, or the 400 ms limit is reached. The message says so in plain words.
5. The values are seeded by the problem and the part (`problemId:partId`), so the same answer always gets the same result.

Numbers: the default is 1% relative with a 1e-9 absolute floor. A key can set its own tolerance. A part with both tolerances 0 is exact, compared to 1e-9 relative with a 1e-12 floor.

Known limits of the method, by design:

- A hole that random values do not land on is not seen. `(x^2-1)/(x-1)` is correct for `x+1`. The reverse is also correct.
- A difference smaller than the tolerance is not seen. √2 and its 17-digit decimal are the same number here.
- A key whose values are enormous or tiny over -5 to 5 can hide a small difference. Declare a realistic range in the key (`ranges` in `lib/archive-grading/definitions.ts`). `arena-the-cosmic-kitchen` part g.equation does.
- Cancellation in binary64, such as `1e20+1-1e20`, gives 0.

### Paths now

| Path | Reader and checker | Notes |
| --- | --- | --- |
| Practice numbers and Arena numbers | `readNumber`, then the part's tolerance | Default 1% relative. Arena parts that set their own tolerance keep it |
| Practice and Arena expressions | `checkSampled` through `lib/archive-grading.ts` | Engine name `sampled-v1`. The Olympiad archive uses the same route for the parts that have an answer box |
| Authored expressions | `checkSampled` through `lib/authored-symbolic-grading.ts` | Stored label stays `symbolic-v1`, see below |
| Authored numbers | `lib/authored-numeric-grading.ts`, unchanged | The student's value arrives as a number, tolerance set by the author |
| Solution submissions | `lib/solution-grading.ts`, unchanged | Rubric marks |

Paths Phase 0 found unreachable, left untouched and listed for removal later: `components/physics/symbolic-answer.tsx`, `lib/symbolic-math.ts`, `lib/symbolic-worker.ts`, `lib/ipho-checks.ts`, `components/physics/ipho-problem.tsx` and `ipho-contest.tsx`, and `lib/practice.ts` with `POST /api/progress` and `recordResult` in `hooks/use-problem-history.ts`. Phase 1 also left `lib/latex-answer.ts` and `lib/authored-expression-language.ts` with no production caller, only their own tests.

### Grading versions

- **Practice and Arena:** the engine name inside `archiveVersion` changed from `latex-final-v1` to `sampled-v1`, and the default number tolerance and two key ranges changed the key data. Every problem's version changed, so a page opened before the change gets a 409 and refreshes its answer fields. These results are not saved, rated or used in contests, so nothing is re-graded.
- **Authored:** attempts keep the stored label `symbolic-v1`. The table `authored_attempt` has a check that allows only `numeric-v1` and `symbolic-v1`, and migrations are not part of this phase.
- **Rated results:** rated results come only from rubric-marked solution submissions and were not touched. No code grades contests.

### Authored attempts switched to the sampled checker

Authored `symbolic-v1` attempts started using the sampled checker in commit `f9509be` on 5 November 2026. Attempts saved before that commit were graded by the old exact prover and are never re-graded. Each saved attempt is tied to its revision, so the stored result stays what the student was shown.

**Migration request, for the owner or Codex.** Add `sampled-v1` to the allowed values of `authored_attempt.engine_version` (the check `authored_attempt_engine_version_check` in migration 0004 and `lib/db/schema.ts`), and to `StudentGrade["engineVersion"]` in `lib/authored-attempt-contracts.ts` and `AuthoredGradeResult["engineVersion"]` in `lib/authored-grading-contracts.ts`. Then `lib/authored-grading.ts` can write `sampled-v1` for expressions. Until then the label `symbolic-v1` means "expression attempt", and the commit and date above say which checker graded it.

### Answer entry (Phase 2)

- **The field:** each expression answer is one MathLive field (`components/physics/math-answer-field.tsx`), loaded with `import()` when the field mounts, never with the page. `/` makes a fraction, `^` a power, `_` a subscript, `*` a dot, `sqrt` a root and Greek names become letters. MathLive's virtual keyboard is off, so a phone uses its own keyboard. The field has a visible label and `aria-labelledby`.
- **What is sent:** MathLive's LaTeX with `\left` and `\right` and spacing commands removed. The reader accepts it as written. A MathLive fraction such as `\frac{h}{mc}` is never refused as ambiguous, because only a plain `/` is. Tested in `lib/answer-reader.test.ts`.
- **If MathLive fails or is slow:** a plain text box takes the answer, with a KaTeX preview. It accepts LaTeX or plain typing, read by the same reader. MathLive replaces the plain box only while it is empty and not focused.
- **The palette:** the problem's own symbols first, then fraction, power, root, subscript, Greek letters, sin, cos, tan, pi, e and ln. Each button inserts at the cursor and keeps focus in the field. The problem's symbol chips are always visible under the field. The rest opens under the field being typed in. In the plain box the same buttons insert LaTeX text.
- **Early hint:** about 0.7 seconds after typing stops, a symbol the problem does not use is named with the nearest one ("r_o isn't used here. Did you mean r₀?"), in the checker's own words. Nothing else is checked early.
- **Where the symbols come from:** Arena and practice use the public part metadata, which now carries `symbolConditions` (symbol, positive, nonnegative, nonzero, min, max) and nothing else from the key. The conditions line under each question is built from it. Authored problems use `symbols` in the submission-info response: the declared variable names of an expression part, and nothing else from the key (bounds, assumptions, exclusions, angle unit, the expected expression and the hints are tested to be absent). A key with no declared variables gives no chips and no early hint.
- **Numbers:** a plain box with the unit beside it where the problem has one. Practice says "Answers within 1% are accepted."
- **Solved in this browser:** when every part with an answer box is correct, the problem id is added to `physcratic.solved.v1` in localStorage (read and written inside try/catch, at most 500 ids). Nothing is sent to the server. The dashboard card uses it.
- **Stale text:** the lines Phase 1 listed as stale in `components/authored/student-workspace.tsx` ("write 3*x", "trig can need review") are replaced. The Learn guide `how-to-write-a-problem.ts` still says only a limited set of identities is checked.
- **Proof the checker did not change:** `lib/archive-grading-snapshot.test.ts` hashes every check result (status and message) for every problem, key form, rewritten form, changed form and invalid input. The fixture was committed before the metadata change, and the test passes after it.

### Tests changed in Phase 1

Tests that asserted the old behaviour were rewritten. Every rewrite has a comment saying why. None was moved from incorrect to correct unless the two expressions are equal, with the exceptions in the next list.

| Test | Change |
| --- | --- |
| `lib/archive-grading.test.ts` | Practice key tolerance 0.005 and 0.005 became 0.01 relative and 1e-9 floor. The number edge moved from 4.9245 to 4.949 |
| | `\sqrt{2}^2-2` and `sin^2+cos^2` against 1, and `(x^2-1)/(x-1)` against `x+1`, were "could not be decided" and are now correct, because they are equal |
| | Long number literals (21 digits, 18 digits) are refused as invalid, where they were incorrect |
| | The 0.005 floor test now sets its tolerance explicitly |
| `lib/authored-symbolic-grading.test.ts` | Rewritten. Needs review became correct where the pair is equal wherever defined (`x/x`, `x^0`, `sin^2+cos^2`, `log(x^2)` against `2 log(x)`, `sqrt(2)` against `2^(1/2)`) and became incorrect where the answer is undefined while the key is fine (`0^0`, `0/(x-x)`, `0*log(x)`) |
| | Moved to incorrect or review without loosening: `9007199254740993` and `1/3` against its 16-digit decimal |
| | Removed: x fixed at the binary64 value of 0.1 against the decimal 0.1 was incorrect under exact arithmetic |
| `lib/product-guides.test.ts`, `lib/authored-attempt-api.test.ts`, `lib/authored-solution-api.test.ts`, `lib/authored-grading-db.test.ts`, `tests/authored-student.browser.mjs` | An input used to show "needs review" (`sin(x)^2+cos(x)^2`, `x/x`) was replaced, because those are now graded. An undeclared symbol (`y^2+137`) still shows needs review. The DB test's second revision now changes the key to keep its point |

Changes that need the owner's attention, because the test now expects correct and the two numbers are not exactly equal:

1. `lib/archive-grading.test.ts`: `\sqrt{2}-1.4142135623730951` against an exact zero is now correct. They differ by about 5e-17, which is below the 1e-12 floor and the same binary64 number.
2. The 1% default makes 4.9246 (against 4.9) correct, where it was incorrect at 0.5%. This is the new default, not an equality.

### Reproducing the counts

```bash
pnpm exec tsx --conditions=react-server tests/phase1-before-after.mts dump cases.json
```

```bash
pnpm exec tsx --conditions=react-server tests/phase1-before-after.mts run cases.json
```

Run the second command in a checkout of `b7804da` for the before numbers. Over the 30 practice and Arena problems (144 answer parts, 153 reference forms, 876 rewritten forms with terms and factors swapped, `a/b` written as `a*b^-1`, `sqrt` as a power, plain and LaTeX style): before, 15 problems and 95 parts failed on a rewritten form (422 of 876 rewrites). After, 0. Every reference form is correct against itself both before and after. No changed form (negated, doubled, 1% off, 0.01% off) was accepted before or after.

## Phase 0 baseline

## 1. Every way an answer was typed (Phase 0)

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
