import express, { NextFunction, Request, Response } from "express"
import { UserController } from "../controllers/users"
import { authenticator } from "../middlewares/authenticator"
import { CustomRequest } from "../utils/interfaces"

const router = express.Router()
const userController = new UserController()
router.post("/v1/signup", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        let data = { ...req.body }

        const result = await userController.signup(data)

        res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }
})

router.post("/v1/login", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        let data = { ...req.body }

        const result = await userController.signin(data)

        if (!result.success || !result.data) {
            res.status(result.status).send(result);
            return
        }

        res.cookie("refresh-token", result.data["refresh_token"], {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 8 * 60 * 60 * 1000
        })

        res.cookie("x-access-token", result.data["x-access-token"], {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 2 * 60 * 60 * 1000,
            path: "/"
        })

        res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }
})

router.patch(
    "/v1/signout",
    authenticator,
    async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            let data = { ...req.body };
            data.req = req.data

            const result = await userController.signout(data)

            res.clearCookie("refresh-token", {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/'
            });

            res.clearCookie("x-access-token", {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/'
            })

            res.status(result.status).send(result)
        } catch (error) {
            next(error)
        }
    });

// router.post(
//     "/v1/add/team",
//     authenticator,
//     async (req: CustomRequest, res: Response, next: NextFunction) => {
//         try {
//             let data = { ...req.body }
//             data.req = req.data

//             const result = await userController.add_team(data)

//         } catch (error) {
//             next(error)
//         }
//     }
// )

// router.post(
//     "/v1/add/member",
//     authenticator,
//     async (req: CustomRequest, res: Response, next: NextFunction) => {
//         try {
//             let data = { ...req.body }
//             data.req = req.data

//             // const result = await 

//         } catch (error) {
//             next(error)
//         }
//     }
// )

router.post(
    "/v1/add_member",
    authenticator,
    async (req: CustomRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        let data = { ...req.body }
        data.req = req.data

        const result = await userController.add_member(data)

        res.status(result.status).send(result)
    } catch (error) {
        next(error)
    }
})


export default router