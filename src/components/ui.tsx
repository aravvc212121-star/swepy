import type { ReactNode, ButtonHTMLAttributes } from "react";

/* ── PageTitle ── */
export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-[20px] font-medium leading-tight mb-4" style={{ color: "#1F1A24" }}>
      {children}
    </h1>
  );
}

/* ── SectionTitle ── */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[16px] font-medium leading-tight mt-5 mb-3" style={{ color: "#1F1A24" }}>
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
      className={`bg-white rounded-[14px] p-4 ${className}`}
      style={{ border: "0.5px solid #E6DEE2" }}
    >
      {children}
    </div>
  );
}

/* ── ListCard ── */
export function ListCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="bg-white rounded-[14px] overflow-hidden"
      style={{ border: "0.5px solid #E6DEE2" }}
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
      style={!last ? { borderBottom: "0.5px solid #E6DEE2" } : undefined}
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
    secondary: "text-ink",
  };
  const bg =
    variant === "primary"
      ? { backgroundColor: "#B3295B" }
      : { backgroundColor: "#FFFFFF", border: "0.5px solid #E6DEE2" };

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
  // We use an <a> tag here, the parent page should wrap with next/link if needed
  const base =
    "h-12 rounded-[12px] px-4 text-[15px] font-medium flex items-center justify-center no-underline";
  const variants = {
    primary: "text-white",
    secondary: "",
  };
  const bg =
    variant === "primary"
      ? { backgroundColor: "#B3295B" }
      : { backgroundColor: "#FFFFFF", border: "0.5px solid #E6DEE2" };

  return (
    <a
      href={href}
      className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      style={{ ...bg, color: variant === "primary" ? "#FFFFFF" : "#1F1A24" }}
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
        backgroundColor: selected ? "#E3F4F5" : "#FFFFFF",
        border: `0.5px solid ${selected ? "#0F8B94" : "#E6DEE2"}`,
        color: selected ? "#0A5A61" : "#1F1A24",
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
