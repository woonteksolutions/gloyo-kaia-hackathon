/**
 * Currency and number formatting utilities
 */
export const formatCurrency = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  }).format(num);
};

/**
 * Format duration in seconds to human readable format
 */
export const formatDuration = (seconds?: number): string => {
  if (!seconds) return 'Unknown';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
};

/**
 * Format address for display (6 chars + ... + 4 chars)
 */
export const formatAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};