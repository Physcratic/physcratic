import { checkSymbolicAnswer } from "./symbolic-math";

self.onmessage = (event: MessageEvent<{ input: string; expected: string; variables: string[] }>) => {
  try {
    const accepted = checkSymbolicAnswer(event.data.input, event.data.expected, event.data.variables);
    self.postMessage({ kind: accepted ? "accepted" : "unverified" });
  } catch (error) {
    self.postMessage({ kind: "invalid", message: error instanceof Error ? error.message : "Could not read this expression." });
  }
};
