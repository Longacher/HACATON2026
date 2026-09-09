export default function FullWidthPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="ot-public">{children}</div>;
}
