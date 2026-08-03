import { z } from "zod";

const httpUrlSchema = z
  .string()
  .url()
  .refine(
    (value) => {
      try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    "A URL deve começar com http:// ou https://."
  );

export const httpUrl = z
  .union([httpUrlSchema, z.literal(""), z.null()])
  .transform((value) => value || null);