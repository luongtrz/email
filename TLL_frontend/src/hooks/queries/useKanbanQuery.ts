import React from "react";
import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
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
 * Fetch ALL Kanban columns data (INBOX, TODO, IN_PROGRESS, DONE, SNOOZED)
 * Use this for Kanban board view to populate all columns at once
 * Supports pagination with incremental load more (only fetches new pages)
 */
export const useAllKanbanColumnsQuery = (limit = 20) => {
  const queryClient = useQueryClient();
  const [pages, setPages] = React.useState<Record<KanbanEmailStatusType, number>>({
    [KanbanEmailStatus.INBOX]: 1,
    [KanbanEmailStatus.TODO]: 1,
    [KanbanEmailStatus.IN_PROGRESS]: 1,
    [KanbanEmailStatus.DONE]: 1,
    [KanbanEmailStatus.SNOOZED]: 1,
  });

  const statuses: KanbanEmailStatusType[] = [
    KanbanEmailStatus.INBOX,
    KanbanEmailStatus.TODO,
    KanbanEmailStatus.IN_PROGRESS,
    KanbanEmailStatus.DONE,
    KanbanEmailStatus.SNOOZED,
  ];

  // Fetch all columns in parallel
  const queries = statuses.map((status) =>
    useQuery({
      queryKey: [...kanbanKeys.all, "column", status, pages[status]],
      queryFn: async () => {
        const currentPage = pages[status];
        
        // Get existing data from previous page (page - 1)
        const previousPageData = currentPage > 1 
          ? queryClient.getQueryData<{
              status: KanbanEmailStatusType;
              emails: any[];
              total: number;
              currentPage: number;
              hasMore: boolean;
            }>([...kanbanKeys.all, "column", status, currentPage - 1])
          : null;
        
        // If loading page > 1, fetch only the new page and append
        if (previousPageData && currentPage > 1) {
          // Fetch only the new page
          const newPageResult = await kanbanService.getKanbanEmails({
            status,
            page: currentPage,
            limit,
          });
          
          const total = typeof newPageResult.pagination.total === 'number' 
            ? newPageResult.pagination.total 
            : 0;
          
          // Append new emails to existing ones
          const allEmails = [...previousPageData.emails, ...newPageResult.emails];
          
          return {
            status,
            emails: allEmails,
            total,
            currentPage,
            hasMore: allEmails.length < total,
          };
        }
        
        // Initial load (page 1) - fetch only first page
        const result = await kanbanService.getKanbanEmails({
          status,
          page: 1,
          limit,
        });
        
        const total = typeof result.pagination.total === 'number' 
          ? result.pagination.total 
          : 0;
        
        return {
          status,
          emails: result.emails,
          total,
          currentPage: 1,
          hasMore: result.emails.length < total,
        };
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    })
  );

  // Load more function - increments page for ALL columns
  const loadMore = React.useCallback(() => {
    setPages((prev) => {
      const newPages = { ...prev };
      statuses.forEach((status) => {
        const columnData = queries.find(q => q.data?.status === status)?.data;
        // Only increment if has more data
        if (columnData?.hasMore) {
          newPages[status] = prev[status] + 1;
        }
      });
      return newPages;
    });
  }, [queries]);

  // Combine results
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const allEmails = queries.flatMap((q) => q.data?.emails || []);
  const columnData = queries.reduce((acc, q) => {
    if (q.data) {
      acc[q.data.status] = {
        emails: q.data.emails,
        total: typeof q.data.total === 'number' ? q.data.total : 0,
        hasMore: q.data.hasMore || false,
      };
    }
    return acc;
  }, {} as Record<KanbanEmailStatusType, { emails: any[]; total: number; hasMore: boolean }>);

  const hasMoreAny = queries.some((q) => q.data?.hasMore);

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
 */
export const useUpdateStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ emailId, status }: { emailId: string; status: KanbanEmailStatusType }) =>
      kanbanService.updateStatus(emailId, status),
    
    // Optimistic update: Move email immediately before API call
    onMutate: async ({ emailId, status: newStatus }) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["kanban"] });

      // Get all column query keys
      const statuses: KanbanEmailStatusType[] = [
        KanbanEmailStatus.INBOX,
        KanbanEmailStatus.TODO,
        KanbanEmailStatus.IN_PROGRESS,
        KanbanEmailStatus.DONE,
        KanbanEmailStatus.SNOOZED,
      ];

      // STEP 1: Save ALL snapshots FIRST (before any updates)
      // Use getQueriesData to get ALL page caches for each status
      const previousData: Map<string, any[]> = new Map();
      statuses.forEach((status) => {
        const queryFilter = { queryKey: [...kanbanKeys.all, "column", status] };
        const allPages = queryClient.getQueriesData(queryFilter);
        previousData.set(status, allPages);
      });

      // STEP 2: Find the email to move from snapshots
      let emailToMove: any = null;
      previousData.forEach((pages) => {
        pages.forEach(([_, data]) => {
          const emails = (data as any)?.emails || [];
          const found = emails.find((e: any) => e.id === emailId);
          if (found && !emailToMove) {
            emailToMove = { ...found };
          }
        });
      });

      if (!emailToMove) {
        console.warn(`Email ${emailId} not found in any column`);
        return { previousData };
      }

      // STEP 3: Now update all columns (ALL pages)
      statuses.forEach((status) => {
        const queryFilter = { queryKey: [...kanbanKeys.all, "column", status] };
        
        queryClient.setQueriesData(queryFilter, (old: any) => {
          if (!old) return old;

          const emails = old.emails || [];
          const emailIndex = emails.findIndex((e: any) => e.id === emailId);

          // Remove from old column (any column that's not the new one)
          if (emailIndex !== -1 && status !== newStatus) {
            return {
              ...old,
              emails: emails.filter((e: any) => e.id !== emailId),
              total: Math.max(0, (old.total || 0) - 1),
            };
          }

          // Add to new column (only to first page)
          if (status === newStatus && emailIndex === -1 && old.currentPage === 1) {
            return {
              ...old,
              emails: [{ ...emailToMove, status: newStatus }, ...emails],
              total: (old.total || 0) + 1,
            };
          }

          return old;
        });
      });

      return { previousData };
    },

    // Rollback on error
    onError: (error: any, variables, context) => {
      const message = error?.response?.data?.message || "Failed to update status";
      toast.error(message);
      console.error("Update status error:", variables);

      // Restore all previous states
      if (context?.previousData) {
        context.previousData.forEach((pages) => {
          pages.forEach(([queryKey, data]) => {
            queryClient.setQueryData(queryKey, data);
          });
        });
      }
    },

    // No refetch on success - trust the optimistic update
    // API response confirms the change, cache is already correct
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

      // Snapshot previous state for rollback (ALL pages)
      const previousData: Map<string, any[]> = new Map();
      const statuses: KanbanEmailStatusType[] = [
        KanbanEmailStatus.INBOX,
        KanbanEmailStatus.TODO,
        KanbanEmailStatus.IN_PROGRESS,
        KanbanEmailStatus.DONE,
        KanbanEmailStatus.SNOOZED,
      ];

      // Find which column the email is currently in
      let emailToMove: any = null;
      let currentStatus: KanbanEmailStatusType | null = null;

      statuses.forEach((status) => {
        const queryFilter = { queryKey: [...kanbanKeys.all, "column", status] };
        const allPages = queryClient.getQueriesData(queryFilter);
        previousData.set(status, allPages);
        
        // Search for email in all pages
        allPages.forEach(([_, data]) => {
          const emails = (data as any)?.emails || [];
          const found = emails.find((e: any) => e.id === emailId);
          if (found && !emailToMove) {
            emailToMove = { ...found };
            currentStatus = status;
          }
        });
      });

      // If email found, perform optimistic update
      if (emailToMove && currentStatus) {
        // Update email with snooze data
        emailToMove.status = KanbanEmailStatus.SNOOZED;
        emailToMove.snoozeUntil = until.toISOString();

        statuses.forEach((status) => {
          const queryFilter = { queryKey: [...kanbanKeys.all, "column", status] };
          
          queryClient.setQueriesData(queryFilter, (old: any) => {
            if (!old) return old;
            const emails = old.emails || [];
            const emailIndex = emails.findIndex((e: any) => e.id === emailId);

            // Remove from current column
            if (emailIndex !== -1 && status === currentStatus) {
              return {
                ...old,
                emails: emails.filter((e: any) => e.id !== emailId),
                total: Math.max(0, (old.total || 0) - 1),
              };
            }

            // Add to SNOOZED column (only first page)
            if (status === KanbanEmailStatus.SNOOZED && status !== currentStatus && old.currentPage === 1) {
              return {
                ...old,
                emails: [emailToMove, ...emails],
                total: (old.total || 0) + 1,
              };
            }

            return old;
          });
        });
      }

      return { previousData };
    },

    // Success - no refetch needed, optimistic update already applied
    onSuccess: () => {
      toast.success("Email snoozed successfully!");
    },

    // Rollback on error
    onError: (error: any, variables, context) => {
      const message = error?.response?.data?.message || "Failed to snooze email";
      toast.error(message);
      console.error("Snooze error:", variables);

      // Restore all previous states
      if (context?.previousData) {
        context.previousData.forEach((pages) => {
          pages.forEach(([queryKey, data]) => {
            queryClient.setQueryData(queryKey, data);
          });
        });
      }
    },
  });
};
