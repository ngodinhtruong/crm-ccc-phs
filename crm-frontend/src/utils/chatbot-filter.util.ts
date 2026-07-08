import { ChatbotDashboardFilters } from "@/types/chatbot-dashboard.type";

export function normalizeFilters(
  raw: ChatbotDashboardFilters
): ChatbotDashboardFilters {
  const result: ChatbotDashboardFilters = {};

  Object.entries(raw).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      result[key as keyof ChatbotDashboardFilters] = String(value).trim();
    }
  });

  return result;
}