import { apiError, apiSuccess } from "@/app/api/_shared/responses"
import { getMarketById } from "@/lib/markets/repository"
import {
  formatZodIssues,
  marketIdentifierSchema,
} from "@/lib/validation/marketSchemas"

interface MarketRouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, context: MarketRouteContext) {
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
  if (!market) {
    return apiError(
      "MARKET_NOT_FOUND",
      `Market '${params.data.id}' was not found.`,
      404,
    )
  }

  return apiSuccess({ market })
}
