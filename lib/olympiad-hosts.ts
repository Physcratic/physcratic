import type { Competition } from "./corpus/catalog-selection"

export type OlympiadHost = Readonly<{
  country: string
  flags: readonly string[]
  online?: boolean
}>

const country = (country: string, flags: string): OlympiadHost => ({ country, flags: flags.split(" ") })
const hosts: Readonly<Record<Competition, Readonly<Partial<Record<number, OlympiadHost>>>>> = {
  // Official archives and special arrangements: docs/engineering/OLYMPIAD_HOST_FLAGS.md
  IPhO: {
    // Official organiser: https://ipho2026.com/ and the supplied T1 solution header
    2026: country("Colombia", "co"),
    2004: country("South Korea", "kr"),
    2005: country("Spain", "es"),
    2007: country("Iran", "ir"),
    2008: country("Vietnam", "vn"),
    2009: country("Mexico", "mx"),
    2010: country("Croatia", "hr"),
    2011: country("Thailand", "th"),
    2012: country("Estonia", "ee"),
    2013: country("Denmark", "dk"),
    2014: country("Kazakhstan", "kz"),
    2015: country("India", "in"),
    2016: country("Switzerland and Liechtenstein", "ch li"),
    2017: country("Indonesia", "id"),
    2018: country("Portugal", "pt"),
    2019: country("Israel", "il"),
    2021: { ...country("Lithuania", "lt"), online: true },
    // Switzerland took over from Belarus: https://physicstoday.aip.org/news/in-last-minute-shuffle-switzerland-hosts-virtual-international-physics-olympiad
    2022: { ...country("Switzerland", "ch"), online: true },
    2023: country("Japan", "jp"),
    2024: country("Iran", "ir"),
    2025: country("France", "fr"),
  },
  APhO: {
    2006: country("Kazakhstan", "kz"),
    2009: country("Thailand", "th"),
    2011: country("Israel", "il"),
    2012: country("India", "in"),
    2013: country("Indonesia", "id"),
    2014: country("Singapore", "sg"),
    2015: country("China", "cn"),
    2016: country("Hong Kong, China", "hk"),
    2017: country("Russia", "ru"),
    2018: country("Vietnam", "vn"),
    2019: country("Australia", "au"),
    2021: { ...country("Taiwan", "tw"), online: true },
    2022: { ...country("India", "in"), online: true },
    2023: country("Mongolia", "mn"),
    2024: country("Malaysia", "my"),
    2025: country("Saudi Arabia", "sa"),
  },
  EuPhO: {
    2017: country("Estonia", "ee"),
    2018: country("Russia", "ru"),
    2019: country("Latvia", "lv"),
    2020: { ...country("Estonia", "ee"), online: true },
    2021: { ...country("Estonia", "ee"), online: true },
    2022: country("Slovenia", "si"),
    2023: country("Germany", "de"),
    2024: country("Georgia", "ge"),
    2025: country("Bulgaria", "bg"),
  },
}

/** Flags are ISO 3166-1 codes, drawn from /flags/<code>.svg. Only verified editions. Missing years, including future imports, have no flag. */
export function olympiadHost(competition: Competition, year: number): OlympiadHost | undefined {
  return hosts[competition][year]
}
