import { apiError, apiSuccess } from "@/app/api/_shared/responses"
import {
  indexTransaction,
  MarketRepositoryError,
} from "@/lib/markets/repository"
import {
  formatZodIssues,
  indexTransactionSchema,
} from "@/lib/validation/marketSchemas"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError("INVALID_JSON", "The request body must be valid JSON.", 400)
  }

  const parsed = indexTransactionSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "The transaction metadata is invalid.",
      400,
      formatZodIssues(parsed.error),
    )
  }

  try {
    const result = indexTransaction(parsed.data)
    return apiSuccess(
      {
        ...result,
        indexingMode: "ephemeral-demo" as const,
        authoritative: false as const,
      },
      result.created ? 201 : 200,
    )
  } catch (error) {
    if (error instanceof MarketRepositoryError) {
      const status = error.code === "MARKET_NOT_FOUND" ? 404 : 409
      return apiError(error.code, error.message, status)
    }

    return apiError(
      "INTERNAL_ERROR",
      "The transaction could not be indexed.",
      500,
    )
  }
}
