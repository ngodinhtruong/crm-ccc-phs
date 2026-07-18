"use client";

import { useEffect, useMemo, useState } from "react";

import { masterDataApi } from "@/apis/master-data.api";
import { ticketApi } from "@/apis/ticket.api";
import { userApi } from "@/apis/user.api";
import { BreachReasonOption } from "@/components/tickets/detail/SlaBreachReasonModal";
import { TicketDetail, TicketStatusCode } from "@/types/ticket.type";

export type Opt = { id: number; [key: string]: unknown };

export function optName(o: Opt, keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v) return v;
  }
  return `#${o.id}`;
}

const toId = (v: string): number | null => (v ? Number(v) : null);

/**
 * State + options + logic lưu cho việc sửa ticket.
 *
 * Backend tách 3 service (assign / amend / status) để giữ log, SLA, notification.
 * Hook gom lại: gọi save() một lần, bên trong chạy lần lượt. Nếu backend chặn vì
 * ticket vượt SLA chưa khai lý do → trả cờ needBreachReason để UI mở modal lý do.
 */
export function useTicketEditForm(ticket: TicketDetail) {
  // ── Form state (khởi tạo từ ticket) ──
  const [status, setStatus] = useState<TicketStatusCode>(
    (ticket.current_status_code as TicketStatusCode) || "CREATED"
  );
  const [category, setCategory] = useState<number | null>(
    ticket.support_category ?? null
  );
  const [classification, setClassification] = useState<number | null>(
    ticket.classification ?? null
  );
  const [source, setSource] = useState<number | null>(ticket.source ?? null);
  const [priority, setPriority] = useState<number | null>(
    ticket.priority ?? null
  );
  const [slaPolicy, setSlaPolicy] = useState<number | null>(
    ticket.sla_policy ?? null
  );
  const [unit, setUnit] = useState<number | null>(ticket.assigned_unit ?? null);
  const [branch, setBranch] = useState<number | null>(
    ticket.handling_branch ?? null
  );
  const [owner, setOwner] = useState<number | null>(ticket.owner_user ?? null);
  const [sendSurvey, setSendSurvey] = useState(false);
  const [requestContent, setRequestContent] = useState(
    ticket.request_content || ""
  );
  const [solution, setSolution] = useState(ticket.handling_solution || "");
  const [finalResponse, setFinalResponse] = useState(
    ticket.final_response || ""
  );
  const [cancelledReason, setCancelledReason] = useState("");
  const [errorGroup, setErrorGroup] = useState<number | null>(
    ticket.error_group ?? null
  );
  const [errorType, setErrorType] = useState<number | null>(
    ticket.error_type ?? null
  );
  const [relatedSystem, setRelatedSystem] = useState(
    ticket.related_system || ""
  );
  const [errorNote, setErrorNote] = useState(ticket.error_note || "");

  // ── Options ──
  const [units, setUnits] = useState<Opt[]>([]);
  const [branches, setBranches] = useState<Opt[]>([]);
  const [slaPolicies, setSlaPolicies] = useState<Opt[]>([]);
  const [priorities, setPriorities] = useState<Opt[]>([]);
  const [users, setUsers] = useState<Opt[]>([]);
  const [categories, setCategories] = useState<Opt[]>([]);
  const [classifications, setClassifications] = useState<Opt[]>([]);
  const [sources, setSources] = useState<Opt[]>([]);
  const [errorGroups, setErrorGroups] = useState<Opt[]>([]);
  const [errorTypes, setErrorTypes] = useState<Opt[]>([]);
  const [reasons, setReasons] = useState<BreachReasonOption[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = (fetcher: () => Promise<unknown>, setter: (v: Opt[]) => void) => {
      fetcher()
        .then((data) => {
          if (!active) return;
          const rows = Array.isArray(data)
            ? data
            : ((data as { results?: unknown[] })?.results ?? []);
          setter(rows as Opt[]);
        })
        .catch(() => {});
    };

    load(() => masterDataApi.getProcessingUnits(), setUnits);
    load(() => masterDataApi.getBranches(), setBranches);
    load(() => masterDataApi.getSlaPolicies(), setSlaPolicies);
    load(() => masterDataApi.getTicketPriorities(), setPriorities);
    load(() => masterDataApi.getTicketCategories(), setCategories);
    load(() => masterDataApi.getTicketClassifications(), setClassifications);
    load(() => masterDataApi.getTicketSources(), setSources);
    load(() => masterDataApi.getSlaBreachReasons(), (v) =>
      setReasons(v as BreachReasonOption[])
    );
    load(() => ticketApi.getErrorGroups(), (v) => setErrorGroups(v as Opt[]));
    load(() => ticketApi.getErrorTypes(), (v) => setErrorTypes(v as Opt[]));
    load(() => userApi.getUsers(), setUsers);

    return () => {
      active = false;
    };
  }, []);

  // Lọc theo danh mục hỗ trợ / nhóm lỗi (giống form tạo)
  const filteredClassifications = useMemo(
    () =>
      category
        ? classifications.filter((o) => Number(o.support_category) === category)
        : classifications,
    [category, classifications]
  );
  const filteredSlaPolicies = useMemo(
    () =>
      category
        ? slaPolicies.filter((o) => Number(o.support_category) === category)
        : slaPolicies,
    [category, slaPolicies]
  );
  const filteredErrorTypes = useMemo(
    () =>
      errorGroup
        ? errorTypes.filter((o) => Number(o.group) === errorGroup)
        : errorTypes,
    [errorGroup, errorTypes]
  );

  /**
   * Lưu: assign → amend → status → survey.
   * @returns {ok, needBreachReason, ticket}
   */
  const save = async (breach?: { reason: number; note: string }) => {
    setSaving(true);
    setError("");

    try {
      if (
        unit !== (ticket.assigned_unit ?? null) ||
        branch !== (ticket.handling_branch ?? null) ||
        owner !== (ticket.owner_user ?? null)
      ) {
        await ticketApi.assignTicket(ticket.id, {
          to_unit: unit,
          to_branch: branch,
        });
      }

      await ticketApi.amendTicket(ticket.id, {
        support_category: category,
        classification,
        source,
        priority,
        sla_policy: slaPolicy,
        error_group: errorGroup,
        error_type: errorType,
        related_system: relatedSystem,
        error_note: errorNote,
        request_content: requestContent,
        handling_solution: solution,
        final_response: finalResponse,
      });

      const updated = await ticketApi.updateTicketStatus(ticket.id, {
        to_status_code: status,
        breach_reason: breach?.reason,
        breach_note: breach?.note,
        cancelled_reason:
          status === "CANCELLED" ? cancelledReason || undefined : undefined,
      });

      if (sendSurvey) {
        await ticketApi.sendTicketSurvey(ticket.id, true).catch(() => {});
      }

      return { ok: true, needBreachReason: false, ticket: updated };
    } catch (err) {
      const data = (err as { response?: { data?: unknown } })?.response?.data;

      let message = "";
      if (Array.isArray(data)) {
        message = data.join(" ");
      } else if (typeof data === "string") {
        message = data;
      } else if (data && typeof data === "object") {
        const obj = data as Record<string, unknown>;
        message =
          (obj.detail as string) ||
          Object.values(obj).flat().filter(Boolean).join(" ");
      }

      if (message.includes("SLA")) {
        return { ok: false, needBreachReason: true, ticket: null };
      }

      setError(message || "Không lưu được. Vui lòng thử lại.");
      return { ok: false, needBreachReason: false, ticket: null };
    } finally {
      setSaving(false);
    }
  };

  return {
    // fields
    status, setStatus,
    category, setCategory,
    classification, setClassification,
    source, setSource,
    priority, setPriority,
    slaPolicy, setSlaPolicy,
    unit, setUnit,
    branch, setBranch,
    owner, setOwner,
    sendSurvey, setSendSurvey,
    requestContent, setRequestContent,
    solution, setSolution,
    finalResponse, setFinalResponse,
    cancelledReason, setCancelledReason,
    errorGroup, setErrorGroup,
    errorType, setErrorType,
    relatedSystem, setRelatedSystem,
    errorNote, setErrorNote,
    // options
    units, branches, priorities, users, sources, categories, reasons, errorGroups,
    filteredClassifications, filteredSlaPolicies, filteredErrorTypes,
    // state + actions
    saving, error, setError, save, toId,
  };
}
