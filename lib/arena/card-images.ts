// Short alt text for the figure on an Arena card, written for people who cannot see it. The generator
// (scripts/build-arena.ts) takes the file, width and height from the first image of each statement and refuses a
// problem that has a statement image but no entry here, or an entry here with no statement image.
export const arenaCardImageAlts: Readonly<Record<string, string>> = {
  "arena-mind-the-gap": "Lens resting on a reference surface, with ring radius and air gap labelled",
  "arena-the-bubble-treaty": "Cross sections of attached bubbles with a shared film",
  "arena-the-cosmic-kitchen": "Comoving points A and B with position vectors from O",
  "arena-the-five-fold-collision": "Particle of mass 4m moving at 0.6c toward a stationary mass m",
  "arena-the-phantom-charge": "Charged sheet, annulus and observation point P on the z-axis",
  "arena-the-string-that-answered-back": "String fixed at both ends with a force applied at x = a",
  "arena-the-clock-in-the-racing-mirror": "Camera and clock facing an approaching mirror, with light paths",
  "arena-the-dodecahedron-conspiracy": "A regular dodecahedron with pentagonal faces",
  "arena-the-quantum-escape-room": "Particle meeting a potential barrier at an angle",
  "arena-the-three-way-wave-split": "Three strings meeting at a junction",
  "arena-titans-double-take": "Sunlight, observer and rainbow cone with a 49 degree half-angle",
  "arena-a-grin-and-a-wiggle": "Rays through a graded-index cylinder, drawn twice",
  "arena-the-invisible-brake": "Moving parallel plates and gas flow through a pipe",
  "arena-the-bending-beam-riddle": "Beam with shear forces, a bent beam and a beam wave",
  "arena-the-capacitors-missing-energy": "Parallel-plate capacitor with insulating struts in a field",
  "arena-the-infinite-v": "Two charged half-planes forming a V, with a point P",
  "arena-cat-on-a-plank": "Cat on a plank that overhangs a table edge",
  "arena-the-magnetic-slab": "Charged particle bending through a magnetic slab",
  "arena-round-the-funnel": "Two balls circling at different heights inside a cone",
  "arena-the-rectangular-cycle": "Rectangular cycle on a pressure and volume diagram",
  "arena-a-lamp-under-a-raft": "Lamp under a floating raft with a ray at the critical angle",
  "arena-walking-past-two-speakers": "Listener walking away from two speakers on a vertical line",
};
