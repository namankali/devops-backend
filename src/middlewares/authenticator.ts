                                            import { NextFunction, Request, Response } from "express"
                                            import { CustomRequest } from "../utils/interfaces"
                                            import jwt from "jsonwebtoken"
                                            import { ACCESS_TOKEN_SECRET, JWT_SECRET } from "../helper/configHelper"
                                            import { decryptForAccessToken } from "../helper/secret_functions"
                                            import { get_session_by_id } from "../models/pg/sessions"
                                            import { throwError } from "../controllers/common"
                                            export const authenticator = async (
                                                req: CustomRequest,
                                                res: Response,
                                                next: NextFunction
                                            ) => {
                                                try {
                                                    const refreshToken = req.cookies["refresh-token"] || req.body?.token;

                                                    const accessToken = req.headers?.["x-access-token"]
                                                    if (typeof accessToken !== "string") return res.status(401).json({
                                                        message: "Access token missing",
                                                        success: false
                                                    })

                                                    let decoded;

                                                    try {
                                                        decoded = jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
                                                    } catch (err: any) {
                                                        if (err.name === "TokenExpiredError") {
                                                            if (!refreshToken) {
                                                                res.status(401).json({ message: "No refresh token" });
                                                                return;
                                                            }

                                                            try {
                                                                jwt.verify(refreshToken, JWT_SECRET);

                                                                res.status(401).json({
                                                                    message: "Access expired, refresh valid",
                                                                    refreshRequired: true
                                                                });
                                                                return;

                                                            } catch {
                                                                res.status(401).json({
                                                                    message: "Refresh token expired",
                                                                    forceLogout: true
                                                                });
                                                                return;
                                                            }
                                                        }

                                                        res.status(401).json({ message: "Invalid token" });
                                                        return;
                                                    }

                                                    if (typeof decoded !== "object" || decoded === null) {
                                                        return res.status(401).json({
                                                            message: "Invalid token payload",
                                                            success: false,
                                                        });
                                                    }

                                                    const decryptedData = await decryptForAccessToken(decoded.encryptedData)

                                                    const is_valid_session = await get_session_by_id(+decryptedData.session_id)
                                                    
                                                    if (Array.isArray(is_valid_session) && is_valid_session.length > 0) {
                                                        // const user_data_ = await users_model.fetchSingleUser({ user_id: decryptedData.user_id })

                                                        // const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || req.connection?.remoteAddress;

                                                        // const sessionIsActive = await new Promise((resolve, reject) => {
                                                        //     session_controller.fetchSession({ session_id: decryptedData.session_id, refreshToken }, (result) => {
                                                        //         if (!result || result.success === false) {
                                                        //             reject(new Error(result?.message || "Session not active"));
                                                        //         } else {
                                                        //             resolve(result);
                                                        //         }
                                                        //     });
                                                        // });

                                                        req.data = {
                                                            ...decryptedData,
                                                            "refresh-token": refreshToken,
                                                            // client_ip: ip
                                                        };

                                                        next();
                                                    } else {
                                                        return res.status(401).json({
                                                            message: "Session is logout out",
                                                            success: false,
                                                            forceLogout: true
                                                        });
                                                    }

                                                } catch (error: any) {
                                                    console.log(error)
                                                    throw throwError("Authentication failed")
                                                }
                                            }