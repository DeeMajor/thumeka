"use client";

import { useState } from "react";

/**
 * Common email-domain misspellings that lead to bounces. Lowercased key →
 * corrected domain. Static map keeps it cheap; extend as patterns show
 * up in the Resend dashboard.
 */
const COMMON_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmail.co": "gmail.com",
  "yhaoo.com": "yahoo.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "outloook.com": "outlook.com",
  "outlok.com": "outlook.com",
  "hotnail.com": "hotmail.com",
  "hitmail.com": "hotmail.com",
  "iclpud.com": "icloud.com",
  "iclud.com": "icloud.com",
  "live.co": "live.com"
};

function suggestCorrection(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return null;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const correctedDomain = COMMON_TYPOS[domain];
  if (!correctedDomain) return null;
  return `${local}@${correctedDomain}`;
}

type EmailInputProps = {
  defaultValue?: string;
  className?: string;
  id?: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  "data-testid"?: string;
};

/**
 * Email input with a "Did you mean?" hint for common domain typos.
 *
 * The hint appears on blur when the typed domain matches a known
 * misspelling (gmial.com, yhaoo.com, etc.). Tapping the suggestion
 * fills the corrected value into the field and clears the hint.
 * No suggestion = no UI surface — silent when the address looks fine.
 *
 * Server-side `validateEmail()` is still the authority; this is just
 * a client-side nudge to catch typos before submit.
 */
export function EmailInput({
  defaultValue = "",
  className = "input",
  id,
  name,
  required,
  placeholder,
  autoComplete,
  ...rest
}: EmailInputProps) {
  const [value, setValue] = useState(defaultValue);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  function onBlur() {
    setSuggestion(suggestCorrection(value));
  }

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    setValue(event.target.value);
    // Clear stale suggestion while the user keeps typing — recomputed
    // on the next blur.
    if (suggestion) setSuggestion(null);
  }

  function applySuggestion() {
    if (!suggestion) return;
    setValue(suggestion);
    setSuggestion(null);
  }

  return (
    <div className="space-y-1">
      <input
        autoComplete={autoComplete}
        className={className}
        data-testid={rest["data-testid"]}
        id={id}
        name={name}
        onBlur={onBlur}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        type="email"
        value={value}
      />
      {suggestion ? (
        <p className="text-caption text-sunset" data-testid="email-suggestion">
          Did you mean{" "}
          <button
            className="font-semibold underline"
            data-testid="email-suggestion-apply"
            onClick={applySuggestion}
            type="button"
          >
            {suggestion}
          </button>
          ?
        </p>
      ) : null}
    </div>
  );
}
