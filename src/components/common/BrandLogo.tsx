import Image from "next/image";
import Link from "next/link";

export default function BrandLogo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return <Link href={href} className="inline-flex items-center"><Image src={compact ? "/images/logo/logo-icon.svg" : "/images/logo/logo.svg"} alt="Отклик" width={compact ? 34 : 174} height={42} priority /></Link>;
}
