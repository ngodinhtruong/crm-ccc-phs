/**
 * Utility functions for protecting sensitive customer PII.
 * 
 * Business Rules:
 * - Allowed unmasked: Account Number (Số TK) and Customer Name (Tên KH).
 * - For LINKED customers (have system account / valid customer_code / account_number):
 *   - Phone, Email, Identity Card (CCCD/CMND), and Address MUST NOT BE DISPLAYED AT ALL (returns "-").
 * - For UNLINKED customers (no system account / empty customer_code):
 *   - Phone and Email ARE ALLOWED TO BE DISPLAYED FULLY UNMASKED for contact purposes.
 */

export function isLinkedCustomer(
  accountNumber?: string | null,
  isLinkedFlag?: boolean | null
): boolean {
  if (typeof isLinkedFlag === "boolean") {
    return isLinkedFlag;
  }
  if (!accountNumber) return false;
  const clean = accountNumber.trim().toUpperCase();
  return (
    clean !== "" &&
    clean !== "-" &&
    clean !== "N/A" &&
    clean !== "KHÔNG CÓ" &&
    clean !== "NULL" &&
    clean !== "UNDEFINED"
  );
}

/**
 * Mask / Hide Phone Number:
 * - Linked customer -> Do NOT display at all (returns "-")
 * - Unlinked customer -> Display fully unmasked
 */
export function maskPhone(
  phone?: string | null,
  isLinked: boolean = true
): string {
  if (!phone || phone.trim() === "" || phone.trim() === "-") return "-";
  const cleanPhone = phone.trim();

  // If customer is linked to a system account -> DO NOT DISPLAY AT ALL
  if (isLinked) return "-";

  // Unlinked customer -> allow displaying phone for contact
  return cleanPhone;
}

/**
 * Mask / Hide Email:
 * - Linked customer -> Do NOT display at all (returns "-")
 * - Unlinked customer -> Display fully unmasked
 */
export function maskEmail(
  email?: string | null,
  isLinked: boolean = true
): string {
  if (!email || email.trim() === "" || email.trim() === "-") return "-";
  const cleanEmail = email.trim();

  // If customer is linked to a system account -> DO NOT DISPLAY AT ALL
  if (isLinked) return "-";

  // Unlinked customer -> allow displaying email for contact
  return cleanEmail;
}

/**
 * Mask / Hide Identity / CCCD / CMND:
 * - Linked customer -> Do NOT display at all (returns "-")
 * - Unlinked customer -> Display fully unmasked
 */
export function maskIdentityNo(
  idNo?: string | null,
  isLinked: boolean = true
): string {
  if (!idNo || idNo.trim() === "" || idNo.trim() === "-") return "-";
  const cleanId = idNo.trim();

  if (isLinked) return "-";
  return cleanId;
}

/**
 * Mask / Hide Address:
 * - Linked customer -> Do NOT display at all (returns "-")
 * - Unlinked customer -> Display fully unmasked
 */
export function maskAddress(
  address?: string | null,
  isLinked: boolean = true
): string {
  if (!address || address.trim() === "" || address.trim() === "-") return "-";
  if (isLinked) return "-";
  return address.trim();
}

/**
 * Mask / Hide generic sensitive customer fields (CMND/CCCD, Ngày sinh, Loại, Address details, Nguồn khách, etc.):
 * - Linked customer -> Do NOT display at all (returns "-")
 * - Unlinked customer -> Display fully unmasked
 */
export function maskSensitiveValue(
  value?: string | null,
  isLinked: boolean = true
): string {
  if (!value || value.trim() === "" || value.trim() === "-") return "-";
  if (isLinked) return "-";
  return value.trim();
}

