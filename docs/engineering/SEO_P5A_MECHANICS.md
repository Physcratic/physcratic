# P5A Mechanics editorial pilot

Base: `b76a26b3fbb5423fee1428a64434f756dea85622`, 12 November 2026.

## Publication boundary and architecture

One original guide lives in `lib/learn/guides/mechanics-problem-solving.ts` and the existing article registry. Its practice IDs use the existing map. No renderer, route, metadata, sitemap, authentication, grading or community permissions change is needed. The six existing guide files are unchanged.

The guide is **unpublished**, with `published: false` and `reviewedBy: null`. There is no preview route. Owner editorial approval is still required before any separate publication change. Automated technical critique is not personal review or evidence for a reviewer byline. The complete article and references are reproduced in the draft PR description from the canonical structured source, so review needs no public URL.

The working title was shortened to “Solving Physics Olympiad Mechanics Problems” so the future title including the existing site suffix fits 60 characters. The guide develops model selection rather than duplicating the published preparation schedule, books or contest comparison guides. The examples use standard idealised systems with original exposition and derivation, not claims of novel physical results or reproduced contest problems.

## Physics audit

An independent automated physics critique derived both examples without editing the draft. It found the equations, signs, dimensions and limiting cases correct. It requested an explicit statement that both ramp and slider start at rest in the floor frame, which is now included. The source audit added Chapter 12 specifically for the open-system momentum-flow warning. The draft also shows the Cartesian force equations, contact-power cancellation, tether degrees of freedom and ideal transmission of actuator work.

For the ramp, let `D = M + m sin²α`. Independently solving the three Cartesian Newton equations gives:

- Ramp acceleration `−mg sinα cosα / D`.
- Relative downhill acceleration `g(M + m) sinα / D`.
- Slider normal force `mMg cosα / D > 0` for the stated positive masses and angle.
- Floor reaction `Mg + N cosα > 0`, so floor contact is also consistent.

Horizontal momentum reduces the total kinetic energy to `mD ṡ² / (2(M + m))`. Equating this with `mgh` gives the displayed relative speed. The floor frame, uniform gravity, no rotation, frictionless contacts, zero initial velocities and travel before the ramp end are explicit. The two contact powers cancel, but the individual slider contact power need not vanish. Units, heavy-ramp, vertical-angle and zero-drop limits pass. A zero-angle limit at fixed drop requires unbounded travel and is not asserted for a finite ramp.

For the tether, zero torque about the fixed hole conserves `L = mr²θ̇`. The inward tension is `m(vθ²/r − r̈)`. Integrating its work gives `L²/(2m)(1/r₁² − 1/r₀²)` plus the change in radial kinetic energy. That latter term vanishes at the specified endpoints, so halving the radius gives `vθ₁ = 2v₀` and `W = 3mv₀²/2`. Work is positive and has energy units. Equal endpoint radii give zero work for these endpoint conditions. Nonzero initial tangential speed and a smooth tension-compatible pull are explicit. A sufficiently long smooth pull can meet the endpoint conditions with positive tension. No quasistatic approximation is used. Negative required tension invalidates the taut-string model.

A separate local SymPy calculation exactly verified the Cartesian Newton solution, the reduced kinetic energy, the radial-work integral and the half-radius work result. This audit does not replace owner editorial approval.

## Primary source audit

All six official MIT OpenCourseWare resource pages and their linked PDFs were opened on 12 November 2026. They are Peter Dourmashkin's Classical Mechanics course notes, not secondary summaries. No invented quotations or approval claims are used. The citations support established principles, while the suggested workflow and authored worked derivations are identified separately.

| Citation | Official resource | Supported principle |
| --- | --- | --- |
| s1 | [Chapter 7, Newton's Laws of Motion](https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/resources/mit8_01scs22_chapter7/) | Newton equations and inertial-frame assumptions |
| s2 | [Chapter 10, Momentum](https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/resources/mit8_01scs22_chapter10/) | Fixed-system external-force balance and momentum conservation |
| s3 | [Chapter 12, Momentum and the Flow of Mass](https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/resources/mit8_01scs22_chapter12/) | Momentum transferred across an open-system boundary |
| s4 | [Chapter 14, Potential Energy and Conservation of Energy](https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/resources/mit8_01scs22_chapter14/) | Work, mechanical energy and conditions for conservation |
| s5 | [Chapter 19, Angular Momentum](https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/resources/mit8_01scs22_chapter19/) | Angular momentum and external torque about a fixed origin |
| s6 | [Chapter 2, Units and Dimensional Analysis](https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/resources/mit8_01scs22_chapter2/) | Dimensional consistency, scales and dimensionless ratios |

Practice IDs `ipho-2016-t1`, `ipho-2009-t1` and `arena-the-invisible-brake` resolve through the existing public registry to retained, indexable Mechanics readers. They are clearly separate further-practice problems, not sources or reproductions of the two examples.

## Verification and handoff

The focused tests cover the draft's 404 path, static-parameter exclusion, empty draft metadata, Learn hub, public registry, sitemap and both AI discovery files. They render all ten display equations through the existing server KaTeX/MathML renderer and verify citation anchors and problem links. An isolated in-memory future-publication fixture checks the existing canonical, Open Graph, structured data and pending-review copy without changing the source publication flag. Existing guide integrity and SEO suites still run unchanged apart from accommodating the extra unpublished registry entry and preserving the six published guides.

Draft [#154](https://github.com/Physcratic/physcratic/pull/154) records exact-head GitHub CI and the complete article text. Local focused136, components170, TypeScript, zero-warning lint and the production build pass. The server suite has865 passes,30 database-dependent skips and one inherited TODO, with no failures. Production-mode HTTP confirms draft404 with noindex, absence from Learn/sitemap/AI discovery, all six published guide200 responses, all three practice readers200 with canonical URLs, library121 and archive103 visible reader anchors, and sitemap138. The draft text is absent from client JavaScript bundles. An isolated server-render fixture, not a public preview route, renders all ten equations at375/1440 in both themes with JavaScript disabled and no horizontal page overflow. Formula containers retain the existing horizontal scrolling. Publication remains blocked on explicit owner editorial review of the complete copy, both derivations, assumptions, practice choices and references. No merge, deployment, publication or P5B is authorized by this batch.

Final editorial revision in draft #154 adds two original labelled diagrams and explicit incorrect-versus-correct energy arguments. All ten equations, assumptions, six source records and three practice links are preserved. Figures use existing image blocks,1280×800 lossless WebP under20KB each, with alt text/captions and editable SVG sources beside them. Regenerate with the existing sharp dependency using `sharp(svgPath).webp({lossless:true}).toFile(webpPath)`. The ramp arrows show positive coordinate directions, not its actual recoil velocity. The string arrow shows only the tangential velocity component, with radial motion explicitly allowed in the caption. Both SVGs use an opaque white background for consistent contrast in either theme. Publication and reviewer flags remain false/null. Final exact-head verification is recorded on the PR.
