import moment from "moment";
import { generateAccessToken, hashPassword, isValidPassword, refreshToken } from "../helper/secret_functions";
import { fetch_single_user_by_email, insert_user } from "../models/pg/users";
import { LoginResponseType, Logout, Signin, UserSignup } from "../utils/interfaces";
import { ResponseBuilder } from "../utils/responseBuilder";
import { ApiResponse } from "../utils/types";
import { throwError } from "./common";
import { insert_session, update_session } from "../models/pg/sessions";

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
                    session_id: session_result.id,
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

    async signout(data: Logout): Promise<ApiResponse<void>> {
        try {
            const session_token = data.req["refresh-token"]
            if (!session_token || session_token.length === 0) {
                return throwError("Refresh token was not found", 400)
            }

            await update_session(session_token)

            return new ResponseBuilder<void>()
                .setSignature("AI-DEVOPS")
                .success(undefined, "logged out successfully", 200);


        } catch (error) {
            console.log(error)
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