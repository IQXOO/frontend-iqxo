type BrandLogoProps = {
  as?: "div" | "span";
  className?: string;
};

export function BrandLogo({ as = "div", className = "" }: BrandLogoProps) {
  const Tag = as;

  return (
    <Tag className={`inline-flex items-center text-[1.05rem] font-medium tracking-[-0.01em] text-[#E8E8E8] ${className}`.trim()}>
      IQ<span className="text-[#5BC0DE]">X</span>O
    </Tag>
  );
}