import { EmptyState, Panel, SecondaryLink } from "@/components/ui";

export default function ClientNotFound() {
  return (
    <Panel className="p-5">
      <EmptyState title="Cliente não encontrado." />
      <div className="flex justify-center">
        <SecondaryLink href="/clients">Voltar a clientes</SecondaryLink>
      </div>
    </Panel>
  );
}
