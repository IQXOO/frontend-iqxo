import { useEffect, useRef } from "react";

interface InfiniteScrollProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void | Promise<void>;
}

export function InfiniteScroll({ hasMore, isLoading, onLoadMore }: InfiniteScrollProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = containerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, isLoading, onLoadMore]);

  if (!hasMore) return null;

  return (
    <div ref={containerRef} className="py-6 flex justify-center items-center">
      {isLoading && (
        <div className="h-6 w-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      )}
    </div>
  );
}
