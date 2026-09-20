export const formatDateDisplay = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const formatTimeDisplay = (timeStr: string) => {
  if (!timeStr) return '';
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;

  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  }

  return timeStr;
};

export const formatStatusLabel = (status: string) => {
  if (status === 'to_refund') return 'TO REFUND';
  return status.replace(/_/g, ' ').toUpperCase();
};

export const getStatusCssClass = (status: string) => {
  return status.replace(/\s+/g, '-').toLowerCase();
};