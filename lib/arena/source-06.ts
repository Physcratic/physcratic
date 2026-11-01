import type { ArenaSeed } from "../arena-schema";

export const source06: ArenaSeed[] = [
  {
    id: "arena-the-bending-beam-riddle", title: "The Bending Beam Riddle", topic: "Waves", tags: ["Elasticity", "Flexural waves", "Dispersion"], summary: "Derive static beam bending, midpoint deflection and dispersive transverse waves including rotational inertia.", statementFile: "03_The_Bending_Beam_Riddle_Problem.pdf",
    statement: String.raw`This problem explores how elasticity and rotation of the medium affect transverse waves on a thin elastic beam. The beam has mass density $$\rho$$, length $$L$$, vertical width $$d$$, and thickness $$b$$ perpendicular to the plane of the drawings. Parts (a) and (b) develop the concept of a bending moment in an elastic beam.

![A simply supported static beam with shear forces V and V+dV, a bent beam with curvature R(x), and a transverse beam wave ψ(x).](/corpus/arena/figures/the-bending-beam-riddle-statement.png)

Figure 1: The straight beam, its static bending, and a transverse deformation.

## (a)

Consider a uniform, static beam with Young’s modulus $$Y\to\infty$$, so it does not deform. It is supported at both ends as shown in (a). Examine an element of length $$dx$$ at distance $$x$$ from the left end. On its left face, the section to the left exerts an upward shear force $$V$$. There is also a normal force per unit area $$f_{xx}(x,y)$$, directed to the right. Its magnitude varies with vertical position $$y$$, measured from the middle of the beam $$(y=0)$$. The upper region tends to be compressed and the lower region stretched.

This variation gives a torque about the element’s center of mass, called the bending moment:

$$M(x)=\int_{-d/2}^{d/2}f_{xx}(x,y)\,y\,b\,dy.$$

The part of the beam on the right exerts a downward shear force $$V+dV$$ on the right face, together with a bending moment $$M+dM$$.

(i) Find the relation between $$dM/dx$$ and $$V(x)$$.

(ii) Determine $$d^2M/dx^2$$ in terms of $$\rho$$, $$L$$, $$b$$, $$d$$, and gravitational acceleration $$g$$.

(iii) Find $$V(x)$$ and $$M(x)$$ along the beam.

## (b)

Now let the beam have finite Young’s modulus $$Y$$, so it bends as in (b). Assume that the central layer remains unstrained, while the upper layer is compressed and the lower layer stretched. The radius of curvature of the central layer at $$x$$ is $$R(x)$$. Young’s modulus is defined by

$$Y=-\frac{f_{xx}}{\Delta l/l},$$

where $$\Delta l$$ is the change in length and $$l$$ the initial length.

(i) Determine $$f_{xx}(y)$$ on the left face of the element $$dx$$ in terms of $$Y$$ and $$R(x)$$.

(ii) Determine $$M(x)$$ in terms of $$R(x)$$, $$b$$, and $$d$$ (and the given material modulus).

(iii) Let $$\psi(x)$$ be the small vertical displacement of the beam’s central layer from the straight position $$(|\psi'|\ll1)$$. The signed radius of curvature can be written as

$$R(x)=\frac{[1+(d\psi/dx)^2]^{3/2}}{d^2\psi/dx^2}\simeq\frac1{d^2\psi/dx^2}.$$

Determine how far the center of the beam drops below its original position.

## (c)

In this part, neglect gravity and consider transverse waves propagating along the beam.

(i) The wave equation can be written as

$$\frac{\partial^n\psi}{\partial x^n}=A\frac{\partial^2\psi}{\partial t^2}+B\frac{\partial^4\psi}{\partial t^2\partial x^2}.\tag{1}$$

Determine the integer $$n$$ and the parameters $$A$$ and $$B$$ in terms of $$Y$$, $$d$$, and $$\rho$$.

(ii) If $$d$$ is small enough, the second term on the right of Eq. (1) can be neglected. For a traveling wave of angular frequency $$\omega$$, determine its phase velocity and group velocity.`,
    solution: String.raw`Let $$S=bd$$ be the cross-sectional area and $$I=bd^3/12$$ its second moment of area about the central layer. The beam has weight per unit length $$w=\rho Sg$$.

## (a) Static shear force and bending moment

(i) Relation between $$M$$ and $$V$$. Balancing moments on a short section of length $$dx$$, and keeping only first-order terms in $$dx$$, gives

$$\boxed{\frac{dM}{dx}=V(x)}$$

(ii) Second derivative of the moment. Vertical force balance on the same short section gives

$$V-(V+dV)-w\,dx=0\quad\Longrightarrow\quad\frac{dV}{dx}=-w=-\rho bdg.$$

Combining this with $$M'=V$$,

$$\boxed{\frac{d^2M}{dx^2}=-\rho bdg}$$

(iii) Shear and moment along the beam. Each support carries half the total weight, $$wL/2$$. Hence

$$V(x)=\frac{wL}2-wx,$$

and, integrating with $$M(0)=0$$,

$$M(x)=\frac{wLx}2-\frac{wx^2}2.$$

$$\boxed{V(x)=\rho bdg\left(\frac L2-x\right),\qquad M(x)=\frac{\rho bdg}2x(L-x)}$$

The moment is greatest at the midpoint, where the shear force is zero.

## (b) Elastic bending and midpoint deflection

(i) Stress across the thickness. An element at height $$y$$ is a distance $$R-y$$ from the center of curvature rather than $$R$$. Its fractional change in length is $$\Delta l/l=-y/R$$. From the stated definition of Young’s modulus,

$$\boxed{f_{xx}(y)=\frac{Yy}{R(x)}}$$

(ii) Bending moment. Using the stress distribution in the definition of the moment,

$$\begin{aligned}M(x)&=\int_{-d/2}^{d/2}\frac{Yy}{R(x)}yb\,dy=\frac{Yb}{R(x)}\int_{-d/2}^{d/2}y^2\,dy\\&=\frac{Ybd^3}{12R(x)}.\end{aligned}$$

$$\boxed{M(x)=\frac{YI}{R(x)}=\frac{Ybd^3}{12R(x)}}$$

(iii) How far the center drops. For small slopes, $$1/R\simeq\psi''$$. Thus $$M=YI\psi''$$, and part (a) gives

$$\psi''(x)=\frac{M(x)}{YI}=\frac{6\rho g}{Yd^2}x(L-x).$$

Here $$\psi$$ is positive upward, so the deflection under the beam’s own weight is negative. Integrating twice and using the simple-support conditions $$\psi(0)=\psi(L)=0$$ yields

$$\psi(x)=-\frac{\rho g}{2Yd^2}(L^3x-2Lx^3+x^4).$$

The greatest downward displacement is at $$x=L/2$$:

$$\boxed{\text{midpoint drop}=|\psi(L/2)|=\frac{5\rho gL^4}{32Yd^2}}$$

This agrees with the standard result $$5wL^4/(384YI)$$ for a simply supported beam under a uniform load.

## (c) Transverse waves, including rotational inertia

(i) Wave equation. The bending stiffness is $$YI$$, the mass per unit length is $$\rho S$$, and the moment of inertia per unit length for rotation of a cross-section is $$\rho I$$. Force and torque balance for a short beam element give the Rayleigh beam equation

$$YI\frac{\partial^4\psi}{\partial x^4}+\rho S\frac{\partial^2\psi}{\partial t^2}-\rho I\frac{\partial^4\psi}{\partial x^2\partial t^2}=0.\tag{1}$$

The last term accounts for rotation of the cross-section as the beam bends. Without it, the thin-beam approximation would have only the first two terms.

Divide Eq. (1) by $$YI$$ and use $$S/I=12/d^2$$:

$$\frac{\partial^4\psi}{\partial x^4}=-\frac{12\rho}{Yd^2}\frac{\partial^2\psi}{\partial t^2}+\frac\rho Y\frac{\partial^4\psi}{\partial t^2\partial x^2}.$$

Comparison with the given form identifies

$$\boxed{n=4,\qquad A=-\frac{12\rho}{Yd^2},\qquad B=\frac\rho Y}$$

(ii) Phase and group velocities. For sufficiently small $$d$$, omit the rotational-inertia term and take a traveling wave of the form

$$\psi(x,t)=\psi_0\sin(kx-\omega t).$$

Substitution gives

$$k^4=\frac{12\rho}{Yd^2}\omega^2\quad\Longrightarrow\quad\omega=\sqrt{\frac{Yd^2}{12\rho}}k^2.$$

The phase velocity is $$v_{\mathrm{ph}}=\omega/k$$. Since $$\omega\propto k^2$$, the group velocity is twice as large:

$$\boxed{v_{\mathrm{ph}}=\left(\frac{Yd^2}{12\rho}\right)^{1/4}\sqrt\omega}$$

$$\boxed{v_g=\frac{d\omega}{dk}=2\left(\frac{Yd^2}{12\rho}\right)^{1/4}\sqrt\omega=2v_{\mathrm{ph}}}$$

Physical meaning. Higher-frequency flexural waves travel faster than lower-frequency ones. The beam is dispersive, unlike an ideal taut string whose wave speed is independent of frequency.`,
  },
  {
    id: "arena-the-capacitors-missing-energy", title: "The Capacitor’s Missing Energy", topic: "Modern physics", tags: ["Special relativity", "Electromagnetic energy", "Mechanical stress"], summary: "Resolve the apparent energy-transformation paradox of a moving capacitor by including its stressed supports.", statementFile: "03_The_Capacitors_Missing_Energy_Problem.pdf",
    statement: String.raw`This problem examines an apparent failure of the Lorentz transformation of energy and momentum for a parallel-plate capacitor observed from a moving frame.

In its rest frame, the capacitor has plates separated by $$d$$, each of area $$A$$, with $$\sqrt A\gg d$$. The electric field between the plates is $$E_0$$, and each plate has rest mass $$m_p$$. Neglect fringing fields.

![A parallel-plate capacitor with plate separation d, electric field E₀ along +x and two insulating struts holding the plates apart.](/corpus/arena/figures/the-capacitors-missing-energy-statement.png)

## (a)

Consider an inertial frame $$S$$ moving at speed $$v=\beta c$$ in the $$-x$$ direction relative to the capacitor’s rest frame, perpendicular to the plates and parallel to the electric field.

(i) Find the electric-field energy $$U_0$$ in the capacitor’s rest frame.

(ii) Find the electric field in $$S$$.

(iii) Find the field energy $$U$$ and the energy of each plate in $$S$$. Observe that their sum does not transform like the energy of a complete isolated system.

## (b)

The apparent discrepancy arises because a mechanism must prevent the oppositely charged plates from moving together. Suppose two insulating struts connect the plates at their upper and lower edges, as in the figure. The struts are mechanically stressed.

(i) Consider a general continuous medium whose rest-frame stress components are $$f_{0xx}$$, $$f_{0xy}$$, $$f_{0xz}$$, $$f_{0yx}$$, $$f_{0yy}$$, and so on. Here $$f_{0xy}$$ is the $$x$$-component of force per unit area acting on a surface with normal in the $$y$$ direction. Find the corresponding stress components measured in $$S$$.

(ii) Each strut has only a longitudinal rest-frame stress $$f_{0xx}$$, all other components being zero. Let $$\rho_0$$ be the strut’s rest-frame energy per unit volume divided by $$c^2$$. Consider a small element of rest-frame dimensions $$\Delta x'\Delta y'\Delta z'$$. The surrounding material is removed simultaneously in the rest frame, and the forces on the two ends cease. Find the time interval between the disappearance of these forces as measured in $$S$$.

(iii) Find the change in the element’s energy in $$S$$ due to the work done during this interval. Express it in terms of $$f_{xx}$$, $$\beta$$ and $$\Delta x'\Delta y'\Delta z'$$.

(iv) Find $$\rho_f$$, the element’s energy per unit volume divided by $$c^2$$ in $$S$$, after the stress has disappeared.

(v) Find $$\rho$$, the corresponding quantity while the element is stressed, in terms of $$\rho_0$$, the longitudinal rest-frame stress $$t_{0xx}$$, and $$v$$. Take $$t_{0xx}=f_{0xx}$$.

(vi) If each strut has cross-sectional area $$A_b$$, find $$t_{0xx}$$ needed to counteract the attraction between the plates.

(vii) If each strut has rest-frame mass $$m_{0b}$$, find its energy-equivalent mass $$m_b=E_b/c^2$$ in $$S$$, in terms of $$m_{0b}$$, $$E_0$$, $$d$$, $$A$$, $$A_b$$ and $$v$$.

(viii) Find the total energy of the field, both plates and both struts in $$S$$.`,
    solution: String.raw`Define

$$u_0=\frac12\varepsilon_0E_0^2,\qquad\beta=\frac vc,\qquad\gamma=\frac1{\sqrt{1-\beta^2}}.$$

The rest frame of the capacitor is denoted by $$S_0$$. The frame $$S$$ moves along $$-x$$ relative to $$S_0$$, so the capacitor moves along $$+x$$ in $$S$$. We take a positive Cauchy stress to mean tension and a negative one to mean compression. Thus $$f_{ij}$$ is force in the $$i$$ direction per area normal to $$j$$.

## (a) The apparent energy discrepancy

(i) Field energy at rest. Neglecting fringing fields, the field occupies volume $$Ad$$ and has energy density $$u_0$$:

$$\boxed{U_0=\frac12\varepsilon_0E_0^2Ad}$$

(ii) Field in the moving frame. A Lorentz boost parallel to an electric field leaves its longitudinal component unchanged. The field is purely electric in $$S_0$$, and the boost creates no magnetic field:

$$\boxed{\boldsymbol E=E_0\hat{\boldsymbol x},\qquad\boldsymbol B=0}$$

(iii) Field and plate energies in $$S$$. The gap contracts from $$d$$ to $$d/\gamma$$ while the transverse area $$A$$ is unchanged. Since the electric field itself is unchanged,

$$U=u_0A\frac d\gamma=\frac{U_0}\gamma.$$

Each moving plate has energy $$\gamma m_pc^2$$, giving

$$\boxed{U_{\mathrm{field}}=\frac{U_0}\gamma,\quad E_{\mathrm{plate}}=\gamma m_pc^2,\quad E_{\mathrm{partial}}=\frac{U_0}\gamma+2\gamma m_pc^2}$$

This is not $$\gamma(U_0+2m_pc^2)$$. The missing energy is

$$\gamma U_0-\frac{U_0}\gamma=\gamma\beta^2U_0.$$

There is no paradox: the plates cannot remain separated without a supporting mechanism. The field and plates alone are not a closed, static system.

## (b) The supporting struts

(i) How the mechanical stresses transform. A force parallel to the boost is unchanged, whereas a transverse force is divided by $$\gamma$$. At the same time, areas containing the $$x$$ direction undergo Lorentz contraction by $$1/\gamma$$; areas perpendicular to $$x$$ do not. Applied to forces on moving material surfaces, these rules yield

$$\begin{pmatrix}f_{xx}&f_{xy}&f_{xz}\\f_{yx}&f_{yy}&f_{yz}\\f_{zx}&f_{zy}&f_{zz}\end{pmatrix}=\begin{pmatrix}f_{0xx}&\gamma f_{0xy}&\gamma f_{0xz}\\f_{0yx}/\gamma&f_{0yy}&f_{0yz}\\f_{0zx}/\gamma&f_{0zy}&f_{0zz}\end{pmatrix}.$$

These are forces per area acting on material surfaces, not the spatial components of the full energy-momentum tensor. The latter also includes the flux of momentum carried by the moving matter. For the struts only $$f_{xx}=f_{0xx}$$ is needed.

(ii) Different end forces switch off at different times. The release events are simultaneous in $$S_0$$: $$\Delta t'=0$$. The Lorentz transformation from $$S_0$$ to $$S$$ is

$$t=\gamma\left(t'+\frac{vx'}{c^2}\right).$$

Consequently, the right end $$(\Delta x'>0)$$ loses its stress later than the left end by

$$\boxed{\Delta t=\gamma\frac{v\Delta x'}{c^2}=\gamma\beta\frac{\Delta x'}c}$$

The sign of the time ordering follows from the fact that the element moves along $$+x$$ in $$S$$.

(iii) Work during this interval. Once the left force has disappeared, the right-end force on the element is $$F_x=f_{xx}\Delta y'\Delta z'$$. The element moves approximately at speed $$v$$ over the short interval. The total work, equal to the change in energy of the element, is

$$\Delta E=F_xv\Delta t=f_{xx}\Delta y'\Delta z'\,v\left(\gamma\beta\frac{\Delta x'}c\right).$$

Thus, with $$\Delta V_0=\Delta x'\Delta y'\Delta z'$$,

$$\boxed{\Delta E=\gamma\beta^2f_{xx}\Delta V_0}$$

For compressed struts $$f_{xx}<0$$, so this work is negative.

(iv) Energy density after release. Once the element is stress-free, its rest-frame energy is $$\rho_0c^2\Delta V_0$$. Its energy in $$S$$ is $$\gamma\rho_0c^2\Delta V_0$$. Its volume at a simultaneous instant in $$S$$ is $$\Delta V_0/\gamma$$, so

$$\boxed{\rho_f=\gamma^2\rho_0}$$

(v) Energy density while stressed. The energy just before release plus the work equals the energy after release:

$$E_{\mathrm{before}}+\gamma\beta^2f_{0xx}\Delta V_0=\gamma\rho_0c^2\Delta V_0.$$

Divide $$E_{\mathrm{before}}$$ by $$c^2$$ and the Lorentz-contracted volume $$\Delta V_0/\gamma$$:

$$\boxed{\rho=\gamma^2\left(\rho_0-\frac{\beta^2t_{0xx}}{c^2}\right),\qquad t_{0xx}=f_{0xx}}$$

Equivalently, the energy-momentum tensor has $$T_0^{00}=\rho_0c^2$$ and $$T_0^{xx}=-t_{0xx}$$. Its boost gives $$T^{00}=\gamma^2(T_0^{00}+\beta^2T_0^{xx})$$, confirming the result.

(vi) Required stress in each strut. One plate has charge magnitude $$Q=\varepsilon_0E_0A$$. The other plate alone produces field $$E_0/2$$ at its location. Their attractive force is

$$F_{\mathrm{attr}}=\frac{QE_0}2=\frac12\varepsilon_0E_0^2A=u_0A.$$

Two identical struts share this force, so each must exert force $$F_{\mathrm{attr}}/2$$ outward on the plates. The struts are in compression:

$$\boxed{t_{0xx}=-\frac{\varepsilon_0E_0^2A}{4A_b}=-\frac{u_0A}{2A_b}}$$

(vii) Energy-equivalent mass of one moving strut. Each strut occupies rest volume $$A_bd$$ and has rest energy $$m_{0b}c^2=\rho_0c^2A_bd$$. From part (v), its energy in $$S$$ is

$$E_b=\rho c^2\frac{A_bd}\gamma=\gamma(m_{0b}c^2-\beta^2t_{0xx}A_bd).$$

Substituting the compressive stress,

$$\boxed{m_b=\gamma\left(m_{0b}+\frac{\beta^2\varepsilon_0E_0^2Ad}{4c^2}\right)}$$

The cross-sectional area $$A_b$$ cancels: thinner struts require a larger stress but contain proportionally less material.

(viii) Total energy of the complete capacitor. Since $$U_0=\varepsilon_0E_0^2Ad/2$$, the two struts together have energy

$$2E_b=2\gamma m_{0b}c^2+\gamma\beta^2U_0.$$

Adding the electric field, plates and struts,

$$\begin{aligned}E_{\mathrm{total}}&=\frac{U_0}\gamma+2\gamma m_pc^2+2\gamma m_{0b}c^2+\gamma\beta^2U_0\\&=\gamma(U_0+2m_pc^2+2m_{0b}c^2),\end{aligned}$$

because $$1/\gamma+\gamma\beta^2=\gamma$$. Therefore

$$\boxed{E_{\mathrm{total}}=\gamma E_{\mathrm{rest}},\qquad E_{\mathrm{rest}}=U_0+2(m_p+m_{0b})c^2}$$

The additional energy is precisely the contribution from the stressed supports. Including the entire closed system restores the expected Lorentz transformation.`,
  },
  {
    id: "arena-the-infinite-v", title: "The Infinite V", topic: "Electromagnetism", tags: ["Charged sheets", "Electrostatics", "Stability"], summary: "Examine fields inside two charged half-planes, the infinite-limit divergence and regularized small oscillations.", statementFile: "03_The_Infinite_V_Problem.pdf",
    statement: String.raw`Two semi-infinite planes join along a line and carry a uniform surface charge density $$\sigma$$. The angle $$\alpha$$ is marked in the figure. Both planes extend from $$-\infty$$ to $$+\infty$$ in the direction perpendicular to the page.

![Two charged half-planes forming a V, with exterior angle α, general point P in polar coordinates and symmetric point S.](/corpus/arena/figures/the-infinite-v-statement.png)

Figure 3.

## (a)

Determine the radial component $$E_r$$ and tangential component $$E_\theta$$ of the electric field at $$P$$. The coordinate origin is the line where the two planes intersect, and $$\theta=0$$ is measured along one of the planes.

## (b)

Calculate $$E_r$$ and $$E_\theta$$ at a point $$S$$ that is symmetrically positioned at equal distances from the two planes. In this part and the next, take $$\alpha=60^\circ$$.

## (c)

A particle of charge $$Q$$ and mass $$m$$ is attached to a string running from the origin to $$S$$. The particle is then displaced through a small angle. Will it oscillate? If so, determine its oscillation frequency.`,
    solution: String.raw`![Original V-shaped charged-sheet geometry, including the exterior angle α and the symmetric point S.](/corpus/arena/figures/the-infinite-v-solution.png)

Important qualification. The geometry in the question produces a logarithmically divergent electric field. The handwritten calculation also leaves the last part unfinished. We retain the original geometry below, show why the divergence occurs, and give a physically meaningful result if the sheets are truncated at distance $$L$$ from the vertex.

## (a) Field components at a general point

Set the interior opening angle to $$\beta=\pi-\alpha$$, as read from the original figure, with $$0<\theta<\beta$$. Choose the two ray directions in the diagram as

$$\hat{\boldsymbol u}_0=(1,0),\qquad\hat{\boldsymbol u}_\beta=(\cos\beta,\sin\beta).$$

The planes run infinitely in the third direction. To expose the boundary issue, temporarily restrict each plane to $$0\leq s\leq L$$ along its ray. Integrating Coulomb’s law over the infinite out-of-page coordinate $$y$$ gives

$$\int_{-\infty}^{\infty}\frac{dy}{(D+y^2)^{3/2}}=\frac2D.$$

Consequently, at $$\boldsymbol r=r\hat{\boldsymbol e}_r$$,

$$\boldsymbol E_L=\frac{\sigma}{2\pi\varepsilon_0}\sum_{\phi\in\{0,\beta\}}\int_0^L\frac{r\hat{\boldsymbol e}_r-s\hat{\boldsymbol u}_\phi}{r^2+s^2-2rs\cos(\theta-\phi)}\,ds.$$

Define $$D_\phi(s)=r^2+s^2-2rs\cos(\theta-\phi)$$. Projection onto polar unit vectors gives the exact finite-$$L$$ fields

$$\boxed{\begin{aligned}E_r(L)&=\frac{\sigma}{2\pi\varepsilon_0}\sum_{\phi\in\{0,\beta\}}\int_0^L\frac{r-s\cos(\theta-\phi)}{D_\phi(s)}\,ds,\\E_\theta(L)&=\frac{\sigma}{2\pi\varepsilon_0}\sum_{\phi\in\{0,\beta\}}\int_0^L\frac{s\sin(\theta-\phi)}{D_\phi(s)}\,ds.\end{aligned}}$$

These can be evaluated in elementary functions. For $$\delta=\theta-\phi\neq0$$, define

$$H_L(\delta)=\frac12\ln\left(\frac{L^2+r^2-2Lr\cos\delta}{r^2}\right),$$

$$G_L(\delta)=\arctan\left(\frac{L-r\cos\delta}{r\sin\delta}\right)-\arctan\left(\frac{-r\cos\delta}{r\sin\delta}\right).$$

Here the arctangents take their principal values. A direct integration yields

$$\begin{aligned}E_r(L)&=\frac{\sigma}{2\pi\varepsilon_0}\sum_{\phi\in\{0,\beta\}}[-H_L(\delta)\cos\delta+G_L(\delta)\sin\delta],\\E_\theta(L)&=\frac{\sigma}{2\pi\varepsilon_0}\sum_{\phi\in\{0,\beta\}}[H_L(\delta)\sin\delta+G_L(\delta)\cos\delta].\end{aligned}$$

## Why the infinite limit fails

At large $$s$$, the field integrand from either plane behaves as

$$\frac{r\hat{\boldsymbol e}_r-s\hat{\boldsymbol u}_\phi}{D_\phi(s)}=-\frac{\hat{\boldsymbol u}_\phi}s+O(s^{-2}).$$

Since $$\int^L ds/s=\ln L+\mathrm{constant}$$, both planes produce a divergent far-field contribution. The two ray vectors do not cancel. If $$\gamma=\beta/2$$, then

$$\hat{\boldsymbol u}_0+\hat{\boldsymbol u}_\beta=2\cos\gamma\,\hat{\boldsymbol e}_\gamma,$$

so

$$\boxed{\boldsymbol E_L=-\frac{\sigma}{\pi\varepsilon_0}\cos\gamma\ln(L/r)\,\hat{\boldsymbol e}_\gamma+O(1).}$$

The divergence is a genuine consequence of integrating an infinite half-plane, not an arbitrary choice of electrostatic potential. In particular, there is no finite general answer to part (a) without a distant-boundary condition.

## (b) The symmetric point S for α = 60°

Here $$\beta=120^\circ$$ and $$\gamma=60^\circ$$. Symmetry forces $$E_\theta(S;L)=0$$ for any common cutoff $$L$$. Put $$r=OS$$. For compactness define

$$D=L^2+r^2-Lr,\qquad A=\arctan\left(\frac{L-r/2}{\sqrt3\,r/2}\right)+\frac\pi6.$$

Using the exact expressions from part (a),

$$\boxed{\begin{aligned}E_\theta(S;L)&=0,\\E_r(S;L)&=\frac{\sigma}{\pi\varepsilon_0}\left[-\frac14\ln\left(\frac D{r^2}\right)+\frac{\sqrt3}2A\right].\end{aligned}}$$

For $$L\gg r$$, this simplifies to

$$E_r(S;L)=\frac{\sigma}{2\pi\varepsilon_0}\left[-\ln(L/r)+\frac{2\pi}{\sqrt3}\right]+O(r/L).$$

Thus $$E_r(S;L)$$ diverges as $$L\to\infty$$, even though the tangential component vanishes exactly by reflection symmetry.

## (c) Small angular displacements

Let the string have length $$r=OS$$. Write $$\theta=\gamma+\eta$$ with $$|\eta|\ll1$$ and $$\gamma=\pi/3$$. The tension has no tangential component, so

$$mr\ddot\eta=QE_\theta(\gamma+\eta;L)=Q\left.\frac{\partial E_\theta}{\partial\theta}\right|_\gamma\eta+O(\eta^2).$$

The symmetry point is an angular equilibrium because $$E_\theta(\gamma;L)=0$$. To test its stability, differentiate the elementary functions in (a):

$$H'_L(\delta)=\frac{Lr\sin\delta}{D_\delta(L)},\qquad G'_L(\delta)=\frac{L(r\cos\delta-L)}{D_\delta(L)}.$$

For the symmetric position with $$\alpha=60^\circ$$, define $$D$$ and $$A$$ as in (b). The exact angular derivative is

$$K_L\equiv\left.\frac{\partial E_\theta}{\partial\theta}\right|_\gamma=\frac{\sigma}{\pi\varepsilon_0}\left[\frac14\ln\left(\frac D{r^2}\right)-\frac{\sqrt3}2A+\frac{L(r-L/2)}D\right].$$

If $$QK_L<0$$ and the string stays taut, the motion is harmonic:

$$\boxed{\omega^2=-\frac{QK_L}{mr},\qquad f=\frac\omega{2\pi}.}$$

For $$L\gg r$$, this becomes

$$\omega^2=-\frac{Q\sigma}{2\pi\varepsilon_0mr}\left[\ln\left(\frac Lr\right)-1-\frac{2\pi}{\sqrt3}\right]+O\left(\frac rL\right).$$

For sufficiently large $$L/r$$, stable oscillations require $$Q\sigma<0$$. The radial electric force then points away from the vertex, so inward tension can balance it. The opposite sign yields angular instability and, in this large-$$L$$ regime, cannot be held at rest by a taut string alone.

For the strictly infinite planes, there is no finite, cutoff-independent oscillation frequency. The field diverges logarithmically, and the stable regularized frequency grows as $$\sqrt{\ln(L/r)}$$.`,
  },
];
