import type { ArenaSeed } from "../arena-schema";

// Beginner Arena set F1, mechanics and electromagnetism. Original Physcratic problems written on 14 November 2026.
// They have no source PDF.
const importedOn = "2026-11-14";

export const source07: ArenaSeed[] = [
  {
    id: "arena-cat-on-a-plank", title: "Cat on a Plank", topic: "Mechanics", tags: ["Torque", "Stability"], importedOn, original: true,
    summary: "Find how far a cat can walk along an overhanging plank before the plank tips off the table.",
    statement: String.raw`A uniform plank of length $$L$$ and mass $$M$$ lies on a horizontal table, at right angles to the table’s edge. One third of the plank sticks out past the edge. A cat of mass $$m$$ walks slowly from the table out along the plank. Treat the cat as a point mass. The plank does not slide.

![A plank on a table with one third of its length past the edge. A cat stands on the overhanging part, a distance x past the edge.](/corpus/arena/figures/cat-on-a-plank-statement.svg)

## (a)

The plank starts to tip when the cat is a distance $$x$$ past the table’s edge. Find $$x$$ in terms of $$M$$, $$m$$ and $$L$$.

## (b)

Take $$M=12\ \mathrm{kg}$$, $$L=3.0\ \mathrm m$$ and $$m=8.0\ \mathrm{kg}$$. Find $$x$$.

## (c)

A light enough cat can walk to the very end of the plank and the plank stays put. Find the cat mass for which the plank starts to tip just as the cat reaches the end. Give it in terms of $$M$$.`,
    solution: String.raw`## (a)

While the plank rests flat, the table pushes up on it over the whole contact length. As the cat walks out, that push shifts toward the edge. At the moment the plank starts to tip, the plank touches the table only at the edge, so the whole support force acts there.

Take torques about the edge. The support force has no torque about that point. The centre of the plank is on the table side, at a distance

$$\frac L2-\frac L3=\frac L6$$

from the edge. The plank’s weight turns the plank one way and the cat’s weight turns it the other way. At the tipping point they balance:

$$Mg\,\frac L6=mg\,x.$$

$$\boxed{x=\frac{ML}{6m}.}$$

## (b)

$$x=\frac{(12\ \mathrm{kg})(3.0\ \mathrm m)}{6(8.0\ \mathrm{kg})}=0.75\ \mathrm m.$$

The overhang is $$L/3=1.0\ \mathrm m$$ long, so this point is on the plank and the plank does tip.

$$\boxed{x=0.75\ \mathrm m.}$$

## (c)

The cat cannot be farther out than the end of the plank, which is at $$x=L/3$$. Put that into the result of part (a):

$$\frac{ML}{6m}=\frac L3.$$

$$\boxed{m=\frac M2.}$$

A lighter cat would need to stand past the end to tip the plank, so it reaches the end safely. With $$M=12\ \mathrm{kg}$$ the limit is $$6\ \mathrm{kg}$$, and the $$8.0\ \mathrm{kg}$$ cat of part (b) is above it.`,
    hints: {
      a: [
        String.raw`As the cat walks out, the table’s support force on the plank shifts toward the edge. Where does it act at the moment the plank starts to tip?`,
        String.raw`Take torques about the table’s edge. The support force acts there, so it has no torque. Only the plank’s weight and the cat’s weight are left.`,
        String.raw`The centre of the plank is $$L/2-L/3=L/6$$ from the edge, on the table side. Balance $$Mg\,(L/6)$$ against $$mg\,x$$.`,
      ],
      b: [
        String.raw`Use your result from part (a), $$x=ML/(6m)$$, with the numbers given.`,
        String.raw`The two masses appear as a ratio, so the kilograms cancel and $$x$$ comes out in metres.`,
        String.raw`Compare your answer with the length of the overhang, $$L/3=1.0\ \mathrm m$$. The tipping point has to be on the plank.`,
      ],
      c: [
        String.raw`The cat cannot stand farther out than the end of the plank. How far past the edge is the end?`,
        String.raw`For the limiting cat, the tipping point of part (a) is exactly at the end, so $$x=L/3$$.`,
        String.raw`Set $$ML/(6m)=L/3$$ and solve for $$m$$. The length cancels.`,
      ],
    },
  },
  {
    id: "arena-two-sleds-one-rope", title: "Two Sleds, One Rope", topic: "Mechanics", tags: ["Momentum conservation", "Energy conservation", "Newton’s laws"], importedOn, original: true,
    summary: "Two sleds on frictionless ice are pulled together by a rope. Find where they meet and how fast they close.",
    statement: String.raw`Two sleds rest on frictionless ice, a distance $$L$$ apart. Ayu sits on sled A. Sled A with Ayu has mass $$m_A$$. Sled B carries cargo and has total mass $$m_B$$. A light rope is tied to sled B, and Ayu holds its other end. She pulls the rope in hand over hand, keeping its tension at a constant value $$F$$, until the sleds meet. Treat the sleds as points.

## (a)

How far has sled A moved when the sleds meet? Give the distance in terms of $$m_A$$, $$m_B$$ and $$L$$.

## (b)

Find the speed at which the sleds approach each other just before they meet. This is the sum of their two speeds. Give it in terms of $$F$$, $$L$$, $$m_A$$ and $$m_B$$.`,
    solution: String.raw`## (a)

The rope pulls sled A toward B and sled B toward A with the same tension. These two forces are inside the system of both sleds. Nothing outside pushes the system along the ice, and it starts at rest. So its centre of mass never moves, and the sleds meet at the centre of mass.

Let sled A move a distance $$d_A$$ and sled B a distance $$d_B$$. Then

$$m_Ad_A=m_Bd_B,\qquad d_A+d_B=L.$$

$$\boxed{d_A=\frac{m_BL}{m_A+m_B}.}$$

Check: a very heavy sled B hardly moves, and then $$d_A$$ is close to $$L$$.

## (b)

Each sled feels a constant force $$F$$, so the accelerations are $$F/m_A$$ and $$F/m_B$$, toward each other. The gap closes with acceleration

$$a=\frac F{m_A}+\frac F{m_B}=\frac{F(m_A+m_B)}{m_Am_B}.$$

The gap starts at $$L$$ with closing speed zero. From $$u^2=2aL$$,

$$\boxed{u=\sqrt{\frac{2FL(m_A+m_B)}{m_Am_B}}.}$$

Energy check. Ayu pulls in a length $$L$$ of rope against tension $$F$$, so her hands do work $$FL$$. Momentum conservation gives $$m_Av_A=m_Bv_B$$, and $$u=v_A+v_B$$, so

$$v_A=\frac{m_Bu}{m_A+m_B},\qquad v_B=\frac{m_Au}{m_A+m_B}.$$

The kinetic energy is then

$$\frac12m_Av_A^2+\frac12m_Bv_B^2=\frac12\,\frac{m_Am_B}{m_A+m_B}\,u^2=FL,$$

which gives the same $$u$$.`,
    hints: {
      a: [
        String.raw`Look at both sleds as one system. Is there any horizontal force on it from outside? The rope pulls on both sleds, but it is part of the system.`,
        String.raw`No outside force and a start from rest mean the centre of mass stays where it is. So the sleds meet at the centre of mass.`,
        String.raw`Write $$m_Ad_A=m_Bd_B$$ and $$d_A+d_B=L$$, then solve for $$d_A$$.`,
      ],
      b: [
        String.raw`The rope pulls each sled with the same force $$F$$. Each sled has a constant acceleration toward the other, $$F/m_A$$ and $$F/m_B$$.`,
        String.raw`The gap between the sleds closes with an acceleration equal to the sum of the two. It starts at $$L$$ with no closing speed.`,
        String.raw`Use $$u^2=2aL$$ with $$a=F/m_A+F/m_B$$. You can check with energy: Ayu’s hands do work $$FL$$ in total.`,
      ],
    },
  },
  {
    id: "arena-rough-ramp-smooth-ramp", title: "Rough Ramp, Smooth Ramp", topic: "Mechanics", tags: ["Rolling motion", "Energy conservation", "Friction"], importedOn, original: true,
    summary: "A ball rolls down a rough ramp and then climbs a frictionless one. Find its speed and how high it gets.",
    statement: String.raw`A uniform solid ball of mass $$m$$ and radius $$r$$ is released from rest on a rough ramp, with its centre a height $$H$$ above its level on the floor. It rolls down without slipping, crosses a short horizontal floor and then climbs a second ramp that is frictionless. The ramps join the floor smoothly, so nothing is lost at the corners. The moment of inertia of the ball about its centre is $$\tfrac25mr^2$$. Ignore air resistance and rolling resistance.

## (a)

Find the speed of the ball’s centre on the floor, in terms of $$g$$ and $$H$$.

## (b)

Find the greatest height the ball’s centre gains on the frictionless ramp, measured from its level on the floor. Give it in terms of $$H$$.

## (c)

When the ball is at its highest point on the frictionless ramp, what fraction of the starting potential energy $$mgH$$ is rotational kinetic energy? Give a number.`,
    solution: String.raw`## (a)

Rolling without slipping means $$v=\omega r$$. Friction on the rough ramp is static and does no work, so mechanical energy is conserved:

$$mgH=\frac12mv^2+\frac12\left(\frac25mr^2\right)\omega^2=\frac12mv^2+\frac15mv^2=\frac7{10}mv^2.$$

$$\boxed{v=\sqrt{\frac{10gH}{7}}.}$$

## (b)

On the frictionless ramp two forces act on the ball. Gravity acts at the centre. The normal force points along a line through the centre. Neither has a torque about the centre, so nothing can change the spin. The ball keeps the angular speed $$\omega=v/r$$ all the way up, and it slides on the ramp while it spins.

Only the kinetic energy of the centre’s motion turns into height:

$$mgh=\frac12mv^2=\frac57mgH.$$

$$\boxed{h=\frac57H.}$$

The ball does not get back to its starting height, even though no energy is lost.

## (c)

At the highest point the centre is at rest for a moment and the ball still spins at $$\omega=v/r$$. Its rotational energy is

$$\frac12\left(\frac25mr^2\right)\omega^2=\frac15mv^2=\frac15m\,\frac{10gH}{7}=\frac27mgH.$$

$$\boxed{\frac27\approx0.286.}$$

The two shares add up: $$\tfrac57mgH$$ as height and $$\tfrac27mgH$$ as spin.`,
    hints: {
      a: [
        String.raw`A ball that rolls has two kinds of kinetic energy, one from the motion of its centre and one from its spin.`,
        String.raw`Rolling without slipping links them through $$v=\omega r$$. Static friction does no work, so $$mgH$$ equals the total kinetic energy.`,
        String.raw`The spin energy is $$\tfrac12\cdot\tfrac25mr^2\omega^2=\tfrac15mv^2$$. So $$mgH=\tfrac7{10}mv^2$$.`,
      ],
      b: [
        String.raw`Which forces act on the ball on the frictionless ramp? Ask whether either of them can change how fast the ball spins.`,
        String.raw`Gravity and the normal force both act along lines through the centre, so there is no torque. The spin stays the same all the way up.`,
        String.raw`Only $$\tfrac12mv^2$$ can turn into height. Set $$mgh=\tfrac12mv^2$$ with $$v$$ from part (a).`,
      ],
      c: [
        String.raw`At the highest point the centre of the ball is at rest for a moment. Is the ball still spinning?`,
        String.raw`The spin energy at the top is the same as it was on the floor, $$\tfrac15mv^2$$.`,
        String.raw`Put in $$v^2=10gH/7$$ and divide by $$mgH$$. You can also subtract the answer to part (b) from 1.`,
      ],
    },
  },
  {
    id: "arena-hosing-the-wall", title: "Hosing the Wall", topic: "Mechanics", tags: ["Projectile motion", "Kinematics"], importedOn, original: true,
    summary: "Find the aim that lets a water jet reach the highest point on a wall, and how high that point is.",
    statement: String.raw`A hose nozzle sits at ground level, a horizontal distance $$d$$ from a tall vertical wall. Water leaves the nozzle at speed $$v$$, and you can aim it at any angle $$\theta$$ above the horizontal. Treat each bit of water as a projectile and ignore air resistance. The free-fall acceleration is $$g$$. Assume $$v^2>gd$$.

## (a)

Find the value of $$\tan\theta$$ for which the jet hits the wall at the highest possible point. Give it in terms of $$v$$, $$g$$ and $$d$$.

## (b)

Find the height of that highest point, in terms of $$v$$, $$g$$ and $$d$$.

## (c)

Take $$v=14\ \mathrm{m/s}$$, $$d=10\ \mathrm m$$ and $$g=9.8\ \mathrm{m/s^2}$$. Find the height.`,
    solution: String.raw`## (a)

Water aimed at angle $$\theta$$ reaches the wall after a time $$t=d/(v\cos\theta)$$. Its height there is

$$y=v\sin\theta\,t-\frac12gt^2=d\tan\theta-\frac{gd^2}{2v^2\cos^2\theta}.$$

Use $$1/\cos^2\theta=1+\tan^2\theta$$ and write $$T=\tan\theta$$:

$$y=dT-\frac{gd^2}{2v^2}\left(1+T^2\right).$$

This is a quadratic in $$T$$ that opens downward. Its highest value is at the vertex,

$$\boxed{\tan\theta=\frac{v^2}{gd}.}$$

Aiming steeper than this makes the water come down too early. Aiming flatter wastes speed on horizontal motion. The condition $$v^2>gd$$ makes this angle steeper than $$45^\circ$$.

## (b)

Put $$T=v^2/(gd)$$ into the expression for $$y$$:

$$y_{\max}=\frac{v^2}{g}-\frac{gd^2}{2v^2}-\frac{v^2}{2g}.$$

$$\boxed{y_{\max}=\frac{v^2}{2g}-\frac{gd^2}{2v^2}.}$$

Checks. For $$d=0$$ this is $$v^2/(2g)$$, the height of water shot straight up. It falls to zero at $$d=v^2/g$$, the greatest range on level ground.

## (c)

$$\frac{v^2}{2g}=\frac{196}{19.6}\ \mathrm m=10\ \mathrm m,\qquad\frac{gd^2}{2v^2}=\frac{980}{392}\ \mathrm m=2.5\ \mathrm m.$$

$$\boxed{y_{\max}=7.5\ \mathrm m.}$$

Here $$\tan\theta=196/98=2$$, an angle of about $$63^\circ$$.`,
    hints: {
      a: [
        String.raw`First find the height at which water aimed at angle $$\theta$$ hits the wall. The time to reach the wall is $$d/(v\cos\theta)$$.`,
        String.raw`You should get $$y=d\tan\theta-gd^2/(2v^2\cos^2\theta)$$. Use $$1/\cos^2\theta=1+\tan^2\theta$$ so that only $$\tan\theta$$ appears.`,
        String.raw`Now $$y$$ is a quadratic in $$\tan\theta$$ that opens downward. Its highest value is at the vertex.`,
      ],
      b: [
        String.raw`Put the value of $$\tan\theta$$ from part (a) back into your expression for the height on the wall.`,
        String.raw`With $$T=v^2/(gd)$$, the term $$dT$$ becomes $$v^2/g$$ and the term with $$T^2$$ becomes $$v^2/(2g)$$.`,
        String.raw`Check your result at $$d=0$$. It should be the height of water shot straight up, $$v^2/(2g)$$.`,
      ],
      c: [
        String.raw`Use your result from part (b) with the numbers given.`,
        String.raw`Work out the two terms one at a time: $$v^2/(2g)$$ and $$gd^2/(2v^2)$$.`,
        String.raw`Here $$v^2=196\ \mathrm{m^2/s^2}$$, so the first term is $$10\ \mathrm m$$. The second term is smaller than that.`,
      ],
    },
  },
  {
    id: "arena-the-loading-voltmeter", title: "The Loading Voltmeter", topic: "Electromagnetism", tags: ["Ohm’s law", "Series circuits", "Electric current"], importedOn, original: true,
    summary: "A real voltmeter changes the voltage it measures. Find its reading and work back to its resistance.",
    statement: String.raw`Two equal resistors, each of resistance $$R$$, are connected in series across a battery. The battery has voltage $$V_0$$ and no internal resistance. A voltmeter has internal resistance $$R_V$$. It shows the voltage across its own terminals.

## (a)

The voltmeter is connected across one of the resistors. Find its reading in terms of $$V_0$$, $$R$$ and $$R_V$$.

## (b)

With $$V_0=9.0\ \mathrm V$$ and $$R=10\ \mathrm{k\Omega}$$, the voltmeter of part (a) reads $$4.0\ \mathrm V$$. Find $$R_V$$.

## (c)

A second, identical voltmeter is now connected across the other resistor, with the first one still in place. What does each voltmeter read, for the values of part (b)?`,
    solution: String.raw`## (a)

A real voltmeter is a resistor that shows the voltage across itself. Connected across one resistor, it makes a parallel pair with resistance

$$R_p=\frac{RR_V}{R+R_V}.$$

This pair is in series with the other resistor. The same current flows through both, so the battery voltage divides in proportion to the resistances:

$$V=V_0\,\frac{R_p}{R+R_p}=V_0\,\frac{RR_V}{R(R+R_V)+RR_V}.$$

$$\boxed{V=\frac{V_0R_V}{R+2R_V}.}$$

Check: a very large $$R_V$$ gives $$V_0/2$$, the voltage without the meter. Any real meter reads less than that.

## (b)

Write $$s=R_V/R$$. Then

$$\frac{V}{V_0}=\frac{s}{1+2s}=\frac{4.0}{9.0},$$

so $$9s=4+8s$$ and $$s=4$$.

$$\boxed{R_V=40\ \mathrm{k\Omega}.}$$

## (c)

Each resistor now has an identical voltmeter across it. The circuit is two identical parallel pairs in series, so the battery voltage divides equally between them:

$$\boxed{V=4.5\ \mathrm V\ \text{on each meter}.}$$

The value of $$R_V$$ does not matter here. With one meter, the reading was low because the meter made its half of the circuit different from the other half.`,
    hints: {
      a: [
        String.raw`A real voltmeter is a resistor. Connected across one resistor, it makes a parallel pair with it.`,
        String.raw`The pair has resistance $$R_p=RR_V/(R+R_V)$$. It is in series with the other resistor.`,
        String.raw`The battery voltage divides in proportion to resistance. The reading is $$V_0R_p/(R+R_p)$$. Simplify it.`,
      ],
      b: [
        String.raw`Use your result from part (a). The reading divided by $$V_0$$ is $$4.0/9.0$$.`,
        String.raw`Write $$s=R_V/R$$. Your result from part (a) becomes $$s/(1+2s)$$.`,
        String.raw`Solve $$s/(1+2s)=4/9$$, which gives $$9s=4+8s$$. Then multiply by $$R$$.`,
      ],
      c: [
        String.raw`Draw the new circuit. Each resistor now has the same kind of voltmeter across it.`,
        String.raw`The two halves of the circuit are identical and in series. How does the battery voltage divide between them?`,
        String.raw`Each half gets half of $$9.0\ \mathrm V$$. You do not need $$R_V$$ for this part.`,
      ],
    },
  },
  {
    id: "arena-the-magnetic-slab", title: "The Magnetic Slab", topic: "Electromagnetism", tags: ["Magnetic forces", "Charged-particle motion", "Circular motion"], importedOn, original: true,
    summary: "A charged particle enters a slab of uniform magnetic field. Find when it gets through, how far it turns and how long it takes.",
    statement: String.raw`A uniform magnetic field of strength $$B$$ fills a slab of thickness $$d$$. The field is parallel to the faces of the slab. There is no field outside. A particle of mass $$m$$ and positive charge $$q$$ enters the slab moving at right angles to its face, and at right angles to the field. Ignore gravity. Speeds are far below the speed of light.

![A slab of thickness d filled with magnetic field pointing out of the page. A particle enters at right angles to the left face, follows a circular arc and leaves through the right face at an angle to its first direction.](/corpus/arena/figures/the-magnetic-slab-statement.svg)

## (a)

A slow particle turns around inside the slab and comes back out of the face it entered. Above a certain entry speed the particle gets through to the far side. Find that speed in terms of $$q$$, $$B$$, $$d$$ and $$m$$.

## (b)

A particle enters at twice the speed of part (a). Find the angle between its velocity when it leaves the slab and its velocity when it entered. Give it in degrees.

## (c)

Find the time the particle of part (b) spends inside the slab, in terms of $$m$$, $$q$$ and $$B$$.`,
    solution: String.raw`## (a)

The magnetic force is at right angles to the velocity, so the speed stays constant and the path inside the slab is part of a circle. Its radius $$r$$ follows from

$$qvB=\frac{mv^2}{r},\qquad r=\frac{mv}{qB}.$$

The particle enters at right angles to the face, so the centre of the circle lies in the entry face. The circle reaches a depth $$r$$ into the slab at most. The particle gets through when $$r>d$$:

$$\boxed{v_{\min}=\frac{qBd}{m}.}$$

## (b)

At twice this speed, $$r=2d$$. Let the velocity turn through an angle $$\theta$$ inside the slab. The radius to the particle turns through the same angle, and the depth reached is $$r\sin\theta$$. The particle leaves at depth $$d$$:

$$\sin\theta=\frac dr=\frac12.$$

$$\boxed{\theta=30^\circ.}$$

## (c)

The particle moves round the circle at the angular rate

$$\omega=\frac vr=\frac{qB}{m},$$

which does not depend on its speed. It turns through $$\theta=30^\circ=\pi/6$$ radians, so

$$\boxed{t=\frac\theta\omega=\frac{\pi m}{6qB}.}$$

Check: the arc length is $$r\theta=2d\cdot\pi/6$$ and the speed is $$2qBd/m$$. Their ratio is the same time.`,
    hints: {
      a: [
        String.raw`The magnetic force is always at right angles to the velocity. What kind of path does that give, and what happens to the speed?`,
        String.raw`The path is a circle of radius $$r=mv/(qB)$$. The particle enters at right angles to the face, so the centre of the circle lies in that face.`,
        String.raw`The circle reaches a depth $$r$$ into the slab at most. The particle gets through when $$r$$ is larger than $$d$$.`,
      ],
      b: [
        String.raw`Twice the speed means twice the radius. So $$r=2d$$.`,
        String.raw`When the velocity has turned through an angle $$\theta$$, the particle is at a depth $$r\sin\theta$$ inside the slab. A sketch of the circle and its centre helps.`,
        String.raw`The particle leaves at depth $$d$$, so $$\sin\theta=d/r=1/2$$.`,
      ],
      c: [
        String.raw`The speed is constant on the arc. You can use arc length divided by speed, or the turning angle divided by the angular rate.`,
        String.raw`The angular rate is $$\omega=v/r=qB/m$$. It does not depend on the speed.`,
        String.raw`Use $$t=\theta/\omega$$ with the angle of part (b) in radians, $$\theta=\pi/6$$.`,
      ],
    },
  },
  {
    id: "arena-two-charges-head-on", title: "Two Charges Head On", topic: "Electromagnetism", tags: ["Electrostatics", "Collisions", "Momentum conservation", "Energy conservation"], importedOn, original: true,
    summary: "One charged bead is fired at another that is free to move. Find their closest approach and the final speeds.",
    statement: String.raw`Two small beads each carry the same positive charge $$q$$. Bead A has mass $$m$$ and bead B has mass $$3m$$. They are in empty space, very far apart, and gravity can be ignored. Bead B is at rest and free to move. Bead A is fired straight at bead B with speed $$v$$. The Coulomb constant is $$k$$, so two charges $$q$$ a distance $$r$$ apart have potential energy $$kq^2/r$$. Speeds are far below the speed of light.

## (a)

Find the speed of the beads at the moment they are closest together, in terms of $$v$$.

## (b)

Find the closest distance between the beads, in terms of $$k$$, $$q$$, $$m$$ and $$v$$.

## (c)

Find the speed of bead B a long time later, when the beads are very far apart again. Give it in terms of $$v$$.`,
    solution: String.raw`## (a)

While bead A moves faster than bead B, the gap between them shrinks. Once bead B is the faster one, the gap grows. So at the closest approach the two beads have the same velocity, $$u$$. The only forces are the ones the beads put on each other, so momentum is conserved:

$$mv=(m+3m)u.$$

$$\boxed{u=\frac v4.}$$

## (b)

The electric force is conservative. At the start the beads are very far apart and the potential energy is zero. At the closest distance $$r_{\min}$$,

$$\frac12mv^2=\frac12(4m)\left(\frac v4\right)^2+\frac{kq^2}{r_{\min}}.$$

The kinetic energy left at that moment is $$\tfrac18mv^2$$, so

$$\frac{kq^2}{r_{\min}}=\frac12mv^2-\frac18mv^2=\frac38mv^2.$$

$$\boxed{r_{\min}=\frac{8kq^2}{3mv^2}.}$$

If bead B were fixed, all of $$\tfrac12mv^2$$ would be stored and the distance would be $$2kq^2/(mv^2)$$. A free bead B keeps the beads farther apart.

## (c)

Long after, the potential energy is zero again. Momentum and kinetic energy both have their starting values, so the whole event is a head-on elastic collision between masses $$m$$ and $$3m$$. Let the final velocities be $$v_A$$ and $$v_B$$, measured along the first direction of bead A:

$$mv=mv_A+3mv_B,\qquad\frac12mv^2=\frac12mv_A^2+\frac32mv_B^2.$$

For a head-on elastic collision the speed of separation equals the speed of approach, $$v_B-v_A=v$$. With the momentum equation this gives $$v=(v_B-v)+3v_B$$.

$$\boxed{v_B=\frac v2.}$$

Bead A ends with $$v_A=-v/2$$. It comes back the way it came.`,
    hints: {
      a: [
        String.raw`Think about the gap between the beads. It shrinks while bead A is faster than bead B and grows once bead B is faster.`,
        String.raw`So at the closest approach both beads have the same velocity. Bead B is not at rest then.`,
        String.raw`Momentum is conserved because the only forces are between the beads. Write $$mv=(m+3m)u$$.`,
      ],
      b: [
        String.raw`Energy is conserved. Compare the start, where the beads are very far apart, with the moment of closest approach.`,
        String.raw`At closest approach both beads move at $$v/4$$, so the kinetic energy then is $$\tfrac12(4m)(v/4)^2=\tfrac18mv^2$$.`,
        String.raw`The rest of the starting kinetic energy is stored as $$kq^2/r$$. So $$kq^2/r=\tfrac12mv^2-\tfrac18mv^2$$.`,
      ],
      c: [
        String.raw`Long after, the beads are far apart and the potential energy is zero again. Which two quantities are back at their starting values?`,
        String.raw`Momentum and kinetic energy are both conserved from start to end. That is a head-on elastic collision between masses $$m$$ and $$3m$$.`,
        String.raw`Use $$mv=mv_A+3mv_B$$ together with $$v_B-v_A=v$$, the rule that the beads separate as fast as they approached.`,
      ],
    },
  },
  {
    id: "arena-round-the-funnel", title: "Round the Funnel", topic: "Mechanics", tags: ["Circular motion", "Newton’s laws"], importedOn, original: true,
    summary: "Two balls circle inside a smooth funnel at different heights. Find the speed, compare the periods and find when the balls line up again.",
    statement: String.raw`A smooth funnel has the shape of a cone with a vertical axis and its tip at the bottom. Its wall makes an angle $$\alpha$$ with the axis. A small ball slides without friction on the inside of the wall and moves in a horizontal circle at a height $$h$$ above the tip. A second, identical ball circles the same way round at a height $$4h$$ above the tip. The free-fall acceleration is $$g$$.

![Side view of a cone with its tip at the bottom and a vertical axis. The wall makes an angle alpha with the axis. One ball circles at height h above the tip and a second ball circles at height 4h.](/corpus/arena/figures/round-the-funnel-statement.svg)

## (a)

Find the speed of the lower ball, in terms of $$g$$ and $$h$$.

## (b)

Find the ratio of the upper ball’s period to the lower ball’s period. Give a number.

## (c)

At one moment the two balls are lined up, with the upper ball straight up the wall from the lower one. Find the time until they are next lined up like this. Give it in terms of $$h$$, $$g$$ and $$\alpha$$.`,
    solution: String.raw`## (a)

Two forces act on a ball: its weight $$mg$$ and the normal force $$N$$ from the wall. The wall makes an angle $$\alpha$$ with the vertical, so the normal force makes an angle $$\alpha$$ with the horizontal. It points inward and upward.

The ball stays at one height, so the vertical forces balance. The horizontal part of $$N$$ keeps the ball on its circle of radius $$r$$:

$$N\sin\alpha=mg,\qquad N\cos\alpha=\frac{mv^2}{r}.$$

Divide the second equation by the first:

$$\frac{v^2}{gr}=\frac{\cos\alpha}{\sin\alpha}.$$

At height $$h$$ the radius of the circle is $$r=h\tan\alpha$$, so the angle cancels:

$$v^2=gr\,\frac{\cos\alpha}{\sin\alpha}=gh.$$

$$\boxed{v=\sqrt{gh}.}$$

The speed depends on the height only, not on how wide the funnel is.

## (b)

The period is the distance round the circle divided by the speed:

$$T=\frac{2\pi r}{v}=\frac{2\pi h\tan\alpha}{\sqrt{gh}}=2\pi\tan\alpha\sqrt{\frac hg}.$$

The period grows as the square root of the height. The upper ball is four times as high, so its period is $$\sqrt4$$ times as long.

$$\boxed{\frac{T_{\mathrm{upper}}}{T_{\mathrm{lower}}}=2.}$$

## (c)

The lower ball goes round at the angular rate $$\omega=2\pi/T$$ and the upper ball at $$\omega/2$$. The lower ball gains on the upper one at the rate $$\omega-\omega/2=\omega/2$$. They are lined up again when the lower ball has gained one full turn:

$$t=\frac{2\pi}{\omega/2}=2T.$$

$$\boxed{t=4\pi\tan\alpha\sqrt{\frac hg}.}$$

In that time the lower ball goes round twice and the upper ball once.`,
    hints: {
      a: [
        String.raw`Two forces act on the ball, its weight and the normal force from the wall. Which way does the normal force point?`,
        String.raw`The normal force makes an angle $$\alpha$$ with the horizontal. Its vertical part balances the weight and its horizontal part keeps the ball on the circle: $$N\sin\alpha=mg$$ and $$N\cos\alpha=mv^2/r$$.`,
        String.raw`Divide one equation by the other and use $$r=h\tan\alpha$$ for the radius of the circle. The angle cancels.`,
      ],
      b: [
        String.raw`The period is the distance round the circle divided by the speed, $$T=2\pi r/v$$.`,
        String.raw`Both $$r$$ and $$v$$ depend on the height. Use $$r=h\tan\alpha$$ and $$v=\sqrt{gh}$$ to see how $$T$$ depends on $$h$$.`,
        String.raw`The period is proportional to $$\sqrt h$$. The upper ball is four times as high.`,
      ],
      c: [
        String.raw`The two balls go round at different rates. Which one goes round faster?`,
        String.raw`The lower ball has angular rate $$\omega=2\pi/T$$ and the upper ball has half of that. They line up again when the lower ball has gained one full turn.`,
        String.raw`The lower ball gains at the rate $$\omega/2$$, so the time is $$2\pi/(\omega/2)=2T$$, with $$T=2\pi\tan\alpha\sqrt{h/g}$$.`,
      ],
    },
  },
];
