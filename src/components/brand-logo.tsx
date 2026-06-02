type BrandLogoProps = {
  as?: "div" | "span";
  className?: string;
};

export function BrandLogo({ as = "div", className = "" }: BrandLogoProps) {
  const Tag = as;

  return (
    <Tag className={`inline-flex items-center text-[1.05rem] font-medium tracking-[-0.01em] ${className}`.trim()} style={{ color: "var(--brand-foreground)" }}>
      IQ<span style={{ color: "var(--brand-accent)" }}>X</span>O
    </Tag>
  );
}