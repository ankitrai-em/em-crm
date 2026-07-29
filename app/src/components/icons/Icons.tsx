interface IconProps {
  size?: number;
  color?: string;
}

export function PhoneIcon({ size = 15, color = 'currentColor' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.6 10.8a15.9 15.9 0 0 0 6.6 6.6l2.2-2.2a1.6 1.6 0 0 1 1.6-.4c1.2.4 2.5.6 3.8.6a1.6 1.6 0 0 1 1.6 1.6V21a1.6 1.6 0 0 1-1.6 1.6C11.7 22.6 1.4 12.3 1.4 3.6A1.6 1.6 0 0 1 3 2h3.4A1.6 1.6 0 0 1 8 3.6c0 1.3.2 2.6.6 3.8a1.6 1.6 0 0 1-.4 1.6z" />
    </svg>
  );
}

export function MailIcon({ size = 15, color = 'currentColor' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5h18v14H3z" />
      <path d="M3 5l9 7 9-7" />
    </svg>
  );
}

export function PinIcon({ size = 15, color = 'currentColor' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.4" />
    </svg>
  );
}

export function UploadIcon({ size = 15, color = 'currentColor' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 12l7-7a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-2.8-2.8L15 8" />
    </svg>
  );
}
