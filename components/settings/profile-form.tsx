"use client";

import { useState, useTransition, type FormEvent } from "react";
import { ProfileInput, profileFieldErrors, type ProfileValues } from "@/app/(app)/settings/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NumberField } from "@/components/ui/number-field";
import { formatPace } from "@/lib/format";

const field =
  "num h-11 w-28 rounded-btn border border-line bg-surface-1 px-3 text-center text-base text-ink";

const ZONE_LABELS = ["Zone 1 ends", "Zone 2 ends", "Zone 3 ends", "Zone 4 ends"] as const;

function parsePace(text: string): number | null {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(text.trim());
  if (!match) return null;
  const seconds = Number(match[1]) * 60 + Number(match[2]);
  if (seconds < 120 || seconds > 1200) return null;
  return seconds;
}

export function ProfileForm({
  initial,
  saved,
  save,
}: {
  initial: ProfileValues;
  saved: boolean;
  save(input: unknown): Promise<{ ok: true } | { ok: false; fieldErrors: Record<string, string> }>;
}) {
  const [values, setValues] = useState(initial);
  const [paceText, setPaceText] = useState(formatPace(initial.goal5kPaceSPerKm));
  const [pace10kText, setPace10kText] = useState(formatPace(initial.goal10kPaceSPerKm));
  const [customKmText, setCustomKmText] = useState(initial.customDistanceKm == null ? "" : String(initial.customDistanceKm));
  const [customPaceText, setCustomPaceText] = useState(
    initial.customPaceSPerKm == null ? "" : formatPace(initial.customPaceSPerKm),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paceError, setPaceError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setBound(index: 0 | 1 | 2 | 3, next: number) {
    const zoneBounds = [...values.zoneBounds] as ProfileValues["zoneBounds"];
    zoneBounds[index] = Math.round(next * 100) / 100;
    setValues({ ...values, zoneBounds });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pace = parsePace(paceText);
    const pace10k = parsePace(pace10kText);
    const customKmBlank = customKmText.trim() === "";
    const customPaceBlank = customPaceText.trim() === "";
    const customKm = customKmBlank ? null : Number(customKmText);
    const customPace = customPaceBlank ? null : parsePace(customPaceText);
    if (pace == null || pace10k == null || (!customPaceBlank && customPace == null)) {
      setPaceError("Use minutes and seconds, like 4:20.");
      return;
    }
    if (customKmBlank !== customPaceBlank || (customKm != null && !Number.isFinite(customKm))) {
      setPaceError("Set both the custom distance and its pace, or leave both empty.");
      return;
    }
    setPaceError(null);
    const payload: ProfileValues = {
      ...values,
      goal5kPaceSPerKm: pace,
      goal10kPaceSPerKm: pace10k,
      customDistanceKm: customKm,
      customPaceSPerKm: customPace,
    };
    const parsed = ProfileInput.safeParse(payload);
    if (!parsed.success) {
      setErrors(profileFieldErrors(parsed.error));
      return;
    }
    startTransition(async () => {
      const result = await save(parsed.data);
      setErrors(result.ok ? {} : result.fieldErrors);
    });
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {saved ? null : (
          <p className="text-base text-ink-muted">These starting numbers are not saved yet.</p>
        )}
        {errors.form ? (
          <p role="alert" className="text-base text-alert">
            {errors.form}
          </p>
        ) : null}
        <NumberField
          label="Max heart rate"
          unit="bpm"
          min={120}
          max={230}
          value={values.maxHr}
          onChange={(maxHr) => setValues({ ...values, maxHr })}
        />
        {errors.maxHr ? (
          <p role="alert" className="text-base text-alert">
            {errors.maxHr}
          </p>
        ) : null}
        <NumberField
          label="Resting heart rate"
          unit="bpm"
          min={30}
          max={100}
          value={values.restingHr}
          onChange={(restingHr) => setValues({ ...values, restingHr })}
        />
        {errors.restingHr ? (
          <p role="alert" className="text-base text-alert">
            {errors.restingHr}
          </p>
        ) : null}
        <div className="flex flex-col gap-1">
          <label htmlFor="goal-pace" className="text-[13px] text-ink-muted">
            5k goal pace
          </label>
          <div className="flex items-center gap-2">
            <input
              id="goal-pace"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              value={paceText}
              aria-invalid={paceError ? true : undefined}
              className={field}
              onChange={(event) => setPaceText(event.target.value)}
            />
            <span className="text-[13px] text-ink-muted">/km</span>
          </div>
          {paceError ? (
            <p role="alert" className="text-base text-alert">
              {paceError}
            </p>
          ) : null}
          {errors.goal5kPaceSPerKm ? (
            <p role="alert" className="text-base text-alert">
              {errors.goal5kPaceSPerKm}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="goal-10k-pace" className="text-[13px] text-ink-muted">
            10k goal pace
          </label>
          <div className="flex items-center gap-2">
            <input
              id="goal-10k-pace"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              value={pace10kText}
              className={field}
              onChange={(event) => setPace10kText(event.target.value)}
            />
            <span className="text-[13px] text-ink-muted">/km</span>
          </div>
          {errors.goal10kPaceSPerKm ? (
            <p role="alert" className="text-base text-alert">
              {errors.goal10kPaceSPerKm}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-[13px] text-ink-muted">Custom goal, optional</p>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="custom-km" className="text-[13px] text-ink-muted">
              Distance
            </label>
            <input
              id="custom-km"
              inputMode="decimal"
              autoComplete="off"
              value={customKmText}
              placeholder="21.1"
              className={field}
              onChange={(event) => setCustomKmText(event.target.value)}
            />
            <span className="text-[13px] text-ink-muted">km</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="custom-pace" className="text-[13px] text-ink-muted">
              Pace
            </label>
            <input
              id="custom-pace"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              value={customPaceText}
              placeholder="5:00"
              className={field}
              onChange={(event) => setCustomPaceText(event.target.value)}
            />
            <span className="text-[13px] text-ink-muted">/km</span>
          </div>
          {errors.customDistanceKm ? (
            <p role="alert" className="text-base text-alert">
              {errors.customDistanceKm}
            </p>
          ) : null}
        </div>
        <NumberField
          label="Weekly km minimum"
          unit="km"
          min={0}
          max={400}
          value={values.weeklyKmMin}
          onChange={(weeklyKmMin) => setValues({ ...values, weeklyKmMin })}
        />
        <NumberField
          label="Weekly km maximum"
          unit="km"
          min={0}
          max={400}
          value={values.weeklyKmMax}
          onChange={(weeklyKmMax) => setValues({ ...values, weeklyKmMax })}
        />
        {errors.weeklyKmMin ? (
          <p role="alert" className="text-base text-alert">
            {errors.weeklyKmMin}
          </p>
        ) : null}
        <div className="flex flex-col gap-4">
          <p className="text-base text-ink">Fractions of max heart rate, low to high.</p>
          {ZONE_LABELS.map((label, index) => (
            <NumberField
              key={label}
              label={label}
              unit="of max"
              min={0.01}
              max={0.99}
              step={0.01}
              value={values.zoneBounds[index] ?? 0.6}
              onChange={(next) => setBound(index as 0 | 1 | 2 | 3, next)}
            />
          ))}
          {errors.zoneBounds ? (
            <p role="alert" className="text-base text-alert">
              {errors.zoneBounds}
            </p>
          ) : null}
        </div>
        <p className="text-[13px] text-ink-muted">Distances stay in kilometres.</p>
        <Button type="submit" className="w-full" loading={pending}>
          Save profile
        </Button>
      </form>
    </Card>
  );
}
