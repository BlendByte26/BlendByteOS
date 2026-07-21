import { Panel } from "@/components/ui";

export default function ClientDetailLoading() {
  return (
    <div className="grid gap-6">
      <Panel className="p-5">
        <div className="h-8 w-56 animate-pulse rounded-full bg-white/60" />
        <div className="mt-4 h-14 w-full max-w-xl animate-pulse rounded-[18px] bg-white/45" />
      </Panel>
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="h-64 animate-pulse">
          <span className="sr-only">A carregar links</span>
        </Panel>
        <Panel className="h-64 animate-pulse">
          <span className="sr-only">A carregar informação do cliente</span>
        </Panel>
      </div>
    </div>
  );
}
