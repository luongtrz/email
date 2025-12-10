import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { kanbanService } from "../../services/kanban.service";

// Query Keys
export const kanbanKeys = {
  all: ["kanban"] as const,
  summary: (emailId: string) => [...kanbanKeys.all, "summary", emailId] as const,
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
