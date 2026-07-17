import { CustomerDetailPage } from "@/components/customers/CustomerDetailPage";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return <CustomerDetailPage id={Number(id)} />;
}
