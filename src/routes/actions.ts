import express, { NextFunction, Request, Response } from "express"
import { authenticator } from "../middlewares/authenticator"
import { ActionController } from "../controllers/actions"

const router = express.Router()
const action_controller = new ActionController()
router.get("/v1/list", authenticator, async (req: Request, res: Response, next: NextFunction) => {
    try {
        let data = {}

        const result = action_controller.get_github_runs(data)
    } catch (error) {
        next(error)
    }
})

export default router