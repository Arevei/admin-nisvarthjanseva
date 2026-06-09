import { getDb } from "@/lib/db";

export type SiteLanguage = "en" | "hi";

type SiteSettingDoc = {
  key: string;
  value: string;
  updatedAt: Date;
};

const DEFAULT_LANGUAGE_KEY = "defaultLanguage";

export async function getDefaultLanguage(): Promise<SiteLanguage> {
  const db = await getDb();
  const row = await db.collection<SiteSettingDoc>("siteSettings").findOne({ key: DEFAULT_LANGUAGE_KEY });
  if (row?.value === "en" || row?.value === "hi") {
    return row.value;
  }
  return "hi";
}

export async function setDefaultLanguage(language: SiteLanguage) {
  const db = await getDb();
  await db.collection<SiteSettingDoc>("siteSettings").updateOne(
    { key: DEFAULT_LANGUAGE_KEY },
    {
      $set: {
        key: DEFAULT_LANGUAGE_KEY,
        value: language,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
}
