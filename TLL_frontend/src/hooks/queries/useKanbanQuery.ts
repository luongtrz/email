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
 */
export const useAllKanbanColumnsQuery = (limit = 20) => {
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
      queryKey: [...kanbanKeys.all, "column", status],
      queryFn: async () => {
        const result = await kanbanService.getKanbanEmails({
          status,
          page: 1,
          limit,
        });
        return {
          status,
          emails: result.emails,
          total: result.pagination.total || 0,
        };
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    })
  );

  // Combine results
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const allEmails = queries.flatMap((q) => q.data?.emails || []);
  const columnData = queries.reduce((acc, q) => {
    if (q.data) {
      acc[q.data.status] = {
        emails: q.data.emails,
        total: typeof q.data.total === 'number' ? q.data.total : 0,
      };
    }
    return acc;
  }, {} as Record<KanbanEmailStatusType, { emails: any[]; total: number }>);

  return {
    isLoading,
    isError,
    allEmails,
    columnData,
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
      const previousData: Record<string, any> = {};
      statuses.forEach((status) => {
        const queryKey = [...kanbanKeys.all, "column", status];
        previousData[status] = queryClient.getQueryData(queryKey);
      });

      // STEP 2: Find the email to move from snapshots
      const emailToMove = Object.values(previousData)
        .flatMap((data: any) => data?.emails || [])
        .find((e: any) => e.id === emailId);

      if (!emailToMove) {
        console.warn(`Email ${emailId} not found in any column`);
        return { previousData };
      }

      // STEP 3: Now update all columns
      statuses.forEach((status) => {
        const queryKey = [...kanbanKeys.all, "column", status];
        const oldData = previousData[status];

        if (oldData) {
          queryClient.setQueryData(queryKey, (old: any) => {
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

            // Add to new column
            if (status === newStatus && emailIndex === -1) {
              return {
                ...old,
                emails: [{ ...emailToMove, status: newStatus }, ...emails],
                total: (old.total || 0) + 1,
              };
            }

            return old;
          });
        }
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
        const statuses: KanbanEmailStatusType[] = [
          KanbanEmailStatus.INBOX,
          KanbanEmailStatus.TODO,
          KanbanEmailStatus.IN_PROGRESS,
          KanbanEmailStatus.DONE,
          KanbanEmailStatus.SNOOZED,
        ];

        statuses.forEach((status) => {
          const queryKey = [...kanbanKeys.all, "column", status];
          if (context.previousData[status]) {
            queryClient.setQueryData(queryKey, context.previousData[status]);
          }
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
        // Invalidate emails query to refresh the list
        queryClient.invalidateQueries({ queryKey: ["emails"] });
        toast.success(`📬 ${data.restored} email(s) restored from snooze`);
      }
    },
    onError: (error: any) => {
      console.error("Failed to restore snoozed emails:", error);
    },
  });
};

/**
 * Snooze an email until a specific time
 */
export const useSnoozeEmailMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ emailId, until }: { emailId: string; until: Date }) =>
      kanbanService.snoozeEmail(emailId, until),
    onSuccess: () => {
      // Invalidate both email queries and kanban queries
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      queryClient.invalidateQueries({ queryKey: ["kanban", "emails"] });
      toast.success("⏰ Email snoozed successfully!");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Failed to snooze email";
      toast.error(message);
    },
  });
};
