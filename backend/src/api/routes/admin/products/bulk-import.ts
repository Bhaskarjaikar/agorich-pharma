import { Request, Response } from "express"

const handleBulkImport = async (req: Request, res: Response) => {
  // This backend is not using Medusa; bulk import via Medusa services is not implemented.
  return res.status(501).json({
    success: false,
    message: "Bulk product import endpoint is not implemented in this backend",
  })
}

export default handleBulkImport
















