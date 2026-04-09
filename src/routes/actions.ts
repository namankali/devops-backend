import express, { NextFunction, Request, Response } from "express"
import { authenticator } from "../middlewares/authenticator"
import { ActionController } from "../controllers/actions"
import { CustomRequest } from "../utils/interfaces"
import { isAdmin } from "../middlewares/isAdmin"

const router = express.Router()
const action_controller = new ActionController()

type ActionRequest = {
    req: CustomRequest["data"],
    body: Record<string, unknown>,
    headers: Record<string, unknown>,
    params?: Record<string, string | string[]>
}

// Github accounts
router.post("/v1/account", [authenticator, isAdmin], async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        let data: Partial<ActionRequest> = {
            body: req.body,
            req: req.data
        }
        const result = await action_controller.add_github_account(data)

        return res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }

})
router.patch("/v1/account", [authenticator, isAdmin], async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        let data: Partial<ActionRequest> = {
            body: req.body,
            req: req.data
        }
        const result = await action_controller.update_github_token(data)

        return res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }

})
router.get("/v1/gat/:github_user_id", [authenticator, isAdmin], async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        let data: Partial<ActionRequest> = {
            req: req.data,
            params: req.params
        }
        const result = await action_controller.get_github_token(data)

        return res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }

})

// Repositories

router.post("/v1/ind/repo", [authenticator, isAdmin], async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        let data: Partial<ActionRequest> = {
            req: req.data,
        }
        const result = await action_controller.add_repository(data)

        return res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }

})

router.post("/v1/alerts", async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        // console.log("github repo ->> ", req)
        let data: Partial<ActionRequest> = {
            body: req.body,
            headers: req.headers
        }
        const result = await action_controller.github_alerts(data)

        return res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }

})
router.get("/v1/list", authenticator, async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        let data: Partial<ActionRequest> = {
            req: req.data
        }

        const result = await action_controller.get_github_runs(data)

        res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }
})

export default router