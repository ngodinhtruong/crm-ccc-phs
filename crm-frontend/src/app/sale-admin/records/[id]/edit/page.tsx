import { SaRecordEditPage } from "@/components/sale-admin/records/edit/SaRecordEditPage";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return <SaRecordEditPage recordId={id} />;
}