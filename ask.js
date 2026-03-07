import { buildContext } from "./08_queryEngine.js";
import { generateAnswer } from "./09_llmResponder.js";

let History = [];

export async function askQuestion(repoId, question) {
  const context = await buildContext(question);

  const result = await generateAnswer(context, History);

  History = result.updatedHistory;

  return {
    answer: result.answer,
    usage: result.usage,
  };
}
