import React from "react";
import { useMutation, useQuery, useQueryClient, useInfiniteQuery, useQueries } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { kanbanService } from "../../services/kanban.service";
import { KanbanEmailStatus, type KanbanEmailStatusType } from "../../types/kanban.types";

// Query Keys
export const kanbanKeys = {
  all: ["kanban"] as const,
  emails: (folder: string, search: string) => [...kanbanKeys.all, "emails", { folder, search }] as const,
  summary: (emailId: string) => [...kanbanKeys.all, "summary", emailId] as const,
  snoozed: () => [...kanbanKeys.all, "snoozed"] as const,
};

/**
 * Maps lowercase folder names to uppercase Kanban status enum values
 */
const folderToStatus = (folder: string): KanbanEmailStatusType => {
  const folderMap: Record<string, KanbanEmailStatusType> = {
    inbox: KanbanEmailStatus.INBOX,
    todo: KanbanEmailStatus.TODO,
    "in-progress": KanbanEmailStatus.IN_PROGRESS,
    done: KanbanEmailStatus.DONE,
    snoozed: KanbanEmailStatus.SNOOZED,
  };

  return folderMap[folder.toLowerCase()] || KanbanEmailStatus.INBOX;
};

/**
 * Fetch Kanban emails with metadata (status, snoozeUntil, aiSummary)
 */
export const useKanbanEmailsQuery = (folder: string, search: string, limit = 20) => {
  return useInfiniteQuery({
    queryKey: kanbanKeys.emails(folder, search),
    queryFn: async ({ pageParam = 1 }) => {
      const status = folderToStatus(folder);
      const result = await kanbanService.getKanbanEmails({
        status,
        page: pageParam,
        limit,
      });
      return result;
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.pagination.nextPageToken) {
        return pages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!folder,
  });
};

/**
 * Fetch ALL Kanban columns data using column IDs
 * Use this for Kanban board view to populate all columns at once
 * Supports pagination with incremental load more (only fetches new pages)
 */
export const useAllKanbanColumnsQuery = (
  columns: { id: string; status: KanbanEmailStatusType }[],
  limit = 20
) => {
  const queryClient = useQueryClient();

  // Ensure columns is always an array to prevent undefined errors
  const safeColumns = columns || [];

  // Track pages by columnId
  const [pages, setPages] = React.useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    safeColumns.forEach((col) => {
      initial[col.id] = 1;
    });
    return initial;
  });

  // Fetch all columns in parallel using columnId (if UUID) or status (for legacy columns)
  // Use useQueries to avoid hook order violations
  const queries = useQueries({
    queries: safeColumns.map((column) => ({
      queryKey: [...kanbanKeys.all, "column", column.id, pages[column.id] || 1],
      queryFn: async () => {
        const currentPage = pages[column.id] || 1;

        // Get existing data from previous page (page - 1)
        const previousPageData = currentPage > 1
          ? queryClient.getQueryData<{
            columnId: string;
            emails: any[];
            total: number;
            currentPage: number;
            hasMore: boolean;
          }>([...kanbanKeys.all, "column", column.id, currentPage - 1])
          : null;

        // If loading page > 1, fetch only the new page and append
        if (previousPageData && currentPage > 1) {
          // Fetch only the new page using status from localStorage
          const newPageResult = await kanbanService.getKanbanEmails({
            status: column.status,
            page: currentPage,
            limit
          });

          const total = typeof newPageResult.pagination.total === 'number'
            ? newPageResult.pagination.total
            : 0;

          // Append new emails to existing ones
          const allEmails = [...previousPageData.emails, ...newPageResult.emails];

          return {
            columnId: column.id,
            emails: allEmails,
            total,
            currentPage,
            hasMore: allEmails.length < total,
          };
        }

        // Initial load (page 1) - fetch only first page using status from localStorage
        const result = await kanbanService.getKanbanEmails({
          status: column.status,
          page: 1,
          limit
        });

        const total = typeof result.pagination.total === 'number'
          ? result.pagination.total
          : 0;

        return {
          columnId: column.id,
          emails: result.emails,
          total,
          currentPage: 1,
          hasMore: result.emails.length < total,
        };
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    })),
  });

  // Load more function - increments page for ALL columns
  const loadMore = React.useCallback(() => {
    if (!queries || queries.length === 0) return;

    setPages((prev) => {
      const newPages = { ...prev };
      safeColumns.forEach((column) => {
        const columnData = queries.find(q => q.data?.columnId === column.id)?.data;
        // Only increment if has more data
        if (columnData?.hasMore) {
          newPages[column.id] = (prev[column.id] || 1) + 1;
        }
      });
      return newPages;
    });
  }, [queries, safeColumns]);

  // Combine results - now keyed by columnId instead of status
  const isLoading = queries?.some((q) => q.isLoading) ?? true;
  const isError = queries?.some((q) => q.isError) ?? false;
  const allEmails = queries?.flatMap((q) => q.data?.emails || []) ?? [];
  const columnData = queries?.reduce((acc, q) => {
    if (q.data) {
      acc[q.data.columnId] = {
        emails: q.data.emails,
        total: typeof q.data.total === 'number' ? q.data.total : 0,
        hasMore: q.data.hasMore || false,
      };
    }
    return acc;
  }, {} as Record<string, { emails: any[]; total: number; hasMore: boolean }>) ?? {};

  const hasMoreAny = queries?.some((q) => q.data?.hasMore) ?? false;

  return {
    isLoading,
    isError,
    allEmails,
    columnData,
    loadMore,
    hasMore: hasMoreAny,
    refetch: () => queries.forEach((q) => q.refetch()),
  };
};

/**
 * Get cached AI summary for an email
 */
export const useEmailSummaryQuery = (emailId: string | null, enabled = true) => {
  return useQuery({
    queryKey: emailId ? kanbanKeys.summary(emailId) : ["kanban", "summary", "null"],
    queryFn: () => kanbanService.summarizeEmail(emailId!, undefined),
    enabled: !!emailId && enabled,
    staleTime: 24 * 60 * 60 * 1000, // Cache 24 hours
    retry: 1,
  });
};

/**
 * Generate new AI summary (or regenerate)
 */
export const useGenerateSummaryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ emailId, text }: { emailId: string; text?: string }) =>
      kanbanService.summarizeEmail(emailId, text),
    onSuccess: (data, variables) => {
      // Update cache
      queryClient.setQueryData(kanbanKeys.summary(variables.emailId), data);
      toast.success("AI Summary generated!");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Failed to generate summary";
      toast.error(message);
    },
  });
};

/**
 * Update email status (for Kanban column moves)
 * Uses optimistic updates for smooth UX
 * Status comes from localStorage column configuration
 */
export const useUpdateStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      emailId,
      status,
      gmailLabelId,
      previousGmailLabelId,
    }: {
      emailId: string;
      status: string;
      gmailLabelId?: string | null;
      previousGmailLabelId?: string | null;
      targetColumnId?: string;
    }) =>
      kanbanService.updateStatus(emailId, status, gmailLabelId, previousGmailLabelId),

    // Optimistic Update
    onMutate: async ({ emailId, status, targetColumnId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: kanbanKeys.all });

      // Snapshot previous state
      const previousData: Map<string, any> = new Map();

      // Get all column queries
      const queryFilter = { queryKey: [...kanbanKeys.all, "column"] };
      const allColumnQueries = queryClient.getQueriesData(queryFilter);

      // Save previous data for rollback
      allColumnQueries.forEach(([queryKey, data]) => {
        previousData.set(JSON.stringify(queryKey), data);
      });

      // Find the email to move
      let emailToMove: any = null;
      let sourceColumnId: string | null = null;


      // 1. Remove from source column
      allColumnQueries.forEach(([queryKey, data]) => {
        // queryKey is ['kanban', 'column', columnId, page]
        // We need to check if this query has the email

        if (!data) return;

        const oldData = data as { emails: any[], total: number, columnId: string };
        const emails = oldData.emails || [];
        const index = emails.findIndex((e: any) => e.id === emailId);

        if (index !== -1) {
          // Found it! Clone it
          emailToMove = { ...emails[index] };

          // Get source column ID from the query key
          // Query key format: [...kanbanKeys.all, 'column', columnId, page]
          const keyParts = queryKey as any[];
          // index 2 is columnId
          if (keyParts.length >= 3) {
            sourceColumnId = keyParts[2];
          }

          // Remove it from this list
          queryClient.setQueryData(queryKey, {
            ...oldData,
            emails: emails.filter((e: any) => e.id !== emailId),
            total: Math.max(0, (oldData.total || 0) - 1),
          });
        }
      });

      // 2. Add to target column (if we found the email and have a target ID)
      if (emailToMove && targetColumnId) {
        // Update email status
        emailToMove.status = status;

        // Find target column query (look for the highest page number or just any active page)
        // Since we accumulate data, we want to update the entry that the UI is currently using.
        // We can search allColumnQueries for the one matching targetColumnId.
        const targetQueryKeys = allColumnQueries.filter(([key]) => {
          const k = key as any[];
          return k[2] === targetColumnId;
        });

        // Sort by page number descending (k[3]) to get the latest page data
        targetQueryKeys.sort((a, b) => {
          const pageA = (a[0] as any[])[3] as number;
          const pageB = (b[0] as any[])[3] as number;
          return pageB - pageA;
        });

        const targetQueryKey = targetQueryKeys[0];

        if (targetQueryKey) {
          queryClient.setQueryData(targetQueryKey[0], (old: any) => {
            // Handl case where target column data isn't loaded yet
            if (!old) {
              return {
                columnId: targetColumnId,
                emails: [emailToMove],
                total: 1,
                currentPage: 1,
                hasMore: false,
              };
            }
            return {
              ...old,
              emails: [emailToMove, ...old.emails],
              total: (old.total || 0) + 1,
            };
          });
        } else {
          // If the query key wasn't found in existing data (e.g. column is new/loading and has no data yet),
          // we must manually construct the key and seed the cache.
          // Key format: [...kanbanKeys.all, "column", columnId, page] -> ['kanban', 'column', targetColumnId, 1]
          const targetKey = [...kanbanKeys.all, "column", targetColumnId, 1];

          queryClient.setQueryData(targetKey, {
            columnId: targetColumnId,
            emails: [emailToMove],
            total: 1,
            currentPage: 1,
            hasMore: false,
          });
        }
      }

      return { previousData, sourceColumnId };
    },

    onSuccess: (_data, variables, context) => {
      // Invalidate queries to ensure consistency, especially for cases where optimistic update might differ or missed
      // Optimize: Only invalidate source and target columns instead of ALL columns

      const { sourceColumnId } = context || {};
      const { targetColumnId } = variables;

      if (sourceColumnId) {
        queryClient.invalidateQueries({ queryKey: [...kanbanKeys.all, "column", sourceColumnId] });
      }

      if (targetColumnId && targetColumnId !== sourceColumnId) {
        queryClient.invalidateQueries({ queryKey: [...kanbanKeys.all, "column", targetColumnId] });
      }

      // Also invalidate snoozed if moving out of snoozed? 
      // Actually sourceColumnId would capture 'snoozed' if moving out of it.

      toast.success("Email moved successfully!");
    },

    onError: (error: any, _variables, context) => {
      const message = error?.response?.data?.message || "Failed to move email";
      toast.error(message);

      // Rollback
      if (context?.previousData) {
        context.previousData.forEach((data, keyString) => {
          queryClient.setQueryData(JSON.parse(keyString), data);
        });
      }
    },
  });
};

/**
 * Restore snoozed emails - runs periodically to check for expired snoozes
 */
export const useRestoreSnoozedMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => kanbanService.restoreSnoozed(),
    onSuccess: (data) => {
      if (data.restored > 0) {
        // Invalidate ALL queries to refresh everywhere
        queryClient.invalidateQueries({ queryKey: ["emails"] });
        queryClient.invalidateQueries({ queryKey: ["kanban"] }); // Includes all column queries
        toast.success(`📬 ${data.restored} email(s) restored from snooze`);
      }
    },
    onError: (error: any) => {
      console.error("Failed to restore snoozed emails:", error);
    },
  });
};

/**
 * Snooze an email until a specific time with optimistic update
 */
export const useSnoozeEmailMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ emailId, until }: { emailId: string; until: Date }) =>
      kanbanService.snoozeEmail(emailId, until),

    // Optimistic update - move email to SNOOZED column immediately
    onMutate: async ({ emailId, until }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: kanbanKeys.all });

      // Snapshot previous state for rollback
      const previousData: Map<string, any> = new Map();
      const allColumnQueries = queryClient.getQueriesData({ queryKey: [...kanbanKeys.all, "column"] });

      allColumnQueries.forEach(([queryKey, data]) => {
        previousData.set(JSON.stringify(queryKey), data);
      });

      // Find email to move
      let emailToMove: any = null;
      let sourceColumnId: string | null = null;

      // 1. Remove from source
      allColumnQueries.forEach(([queryKey, data]) => {
        if (!data) return;
        const oldData = data as any;
        const emails = oldData.emails || [];
        const index = emails.findIndex((e: any) => e.id === emailId);

        if (index !== -1) {
          emailToMove = { ...emails[index] };

          const keyParts = queryKey as any[];
          if (keyParts.length >= 3) {
            sourceColumnId = keyParts[2];
          }

          queryClient.setQueryData(queryKey, {
            ...oldData,
            emails: emails.filter((e: any) => e.id !== emailId),
            total: Math.max(0, (oldData.total || 0) - 1),
          });
        }
      });

      // 2. Add to SNOOZED column
      // We need to find the "Snoozed" column ID. 
      // We'll search for a query with columnId 'snoozed' (default) OR status 'SNOOZED'
      if (emailToMove) {
        emailToMove.status = KanbanEmailStatus.SNOOZED;
        emailToMove.snoozeUntil = until.toISOString();

        // Try to find the snoozed column query
        // Look for any query where the 3rd element (columnId) might be 'snoozed' or mapped to it
        // Since we don't have the column config here easily, we scan for a likely candidate
        // or just iterate and find one that looks like it.
        // Actually, best bet is to check the `columnId` part of the key.
        // By default it is "snoozed".

        // Find query key for column 'snoozed', find highest page
        const snoozedQueryKeys = allColumnQueries.filter(([key]) => {
          const k = key as any[];
          return k[2] === 'snoozed';
        });

        snoozedQueryKeys.sort((a, b) => {
          const pageA = (a[0] as any[])[3] as number;
          const pageB = (b[0] as any[])[3] as number;
          return pageB - pageA;
        });

        const snoozedQueryEntry = snoozedQueryKeys[0];

        // Loop through all queries to find one that corresponds to SNOOZED status if ID is custom?
        // But for now let's assume 'snoozed' ID as per default.
        if (snoozedQueryEntry) {
          queryClient.setQueryData(snoozedQueryEntry[0], (old: any) => {
            // Handle case where snoozed column data isn't loaded yet
            if (!old) {
              // We need the columnId from the key since we don't have it easily otherwise, 
              // but we know it's likely 'snoozed' based on the search earlier
              const colId = (snoozedQueryEntry[0] as any[])[2];
              return {
                columnId: colId,
                emails: [emailToMove],
                total: 1,
                currentPage: 1,
                hasMore: false,
              };
            }
            return {
              ...old,
              emails: [emailToMove, ...old.emails],
              total: (old.total || 0) + 1,
            };
          });
        } else {
          // Fallback for Snoozed column if not found in active queries
          // Try default "snoozed" ID
          const snoozedId = "snoozed";
          const targetKey = [...kanbanKeys.all, "column", snoozedId, 1];

          queryClient.setQueryData(targetKey, (old: any) => {
            // If data exists (maybe we missed it in search?), append.
            if (old) {
              return {
                ...old,
                emails: [emailToMove, ...old.emails],
                total: (old.total || 0) + 1,
              };
            }

            // Seed new data
            return {
              columnId: snoozedId,
              emails: [emailToMove],
              total: 1,
              currentPage: 1,
              hasMore: false,
            };
          });
        }
      }

      return { previousData, sourceColumnId };
    },

    // Success - no refetch needed, optimistic update already applied
    onSuccess: (_data, _variables, context) => {
      const { sourceColumnId } = context || {};

      if (sourceColumnId) {
        queryClient.invalidateQueries({ queryKey: [...kanbanKeys.all, "column", sourceColumnId] });
      }

      // Always invalidate snoozed column
      queryClient.invalidateQueries({ queryKey: [...kanbanKeys.all, "column", "snoozed"] });

      toast.success("Email snoozed successfully!");
    },

    // Rollback on error
    onError: (error: any, _variables, context) => {
      const message = error?.response?.data?.message || "Failed to snooze email";
      toast.error(message);

      // Restore all previous states
      if (context?.previousData) {
        context.previousData.forEach((data, keyString) => {
          queryClient.setQueryData(JSON.parse(keyString), data);
        });
      }
    },
  });
};
