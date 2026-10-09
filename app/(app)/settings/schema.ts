import { z } from "zod";

export type ProfileValues = {
  maxHr: number;
  restingHr: number;
  goal5kPaceSPerKm: number;
  goal10kPaceSPerKm: number;
  customDistanceKm: number | null;
  customPaceSPerKm: number | null;
  weeklyKmMin: number;
  weeklyKmMax: number;
  zoneBounds: [number, number, number, number];
};

const RESTING_MESSAGE = "Resting heart rate must be lower than max heart rate.";

function issue(message: string, path: (string | number)[]) {
  return { code: "custom" as const, message, path };
}

export const ProfileInput: z.ZodType<ProfileValues> = z
  .object({
    maxHr: z.number(),
    restingHr: z.number(),
    goal5kPaceSPerKm: z.number(),
    goal10kPaceSPerKm: z.number(),
    customDistanceKm: z.number().nullable(),
    customPaceSPerKm: z.number().nullable(),
    weeklyKmMin: z.number(),
    weeklyKmMax: z.number(),
    zoneBounds: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  })
  .superRefine((value, ctx) => {
    if (!Number.isInteger(value.maxHr) || value.maxHr < 120 || value.maxHr > 230) {
      ctx.addIssue(issue("Max heart rate must be a whole number from 120 to 230.", ["maxHr"]));
    }
    if (!(value.restingHr < value.maxHr)) {
      ctx.addIssue(issue(RESTING_MESSAGE, ["restingHr"]));
    }
    if (!Number.isInteger(value.restingHr) || value.restingHr < 30 || value.restingHr > 100) {
      ctx.addIssue(issue("Resting heart rate must be a whole number from 30 to 100.", ["restingHr"]));
    }
    if (!Number.isInteger(value.goal5kPaceSPerKm) || value.goal5kPaceSPerKm < 120 || value.goal5kPaceSPerKm > 1200) {
      ctx.addIssue(issue("5k goal pace must be between 2:00 and 20:00 per km.", ["goal5kPaceSPerKm"]));
    }
    if (!Number.isInteger(value.goal10kPaceSPerKm) || value.goal10kPaceSPerKm < 120 || value.goal10kPaceSPerKm > 1200) {
      ctx.addIssue(issue("10k goal pace must be between 2:00 and 20:00 per km.", ["goal10kPaceSPerKm"]));
    }
    const customDistance = value.customDistanceKm;
    const customPace = value.customPaceSPerKm;
    if ((customDistance == null) !== (customPace == null)) {
      ctx.addIssue(issue("Set both the custom distance and its pace, or leave both empty.", ["customDistanceKm"]));
    }
    if (customDistance != null && (customDistance < 0.5 || customDistance > 100)) {
      ctx.addIssue(issue("Custom distance must be from 0.5 to 100 km.", ["customDistanceKm"]));
    }
    if (customPace != null && (!Number.isInteger(customPace) || customPace < 120 || customPace > 1200)) {
      ctx.addIssue(issue("Custom goal pace must be between 2:00 and 20:00 per km.", ["customPaceSPerKm"]));
    }
    if (
      !Number.isInteger(value.weeklyKmMin) ||
      !Number.isInteger(value.weeklyKmMax) ||
      value.weeklyKmMin < 0 ||
      value.weeklyKmMax > 400 ||
      value.weeklyKmMin > value.weeklyKmMax
    ) {
      ctx.addIssue(issue("Weekly minimum must be at or below the weekly maximum.", ["weeklyKmMin"]));
    }
    const [a, b, c, d] = value.zoneBounds;
    const open = [a, b, c, d].every((bound) => bound > 0 && bound < 1);
    if (!open || !(a < b && b < c && c < d)) {
      ctx.addIssue(issue("Zone bounds must ascend from easy to hard.", ["zoneBounds"]));
    }
  });

export function profileFieldErrors(error: {
  flatten(): { fieldErrors: Record<string, string[] | undefined>; formErrors: string[] };
}): Record<string, string> {
  const flat = error.flatten();
  const fieldErrors: Record<string, string> = {};
  for (const [key, messages] of Object.entries(flat.fieldErrors)) {
    const message = messages?.[0];
    if (message) fieldErrors[key] = message;
  }
  const form = flat.formErrors[0];
  if (form) fieldErrors.form = form;
  return fieldErrors;
}
