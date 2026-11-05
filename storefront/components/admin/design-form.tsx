"use client";

import clsx from "clsx";
import { useActionState, useState } from "react";
import { ActionForm, Field, FormMessage, SubmitButton } from "@/components/forms";
import { removeLogo, saveShopSettings, uploadLogo } from "@/lib/actions/admin";
import { IDLE } from "@/lib/action-state";
import type { ShopSettings } from "@/lib/types";

export type DesignOption = {
  id: string;
  name: string;
  description: string;
  preview: { paper: string; ink: string; accent: string; highlight: string; font: string; sample: string };
};

/** A tiny mock storefront in the design's palette and display font. */
function Mock({ option, accent, shopName }: { option: DesignOption; accent: string | null; shopName: string }) {
  const p = option.preview;
  const a = accent ?? p.accent;
  return (
    <div aria-hidden className="overflow-hidden rounded-md border border-black/10" style={{ background: p.paper, color: p.ink }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ background: p.ink, color: p.paper }}>
        <span className="truncate text-sm font-bold" style={{ fontFamily: p.font }}>
          {shopName}
        </span>
        <span className="h-2 w-10 rounded-full opacity-40" style={{ background: p.paper }} />
      </div>
      <div className="grid grid-cols-[1.2fr_1fr] gap-3 p-3">
        <div>
          <p className="text-[1.6rem] leading-none" style={{ fontFamily: p.font }}>
            {p.sample}
          </p>
          <div className="mt-2 h-1.5 w-4/5 rounded-full opacity-25" style={{ background: p.ink }} />
          <div className="mt-1 h-1.5 w-3/5 rounded-full opacity-25" style={{ background: p.ink }} />
          <span className="mt-3 inline-block rounded px-2 py-1 text-[0.65rem] font-bold text-white" style={{ background: a }}>
            Add to cart
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="relative aspect-square rounded"
              style={{ background: i === 1 ? p.highlight : `color-mix(in srgb, ${p.ink} 10%, ${p.paper})` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DesignForm({ settings, options }: { settings: ShopSettings; options: DesignOption[] }) {
  const [state, formAction] = useActionState(saveShopSettings, IDLE);
  const [logoState, logoAction] = useActionState(uploadLogo, IDLE);
  const [theme, setTheme] = useState(settings.theme);
  const [useDefault, setUseDefault] = useState(!settings.accentColor);
  const [accent, setAccent] = useState(settings.accentColor ?? options.find((o) => o.id === settings.theme)?.preview.accent ?? "#2b3fd6");
  const [name, setName] = useState(settings.name);
  const fe = state.fieldErrors ?? {};

  return (
    <div className="space-y-10">
      <form action={formAction} className="space-y-8">
        <fieldset>
          <legend className="mb-1 text-lg font-semibold">Design</legend>
          <p className="mb-4 text-sm text-ink-soft">
            Changes the storefront&apos;s colours, fonts, home page, product cards and option labels. Products and
            orders stay as they are.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {options.map((o) => {
              const selected = theme === o.id;
              return (
                <label
                  key={o.id}
                  className={clsx(
                    "block cursor-pointer rounded-control border-2 bg-white p-3 transition focus-within:ring-2 focus-within:ring-cobalt",
                    selected ? "border-cobalt" : "border-transparent ring-1 ring-mist hover:ring-ink-faint",
                  )}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={o.id}
                    checked={selected}
                    onChange={() => {
                      setTheme(o.id);
                      if (useDefault) setAccent(o.preview.accent);
                    }}
                    className="sr-only"
                  />
                  <Mock option={o} accent={useDefault ? null : accent} shopName={name || "Shop"} />
                  <span className="mt-3 flex items-center justify-between gap-2">
                    <span className="font-semibold">{o.name}</span>
                    {selected && (
                      <span className="rounded-tag bg-cobalt px-1.5 py-0.5 text-xs font-semibold text-white">Selected</span>
                    )}
                  </span>
                  <span className="mt-1 block text-sm text-ink-soft">{o.description}</span>
                </label>
              );
            })}
          </div>
          {fe.theme && <p className="mt-2 text-sm text-signal">{fe.theme}</p>}
        </fieldset>

        <div className="grid max-w-2xl gap-5 sm:grid-cols-2">
          <Field
            label="Shop name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
            error={fe.name}
          />
          <Field
            label="Tagline"
            name="tagline"
            defaultValue={settings.tagline ?? ""}
            maxLength={160}
            hint="Shown in the footer and the page title. Optional."
            error={fe.tagline}
          />
        </div>

        <fieldset className="max-w-2xl">
          <legend className="mb-2 text-sm font-semibold">Accent colour</legend>
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="accentDefault"
                checked={useDefault}
                onChange={(e) => setUseDefault(e.target.checked)}
                className="size-4"
              />
              Use the design&apos;s default
            </label>
            <label className={clsx("inline-flex items-center gap-2 text-sm", useDefault && "opacity-50")}>
              <input
                type="color"
                name="accentColor"
                value={accent}
                onChange={(e) => {
                  setAccent(e.target.value);
                  setUseDefault(false);
                }}
                aria-label="Accent colour"
                className="h-9 w-12 cursor-pointer rounded border border-mist bg-white p-0.5"
              />
              <span className="tabular text-ink-soft">{accent}</span>
            </label>
          </div>
          <p className="mt-1 text-sm text-ink-faint">Used for buttons and links. Pick a colour dark enough for white text.</p>
          {fe.accentColor && <p className="mt-1 text-sm text-signal">{fe.accentColor}</p>}
        </fieldset>

        <div className="flex flex-wrap items-center gap-4">
          <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
            Save design
          </SubmitButton>
          <FormMessage state={state} />
        </div>
      </form>

      <section className="max-w-2xl border-t border-mist pt-8" aria-labelledby="logo-heading">
        <h2 id="logo-heading" className="text-lg font-semibold">
          Logo
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Replaces the shop name in the header. PNG with a transparent background works best (JPEG or GIF also work, up to
          2 MB).
        </p>
        {settings.logoUrl && (
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-16 items-center rounded-control bg-white px-4 ring-1 ring-mist">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={settings.logoUrl} alt={`${settings.name} logo`} className="h-10 w-auto object-contain" />
            </div>
            <ActionForm action={removeLogo}>
              <SubmitButton className="btn btn-danger btn-sm" pendingLabel="Removing…">
                Remove logo
              </SubmitButton>
            </ActionForm>
          </div>
        )}
        <form action={logoAction} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="logo-file" className="mb-1 block text-sm font-semibold">
              {settings.logoUrl ? "Replace logo" : "Upload logo"}
            </label>
            <input
              id="logo-file"
              type="file"
              name="file"
              accept="image/png,image/jpeg,image/gif"
              required
              className="block text-sm file:mr-3 file:rounded-control file:border-0 file:bg-cloud file:px-3 file:py-2 file:font-semibold"
            />
          </div>
          <SubmitButton className="btn btn-quiet" pendingLabel="Uploading…">
            Upload
          </SubmitButton>
          <FormMessage state={logoState} className="w-full" />
        </form>
      </section>
    </div>
  );
}
