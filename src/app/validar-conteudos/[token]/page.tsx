import { redirect } from "next/navigation";

export default async function PublicContentReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  redirect(`/aprovar-conteudos/${encodeURIComponent(token)}`);
}
