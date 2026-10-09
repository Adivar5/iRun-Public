import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return <EmptyState title="That page does not exist." action={{ label: "Go to Today", href: "/today" }} />;
}
