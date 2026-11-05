import type { ArenaSeed } from "../arena-schema";

export const source02: ArenaSeed[] = [
  {
    id: "arena-the-five-fold-collision", title: "Relativistic collisions and photon states", topic: "Modern physics", tags: ["Special relativity", "Collisions", "Four-momentum"], summary: "Explore relativistic collisions, maximum deflection and two- or three-photon final states.", statementFile: "01_The_Five_Fold_Collision_Problem.pdf",
    statement: String.raw`A particle of rest mass $$4m$$ travels at speed $$0.6c$$ and collides with another particle of rest mass $$m$$, initially at rest. The motion before the collision is along the $$x$$-axis.

![A particle of rest mass 4m moves to the right at 0.6c toward a stationary particle of rest mass m.](/corpus/arena/figures/the-five-fold-collision-statement.png)

## (a)

If the particles stick together after the collision, find the rest mass and speed of the resulting composite particle.

## (b)

If both particles retain their original rest masses and the collision is one-dimensional, find each particle’s velocity after the collision.

## (c)

If the collision is two-dimensional, determine the greatest possible deflection angle of the particle with rest mass $$4m$$.

## (d)

Suppose the particles annihilate into two photons. If the angle between the photons’ directions of propagation is $$\theta$$, determine the possible range of $$\theta$$.

## (e)

Suppose instead that the final state consists of three photons with frequencies $$f_1$$, $$f_2$$ and $$f_3$$. Find the maximum possible value of $$f_1$$.`,
    solution: String.raw`Take the initial motion along $$+x$$. In every part, the total laboratory energy and momentum are

$$\gamma_{0.6c}=\frac54,\quad E=\frac54(4m)c^2+mc^2=6mc^2,\quad p=\frac54(4m)(0.6c)=3mc.$$

## (a)

The composite particle has invariant mass $$M$$ and velocity $$V$$ satisfying

$$M^2c^4=E^2-p^2c^2=27m^2c^4,\qquad V=\frac{pc^2}{E}.$$

Thus

$$\boxed{M=3\sqrt3\,m,\qquad V=\frac c2.}$$

Its rest mass exceeds $$5m$$ because the final particle also contains internal energy.

## (b)

The centre-of-momentum frame moves at $$c/2$$. The incoming velocities in that frame are

$$u^*_{4m}=\frac{\frac35-\frac12}{1-\frac35\frac12}c=\frac c7,\qquad u^*_m=-\frac c2.$$

For the nontrivial one-dimensional elastic collision, both momenta reverse in this frame. Transforming the outgoing velocities back to the laboratory gives

$$v'_{4m}=\frac{-\frac17+\frac12}{1-\frac1{14}}c=\frac5{13}c,\qquad v'_m=\frac{\frac12+\frac12}{1+\frac14}c=\frac45c.$$

Therefore

$$\boxed{v'_{4m}=\frac5{13}c,\qquad v'_m=\frac45c,}$$

both along $$+x$$. These values give $$E_{\mathrm{final}}=6mc^2$$ and $$p_{\mathrm{final}}=3mc$$. Conservation also permits the unchanged velocities $$(0.6c,0)$$, which represent no momentum exchange.

## (c)

Take the final state to contain the same two rest masses, as in part (b), with no other outgoing particles. The collision is then elastic. In the centre-of-momentum frame,

$$p^*=\frac{mc}{\sqrt3},\qquad E^*_{4m}=\frac7{\sqrt3}mc^2.$$

If the heavier particle leaves at angle $$\chi$$ to $$+x$$ in that frame, its laboratory momentum is

$$p'_x=\frac{mc}{3}(7+2\cos\chi),\qquad p'_y=\frac{mc}{\sqrt3}\sin\chi.$$

Since $$p'_x>0$$, its deflection $$\phi$$ obeys

$$\tan\phi=\frac{\sqrt3\sin\chi}{7+2\cos\chi}.$$

The derivative vanishes when $$7\cos\chi+2=0$$. At this angle,

$$\tan\phi_{\max}=\frac1{\sqrt{15}},\qquad\boxed{\phi_{\max}=\arcsin\frac14\simeq14.48^\circ.}$$

## (d)

Let the photon energies be $$e_1,e_2>0$$. Their energy sum is $$6mc^2$$. Momentum conservation gives

$$(3mc^2)^2=e_1^2+e_2^2+2e_1e_2\cos\theta.$$

Subtract this from $$(e_1+e_2)^2=36m^2c^4$$ to obtain

$$\cos\theta=1-\frac{27m^2c^4}{2e_1e_2}.$$

For a fixed sum, $$e_1e_2\leq9m^2c^4$$, so $$\cos\theta\leq-1/2$$. Both limiting angles are possible:

$$\boxed{120^\circ\leq\theta\leq180^\circ.}$$

At $$120^\circ$$, the energies are equal to $$3mc^2$$. At $$180^\circ$$, the forward and backward energies are $$\frac92mc^2$$ and $$\frac32mc^2$$.

![The two limiting photon configurations: equal energies at 120 degrees, and unequal energies in opposite directions.](/corpus/arena/figures/the-five-fold-collision-solution.png)

## (e)

Write $$e_1=hf_1$$, and let $$\psi$$ be the angle between photon 1 and $$+x$$. Photons 2 and 3 together have energy $$E-e_1$$ and momentum $$\boldsymbol p-\boldsymbol p_1$$. Their total energy is at least the magnitude of their total momentum times $$c$$, so

$$0\leq(E-e_1)^2-c^2|\boldsymbol p-\boldsymbol p_1|^2=27m^2c^4-2e_1(6mc^2-3mc^2\cos\psi).$$

Thus

$$e_1\leq\frac{27m^2c^4}{2(6mc^2-3mc^2\cos\psi)}\leq\frac92mc^2,\qquad\boxed{f_{1,\max}=\frac{9mc^2}{2h}.}$$

Equality is kinematically allowed. Photon 1 travels forward with energy $$\frac92mc^2$$, while photons 2 and 3 travel together backward and share $$\frac32mc^2$$. Each can have strictly positive energy, for example $$\frac34mc^2$$ each.`,
  },
  {
    id: "arena-the-phantom-charge", title: "Field of a charged sheet and its equivalent point charge", topic: "Electromagnetism", tags: ["Electrostatics", "Potential", "Continuous charge"], summary: "Find the axial field of a nonuniform charged sheet and the point charge that reproduces it.", statementFile: "01_The_Phantom_Charge_Problem.pdf",
    statement: String.raw`An infinitely thin, infinite sheet lies in the $$xy$$-plane at $$z=0$$. Its surface charge density depends on the radial distance $$r$$ from the origin according to

$$\sigma(r)=\frac{c}{(d^2+r^2)^{3/2}},$$

where $$c$$ and $$d$$ are constants.

![An infinite sheet in the xy-plane, an annulus at radial distance r, and observation point P on the z-axis.](/corpus/arena/figures/the-phantom-charge-statement.png)

## (a)

Determine the total electric charge on the sheet.

## (b)

Find the electric field at a point $$P$$ on the $$z$$-axis.

## (c)

The electric field at $$P$$ is identical to that produced by a point charge placed at a suitable location. Determine the magnitude and position of that point charge.

## (d)

A particle of charge $$q$$ and mass $$m$$ is launched from a very large distance along the $$z$$-axis. Find the minimum initial speed required for it to travel from $$z\to+\infty$$ to $$z\to-\infty$$.

Hint. For $$b\neq a$$,

$$\int\frac{x\,dx}{\sqrt{a^2+x^2}(b^2+x^2)^{3/2}}=\frac1{b^2-a^2}\sqrt{\frac{a^2+x^2}{b^2+x^2}}+C.$$`,
    solution: String.raw`Let $$d>0$$ and set $$V(\infty)=0$$. The sheet is fixed and penetrable. Treat the moving particle classically, neglecting its disturbance of the sheet and radiation. The constants $$c$$ and $$q$$ may have either sign.

## (a)

An annulus of radius $$r$$ and width $$dr$$ carries charge

$$dQ=2\pi r\sigma(r)\,dr.$$

Integrating over the sheet gives

$$Q_{\mathrm{sheet}}=2\pi c\int_0^\infty\frac{r\,dr}{(d^2+r^2)^{3/2}}=2\pi c\left[-\frac1{\sqrt{d^2+r^2}}\right]_0^\infty.$$

Hence

$$\boxed{Q_{\mathrm{sheet}}=\frac{2\pi c}{d}.}$$

The total charge is finite even though the sheet has infinite area.

## (b)

Symmetry cancels the field components parallel to the sheet. Start with the potential on the axis:

$$V(z)=\frac{c}{2\varepsilon_0}\int_0^\infty\frac{r\,dr}{(r^2+d^2)^{3/2}\sqrt{r^2+z^2}}.$$

The supplied integral gives, for $$|z|\neq d$$,

$$\int_0^\infty\frac{r\,dr}{(r^2+d^2)^{3/2}\sqrt{r^2+z^2}}=\frac{1-|z|/d}{d^2-z^2}=\frac1{d(d+|z|)}.$$

The last expression also holds at $$|z|=d$$ by continuity. Therefore

$$V(z)=\frac{c}{2\varepsilon_0d(d+|z|)}.$$

For $$z\neq0$$, differentiate on each side of the sheet:

$$\boxed{\boldsymbol E(z)=\frac{c\,\operatorname{sgn}(z)}{2\varepsilon_0d(d+|z|)^2}\,\hat{\boldsymbol z}.}$$

For $$c>0$$, the field points away from the sheet. Its one-sided limits have the required jump

$$E_z(0^+)-E_z(0^-)=\frac{c}{\varepsilon_0d^3}=\frac{\sigma(0)}{\varepsilon_0}.$$

There is no unique continuous value of the normal field on an ideal zero-thickness charged sheet.

## (c)

Above the sheet,

$$\boldsymbol E(z)=\frac1{4\pi\varepsilon_0}\frac{2\pi c/d}{(z+d)^2}\,\hat{\boldsymbol z},\qquad z>0.$$

This is the axial field of the effective point charge

$$\boxed{Q_{\mathrm{eff}}=\frac{2\pi c}{d},\qquad(x,y,z)_{\mathrm{eff}}=(0,0,-d)\quad(z_P>0).}$$

Its magnitude is $$2\pi|c|/d$$. For observations below the sheet, the corresponding charge has the same value and is located at $$(0,0,+d)$$. One fixed point charge cannot reproduce both halves of the axis.

![Above-sheet observation point P and the effective point charge at z = −d below the sheet.](/corpus/arena/figures/the-phantom-charge-solution.png)

## (d)

The potential energy is

$$U(z)=qV(z)=\frac{qc}{2\varepsilon_0d(d+|z|)},\qquad U(\pm\infty)=0.$$

For $$qc>0$$, its maximum occurs at the sheet:

$$U_{\max}=U(0)=\frac{qc}{2\varepsilon_0d^2}.$$

Equating the incident kinetic energy to the barrier height gives the threshold

$$\frac12mv_{\mathrm{th}}^2=\frac{qc}{2\varepsilon_0d^2},\qquad\boxed{v_{\mathrm{th}}=\sqrt{\frac{qc}{m\varepsilon_0d^2}}\quad(qc>0).}$$

Any speed above $$v_{\mathrm{th}}$$ gives passage across the sheet. At equality, the particle reaches the ideal sheet with zero speed. The force jumps there, so energy conservation alone does not fix the continuation at this limiting case. The boxed value is the crossing threshold, or infimum of speeds that guarantee passage.

For $$qc<0$$, the potential is a well and there is no positive barrier. Arbitrarily small positive initial speeds suffice. The same zero infimum holds for $$qc=0$$.

$$\boxed{\inf v_\infty=0\quad(qc\leq0).}$$`,
  },
  {
    id: "arena-the-string-that-answered-back", title: "Fixed string driven at two points", topic: "Waves", tags: ["Driven oscillations", "String waves", "Boundary conditions"], summary: "Derive the steady periodic displacement of a fixed string driven at two different positions.", statementFile: "01_The_String_That_Answered_Back_Problem.pdf",
    statement: String.raw`A taut string is fixed at two endpoints separated by a distance $$L$$, with the first at $$x=0$$ and the second at $$x=L$$. The tension is $$T$$. Neglect gravity.

![A string fixed at 0 and L with a transverse harmonic force F_y(t) = F₀ sin(ωt) applied at x = a.](/corpus/arena/figures/the-string-that-answered-back-statement.png)

Figure 1: A transverse harmonic force acts at $$x=a$$.

The force has amplitude $$F_0=0.1T$$ and period

$$\tau=\frac{2\pi}{\omega}=\frac{0.8L}{v},$$

where $$v$$ is the wave speed on the string.

## (a)

The force $$F_y=F_0\sin(\omega t)$$ is applied at $$x=L/2$$. Determine the steady-state transverse displacement $$y(x,t)$$ as a function of position and time, expressed using $$L$$ and $$\tau$$. Sketch the string profile at $$t=0$$, $$t=\tau/4$$, $$t=\tau/2$$, and $$t=3\tau/4$$.

## (b)

The same force is instead applied at $$x=2L/3$$. Determine the steady-state transverse displacement $$y(x,t)$$ and sketch the string profile at the same four times.`,
    solution: String.raw`Use the small-slope approximation and seek the periodic response at the driving frequency. For an undamped string, additional free oscillations depend on the initial conditions. They are excluded from this steady periodic response.

Since $$\tau=0.8L/v$$,

$$k=\frac{2\pi}{v\tau}=\frac{5\pi}{2L},\qquad\omega=\frac{2\pi}{\tau},\qquad\sin(kL)=1.$$

The driving frequency lies between the second and third normal-mode frequencies, so it is not resonant.

For a force at $$x=a$$, the fixed-end conditions give

$$y(x,t)=\begin{cases}C_1\sin(kx)\sin(\omega t),&0\leq x\leq a,\\C_2\sin[k(L-x)]\sin(\omega t),&a\leq x\leq L.\end{cases}$$

Continuity and the force balance on a vanishingly short segment at $$a$$ require

$$C_1\sin(ka)=C_2\sin[k(L-a)],\qquad T\left[y_x(a^-)-y_x(a^+)\right]=F_0\sin(\omega t).$$

Solving gives

$$C_1=\frac{F_0\sin[k(L-a)]}{Tk\sin(kL)},\qquad C_2=\frac{F_0\sin(ka)}{Tk\sin(kL)}.$$

## (a)

For $$a=L/2$$, both sine factors are $$\sin(5\pi/4)=-1/\sqrt2$$. With $$F_0=0.1T$$,

$$C_1=C_2=-\frac{\sqrt2L}{50\pi}.$$

Thus

$$\boxed{y(x,t)=-\frac{\sqrt2L}{50\pi}\sin\left(\frac{2\pi t}{\tau}\right)\begin{cases}\sin\left(\frac{5\pi x}{2L}\right),&0\leq x\leq L/2,\\\sin\left(\frac{5\pi(L-x)}{2L}\right),&L/2\leq x\leq L.\end{cases}}$$

At $$t=0$$ and $$t=\tau/2$$, the displacement is zero everywhere. The string is straight at those instants, but generally moving. The other two profiles have opposite signs.

![Enlarged string profiles for a = L/2 at t = 0, τ/4, τ/2 and 3τ/4.](/corpus/arena/figures/the-string-that-answered-back-solution-a.png)

Profiles at the four requested times. Displacements are enlarged.

## (b)

For $$a=2L/3$$,

$$ka=\frac{5\pi}3,\quad k(L-a)=\frac{5\pi}6,\quad\sin(ka)=-\frac{\sqrt3}2,\quad\sin[k(L-a)]=\frac12.$$

Consequently,

$$C_1=\frac L{50\pi},\qquad C_2=-\frac{\sqrt3L}{50\pi},$$

and

$$\boxed{y(x,t)=\frac L{50\pi}\sin\left(\frac{2\pi t}{\tau}\right)\begin{cases}\sin\left(\frac{5\pi x}{2L}\right),&0\leq x\leq2L/3,\\-\sqrt3\sin\left(\frac{5\pi(L-x)}{2L}\right),&2L/3\leq x\leq L.\end{cases}}$$

Both expressions give

$$y\left(\frac{2L}3,t\right)=-\frac{\sqrt3L}{100\pi}\sin\left(\frac{2\pi t}{\tau}\right).$$

The driving point moves opposite to the applied force at displacement extrema. This phase relation is allowed in a forced oscillation and follows directly from the boundary conditions.

![Enlarged string profiles for a = 2L/3 at t = 0, τ/4, τ/2 and 3τ/4.](/corpus/arena/figures/the-string-that-answered-back-solution-b.png)

The four profiles for $$a=2L/3$$, on the same enlarged vertical scale.

The derivative jump satisfies $$T[y_x(a^-)-y_x(a^+)]=F_0\sin(\omega t)$$ in both cases. Each segment also satisfies $$y_{tt}=v^2y_{xx}$$.

For arbitrary initial conditions, the complete undamped motion adds

$$y_{\mathrm{free}}(x,t)=\sum_{n=1}^\infty\left[A_n\cos\left(\frac{n\pi vt}{L}\right)+B_n\sin\left(\frac{n\pi vt}{L}\right)\right]\sin\left(\frac{n\pi x}{L}\right).$$

These free terms do not decay without damping. The boxed answers are the requested periodic particular solutions.`,
  },
];
