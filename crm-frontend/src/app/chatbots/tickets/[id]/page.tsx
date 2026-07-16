import { ChatbotTicketDetailPage } from "@/components/chatbot-tickets/ChatbotTicketDetailPage";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return <ChatbotTicketDetailPage id={Number(id)} />;
}
