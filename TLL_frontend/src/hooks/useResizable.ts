import { useState, useEffect, useCallback, useRef } from "react";

interface UseResizableOptions {
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  offsetLeft?: number; // Sidebar width to subtract from calculations
  storageKey?: string; // Optional localStorage key for persistence
  direction?: 'right' | 'left'; // Resize direction (right edge or left edge)
}

interface UseResizableReturn {
  width: number;
  isResizing: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
}

/**
 * Custom hook de tao resizable panel
 * Xu ly drag events va tinh toan width trong min/max bounds
 * Ho tro luu width vao localStorage neu co storageKey
 */
export const useResizable = ({
  minWidth,
  maxWidth,
  defaultWidth,
  offsetLeft = 0,
  storageKey,
  direction = 'right',
}: UseResizableOptions): UseResizableReturn => {
  const [width, setWidth] = useState(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
          return parsed;
        }
      }
    }
    return defaultWidth;
  });

  const [isResizing, setIsResizing] = useState(false);

  // Use refs to avoid stale closure issues and store drag start values
  const isResizingRef = useRef(false);
  const widthRef = useRef(width);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Keep refs in sync
  useEffect(() => {
    isResizingRef.current = isResizing;
  }, [isResizing]);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    isResizingRef.current = true;

    // Store initial values for delta calculation
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;

      e.preventDefault();

      // Calculate delta
      const currentX = e.clientX;
      const deltaX = currentX - startXRef.current;

      // Apply delta based on direction logic
      // If resizing right edge: moving right (+) increases width
      // If resizing left edge: moving right (+) decreases width (or depends on implementation)
      // Assuming 'width' controls the element being resized.
      // Usually layout is: [Sidebar] [List - Resizable] [Detail]
      // Resizing right edge of List: mouse right => width increase.
      // Resizing left edge of Detail (if anchor is right): mouse left => width increase?
      // Based on DashboardPage usage, List uses offsetLeft, so typically standard left-to-right.

      // However, simple delta is safer: newWidth = startWidth + delta
      // (If resizing from right edge)

      // Let's check DashboardPage usage. 
      // EmailList resize handle is on the RIGHT. So dragging right increases width. Width += delta.
      // AI Panel resize handle is on the LEFT. Dragging LEFT increases width. Width -= delta.

      // Since useResizable is generic, we might need 'direction' prop or just assume right-edge for now.
      // Wait, dashboard page passes offsetLeft? 
      // For email list: offsetLeft is ~256px (sidebar). MouseX - offsetLeft = width.
      // The previous Logic "e.clientX - offsetLeft" implicitly assumed absolute positioning.

      // To fix "jump", we must use delta.
      // But for AI panel (right side), dragging LEFT increases width.
      // The previous implementation used "e.clientX - offsetLeft" only?
      // Let's check how AI panel was implemented in DashboardPage.
      // handleAiPanelMouseDown calls specific hook instance.

      // In DashboardPage:
      // const { width: emailListWidth ... } = useResizable({ ... offsetLeft: 256 })
      // const { width: aiPanelWidth ... } = useResizable({ ... offsetLeft: 0? }) -- Wait.

      // Let's look at DashboardPage usage again to be sure about direction/logic.
      // But standard delta approach is:
      let newWidth = 0;

      if (direction === 'left') {
        // Dragging left (negative delta) should INCREASE width (if anchored right)
        // Dragging right (positive delta) should DECREASE width
        newWidth = startWidthRef.current - deltaX;
      } else {
        // Default 'right': Dragging right increases width
        newWidth = startWidthRef.current + deltaX;
      }

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        // Use requestAnimationFrame for smoother updates? 
        // Or just set state. React 18 is usually fast enough.
        setWidth(newWidth);
        widthRef.current = newWidth;
      }
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        setIsResizing(false);
        isResizingRef.current = false;

        // Save to localStorage
        if (storageKey) {
          localStorage.setItem(storageKey, widthRef.current.toString());
        }

        // Remove global cursor style if applied
        document.body.style.cursor = '';
      }
    };

    // Always attach listeners to handle drag properly
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // Add global cursor style when resizing
    if (isResizingRef.current) {
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [minWidth, maxWidth, offsetLeft, storageKey, direction]);

  return {
    width,
    isResizing,
    handleMouseDown,
  };
};
