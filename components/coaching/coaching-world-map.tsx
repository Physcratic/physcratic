"use client";

import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

const geographyUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const tutorLocations = [
  { country: "India", coordinates: [78.9629, 22.5937] as [number, number], tutors: "Rishit Garg, Kanishk" },
  { country: "Indonesia", coordinates: [113.9213, -0.7893] as [number, number], tutors: "Abhika, Ackhava, Arrow, Juan, Daffa, Bagas" },
  { country: "Mongolia", coordinates: [103.8467, 46.8625] as [number, number], tutors: "Ermuun" },
  { country: "Philippines", coordinates: [121.774, 12.8797] as [number, number], tutors: "Reuben" },
  { country: "Iran", coordinates: [53.688, 32.4279] as [number, number], tutors: "Nima" },
  { country: "Peru", coordinates: [-75.0152, -9.19] as [number, number], tutors: "Angel" },
  { country: "Japan", coordinates: [138.2529, 36.2048] as [number, number], tutors: "Yota" },
  { country: "Kyrgyzstan", coordinates: [74.7661, 41.2044] as [number, number], tutors: "Askar, Ahmed" },
  { country: "Pakistan", coordinates: [69.3451, 30.3753] as [number, number], tutors: "Ali Hamdaan" },
  { country: "Costa Rica", coordinates: [-83.7534, 9.7489] as [number, number], tutors: "Santiago" },
];

export function CoachingWorldMap() {
  return <div className="coaching-map-shell">
    <ComposableMap projectionConfig={{ scale: 142 }} viewBox="0 0 800 420" role="img" aria-label="World map showing where Physcratic tutors are based">
      <Geographies geography={geographyUrl}>
        {({ geographies }) => geographies.map((geography) => <Geography key={geography.rsmKey} geography={geography} fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth={0.55} />)}
      </Geographies>
      {tutorLocations.map((location) => <Marker key={location.country} coordinates={location.coordinates}>
        <circle r={5} fill="hsl(var(--accent))" stroke="hsl(var(--background))" strokeWidth={2} />
        <title>{`${location.country}: ${location.tutors}`}</title>
      </Marker>)}
    </ComposableMap>
    <ul className="sr-only" aria-label="Tutor locations">
      {tutorLocations.map((location) => <li key={location.country}>{location.country}: {location.tutors}</li>)}
    </ul>
    <p className="flex items-center gap-2 text-sm text-muted-foreground"><span className="size-2 rounded-full bg-accent" aria-hidden="true" /> Tutor locations</p>
  </div>;
}
