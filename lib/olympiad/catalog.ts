/** Native transcriptions with checked final-answer fields. Keys stay in the server-only module. */
export const nativeOlympiadIds = ["eupho-2018-t1", "eupho-2018-t2", "eupho-2018-t3", "ipho-2012-t2", "apho-2012-t1"] as const;
export function hasOlympiadAnswerFields(id: string) { return (nativeOlympiadIds as readonly string[]).includes(id); }
