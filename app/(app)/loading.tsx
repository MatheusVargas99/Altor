import { Skeleton, SkeletonCards, SkeletonTable } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-3 w-80" />
      </div>
      <SkeletonCards count={4} />
      <SkeletonTable rows={8} />
    </div>
  );
}
