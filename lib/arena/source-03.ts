import type { ArenaSeed } from "../arena-schema";

export const source03: ArenaSeed[] = [
  {
    id: "arena-the-clock-in-the-racing-mirror", title: "Time in a Moving Mirror", topic: "Modern physics", tags: ["Special relativity", "Moving mirrors", "Doppler effect"], summary: "Infer the arrival time, physical height and virtual-image distance of a relativistically approaching mirror.", statementFile: "02_The_Clock_in_the_Racing_Mirror_Problem.pdf",
    statement: String.raw`A camera is stationary in an inertial frame $$S$$. A plane mirror approaches the camera at relativistic speed $$v$$, starting from a very large distance. The mirror moves along the line connecting it to the camera, with its surface perpendicular to the direction of motion.

![Camera and clock at the left, approaching plane mirror at the right, and outgoing and reflected light paths along the x-axis.](/corpus/arena/figures/the-clock-in-the-racing-mirror-statement.png)

## (a)

A clock is located at the camera, at effectively the same position. The camera records the clock’s reflection in the mirror. At camera time $$t_0$$, the difference between the clock’s current reading and the reflected reading $$t'$$ is

$$t_0-t'=\delta.$$

At the same instant, the observed reflected reading changes with camera time at the rate

$$\frac{dt'}{dt_0}=r.$$

Find the time at which the mirror reaches the camera, in terms of $$\delta$$ and $$r$$.

## (b)

Assume a simple camera with a single lens of focal length $$f$$, so that light from a distant object forms an image near the focal plane. If the mirror’s image at time $$t_0$$ has height $$h$$ at that plane, find the mirror’s actual height $$H$$.

## (c)

At time $$t_0$$, the camera also records the reflection of the clock and the camera itself. How far from the camera is this virtual image?`,
    solution: String.raw`Let the camera and clock sit at $$x=0$$. The mirror lies at positive $$x$$ and moves toward the camera at speed $$v=\beta c$$, where $$0<\beta<1$$. Let $$t_r$$ denote the time when a light ray reflects, and let $$D_r$$ be the mirror’s distance from the camera at that instant.

## (a) When does the mirror arrive?

A clock reading emitted at $$t'$$ reaches the mirror at $$t_r$$ and returns to the camera at $$t_0$$. The outward and return paths have the same length $$D_r$$, so

$$t_r-t'=\frac{D_r}{c},\qquad t_0-t_r=\frac{D_r}{c},\qquad\delta=t_0-t'=\frac{2D_r}{c}.$$

The mirror approaches the outgoing light at relative closing speed $$c+v$$. If its distance at a reference time is $$D$$, then the reflection time is

$$t_r-t'=\frac{D-vt'}{c+v},\qquad t_0=t'+\frac{2(D-vt')}{c+v}.$$

Differentiation gives

$$\frac{dt_0}{dt'}=\frac{c-v}{c+v},\qquad r=\frac{dt'}{dt_0}=\frac{1+\beta}{1-\beta},\qquad\beta=\frac{r-1}{r+1}.$$

At time $$t_0$$, the mirror has advanced for another $$D_r/c$$ after reflection. Its current distance is therefore

$$D(t_0)=D_r-v\frac{D_r}{c}=\frac{c\delta}{2}(1-\beta).$$

Dividing by $$v$$ gives the remaining time to collision:

$$\boxed{t_{\mathrm{arrival}}=t_0+\frac{\delta}{r-1}}$$

Here $$r>1$$, as expected for an approaching mirror. If the mirror is stationary, $$r=1$$ and the arrival time diverges.

## (b) Actual height of the mirror

The mirror is seen by light that left it when its distance was $$D_r=c\delta/2$$, not at its smaller present distance $$D(t_0)$$. In the distant-object, small-angle approximation, a mirror of height $$H$$ subtends angle $$H/D_r$$. A lens of focal length $$f$$ makes an image of height $$h\simeq fH/D_r$$. Hence

$$\boxed{H\simeq\frac{hc\delta}{2f}}$$

This uses the focal-plane approximation specified in the question. For a finite object distance, the exact thin-lens image plane is slightly displaced from $$f$$.

## (c) Virtual image of the clock

A moving mirror changes not only the reflected frequency but also the reflection angles. For nearly normally incident light, the reflected frequency is $$r$$ times the incident frequency. The transverse photon momentum is conserved because the mirror moves only along $$x$$. Thus a small reflected angle, measured relative to the reverse optical axis, is $$1/r$$ times the incident angle.

![Outgoing and reflected rays from the clock through the camera aperture, the mirror at reflection, and the back-traced virtual image.](/corpus/arena/figures/the-clock-in-the-racing-mirror-solution.png)

More precisely, let an outgoing ray from the clock have small slope $$a$$. Its reflection point is at transverse height $$aD_r$$. The ray returning toward the camera has slope magnitude $$a/r$$ and reaches a lens point at transverse height

$$y_a=aD_r+\frac{aD_r}{r}=aD_r\left(1+\frac1r\right).$$

Back-tracing this returning ray to the optical axis gives an apparent virtual-image distance $$D_{\mathrm{virt}}=ry_a/a$$. Therefore

$$\boxed{D_{\mathrm{virt}}=(1+r)D_r=\frac{(1+r)c\delta}{2}}$$

For a stationary mirror, $$r=1$$ and the familiar result $$D_{\mathrm{virt}}=2D_r$$ is recovered.`,
  },
  {
    id: "arena-the-dodecahedron-conspiracy", title: "The Charged Dodecahedron", topic: "Electromagnetism", tags: ["Gauss’s law", "Symmetry", "Solid angle"], summary: "Use symmetry and solid angle to find flux and central fields for a charged regular dodecahedron.", statementFile: "02_The_Dodecahedron_Conspiracy_Problem.pdf",
    statement: String.raw`A regular dodecahedron has 12 faces, 30 edges, and 20 vertices. Each face is a regular pentagon, and every edge has length $$a$$.

![A regular dodecahedron showing its pentagonal faces.](/corpus/arena/figures/the-dodecahedron-conspiracy-statement.png)

Figure 2.

## (a)

A point charge $$Q$$ is placed at the center of the dodecahedron. Find the electric flux through each face.

## (b)

The central charge is removed. Eleven faces now carry a uniform surface charge density $$+\sigma$$, while the remaining face carries $$-\sigma$$. Find the magnitude of the electric field at the center.

## (c)

As in part (b), the central charge is absent. The surface charge density $$-\sigma$$ is now assigned to one face and all five faces that share an edge with it. The other six faces carry $$+\sigma$$. Find the magnitude of the electric field at the center.`,
    solution: String.raw`![The regular dodecahedron used in the symmetry argument.](/corpus/arena/figures/the-dodecahedron-conspiracy-solution.png)

Write $$\hat{\boldsymbol n}_i$$ for the outward unit normal to face $$i$$. All twelve faces are equivalent by symmetry.

## (a) Flux through each face

Gauss’s law gives the total outgoing flux $$Q/\varepsilon_0$$. Every face must carry the same share, so

$$\boxed{\Phi_{\mathrm{face}}=\frac{Q}{12\varepsilon_0}.}$$

This result does not depend on the edge length $$a$$.

## (b) Flip the charge on one face

First imagine that every face has surface charge density $$+\sigma$$. Their fields at the center add to zero by symmetry.

We need the field from one uniformly charged pentagonal face. As viewed from the center, each face subtends the same solid angle,

$$\Omega_{\mathrm{face}}=\frac{4\pi}{12}=\frac\pi3.$$

The electric field due to a face points along its normal because rotations and reflections of the pentagon cancel its tangential components. The normal component is the surface density multiplied by the solid angle factor:

$$\boldsymbol E_i^{(+)}=-\frac{\sigma\Omega_{\mathrm{face}}}{4\pi\varepsilon_0}\hat{\boldsymbol n}_i=-\frac{\sigma}{12\varepsilon_0}\hat{\boldsymbol n}_i.$$

Changing one face from $$+\sigma$$ to $$-\sigma$$ changes its field by

$$\Delta\boldsymbol E_i=-2\boldsymbol E_i^{(+)}=\frac{\sigma}{6\varepsilon_0}\hat{\boldsymbol n}_i.$$

All the other contributions still cancel against the original all-positive configuration. Therefore

$$\boxed{E_{\mathrm{center}}=\frac{|\sigma|}{6\varepsilon_0}.}$$

The shortcut is to flip one face rather than calculate fields from all twelve faces.

## (c) Flip a face and its five neighbors

Again start from the all-positive configuration. Let face 0 be the chosen pentagon. Its five neighboring face normals make the same angle $$\gamma$$ with $$\hat{\boldsymbol n}_0$$.

The centers of the dodecahedron’s faces are vertices of its dual, a regular icosahedron. Put $$\varphi=(1+\sqrt5)/2$$. Adjacent icosahedral vertices may be represented by

$$(0,1,\varphi),\qquad(1,\varphi,0).$$

The cosine of the angle between their directions is

$$\cos\gamma=\frac{\varphi}{1+\varphi^2}=\frac1{\sqrt5}.$$

By fivefold symmetry around face 0, the components of its five neighboring normals perpendicular to $$\hat{\boldsymbol n}_0$$ cancel. Their axial components sum to

$$\sum_{j=1}^5\hat{\boldsymbol n}_j=5\cos\gamma\,\hat{\boldsymbol n}_0=\sqrt5\,\hat{\boldsymbol n}_0.$$

Each flipped face changes the field by $$\sigma\hat{\boldsymbol n}_i/(6\varepsilon_0)$$. Therefore

$$\boldsymbol E_{\mathrm{center}}=\frac{\sigma}{6\varepsilon_0}\left(\hat{\boldsymbol n}_0+\sum_{j=1}^5\hat{\boldsymbol n}_j\right)=\frac{\sigma(1+\sqrt5)}{6\varepsilon_0}\hat{\boldsymbol n}_0.$$

$$\boxed{E_{\mathrm{center}}=\frac{|\sigma|}{6\varepsilon_0}(1+\sqrt5).}$$

The size of the dodecahedron drops out of all three answers. Only its symmetry and the pattern of charged faces matter.`,
  },
  {
    id: "arena-the-gas-with-elbows", title: "Van der Waals by Counting", topic: "Thermodynamics", tags: ["Partition functions", "Van der Waals gas", "Statistical mechanics"], summary: "Build the van der Waals equation from quantum state counting, excluded volume and mean-field attraction.", statementFile: "02_The_Gas_with_Elbows_Problem.pdf",
    statement: String.raw`## From an ideal gas to the van der Waals equation

An ideal gas neglects molecular size and intermolecular attraction. In this problem, begin with an ideal gas and then introduce both effects to obtain the van der Waals equation.

## (a) Begin with an ideal gas.

(i) Consider one particle of mass $$M$$ in a cubic box of side length $$L$$ and volume $$V=L^3$$. Applying the boundary conditions gives the allowed energies

$$\varepsilon_{\boldsymbol n}=\frac{\hbar^2}{2M}\left(\frac\pi L\right)^2(n_x^2+n_y^2+n_z^2),$$

where $$\hbar$$ is the reduced Planck constant, and $$n_x,n_y,n_z$$ are positive integers. The probability of occupying a particular state is

$$P(\varepsilon_{\boldsymbol n})=\frac1{Z_1}\exp\left(-\frac{\varepsilon_{\boldsymbol n}}{k_BT}\right),$$

where $$k_B$$ is Boltzmann’s constant, $$T$$ is the absolute temperature, and $$Z_1$$ is the single-particle partition function.

For this one-particle system, let $$n=1/V$$ be its number density. Write $$Z_1=n_Q/n$$, where $$n_Q$$ is the quantum concentration. Find $$n_Q$$ in terms of $$M$$, $$T$$, and fundamental constants.

Hints. For a sufficiently large box, the energy-level spacing is much smaller than $$k_BT$$, so sums can be approximated by integrals. You may use

$$\int_0^\infty e^{-\alpha^2x^2}\,dx=\frac{\sqrt\pi}{2\alpha}\qquad(\alpha>0).$$

(ii) The mean energy of one particle has the form

$$U=k_BT^a\frac{\partial}{\partial T}f(Z_1),$$

where $$a$$ is an integer and $$f$$ is a function of $$Z_1$$. Find $$a$$ and $$f$$, then express $$U$$ in terms of $$T$$ and fundamental constants.

(iii) For $$N$$ indistinguishable particles, the partition function is

$$Z_N=\frac{Z_1^N}{N!}.$$

Find the internal energy $$U$$ of the gas.

(iv) The Helmholtz free energy is $$F=U-TS$$, where $$S$$ is the entropy. For a gas, $$F$$ is usually treated as $$F(T,V,N)$$. Starting from the first law of thermodynamics, express $$S$$ and the pressure $$p$$ as partial derivatives of $$F$$.

(v) Show that

$$U=-T^b\frac{\partial}{\partial T}(FT^c),$$

where $$b$$ and $$c$$ are integers, and find both integers.

(vi) Express $$F$$ in terms of the partition function $$Z_N$$. Then show that

$$\boxed{F=Nk_BT\left[\ln\left(\frac n{n_Q}\right)-1\right].}$$

Hint. Use Stirling’s approximation, $$\ln N!\simeq N\ln N-N$$.

## (b) Now consider a van der Waals gas.

(i) The first correction comes from the finite size of each molecule, which reduces the volume accessible to the other molecules. If the actual volume of one molecule is $$v$$, its effective excluded-volume parameter is $$b=cv$$, where $$c$$ is an integer. Find $$c$$.

(ii) For $$N$$ molecules, write the corrected Helmholtz free energy, accounting for the reduction of available volume. Express the correction using $$N$$ and $$b$$.

(iii) The second correction describes weak, long-range molecular attraction. Use the mean-field approximation. Two molecules separated by a distance $$r$$ interact through

$$\phi(r)=\begin{cases}\infty,&r<d,\\-\varepsilon\left(\frac dr\right)^6,&r\geq d,\end{cases}$$

where $$d$$ is the molecular diameter and $$\varepsilon>0$$ is an energy scale. For uniform number density $$n$$, the mean total interaction energy of one molecule with all the others is

$$n\int_{r\geq d}\phi(r)\,d^3\boldsymbol r=-2na.$$

Here $$a>0$$ is a constant. Express $$a$$ in terms of $$\varepsilon$$ and $$b$$.

(iv) Include both the volume correction and the interaction-energy correction in the ideal-gas Helmholtz free energy. Find $$F(T,V,N)$$.

(v) Derive the van der Waals equation of state, relating $$p$$, $$V$$, and $$T$$.

(vi) Find the internal energy of the van der Waals gas.`,
    solution: String.raw`## Partition functions, excluded volume, and attraction

## (a)(i) Single-particle partition function

A large box makes the energy levels effectively continuous. The partition sum becomes three Gaussian integrals:

$$\begin{aligned}Z_1&=\sum_{n_x,n_y,n_z=1}^\infty e^{-\varepsilon_{\boldsymbol n}/(k_BT)}\\&\simeq\prod_{j=x,y,z}\int_0^\infty\exp\left[-\frac{\pi^2\hbar^2 n_j^2}{2ML^2k_BT}\right]dn_j\\&=\left[L\sqrt{\frac{Mk_BT}{2\pi\hbar^2}}\right]^3=V\left(\frac{Mk_BT}{2\pi\hbar^2}\right)^{3/2}.\end{aligned}$$

For the one-particle system, $$n=1/V$$, so $$Z_1=Vn_Q=n_Q/n$$, as stated. For a system of $$N$$ particles, the same single-particle partition function is $$Z_1=Vn_Q$$. Therefore

$$\boxed{n_Q=\left(\frac{Mk_BT}{2\pi\hbar^2}\right)^{3/2}}$$

## (a)(ii) Mean energy of one particle

Differentiate the Boltzmann weights with respect to temperature:

$$U=\frac{\sum_{\boldsymbol n}\varepsilon_{\boldsymbol n}e^{-\varepsilon_{\boldsymbol n}/k_BT}}{Z_1}=k_BT^2\frac{\partial\ln Z_1}{\partial T}.$$

At fixed volume, $$Z_1\propto T^{3/2}$$, so $$\partial_T\ln Z_1=3/(2T)$$.

$$\boxed{a=2,\qquad f(Z_1)=\ln Z_1,\qquad U_1=\frac32k_BT}$$

## (a)(iii) Internal energy of N identical particles

Using $$Z_N=Z_1^N/N!$$ gives $$\partial_T\ln Z_N=N\partial_T\ln Z_1$$, because $$N!$$ does not depend on $$T$$.

$$\boxed{U=k_BT^2\partial_T\ln Z_N=\frac32Nk_BT}$$

## (a)(iv) Entropy and pressure from Helmholtz energy

The first law is $$dU=T\,dS-p\,dV$$ for fixed $$N$$. Therefore

$$dF=d(U-TS)=-S\,dT-p\,dV.$$

Compare this with the total differential of $$F(T,V,N)$$ at fixed $$N$$:

$$\boxed{S=-\left(\frac{\partial F}{\partial T}\right)_{V,N},\qquad p=-\left(\frac{\partial F}{\partial V}\right)_{T,N}}$$

## (a)(v) Internal energy in terms of F

Substitute the entropy identity into $$U=F+TS$$:

$$U=F-T\left(\frac{\partial F}{\partial T}\right)_{V,N}=-T^2\left(\frac{\partial}{\partial T}\frac FT\right)_{V,N}.$$

$$\boxed{b=2,\qquad c=-1}$$

## (a)(vi) Ideal-gas Helmholtz energy

The canonical partition function gives $$F=-k_BT\ln Z_N$$. Apply Stirling’s approximation and $$Z_1=Vn_Q$$:

$$\begin{aligned}F&=-k_BT[N\ln(Vn_Q)-\ln N!]\\&\simeq-k_BT[N\ln(Vn_Q)-N\ln N+N]\\&=Nk_BT\left[\ln\left(\frac N{Vn_Q}\right)-1\right].\end{aligned}$$

$$\boxed{F_{\mathrm{id}}=Nk_BT\left[\ln\left(\frac n{n_Q}\right)-1\right]}$$

## (b)(i) Excluded volume per molecule

A second molecular center cannot come closer than one molecular diameter $$d$$. The forbidden sphere around a molecule has volume $$(4\pi/3)d^3$$. Each forbidden region belongs to a pair, so divide by two:

$$b=\frac12\frac{4\pi d^3}{3}=\frac{2\pi d^3}{3},\qquad v=\frac{\pi d^3}{6}.$$

$$\boxed{b=4v,\qquad c=4}$$

## (b)(ii) Volume-corrected Helmholtz energy

Replace the geometric volume $$V$$ by the accessible volume $$V-Nb$$ in the ideal-gas expression:

$$\boxed{F_{\mathrm{rep}}=Nk_BT\left[\ln\left(\frac N{(V-Nb)n_Q}\right)-1\right]}$$

This approximation requires $$V>Nb$$.

## (b)(iii) Mean-field attraction constant

Molecular centers must satisfy $$r\geq d$$. Integrate the attractive potential over all allowed separations:

$$\begin{aligned}-2na&=n\int_d^\infty\phi(r)\,4\pi r^2\,dr\\&=-4\pi n\varepsilon d^6\int_d^\infty r^{-4}\,dr=-\frac{4\pi n\varepsilon d^3}{3}.\end{aligned}$$

Hence $$a=(2\pi/3)\varepsilon d^3$$. From part (b)(i), $$b=2\pi d^3/3$$.

$$\boxed{a=\varepsilon b}$$

## (b)(iv) Full Helmholtz free energy

The interaction energy of one molecule is $$-2na$$. Counting all $$N$$ molecules would count every pair twice, giving total attraction energy

$$\Delta U_{\mathrm{att}}=\frac N2(-2na)=-\frac{aN^2}{V}.$$

Adding this to the volume-corrected free energy yields

$$\boxed{F=Nk_BT\left[\ln\left(\frac N{(V-Nb)n_Q}\right)-1\right]-\frac{aN^2}{V}}$$

## (b)(v) Equation of state

At fixed $$T$$ and $$N$$, the pressure is $$p=-(\partial F/\partial V)_{T,N}$$. Differentiate both terms:

$$p=\frac{Nk_BT}{V-Nb}-\frac{aN^2}{V^2}.$$

Writing $$n=N/V$$ gives the familiar equivalent form

$$\boxed{(p+an^2)(V-Nb)=Nk_BT}$$

## (b)(vi) Internal energy

The logarithmic part contributes the ideal-gas kinetic energy. The attraction term has no explicit temperature dependence, so it stays in $$U$$:

$$U=-T^2\left(\frac\partial{\partial T}\frac FT\right)_{V,N}.$$

$$\boxed{U=\frac32Nk_BT-\frac{aN^2}{V}}$$`,
  },
];
