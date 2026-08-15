import logoUrl from '../../assets/logo.png';

interface BrandLogoProps {
  size?: number;
  className?: string;
}

export function BrandLogo({ size = 64, className }: BrandLogoProps) {
  return (
    <img
      src={logoUrl}
      alt="Fla MpM"
      width={size}
      height={size}
      className={className}
    />
  );
}
