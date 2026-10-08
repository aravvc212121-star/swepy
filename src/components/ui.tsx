import type { ReactNode, ButtonHTMLAttributes } from "react";

/* ── PageTitle ── */
export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-[20px] font-medium leading-tight mb-4" style={{ color: "var(--ink)" }}>
      {children}
    </h1>
  );
}

/* ── SectionTitle ── */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[16px] font-medium leading-tight mt-5 mb-3" style={{ color: "var(--ink)" }}>
      {children}
    </h2>
  );
}

/* ── Card ── */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[14px] p-4 ${className}`}
      style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}
    >
      {children}
    </div>
  );
}

/* ── ListCard ── */
export function ListCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-[14px] overflow-hidden"
      style={{ backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" }}
    >
      {children}
    </div>
  );
}

/* ── ListCard.Row ── */
export function ListCardRow({
  children,
  onClick,
  last = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  last?: boolean;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left min-h-[48px] ${
        onClick ? "cursor-pointer no-select" : ""
      }`}
      style={!last ? { borderBottom: "0.5px solid var(--surface-border)" } : undefined}
      {...(onClick ? { "data-pressable": "" } : {})}
    >
      {children}
    </Tag>
  );
}

/* ── Button ── */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  fullWidth = false,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "h-12 rounded-[12px] px-4 text-[15px] font-medium flex items-center justify-center";
  const variants = {
    primary: "text-white",
    secondary: "",
  };
  const bg =
    variant === "primary"
      ? { backgroundColor: "var(--brand-rose)" }
      : { backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)", color: "var(--ink)" };

  return (
    <button
      className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      style={bg}
      {...props}
    >
      {children}
    </button>
  );
}

/* ── ButtonLink (for Next.js Links styled as buttons) ── */
export function ButtonLink({
  href,
  variant = "primary",
  fullWidth = false,
  children,
  className = "",
}: {
  href: string;
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const base =
    "h-12 rounded-[12px] px-4 text-[15px] font-medium flex items-center justify-center no-underline";
  const variants = {
    primary: "text-white",
    secondary: "",
  };
  const bg =
    variant === "primary"
      ? { backgroundColor: "var(--brand-rose)" }
      : { backgroundColor: "var(--surface)", border: "0.5px solid var(--surface-border)" };

  return (
    <a
      href={href}
      className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      style={{ ...bg, color: variant === "primary" ? "#FFFFFF" : "var(--ink)" }}
    >
      {children}
    </a>
  );
}

/* ── Chip ── */
export function Chip({
  children,
  selected = false,
  onClick,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[13px] font-medium"
      style={{
        backgroundColor: selected ? "var(--teal-soft)" : "var(--surface)",
        border: `0.5px solid ${selected ? "var(--teal)" : "var(--surface-border)"}`,
        color: selected ? "var(--teal-dark)" : "var(--ink)",
      }}
    >
      {children}
    </button>
  );
}

/* ── Stack: gap-3 (12px) between cards ── */
export function CardStack({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3">{children}</div>;
}
