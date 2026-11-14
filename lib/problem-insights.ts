import "server-only";
import type { Block, Source } from "./learn/types";

export interface ProblemInsight {
  problemId: string;
  published: boolean;
  reviewedBy: null;
  title: string;
  prerequisites: string;
  idea: string;
  misconception: string;
  hints: Block[];
  sources: Source[];
  guide: { slug: string; hash?: string };
  topic: string;
}
const source = (year: number, kind: "Q" | "S", title: string): Source => ({
  id: kind === "Q" ? "statement" : "solution", title,
  publisher: "IPhO organizers, original English paper hosted by Olimpicos",
  url: `https://olimpicos.net/files/ipho/IPhO_${year}_${kind}1.pdf`, accessed: "2026-11-14",
});

/** Editorial drafts. Only approved records may reach the public reader. */
export const problemInsights: readonly ProblemInsight[] = [
  {
    problemId: "ipho-2009-t1", published: false, reviewedBy: null,
    title: "Follow the power as well as the angular momentum",
    prerequisites: "Circular orbits, angular momentum, rotational kinetic energy and torque.",
    idea: "Keep the paper's idealised system separate from the real Earth and Moon. First audit which torques are external. Then distinguish a transfer between two mechanical reservoirs from conversion into heat.",
    misconception: "An internal torque need not preserve mechanical energy. Equal and opposite torques transfer equal angular momentum, but their powers also depend on the two angular speeds.",
    hints: [
      { type: "paragraph", text: "Use the paper's circular-orbit, Earth-centred approximation, neglect the Sun and keep the Earth's moment of inertia fixed. Let τ be the positive torque increasing the Moon's orbital angular momentum, Ω the Earth's spin rate and n the Moon's orbital angular speed. Along a slowly evolving family of circular orbits, the orbital energy change per angular-momentum change is:", cite: ["statement", "solution"] },
      { type: "math", tex: String.raw`L_{\rm orb}=M_M\sqrt{GM_E D},\quad E_{\rm orb}=-\frac{GM_EM_M}{2D},\quad \frac{dE_{\rm orb}}{dL_{\rm orb}}=\sqrt{\frac{GM_E}{D^3}}=n.` },
      { type: "paragraph", text: "This gives a power ledger rather than a second conservation law. The spin loses angular momentum at rate τ, while the orbit gains it:" },
      { type: "math", tex: String.raw`\dot E_{\rm spin}=-\Omega\tau,\qquad \dot E_{\rm orb}=n\tau,\qquad P_{\rm heat}=(\Omega-n)\tau.` },
      { type: "paragraph", text: "For the stated present-day ordering Ω > n and outward transfer τ > 0, heating is positive even though the orbit gains energy. Check the units: torque times angular speed is power. Equal angular speeds make this transfer's dissipated power vanish. This is a consistency limit, not a prediction obtained by holding the present torque fixed until synchronism. The power-ledger explanation is original commentary connecting the paper's angular-momentum and energy sections." },
    ],
    sources: [source(2009, "Q", "IPhO 2009 T1, statement, sections 1 to 4"), source(2009, "S", "IPhO 2009 T1, official solution, 3g, 3h and 4a to 4d")],
    guide: { slug: "mechanics-olympiad-problem-solving" }, topic: "mechanics",
  },
  {
    problemId: "ipho-2010-t1", published: false, reviewedBy: null,
    title: "An image charge reproduces a field, not a second physical particle",
    prerequisites: "Electric potential, grounded conductors, work and derivatives of potential energy.",
    idea: "Mark the region where the image construction represents the physical field. Then ask what actually changes when the external charge moves. A mathematical replacement for the conductor is not an independently controlled source.",
    misconception: "The force on the external charge can be calculated with the image field. Treating the real charge and its image as an ordinary isolated two-charge system does not give the total physical energy.",
    hints: [
      { type: "paragraph", text: "Keep the sphere grounded, its radius R fixed and the external charge q fixed. At separation d > R the image parameters depend on d. The source solution separates the real-charge interaction from the induced charges' mutual energy:", cite: ["statement", "solution"] },
      { type: "math", tex: String.raw`q'=-\frac{qR}{d},\quad d'=\frac{R^2}{d},\quad k=\frac1{4\pi\varepsilon_0},\quad q\phi_{\rm ind}(d)=-\frac{kq^2R}{d^2-R^2}.` },
      { type: "paragraph", text: "With zero energy at infinity, the total configuration energy is half this interaction term. Check it by differentiating along the family of induced-charge configurations, with outward force positive:" },
      { type: "math", tex: String.raw`U(d)=-\frac{kq^2R}{2(d^2-R^2)},\qquad F_d=-\frac{dU}{dd}=-\frac{kq^2Rd}{(d^2-R^2)^2}.` },
      { type: "paragraph", text: "Differentiating qφind as though it were the total energy instead doubles the attractive force. This does not invalidate the image-field force: at each fixed configuration it represents the field of the induced charges. Moving q changes that configuration, including q′ and d′. For quasistatic assembly at fixed d, the induced potential grows linearly as the charge is raised from zero, explaining the factor one half. The force has force units and tends to zero as d tends to infinity. This derivative test is original commentary diagnosing the misconception, not a replacement for the paper's solution. A charged isolated sphere has a different boundary condition." },
    ],
    sources: [source(2010, "Q", "IPhO 2010 T1, statement, introduction and Task 4"), source(2010, "S", "IPhO 2010 T1, official solution, equations 8 to 10 and 25 to 31")],
    guide: { slug: "physics-olympiad-books-and-resources", hash: "electromagnetism" }, topic: "electromagnetism",
  },
];

export function findPublishedProblemInsight(problemId: string): ProblemInsight | null {
  return problemInsights.find(insight => insight.problemId === problemId && insight.published) ?? null;
}
