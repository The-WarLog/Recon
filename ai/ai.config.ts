import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export function getAgentAI() {
  const provider = createOpenRouter({ apiKey: process.env.OPENROUTER });
  const model = "poolside/laguna-xs.2:free";
  return provider(model);
}
