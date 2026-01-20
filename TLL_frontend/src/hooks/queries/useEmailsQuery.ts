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
  semanticSearches: () => [...emailKeys.all, "semantic-search"] as const,
  semanticSearch: (query: string) => [...emailKeys.semanticSearches(), query] as const,
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
        autoSync: true, // Auto-sync emails with embeddings in background
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
        autoSync: true, // Auto-sync emails with embeddings in background
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
 * Semantic search with vector embeddings
 * Uses hybrid search (semantic similarity + keyword matching)
 */
export const useSemanticSearchQuery = (
  query: string,
  limit = 20,
  minSimilarity = 0.5
) => {
  return useInfiniteQuery({
    queryKey: emailKeys.semanticSearch(query),
    queryFn: async ({ pageParam: _pageParam = 1 }) => {
      try {
        const result = await emailService.semanticSearch(query, {
          limit,
          minSimilarity,
        });
        return result;
      } catch (error) {
        // Return empty result on error to prevent UI crash
        console.error('[SemanticSearch] Error:', error);
        return {
          emails: [],
          pagination: {
            total: 0,
            page: 1,
            limit,
            totalPages: 0,
          },
        };
      }
    },
    getNextPageParam: (lastPage) => {
      // Semantic search currently doesn't support pagination
      // Returns single page with all results
      const { page, totalPages } = lastPage.pagination as {
        page: number;
        totalPages: number;
      };
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!query && query.length >= 3, // Only search if query has at least 3 characters
    staleTime: 60000, // Cache search results for 60 seconds
    retry: false, // Don't retry on error
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
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
 * Delete email (move to trash or permanently delete if already in trash) with optimistic updates
 */
export const useDeleteEmailMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ emailId, currentFolder }: { emailId: string; currentFolder: string }) => {
      // If email is already in Trash, permanently delete it
      const isPermanent = currentFolder === 'trash';
      return emailService.modifyEmail(emailId, {
        permanentDelete: isPermanent,
        delete: !isPermanent
      });
    },
    onMutate: async ({ emailId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: emailKeys.all });
      await queryClient.cancelQueries({ queryKey: ["kanban"] });

      // Snapshot previous values
      const previousEmails = queryClient.getQueriesData({
        queryKey: emailKeys.lists(),
      });
      const previousKanban = queryClient.getQueriesData({
        queryKey: ["kanban"],
      });

      // Optimistically remove email from list
      queryClient.setQueriesData<{
        pages: Array<{ emails: Email[]; pagination: Record<string, unknown> }>;
      }>({ queryKey: emailKeys.lists() }, (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            emails: page.emails.filter((email) => email.id !== emailId),
          })),
        };
      });

      // Optimistically remove from Kanban column queries
      queryClient.setQueriesData<{
        status: string;
        emails: Email[];
        total: number;
      }>({ queryKey: ["kanban", "column"] }, (old) => {
        if (!old?.emails) return old;
        return {
          ...old,
          emails: old.emails.filter((email) => email.id !== emailId),
          total: old.total - 1,
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
      toast.error("Khong the xoa email");
    },
    onSuccess: (_data, variables) => {
      const isPermanent = variables.currentFolder === 'trash';
      toast.success(
        isPermanent
          ? "Email da bi xoa vinh vien"
          : "Email da duoc chuyen vao Trash"
      );
    },
    onSettled: () => {
      // Invalidate to ensure eventual consistency
      queryClient.invalidateQueries({ queryKey: emailKeys.all });
      queryClient.invalidateQueries({ queryKey: emailKeys.mailboxes() });
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
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
 * Restore email from trash (untrash) with optimistic updates
 */
export const useRestoreEmailMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (emailId: string) =>
      emailService.modifyEmail(emailId, { restore: true }),
    onMutate: async (emailId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: emailKeys.all });
      await queryClient.cancelQueries({ queryKey: ["kanban"] });

      // Snapshot previous values
      const previousEmails = queryClient.getQueriesData({
        queryKey: emailKeys.lists(),
      });
      const previousKanban = queryClient.getQueriesData({
        queryKey: ["kanban"],
      });

      // Optimistically remove email from Trash list
      queryClient.setQueriesData<{
        pages: Array<{ emails: Email[]; pagination: Record<string, unknown> }>;
      }>({ queryKey: emailKeys.lists() }, (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            emails: page.emails.filter((email) => email.id !== emailId),
          })),
        };
      });

      // Optimistically remove from Kanban column queries
      queryClient.setQueriesData<{
        status: string;
        emails: Email[];
        total: number;
      }>({ queryKey: ["kanban", "column"] }, (old) => {
        if (!old?.emails) return old;
        return {
          ...old,
          emails: old.emails.filter((email) => email.id !== emailId),
          total: old.total - 1,
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
      toast.error("Không thể khôi phục email");
    },
    onSuccess: () => {
      toast.success("Email đã được khôi phục");
    },
    onSettled: () => {
      // Invalidate to ensure eventual consistency
      queryClient.invalidateQueries({ queryKey: emailKeys.all });
      queryClient.invalidateQueries({ queryKey: emailKeys.mailboxes() });
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
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
