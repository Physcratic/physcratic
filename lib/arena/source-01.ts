import type { ArenaSeed } from "../arena-schema";

export const source01: ArenaSeed[] = [
  {
    id: "arena-mind-the-gap", title: "Mind the Gap", topic: "Optics", tags: ["Interference", "Newton’s rings", "Curvature"], summary: "Determine a lens surface’s radius of curvature using Newton’s rings and consecutive ring measurements.", statementFile: "01_Mind_the_Gap_Problem.pdf",
    statement: String.raw`The arrangement shown below can be used to determine the radius of curvature of a lens surface. The lens to be measured rests on a curved surface whose radius of curvature, $$R_0$$, is known. Both surfaces of the lens have the same radius of curvature, $$R_1$$, which is to be determined. Newton’s rings are observed in the gap between the two facing surfaces.

![Lens of curvature R₁ resting on the reference surface of curvature R₀, with ring radius rₘ and the air gap labelled.](/corpus/arena/figures/mind-the-gap-statement.png)

## (a)

Determine $$r_m$$, the radius of the $$m$$th dark ring observed.

## (b)

At small radii, many Newton’s rings are difficult to observe. Measurements of the radii of several consecutive rings give

$$11.6,\quad 11.8,\quad 12.0,\quad 12.2,\quad 12.4,\quad 12.5,\quad 12.7\ \mathrm{mm}.$$

The wavelength of the light is $$\lambda=5.00\times10^{-7}\ \mathrm m$$, and $$R_0=1.00\ \mathrm m$$. Determine $$R_1$$.`,
    solution: String.raw`## (a)

Use reflected light at near-normal incidence, with contact on the axis. For the geometry shown, $$R_1<R_0$$. The spherical sag is

$$s_R(r)=R-\sqrt{R^2-r^2}\simeq\frac{r^2}{2R}.$$

Subtract the two sags to find the air-gap thickness:

$$h(r)\simeq\frac{r^2}{2}\left(\frac1{R_1}-\frac1{R_0}\right).$$

![Lens, reference surface and air gap used in the Newton’s-ring derivation.](/corpus/arena/figures/mind-the-gap-solution.png)

One reflected ray undergoes a phase change of $$\pi$$. A dark reflected ring satisfies $$2h(r_m)=m\lambda$$, so

$$\boxed{r_m=\sqrt{\frac{m\lambda}{1/R_1-1/R_0}}=\sqrt{\frac{m\lambda R_0R_1}{R_0-R_1}}.}$$

Here $$m=0,1,2,\ldots$$, with $$m=0$$ denoting the central dark spot.

## (b)

Label the measured rings by $$j=0,1,\ldots,6$$, so their orders are $$m_0+j$$. Define

$$x_j=\frac{r_j^2}{\lambda},\qquad y_j=\frac{x_j}{R_0}+j.$$

The ring equation becomes $$y_j=x_j/R_1-m_0$$. The slope of $$y_j$$ against $$x_j$$ is $$1/R_1$$.

$$\begin{array}{c|r|r|r}j&r_j\ (\mathrm{mm})&x_j\ (\mathrm m)&y_j\\\hline 0&11.6&269.12&269.12\\1&11.8&278.48&279.48\\2&12.0&288.00&290.00\\3&12.2&297.68&300.68\\4&12.4&307.52&311.52\\5&12.5&312.50&317.50\\6&12.7&322.58&328.58\end{array}$$

A least-squares fit gives

$$y\simeq(1.112413\ \mathrm{m}^{-1})x-30.33661,\qquad R_1=0.89895\ \mathrm m\simeq0.90\ \mathrm m.$$

The spacing in $$r_m^2$$ determines the curvature without knowing the first ring’s absolute order. The precision of the radii supports the rounded answer $$0.90\ \mathrm m$$.`,
  },
  {
    id: "arena-the-bubble-treaty", title: "Bubbles in Contact", topic: "Thermodynamics", tags: ["Surface tension", "Pressure", "Ideal gas"], summary: "Find the pressures, radii and shared-film geometry of equal and unequal attached soap bubbles.", statementFile: "01_The_Bubble_Treaty_Problem.pdf",
    statement: String.raw`## Soap films, pressure differences, and curved interfaces

Two soap bubbles can join while retaining distinct volumes of gas. This problem examines how their pressures and geometries change when they touch.

Assume that every process is isothermal. The atmospheric pressure and the surface tension of the soap solution are

$$p_a=1.01\times10^5\ \mathrm{Pa},\qquad \sigma=0.025\ \mathrm{N/m}.$$

A soap bubble has two liquid-air surfaces.

![Cross sections before contact, for attached equal bubbles with a flat shared film, and for unequal bubbles with a curved shared film.](/corpus/arena/figures/the-bubble-treaty-statement.png)

Schematic cross sections. The shared film is flat for equal pressures and curved for unequal pressures.

## (a)

Two initially separate bubbles both have radius

$$R_1=R_2=3.00\ \mathrm{cm}.$$

They are then brought together and attach to one another.

(i) Find the pressure inside each bubble before contact.

(ii) Find the radius of each bubble after they join.

(iii) Find the radius of curvature of their common interface. Express it in terms of the radii after contact.

(iv) Find the distance between their centers. Express it in terms of the radii after contact.

## (b)

Now consider two attached bubbles whose resulting outer radii are

$$R'_1=3.00\ \mathrm{cm},\qquad R'_2=4.00\ \mathrm{cm}.$$

(i) Find the radius of curvature of the film separating the two bubbles.

(ii) Find the distance between the centers of the two bubbles.`,
    solution: String.raw`Treat each bubble’s gas as ideal and conserve its amount separately. The temperature is constant. Each thin soap film has two liquid-air surfaces, so its effective tension is $$2\sigma$$.

## (a.i)

A spherical soap bubble has pressure excess $$4\sigma/R$$. Before contact,

$$p_i=p_a+\frac{4\sigma}{R}=1.01\times10^5+\frac{4(0.025)}{0.0300}\ \mathrm{Pa}.$$

Thus the absolute pressure inside each bubble is

$$\boxed{p_i=101\,003.33\ \mathrm{Pa}.}$$

## (a.ii)

Symmetry gives equal final pressures and a flat common film. Three films of equal tension meet at $$120^\circ$$. Each sphere’s centre is then $$R'/2$$ from the common plane.

![Equal attached bubbles with the flat common film, sphere centres O₁ and O₂, outer radii R′ and centre-to-film distances R′/2.](/corpus/arena/figures/the-bubble-treaty-solution-equal.png)

Relative to a complete sphere, each gas region is missing a cap of height $$h=R'/2$$. Its volume is

$$V_{\mathrm{cap}}=\frac{\pi h^2}{3}(3R'-h)=\frac{5\pi}{24}R'^3.$$

The remaining gas volume in each bubble is

$$V_f=\frac{4\pi}{3}R'^3-V_{\mathrm{cap}}=\frac{9\pi}{8}R'^3.$$

Apply $$p_iV_i=p_fV_f$$ using absolute pressures:

$$\left(p_a+\frac{4\sigma}{R}\right)\frac{4\pi R^3}{3}=\left(p_a+\frac{4\sigma}{R'}\right)\frac{9\pi R'^3}{8}.$$

The positive physical root is

$$\boxed{R'_1=R'_2=3.174804\ \mathrm{cm}\simeq3.17\ \mathrm{cm}.}$$

Since the excess pressure is tiny compared with $$p_a$$, volume conservation gives the almost identical estimate

$$R'\simeq R\left(\frac{32}{27}\right)^{1/3}=3.174802\ \mathrm{cm}.$$

## (a.iii)

Equal pressures give zero curvature for the spherical separating film. It is flat, with

$$\boxed{R_{\mathrm{interface}}\longrightarrow\infty.}$$

In general, its signed curvature satisfies $$1/R_{\mathrm{interface}}=1/R'_1-1/R'_2$$ when bubble 1 has the higher pressure.

## (a.iv)

Each centre is $$R'/2$$ from the common plane, so

$$\boxed{\ell=\frac{R'}2+\frac{R'}2=R'\simeq3.17\ \mathrm{cm}.}$$

## (b.i)

For $$R'_1=3.00\ \mathrm{cm}$$ and $$R'_2=4.00\ \mathrm{cm}$$, bubble 1 has the higher pressure. Across the shared soap film,

$$\frac{4\sigma}{R'_1}-\frac{4\sigma}{R'_2}=\frac{4\sigma}{R_3}.$$

Hence

$$\frac1{R_3}=\frac13-\frac14=\frac1{12}\ \mathrm{cm}^{-1},\qquad\boxed{R_3=12.0\ \mathrm{cm}.}$$

The separating film bulges into the larger, lower-pressure bubble.

## (b.ii)

At a junction $$J$$, the two outer radii $$JO_1$$ and $$JO_2$$ enclose $$60^\circ$$, supplementary to the $$120^\circ$$ angle between the outer films. The cosine rule gives

$$\ell^2=(R'_1)^2+(R'_2)^2-2R'_1R'_2\cos60^\circ=9+16-12=13\ \mathrm{cm}^2.$$

Therefore

$$\boxed{\ell=\sqrt{13}\ \mathrm{cm}\simeq3.61\ \mathrm{cm}.}$$

![Triangle joining the sphere centres O₁, O₂ and upper film junction J, with the 60-degree angle and radii R′₁ and R′₂.](/corpus/arena/figures/the-bubble-treaty-solution-unequal.png)

Radii drawn to the upper junction show the $$60^\circ$$ triangle angle.`,
  },
  {
    id: "arena-the-cosmic-kitchen", title: "Big Bang Nucleosynthesis", topic: "Thermodynamics", tags: ["Cosmology", "Statistical mechanics", "Nucleosynthesis"], summary: "Use thermal distributions and cosmic expansion to estimate primordial nucleosynthesis and the helium abundance.", statementFile: "01_The_Cosmic_Kitchen_Problem.pdf",
    statement: String.raw`At the earliest stages of the Universe, at times $$t<10^{-30}\ \mathrm s$$ after the Big Bang, the energy and temperature were extremely high. The physics of this period is not well understood, and particles of unknown types may have been produced. At about $$t\sim10^{-36}\ \mathrm s$$, the Universe underwent a very rapid exponential expansion called inflation. By the end of this process, large amounts of matter and radiation had also been produced. As the Universe expanded and cooled, its temperature eventually became low enough for its interactions to be described by the laws of physics known today.

When the primordial plasma had a temperature of about $$T\sim10^{12}\ \mathrm K$$, it contained photons, electrons, positrons, neutrinos and antineutrinos. It also contained a small number of protons and neutrons, which could convert into one another through the reaction

$$n\rightleftharpoons p+e^-+\bar\nu_e.$$

## (a)

The number of degrees of freedom of a photon is taken to equal its number of polarizations. Use the equipartition principle to estimate the photon energy at this primordial temperature.

## (b)

The total energy of a particle of mass $$m$$ is the sum of its rest energy and kinetic energy. The number of particles is

$$N=\int_0^\infty f(\varepsilon,T)g(\varepsilon)\,d\varepsilon,\qquad f(\varepsilon,T)=\frac1{\exp[(\varepsilon-\mu)/(k_BT)]\pm1}.$$

Here $$g(\varepsilon)\,d\varepsilon$$ is the number of states with energies between $$\varepsilon$$ and $$\varepsilon+d\varepsilon$$, $$\mu$$ is the chemical potential, and $$k_B$$ is Boltzmann’s constant. The plus sign applies to fermions and the minus sign to bosons. Assume that the rest energy is much greater than the kinetic energy and that $$k_BT\ll mc^2$$. Find the particle number density $$n=N/V$$ as a function of temperature.

## (c)

Find the neutron-to-proton number-density ratio $$n_n/n_p$$ at the initial temperature.

## (d)

As the Universe continues to expand and cool, the reaction balance changes and the reverse reaction, which converts protons into neutrons, can no longer proceed effectively. Estimate the temperature $$T_1$$ at which this occurs. Also find $$n_n/n_p$$ at this temperature.

## (e)

The conversion of protons into neutrons is also limited by the number of electrons in the primordial plasma. One relevant equilibrium is pair production and pair annihilation,

$$\gamma+\gamma\rightleftharpoons e^-+e^+.$$

At a temperature $$T_2$$, this reaction ceases to remain balanced and proceeds predominantly from right to left. Some photons still have enough energy to produce pairs, but their small number makes pair production unlikely. The electron population then falls rapidly. Estimate $$T_2$$.

When the plasma reaches a temperature $$T_3$$, nuclear reactions begin to bind neutrons into nuclei. Bound neutrons are more stable than free neutrons, so neutron decay slows and helium is formed for the first time. A possible reaction sequence is

$$\begin{aligned}{}^1_1p+{}^1_0n&\rightleftharpoons{}^2_1\mathrm H+\gamma,\\2\,{}^2_1\mathrm H&\rightleftharpoons{}^3_1\mathrm H+{}^1_1p,\\{}^3_1\mathrm H+{}^2_1\mathrm H&\rightleftharpoons{}^4_2\mathrm{He}+{}^1_0n.\end{aligned}$$

To estimate $$T_3$$, consider only the formation of deuterium, $$D={}^2_1\mathrm H$$. Take $$T_3$$ to be the temperature at which the deuterium-formation equilibrium begins to favour the forward reaction. Assume that this reaction remains in thermodynamic equilibrium throughout.

## (f)

Find the equilibrium ratio

$$\frac{n_D}{n_pn_n}$$

as a function of temperature $$T$$. In equilibrium, the chemical potential of a nucleus satisfies

$$\mu_D=(A-Z)\mu_n+Z\mu_p,$$

where $$A$$ is its mass number and $$Z$$ its proton number.

Define the fractions of baryons present as deuterium, free neutrons and free protons by

$$X_D=\frac{2n_D}{n_B},\quad X_n=\frac{n_n}{n_B},\quad X_p=\frac{n_p}{n_B},\quad n_B=n_p+n_n.$$

The baryon density is related to the photon density by

$$n_B=\eta_Bn_\gamma,\qquad\eta_B=6.1\times10^{-10}.$$

Here $$n_\gamma$$ is the number of photons per unit volume. Treat the radiation in the Universe as blackbody radiation at temperature $$T$$.

## (g)

Use $$X_p\simeq1$$ and assume that $$X_D\simeq X_n$$ at $$T_3$$. Determine $$T_3$$. You will obtain an equation that must be solved numerically. Use $$k_BT$$, expressed in keV, as the numerical variable.

Assume that the expansion of the Universe follows Hubble’s law. For the two positions $$A$$ and $$B$$ shown below,

$$\boldsymbol V_A=H_0\boldsymbol r_A,\qquad\boldsymbol V_B=H_0\boldsymbol r_B,$$

where $$H_0$$ is the present-day Hubble parameter. Use comoving coordinates, which move with the expansion, defined by

$$\boldsymbol r=a(t)\boldsymbol x.$$

The scale factor $$a(t)$$ describes the change in the separation between comoving points.

![Comoving points A and B with position vectors r_A and r_B from O and separation r_B minus r_A.](/corpus/arena/figures/the-cosmic-kitchen-statement.png)

## (h)

Assume Newtonian gravity and reversible expansion. Model the Universe as a sphere of uniform mass density $$\rho$$. A galaxy of mass $$m$$, at distance $$r$$ from the centre, has total mechanical energy $$U$$. Define the curvature parameter $$k$$ by

$$kc^2=-\frac{2U}{mx^2},$$

with $$k$$ independent of the comoving position $$x$$. The time-dependent Hubble parameter can be written as

$$H^2=\zeta\rho+\xi.$$

Determine $$\zeta$$ and $$\xi$$.

## (i)

Find how the energy density depends on the scale factor in each of the following cases:

(i) The Universe contains dust, or nonrelativistic matter, with pressure $$p=0$$.

(ii) The Universe contains radiation, or ultrarelativistic matter, with pressure $$p=\rho c^2/3$$.

## (j)

Assume that radiation dominates the primordial plasma. Determine how the temperature $$T(t)$$ scales with $$a(t)$$.

## (k)

Further assume a spatially flat Universe, so that $$\xi=0$$. Find the ratio of the temperatures at any two times $$t_1$$ and $$t_2$$ during the radiation-dominated era.

## (l)

Matter and radiation have equal energy densities when the Universe is 60 000 years old. Recombination occurs at a temperature of 3000 K when the Universe is 360 000 years old, by which time matter dominates. Find the temperature at matter-radiation equality. Assume a flat Universe and that the scaling found in part (j) still applies.

## (m)

Find the helium mass fraction at nucleosynthesis, when the temperature is $$T_3$$, relative to the baryonic mass of the primordial plasma at temperature $$T_1$$.

Use the following data. The particle masses are specified through their rest energies.

$$\begin{array}{ll}\text{Proton rest energy}&m_pc^2=938.27\ \mathrm{MeV}\\\text{Neutron rest energy}&m_nc^2=939.57\ \mathrm{MeV}\\\text{Electron rest energy}&m_ec^2=0.51\ \mathrm{MeV}\\\text{Deuteron rest energy}&m_Dc^2=1875.6\ \mathrm{MeV}\\\text{Elementary charge}&e=1.60\times10^{-19}\ \mathrm C\\\text{Boltzmann constant}&k_B=1.38\times10^{-23}\ \mathrm{J\,K^{-1}}\\\text{Neutron half-life}&t_{1/2}=10.2\ \mathrm{min}\\\text{One year}&1\ \mathrm{yr}=3.154\times10^7\ \mathrm s\\\text{Speed of light}&c=3.00\times10^8\ \mathrm{m\,s^{-1}}\end{array}$$

$$\int_0^\infty x^2e^{-x^2}\,dx=\frac{\sqrt\pi}{4},\qquad\int_0^\infty\frac{x^2}{e^x-1}\,dx=2.40411.$$`,
    solution: String.raw`## (a)

The thermal-energy scale used in the question is $$E_{\mathrm{th}}\sim k_BT$$. At $$T=10^{12}\ \mathrm K$$,

$$E_{\mathrm{th}}\simeq1.38\times10^{-11}\ \mathrm J=86.25\ \mathrm{MeV}.$$

This is an energy-scale estimate. Polarization counting is not an equipartition derivation of the mean photon energy. For a blackbody spectrum, $$\langle E_\gamma\rangle=2.701k_BT\simeq233\ \mathrm{MeV}$$. The estimates below use the scale $$k_BT$$.

## (b)

For a nonrelativistic particle, $$\varepsilon\simeq mc^2+p^2/(2m)$$. In addition, assume a dilute gas with $$\exp[(\mu-mc^2)/(k_BT)]\ll1$$. Either distribution then reduces to

$$f(\varepsilon,T)\simeq e^{-(\varepsilon-\mu)/(k_BT)}.$$

For one internal state, the number of momentum states per unit volume in the shell $$p$$ to $$p+dp$$ is $$4\pi p^2\,dp/h^3$$. Thus

$$n=\frac{4\pi}{h^3}e^{(\mu-mc^2)/(k_BT)}\int_0^\infty p^2e^{-p^2/(2mk_BT)}\,dp.$$

With $$x=p/\sqrt{2mk_BT}$$ and the supplied Gaussian integral,

$$\boxed{n=\left(\frac{mk_BT}{2\pi\hbar^2}\right)^{3/2}\exp\left(\frac{\mu-mc^2}{k_BT}\right).}$$

This counts one internal state per species. An internal degeneracy $$g$$ multiplies the density by $$g$$. Use $$g=1$$ for the massive species below.

## (c)

Neglecting the electron and neutrino chemical potentials gives $$\mu_n\simeq\mu_p$$. Therefore

$$\frac{n_n}{n_p}=\left(\frac{m_n}{m_p}\right)^{3/2}\exp\left[-\frac{(m_n-m_p)c^2}{k_BT}\right]\simeq e^{-\Delta/(k_BT)},\qquad\Delta=1.30\ \mathrm{MeV}.$$

Keep the mass difference in the exponent. At the initial temperature,

$$\boxed{\frac{n_n}{n_p}\simeq e^{-1.30/86.25}=0.985\simeq1.}$$

## (d)

Use the intended inverse-reaction energy-scale approximation,

$$Q=(m_n-m_p-m_e)c^2=0.79\ \mathrm{MeV}\simeq0.8\ \mathrm{MeV}.$$

Taking $$k_BT_1\simeq0.8\ \mathrm{MeV}$$ gives

$$\boxed{T_1\simeq9.3\times10^9\ \mathrm K.}$$

The neutron-to-proton ratio is then

$$\left.r_1\equiv\frac{n_n}{n_p}\right|_{T_1}\simeq e^{-1.30/0.8}=0.197\simeq0.20.$$

Use $$r_1\simeq0.20$$ in the final estimate. A physical freeze-out temperature would also require comparing the weak-conversion rate with the expansion rate.

## (e)

At threshold, two oppositely directed photons must supply the rest energy of an electron-positron pair. Using the thermal-energy scale from part (a),

$$2k_BT_2\simeq2m_ec^2.$$

Hence

$$k_BT_2\simeq0.51\ \mathrm{MeV},\qquad T_2\simeq5.9\times10^9\ \mathrm K.$$

This estimates the scale for suppression of the pair abundance. Annihilation can proceed while the plasma remains close to chemical equilibrium.

## (f)

For deuterium, $$A=2$$ and $$Z=1$$, so chemical equilibrium gives

$$\mu_D=\mu_n+\mu_p.$$

Apply part (b) to the three species and form the ratio. The chemical potentials cancel,

$$\boxed{S(T)\equiv\frac{n_D}{n_pn_n}=\left(\frac{m_D}{m_pm_n}\right)^{3/2}\left(\frac{2\pi\hbar^2}{k_BT}\right)^{3/2}e^{B_D/(k_BT)},}$$

where the deuteron binding energy from the supplied masses is

$$B_D=(m_p+m_n-m_D)c^2=2.24\ \mathrm{MeV}.$$

The prefactor is proportional to $$T^{-3/2}$$ and the exponential favours binding on cooling. The single-state convention is used here. Physical spin multiplicities would multiply $$S(T)$$ by $$3/4$$.

## (g)

Counting both photon polarizations gives the blackbody photon density

$$n_\gamma=\frac{8\pi}{h^3}\int_0^\infty\frac{p^2\,dp}{e^{pc/(k_BT)}-1}=\frac{2.40411}{\pi^2}\left(\frac{k_BT}{\hbar c}\right)^3.$$

The total baryon density includes bound nucleons:

$$n_B=n_p+n_n+2n_D+\cdots.$$

Using $$X_D=2n_D/n_B$$ and $$X_n=n_n/n_B$$ gives

$$\frac{X_D}{X_n}=\frac{2n_D}{n_n}=2n_pS(T)=2X_p\eta_Bn_\gamma S(T).$$

Use $$X_p\simeq1$$ and $$X_D/X_n\simeq1$$. If $$u$$ is the numerical value of $$k_BT$$ in keV, the equation to solve is

$$\boxed{1=\left(5.95305\times10^{-12}\right)u^{3/2}e^{2240/u}.}$$

Take the logarithm for numerical evaluation,

$$\ln\left(5.95305\times10^{-12}\right)+\frac32\ln u+\frac{2240}{u}=0.$$

The relevant low-temperature root is

$$k_BT_3\simeq69.1\ \mathrm{keV},\qquad T_3\simeq8.0\times10^8\ \mathrm K.$$

The large photon population delays deuterium formation below the binding-energy scale. The problem’s $$n_B=n_p+n_n$$ can only be an approximation before appreciable binding.

## (h)

A comoving position $$x$$ is fixed, so $$r=ax$$ implies

$$\dot r=\dot a x=\frac{\dot a}{a}r,\qquad H=\frac{\dot a}{a}.$$

The mass enclosed within radius $$r$$ is $$M=4\pi\rho r^3/3$$. The galaxy’s mechanical energy is

$$U=\frac12m\dot r^2-\frac{GMm}{r}=\frac12m\dot a^2x^2-\frac{4\pi G}{3}\rho ma^2x^2.$$

Divide by $$ma^2x^2/2$$ and use the definition of $$k$$,

$$H^2=\frac{8\pi G}{3}\rho+\frac{2U}{ma^2x^2}=\frac{8\pi G}{3}\rho-\frac{kc^2}{a^2}.$$

Thus

$$\boxed{\zeta=\frac{8\pi G}{3},\qquad\xi=-\frac{kc^2}{a^2}.}$$

## (i)

The energy in a comoving volume $$V\propto a^3$$ is $$\rho c^2V$$. Adiabatic expansion gives

$$d(\rho c^2V)+p\,dV=0,\qquad\dot\rho+3H\left(\rho+\frac p{c^2}\right)=0.$$

For dust, $$p=0$$, so

$$\dot\rho+3H\rho=0\quad\Longrightarrow\quad\rho c^2\propto a^{-3}.$$

For radiation, $$p=\rho c^2/3$$, so

$$\dot\rho+4H\rho=0\quad\Longrightarrow\quad\rho c^2\propto a^{-4}.$$

Matter is diluted by the increasing volume. Radiation also loses energy as its wavelengths stretch, producing the extra factor $$a^{-1}$$.

## (j)

For fixed relativistic particle content, thermal radiation has energy density proportional to $$T^4$$. Combining this with $$\rho c^2\propto a^{-4}$$ gives

$$T(t)\propto a(t)^{-1}.$$

## (k)

For a flat, radiation-dominated Universe,

$$\left(\frac{\dot a}{a}\right)^2\propto a^{-4}\quad\Longrightarrow\quad a\dot a=\mathrm{constant}.$$

Taking the Big Bang as $$t=0$$ gives $$a\propto t^{1/2}$$ and hence $$T\propto t^{-1/2}$$. Therefore

$$\boxed{\frac{T(t_1)}{T(t_2)}=\left(\frac{t_2}{t_1}\right)^{1/2}.}$$

## (l)

In the matter-dominated approximation, $$\rho\propto a^{-3}$$, so

$$\dot a\propto a^{-1/2},\qquad a\propto t^{2/3},\qquad T\propto t^{-2/3}.$$

Use this power law between equality and recombination,

$$T_{\mathrm{eq}}=T_{\mathrm{rec}}\left(\frac{t_{\mathrm{rec}}}{t_{\mathrm{eq}}}\right)^{2/3}=3000\left(\frac{360\,000}{60\,000}\right)^{2/3}\ \mathrm K.$$

Thus

$$\boxed{T_{\mathrm{eq}}\simeq9.9\times10^3\ \mathrm K.}$$

This follows the separate matter- and radiation-dominated power-law approximations used in the problem.

## (m)

Use the radiation-era relation $$tT^2=\mathrm{constant}$$ to estimate the time available for free-neutron decay,

$$t(T)=t_{\mathrm{eq}}\left(\frac{T_{\mathrm{eq}}}{T}\right)^2,\qquad t_{\mathrm{eq}}=60\,000\ \mathrm{yr}.$$

With the rounded temperatures above,

$$t_1\simeq60\,000\left(\frac{9.9\times10^3}{9.3\times10^9}\right)^2\ \mathrm{yr}\simeq6.8\times10^{-8}\ \mathrm{yr}\simeq2.1\ \mathrm s,$$

$$t_3\simeq60\,000\left(\frac{9.9\times10^3}{8.0\times10^8}\right)^2\ \mathrm{yr}\simeq9.2\times10^{-6}\ \mathrm{yr}\simeq2.9\times10^2\ \mathrm s.$$

Thus $$\Delta t=t_3-t_1\simeq290\ \mathrm s$$. The neutron half-life is $$t_{1/2}=10.2\ \mathrm{min}=612\ \mathrm s$$, so the surviving fraction is

$$F_n=2^{-\Delta t/t_{1/2}}\simeq2^{-290/612}\simeq0.72.$$

Count particles in a fixed comoving volume. At $$T_1$$, take 1000 protons and 200 neutrons, consistent with $$r_1\simeq0.20$$. The total baryon count is 1200. After free-neutron decay,

$$N_n\simeq200(0.72)=144,\qquad N_p\simeq1000+56=1056.$$

Assume that all surviving neutrons enter $$ {}^4\mathrm{He}$$. Each helium nucleus uses two neutrons, so

$$N_{\mathrm{He}}\simeq\frac{144}{2}=72.$$

Neglecting small mass differences per baryon, the helium mass fraction is

$$\boxed{Y_{\mathrm{He}}\simeq\frac{4N_{\mathrm{He}}}{N_B}=\frac{4\times72}{1200}=0.24=24\%.}$$

The same counting can be written as

$$Y_{\mathrm{He}}\simeq\frac{2r_1}{1+r_1}2^{-\Delta t/t_{1/2}}.$$`,
  },
];
