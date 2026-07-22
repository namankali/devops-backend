import express, { NextFunction, Request, Response } from "express";
import { Kubernetes } from "../controllers/kubernetes";

const router = express.Router()
const kubernetesController = new Kubernetes()

router.get("/v1/info/:namespace", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        let data = { ...req.query, ...req.params }

        const result = await kubernetesController.getInfo(data)
        res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }
})

router.get("/v1/ns", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        let data = {}

        const result = await kubernetesController.getNamespaces(data)
        res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }
})

router.get("/v1/resources/:type", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        let data = { ...req.params, ...req.query }

        const result = await kubernetesController.getResourcesDetails(data)
        res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }
})

router.get("/v1/resource/detail/:name/:type/:namespace", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const data = { ...req.params }
        const result = await kubernetesController.getResourceSpecificDetails(data)

        res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }
})

export default router