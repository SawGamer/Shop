"use client";

import { useActionState, useId, useState } from "react";
import { Field, FormMessage, SubmitButton } from "@/components/forms";
import { LegalText } from "@/components/legal-text";
import { IDLE } from "@/lib/action-state";
import { savePage } from "@/lib/actions/pages-admin";
import type { PageSlug } from "@/lib/types";

const MAX_BODY = 50_000;

/** Title and text of one legal page, with a live preview rendered exactly as shoppers will see it. */
export function PageEditor({ slug, title, body }: { slug: PageSlug; title: string; body: string }) {
  const [state, formAction] = useActionState(savePage.bind(null, slug), IDLE);
  const [text, setText] = useState(body);
  const [heading, setHeading] = useState(title);
  const bodyId = useId();
  const fe = state.fieldErrors ?? {};

  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <form action={formAction} className="space-y-4" noValidate>
        <Field
          label="Title"
          name="title"
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          maxLength={120}
          required
          error={fe.title}
        />
        <div>
          <label htmlFor={bodyId} className="mb-1 block text-sm font-semibold">
            Text
          </label>
          <textarea
            id={bodyId}
            name="body"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck
            rows={26}
            aria-invalid={!!fe.body}
            aria-describedby={`${bodyId}-help`}
            className="field min-h-[28rem] w-full resize-y font-mono text-sm leading-relaxed"
          />
          {fe.body && <p className="mt-1 text-sm text-signal">{fe.body}</p>}
          <p id={`${bodyId}-help`} className="mt-2 text-sm text-ink-faint">
            Write plain text. A <strong>blank line</strong> starts a new paragraph. A line that starts with{" "}
            <code className="rounded bg-cloud px-1">## </code> (two hashes and a space) is a heading. No HTML or other
            formatting is used. {text.length.toLocaleString("en-GB")} / {MAX_BODY.toLocaleString("en-GB")} characters.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
            Save page
          </SubmitButton>
          <FormMessage state={state} />
        </div>
      </form>

      <section aria-label="Preview" className="min-w-0 rounded-tag border border-mist bg-white p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-faint">Preview</p>
        <h2 className="headline mb-6 text-3xl">{heading || "Untitled"}</h2>
        <LegalText text={text} />
      </section>
    </div>
  );
}
