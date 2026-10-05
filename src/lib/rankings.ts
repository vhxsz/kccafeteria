import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/lib/supabase/server";

export type RankingPeriod = 7 | 30 | 90 | null;

export type RankingFood = {
  id: string;
  name: string;
  category: string;
  imageUrl: string | null;
  active: boolean;
  votes: number;
  averageRating: number;
  tasteRating: number | null;
  temperatureRating: number | null;
  portionRating: number | null;
  appearanceRating: number | null;
  positivePercent: number;
  distribution: number[];
  lastServed: string;
};

export type RankingDay = {
  serviceDate: string;
  reviews: number;
  averageRating: number;
  positivePercent: number;
};

export type RankingWeekday = {
  weekday: number;
  reviews: number;
  serviceDays: number;
  averageRating: number;
  positivePercent: number;
};

export type RankingMeal = {
  name: string;
  reviews: number;
  averageRating: number;
  positivePercent: number;
};

export type SchoolRankings = {
  schoolName: string;
  cafeteriaName: string;
  periodDays: RankingPeriod;
  asOfDate: string;
  minimumCount: number;
  summary: {
    reviewCount: number | null;
    averageRating: number | null;
    positivePercent: number | null;
    commentCount: number | null;
    itemVoteCount: number | null;
    distribution: number[] | null;
  };
  foods: RankingFood[];
  categories: Array<{ category: string; foods: number; votes: number; averageRating: number; positivePercent: number }>;
  weekdays: RankingWeekday[];
  bestDates: RankingDay[];
  dailyTrend: RankingDay[];
  meals: RankingMeal[];
  tags: Array<{ name: string; sentiment: string; uses: number }>;
};

export function parseRankingPeriod(value: string | string[] | undefined): RankingPeriod {
  if (value === "7") return 7;
  if (value === "30") return 30;
  if (value === "90") return 90;
  return null;
}

export function parseRankingSort(value: string | string[] | undefined) {
  return value === "votes" ? "votes" : "rating";
}

export async function getSchoolRankings(
  tagCode: string,
  period: RankingPeriod,
  audience: "public" | "admin",
): Promise<SchoolRankings | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("The cafeteria service is not configured.");

  const supabase = audience === "admin"
    ? await createSessionClient()
    : createSupabaseClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

  const { data, error } = await supabase.rpc("get_school_rankings", {
    p_tag_code: tagCode,
    p_days: period,
  });
  if (error) {
    console.error("Unable to load school rankings:", error.message);
    throw new Error("The rankings could not be loaded.");
  }
  if (!data) return null;

  const rankings = data as SchoolRankings;
  if (audience === "admin" && rankings.minimumCount !== 1) {
    throw new Error("Administrator rankings are unavailable for this account.");
  }
  if (audience === "public" && rankings.minimumCount !== 3) {
    throw new Error("Public rankings are unavailable.");
  }
  return rankings;
}
