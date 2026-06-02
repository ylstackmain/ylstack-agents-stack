import { type LanguageModel } from "ai";

export function fallback(models: LanguageModel[]): LanguageModel {
  if (models.length === 0)
    throw new Error("Fallback requires at least one model");

  const combinedModelId = models.map((m) => (m as any).modelId).join(",");

  return {
    specificationVersion: "v1",
    get provider() {
      return "fallback";
    },
    get modelId() {
      return combinedModelId;
    },
    generate: async (options: any) => {
      let lastError: any;
      for (const model of models) {
        try {
          return await (model as any).generate(options);
        } catch (e) {
          console.warn(
            `[fallback] Model ${(model as any).modelId} failed, trying next...`,
            e,
          );
          lastError = e;
        }
      }
      throw lastError;
    },
    stream: async (options: any) => {
      let lastError: any;
      for (const model of models) {
        try {
          return await (model as any).stream(options);
        } catch (e) {
          console.warn(
            `[fallback] Model ${(model as any).modelId} failed, trying next...`,
            e,
          );
          lastError = e;
        }
      }
      throw lastError;
    },
  } as unknown as LanguageModel;
}
