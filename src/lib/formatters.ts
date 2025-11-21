// Format KES currency
export const formatKES = (amount: number): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Format AVAX with decimals
export const formatAVAX = (amount: string | number): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${numAmount.toFixed(6)} AVAX`;
};

// Format wallet address (shorten)
export const formatAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Format timestamp to readable date
export const formatDate = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Format relative time (e.g., "2 days ago")
export const formatRelativeTime = (timestamp: number): string => {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  
  return formatDate(timestamp);
};

// Calculate days remaining
export const calculateDaysRemaining = (deadline: number): number => {
  const now = Math.floor(Date.now() / 1000);
  const diff = deadline - now;
  return Math.max(0, Math.ceil(diff / 86400));
};

// Calculate progress percentage
export const calculateProgress = (current: number, goal: number): number => {
  if (goal === 0) return 0;
  return Math.min(100, (current / goal) * 100);
};
