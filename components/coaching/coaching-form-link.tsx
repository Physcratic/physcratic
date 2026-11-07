"use client";

import { useEffect, useState } from "react";
import { BookingButton } from "./booking-button";
import { trackConsultationClick, trackTutorClick } from "@/lib/coaching/analytics";
import { consultationHref, consultationSource, tutorFormHref, type CoachingPathway } from "@/lib/coaching/consultation";

/**
 * The one button on the consultation and tutor pages. It opens the Tally form in a new tab, with the
 * source (utm_source, else the referrer host, else "direct") added the same way the hero button does.
 */
export function CoachingFormLink({ form, pathway, label }: { form: "consultation" | "tutor"; pathway?: CoachingPathway; label: string }) {
  const [source, setSource] = useState("");
  useEffect(() => {
    setSource(consultationSource(window.location.search, document.referrer));
  }, []);
  const href = form === "tutor" ? tutorFormHref({ source }) : consultationHref({ pathway, source });
  const onClick = () => (form === "tutor" ? trackTutorClick() : trackConsultationClick(pathway ?? "none"));
  return <BookingButton href={href} label={label} onOpen={onClick} />;
}
