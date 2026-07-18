import { apiError, apiSuccess } from "@/app/api/_shared/responses"
import { getUserPositions } from "@/lib/markets/repository"
import {
  formatZodIssues,
  walletParamSchema,
} from "@/lib/validation/marketSchemas"

interface UserPositionsRouteContext {
  params: Promise<{ wallet: string }>
}

export async function GET(
  _request: Request,
  context: UserPositionsRouteContext,
) {
  const params = walletParamSchema.safeParse(await context.params)
  if (!params.success) {
    return apiError(
      "VALIDATION_ERROR",
      "The wallet address is invalid.",
      400,
      formatZodIssues(params.error),
    )
  }

  const positions = getUserPositions(params.data.wallet)
  return apiSuccess({
    wallet: params.data.wallet,
    positions,
    total: positions.length,
    sourceOfTruth:
      "Sample repository data only. Configured Solana program accounts remain authoritative for real Devnet positions.",
  })
}
