import { NextFunction, Response } from "express";
import { CustomRequest } from "../utils/interfaces";

export const isAdmin = (
    req: CustomRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.data) {
            return res.status(401).json({
                message: "Unauthorized: Missing user data",
                success: false,
            });
        }

        if (req.data.role === "admin") {
            return next();
        }

        return res.status(403).json({
            message: "Forbidden: Admins only",
            success: false,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Something went wrong",
            success: false,
        });
    }
};