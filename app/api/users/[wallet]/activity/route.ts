import { apiError, apiSuccess } from "@/app/api/_shared/responses"
import { getUserActivity } from "@/lib/markets/repository"
import {
  formatZodIssues,
  walletParamSchema,
} from "@/lib/validation/marketSchemas"

interface UserActivityRouteContext {
  params: Promise<{ wallet: string }>
}

export async function GET(
  _request: Request,
  context: UserActivityRouteContext,
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

  const activity = getUserActivity(params.data.wallet)
  return apiSuccess({
    wallet: params.data.wallet,
    activity,
    total: activity.length,
    indexingMode: "ephemeral-demo" as const,
  })
}
