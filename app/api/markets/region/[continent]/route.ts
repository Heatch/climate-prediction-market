import { apiError, apiSuccess } from "@/app/api/_shared/responses"
import { getMarketsByRegion, resolveContinent } from "@/lib/markets/repository"
import {
  continentParamSchema,
  formatZodIssues,
  regionMarketQuerySchema,
  searchParamsToObject,
} from "@/lib/validation/marketSchemas"

interface RegionRouteContext {
  params: Promise<{ continent: string }>
}

export async function GET(request: Request, context: RegionRouteContext) {
  const params = continentParamSchema.safeParse(await context.params)
  if (!params.success) {
    return apiError(
      "VALIDATION_ERROR",
      "The continent identifier is invalid.",
      400,
      formatZodIssues(params.error),
    )
  }

  const continent = resolveContinent(params.data.continent)
  if (!continent) {
    return apiError(
      "REGION_NOT_FOUND",
      `Region '${params.data.continent}' was not found.`,
      404,
    )
  }

  const query = regionMarketQuerySchema.safeParse(
    searchParamsToObject(new URL(request.url).searchParams),
  )
  if (!query.success) {
    return apiError(
      "VALIDATION_ERROR",
      "The region market query parameters are invalid.",
      400,
      formatZodIssues(query.error),
    )
  }

  const allMatches = getMarketsByRegion(continent, {
    ...query.data,
    limit: 100,
    offset: 0,
  })
  const markets = getMarketsByRegion(continent, query.data)
  return apiSuccess({
    continent,
    markets,
    total: allMatches.length,
    activeMarkets: allMatches.filter((market) => market.status === "open")
      .length,
    limit: query.data.limit,
    offset: query.data.offset,
  })
}
