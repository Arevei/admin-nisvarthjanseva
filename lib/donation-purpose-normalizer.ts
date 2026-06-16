/**
 * Normalizes donation purposes to always use English values
 * This ensures the API and database always store consistent English values
 * regardless of language selection or input encoding issues
 */

const PURPOSE_MAPPING = new Map<string, string>([
  // English values (passthrough)
  ["Education Support", "Education Support"],
  ["Health Services", "Health Services"],
  ["Poor & Needy Support", "Poor & Needy Support"],
  ["Environment Campaign", "Environment Campaign"],
  ["Disaster Relief", "Disaster Relief"],
  ["General Donation", "General Donation"],

  // Hindi values to English (Unicode)
  ["शिक्षा सहायता", "Education Support"],
  ["स्वास्थ्य सेवा", "Health Services"],
  ["गरीब एवं जरूरतमंद सहायता", "Poor & Needy Support"],
  ["पर्यावरण अभियान", "Environment Campaign"],
  ["आपदा राहत कार्य", "Disaster Relief"],
  ["सामान्य दान", "General Donation"],

  // Common variations and encoding issues
  ["शिक्षा", "Education Support"],
  ["स्वास्थ्य", "Health Services"],
  ["गरीब", "Poor & Needy Support"],
  ["आपदा", "Disaster Relief"],
  ["दान", "General Donation"],
]);

/**
 * Normalize a donation purpose string to always return the English equivalent
 * @param value The purpose value to normalize (can be in any language or with encoding issues)
 * @returns The English purpose value, or the original if no mapping found
 */
export function normalizeDonationPurpose(value: unknown): string {
  if (!value) return "General Donation";

  const text = String(value).trim();

  // Direct mapping lookup
  if (PURPOSE_MAPPING.has(text)) {
    return PURPOSE_MAPPING.get(text)!;
  }

  // Try to repair encoding issues (latin1 to utf8)
  try {
    const repaired = Buffer.from(text, "latin1").toString("utf8");
    if (PURPOSE_MAPPING.has(repaired)) {
      return PURPOSE_MAPPING.get(repaired)!;
    }
  } catch (e) {
    // Ignore encoding errors, fall through
  }

  // If no mapping found, check if it's already an English value that's close
  const lowerText = text.toLowerCase();
  for (const [key, value] of PURPOSE_MAPPING.entries()) {
    if (value && value.toLowerCase().includes(lowerText.split(" ")[0])) {
      return value;
    }
  }

  // Return original if no mapping found (it's likely already a custom/valid value)
  return text;
}

/**
 * Get all valid purpose options in English
 */
export function getValidPurposes(): string[] {
  return [
    "Education Support",
    "Health Services",
    "Poor & Needy Support",
    "Environment Campaign",
    "Disaster Relief",
    "General Donation",
  ];
}

/**
 * Check if a purpose is valid (English)
 */
export function isValidPurpose(purpose: string): boolean {
  return getValidPurposes().includes(purpose);
}
