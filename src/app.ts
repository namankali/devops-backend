import express, { NextFunction, Request, Response } from "express"
import cors from "cors"
import morgan from "morgan"
import compression from "compression"
import cookie_parser from "cookie-parser"
import helmet from "helmet"

const app = express()

// Routes
import index from "./routes/index"
import metrics from "./routes/metrics"
import users from "./routes/users"
import actions from "./routes/actions"
import { errorHandler } from "./middlewares/errorHandler"


app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}))
app.use(express.json())
app.use(compression())
app.use(express.urlencoded({ extended: true }))
app.use(helmet({
    contentSecurityPolicy: false
}))
app.use(cookie_parser())

app.use(
    morgan(`
        :method :url :status :res[content-length] - :response-time ms :remote-addr :user-agent
        `)
)
app.use(errorHandler)

// Routes
app.use("/api/index", index)
app.use("/api/metrics", metrics)
app.use("/api/users", users)
app.use("/api/actions", actions)

// ---------------- Disable caching ---------------- //
app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
});

app.use(function (err: unknown, req: Request, res: Response, next: NextFunction) {
    let message = "Internal Server Error"
    let status = 500

    if (err instanceof Error) {
        message = err.message
    }

    if (typeof err === "object" && err !== null && "status" in err) {
        status = (err as any).status
    }

    res.status(status).json({
        success: true,
        message,
        error: process.env.NODE_ENV === "development" ? err : {}
    })
});

export default app
