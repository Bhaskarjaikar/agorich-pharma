import { Router } from "express"
import bulkImport from "./bulk-import"

const route = Router()

const registerAdminProductRoutes = (app: Router) => {
  app.use("/products", route)

  // Bulk import endpoint
  route.post("/bulk-import", bulkImport)

  return app
}

export default registerAdminProductRoutes
















