import type { ReactNode } from "react";

export interface DataCardField {
  label: ReactNode;
  value: ReactNode;
}

interface DataCardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  fields?: DataCardField[];
  leading?: ReactNode;
  actions?: ReactNode;
}

export function DataCard({ title, subtitle, fields = [], leading, actions }: DataCardProps) {
  return (
    <article className="rounded-lg border border-border bg-white p-3 sm:p-4">
      <div className="flex items-start gap-3">
        {leading ? <div className="shrink-0 pt-0.5">{leading}</div> : null}
        <div className="min-w-0 flex-1 space-y-2">
          {title ? <div className="font-semibold text-textDark">{title}</div> : null}
          {subtitle ? <div className="text-xs text-neutral">{subtitle}</div> : null}
          {fields.length > 0 ? (
            <dl className="space-y-1.5">
              {fields.map((field, index) => (
                <div key={`field-${index}`} className="flex items-start justify-between gap-3 text-sm">
                  <dt className="shrink-0 text-neutral">{field.label}</dt>
                  <dd className="min-w-0 text-right text-textDark">{field.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
        </div>
      </div>
    </article>
  );
}
