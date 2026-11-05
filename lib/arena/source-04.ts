import type { ArenaSeed } from "../arena-schema";

export const source04: ArenaSeed[] = [
  {
    id: "arena-the-quantum-escape-room", title: "Quantum Escape", topic: "Modern physics", tags: ["Quantum tunnelling", "Potential barriers", "Boundary conditions"], summary: "Calculate oblique-incidence tunnelling through a wall and escape from a square quantum box.", statementFile: "02_The_Quantum_Escape_Room_Problem.pdf",
    statement: String.raw`A particle of mass $$m$$ approaches a wall of thickness $$d$$. Its velocity makes an angle $$\theta$$ with the normal to the wall. The particle has total energy $$E$$. The potential is zero everywhere except inside the wall, where it is $$V_0>E$$ for $$0\leq x\leq d$$.

The incident and reflected wavefunctions are

$$\psi_d=Ae^{i[(k_0\cos\theta)x+(k_0\sin\theta)y]},\qquad\psi_p=A_pe^{i[-(k_0\cos\theta)x+(k_0\sin\theta)y]}.$$

The two-dimensional time-independent Schrödinger equation is

$$-\frac{\hbar^2}{2m}\left(\frac{\partial^2\psi}{\partial x^2}+\frac{\partial^2\psi}{\partial y^2}\right)+V(x)\psi=E\psi.$$

![A particle incident at angle θ to the normal of a barrier of thickness d and height V₀, between x = 0 and x = d.](/corpus/arena/figures/the-quantum-escape-room-statement.png)

## (a)

Express $$k_0$$ in terms of $$E$$.

## (b)

Inside the wall, the wavefunction can be written as

$$\psi_2=B_1e^{i(k_{2x}x+k_{2y}y)}+B_2e^{i(-k_{2x}x+k_{2y}y)}.$$

Find $$k_{2y}$$ in terms of $$k_0$$ and $$\theta$$ by requiring the boundary conditions to hold for every $$y$$.

## (c)

Write $$k_{2x}=i\kappa$$. Determine $$\kappa$$.

## (d)

The transmitted wavefunction is

$$\psi_t=Ce^{i(k_{3x}x+k_{3y}y)}.$$

Find $$k_{3x}$$ and $$k_{3y}$$ in terms of $$k_0$$ and $$\theta$$.

## (e)

Find the probability that the particle passes through the wall.

## (f)

The same wall now encloses a square box of internal side length $$a\gg d$$. The particle strikes the walls at $$\theta=45^\circ$$. Find the decay constant $$\lambda$$, defined as the probability per unit time that the particle escapes from the box.`,
    solution: String.raw`The wall depends only on $$x$$, so the momentum parallel to it is conserved. The tunnelling calculation then reduces to a one-dimensional problem for the motion normal to the wall.

## (a)

Outside the wall, $$V=0$$. Substitution of a plane wave into the Schrödinger equation gives

$$E=\frac{\hbar^2k_0^2}{2m},\qquad\boxed{k_0=\frac{\sqrt{2mE}}\hbar.}$$

## (b)

The wavefunctions on both sides of a boundary must have the same $$y$$ dependence for every $$y$$. Therefore

$$\boxed{k_{2y}=k_0\sin\theta.}$$

## (c)

Inside the wall,

$$\frac{\hbar^2}{2m}(k_{2x}^2+k_{2y}^2)+V_0=E.$$

With $$k_{2x}=i\kappa$$ and the result from part (b),

$$\boxed{\kappa=\frac{\sqrt{2m(V_0-E\cos^2\theta)}}\hbar.}$$

The energy available for crossing the wall is the normal component $$E_x=E\cos^2\theta$$. The tangential kinetic energy is unchanged.

## (d)

Beyond the wall the potential is again zero, and the transmitted wave travels toward positive $$x$$. Thus

$$\boxed{k_{3x}=k_0\cos\theta,\qquad k_{3y}=k_0\sin\theta.}$$

## (e)

Put $$q=k_0\cos\theta>0$$ and $$\eta=q/\kappa$$. Remove the common factor $$e^{ik_0y\sin\theta}$$. The $$x$$-dependent wavefunctions are

$$\phi_1=Ae^{iqx}+A_pe^{-iqx},\quad\phi_2=B_1e^{-\kappa x}+B_2e^{\kappa x},\quad\phi_3=Ce^{iqx}.$$

Continuity of $$\phi$$ and $$\phi'$$ at $$x=0$$ and $$x=d$$ gives

$$\begin{aligned}A+A_p&=B_1+B_2,\\iq(A-A_p)&=\kappa(B_2-B_1),\\B_1e^{-\kappa d}+B_2e^{\kappa d}&=Ce^{iqd},\\-\kappa B_1e^{-\kappa d}+\kappa B_2e^{\kappa d}&=iqCe^{iqd}.\end{aligned}$$

Eliminating $$A_p$$, $$B_1$$ and $$B_2$$ yields

$$\frac CA=\frac{e^{-iqd}}{\cosh(\kappa d)+\frac i2\left(\frac1\eta-\eta\right)\sinh(\kappa d)}.$$

The incident and transmitted normal currents have the same velocity factor $$\hbar q/m$$. Their ratio is

$$P=\left|\frac CA\right|^2=\left[\cosh^2(\kappa d)+\frac14\left(\frac1\eta-\eta\right)^2\sinh^2(\kappa d)\right]^{-1}.$$

Equivalently, with $$E_x=E\cos^2\theta$$,

$$\boxed{P=\left[1+\frac{V_0^2}{4E_x(V_0-E_x)}\sinh^2(\kappa d)\right]^{-1}.}$$

## (f)

The particle speed is

$$v_0=\frac{\hbar k_0}{m}=\sqrt{\frac{2E}{m}}.$$

A representative $$45^\circ$$ path returns to the same point after travelling a distance $$2\sqrt2\,a$$. Its period is

$$T_{\mathrm{path}}=\frac{2a}{v_0\cos45^\circ}=\frac{2\sqrt2\,a}{v_0}=\frac{2\sqrt2\,ma}{\hbar k_0}.$$

There are four wall collisions per circuit, giving the collision rate

$$\nu_{\mathrm{coll}}=\frac4{T_{\mathrm{path}}}=\frac{\sqrt2\,\hbar k_0}{ma}.$$

![A representative 45-degree closed path in a square box, with four wall collisions per circuit and path length 2√2 a.](/corpus/arena/figures/the-quantum-escape-room-solution.png)

At each collision,

$$\kappa_{45}=\frac{\sqrt{2m(V_0-E/2)}}\hbar,\qquad\eta_{45}=\frac{k_0}{\sqrt2\,\kappa_{45}}.$$

Using the independent-collision approximation with a small escape probability per collision,

$$\lambda\simeq\nu_{\mathrm{coll}}P_{45}=\frac{\sqrt2\,\hbar k_0}{ma}\left[\cosh^2(\kappa_{45}d)+\frac14\left(\frac1{\eta_{45}}-\eta_{45}\right)^2\sinh^2(\kappa_{45}d)\right]^{-1}.$$

In terms of the energy, this is

$$\boxed{\lambda\simeq\frac2a\sqrt{\frac Em}\left[1+\frac{V_0^2}{E(2V_0-E)}\sinh^2(\kappa_{45}d)\right]^{-1}.}$$

The factor of four counts collisions with all four walls. The time spent traversing the thin wall is neglected.`,
  },
  {
    id: "arena-the-three-way-wave-split", title: "The Three-String Junction", topic: "Waves", tags: ["String waves", "Impedance matching", "Energy transmission"], summary: "Find the transmitted waves at a three-string junction and tune the densities for zero reflection.", statementFile: "02_The_Three_Way_Wave_Split_Problem.pdf",
    statement: String.raw`Three strings, with linear mass densities $$\mu_1$$, $$\mu_2$$, and $$\mu_3$$, meet at a single junction as shown. The tensions in strings 2 and 3 are $$T_2=4T_0$$ and $$T_3=3T_0$$. A transverse wave travels along string 1 toward the junction, with displacement perpendicular to the plane of the three strings:

$$\Psi_i=A\sin(\omega t-k_1r_1).$$

![String 1 carries the incident wave into a junction. Strings 2 and 3 leave at a right angle to each other with tensions 4T₀ and 3T₀.](/corpus/arena/figures/the-three-way-wave-split-statement.png)

Figure 1: Three strings joined at an equilibrium junction.

## (a)

Determine the transmitted waves in strings 2 and 3.

## (b)

Given that $$\mu_1=\mu$$, find the linear mass densities of strings 2 and 3 such that all incident wave energy is transmitted into those two strings, and the ratio of energy carried by string 2 to that carried by string 3 is $$2:3$$.`,
    solution: String.raw`## Tensions and wave numbers

At equilibrium, the geometry of the junction gives a right angle between strings 2 and 3. Their tension vectors therefore combine to give

$$T_1=\sqrt{(4T_0)^2+(3T_0)^2}=5T_0.$$

For each string,

$$v_j=\sqrt{\frac{T_j}{\mu_j}},\qquad k_j=\frac\omega{v_j}=\omega\sqrt{\frac{\mu_j}{T_j}}.$$

## (a) Transmitted waves

Take $$r_1$$ to increase toward the junction, and $$r_2,r_3$$ away from it. Set the junction at $$r_j=0$$. The incident, reflected and transmitted waves can be written as

$$\begin{aligned}\Psi_1&=A\sin(\omega t-k_1r_1)+A_r\sin(\omega t+k_1r_1),\\\Psi_2&=A_2\sin(\omega t-k_2r_2),\\\Psi_3&=A_3\sin(\omega t-k_3r_3).\end{aligned}$$

The junction moves with a single transverse displacement, so

$$A+A_r=A_2=A_3\equiv A_t.$$

Its net transverse force must vanish. The slopes of the three strings give

$$-T_1\frac{\partial\Psi_1}{\partial r_1}+T_2\frac{\partial\Psi_2}{\partial r_2}+T_3\frac{\partial\Psi_3}{\partial r_3}=0\quad\text{at the junction},$$

which reduces to

$$5k_1(A-A_r)=(4k_2+3k_3)A_t.$$

Using $$A_r=A_t-A$$ gives

$$A_t=\frac{10k_1}{5k_1+4k_2+3k_3}A.$$

Thus the transmitted waves are

$$\boxed{\Psi_2=\frac{10k_1A}{5k_1+4k_2+3k_3}\sin(\omega t-k_2r_2)}$$

$$\boxed{\Psi_3=\frac{10k_1A}{5k_1+4k_2+3k_3}\sin(\omega t-k_3r_3)}$$

The reflected amplitude, useful for part (b), is

$$A_r=A\frac{5k_1-4k_2-3k_3}{5k_1+4k_2+3k_3}.$$

## (b) Complete transmission with energy ratio 2 : 3

No energy can return along string 1, so $$A_r=0$$. Therefore

$$5k_1=4k_2+3k_3.\tag{1}$$

For a transverse sinusoidal wave on a string, the time-averaged power is

$$\overline P=\frac12T\omega kA_t^2.$$

The two outgoing waves have the same amplitude and angular frequency, so their power ratio is

$$\frac{P_2}{P_3}=\frac{4k_2}{3k_3}=\frac23.$$

Consequently $$k_3=2k_2$$. Substituting into Eq. (1) gives

$$5k_1=10k_2,\qquad k_2=\frac{k_1}2,\qquad k_3=k_1.$$

Finally, since $$k_j^2/\omega^2=\mu_j/T_j$$ and $$\mu_1=\mu$$,

$$\frac{\mu_2}{4T_0}=\frac14\frac\mu{5T_0},\qquad\frac{\mu_3}{3T_0}=\frac\mu{5T_0}.$$

$$\boxed{\mu_2=\frac\mu5,\qquad\mu_3=\frac{3\mu}5}$$

Check. The outgoing power shares are $$2/5$$ and $$3/5$$ of the incident power. They add to the full incident power, as required when reflection vanishes.`,
  },
  {
    id: "arena-titans-double-take", title: "Rainbows on Titan", topic: "Optics", tags: ["Rainbows", "Refraction", "Stationary deviation"], summary: "Infer Titan’s droplet refractive index and locate its secondary rainbow relative to the primary.", statementFile: "02_Titans_Double_Take_Problem.pdf",
    statement: String.raw`Scientists predict that rainbows may occur on Titan, one of Saturn’s moons, but with a different angular size from those on Earth. A rainbow on Earth forms part of a cone with a half-angle of about $$42^\circ$$. On Titan, this angle is $$49^\circ$$, as shown below.

![Sunlight, observer and rainbow cone with a half-angle of 49 degrees measured from the antisolar direction.](/corpus/arena/figures/titans-double-take-statement.png)

## (a)

Estimate the refractive index of the liquid that produces the rainbow on Titan.

## (b)

In theory, a secondary rainbow can also form. Determine its position, and draw a diagram showing its position relative to the primary rainbow.`,
    solution: String.raw`## (a)

Let $$\theta$$ and $$\phi$$ be the incidence and refraction angles measured from the local normal. Let $$n$$ be the liquid’s refractive index relative to the surrounding atmosphere, whose index is taken as 1. Snell’s law gives

$$\sin\theta=n\sin\phi.$$

![A primary rainbow ray entering a spherical droplet, refracting, reflecting once internally and leaving toward the observer.](/corpus/arena/figures/titans-double-take-solution-primary.png)

Entry and exit each turn the ray by $$\theta-\phi$$. One internal reflection adds $$\pi-2\phi$$, so the primary ray has total deviation

$$D_1=\pi+2\theta-4\phi.$$

A rainbow is bright where nearby incident rays emerge in nearly the same direction. At this stationary deviation,

$$\frac{dD_1}{d\theta}=0,\qquad\frac{d\phi}{d\theta}=\frac{\cos\theta}{n\cos\phi},\qquad n\cos\phi=2\cos\theta.$$

Together with Snell’s law, this gives

$$\tan\theta=2\tan\phi,\qquad\cos^2\theta=\frac{n^2-1}{3}.$$

The bow’s angular radius is measured from the antisolar direction:

$$\alpha_1=\pi-D_1=4\phi-2\theta=49^\circ.$$

Solving $$2\phi-\theta=24.5^\circ$$ and $$\tan\theta=2\tan\phi$$ gives

$$\theta_1=62.0148^\circ,\qquad\phi_1=43.2574^\circ.$$

Hence

$$\boxed{n=\frac{\sin\theta_1}{\sin\phi_1}=1.28863\simeq1.29.}$$

## (b)

A secondary-ray path has two internal reflections, giving

$$D_2=2\pi+2\theta-6\phi.$$

The stationary condition becomes

$$2-6\frac{\cos\theta}{n\cos\phi}=0\quad\Longrightarrow\quad\cos^2\theta_2=\frac{n^2-1}{8}.$$

With the value of $$n$$ from part (a),

$$\theta_2=73.3005^\circ,\qquad\phi_2=48.0124^\circ,\qquad D_2=218.5268^\circ.$$

This branch has $$D_2>180^\circ$$, so its angular radius about the antisolar point is

$$\boxed{\alpha_2=D_2-180^\circ=38.5268^\circ\simeq38.53^\circ.}$$

The secondary bow lies inside the $$49^\circ$$ primary bow. The two bows are separated by about $$10.47^\circ$$ and have the same centre.

![A secondary ray with two internal reflections and the two concentric bows: primary at 49.00 degrees and secondary at 38.53 degrees around the antisolar point.](/corpus/arena/figures/titans-double-take-solution-secondary.png)

For normal dispersion, the primary has red on its outer edge and violet on its inner edge. The secondary has the opposite colour order.`,
  },
];
