import { SaCallResult, SaIcpGroup, SaIcpRule, SaInterestLevel } from "@/types/sale-admin.type";

/**
 * Evaluates active rules against selected callResultId and interestLevelId.
 * Rules are sorted by priority (lowest number = highest priority).
 * Returns the matching icpGroup ID or null if no rule matches.
 */
export function evaluateIcpRule(
  rules: SaIcpRule[],
  callResultId?: string | number | null,
  interestLevelId?: string | number | null,
  callResults?: SaCallResult[],
  interestLevels?: SaInterestLevel[],
  icpGroups?: SaIcpGroup[]
): number | null {
  const crId = callResultId ? Number(callResultId) : null;
  const ilId = interestLevelId ? Number(interestLevelId) : null;

  if (rules && rules.length > 0) {
    const activeRules = rules
      .filter((r) => r.is_active)
      .sort((a, b) => (a.priority || 0) - (b.priority || 0) || a.id - b.id);

    for (const rule of activeRules) {
      const ruleCrId = rule.call_result ? Number(rule.call_result) : null;
      const ruleIlId = rule.interest_level ? Number(rule.interest_level) : null;

      // Check Call Result match
      if (ruleCrId !== null && ruleCrId !== crId) {
        continue;
      }

      // Check Interest Level match
      if (ruleIlId !== null && ruleIlId !== ilId) {
        continue;
      }

      // Match found
      if (rule.icp_group) {
        return Number(rule.icp_group);
      }
    }
  }

  // Fallback: Default Excel rule logic if no DB rules match
  if (callResults && interestLevels && icpGroups && crId) {
    const crObj = callResults.find((c) => c.id === crId);
    const ilObj = ilId ? interestLevels.find((i) => i.id === ilId) : null;
    const crName = crObj?.result_name || "";
    const ilName = ilObj?.level_name || "";
    const crCode = crObj?.result_code || "";
    const ilCode = ilObj?.level_code || "";

    let targetCode = "";
    if (
      crName.includes("Nghe máy") ||
      crName.includes("Trực tiếp") ||
      crCode === "ANSWERED" ||
      crCode === "DIRECT"
    ) {
      if (ilName.includes("Rất quan tâm") || ilCode === "VERY_INTERESTED") targetCode = "A";
      else if (ilName.includes("Quan tâm") || ilCode === "INTERESTED") targetCode = "B";
      else if (ilName.includes("chưa có nhu cầu") || ilCode === "NO_CURRENT_NEED") targetCode = "C";
      else if (ilName.includes("Không quan tâm") || ilCode === "NOT_INTERESTED") targetCode = "D";
    } else if (crName.includes("Không nghe máy") || crCode === "NO_ANSWER") {
      targetCode = "E";
    } else if (crName.includes("Thuê bao") || crCode === "INVALID_PHONE") {
      targetCode = "F";
    } else if (crName.includes("Không có thông tin") || crCode === "NO_CONTACT_INFO") {
      targetCode = "H";
    }

    if (targetCode) {
      const matchIcp = icpGroups.find((g) => g.icp_code === targetCode);
      if (matchIcp) return matchIcp.id;
    }
  }

  return null;
}
