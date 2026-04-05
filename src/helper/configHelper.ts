require("dotenv").config()
import ms, { StringValue } from "ms"
const ACCESS_TOKEN_SECRET = (() => {
    const secret = process.env.ACCESS_TOKEN_SECRET
    if (!secret) throw new Error("Missing Access token secret")
    return secret
})()

const JWT_SECRET = (() => {
    const jwt_secret = process.env.JWT_SECRET
    if (!jwt_secret) throw new Error("Missing jwt secret")
    return jwt_secret
})()

const ENCRYPTION_IV = (() => {
    const encrypt_iv = process.env.ENCRYPTION_IV
    if (!encrypt_iv) throw new Error("Missing jwt secret")
    return encrypt_iv
})()

const ENCRYPTION_ALGO = (() => {
    const encrypt_algo = process.env.ENCRYPTION_ALGO
    if (!encrypt_algo) throw new Error("Missing jwt secret")
    return encrypt_algo
})()

const ENCRYPTION_SECRET = (() => {
    const encrypt_secret = process.env.ENCRYPTION_SECRET
    if (!encrypt_secret) throw new Error("Missing jwt secret")
    return encrypt_secret
})()

const ACCESS_TOKEN_EXPIRES_IN = (() => {
    const expires_in = process.env.ACCESS_TOKEN_EXPIRES_IN
    if (!expires_in) throw new Error("Missing jwt secret")

    const parsed = ms(expires_in as StringValue);
    if (typeof parsed !== "number") {
        throw new Error("Invalid ACCESS_TOKEN_EXPIRES_IN format");
    }

    return expires_in as StringValue
})()

const JWT_EXPIRES_IN = (() => {
    const expires_in = process.env.JWT_EXPIRES_IN
    if (!expires_in) throw new Error("Missing jwt secret")

    const parsed = ms(expires_in as StringValue);
    if (typeof parsed !== "number") {
        throw new Error("Invalid JWT_EXPIRES_IN format");
    }

    return expires_in as StringValue
})()

const PEPPER = (() => {
    const pepper = process.env.PEPPER
    if (!pepper) throw new Error("Missing pepper")
    return pepper
})()

const SALT_ROUNDS = (() => {
    const rounds = process.env.SALT_ROUNDS
    if (!rounds) throw new Error("Missing pepper")
    return rounds
})()

export {
    ACCESS_TOKEN_SECRET,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    ENCRYPTION_IV,
    ENCRYPTION_ALGO,
    ENCRYPTION_SECRET,
    ACCESS_TOKEN_EXPIRES_IN,
    PEPPER,
    SALT_ROUNDS
}