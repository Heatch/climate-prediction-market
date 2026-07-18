import { apiError, apiSuccess } from "@/app/api/_shared/responses"
import { queryMarkets } from "@/lib/markets/repository"
import {
  MARKET_CATEGORIES,
  MARKET_CONTINENTS,
  MARKET_STATUSES,
} from "@/lib/markets/types"
import {
  formatZodIssues,
  marketListQuerySchema,
  searchParamsToObject,
} from "@/lib/validation/marketSchemas"

export async function GET(request: Request) {
  const query = marketListQuerySchema.safeParse(
    searchParamsToObject(new URL(request.url).searchParams),
  )

  if (!query.success) {
    return apiError(
      "VALIDATION_ERROR",
      "The market query parameters are invalid.",
      400,
      formatZodIssues(query.error),
    )
  }

  const result = queryMarkets(query.data)
  return apiSuccess({
    ...result,
    filters: {
      categories: MARKET_CATEGORIES,
      continents: MARKET_CONTINENTS,
      statuses: MARKET_STATUSES,
    },
  })
}
