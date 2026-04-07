import { useEffect, useRef, useState } from 'react'

interface UseInfiniteScrollOptions {
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
  threshold?: number // Percentage of container height to trigger load (default 0.8 = 80%)
}

export function useInfiniteScroll({
  hasMore,
  loading,
  onLoadMore,
  threshold = 0.8
}: UseInfiniteScrollOptions) {
  const [isFetching, setIsFetching] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (loading || !hasMore) {
      if (observerRef.current && sentinelRef.current) {
        observerRef.current.disconnect()
      }
      return
    }

    const options = {
      root: null,
      rootMargin: '0px',
      threshold: threshold
    }

    observerRef.current = new IntersectionObserver((entries) => {
      const [entry] = entries
      if (entry.isIntersecting && hasMore && !loading && !isFetching) {
        setIsFetching(true)
        onLoadMore()
      }
    }, options)

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, loading, onLoadMore, threshold, isFetching])

  useEffect(() => {
    if (!loading) {
      setIsFetching(false)
    }
  }, [loading])

  return { sentinelRef, isFetching }
}

