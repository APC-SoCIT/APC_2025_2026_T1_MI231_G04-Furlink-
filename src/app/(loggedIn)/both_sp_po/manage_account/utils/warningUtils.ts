export const ROLE_LABELS: Record<string, string> = {
  service_provider: "Service Provider",
  pet_owner: "Pet Owner",
  both_sp_po: "Pet Owner and Service Provider",
  admin: "furlink Administrator",
};

export const formatRole = (roleKey: string) => ROLE_LABELS[roleKey] ?? (roleKey || "Pet Owner");

export const formatDateDisplay = (dateString: string) => {
  if (!dateString) return "Not set";
  const [year, month, day] = dateString.split("-");
  if (!year || !month || !day) return dateString;
  const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return dateObj.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

export const formatDateTimeDisplay = (isoString: string) => {
  if (!isoString) return "";
  const dateObj = new Date(isoString);
  return dateObj.toLocaleDateString("en-US", { 
    year: "numeric", 
    month: "long", 
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export const getMaxDobDate = () => {
  const today = new Date();
  today.setFullYear(today.getFullYear() - 13);
  return today.toISOString().split("T")[0];
};

export const formatOnboardingStatus = (status: string | null) => {
  if (!status) return "No submissions";
  switch (status.toLowerCase()) {
    case "approved":
      return "Accepted";
    case "rejected":
      return "Rejected";
    case "re-applied":
    case "reapplied":
      return "Re-application";
    case "pending":
      return "Pending for admin review";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};