/**
 * The owner's own difficulty ratings. They replace the calibrated estimates in lib/problem-archive.ts for the
 * problems named here, and for those problems only. Source of the first 72: Owner-set ratings, 14 November 2026.
 * Archive ratings come first, then the twelve Arena problems the owner rated on the same day. The 15 beginner
 * Arena problems follow, rated on 15 November 2026 (see below).
 */
export const ownerRatingSource = "owner-set, 14 November 2026"

const earlierOwnerRatings: Readonly<Record<string, number>> = {
  "ipho-2026-t1": 1800,
  "ipho-2026-t2": 2100,
  "ipho-2026-t3": 2100,
  "apho-2025-t1": 2000,
  "apho-2025-t2": 2400,
  "apho-2025-t3": 2100,
  "eupho-2025-t1": 1800,
  "eupho-2025-t2": 1800,
  "eupho-2025-t3": 2100,
  "ipho-2025-t1": 1900,
  "ipho-2025-t2": 2600,
  "ipho-2025-t3": 2500,
  "apho-2024-t1": 1600,
  "apho-2024-t2": 1600,
  "apho-2024-t3": 1700,
  "eupho-2024-t1": 1500,
  "eupho-2024-t2": 1950,
  "eupho-2024-t3": 2100,
  "ipho-2024-t1": 2000,
  "ipho-2024-t2": 2200,
  "ipho-2024-t3": 2400,
  "apho-2023-t1": 2200,
  "apho-2023-t2": 3000,
  "apho-2023-t3": 2850,
  "eupho-2023-t1": 1700,
  "eupho-2023-t2": 1900,
  "eupho-2023-t3": 2150,
  "ipho-2023-t1": 2500,
  "ipho-2023-t2": 2250,
  "ipho-2023-t3": 1900,
  "apho-2022-t1": 2300,
  "apho-2022-t2": 2200,
  "apho-2022-t3": 2050,
  "eupho-2022-t1": 1700,
  "eupho-2022-t2": 1500,
  "eupho-2022-t3": 1800,
  "ipho-2022-t1": 2400,
  "ipho-2022-t2": 2700,
  "ipho-2022-t3": 2800,
  "apho-2021-t1": 2800,
  "apho-2021-t2": 3600,
  "apho-2021-t3": 3050,
  "eupho-2021-t1": 2100,
  "eupho-2021-t2": 2000,
  "eupho-2021-t3": 2600,
  "ipho-2021-t1": 2200,
  "ipho-2021-t2": 2050,
  "ipho-2021-t3": 2500,
  "eupho-2020-t1": 1600,
  "eupho-2020-t2": 1750,
  "eupho-2020-t3": 2400,
  "apho-2019-t1": 2400,
  "apho-2019-t2": 2750,
  "apho-2019-t3": 2900,
  "eupho-2019-t1": 1700,
  "eupho-2019-t2": 2000,
  "eupho-2019-t3": 2000,
  "ipho-2019-t1": 2850,
  "ipho-2019-t2": 2500,
  "ipho-2019-t3": 2400,
  "arena-a-grin-and-a-wiggle": 2000,
  "arena-an-atom-with-stage-fright": 1700,
  "arena-the-bending-beam-riddle": 1900,
  "arena-the-bubble-treaty": 1550,
  "arena-the-capacitors-missing-energy": 2000,
  "arena-the-clock-in-the-racing-mirror": 1950,
  "arena-the-cosmic-kitchen": 2200,
  "arena-the-five-fold-collision": 1650,
  "arena-the-gas-with-elbows": 2100,
  "arena-the-quantum-escape-room": 1950,
  "arena-the-string-that-answered-back": 1750,
  "arena-the-three-way-wave-split": 1550,
}

/**
 * The owner's ratings for the 15 original beginner Arena problems (set F1), source "owner-set, 15 November 2026".
 * They replaced the author's targets of 14 November, which are gone from lib/problem-archive.ts.
 */
export const beginnerOwnerRatingSource = "owner-set, 15 November 2026"

export const beginnerOwnerRatings: Readonly<Record<string, number>> = {
  "arena-cat-on-a-plank": 500,
  "arena-a-lamp-under-a-raft": 600,
  "arena-two-sleds-one-rope": 600,
  "arena-ice-in-the-flask": 650,
  "arena-the-loading-voltmeter": 700,
  "arena-round-the-funnel": 700,
  "arena-two-isotopes-one-sample": 700,
  "arena-the-magnetic-slab": 800,
  "arena-the-unknown-pipe": 800,
  "arena-the-rectangular-cycle": 800,
  "arena-two-colours-one-cathode": 850,
  "arena-rough-ramp-smooth-ramp": 850,
  "arena-walking-past-two-speakers": 900,
  "arena-two-charges-head-on": 950,
  "arena-hosing-the-wall": 1000,
}

/** Every owner-set rating: the 14 November ones, then the 15 beginner Arena problems of 15 November. */
export const ownerRatings: Readonly<Record<string, number>> = { ...earlierOwnerRatings, ...beginnerOwnerRatings }
