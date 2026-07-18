import { apiError, apiSuccess } from "@/app/api/_shared/responses"
import { getMarketById, getMarketHistory } from "@/lib/markets/repository"
import {
  formatZodIssues,
  marketIdentifierSchema,
} from "@/lib/validation/marketSchemas"

interface MarketHistoryRouteContext {
  params: Promise<{ id: string }>
}

export async function GET(
  _request: Request,
  context: MarketHistoryRouteContext,
) {
  const params = marketIdentifierSchema.safeParse(await context.params)
  if (!params.success) {
    return apiError(
      "VALIDATION_ERROR",
      "The market identifier is invalid.",
      400,
      formatZodIssues(params.error),
    )
  }

  const market = getMarketById(params.data.id)
  const history = getMarketHistory(params.data.id)
  if (!market || !history) {
    return apiError(
      "MARKET_NOT_FOUND",
      `Market '${params.data.id}' was not found.`,
      404,
    )
  }

  return apiSuccess({
    marketId: market.id,
    question: market.question,
    history,
    isDemo: true as const,
    dataLabel: "SAMPLE DATA" as const,
  })
}
