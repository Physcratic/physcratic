import type { ArenaSeed } from "../arena-schema";

// Beginner Arena set F1, thermodynamics, waves, optics and modern physics. Original Physcratic problems written on
// 14 November 2026. There is no PDF behind these. statementFile only keeps the shape the schema asks for.
const importedOn = "2026-11-14";

export const source08: ArenaSeed[] = [
  {
    id: "arena-the-rectangular-cycle", title: "The Rectangular Cycle", topic: "Thermodynamics", tags: ["Heat engines", "Ideal gas", "First law of thermodynamics"], importedOn,
    summary: "A monatomic ideal gas goes round a rectangle on the pressure and volume diagram. Find the work, the heat taken in and the efficiency.", statementFile: "F1_The_Rectangular_Cycle_Problem.pdf",
    statement: String.raw`A fixed amount of a monatomic ideal gas is taken round the cycle A, B, C, D and back to A. The four states are

$$A:(p_0,\ V_0),\qquad B:(2p_0,\ V_0),\qquad C:(2p_0,\ 3V_0),\qquad D:(p_0,\ 3V_0).$$

Each leg is a straight line on the pressure and volume diagram, so the cycle is a rectangle. The internal energy of a monatomic ideal gas is $$U=\tfrac32pV$$.

![A pressure and volume diagram with a rectangular cycle. A is at volume V0 and pressure p0, B at V0 and 2p0, C at 3V0 and 2p0, D at 3V0 and p0. Arrows run from A to B to C to D and back to A.](/corpus/arena/figures/the-rectangular-cycle-statement.svg)

## (a)

Find the net work done by the gas in one cycle, in terms of $$p_0$$ and $$V_0$$.

## (b)

On some legs heat flows into the gas and on others heat flows out. Find the total heat that flows into the gas in one cycle, counting only the legs where it flows in. Give it in terms of $$p_0$$ and $$V_0$$.

## (c)

Find the efficiency of the cycle, the net work divided by the heat that flows in. Give a number.`,
    solution: String.raw`## (a)

The gas does work only when its volume changes. On leg BC it expands at pressure $$2p_0$$ and on leg DA it is compressed at pressure $$p_0$$:

$$W=2p_0(3V_0-V_0)-p_0(3V_0-V_0).$$

$$\boxed{W=2p_0V_0.}$$

This is the area of the rectangle.

## (b)

Use the first law on each leg, $$Q=\Delta U+W$$, with $$U=\tfrac32pV$$.

Leg AB, constant volume: $$W=0$$, so $$Q_{AB}=\tfrac32(2p_0V_0-p_0V_0)=\tfrac32p_0V_0$$. Heat flows in.

Leg BC, constant pressure: $$\Delta U=\tfrac32(6p_0V_0-2p_0V_0)=6p_0V_0$$ and $$W=4p_0V_0$$, so $$Q_{BC}=10p_0V_0$$. Heat flows in.

Leg CD, constant volume: $$Q_{CD}=\tfrac32(3p_0V_0-6p_0V_0)=-\tfrac92p_0V_0$$. Heat flows out.

Leg DA, constant pressure: $$\Delta U=\tfrac32(p_0V_0-3p_0V_0)=-3p_0V_0$$ and $$W=-2p_0V_0$$, so $$Q_{DA}=-5p_0V_0$$. Heat flows out.

Heat flows in on AB and BC only:

$$\boxed{Q_{\mathrm{in}}=\frac32p_0V_0+10p_0V_0=\frac{23}{2}p_0V_0.}$$

Check: over the whole cycle the heat adds up to $$\tfrac{23}2p_0V_0-\tfrac{19}2p_0V_0=2p_0V_0$$, equal to the net work, as it must be when the gas returns to its starting state.

## (c)

$$\eta=\frac{W}{Q_{\mathrm{in}}}=\frac{2p_0V_0}{\tfrac{23}{2}p_0V_0}=\frac4{23}.$$

$$\boxed{\eta\approx0.174.}$$

Dividing the work by the net heat would give 1 for any cycle, which says nothing. The efficiency compares the work with the heat that has to be supplied.`,
    hints: {
      a: [
        String.raw`The gas does work only on the legs where its volume changes. Which two legs are those?`,
        String.raw`At constant pressure the work done by the gas is $$p\,\Delta V$$. It is positive on the expansion and negative on the compression.`,
        String.raw`Add $$2p_0(3V_0-V_0)$$ and $$-p_0(3V_0-V_0)$$. The result is the area of the rectangle.`,
      ],
      b: [
        String.raw`Treat each leg on its own with the first law, $$Q=\Delta U+W$$, and $$U=\tfrac32pV$$.`,
        String.raw`Decide the sign of $$Q$$ on each leg. Heat flows in where the product $$pV$$ rises, which here is on AB and BC.`,
        String.raw`You should find $$Q_{AB}=\tfrac32p_0V_0$$ and $$Q_{BC}=6p_0V_0+4p_0V_0$$. Add these two only.`,
      ],
      c: [
        String.raw`The efficiency is the net work of part (a) divided by the heat taken in of part (b).`,
        String.raw`Do not divide by the net heat of the whole cycle. That always equals the work.`,
        String.raw`The factors $$p_0V_0$$ cancel, leaving $$2$$ divided by $$23/2$$.`,
      ],
    },
  },
  {
    id: "arena-a-lamp-under-a-raft", title: "A Lamp Under a Raft", topic: "Optics", tags: ["Refraction", "Geometric optics"], importedOn,
    summary: "A raft floats above an underwater lamp. Find how large the raft must be to stop all the lamp’s light leaving the water.", statementFile: "F1_A_Lamp_Under_a_Raft_Problem.pdf",
    statement: String.raw`A small lamp sits at a depth $$h$$ below the flat surface of a lake and shines in all directions. The water has refractive index $$n$$ and the air has refractive index 1. A thin, opaque, circular raft floats on the surface with its centre directly above the lamp. Ignore light scattered by the water and the lake bed.

![Side view of a lake. A lamp is at depth h below the centre of a floating raft of radius R. One ray reaches the surface just past the rim of the raft, at the critical angle to the normal, and is reflected back down.](/corpus/arena/figures/a-lamp-under-a-raft-statement.svg)

## (a)

Find the smallest raft radius for which no light from the lamp gets out into the air. Give it in terms of $$h$$ and $$n$$.

## (b)

Take $$h=1.5\ \mathrm m$$ and $$n=4/3$$. Find that radius.

## (c)

A raft of radius $$1.0\ \mathrm m$$ floats on the same lake. Find the greatest lamp depth for which this raft still stops all the light.`,
    solution: String.raw`## (a)

A ray that meets the surface a horizontal distance $$s$$ from the point above the lamp makes an angle $$\theta$$ with the normal, where $$\tan\theta=s/h$$. Rays that land farther out arrive at larger angles.

Light going from water to air is totally reflected when $$\theta$$ is larger than the critical angle $$\theta_c$$, given by

$$n\sin\theta_c=1.$$

So light can leave the water only inside a circle of radius $$h\tan\theta_c$$ on the surface. The raft has to cover that circle. With $$\sin\theta_c=1/n$$,

$$\tan\theta_c=\frac{\sin\theta_c}{\sqrt{1-\sin^2\theta_c}}=\frac1{\sqrt{n^2-1}}.$$

$$\boxed{R=\frac h{\sqrt{n^2-1}}.}$$

## (b)

$$n^2-1=\frac{16}9-1=\frac79,\qquad\sqrt{n^2-1}=0.882.$$

$$\boxed{R=\frac{1.5\ \mathrm m}{0.882}=1.70\ \mathrm m.}$$

## (c)

A deeper lamp lights a wider circle on the surface, so a given raft works only down to some depth. Solve the result of part (a) for $$h$$:

$$h=R\sqrt{n^2-1}=(1.0\ \mathrm m)(0.882).$$

$$\boxed{h=0.88\ \mathrm m.}$$`,
    hints: {
      a: [
        String.raw`Follow rays from the lamp that hit the surface farther and farther from the point above the lamp. How does their angle to the normal change?`,
        String.raw`Past the critical angle the light is totally reflected. So light leaves the water only inside a circle of radius $$h\tan\theta_c$$, and the raft has to cover it.`,
        String.raw`The critical angle has $$\sin\theta_c=1/n$$. Turn that into $$\tan\theta_c=1/\sqrt{n^2-1}$$.`,
      ],
      b: [
        String.raw`Use your result from part (a) with the numbers given.`,
        String.raw`With $$n=4/3$$, $$n^2-1=7/9$$.`,
        String.raw`The square root of $$7/9$$ is about $$0.882$$. Divide the depth by it.`,
      ],
      c: [
        String.raw`The same relation links the radius and the depth. Now the radius is known and the depth is not.`,
        String.raw`A deeper lamp lights a wider circle on the surface. So the raft works for every depth up to a limit.`,
        String.raw`Solve the result of part (a) for the depth, $$h=R\sqrt{n^2-1}$$.`,
      ],
    },
  },
  {
    id: "arena-walking-past-two-speakers", title: "Walking Past Two Speakers", topic: "Waves", tags: ["Interference", "Sound propagation", "Acoustics"], importedOn,
    summary: "Two speakers play the same tone. Count the quiet points on a walk away from one of them and find the last one.", statementFile: "F1_Walking_Past_Two_Speakers_Problem.pdf",
    statement: String.raw`Two small speakers $$S_1$$ and $$S_2$$ stand a distance $$d$$ apart in an open field. They play the same pure tone, in step with each other. A listener starts right next to $$S_1$$ and walks slowly away from it in a straight line at right angles to the line joining the speakers. Call the listener’s distance from $$S_1$$ $$x$$. Ignore reflections from the ground, and take the two sounds to be about equally loud along the walk.

![Top view. Speakers S1 and S2 are a distance d apart on a vertical line. The listener walks horizontally away from S1 and is a distance x from it. A slanted line joins the listener to S2.](/corpus/arena/figures/walking-past-two-speakers-statement.svg)

## (a)

At some point on the walk the sound from $$S_2$$ has travelled a distance $$\Delta$$ farther than the sound from $$S_1$$. Find the listener’s distance $$x$$ at that point, in terms of $$d$$ and $$\Delta$$.

## (b)

Now take $$d=3.0\ \mathrm m$$, a tone of frequency $$340\ \mathrm{Hz}$$ and a speed of sound of $$340\ \mathrm{m/s}$$. How many quiet points, where the two sounds cancel, does the listener pass on a very long walk?

## (c)

How far from $$S_1$$ is the last quiet point?`,
    solution: String.raw`## (a)

The listener is a distance $$x$$ from $$S_1$$ and $$\sqrt{x^2+d^2}$$ from $$S_2$$. The path difference is

$$\Delta=\sqrt{x^2+d^2}-x.$$

Move $$x$$ to the left and square:

$$(\Delta+x)^2=x^2+d^2,\qquad\Delta^2+2\Delta x=d^2.$$

$$\boxed{x=\frac{d^2-\Delta^2}{2\Delta}.}$$

## (b)

The wavelength is $$\lambda=(340\ \mathrm{m/s})/(340\ \mathrm{Hz})=1.0\ \mathrm m$$.

At the start, $$x=0$$ and $$\Delta=d=3.0\ \mathrm m$$. As the listener walks away the two distances become nearly equal, so $$\Delta$$ falls steadily toward zero and never reaches it. Every value between $$3.0\ \mathrm m$$ and zero occurs exactly once.

The sounds cancel where the path difference is a whole number of wavelengths plus half a wavelength. The values inside the range are

$$\Delta=2.5\ \mathrm m,\quad1.5\ \mathrm m,\quad0.5\ \mathrm m.$$

$$\boxed{3\ \text{quiet points}.}$$

## (c)

The last quiet point has the smallest path difference, $$\Delta=0.5\ \mathrm m$$. From part (a),

$$x=\frac{(3.0)^2-(0.5)^2}{2(0.5)}\ \mathrm m.$$

$$\boxed{x=8.75\ \mathrm m.}$$

The other two are at $$x=0.55\ \mathrm m$$ and $$x=2.25\ \mathrm m$$. Beyond $$8.75\ \mathrm m$$ the path difference stays below half a wavelength, so the sound never cancels again.`,
    hints: {
      a: [
        String.raw`The listener, $$S_1$$ and $$S_2$$ make a right-angled triangle. How far is the listener from $$S_2$$?`,
        String.raw`The path difference is $$\Delta=\sqrt{x^2+d^2}-x$$. To solve for $$x$$, move $$x$$ to the other side before you square.`,
        String.raw`Squaring $$\Delta+x=\sqrt{x^2+d^2}$$ gives $$\Delta^2+2\Delta x=d^2$$. The $$x^2$$ terms cancel.`,
      ],
      b: [
        String.raw`Find the wavelength first. Then ask which path differences make the two sounds cancel.`,
        String.raw`The sounds cancel when $$\Delta$$ is half a wavelength, one and a half wavelengths, and so on. Which values does $$\Delta$$ take along the walk?`,
        String.raw`The path difference starts at $$d=3.0\ \mathrm m$$ and falls toward zero without reaching it. Count the cancelling values in that range.`,
      ],
      c: [
        String.raw`The path difference keeps falling along the walk. So the last quiet point has the smallest cancelling path difference.`,
        String.raw`That value is half a wavelength, $$\Delta=0.5\ \mathrm m$$.`,
        String.raw`Put $$d=3.0\ \mathrm m$$ and $$\Delta=0.5\ \mathrm m$$ into your result from part (a).`,
      ],
    },
  },
  {
    id: "arena-two-isotopes-one-sample", title: "Two Isotopes, One Sample", topic: "Modern physics", tags: ["Radioactive decay", "Nuclear stability"], importedOn,
    summary: "A sample holds two isotopes with different half-lives. Compare their numbers of nuclei and their activities as time passes.", statementFile: "F1_Two_Isotopes_One_Sample_Problem.pdf",
    statement: String.raw`A freshly made sample holds equal numbers of nuclei of two radioactive isotopes. Isotope X has a half-life of $$2.0\ \mathrm h$$ and isotope Y has a half-life of $$6.0\ \mathrm h$$. Neither decays into the other, and all the decay products are stable. The activity of an isotope is the number of its nuclei that decay per second.

## (a)

Find the ratio $$N_X/N_Y$$ of the numbers of nuclei left, $$6.0\ \mathrm h$$ after the sample was made.

## (b)

Find the ratio $$A_X/A_Y$$ of the two activities at that same time.

## (c)

How long after the sample was made are the two activities equal? Give the time in hours.`,
    solution: String.raw`## (a)

After each half-life, half of the nuclei that were there are left. In $$6.0\ \mathrm h$$ isotope X goes through three half-lives and isotope Y through one. With $$N_0$$ nuclei of each at the start,

$$N_X=\frac{N_0}{8},\qquad N_Y=\frac{N_0}{2}.$$

$$\boxed{\frac{N_X}{N_Y}=\frac14=0.25.}$$

## (b)

The activity is not the number of nuclei. Each nucleus of an isotope has the same chance of decaying per second, the decay constant $$\lambda=\ln2/T$$, where $$T$$ is the half-life. So

$$A=\lambda N=\frac{\ln2}{T}\,N.$$

A nucleus of X is three times as likely to decay in the next second as a nucleus of Y, because its half-life is three times shorter:

$$\frac{A_X}{A_Y}=\frac{T_Y}{T_X}\,\frac{N_X}{N_Y}=3\times\frac14.$$

$$\boxed{\frac{A_X}{A_Y}=0.75.}$$

## (c)

At a time $$t$$ in hours,

$$\frac{A_X}{A_Y}=3\,\frac{2^{-t/2}}{2^{-t/6}}=3\times2^{-t/3}.$$

The ratio starts at 3 and falls. It equals 1 when $$2^{t/3}=3$$:

$$t=3\log_2 3\ \mathrm h=3\,\frac{\ln 3}{\ln 2}\ \mathrm h.$$

$$\boxed{t=4.75\ \mathrm h.}$$

Check with part (b): at $$6.0\ \mathrm h$$ the ratio has already fallen to $$0.75$$, so the activities were equal a little earlier than that.`,
    hints: {
      a: [
        String.raw`After each half-life, half of the nuclei that were there are left.`,
        String.raw`Count the half-lives in $$6.0\ \mathrm h$$. Isotope X has had three and isotope Y has had one.`,
        String.raw`The fractions left are $$1/8$$ and $$1/2$$. The starting numbers are equal, so divide one fraction by the other.`,
      ],
      b: [
        String.raw`Activity is decays per second. It depends on how many nuclei there are and on how likely each one is to decay.`,
        String.raw`Use $$A=\lambda N$$ with $$\lambda=\ln2/T$$, where $$T$$ is the half-life. The shorter half-life has the larger decay constant.`,
        String.raw`The ratio is $$(T_Y/T_X)(N_X/N_Y)$$. The first factor is 3 and the second is your answer to part (a).`,
      ],
      c: [
        String.raw`Write the activity ratio at a general time $$t$$ in hours, using $$N=N_02^{-t/T}$$ for each isotope.`,
        String.raw`The ratio is $$3\times2^{-t/2}/2^{-t/6}=3\times2^{-t/3}$$. It starts at 3 and falls.`,
        String.raw`Set the ratio equal to 1, so $$2^{t/3}=3$$. Take logarithms to get $$t=3\ln3/\ln2$$.`,
      ],
    },
  },
];
