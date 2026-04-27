import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

interface ModulePlaceholderPageProps {
  title: string;
  description: string;
}

export function ModulePlaceholderPage({ title, description }: ModulePlaceholderPageProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <p className="text-textDark">
          Módulo base implementado. Aquí se integrarán formularios, tablas, validaciones y flujos
          de negocio del plan de Patagonia.
        </p>
      </Card>
    </>
  );
}
