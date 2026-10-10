import { useId, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ActionBar, inputClass, labelClass, PageTitle, PrimaryButton, TextButton } from "../components/ui";
import { demoCoffeeShop } from "../data/demoBusiness";
import { BUSINESS_TYPE_LABELS, HALIFAX_NEIGHBOURHOODS } from "../lib/labels";
import { useStore } from "../store/useStore";
import { BUSINESS_TYPES, type BusinessProfile, type BusinessType } from "../types";

type Errors = Partial<Record<keyof BusinessProfile, string>>;

const EMPTY: BusinessProfile = { name: "", type: "coffee_shop", neighbourhood: "", description: "" };

function validate(p: BusinessProfile): Errors {
  const errors: Errors = {};
  if (!p.name.trim()) errors.name = "Enter your business name.";
  if (!p.neighbourhood) errors.neighbourhood = "Choose your neighbourhood.";
  if (p.description.trim().length < 20) errors.description = "Add a sentence or two about your shop.";
  return errors;
}

function isBusinessType(value: string): value is BusinessType {
  return (BUSINESS_TYPES as readonly string[]).includes(value);
}

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm text-red-700">
      {message}
    </p>
  );
}

function BusinessForm() {
  const saved = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const navigate = useNavigate();
  const [form, setForm] = useState<BusinessProfile>(saved ?? EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const ids = { name: useId(), type: useId(), hood: useId(), desc: useId() };

  const update = <K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const invalid = (key: keyof BusinessProfile, id: string) =>
    errors[key] ? { "aria-invalid": true, "aria-describedby": `${id}-err` } : {};

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    const first = (Object.keys(found) as (keyof BusinessProfile)[])[0];
    if (first) {
      document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setProfile({ ...form, name: form.name.trim(), description: form.description.trim() });
    navigate("/choose");
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageTitle
        title="Tell us about your shop"
        intro={
          <>
            A few details help us find who to reach and where.{" "}
            <TextButton
              onClick={() => {
                setForm(demoCoffeeShop);
                setErrors({});
              }}
            >
              Load demo: coffee shop
            </TextButton>
          </>
        }
      />

      <div className="space-y-6">
        <div>
          <label htmlFor={ids.name} className={labelClass}>
            Business name
          </label>
          <input
            id={ids.name}
            name="name"
            className={inputClass}
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            autoComplete="organization"
            {...invalid("name", ids.name)}
          />
          <FieldError id={`${ids.name}-err`} message={errors.name} />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor={ids.type} className={labelClass}>
              Type of business
            </label>
            <select
              id={ids.type}
              name="type"
              className={inputClass}
              value={form.type}
              onChange={(e) => isBusinessType(e.target.value) && update("type", e.target.value)}
            >
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {BUSINESS_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={ids.hood} className={labelClass}>
              Halifax neighbourhood
            </label>
            <select
              id={ids.hood}
              name="neighbourhood"
              className={inputClass}
              value={form.neighbourhood}
              onChange={(e) => update("neighbourhood", e.target.value)}
              {...invalid("neighbourhood", ids.hood)}
            >
              <option value="">Choose one</option>
              {HALIFAX_NEIGHBOURHOODS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <FieldError id={`${ids.hood}-err`} message={errors.neighbourhood} />
          </div>
        </div>

        <div>
          <label htmlFor={ids.desc} className={labelClass}>
            Short description
          </label>
          <p id={`${ids.desc}-hint`} className="mt-0.5 text-sm text-stone-600">
            What you sell and what makes you different.
          </p>
          <textarea
            id={ids.desc}
            name="description"
            rows={4}
            className={inputClass}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={`${ids.desc}-hint${errors.description ? ` ${ids.desc}-err` : ""}`}
          />
          <FieldError id={`${ids.desc}-err`} message={errors.description} />
        </div>
      </div>

      <ActionBar primary={<PrimaryButton type="submit">Find my customers</PrimaryButton>} />
    </form>
  );
}

export function BusinessPage() {
  const hasProfile = useStore((s) => s.profile !== null);
  // Remount after "Reset demo" so the form clears.
  return <BusinessForm key={hasProfile ? "saved" : "empty"} />;
}
