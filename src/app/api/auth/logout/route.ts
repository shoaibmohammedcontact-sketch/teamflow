import { destroySession } from "@/lib/auth"
import { apiHandler, ok } from "@/lib/api"

export const POST = apiHandler(async () => {
  await destroySession()
  return ok({ success: true })
})
