import { ExternalErrorDetailPage } from "@/components/external-errors/ExternalErrorDetailPage";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <ExternalErrorDetailPage recordId={id} />;
}
