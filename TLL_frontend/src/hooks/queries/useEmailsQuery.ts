import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { emailService } from "../../services/email.service";
import type { Email } from "../../types/email.types";

// Query Keys
export const emailKeys = {
  all: ["emails"] as const,
  lists: () => [...emailKeys.all, "list"] as const,
  list: (folder: string, search: string) =>
    [...emailKeys.lists(), { folder, search }] as const,
  searches: () => [...emailKeys.all, "search"] as const,
  search: (query: string) => [...emailKeys.searches(), query] as const,
  details: () => [...emailKeys.all, "detail"] as const,
  detail: (id: string) => [...emailKeys.details(), id] as const,
  mailboxes: () => ["mailboxes"] as const,
};

/**
 * Fetch emails with pagination (Folder browsing only - NO SEARCH)
 * Search is handled by separate useSearchEmailsQuery hook
 */
export const useEmailsQuery = (folder: string, limit = 20) => {
  return useQuery({
    queryKey: emailKeys.list(folder, ""),
    queryFn: async () => {
      const result = await emailService.getEmails({
        folder,
        // NO SEARCH PARAMETER
        page: 1,
        limit,
      });
      return result;
    },
    enabled: !!folder, // Only fetch when folder is set
  });
};

/**
 * Infinite scroll query for emails (Folder browsing only - NO SEARCH)
 * Search is handled by separate useSearchEmailsQuery hook
 */
export const useInfiniteEmailsQuery = (
  folder: string,
  limit = 20
) => {
  return useInfiniteQuery({
    queryKey: emailKeys.list(folder, ""),
    queryFn: async ({ pageParam = 1 }) => {
      const result = await emailService.getEmails({
        folder,
        // NO SEARCH PARAMETER - folder browsing only
        page: pageParam,
        limit,
      });
      return result;
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination as { page: number; totalPages: number };
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!folder,
  });
};

/**
 * Search emails with fuzzy matching (infinite scroll)
 */
export const useSearchEmailsQuery = (query: string, limit = 20) => {
  return useInfiniteQuery({
    queryKey: emailKeys.search(query),
    queryFn: async ({ pageParam = 1 }) => {
      const result = await emailService.searchEmails(query, {
        page: pageParam,
        limit,
      });
      return result;
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination as { page: number; totalPages: number };
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!query && query.length >= 3, // Only search if query has at least 3 characters
    staleTime: 30000, // Cache search results for 30 seconds
  });
};

/**
 * Fetch single email detail
 */
export const useEmailDetailQuery = (emailId: string | null) => {
  return useQuery({
    queryKey: emailKeys.detail(emailId || ""),
    queryFn: () => emailService.getEmailById(emailId!),
    enabled: !!emailId,
  });
};

/**
 * Fetch mailboxes with counts
 */
export const useMailboxesQuery = () => {
  return useQuery({
    queryKey: emailKeys.mailboxes(),
    queryFn: () => emailService.getMailboxes(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Mark email as read/unread
 */
export const useMarkEmailReadMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      emailId,
      read,
    }: {
      emailId: string;
      read: boolean;
    }) => {
      await emailService.modifyEmail(emailId, { markAsRead: read });
      return { emailId, read };
    },
    onMutate: async ({ emailId, read }) => {
      // Cancel all outgoing refetches for emails and kanban
      await queryClient.cancelQueries({ queryKey: emailKeys.all });
      await queryClient.cancelQueries({ queryKey: ["kanban"] });

      // Snapshot previous values
      const previousEmails = queryClient.getQueriesData({
        queryKey: emailKeys.lists(),
      });
      const previousKanban = queryClient.getQueriesData({
        queryKey: ["kanban"],
      });

      // Optimistically update for infinite query (folder view)
      queryClient.setQueriesData<{
        pages: Array<{ emails: Email[]; pagination: Record<string, unknown> }>;
      }>({ queryKey: emailKeys.lists() }, (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            emails: page.emails.map((email) =>
              email.id === emailId ? { ...email, read } : email
            ),
          })),
        };
      });

      // Optimistically update for Kanban column queries
      queryClient.setQueriesData<{
        status: string;
        emails: Email[];
        total: number;
      }>({ queryKey: ["kanban", "column"] }, (old) => {
        if (!old?.emails) return old;
        return {
          ...old,
          emails: old.emails.map((email) =>
            email.id === emailId ? { ...email, read } : email
          ),
        };
      });

      return { previousEmails, previousKanban };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousEmails) {
        context.previousEmails.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousKanban) {
        context.previousKanban.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error("Failed to update email status");
    },
    onSuccess: () => {
      // Only invalidate mailbox counts (not emails themselves - optimistic update is enough)
      queryClient.invalidateQueries({ queryKey: emailKeys.mailboxes() });
    },
    onSettled: () => {
      // After mutation completes, invalidate in background for eventual consistency
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["kanban"], refetchType: "none" });
      }, 1000);
    },
  });
};

/**
 * Star/unstar email
 */
export const useStarEmailMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      emailId,
      starred,
    }: {
      emailId: string;
      starred: boolean;
    }) => {
      await emailService.modifyEmail(emailId, { star: starred });
      return { emailId, starred };
    },
    onMutate: async ({ emailId, starred }) => {
      // Cancel all outgoing refetches for emails and kanban
      await queryClient.cancelQueries({ queryKey: emailKeys.all });
      await queryClient.cancelQueries({ queryKey: ["kanban"] });
      
      // Snapshot previous values
      const previousEmails = queryClient.getQueriesData({
        queryKey: emailKeys.lists(),
      });
      const previousKanban = queryClient.getQueriesData({
        queryKey: ["kanban"],
      });

      // Optimistically update for infinite query (folder view)
      queryClient.setQueriesData<{
        pages: Array<{ emails: Email[]; pagination: Record<string, unknown> }>;
      }>({ queryKey: emailKeys.lists() }, (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            emails: page.emails.map((email) =>
              email.id === emailId ? { ...email, starred } : email
            ),
          })),
        };
      });

      // Optimistically update for Kanban column queries
      queryClient.setQueriesData<{
        status: string;
        emails: Email[];
        total: number;
      }>({ queryKey: ["kanban", "column"] }, (old) => {
        if (!old?.emails) return old;
        return {
          ...old,
          emails: old.emails.map((email) =>
            email.id === emailId ? { ...email, starred } : email
          ),
        };
      });

      return { previousEmails, previousKanban };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousEmails) {
        context.previousEmails.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousKanban) {
        context.previousKanban.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error("Failed to update starred status");
    },
    onSuccess: (data) => {
      // Only invalidate mailbox counts (not emails themselves - optimistic update is enough)
      queryClient.invalidateQueries({ queryKey: emailKeys.mailboxes() });
      
      // Don't invalidate immediately - trust optimistic update
      // Queries will refetch naturally when they become stale
      toast.success(data.starred ? "Email starred" : "Email unstarred");
    },
    onSettled: () => {
      // After mutation completes (success or error), invalidate in background
      // This ensures eventual consistency without disrupting UX
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["kanban"], refetchType: "none" });
      }, 1000);
    },
  });
};

/**
 * Delete email (move to trash)
 */
export const useDeleteEmailMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (emailId: string) =>
      emailService.modifyEmail(emailId, { delete: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.all });
      queryClient.invalidateQueries({ queryKey: emailKeys.mailboxes() });
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
      toast.success("Email moved to trash");
    },
    onError: () => {
      toast.error("Failed to delete email");
    },
  });
};

/**
 * Move email to different folder/status (for Kanban)
 */
export const useMoveEmailMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      emailId,
      folder,
    }: {
      emailId: string;
      folder: string;
    }) => {
      await emailService.moveEmail(emailId, folder);
      return { emailId, folder };
    },
    onMutate: async ({ emailId, folder }) => {
      await queryClient.cancelQueries({ queryKey: emailKeys.all });
      const previousEmails = queryClient.getQueriesData({
        queryKey: emailKeys.lists(),
      });

      // Optimistically update for infinite query
      queryClient.setQueriesData<{
        pages: Array<{ emails: Email[]; pagination: Record<string, unknown> }>;
      }>({ queryKey: emailKeys.lists() }, (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            emails: page.emails.map((email) =>
              email.id === emailId
                ? {
                    ...email,
                    folder: folder as Email["folder"],
                  }
                : email
            ),
          })),
        };
      });

      return { previousEmails };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousEmails) {
        context.previousEmails.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error("Failed to move email");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.mailboxes() });
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
      toast.success("Email moved successfully");
    },
  });
};

/**
 * Send email
 */
export const useSendEmailMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: emailService.sendEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.all });
      queryClient.invalidateQueries({ queryKey: emailKeys.mailboxes() });
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
      toast.success("Email sent successfully");
    },
    onError: () => {
      toast.error("Failed to send email");
    },
  });
};
