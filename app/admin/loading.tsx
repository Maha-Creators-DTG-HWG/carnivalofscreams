import { PageSkeleton } from "./ui";

export default function Loading() {
  return <PageSkeleton title="Reservations" stats={3} filters={2} />;
}
