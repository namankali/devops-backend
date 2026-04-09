import crypto from "crypto"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import { ACCESS_TOKEN_EXPIRES_IN, ACCESS_TOKEN_SECRET, ENCRYPTION_ALGO, ENCRYPTION_IV, ENCRYPTION_SECRET, GITHUB_ENCRYPTION_ALGO, JWT_EXPIRES_IN, JWT_SECRET, PEPPER, SALT_ROUNDS } from "./configHelper"
import { AccessTokenData, GithubTokenEncryptedData, RefreshToken } from "../utils/interfaces"

const IV_LENGTH = 12;
const key = crypto.randomBytes(32)

function encryptGithubToken(text: string, key: Buffer) {
    const iv = crypto.randomBytes(IV_LENGTH);
    console.log("GITHUB_ENCRYPTION_ALGO", GITHUB_ENCRYPTION_ALGO, "text", text)
    const cipher = crypto.createCipheriv(
        GITHUB_ENCRYPTION_ALGO,
        key,
        iv,
        { authTagLength: 16 }
    );

    const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return {
        iv: iv.toString('hex'),
        content: encrypted.toString('hex'),
        tag: authTag.toString('hex'),
    };
}

function decryptGithubToken(encryptedData: GithubTokenEncryptedData, key: Buffer) {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');
    const content = Buffer.from(encryptedData.content, 'hex');

    const decipher = crypto.createDecipheriv(GITHUB_ENCRYPTION_ALGO, key, iv, {
        authTagLength: 16,
    });

    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
        decipher.update(content),
        decipher.final(),
    ]);

    return decrypted.toString('utf8');
}

const decryptForAccessToken = async (encryptedData: string) => {
    const crypto = require('crypto');

    if (!encryptedData) {
        throw new Error("No encrypted data provided for decryption");
    }

    let secretKey = Buffer.from(ACCESS_TOKEN_SECRET, 'base64');

    if (secretKey.length !== 32) {
        throw new Error("Access Token Invalid encryption key length. AES-256-CBC requires a 32-byte key.");
    }

    let iv = Buffer.from(ENCRYPTION_IV, 'utf-8');
    if (iv.length !== 16) {
        throw new Error("Invalid IV length. AES-CBC requires a 16-byte IV.");
    }

    const decipher = crypto.createDecipheriv(process.env.ENCRYPTION_ALGO, secretKey, iv);

    let decryptedData = decipher.update(encryptedData, 'hex', 'utf-8');
    decryptedData += decipher.final('utf-8');
    return JSON.parse(decryptedData);
}

const hashPassword = async (plain_password: string): Promise<string> => {
    const peppered_pass = plain_password + PEPPER
    try {
        const hash_pass = await bcrypt.hash(peppered_pass, Number(SALT_ROUNDS))
        return hash_pass
    } catch (error) {
        throw error
    }
}

const isValidPassword = async (password: string, compare_data: { hash_pass: string }): Promise<boolean> => {
    try {
        if (!password || !compare_data?.hash_pass) {
            throw new Error("Missing password or hashed password");
        }

        const pepperedPass = password + PEPPER
        const isMatch = await bcrypt.compare(pepperedPass, compare_data.hash_pass)

        return isMatch
    } catch (error) {
        throw error
    }
}

const encryptForRefreshToken = async (data: RefreshToken): Promise<string> => {
    const crypto = require('crypto');

    let secretKey = Buffer.from(ENCRYPTION_SECRET, 'utf-8');
    if (secretKey.length !== 32) {
        throw new Error("Invalid encryption key length. AES-256-CBC requires a 32-byte key.");
    }

    let iv = Buffer.from(ENCRYPTION_IV, 'utf-8');
    if (iv.length !== 16) {
        throw new Error("Invalid IV length. AES-CBC requires a 16-byte IV.");
    }

    const cipher = crypto.createCipheriv(process.env.ENCRYPTION_ALGO, secretKey, iv)
    let encryptedCipher = cipher.update(JSON.stringify(data) + "", "utf-8", "hex")
    encryptedCipher += cipher.final("hex")

    return encryptedCipher;

}

const refreshToken = async (data: RefreshToken): Promise<string> => {
    const encryptedData = await encryptForRefreshToken(data)
    const token = jwt.sign(
        {
            encryptedData: encryptedData
        },
        JWT_SECRET,
        {
            expiresIn: JWT_EXPIRES_IN
        })
    return token
}

const encryptForAccessToken = async (data: AccessTokenData) => {
    const secretKey = Buffer.from(ACCESS_TOKEN_SECRET, "base64")

    if (secretKey.length !== 32) {
        throw new Error("Access Token: Invalid encryption key length. AES-256-CBC requires a 32-byte key.");
    }

    let iv = Buffer.from(ENCRYPTION_IV, "utf-8")
    if (iv.length !== 16) {
        throw new Error("Invalid IV length. AES-CBC requires a 16-byte IV.");
    }

    const cipher = crypto.createCipheriv(ENCRYPTION_ALGO, secretKey, iv)
    let encryptedCipher = cipher.update(
        JSON.stringify(data) + "",
        "utf-8",
        'hex'
    )
    encryptedCipher += cipher.final("hex")

    return encryptedCipher
}

const generateAccessToken = async (data: AccessTokenData) => {
    const jwt = require('jsonwebtoken');

    const encryptedData = await encryptForAccessToken(data)
    const token = jwt.sign(
        {
            encryptedData: encryptedData
        },
        ACCESS_TOKEN_SECRET,
        {
            expiresIn: ACCESS_TOKEN_EXPIRES_IN
        })
    return token
}

function verifyGithubSignature(
    payload: Buffer,
    signature: string,
    secret: string
) {
    const hmac = crypto.createHmac("sha256", secret)
    const digest = `sha256=${hmac.update(payload).digest("hex")}`

    return crypto.timingSafeEqual(
        Buffer.from(digest),
        Buffer.from(signature)
    )
}

export {
    encryptGithubToken,
    decryptGithubToken,
    generateAccessToken,
    decryptForAccessToken,
    hashPassword,
    isValidPassword,
    refreshToken,
    verifyGithubSignature
}