import { NextFunction, Request, Response } from "express"

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
)=>{
    console.log("Error", err)

    if (err.payload){
        return res.status(err.status || 500).json(err.payload)
    }

    return res.status(err.status || 500).json({
        message: err.message || "internal Server Error"
    })
}