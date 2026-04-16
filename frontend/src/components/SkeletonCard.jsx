import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonDetailsCard() {
  return (
    <div className="bg-white rounded-xl shadow-md border border-orange-100 p-6">
      <div className="flex justify-center items-center mb-3">
        <Skeleton className="w-12 h-12 rounded" />
      </div>
      <Skeleton className="h-6 w-3/4 mx-auto mb-3" />
      <Skeleton className="h-4 w-5/6 mx-auto" />
    </div>
  );
}

export function SkeletonAnnouncementCard({ compact = false }) {
  return (
    <div
      className={`skeleton-card shadow-md border border-gray-200 bg-white group rounded-xl ${compact ? "p-3" : "p-5"}`}
    >
      <div className="flex items-start gap-3">
        <Skeleton
          className={`${compact ? "w-3 h-3" : "w-4 h-4"} rounded mt-1 shrink-0`}
        />
        <div className="flex-1 w-full space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50">
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-4 rounded" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-24" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-32" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-20" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-16" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-8 w-16 rounded" />
      </td>
    </tr>
  );
}

export function SkeletonChart() {
  return (
    <div className="w-full h-72 bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center">
      <div className="space-y-4 w-full">
        <Skeleton className="h-64 w-full rounded" />
      </div>
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="bg-linear-to-br from-gray-500/10 to-gray-500/10 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200/20 flex items-center justify-between gap-3">
      <div className="flex-1">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-8 w-20" />
      </div>
      <Skeleton className="w-6 h-6 rounded-full" />
    </div>
  );
}
