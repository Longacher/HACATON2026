import Link from "next/link";
import type { ReactNode } from "react";
import BrandLogo from "./BrandLogo";

export function ProductIcon({ name = "spark", className = "" }: { name?: string; className?: string }) {
  const paths: Record<string, ReactNode> = {
    plus: <path d="M12 5v14M5 12h14" />,
    search: <><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></>,
    inbox: <><path d="M4 4h16v16H4z"/><path d="M4 14h4l2 3h4l2-3h4"/></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></>,
    message: <><path d="M21 11a8 8 0 0 1-8 8H7l-4 3V11a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z"/><path d="M8 9h8m-8 4h5"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2m2-17a3 3 0 0 1 0 6m1 5a5 5 0 0 1 3 5"/></>,
    home: <><path d="m3 10 9-7 9 7v11H3V10Z"/><path d="M9 21v-8h6v8"/></>,
    school: <><path d="m2 8 10-5 10 5-10 5L2 8Zm4 2v7c4 3 8 3 12 0v-7m4-2v8"/></>,
    phone: <><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4m-3 14h2"/></>,
    alert: <><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3h.01"/></>,
    scale: <><path d="M12 3v18m-5 0h10M4 7h16M6 7l-4 7h8L6 7Zm12 0-4 7h8l-4-7Z"/></>,
    briefcase: <><rect x="2" y="7" width="20" height="14" rx="3"/><path d="M8 7V3h8v4M2 12c6 4 14 4 20 0m-10 0v4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
    chart: <><path d="M3 3v18h18M7 16v-4m5 4V6m5 10V9"/></>,
    key: <><circle cx="8" cy="8" r="5"/><path d="m12 12 9 9m-4-4 3-3m-6 0 3-3"/></>,
    copy: <><rect x="8" y="8" width="13" height="13" rx="3"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
    spark: <path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6L12 2Z" />,
  };
  return <svg className={`ot-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.spark}</svg>;
}

export function PublicFrame({ children }: { children: ReactNode }) {
  return <div className="ot-public"><header className="ot-nav"><BrandLogo /><nav aria-label="Основная навигация"><Link href="/status" className="ot-nav-link">Проверить статус</Link><Link href="/submit" className="ot-button ot-button-small">Начать <ProductIcon name="arrow" /></Link></nav></header>{children}<footer className="ot-footer"><BrandLogo /><span>Можно начать с одного слова.</span><Link href="/signin">Вход для команды <ProductIcon name="arrow" /></Link></footer></div>;
}

export function PageHeading({ eyebrow, title, description, icon = "spark", children }: { eyebrow: string; title: string; description?: string; icon?: string; children?: ReactNode }) {
  return <div className="ot-page-heading"><div className="ot-heading-symbol"><ProductIcon name={icon} /></div><div><p className="ot-eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="ot-description">{description}</p>}</div>{children && <div className="ot-heading-action">{children}</div>}</div>;
}
