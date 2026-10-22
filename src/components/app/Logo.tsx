export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="OneGuard logo" role="img">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="var(--accent)" stroke="var(--ink)" strokeWidth="4" />
      <rect x="22" y="10" width="20" height="8" rx="2" fill="var(--ink)" />
      <rect x="18" y="16" width="28" height="34" rx="9" fill="var(--primary)" stroke="var(--ink)" strokeWidth="4" />
      <ellipse cx="32" cy="52" rx="20" ry="5" fill="none" stroke="var(--ink)" strokeWidth="4" />
    </svg>
  );
}
