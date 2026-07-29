import Image from "next/image";

export function AgroLogo({ className = "", priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/branding/agrofest-logo.png"
      alt="AgroFest"
      width={640}
      height={360}
      priority={priority}
      className={`object-contain ${className}`}
    />
  );
}
