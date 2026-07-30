import express, { NextFunction, Request, Response } from "express";
import multer from "multer";
import { Kubernetes } from "../controllers/kubernetes";
import { authenticator } from "../middlewares/authenticator";
import { isAdmin } from "../middlewares/isAdmin";
import { ActionRequest } from "../utils/types";
import { CustomRequest } from "../utils/interfaces";

const router = express.Router()
const kubernetesController = new Kubernetes()
const upload = multer({
    storage: multer.memoryStorage(),
});

router.get("/v1/clusters",
    [authenticator, isAdmin],
    async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            let data: Partial<ActionRequest> = {
                body: req.body,
                req: req.data
            }

            const result = await kubernetesController.get_cluster_info(data)
            res.status(result.status).send(result)
        } catch (error) {
            next(error)
        }
    })

router.post(
    "/v1/register/cluster", [authenticator, isAdmin], upload.single("kubeconfig"), async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const data: Partial<ActionRequest> = {
                body: req.body,
                file: req.file,
                req: req.data,
            };

            const result = await kubernetesController.cluster_registeration(data);

            res.status(result.status).json(result);
        } catch (error) {
            next(error);
        }
    }
);

router.get("/v1/curr/cluster", [authenticator, isAdmin], async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        let data: Partial<ActionRequest> = {}
        data.req = req.data


        const result = await kubernetesController.default_cluster_info(data)
        res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }
})


router.get("/v1/info/:namespace/:provider/:environment", [authenticator, isAdmin], async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        let data: Partial<ActionRequest> = { ...req.query, ...req.params }
        data.req = req.data


        const result = await kubernetesController.getInfo(data)
        res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }
})

router.get("/v1/ns", [authenticator, isAdmin], async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        let data: Partial<ActionRequest> = {
            req: req.data,
            ...req.query
        }

        const result = await kubernetesController.getNamespaces(data)
        res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }
})

router.get("/v1/resources/:type", [authenticator, isAdmin], async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        let data: Partial<ActionRequest> = {
            req: req.data,
            ...req.params,
            ...req.query
        }

        const result = await kubernetesController.getResourcesDetails(data)
        res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }
})

router.get("/v1/resource/detail/:name/:type/:namespace", [authenticator, isAdmin], async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        let data: Partial<ActionRequest> = {
            req: req.data,
            ...req.params,
            ...req.query
        }
        const result = await kubernetesController.getResourceSpecificDetails(data)

        res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }
})

router.get("/v1/events/:namespace", [authenticator, isAdmin], async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        let data: Partial<ActionRequest> = {
            req: req.data,
            ...req.params,
        }
        const result = await kubernetesController.getEvents(data)

        res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }
})
router.get("/v1/pods/usage/:namespace", [authenticator, isAdmin], async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        let data: Partial<ActionRequest> = {
            req: req.data,
            ...req.params,
        }
        const result = await kubernetesController.getPodsUsage(data)

        res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }
})

router.get("/v1/prov/env", [authenticator, isAdmin], async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        let data: Partial<ActionRequest> = {
            req: req.data,
            ...req.query
        }
        const result = await kubernetesController.getProviderAndEnvironment(data)

        res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }
})


router.get("/v1/envs", [authenticator, isAdmin], async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        let data: Partial<ActionRequest> = {
            req: req.data,
            ...req.query
        }
        const result = await kubernetesController.getEnvironments(data)

        res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }
})
export default router