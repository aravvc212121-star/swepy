export default function Wordmark({ size = "md", inverted = false }: { size?: "sm" | "md" | "lg", inverted?: boolean }) {
  const sizeMap = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl",
  };

  return (
    <span className={`${sizeMap[size]} font-medium tracking-tight`}>
      <span className={inverted ? "text-white" : "text-brand-rose"}>swepy</span>
      <span className="text-amber inline-block w-[5px] h-[5px] rounded-full bg-amber relative -top-[2px] ml-[1px]" />
    </span>
  );
}
