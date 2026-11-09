import type { PublicRanking } from "./dashboard-data";

export const RANKINGS_PAGE_SIZE = 25;
export const RANKINGS_SEARCH_MAX_LENGTH = 80;

export interface RankedContestant extends PublicRanking {
  rank: number;
}

export interface RankingsPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RankingsResponse {
  rankings: RankedContestant[];
  pagination: RankingsPagination;
}

export interface RankingsQuery {
  search: string;
  page: number;
}

export function parseRankingsQuery(
  params: URLSearchParams,
): RankingsQuery | null {
  const search = (params.get("search") ?? "").trim();
  const rawPage = params.get("page") ?? "1";
  const page = Number(rawPage);
  if (
    search.length > RANKINGS_SEARCH_MAX_LENGTH ||
    !/^[1-9]\d*$/.test(rawPage) ||
    !Number.isSafeInteger(page) ||
    page > 1_000_000
  ) {
    return null;
  }
  return { search, page };
}

export function rankingsPagination(
  page: number,
  total: number,
): RankingsPagination {
  const totalPages = Math.max(1, Math.ceil(total / RANKINGS_PAGE_SIZE));
  return {
    page: Math.min(page, totalPages),
    pageSize: RANKINGS_PAGE_SIZE,
    total,
    totalPages,
  };
}
