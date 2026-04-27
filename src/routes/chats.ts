import express, { NextFunction, Response } from "express"
import { authenticator } from "../middlewares/authenticator"
import { isAdmin } from "../middlewares/isAdmin"
import { CustomRequest } from "../utils/interfaces"
import { ActionRequest } from "../utils/types"

import { Chats } from "../controllers/chats"

const router = express.Router()
const chat_controller = new Chats()

router.post("/v1/chat", [authenticator, isAdmin], async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        let data: Partial<ActionRequest> = {
            body: req.body,
            req: req.data
        }
        const result = await chat_controller.chat(data)

        return res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }

})

router.get("/v1/stream", [authenticator, isAdmin], async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        let data: Partial<ActionRequest> = {
            body: req.body,
            req: req.data,
            query: req.query
        }
        const result = await chat_controller.stream(data)

        return res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }

})
router.patch("/v1/new/message", [authenticator, isAdmin], async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        let data: Partial<ActionRequest> = {
            body: req.body,
            req: req.data,
        }
        const result = await chat_controller.update_conversation(data)

        return res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }

})


export default router