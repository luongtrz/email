import { useState, useEffect, useRef } from "react";
import { emailService } from "../services/email.service";
import type { Email } from "../types/email.types";

interface UseEmailsOptions {
  folder: string;
  search: string;
  limit?: number;
}

interface UseEmailsReturn {
  emails: Email[];
  setEmails: React.Dispatch<React.SetStateAction<Email[]>>;
  pagination: {
    page: number;
    total: number;
    limit: number;
    totalPages?: number;
  };
  isLoading: boolean;
  isLoadingMore: boolean;
  loadEmails: () => Promise<void>;
  loadMoreEmails: () => Promise<number | undefined>;
}

/**
 * Custom hook để quản lý email list state, pagination và loading
 * Tự động load emails khi folder hoặc search query thay đổi
 */
export const useEmails = ({
  folder,
  search,
  limit = 20,
}: UseEmailsOptions): UseEmailsReturn => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    limit,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isInitialMount = useRef(true);

  // Function để load emails
  const loadEmails = async () => {
    setIsLoading(true);
    try {
      const result = await emailService.getEmails({
        folder,
        search: search || undefined,
        page: 1,
        limit,
      });
      setEmails(result.emails);
      setPagination(result.pagination);
    } catch (error) {
      console.error("Failed to load emails:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Function để load more emails (pagination)
  const loadMoreEmails = async () => {
    if (isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = pagination.page + 1;
      const result = await emailService.getEmails({
        folder,
        search: search || undefined,
        page: nextPage,
        limit,
      });

      if (result.emails.length > 0) {
        setEmails((prev) => [...prev, ...result.emails]);
        setPagination(result.pagination);
        return result.emails.length;
      }
      return 0;
    } catch (error) {
      console.error("Failed to load more emails:", error);
      throw error;
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Load emails khi component mount lần đầu
  useEffect(() => {
    let isCancelled = false;

    const initLoad = async () => {
      setIsLoading(true);
      try {
        const result = await emailService.getEmails({
          folder,
          search: search || undefined,
          page: 1,
          limit,
        });
        if (!isCancelled) {
          setEmails(result.emails);
          setPagination(result.pagination);
          isInitialMount.current = false;
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to load initial emails:", error);
          throw error;
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    initLoad();

    return () => {
      isCancelled = true;
    };
  }, []); // Only on mount

  // Reload emails khi folder hoặc search thay đổi (sau mount)
  useEffect(() => {
    if (isInitialMount.current) return;
    loadEmails();
  }, [folder, search]);

  return {
    emails,
    setEmails,
    pagination,
    isLoading,
    isLoadingMore,
    loadEmails,
    loadMoreEmails,
  };
};
