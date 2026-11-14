import type { ImportedNode } from "../imported-corpus-schema";

const node = (tag: "p" | "h2" | "h3" | "figcaption", text: string): ImportedNode => ({ type: "element", tag, children: [{ type: "text", text }] });
const p = (text: string) => node("p", text);
const h = (text: string) => node("h2", text);
const sub = (text: string) => node("h3", text);
const eq = (text: string) => p("\\[" + text + "\\]");
const fig = (name: string, alt: string): ImportedNode => ({ type: "element", tag: "img", src: "/corpus/figures/native/" + name + ".png", alt });
type NativeContent = { statement: ImportedNode[]; solution: ImportedNode[] };

/** Transcribed against the retained original PDF pages. Source inconsistencies are recorded in the review ledger. */
export const nativeOlympiadContent: Record<string, NativeContent> = {
  "eupho-2018-t1": {
    statement: [
      h("1. Three balls"),
      p("Three small identical balls (denoted as \\(A\\), \\(B\\), and \\(C\\)) of mass \\(m\\) each are connected with two massless rods of length \\(\\ell\\) so that one of the rods connects the balls \\(A\\) and \\(B\\), and the other rod connects the balls \\(B\\) and \\(C\\). The connection at the ball \\(B\\) is hinged, and the angle between the rods can change effortlessly. The system rests in weightlessness so that all the balls lie on one line. The ball \\(A\\) is given instantaneously a velocity perpendicular to the rods."),
      p("Find the minimal distance \\(d\\) between the balls \\(A\\) and \\(C\\) during the subsequent motion of the system. Any friction is to be neglected."),
    ],
    solution: [
      h("1. Three balls"),
      p("Let the ball \\(A\\) be given an initial velocity \\(v\\) along the axis \\(Y\\), which is perpendicular to the rod. The total momentum of the system is conserved, therefore the centre of mass (CM) of the system moves with a constant velocity"),
      eq("v_{\\mathrm{CM}}=\\frac{mv}{3m}=\\frac v3"),
      p("along \\(Y\\). In what follows, we will work in the CM frame of reference, which is an inertial system of reference. Therefore, in the CM frame the laws of conservation of energy, momentum, and angular momentum hold true. The initial velocities of the three balls along \\(Y\\) are"),
      eq("v_A=\\frac{2v}{3},\\qquad v_B=v_C=-\\frac v3."),
      p("Correspondingly, the total kinetic energy of the balls is"),
      eq("E=\\frac{mv^2}{2}\\left(\\frac49+\\frac19+\\frac19\\right)=\\frac{mv^2}{3}"),
      p("and the total angular momentum with respect to the CM equals"),
      eq("L=m\\frac{2v}{3}\\ell-m\\frac v3(-\\ell)=mv\\ell."),
      p("At any moment the three balls form an isosceles triangle with an angle \\(2\\varphi\\) at the top vertex. The distance between \\(A\\) and \\(C\\) is minimal when either \\(\\varphi=0\\), or \\(\\dot\\varphi=0\\). For \\(\\varphi=0\\), however, the laws of conservation are not consistent with the rigidity of the rods. Therefore, at the minimal distance \\(\\dot\\varphi=0\\), and in this particular instance the system behaves as a rigid body whose moment of inertia with respect to the CM can be obtained through"),
      eq("I=\\frac{L^2}{2E}=\\frac32m\\ell^2.\\tag{1}"),
      p("On the other hand, the moment of inertia \\(I\\) could be found independently from geometric considerations. Although \\(I\\) could be found using the distances from the balls to the CM (the triangle's median centre), it is more convenient to use the following formula for the moment of inertia of a collection of point masses with respect to the CM, as printed in the source"),
      eq("I=\\frac{\\sum_{i,j}m_i m_j(\\mathbf r_i-\\mathbf r_j)^2}{\\sum_i m_i}."),
      p("In our case"),
      eq("I=\\frac{m^2}{3m}(AB^2+BC^2+AC^2)=\\frac m3(2\\ell^2+d^2).\\tag{2}"),
      p("From (1) and (2), we obtain the minimal distance"),
      eq("d=\\ell\\sqrt{\\frac52}\\approx1.58\\ell."),
      p("Transcription note: the source's double-sum notation needs each unordered pair to be counted once. The explicit three-pair calculation (2) fixes the intended convention."),
    ],
  },
  "eupho-2018-t2": {
    statement: [
      h("2. Solenoid"),
      fig("eupho-2018-solenoid", "Original diagram: a vertical glass tube containing water, with a solenoid wound around its lower section and a current source connected to the coil."),
      p("A solenoid of length \\(\\ell=20\\,\\mathrm{cm}\\) is wound around a vertical, cylindrical test tube made of glass, filled with water. The solenoid is thermally insulated from the water. The height of the water level is approximately \\(20\\,\\mathrm{cm}\\) above the upper end of the solenoid, the diameter of the test tube is \\(1\\,\\mathrm{cm}\\), the number of turns of the coil is \\(N=6000\\). The atmospheric pressure is \\(p_0=101\\,\\mathrm{kPa}\\), the temperature of water is \\(293\\,\\mathrm K\\). Magnetic susceptibility of water is \\(\\chi\\equiv\\mu_r-1=-9.04\\times10^{-6}\\). Vacuum permeability \\(\\mu_0=12.57\\times10^{-7}\\,\\mathrm{H/m}\\)."),
      p("The current in the solenoid is slowly increased until the water starts boiling inside the coil. At which current strength would this happen? Make reasonable approximations when needed. Note that the required current strength might be slightly too large for the present technology."),
    ],
    solution: [
      h("2. Solenoid"),
      p("Magnetic field gives rise to magnetization of water molecules, i.e. each of the molecules becomes a magnetic dipole. An inhomogeneous magnetic field exerts a force on a magnetic dipole. Water molecules, being diamagnetic, are pushed away from the region of stronger magnetic field. Water reaches a state of mechanical equilibrium where the magnetic force is balanced by a force due to the pressure gradient. Hence, in mechanical equilibrium, regions with stronger magnetic field correspond to smaller pressures. When the current in the solenoid is increased, the pressure differences grow, and at a certain moment, a region will appear where the pressure is smaller than the saturation pressure of the water vapour. This is the moment when water starts boiling."),
      p("To begin with, let us discuss possible reasonable approximations. First, we can neglect the water-column pressure, which is only 2 to 4 percent of atmospheric pressure. Second, the saturation pressure of water vapour under normal conditions is also much smaller than atmospheric pressure and therefore can be neglected. Thus boiling starts when the pressure drop due to the magnetic field becomes equal to \\(p_0\\)."),
      p("We need to relate the pressure difference caused by the magnetic field to the magnetic-field strength. If a region with magnetic field \\(B\\) is filled with water, the magnetic-field energy density is \\(B^2/(2\\mu_r\\mu_0)\\). If there is no water, the energy density is \\(B^2/(2\\mu_0)\\). We can ascribe the energy-density difference"),
      eq("\\Delta w=(\\mu_r^{-1}-1)B^2/(2\\mu_0)"),
      p("to the interaction of water and magnetic field. Consider the following thought experiment. We push away a small volume \\(V\\) of water from the neighbourhood of a point \\(P\\) where the magnetic-field strength is \\(B\\). The displaced water fills a narrow layer at the top of the water surface of equal volume. Assuming the magnetic field is negligibly small at the top, the total interaction energy is reduced by \\(V(\\mu_r^{-1}-1)B^2/(2\\mu_0)\\). When pushing away water from \\(P\\), we perform mechanical work \\(pV\\), where \\(p\\) is the pressure at \\(P\\). At the upper surface, the moving interface performs mechanical work \\(p_0V\\), so the net work performed by water is \\(V(p_0-p)\\). Energy conservation gives"),
      eq("V(\\mu_r^{-1}-1)\\frac{B^2}{2\\mu_0}=V(p_0-p),\\qquad p_0=p+(\\mu_r^{-1}-1)\\frac{B^2}{2\\mu_0}."),
      p("This derivation is analogous to that of Bernoulli's law. The equality can be interpreted as a modified Bernoulli law for zero speed where the gravitational potential-energy density \\(\\rho gh\\) is replaced by \\((\\mu_r^{-1}-1)B^2/(2\\mu_0)\\), the energy density of magnetic interaction. Since \\(\\mu_r^{-1}-1=-\\chi/\\mu_r\\approx-\\chi\\),"),
      eq("p_0-p=-\\frac{\\chi B^2}{2\\mu_0}."),
      p("As discussed above, the boiling condition is \\(p\\approx0\\), hence"),
      eq("B=\\sqrt{-2\\mu_0p_0/\\chi}."),
      p("Finally, using the magnetic-field strength inside a long solenoid, \\(B=\\mu_0IN/\\ell\\),"),
      eq("I=\\frac\\ell N\\sqrt{\\frac{2p_0}{-\\chi\\mu_0}}=4.4\\,\\mathrm{kA}."),
    ],
  },
  "eupho-2018-t3": {
    statement: [
      h("3. Staircase"),
      p("The equilibrium shape of bodies in zero gravity is determined by the minimum of their surface energy. Thus, for example, the equilibrium shape of a water droplet turns out to be spherical: the sphere has the smallest surface area among bodies of the same volume."),
      p("At low temperature, the equilibrium shape of crystals may have flat facets. The parts of the crystal surface that have a small angle \\(\\varphi\\) with the facet are in fact staircases of rare steps on this facet. The height of such steps is equal to the period of the crystal lattice \\(h\\)."),
      fig("eupho-2018-staircase", "Original crystal diagram and microscopic staircase: step height h, spacing d_n between steps n and n+1, with x and z axes and surface profile y(x)."),
      p("Equilibrium surface profile \\(y(x)\\) of a certain crystal and the corresponding microscopic staircase are shown schematically in the figure, where \\(n\\) denotes the step number, counting from \\(x=0\\). The profile shape at \\(x>0\\) can be approximated as \\(y(x)=-(x/\\lambda)^{3/2}h\\), where \\(\\lambda=45\\,\\mu\\mathrm m\\) and \\(h=0.3\\,\\mathrm{nm}\\)."),
      sub("A"),
      p("Express the distance \\(d_n\\) between two adjacent steps as a function of \\(n\\) for \\(n\\gg1\\)."),
      sub("B"),
      p("The interaction energy \\(E\\) of two steps depends on the distance \\(d\\) between them as"),
      eq("E(d)=\\mu d^\\nu,"),
      p("where \\(\\mu\\) is a constant. Assume that only adjacent steps interact. Find the numerical value for the exponent \\(\\nu\\)."),
    ],
    solution: [
      h("3. Staircase"),
      sub("A"),
      p("The source prints \\(n=-y/h=(x/\\lambda)^{2/3}\\), followed by \\(x(n)=n^{2/3}\\lambda\\). The distance between the steps is"),
      eq("d_n=x(n+1)-x(n)\\approx\\frac{dx(n)}{dn}=\\frac23\\lambda n^{-1/3}=n^{-1/3}\\cdot30\\,\\mu\\mathrm m."),
      p("Transcription note: the exponent in the source's first expression for n is inconsistent with the statement. The statement implies \\(n=(x/\\lambda)^{3/2}\\), which agrees with the printed inverse \\(x(n)=n^{2/3}\\lambda\\) and the final spacing."),
      sub("B"),
      p("Equilibrium energy, being a minimum, must be stable against small perturbations of the crystal shape. Allowed perturbations conserve the crystal's total volume. A small horizontal displacement of one step must be accompanied by an equal and opposite displacement of another step."),
      p("The energy change \\(\\epsilon_n(\\delta)\\) associated with a small horizontal displacement \\(\\delta\\) of the \\(n\\)-th step is"),
      eq("\\begin{aligned}\\epsilon_n(\\delta)&=\\mu\\left((d_n+\\delta)^\\nu-d_n^\\nu+(d_{n+1}-\\delta)^\\nu-d_{n+1}^\\nu\\right)\\\\&\\approx\\mu\\nu\\left(d_n^{\\nu-1}-d_{n+1}^{\\nu-1}\\right)\\delta.\\end{aligned}"),
      p("For \\(\\epsilon_n(\\delta)+\\epsilon_m(-\\delta)\\) to vanish for arbitrary \\(n\\) and \\(m\\), the factor in parentheses must not depend on \\(n\\)"),
      eq("d_n^{\\nu-1}-d_{n+1}^{\\nu-1}=\\mathrm{const}."),
      p("Substituting \\(d_n\\propto n^{-1/3}\\),"),
      eq("n^{(1-\\nu)/3}-(n+1)^{(1-\\nu)/3}\\approx\\frac{1-\\nu}{3}n^{(1-\\nu)/3-1}=\\mathrm{const},"),
      eq("\\frac{1-\\nu}{3}-1=0\\quad\\Longrightarrow\\quad\\nu=-2."),
      p("The interaction energy corresponds to that of two dipoles in two dimensions"),
      eq("E(d)\\propto\\frac1{d^2}."),
      p("Source footnote: trivial solutions \\(\\nu=0\\) and \\(\\nu=1\\) imply that the total energy within the given constraints does not depend on the crystal's shape."),
    ],
  },
};

export { p, h, sub, eq, fig };
