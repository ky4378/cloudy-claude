import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-ink md:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary-text md:text-base">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  eyebrow,
  actions,
  children,
  className = "",
}: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card-surface p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-forest-600">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="mt-1 font-serif text-xl font-medium tracking-tight text-ink">
                {title}
              </h2>
            )}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-hairline bg-paper/60 px-6 py-10 text-center">
      {icon && (
        <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-sage text-forest-700">
          {icon}
        </div>
      )}
      <p className="font-serif text-lg font-medium text-ink">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-secondary-text">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
