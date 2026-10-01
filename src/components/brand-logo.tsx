import Image from "next/image";

export default function BrandLogo({
  size = 96,
  priority = false,
  className = "",
}: {
  size?: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src="/brand/swepy-app-icon-1024.png"
      alt="Swepy"
      width={size}
      height={size}
      priority={priority}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
