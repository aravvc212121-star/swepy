/* Inline SVG logos for Indian payment providers — small, crisp, brand-accurate */

export function GPayLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="10" fill="#F2F2F2"/>
      <g transform="translate(7,9)">
        {/* Google "G" colors */}
        <path d="M20.64 10.2c0-.63-.06-1.25-.16-1.84H11v3.48h5.38a4.6 4.6 0 01-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.17z" fill="#4285F4"/>
        <path d="M11 20c2.7 0 4.96-.89 6.62-2.42l-3.24-2.51c-.89.6-2.04.95-3.38.95-2.6 0-4.8-1.75-5.58-4.1H2.06v2.6A10 10 0 0011 20z" fill="#34A853"/>
        <path d="M5.42 11.92A6 6 0 015.1 10c0-.67.12-1.31.32-1.92V5.48H2.06A10 10 0 001 10c0 1.61.39 3.14 1.06 4.52l3.36-2.6z" fill="#FBBC05"/>
        <path d="M11 3.98c1.47 0 2.78.5 3.82 1.5l2.86-2.86C15.94 1 13.68 0 11 0A10 10 0 002.06 5.48l3.36 2.6C6.2 5.73 8.4 3.98 11 3.98z" fill="#EA4335"/>
      </g>
    </svg>
  );
}

export function PhonePeLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="10" fill="#5f259f"/>
      <g transform="translate(10,7)">
        <path d="M8.5 1L4 10h3.5L5 22l10-14h-4.5L14 1H8.5z" fill="white"/>
      </g>
    </svg>
  );
}

export function PaytmLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="10" fill="#00BAF2"/>
      <text x="18" y="22" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="11" fill="white">Pay</text>
    </svg>
  );
}

export function BhimLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="10" fill="#1C4D8C"/>
      <g transform="translate(8,6)">
        {/* Simplified BHIM logo - tricolor stripe */}
        <rect y="0" width="20" height="8" rx="2" fill="#FF9933"/>
        <rect y="8" width="20" height="8" rx="0" fill="white"/>
        <rect y="16" width="20" height="8" rx="2" fill="#138808"/>
        {/* Circle */}
        <circle cx="10" cy="12" r="3" fill="#000080"/>
      </g>
    </svg>
  );
}

export function VisaLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 36 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="22" rx="4" fill="#1A1F71"/>
      <text x="18" y="15" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="800" fontStyle="italic" fontSize="12" fill="white">VISA</text>
    </svg>
  );
}

export function MastercardLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 36 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="22" rx="4" fill="#F2F2F2"/>
      <circle cx="14" cy="11" r="6" fill="#EB001B"/>
      <circle cx="22" cy="11" r="6" fill="#F79E1B" opacity="0.8"/>
    </svg>
  );
}

export function RupayLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 36 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="22" rx="4" fill="#F2F2F2"/>
      <text x="18" y="14" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="10" fill="#F37E20">RuPay</text>
    </svg>
  );
}

export function AmexLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 36 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="22" rx="4" fill="#2671B9"/>
      <text x="18" y="15" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="10" fill="white">AMEX</text>
    </svg>
  );
}
