import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { kanbanService } from "../../services/kanban.service";
import type { KanbanEmailStatusType } from "../../types/kanban.types";

// Query Keys
export const kanbanKeys = {
  all: ["kanban"] as const,
  emails: (folder: string, search: string) => [...kanbanKeys.all, "emails", { folder, search }] as const,
  summary: (emailId: string) => [...kanbanKeys.all, "summary", emailId] as const,
  snoozed: () => [...kanbanKeys.all, "snoozed"] as const,
};

/**
 * Fetch Kanban emails with metadata (status, snoozeUntil, aiSummary)
 */
export const useKanbanEmailsQuery = (folder: string, search: string, limit = 20) => {
  return useInfiniteQuery({
    queryKey: kanbanKeys.emails(folder, search),
    queryFn: async ({ pageParam = 1 }) => {
      const result = await kanbanService.getKanbanEmails({
        folder,
        search: search || undefined,
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
 */
export const useUpdateStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ emailId, status }: { emailId: string; status: KanbanEmailStatusType }) =>
      kanbanService.updateStatus(emailId, status),
    onSuccess: () => {
      // Invalidate both email queries and kanban queries
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      queryClient.invalidateQueries({ queryKey: ["kanban", "emails"] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Failed to update status";
      toast.error(message);
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
