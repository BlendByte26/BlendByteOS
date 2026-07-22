import type { Metadata } from "next";
import { ContentReviewPublicForm } from "@/components/content-review-public-form";
import { BrandLogo } from "@/components/brand-logo";
import { getPublicContentReview } from "@/lib/content-review-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Validação de conteúdos | BlendByte",
  description: "Revisão privada de um planeamento de conteúdos.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PublicContentReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const review = await getPublicContentReview(token);

  if (!review) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#efefeb] p-5">
        <section className="w-full max-w-lg rounded-[28px] border border-[var(--bb-border)] bg-white/85 p-7 text-center shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
          <BrandLogo variant="wordmark" className="mx-auto h-14 w-48 rounded-2xl bg-[var(--bb-black)]" imageClassName="p-2.5" priority />
          <h1 className="mt-6 text-2xl font-extrabold text-[var(--bb-charcoal)]">Esta validação não está disponível</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-[var(--bb-muted)]">O link pode estar incompleto, ter sido revogado ou a página ainda não estar preparada. Confirme o link recebido com a equipa BlendByte.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(83,183,223,0.16),transparent_34%),#efefeb] px-3 py-5 md:px-6 md:py-8">
      <div className="mx-auto max-w-6xl">
        <ContentReviewPublicForm review={review} token={token} />
        <footer className="px-3 py-8 text-center text-xs font-bold text-[var(--bb-muted)]">Página privada de validação · BlendByte</footer>
      </div>
    </main>
  );
}
