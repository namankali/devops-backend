import app from "../app";

import http from "http"

const PORT = process.env.PORT || 3001

app.set("port", PORT)
const server = http.createServer(app)

server.listen(PORT)
server.on("error", onError)
server.on("listening", onListening)
console.log(`AI devops server has started ast port: ${PORT}`)

function onError(error: NodeJS.ErrnoException ): void{
    if(error.syscall !== "listen"){
        throw error
    }
}

function onListening(): void{
    let add = server.address()
    if(!add) return
    let bind = typeof add === "string" ? "pipe" + add : "port" + add.port
    console.log("Listening on " + bind);
}