import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { emailService } from '../../services/email.service';
import type { Email } from '../../types/email.types';
import { toast } from 'react-hot-toast';

// Query Keys
export const emailKeys = {
  all: ['emails'] as const,
  lists: () => [...emailKeys.all, 'list'] as const,
  list: (folder: string, search: string) => [...emailKeys.lists(), { folder, search }] as const,
  details: () => [...emailKeys.all, 'detail'] as const,
  detail: (id: string) => [...emailKeys.details(), id] as const,
  mailboxes: () => ['mailboxes'] as const,
};

/**
 * Fetch emails with pagination
 */
export const useEmailsQuery = (folder: string, search: string, limit = 20) => {
  return useQuery({
    queryKey: emailKeys.list(folder, search),
    queryFn: async () => {
      const result = await emailService.getEmails({ 
        folder, 
        search: search || undefined, 
        page: 1, 
        limit 
      });
      return result;
    },
    enabled: !!folder, // Only fetch when folder is set
  });
};

/**
 * Infinite scroll query for emails
 */
export const useInfiniteEmailsQuery = (folder: string, search: string, limit = 20) => {
  return useInfiniteQuery({
    queryKey: emailKeys.list(folder, search),
    queryFn: async ({ pageParam = 1 }) => {
      const result = await emailService.getEmails({ 
        folder, 
        search: search || undefined, 
        page: pageParam, 
        limit 
      });
      return result;
    },
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!folder,
  });
};

/**
 * Fetch single email detail
 */
export const useEmailDetailQuery = (emailId: string | null) => {
  return useQuery({
    queryKey: emailKeys.detail(emailId || ''),
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
    mutationFn: async ({ emailId, read }: { emailId: string; read: boolean }) => {
      await emailService.modifyEmail(emailId, { markAsRead: read });
      return { emailId, read };
    },
    onMutate: async ({ emailId, read }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: emailKeys.all });

      // Snapshot previous value
      const previousEmails = queryClient.getQueriesData({ queryKey: emailKeys.lists() });

      // Optimistically update for infinite query
      queryClient.setQueriesData<{ pages: Array<{ emails: Email[]; pagination: any }> }>(
        { queryKey: emailKeys.lists() },
        (old) => {
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
        }
      );

      return { previousEmails };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousEmails) {
        context.previousEmails.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Failed to update email status');
    },
    onSuccess: () => {
      // Invalidate mailboxes to update counts
      queryClient.invalidateQueries({ queryKey: emailKeys.mailboxes() });
    },
  });
};

/**
 * Star/unstar email
 */
export const useStarEmailMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ emailId, starred }: { emailId: string; starred: boolean }) => {
      await emailService.modifyEmail(emailId, { star: starred });
      return { emailId, starred };
    },
    onMutate: async ({ emailId, starred }) => {
      await queryClient.cancelQueries({ queryKey: emailKeys.all });
      const previousEmails = queryClient.getQueriesData({ queryKey: emailKeys.lists() });

      // Optimistically update for infinite query
      queryClient.setQueriesData<{ pages: Array<{ emails: Email[]; pagination: any }> }>(
        { queryKey: emailKeys.lists() },
        (old) => {
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
        }
      );

      return { previousEmails };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousEmails) {
        context.previousEmails.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Failed to update starred status');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: emailKeys.mailboxes() });
      toast.success(data.starred ? 'Email starred' : 'Email unstarred');
    },
  });
};

/**
 * Delete email (move to trash)
 */
export const useDeleteEmailMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (emailId: string) => emailService.modifyEmail(emailId, { delete: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.all });
      queryClient.invalidateQueries({ queryKey: emailKeys.mailboxes() });
      toast.success('Email moved to trash');
    },
    onError: () => {
      toast.error('Failed to delete email');
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
      toast.success('Email sent successfully');
    },
    onError: () => {
      toast.error('Failed to send email');
    },
  });
};
