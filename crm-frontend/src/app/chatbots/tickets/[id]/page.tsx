import { redirect } from "next/navigation";

/**
 * Ticket chatbot đã gộp chung bảng với ticket thường nên chỉ còn một trang chi
 * tiết duy nhất. Giữ route này để các link cũ (email, bookmark) không chết.
 */
export default async function ChatbotTicketDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  redirect(`/tickets/${id}`);
}
