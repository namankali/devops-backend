import moment from "moment";
import jwt from "jsonwebtoken"
import { decryptForAccessToken, decryptForRefreshToken, generateAccessToken, hashPassword, isValidPassword, refreshToken } from "../helper/secret_functions";
import { fetch_single_user_by_email, insert_user, profile } from "../models/pg/users";
import { LoginResponseType, Logout, Signin, UserProfile, UserSignup } from "../utils/interfaces";
import { ResponseBuilder } from "../utils/responseBuilder";
import { ApiResponse } from "../utils/types";
import { throwError } from "./common";

import { insert_session, update_session, findByRefreshToken } from "../models/pg/sessions";
import { JWT_SECRET } from "../helper/configHelper";

export class UserController {
    constructor() { }

    async signup(data: any): Promise<ApiResponse<void>> {
        try {
            const password = data.password?.trim();
            if (!password) throwError("Password is required", 400);

            const email = data.email?.trim();
            if (!email) throwError("Email is required", 400);

            const hashedPassword = await hashPassword(password);

            let username_ = data.fullname.trim().split(" ")
            username_ = (username_[0] + username_[1].slice(0, 1)).toLowerCase()

            const insertData: UserSignup = {
                email,
                username: data.username || username_,
                full_name: data.fullname.trim() || "",
                password_hash: hashedPassword,
                role: data.role || "member"
            };

            const alreadyPresent = await fetch_single_user_by_email(email);

            if (alreadyPresent) {
                throwError("User with same email is already present", 400);
            }

            await insert_user(insertData);

            return new ResponseBuilder<void>()
                .setSignature("AI-DEVOPS")
                .success(undefined, "Signed up successfully", 200);

        } catch (error: any) {
            console.log(error)
            throw throwError("Something went wrong");
        }
    }

    async signin(data: Signin): Promise<ApiResponse<LoginResponseType>> {
        try {
            let fetch_user_details = await fetch_single_user_by_email(data.email, true)

            if (typeof fetch_user_details === "boolean" || !fetch_user_details) {
                const response = new ResponseBuilder<LoginResponseType>()
                    .setSignature("AI-DEVOPS")
                    .error("User not found", 400)
                return response
            }

            const is_valid_password = await isValidPassword(data.password, { hash_pass: fetch_user_details.password_hash })

            if (is_valid_password) {
                const token_data = {
                    email: fetch_user_details.email,
                    user_id: fetch_user_details.id,
                    role: fetch_user_details.role,
                    username: fetch_user_details.username,
                    date: moment().format("YYYY-MM-DD HH:MM:SS")
                }

                const refresh_token = await refreshToken(token_data)
                console.log("refesh token", data)

                // const ip = data.ip? data.ip.split(".").slice(0,3).join(".")

                const session_data = {
                    session_token: refresh_token,
                    user_id: fetch_user_details.id,
                    role: fetch_user_details.role,
                    // ip_subnet: ip,
                    device_type: data?.['user-agent']?.includes('Mobile') ? 'Mobile' : 'Desktop',
                    browser_family: data['user-agent']?.split(' ')[0] || "",
                }

                const session_result = await insert_session(session_data)

                const accessTokenData = {
                    user_id: fetch_user_details.id,
                    email: data.email,
                    role: fetch_user_details.role,
                    username: fetch_user_details.username,
                    session_id: session_result.id
                }

                const accessToken = await generateAccessToken(accessTokenData)

                const response_data = {
                    refresh_token,
                    "x-access-token": accessToken,
                    user_id: fetch_user_details.id,
                    username: fetch_user_details.username,
                    role: fetch_user_details.role,
                }

                return new ResponseBuilder<LoginResponseType>()
                    .setSignature("AI-DEVOPS")
                    .success(response_data, "Logined in successfully")
            } else {
                return throwError("Password is incorrect", 400)
            }
        } catch (error) {
            console.log(error)
            throw throwError("Something went wrong")
        }
    }

    async signout(data: any): Promise<ApiResponse<void>> {
        try {
            console.log("incoming controller data", data)
            const session_id = data.req.session_id
            if (!session_id) {
                return throwError("Session_id not found", 400)
            }

            const query_response = await update_session(session_id)
            console.log("query_response", query_response)
            return new ResponseBuilder<void>()
                .setSignature("AI-DEVOPS")
                .success(undefined, "logged out successfully", 200);


        } catch (error) {
            console.log(error)
            throw throwError("Something went wrong");
        }
    }

    async profile(data: any): Promise<ApiResponse<UserProfile>> {
        try {

            const model_response = await profile(data.req.user_id)

            return new ResponseBuilder<UserProfile>()
                .setSignature("AI-DEVOPS")
                .success(model_response[0], "profile data fetched", 200);
        } catch (error) {
            console.log(error)
            throw throwError("Something went wrong");
        }
    }

    async refresh(data: any): Promise<ApiResponse<Record<string, any>>> {
        try {
            console.log("refresh token", data)
            const refreshToken = data.req?.["refresh-token"] || data.token;

            if (!refreshToken) {
                return new ResponseBuilder<any>()
                    .setSignature("AI-DEVOPS")
                    .success(undefined, "Refresh token missing", 401);
            }

            let decoded: any;

            try {
                decoded = jwt.verify(refreshToken, JWT_SECRET);
            } catch (err: any) {

                if (err.name === "TokenExpiredError") {

                    await update_session(data.req.session_id);

                    return new ResponseBuilder<any>()
                        .setSignature("AI-DEVOPS")
                        .success(undefined, "Refresh token expired", 401);
                }

                return new ResponseBuilder<any>()
                    .setSignature("AI-DEVOPS")
                    .success(undefined, "Refresh token invalid", 401);
            }

            const decrypted = await decryptForRefreshToken(decoded.encryptedData);

            const session = await findByRefreshToken(refreshToken);

            if (!Array.isArray(session) || session.length === 0) {
                return new ResponseBuilder<any>()
                    .setSignature("AI-DEVOPS")
                    .success(undefined, "Session inactive or not found", 401);
            }
            console.log("decrypted refresh token data", decrypted)
            const newAccessToken = await generateAccessToken({ ...decrypted, "session_id": session?.[0].id });

            return new ResponseBuilder<Record<string, any>>()
                .setSignature("AI-DEVOPS")
                .success(
                    { accessToken: newAccessToken },
                    "New access token generated",
                    201
                );

        } catch (error) {
            console.log(error);
            throw throwError("Something went wrong");
        }
    }

    // async add_team(data: any): Promise<ApiResponse<void>> {
    //     try {

    //         const team_data = {

    //         }

    //         return new ResponseBuilder<void>()
    //             .setSignature("AI-DEVOPS")
    //             .success(undefined, "Added successfully", 201);
    //     } catch (error) {
    //         console.log(error)
    //         throw throwError("Something went wrong")
    //     }
    // }

    // async add_member(data: any): Promise<ApiResponse<void>> {
    //     try {



    //         return new ResponseBuilder<void>()
    //             .setSignature("AI-DEVOPS")
    //             .success(undefined, "Added successfully", 201);
    //     } catch (error) {
    //         console.log(error)
    //         throw throwError("Something went wrong")
    //     }
    // }

    async add_member(data: any): Promise<ApiResponse<void>> {
        try {
            const authorization = data.req;
            if (authorization.role !== "admin") throwError("Unauthorized", 401);

            const password = data.password?.trim();
            if (!password) throwError("Password is required", 400);

            const email = data.email?.trim();
            if (!email) throwError("Email is required", 400);

            const hashedPassword = await hashPassword(password);

            let username_ = data.fullname.trim().split(" ")
            username_ = (username_[0] + username_[1].slice(0, 1)).toLowerCase()

            const insertData: UserSignup = {
                email,
                username: data.username || username_,
                full_name: data.fullname.trim() || "",
                password_hash: hashedPassword
            };

            const alreadyPresent = await fetch_single_user_by_email(email);

            if (alreadyPresent) {
                throwError("User with same email is already present", 400);
            }

            await insert_user(insertData);

            return new ResponseBuilder<void>()
                .setSignature("AI-DEVOPS")
                .success(undefined, "Signed up successfully", 200);

        } catch (error: any) {
            console.log(error)
            throw throwError("Something went wrong");
        }
    }
}