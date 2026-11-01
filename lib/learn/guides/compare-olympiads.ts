import { REVIEWER } from "../reviewer";
import { CHECK_HOST_SITE, type ArticleDraft } from "../types";

// Facts come from the fact sheet for Batch 6.1. Source ids match its S-numbers.
// Where a fact could not be confirmed, the text says to check the current host site.
export const compareOlympiads: ArticleDraft = {
  slug: "ipho-apho-eupho-differences",
  title: "IPhO, APhO and EuPhO: what is the difference?",
  description:
    "Age limits, team size, exams, medals and 2026 hosts for the three physics olympiads, with a dated and sourced comparison table.",
  updated: "2026-11-01",
  published: true,
  reviewedBy: REVIEWER,
  sources: [
    {
      id: "s1",
      title: "IPhO Statutes, Regulations, Appendices and Syllabus",
      url: "https://www.ipho-new.org/statutes-syllabus/",
      publisher: "International Physics Olympiad",
      accessed: "2026-11-01",
    },
    {
      id: "s4",
      title: "About APhO (reproduces the APhO statutes)",
      url: "https://apho2019.asi.edu.au/about/about-apho/",
      publisher: "APhO 2019 host site",
      accessed: "2026-11-01",
    },
    {
      id: "s6",
      title: "EuPhO Statutes, version 21 May 2022",
      url: "https://eupho2024.kiu.edu.ge/files/EuPhO_Statutes___v2022.pdf",
      publisher: "European Physics Olympiad (file on the EuPhO 2024 site)",
      accessed: "2026-11-01",
    },
    {
      id: "s7",
      title: "European Physics Olympiad, founding site",
      url: "https://eupho.ut.ee/",
      publisher: "eupho.ut.ee",
      accessed: "2026-11-01",
    },
    {
      id: "s2",
      title: "IPhO 2026 Newsletter 1",
      url: "https://www.uan.edu.co/images/institucion/IPhO2026/Newsletter1.pdf",
      publisher: "Universidad Antonio Nariño",
      accessed: "2026-11-01",
    },
    {
      id: "s3",
      title: "IPhO 2026 Theory Instructions",
      url: "https://olimpicos.net/files/ipho/IPhO_2026_TheoryInstructions.pdf",
      publisher: "IPhO 2026 (copy hosted on olimpicos.net)",
      accessed: "2026-11-01",
    },
    {
      id: "s5",
      title: "Vietnam ranks among top 8 teams at 26th Asian Physics Olympiad",
      url: "https://english.vtv.vn/news/vietnam-ranks-among-top-8-teams-at-26th-asian-physics-olympiad-20260525143633997.htm",
      publisher: "VTV News",
      accessed: "2026-11-01",
    },
    {
      id: "s8",
      title: "European Physics Olympiad 2026",
      url: "https://www.gu.se/en/event/european-physics-olympiad-2026",
      publisher: "University of Gothenburg",
      accessed: "2026-11-01",
    },
  ],
  body: [
    { type: "heading", level: 2, text: "The short answer" },
    {
      type: "paragraph",
      text: "The three olympiads share one age rule and a similar exam, which is a theory paper and an experimental paper. They differ most in team size and in who is invited. This guide gives the rules as of 2026 and says where we could not confirm one. Rules and dates change from year to year, so confirm anything important on the current host site. The table at the end puts the three side by side.",
    },
    { type: "heading", level: 2, text: "Who can enter" },
    {
      type: "paragraph",
      text: "IPhO. A student must not be older than 20 on June 30 of the competition year. Students must come from general or technical secondary schools. A student who finishes school that year can compete if they have not started university.",
      cite: ["s1"],
    },
    {
      type: "paragraph",
      text: "APhO. The age rule is the same as the IPhO, and so is the school rule. The APhO statutes were based on the IPhO statutes. We read them as reproduced on the APhO 2019 host site, so check the current host site for any change.",
      cite: ["s4"],
    },
    {
      type: "paragraph",
      text: "EuPhO. A student must not be older than 20 on June 30 of the competition year and must not have started university. The contest is open to European countries, which the statutes list in their Appendix A. Guest teams from other continents may attend at the organiser's discretion.",
      cite: ["s6"],
    },
    {
      type: "paragraph",
      text: "The age limit is counted on June 30, so work out your age on that date for the year you hope to compete.",
    },
    { type: "heading", level: 2, text: "Team size" },
    {
      type: "paragraph",
      text: "The IPhO normally takes up to 5 students and at most 2 leaders per team. The APhO normally takes 8 students and at most 2 leaders, which is the main difference from the IPhO. The EuPhO takes up to 5 students and a team leader.",
      cite: ["s1", "s4", "s6"],
    },
    {
      type: "paragraph",
      text: "How your country picks its team is up to your country. Ask your national olympiad organiser.",
    },
    { type: "heading", level: 2, text: "The exams" },
    {
      type: "paragraph",
      text: "IPhO. The theory exam has 3 problems, lasts 5 hours and carries 30 marks. The experimental exam has 1 or 2 problems, lasts 5 hours and carries 20 marks. The working language is English, and leaders translate the problems for their students.",
      cite: ["s1"],
    },
    {
      type: "paragraph",
      text: "APhO. There are 3 theory problems and 1 or 2 experimental problems. Each exam lasts about 5 hours. Theory carries 30 points and the experiment 20. There is at least one rest day between the two exams.",
      cite: ["s4"],
    },
    {
      type: "paragraph",
      text: "EuPhO. The theory exam has 3 problems and the experimental exam has 1 or 2. Both last 5 hours. The statutes do not fix the points.",
      cite: ["s6"],
    },
    {
      type: "paragraph",
      text: "The first EuPhO, in 2017 in Tartu and Tallinn, Estonia, did things this way. Its problems had short statements and left the solution path to the student, which is closer to research than to guided sub-questions. In 2017 the theory problems were worth 10 points each and the experiment 20 in total.",
      cite: ["s7"],
    },
    { type: "heading", level: 2, text: "How medals are awarded" },
    {
      type: "paragraph",
      text: "IPhO. Gold goes to 8% of contestants. Gold or silver goes to 25%. Any medal goes to 50%. A medal or an honourable mention goes to 67%. Each figure is rounded up.",
      cite: ["s1"],
    },
    {
      type: "paragraph",
      text: "EuPhO. The same four levels apply, but as minimums. Gold goes to at least 8% of contestants, gold or silver to at least 25%, any medal to at least 50%, and a medal or an honourable mention to at least 67%.",
      cite: ["s6"],
    },
    {
      type: "paragraph",
      text: "APhO. It awards gold, silver and bronze medals and honourable mentions. We could not confirm the current cut-offs, so check the current host site.",
      cite: ["s4"],
    },
    { type: "heading", level: 2, text: "Where and when in 2026" },
    {
      type: "paragraph",
      text: "The IPhO 2026 was held in Bucaramanga, Colombia, hosted by Universidad Antonio Nariño. The opening ceremony was on July 5, 2026, and the theory exam on July 8, 2026.",
      cite: ["s2", "s3"],
    },
    {
      type: "paragraph",
      text: "The 26th APhO was held in Busan, Korea, from May 17 to 25, 2026. It had 209 students from 28 teams.",
      cite: ["s5"],
    },
    {
      type: "paragraph",
      text: "The 10th EuPhO was held in Gothenburg, Sweden, from June 12 to 16, 2026. Chalmers University of Technology and the University of Gothenburg hosted it. About 200 students from 40 nations took part.",
      cite: ["s8"],
    },
    {
      type: "paragraph",
      text: "The host and the dates change every year. Look at the current host site before you plan.",
    },
    { type: "heading", level: 2, text: "Comparison table" },
    {
      type: "table",
      caption: "IPhO, APhO and EuPhO compared, as of 2026. Numbers in square brackets point to the sources below.",
      head: ["", "IPhO", "APhO", "EuPhO"],
      rows: [
        {
          header: "Who can enter",
          cells: [
            {
              text: "Age 20 or under on June 30 of the competition year. General or technical secondary school students who have not started university.",
              cite: ["s1"],
            },
            {
              text: "The same age and school rules as the IPhO.",
              cite: ["s4"],
            },
            {
              text: "Age 20 or under on June 30 of the competition year and not yet at university. European countries, plus guest teams at the organiser's discretion.",
              cite: ["s6"],
            },
          ],
        },
        {
          header: "Team size",
          cells: [
            { text: "Normally up to 5 students and at most 2 leaders.", cite: ["s1"] },
            { text: "Normally 8 students and at most 2 leaders.", cite: ["s4"] },
            { text: "Up to 5 students and a team leader.", cite: ["s6"] },
          ],
        },
        {
          header: "Exams",
          cells: [
            {
              text: "Theory: 3 problems, 5 hours. Experiment: 1 or 2 problems, 5 hours.",
              cite: ["s1"],
            },
            {
              text: "Theory: 3 problems. Experiment: 1 or 2 problems. About 5 hours each, with at least one rest day between.",
              cite: ["s4"],
            },
            {
              text: "Theory: 3 problems. Experiment: 1 or 2 problems. 5 hours each.",
              cite: ["s6"],
            },
          ],
        },
        {
          header: "Points",
          cells: [
            { text: "Theory 30, experiment 20.", cite: ["s1"] },
            { text: "Theory 30, experiment 20.", cite: ["s4"] },
            {
              text: "Not fixed by the statutes. At the first EuPhO in 2017, 10 per theory problem and 20 for the experiment.",
              cite: ["s6", "s7"],
            },
          ],
        },
        {
          header: "Medals",
          cells: [
            {
              text: "Gold 8%. Gold or silver 25%. Any medal 50%. Medal or honourable mention 67%. Each rounded up.",
              cite: ["s1"],
            },
            { text: CHECK_HOST_SITE },
            {
              text: "At least: gold 8%, gold or silver 25%, any medal 50%, medal or honourable mention 67%.",
              cite: ["s6"],
            },
          ],
        },
        {
          header: "Language",
          cells: [
            { text: "English. Leaders translate the problems.", cite: ["s1"] },
            { text: CHECK_HOST_SITE },
            { text: "English. Leaders translate if needed.", cite: ["s6"] },
          ],
        },
        {
          header: "2026 host and dates",
          cells: [
            {
              text: "Bucaramanga, Colombia (Universidad Antonio Nariño). Opening ceremony July 5. Theory exam July 8.",
              cite: ["s2", "s3"],
            },
            { text: "26th APhO, Busan, Korea. May 17 to 25.", cite: ["s5"] },
            {
              text: "10th EuPhO, Gothenburg, Sweden. June 12 to 16.",
              cite: ["s8"],
            },
          ],
        },
      ],
    },
  ],
};
