import { redirect } from "next/navigation";

export default async function ContentValidationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/approvals/${encodeURIComponent(id)}`);
}
