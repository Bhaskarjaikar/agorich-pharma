import { Router } from "express"
import cors from "cors"
import bodyParser from "body-parser"

const createApiRouter = (
  rootDirectory: string,
  options: { projectConfig: { store_cors: string } }
) => {
  const app = Router()

  const corsOptions = {
    origin: options.projectConfig.store_cors.split(","),
    credentials: true,
  }

  app.use(cors(corsOptions))
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "agorich-pharma-backend" })
  })

  return app
}

export default createApiRouter
















