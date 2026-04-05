import express, { NextFunction, Request, Response } from "express"
import { MetricsController } from "../controllers/metrics"

const router = express.Router()
const metricsController = new MetricsController()

router.get("/v1/check", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        let data = { ...req.query }

        const result = await metricsController.getMetrics(data)

        res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }
})

export default router