import express, { NextFunction, Response } from "express"
import { isAdmin } from "../middlewares/isAdmin"
import { authenticator } from "../middlewares/authenticator"
import { CustomRequest } from "../utils/interfaces"
import { ActionRequest } from "../utils/types"

// Controller
import { AIController } from "../controllers/ai"

const router = express.Router()
const ai_controller = new AIController()

router.get("/v1/info", [authenticator, isAdmin], async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        let data: Partial<ActionRequest> = {
            req: req.data,
            params: req.params,
            query: req.query
        }
        const result = await ai_controller.fetch_workflow_logs(data)

        return res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }

})

export default router