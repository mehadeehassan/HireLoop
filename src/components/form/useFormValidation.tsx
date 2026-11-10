'use client';

import { useState, type ChangeEvent } from 'react';

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function getFieldError(field: FormControl) {
  if (!field.required) return '';

  if (
    field.validity.valueMissing ||
    (field instanceof HTMLInputElement &&
      ['email', 'password', 'search', 'tel', 'text', 'url'].includes(field.type) &&
      !field.value.trim())
  ) {
    return 'This field is required.';
  }
  if (field.validity.typeMismatch) {
    return field instanceof HTMLInputElement && field.type === 'email'
      ? 'Enter a valid email address.'
      : 'Enter a valid URL.';
  }
  if (
    field.validity.tooShort &&
    (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)
  ) {
    return `Enter at least ${field.minLength} characters.`;
  }

  return '';
}

export function useFormValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateForm(form: HTMLFormElement) {
    const nextErrors: Record<string, string> = {};
    let firstInvalidField: FormControl | undefined;

    for (const element of Array.from(form.elements)) {
      if (
        !(element instanceof HTMLInputElement) &&
        !(element instanceof HTMLSelectElement) &&
        !(element instanceof HTMLTextAreaElement)
      ) {
        continue;
      }

      const error = getFieldError(element);
      if (error && element.name) {
        nextErrors[element.name] = error;
        firstInvalidField ||= element;
      }
    }

    setErrors(nextErrors);
    firstInvalidField?.focus();
    return Object.keys(nextErrors).length === 0;
  }

  function updateFieldError(event: ChangeEvent<HTMLFormElement>) {
    const field = event.target;
    if (
      (!(field instanceof HTMLInputElement) &&
        !(field instanceof HTMLSelectElement) &&
        !(field instanceof HTMLTextAreaElement)) ||
      !field.name
    ) {
      return;
    }

    const error = getFieldError(field);
    setErrors((current) => {
      if (current[field.name] === error || (!error && !current[field.name])) return current;
      const next = { ...current };
      if (error) next[field.name] = error;
      else delete next[field.name];
      return next;
    });
  }

  return { errors, validateForm, updateFieldError };
}

export function FieldError({ error, id }: { error?: string; id?: string }) {
  if (!error) return null;

  return (
    <p id={id} role="alert" className="mt-1.5 text-[11px] leading-4 text-red-400">
      {error}
    </p>
  );
}
