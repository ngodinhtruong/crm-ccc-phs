import { TicketDetailPage } from "@/components/tickets/detail/TicketDetailPage";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return <TicketDetailPage id={Number(id)} />;
}
