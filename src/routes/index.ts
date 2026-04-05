import express, { Response, Request, NextFunction } from "express"
const router = express.Router()

router.get("/health", (req: Request, res: Response, next: NextFunction): Response => {
    return res.status(200).send({
        message: "ok",
        "success": true
    })
})

export default router