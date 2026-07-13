import { SaRecordDetailPage } from "@/components/sale-admin/records/detail/SaRecordDetailPage";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return <SaRecordDetailPage recordId={id} />;
}