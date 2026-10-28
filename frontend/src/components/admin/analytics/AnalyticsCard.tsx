import { ReactNode } from "react";

export default function AnalyticsCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-lg border border-stone-200 p-5 ${className}`}
    >
      {title && (
        <div className="mb-4">
          <h3 className="text-sm tracking-wider uppercase text-stone-500">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
