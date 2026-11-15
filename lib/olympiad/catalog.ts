/** Native transcriptions with checked final-answer fields. Keys stay in the server-only module. */
import bulkIds from "./bulk-native-ids.json";
export const nativeOlympiadIds = ["eupho-2018-t1", "eupho-2018-t2", "eupho-2018-t3", "ipho-2012-t2", "apho-2012-t1", "eupho-2019-t1", "eupho-2019-t2", "eupho-2019-t3", "apho-2012-t3", "eupho-2020-t1", "eupho-2020-t2", "eupho-2020-t3", ...bulkIds] as const;
export function hasOlympiadAnswerFields(id: string) { return (nativeOlympiadIds as readonly string[]).includes(id); }
export function hasSelfReviewResponses(id: string) { return bulkIds.includes(id); }

