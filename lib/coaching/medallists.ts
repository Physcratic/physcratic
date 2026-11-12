export type Medal = 'gold' | 'silver' | 'bronze' | 'hm'

export type Achievement = {
  contest: 'IPhO' | 'APhO' | 'EuPhO'
  year: string
  medal: Medal
}

export type Medallist = {
  name: string
  slug: string
  country: string
  achievements: Achievement[]
  /** Portrait file type in public/coaching/medallists, or false for the silhouette placeholder. Default 'webp'. */
  photo?: 'webp' | 'png' | false
  /** Alt text for the portrait when the default, name and country, is not what the owner asked for. */
  alt?: string
}

export const medalLabel: Record<Medal, string> = {
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
  hm: 'Honourable Mention',
}

export const countryFlagCodes: Record<string, string> = {
  India: 'in',
  Indonesia: 'id',
  Mongolia: 'mn',
  Philippines: 'ph',
  Iran: 'ir',
  Peru: 'pe',
  Japan: 'jp',
  Kyrgyzstan: 'kg',
  Pakistan: 'pk',
  'Costa Rica': 'cr',
  'Saudi Arabia': 'sa',
  Portugal: 'pt',
}

// Coach achievement records. Portraits live in public/coaching/medallists/<slug>.<photo> with a
// <slug>-cutout.webp for the slideshow. photo: false shows a silhouette until a photo is added.
export const medallists: Medallist[] = [
  { name: 'Rishit Garg', slug: 'rishit-garg', country: 'India', achievements: [{ contest: 'IPhO', year: '2026', medal: 'gold' }, { contest: 'APhO', year: '2025', medal: 'bronze' }] },
  { name: 'Kanishk', slug: 'kanishk', country: 'India', achievements: [{ contest: 'IPhO', year: '2025/2026', medal: 'gold' }, { contest: 'APhO', year: '2025', medal: 'silver' }] },
  { name: 'Abhika', slug: 'abhika-atmaja', country: 'Indonesia', achievements: [{ contest: 'IPhO', year: '2026', medal: 'silver' }, { contest: 'APhO', year: '2026', medal: 'bronze' }] },
  { name: 'Ackhava', slug: 'ackhava-malonda', country: 'Indonesia', achievements: [{ contest: 'IPhO', year: '2026', medal: 'silver' }, { contest: 'APhO', year: '2026', medal: 'gold' }] },
  { name: 'Ermuun', slug: 'ermuun-battulga', country: 'Mongolia', achievements: [{ contest: 'IPhO', year: '2026', medal: 'silver' }, { contest: 'APhO', year: '2026', medal: 'bronze' }] },
  { name: 'Reuben', slug: 'reuben-felix', country: 'Philippines', achievements: [{ contest: 'IPhO', year: '2026', medal: 'silver' }] },
  { name: 'Nima', slug: 'nima', country: 'Iran', achievements: [{ contest: 'IPhO', year: '2026', medal: 'silver' }], photo: false },
  { name: 'Angel', slug: 'angel', country: 'Peru', achievements: [{ contest: 'IPhO', year: '2026', medal: 'silver' }] },
  { name: 'Yota', slug: 'yota', country: 'Japan', achievements: [{ contest: 'IPhO', year: '2026', medal: 'silver' }], photo: false },
  { name: 'Arrow', slug: 'arrow-kristian', country: 'Indonesia', achievements: [{ contest: 'IPhO', year: '2026', medal: 'bronze' }] },
  { name: 'Juan', slug: 'juan-richie', country: 'Indonesia', achievements: [{ contest: 'IPhO', year: '2026', medal: 'bronze' }, { contest: 'APhO', year: '2026', medal: 'bronze' }] },
  { name: 'Askar', slug: 'askar-abdiev', country: 'Kyrgyzstan', achievements: [{ contest: 'IPhO', year: '2025/2026', medal: 'bronze' }, { contest: 'APhO', year: '2025', medal: 'bronze' }, { contest: 'EuPhO', year: '2026', medal: 'bronze' }] },
  { name: 'Ahmed', slug: 'ahmed-abylaev', country: 'Kyrgyzstan', achievements: [{ contest: 'IPhO', year: '2026', medal: 'bronze' }] },
  { name: 'Ali Hamdaan', slug: 'ali-hamdaan', country: 'Pakistan', achievements: [{ contest: 'IPhO', year: '2026', medal: 'bronze' }] },
  { name: 'Mohammed', slug: 'mohammed-alramil', country: 'Saudi Arabia', achievements: [{ contest: 'IPhO', year: '2026', medal: 'bronze' }, { contest: 'APhO', year: '2026', medal: 'hm' }] },
  { name: 'Ignat', slug: 'ignat-riazanov', country: 'Portugal', achievements: [{ contest: 'IPhO', year: '2026', medal: 'bronze' }], alt: 'Ignat, Physcratic coach' },
  { name: 'Daffa', slug: 'daffa-virwandy', country: 'Indonesia', achievements: [{ contest: 'IPhO', year: '2025', medal: 'bronze' }, { contest: 'APhO', year: '2025', medal: 'bronze' }] },
  { name: 'Bagas', slug: 'bagas-sibarani', country: 'Indonesia', achievements: [{ contest: 'APhO', year: '2026', medal: 'bronze' }] },
  { name: 'Santiago', slug: 'santiago-calvo', country: 'Costa Rica', achievements: [{ contest: 'IPhO', year: '2026', medal: 'hm' }] },
]

export const medallistStats = {
  count: medallists.length,
  countries: new Set(medallists.map((m) => m.country)).size,
}
