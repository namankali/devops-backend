import express, { NextFunction, Request, Response } from "express"
import { WebhookController } from "../controllers/webhooks"

const router = express.Router()
const controller = new WebhookController()

router.post(
    "/wb",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        res.sendStatus(200)
        controller.webhook({
            body: req.body,
            headers: req.headers,
        }).catch(console.error);
    }
)

export default router