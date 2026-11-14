import type { Competition } from "./corpus/catalog-selection"

export type OlympiadHost = Readonly<{
  country: string
  flag: string
  online?: boolean
}>

const country = (country: string, flag: string): OlympiadHost => ({ country, flag })
const hosts: Readonly<Record<Competition, Readonly<Partial<Record<number, OlympiadHost>>>>> = {
  // Official archives and special arrangements: docs/engineering/OLYMPIAD_HOST_FLAGS.md
  IPhO: {
    // Official organiser: https://ipho2026.com/ and the supplied T1 solution header
    2026: country("Colombia", "🇨🇴"),
    2004: country("South Korea", "🇰🇷"),
    2005: country("Spain", "🇪🇸"),
    2007: country("Iran", "🇮🇷"),
    2008: country("Vietnam", "🇻🇳"),
    2009: country("Mexico", "🇲🇽"),
    2010: country("Croatia", "🇭🇷"),
    2011: country("Thailand", "🇹🇭"),
    2012: country("Estonia", "🇪🇪"),
    2013: country("Denmark", "🇩🇰"),
    2014: country("Kazakhstan", "🇰🇿"),
    2015: country("India", "🇮🇳"),
    2016: country("Switzerland and Liechtenstein", "🇨🇭🇱🇮"),
    2017: country("Indonesia", "🇮🇩"),
    2018: country("Portugal", "🇵🇹"),
    2019: country("Israel", "🇮🇱"),
    2021: { ...country("Lithuania", "🇱🇹"), online: true },
    // Switzerland took over from Belarus: https://physicstoday.aip.org/news/in-last-minute-shuffle-switzerland-hosts-virtual-international-physics-olympiad
    2022: { ...country("Switzerland", "🇨🇭"), online: true },
    2023: country("Japan", "🇯🇵"),
    2024: country("Iran", "🇮🇷"),
    2025: country("France", "🇫🇷"),
  },
  APhO: {
    2006: country("Kazakhstan", "🇰🇿"),
    2009: country("Thailand", "🇹🇭"),
    2011: country("Israel", "🇮🇱"),
    2012: country("India", "🇮🇳"),
    2013: country("Indonesia", "🇮🇩"),
    2014: country("Singapore", "🇸🇬"),
    2015: country("China", "🇨🇳"),
    2016: country("Hong Kong, China", "🇭🇰"),
    2017: country("Russia", "🇷🇺"),
    2018: country("Vietnam", "🇻🇳"),
    2019: country("Australia", "🇦🇺"),
    2021: { ...country("Taiwan", "🇹🇼"), online: true },
    2022: { ...country("India", "🇮🇳"), online: true },
    2023: country("Mongolia", "🇲🇳"),
    2024: country("Malaysia", "🇲🇾"),
    2025: country("Saudi Arabia", "🇸🇦"),
  },
  EuPhO: {
    2017: country("Estonia", "🇪🇪"),
    2018: country("Russia", "🇷🇺"),
    2019: country("Latvia", "🇱🇻"),
    2020: { ...country("Estonia", "🇪🇪"), online: true },
    2021: { ...country("Estonia", "🇪🇪"), online: true },
    2022: country("Slovenia", "🇸🇮"),
    2023: country("Germany", "🇩🇪"),
    2024: country("Georgia", "🇬🇪"),
    2025: country("Bulgaria", "🇧🇬"),
  },
}

/** Only verified editions. Missing years, including future imports, have no flag. */
export function olympiadHost(competition: Competition, year: number): OlympiadHost | undefined {
  return hosts[competition][year]
}
