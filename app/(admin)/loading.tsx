import { PageSkeleton } from "@/components/PageSkeleton";

// Lets links prefetch the layout and swap to this outline instantly on click.
export default function Loading() {
  return <PageSkeleton />;
}
