/**
 * Email utility functions
 */

/**
 * Get email preview text (strip HTML, truncate)
 */
export const getEmailPreview = (
  content: string,
  maxLength: number = 100
): string => {
  // Remove HTML tags
  const text = content.replace(/<[^>]*>/g, "");

  // Remove extra whitespace
  const cleaned = text.replace(/\s+/g, " ").trim();

  // Truncate
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return cleaned.substring(0, maxLength).trim() + "...";
};

/**
 * Format email date in Gmail style
 * - Today: "2:30 PM"
 * - Yesterday: "Yesterday"
 * - This year: "Dec 3"
 * - Older: "12/3/23"
 */
export const formatEmailDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if today
  if (date >= today) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  // Check if yesterday
  if (date >= yesterday) {
    return "Yesterday";
  }

  // Check if this year
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  // Older
  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });
};

/**
 * Parse email addresses to array
 */
export const parseEmailAddresses = (
  addresses: string | string[]
): string[] => {
  if (Array.isArray(addresses)) {
    return addresses;
  }

  if (typeof addresses === "string") {
    return addresses.split(/[,;]/).map((addr) => addr.trim()).filter(Boolean);
  }

  return [];
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
};

/**
 * Truncate text with ellipsis
 */
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
};

/**
 * Get sender name from email address
 * Extract name before @ if available
 */
export const getSenderName = (email: string): string => {
  if (!email) return "Unknown";

  // If email is "Name <email@domain.com>", extract Name
  const match = email.match(/^([^<]+)<([^>]+)>$/);
  if (match) {
    return match[1].trim();
  }

  // Otherwise return part before @
  const username = email.split("@")[0];
  return username.charAt(0).toUpperCase() + username.slice(1);
};

/**
 * Filter mode for emails
 */
export type FilterMode = "ALL" | "UNREAD" | "STARRED" | "HAS_ATTACHMENT";

/**
 * Filter emails based on selected mode
 * Used for Kanban board filtering
 */
export const filterEmails = <T extends Record<string, any>>(
  emails: T[],
  filterMode: FilterMode
): T[] => {
  switch (filterMode) {
    case "ALL":
      return emails;

    case "UNREAD":
      // Handle both 'read' (frontend type) and 'isUnread' (backend Kanban API)
      return emails.filter((email) => {
        if ('isUnread' in email) return email.isUnread === true;
        if ('read' in email) return email.read === false;
        return false;
      });

    case "STARRED":
      // Handle 'starred' field (should come from parsed email)
      return emails.filter((email) => {
        if ('starred' in email) return email.starred === true;
        // Kanban API might not have starred field - check labelIds
        if ('labelIds' in email && Array.isArray(email.labelIds)) {
          return email.labelIds.includes('STARRED');
        }
        return false;
      });

    case "HAS_ATTACHMENT":
      // Handle both 'attachments' (frontend type) and 'hasAttachment' (backend Kanban API)
      return emails.filter((email) => {
        if ('hasAttachment' in email) return email.hasAttachment === true;
        if ('attachments' in email) return email.attachments && email.attachments.length > 0;
        return false;
      });

    default:
      return emails;
  }
};

/**
 * Sort options for Kanban emails
 */
export type SortOption = "newest" | "oldest" | "sender_asc" | "sender_desc";

/**
 * Sort emails based on selected option
 * Used for Kanban board global sorting
 */
export const sortEmails = <T extends { date: Date | string; from: { name: string; email: string } }>(
  emails: T[],
  sortBy: SortOption
): T[] => {
  const emailsCopy = [...emails];

  switch (sortBy) {
    case "newest":
      // Newest first (descending by date)
      return emailsCopy.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA; // Descending
      });

    case "oldest":
      // Oldest first (ascending by date)
      return emailsCopy.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateA - dateB; // Ascending
      });

    case "sender_asc":
      // Sender A-Z (ascending)
      return emailsCopy.sort((a, b) => {
        const nameA = (a.from?.name || a.from?.email || 'Unknown').toLowerCase();
        const nameB = (b.from?.name || b.from?.email || 'Unknown').toLowerCase();
        return nameA.localeCompare(nameB);
      });

    case "sender_desc":
      // Sender Z-A (descending)
      return emailsCopy.sort((a, b) => {
        const nameA = (a.from?.name || a.from?.email || 'Unknown').toLowerCase();
        const nameB = (b.from?.name || b.from?.email || 'Unknown').toLowerCase();
        return nameB.localeCompare(nameA);
      });

    default:
      return emailsCopy;
  }
};
