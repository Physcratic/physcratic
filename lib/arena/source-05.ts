import type { ArenaSeed } from "../arena-schema";

export const source05: ArenaSeed[] = [
  {
    id: "arena-a-grin-and-a-wiggle", title: "Rays in a graded-index cylinder", topic: "Optics", tags: ["Graded-index optics", "Aberration", "Ray trajectories"], summary: "Follow rays through a graded-index cylinder and calculate paraxial imaging and third-order aberrations.", statementFile: "03_A_GRIN_and_a_Wiggle_Problem.pdf",
    statement: String.raw`A cylinder is made of a material whose refractive index varies as

$$n(r)=n_0\sqrt{1-k^2r^2},$$

where $$r$$ is the radial distance from the cylinder’s axis and $$z$$ is the coordinate along the axis. A point light source is located at $$z=0$$, a distance $$r_0$$ from the symmetry axis. Consider a ray emitted at an angle $$\theta_0$$ to the cylinder’s axis. A stop is placed some distance away so that only rays with small values of $$\theta_0$$ are transmitted. Consider only rays in the plane of the diagram.

![Left: off-axis source and sinusoidal rays in a GRIN cylinder. Right: parallel incident rays through a cylinder of length t with effective focal length f and back focal length b.](/corpus/arena/figures/a-grin-and-a-wiggle-statement.png)

## (a)

Find the ray trajectory $$r(z)$$ to first order in $$\theta_0$$ and $$r_0$$.

## (b)

The rays emitted by the point source first converge at another point. Determine the location of this point, and describe the image formed.

## (c)

When terms up to third order in $$\theta_0$$ and $$r_0$$ are included, rays from the source no longer converge at a single point. This is aberration. A screen is placed at the location found in part (b). Determine the radius of the image on the screen, including the third-order terms.

## (d)

For the remaining parts, refer to the right-hand diagram. The cylinder has length $$t$$, so rays arriving from the left parallel to its axis leave the right face before converging. Determine the effective focal length $$f$$. It is defined as the horizontal distance from the focus to the intersection of the extended incident ray and the extended outgoing ray that travels toward the focus. Also determine the distance from the right face of the cylinder to the focus, called the back focal length $$b$$.

## (e)

In the arrangement of part (d), including terms up to third order in $$r_0$$ produces aberration. Determine the radius of the image when a screen is placed at the focus.`,
    solution: String.raw`## (a)

Use $$r$$ as a signed transverse coordinate in the plane of the diagram. The small quantities are $$kr_0$$ and $$\theta_0$$, with angles in radians. Since the index depends only on $$r$$, the axial optical momentum is constant:

$$\beta=n(r)\cos\theta=\frac{n(r)}{\sqrt{1+r'^2}},\qquad r'=\frac{dr}{dz}.$$

Define

$$q=\frac\beta{n_0}=\sqrt{1-k^2r_0^2}\cos\theta_0.$$

The invariant gives

$$r'^2=\frac{1-k^2r^2}{q^2}-1,\qquad r''+\frac{k^2}{q^2}r=0.$$

Using $$r(0)=r_0$$ and $$r'(0)=\tan\theta_0$$, the exact trajectory is

$$r(z)=r_0\cos\left(\frac{kz}q\right)+\frac{q\tan\theta_0}{k}\sin\left(\frac{kz}q\right).\tag{1}$$

To first order, $$q\simeq1$$ and $$\tan\theta_0\simeq\theta_0$$, giving

$$\boxed{r(z)=r_0\cos(kz)+\frac{\theta_0}{k}\sin(kz).}$$

The larger refractive index near the axis bends rays back toward it, producing this sinusoidal motion.

## (b)

All rays from the same source meet when the coefficient of $$\theta_0$$ vanishes. The first positive position is $$kz=\pi$$, so

$$\boxed{z_i=\frac\pi k,\qquad r_i=-r_0.}$$

The rays actually converge there. The image is real, inverted and the same size as the object, with transverse magnification $$-1$$.

![The off-axis source and its real inverted image inside the GRIN medium.](/corpus/arena/figures/a-grin-and-a-wiggle-solution-image.png)

## (c)

Different launch angles give slightly different values of $$q$$, so the rays reach the screen with different phases. Let

$$A=\theta_0^2+k^2r_0^2.$$

Writing $$\epsilon$$ for the order of the small quantities $$\theta_0$$ and $$kr_0$$,

$$q=1-\frac A2+O(\epsilon^4),\qquad\frac\pi q=\pi+\frac{\pi A}2+O(\epsilon^4).$$

At $$z=\pi/k$$,

$$\cos\left(\frac\pi q\right)=-1+O(\epsilon^4),\qquad\sin\left(\frac\pi q\right)=-\frac{\pi A}2+O(\epsilon^4).$$

Substitution into Eq. (1), keeping total degree three, gives

$$r\left(\frac\pi k\right)=-r_0-\frac{\pi\theta_0}{2k}(\theta_0^2+k^2r_0^2)+O\left(\frac{\epsilon^5}{k}\right).$$

The signed displacement from the ideal image is

$$\delta r=-\frac{\pi\theta_0}{2k}(\theta_0^2+k^2r_0^2).$$

For a symmetric accepted range $$|\theta_0|\leq\theta_{\max}$$, the image radius is

$$\boxed{\rho_c=\frac{\pi\theta_{\max}}{2k}(\theta_{\max}^2+k^2r_0^2).}$$

In the plane of the diagram, this is the half-width of the illuminated interval. For an individual marginal ray, use $$\theta_{\max}=|\theta_0|$$. The stop’s acceptance angle is not specified, so the radius remains symbolic. The prefactor $$\pi/(2k)$$ corrects the missing factors in the handwritten result.

## (d)

Take the outside refractive index as 1, as in the handwritten solution. A parallel incident ray enters the flat face normally, so $$\theta_0=0$$. To first order, its exit height and internal slope are

$$r_e=r_0\cos(kt),\qquad r'_e=-kr_0\sin(kt).$$

At the exit, Snell’s law gives $$\tan\theta_{\mathrm{out}}\simeq-n_0kr_0\sin(kt)$$. The outgoing ray reaches the axis a distance $$b$$ beyond the exit face:

$$b=-\frac{r_e}{\tan\theta_{\mathrm{out}}}=\frac{\cot(kt)}{n_0k}.$$

The incident ray is horizontal at height $$r_0$$, so the stated definition of $$f$$ gives

$$\boxed{f=-\frac{r_0}{\tan\theta_{\mathrm{out}}}=\frac1{n_0k\sin(kt)},\qquad b=f\cos(kt).}$$

These expressions apply to the short-cylinder branch shown, $$0<kt<\pi/2$$.

![Parallel rays in the short GRIN cylinder with focal point F, length t, effective focal length f and back focal length b.](/corpus/arena/figures/a-grin-and-a-wiggle-solution-focus.png)

## (e)

The supplied handwritten solution ends at part (d). The calculation below completes part (e).

Set $$x=kr_0$$ and $$u=kt$$. For parallel input, $$q=\sqrt{1-x^2}$$ and

$$r_e=r_0\cos\left(\frac uq\right).$$

Combining Snell’s law with the invariant $$\beta$$ gives

$$\sin\theta_{\mathrm{out}}=n(r_e)\sin\theta_e=\beta r'_e=-n_0x\sin\left(\frac uq\right).$$

The exact outgoing slope is therefore

$$\tan\theta_{\mathrm{out}}=-\frac{n_0x\sin(u/q)}{\sqrt{1-n_0^2x^2\sin^2(u/q)}}.$$

The screen is a distance $$b=\cot u/(n_0k)$$ beyond the exit. Its ray-intercept coordinate $$r_s=r_e+b\tan\theta_{\mathrm{out}}$$ satisfies

$$kr_s=x\cos\left(\frac uq\right)-\frac{x\cot u\sin(u/q)}{\sqrt{1-n_0^2x^2\sin^2(u/q)}}.$$

Using $$u/q=u+ux^2/2+O(x^4)$$ and expanding through $$x^3$$,

$$\begin{aligned}kr_s&=x\left(\cos u-\frac{ux^2}2\sin u\right)\\&\quad-x\cot u\left(\sin u+\frac{ux^2}2\cos u+\frac{n_0^2x^2}2\sin^3u\right)+O(x^5)\\&=-\frac{x^3}2\left(\frac u{\sin u}+n_0^2\cos u\sin^2u\right)+O(x^5).\end{aligned}$$

The linear terms cancel at the paraxial focus. The remaining cubic displacement is

$$r_s=-\frac{k^2r_0^3}2\left(\frac{kt}{\sin(kt)}+n_0^2\cos(kt)\sin^2(kt)\right).$$

For a filled symmetric aperture of radius $$a$$, the marginal ray has $$|r_0|=a$$. For $$0<kt<\pi/2$$, the image radius is

$$\boxed{\rho_e=\frac{k^2a^3}2\left(\frac{kt}{\sin(kt)}+n_0^2\cos(kt)\sin^2(kt)\right).}$$

For a specified marginal ray, replace $$a$$ with $$|r_0|$$. The first term comes from the phase shift accumulated inside the cylinder. The second comes from the cubic correction to the outgoing slope.`,
  },
  {
    id: "arena-an-atom-with-stage-fright", title: "Populations and radiated power of a two-level atom", topic: "Modern physics", tags: ["Two-level systems", "Dipole radiation", "Spontaneous emission"], summary: "Derive the semiclassical populations and radiated-power pulse of a nondegenerate two-level atom.", statementFile: "03_An_Atom_with_Stage_Fright_Problem.pdf",
    statement: String.raw`Consider an excited atom undergoing a transition from level 2, with energy $$E_2$$, to level 1, with energy $$E_1$$. Both levels are nondegenerate. Treat the atom as a two-level system and neglect all other energy levels.

The normalized wavefunctions of the two levels are

$$\psi_1(\boldsymbol r,t)=u_1(\boldsymbol r)e^{-iE_1t/\hbar},\qquad\psi_2(\boldsymbol r,t)=u_2(\boldsymbol r)e^{-iE_2t/\hbar}.$$

During the transition, the electron wavefunction is the superposition

$$\psi=a_1(t)\psi_1+a_2(t)\psi_2,$$

where $$a_1$$ and $$a_2$$ are complex functions of time. The quantities $$|a_1|^2$$ and $$|a_2|^2$$ are the probabilities of finding the electron in levels 1 and 2, respectively.

Use the following convention for the atomic electric dipole moment,

$$\boldsymbol\mu=\int e\,|\psi|^2\boldsymbol r\,dV,$$

where $$e$$ is the magnitude of the electron charge.

## (a)

Write the dipole moment as

$$\boldsymbol\mu=\int e\boldsymbol r\,|a_1|^2|u_1|^2\,dV+\int e\boldsymbol r\,|a_2|^2|u_2|^2\,dV+\boldsymbol\mu_{\mathrm{osc}}.$$

Define

$$\boldsymbol\mu_{21}=\int e\boldsymbol r\,u_2^*u_1\,dV.$$

Find $$\boldsymbol\mu_{\mathrm{osc}}$$ in terms of $$\boldsymbol\mu_{21}$$, $$a_1$$, $$a_2$$, and $$\omega_0=(E_2-E_1)/\hbar$$.

## (b)

Classical electrodynamics gives the average radiated power of an oscillating electric dipole $$\boldsymbol\mu=\boldsymbol\mu_0\cos(\omega_0t+\phi_0)$$ as

$$\overline P_r=\frac{n\mu^2\omega_0^4}{12\pi\varepsilon_0c^3},$$

where $$\mu=|\boldsymbol\mu_0|$$ is the dipole amplitude, $$n$$ is the refractive index of the surrounding medium, and $$c$$ is the speed of light. Find $$\overline P_r$$ for the transition from level 2 to level 1. Express the result in terms of $$|a_1|$$, $$|a_2|$$, and the transition dipole moment from part (a).

## (c)

Find the mean energy $$E$$ of the superposition in terms of $$|a_1|$$, $$|a_2|$$, $$E_1$$, and $$E_2$$.

## (d)

As energy is radiated, the mean energy decreases and so does $$|a_2|^2$$. Its time dependence satisfies

$$\frac{d|a_2|^2}{dt}=-\frac1{\tau_{\mathrm{sp}}}f\left(|a_2|^2\right).$$

Find $$\tau_{\mathrm{sp}}$$, the radiative lifetime parameter for spontaneous emission, and the function $$f(|a_2|^2)$$.

## (e)

Solve this differential equation to obtain $$|a_2(t)|^2$$. Sketch $$|a_2(t)|^2$$ for the initial condition $$|a_2(0)|=0.9$$.

## (f)

Within this semiclassical treatment, explain what happens if $$|a_2(0)|=1$$.

## (g)

Find the radiated power $$\overline P_r(t)$$ during the transition from level 2 to level 1. Sketch $$\overline P_r(t)$$ for $$|a_2(0)|=0.9$$.`,
    solution: String.raw`Use the semiclassical dipole-radiation model specified in the question. Write $$x(t)=|a_2(t)|^2$$. Normalization gives $$|a_1|^2=1-x$$. The two levels are orthogonal, and their energy separation is $$E_2-E_1=\hbar\omega_0$$.

## (a)

Expanding the probability density gives

$$|\psi|^2=|a_1|^2|u_1|^2+|a_2|^2|u_2|^2+a_1a_2^*u_1u_2^*e^{i\omega_0t}+a_1^*a_2u_1^*u_2e^{-i\omega_0t}.$$

Only the cross terms oscillate at the transition frequency. Integrating them against $$e\boldsymbol r$$ gives

$$\boxed{\boldsymbol\mu_{\mathrm{osc}}=a_1a_2^*\boldsymbol\mu_{21}e^{i\omega_0t}+a_1^*a_2\boldsymbol\mu_{21}^*e^{-i\omega_0t}=2\operatorname{Re}\left[a_1a_2^*\boldsymbol\mu_{21}e^{i\omega_0t}\right].}$$

For a linearly oscillating dipole, the amplitude is

$$\mu_{\mathrm{amp}}=2|a_1||a_2|\mu_{21},\qquad\mu_{21}^2\equiv\boldsymbol\mu_{21}^*\cdot\boldsymbol\mu_{21}.$$

## (b)

Insert this amplitude into the given dipole-radiation formula,

$$\boxed{\overline P_r=\frac{n\omega_0^4\mu_{21}^2}{3\pi\varepsilon_0c^3}|a_1|^2|a_2|^2.}$$

For a complex vector transition dipole, averaging each Cartesian component gives the same result with the norm defined above. The populations are taken to vary slowly over an optical cycle.

## (c)

Orthogonality removes the cross terms from the energy expectation value,

$$\boxed{E=|a_1|^2E_1+|a_2|^2E_2=E_1+\hbar\omega_0x.}$$

## (d)

Energy conservation requires $$dE/dt=-\overline P_r$$. Therefore

$$\hbar\omega_0\frac{dx}{dt}=-\frac{n\omega_0^4\mu_{21}^2}{3\pi\varepsilon_0c^3}x(1-x).$$

Comparison with the equation in the question gives

$$\boxed{\tau_{\mathrm{sp}}=\frac{3\pi\varepsilon_0\hbar c^3}{n\omega_0^3\mu_{21}^2},\qquad f(x)=x(1-x).}$$

Within this model, an oscillating dipole requires both amplitudes to be present, giving the product $$x(1-x)$$.

## (e)

For $$0<x<1$$, write

$$\frac{dx}{x(1-x)}=-\frac{dt}{\tau_{\mathrm{sp}}}.$$

Set $$w=x-\frac12$$. Then $$x(1-x)=\frac14-w^2$$, so

$$\int\frac{dw}{\frac14-w^2}=2\operatorname{artanh}(2w)=-\frac{t-t_0}{\tau_{\mathrm{sp}}}.$$

Solving for $$x$$ gives

$$\boxed{|a_2(t)|^2=\frac12\left[1-\tanh\left(\frac{t-t_0}{2\tau_{\mathrm{sp}}}\right)\right].}$$

Here $$t_0$$ is the time at which the two populations are equal. For $$x_0=|a_2(0)|^2$$,

$$t_0=2\tau_{\mathrm{sp}}\operatorname{artanh}(2x_0-1)=\tau_{\mathrm{sp}}\ln\frac{x_0}{1-x_0}.$$

The initial value is an amplitude, giving

$$x_0=0.9^2=0.81,\qquad t_0=1.45\tau_{\mathrm{sp}}.$$

The population starts at 0.81, passes through $$1/2$$ at $$t_0$$, and approaches zero.

![Excited-state population versus t/τ_sp, starting at 0.81, crossing 0.5 at 1.45 and decaying toward zero.](/corpus/arena/figures/an-atom-with-stage-fright-solution-population.png)

An equivalent expression is

$$x(t)=\frac{x_0}{x_0+(1-x_0)e^{t/\tau_{\mathrm{sp}}}}.$$

## (f)

If $$|a_2(0)|=1$$, then $$x(0)=1$$ and $$a_1(0)=0$$. The evolution equation gives

$$\frac{dx}{dt}=0,\qquad x(t)=1,\qquad\overline P_r(t)=0.$$

The atom remains in the excited state within this model. A pure energy eigenstate has no oscillating dipole to start the radiation. This is a limitation of the semiclassical treatment of spontaneous emission.

## (g)

Differentiate the population from part (e) and use energy conservation,

$$\overline P_r(t)=-\hbar\omega_0\frac{dx}{dt}.$$

This gives

$$\boxed{\overline P_r(t)=\frac{\hbar\omega_0}{4\tau_{\mathrm{sp}}}\frac1{\cosh^2\left(\frac{t-t_0}{2\tau_{\mathrm{sp}}}\right)}.}$$

The power peaks when the two populations are equal,

$$t_{\max}=t_0=1.45\tau_{\mathrm{sp}},\qquad P_{\max}=\frac{\hbar\omega_0}{4\tau_{\mathrm{sp}}}.$$

At $$t=0$$,

$$\frac{\overline P_r(0)}{P_{\max}}=4x_0(1-x_0)=0.6156.$$

The power initially rises as the ground-state amplitude grows, then falls as the excited population is depleted.

![Radiated power divided by its maximum versus t/τ_sp, starting near 0.616, peaking at 1.45 and falling through half maximum at 3.21.](/corpus/arena/figures/an-atom-with-stage-fright-solution-power.png)

For the full mathematical pulse, the half-maximum points obey

$$\cosh\left(\frac{t-t_0}{2\tau_{\mathrm{sp}}}\right)=\sqrt2.$$

The full width at half maximum is

$$\Delta t_{\mathrm{FWHM}}=4\tau_{\mathrm{sp}}\operatorname{arcosh}\sqrt2\simeq3.53\tau_{\mathrm{sp}}.$$

Using $$\operatorname{arcosh}\sqrt2\simeq0.88$$ gives $$3.52\tau_{\mathrm{sp}}$$. For this initial condition the half-maximum times are $$-0.313\tau_{\mathrm{sp}}$$ and $$3.213\tau_{\mathrm{sp}}$$. The plotted physical evolution starts at $$t=0$$, so only the later crossing is shown.`,
  },
  {
    id: "arena-the-invisible-brake", title: "Molecular viscosity and flow through a pipe", topic: "Mechanics", tags: ["Viscosity", "Kinetic theory", "Poiseuille flow"], summary: "Connect molecular momentum transport to gas viscosity, pipe flow and viscous heating.", statementFile: "03_The_Invisible_Brake_Problem.pdf", solutionFile: "03_The_ Invisible_Brake_Solution.pdf",
    statement: String.raw`## Molecular viscosity and flow through a pipe

Consider a gas at temperature $$T$$ confined between two parallel plates separated by a distance $$D$$. The lower plate is fixed while the upper plate moves at speed $$v$$ in the $$x$$ direction. The mean gas velocity $$\langle v_x\rangle$$ varies linearly from zero at the lower plate to $$v$$ at the upper plate. Relative to this local mean velocity, the molecular velocities follow the Maxwell-Boltzmann distribution.

The coefficient of viscosity $$\eta$$ is defined by

$$f_{xz}=\frac FA=\eta\frac{d\langle v_x\rangle}{dz},\tag{1}$$

where $$f_{xz}$$ is the shear stress, the $$x$$-directed force per unit area acting on a surface whose normal is along $$z$$. The plate area is $$A$$.

![Moving parallel plates separated by D, a molecular free flight of length λ at angle θ to the z-axis, and axial flow through a cylindrical pipe.](/corpus/arena/figures/the-invisible-brake-statement.png)

Figure 1. Moving plates, molecular free flight, and pipe flow. Not to scale.

## 1. Molecular origin of viscosity

Use the following approximation. Consider a reference frame moving with the local mean gas velocity near point 1, as in the middle diagram. A molecule has just collided at point 1 and next collides at point 2, where the mean velocity $$\langle v_x\rangle$$ is higher. Its flight makes an angle $$\theta$$ with the positive $$z$$ direction.

The mean free path between collisions is

$$\lambda=\frac1{\sqrt2\,n\sigma},\qquad\sigma=\pi b^2,$$

where $$n$$ is the molecular number density, $$\sigma$$ is the collision cross section, and $$b$$ is the molecular diameter. Assume that $$\lambda$$ is independent of $$\theta$$ and that $$b\ll\lambda\ll D$$. Also assume that immediately after the collision at point 2, the molecule’s velocity follows the local velocity distribution there.

(a) Find the number of particles crossing a unit horizontal area at point 1 in the positive $$z$$ direction per unit time.

(b) Find the average $$x$$-component of momentum transferred per molecule traveling from point 1 to point 2. The molecular mass is $$m$$.

(c) The viscosity has the form $$\eta=\xi T^\alpha$$. Determine the exponent $$\alpha$$ and express $$\xi$$ in terms of $$n$$, $$m$$, and $$b$$ (and fundamental constants).

## 2. Flow through a cylindrical pipe

Now consider a cylindrical pipe of radius $$R$$, containing the same gas. A pressure difference between its ends produces a constant pressure gradient $$dp/dx$$. Because of viscosity, the mean axial gas velocity $$\langle v_x(r)\rangle$$ depends on the distance $$r$$ from the axis, and it is zero at the wall.

(a) Find $$\langle v_x(r)\rangle$$ in terms of $$\eta$$, $$dp/dx$$, and $$R$$.

(b) Find the volumetric flow rate $$q$$ through the pipe.

(c) In steady state, the gas temperature remains constant. Find the heat transferred from the gas to the pipe wall per unit time per unit length of pipe.`,
    solution: String.raw`## Momentum transport and steady laminar flow

## (a)(i) Upward molecular flux

Let $$\bar v=\langle|\boldsymbol v|\rangle$$ be the mean molecular speed. In an isotropic gas, half of the molecules travel upward, but the crossing rate is weighted by their normal speed $$v\cos\theta$$:

$$\begin{aligned}J_+&=n\bar v\int_0^{2\pi}\int_0^{\pi/2}\frac{\cos\theta\sin\theta}{4\pi}\,d\theta\,d\phi\\&=\frac{n\bar v}4.\end{aligned}$$

For Maxwell-Boltzmann velocities, $$\bar v=\sqrt{8k_BT/(\pi m)}$$.

$$\boxed{J_+=\frac n4\sqrt{\frac{8k_BT}{\pi m}}}$$

## (a)(ii) Momentum transferred in a flight

The vertical displacement from point 1 to point 2 is $$\Delta z=\lambda\cos\theta$$. Because the gas moves faster at point 2, the incident molecule carries less $$x$$ momentum than a molecule freshly equilibrated there. The momentum it transfers to the gas at point 2 is

$$\Delta p_x=m[\langle v_x\rangle(z_1)-\langle v_x\rangle(z_2)]\simeq-m\lambda\cos\theta\frac{d\langle v_x\rangle}{dz}.$$

Molecules crossing a plane are not uniformly distributed in angle. Their flux is proportional to $$\cos\theta\sin\theta$$. Therefore their mean value of $$\cos\theta$$ is

$$\langle\cos\theta\rangle_{\mathrm{cross}}=\frac{\int_0^{\pi/2}\cos^2\theta\sin\theta\,d\theta}{\int_0^{\pi/2}\cos\theta\sin\theta\,d\theta}=\frac23.$$

$$\boxed{\langle\Delta p_x\rangle=-\frac23m\lambda\frac{d\langle v_x\rangle}{dz}}$$

## (a)(iii) The temperature dependence of viscosity

The upward and downward crossing fluxes each have magnitude $$J_+=n\bar v/4$$. Both contribute to transport from the faster layer toward the slower one. The total $$x$$ momentum flux is therefore

$$\Pi_{xz}=2J_+\langle\Delta p_x\rangle=-\frac13nm\lambda\bar v\frac{d\langle v_x\rangle}{dz}.$$

The negative sign indicates momentum transport down the velocity gradient. Viscosity is its positive proportionality coefficient:

$$\eta=\frac13nm\lambda\bar v=\frac13nm\frac1{\sqrt2\,n\pi b^2}\sqrt{\frac{8k_BT}{\pi m}}.$$

The number density cancels in the dilute-gas approximation.

$$\boxed{\alpha=\frac12,\qquad\xi=\frac{2\sqrt{mk_B}}{3\pi^{3/2}b^2}}$$

## (b)(i) Velocity profile

Write $$u(r)=\langle v_x(r)\rangle$$. For fully developed, steady, axisymmetric flow, the pressure force is balanced by viscous shear:

$$\eta\frac1r\frac d{dr}\left(r\frac{du}{dr}\right)=\frac{dp}{dx}.$$

Integrate once. Regularity at $$r=0$$ removes the $$1/r$$ term, so

$$\frac{du}{dr}=\frac r{2\eta}\frac{dp}{dx}.$$

Integrate again and use the no-slip condition $$u(R)=0$$:

$$\boxed{u(r)=-\frac1{4\eta}\frac{dp}{dx}(R^2-r^2)}$$

A pressure decrease along $$x$$ makes $$dp/dx<0$$, so the velocity is positive.

## (b)(ii) Volumetric flow rate

Add the flow through concentric annuli of area $$2\pi r\,dr$$:

$$\begin{aligned}q&=\int_0^R u(r)\,2\pi r\,dr\\&=-\frac\pi{2\eta}\frac{dp}{dx}\int_0^R(R^2-r^2)r\,dr\\&=-\frac{\pi R^4}{8\eta}\frac{dp}{dx}.\end{aligned}$$

$$\boxed{q=-\frac{\pi R^4}{8\eta}\frac{dp}{dx}}$$

## (b)(iii) Heat delivered to the wall

Across a pipe segment of length $$\Delta x$$, the pressure drop is $$-\Delta p\simeq-(dp/dx)\Delta x$$. Pressure work is supplied at rate $$(-\Delta p)q$$. In steady isothermal flow, this work is dissipated by viscosity and passes to the wall as heat.

$$\frac{\dot Q_{\mathrm{wall}}}{\Delta x}=-q\frac{dp}{dx}.$$

Substitute the expression for $$q$$. The result is positive, as expected for heat transferred into the wall.

$$\boxed{\frac{d\dot Q_{\mathrm{wall}}}{dx}=\frac{\pi R^4}{8\eta}\left(\frac{dp}{dx}\right)^2}$$

## Model assumption

The pipe calculation uses steady, fully developed, nearly incompressible Poiseuille flow. Its wall-heating result assumes that pressure-work dissipation is removed as heat at the wall. For a compressible gas, density changes and expansion work must also be included in the energy balance. Constant temperature alone is not sufficient to establish the same wall-heat rate.`,
  },
];
