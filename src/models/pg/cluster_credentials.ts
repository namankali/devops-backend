require("dotenv").config()
const db = require("./db")

const table = "cluster_credentials"


const insert_cluster_credentials = async (data: any) => {
    try {
        const data_for_insertion = {
            cluster_id: data.cluster_id,
            authentication_type: data.authentication_type,
            kubeconfig: data.kubeconfig,
            bearer_token: data.bearer_token,
            client_certificate: data.client_certificate,
            client_key: data.client_key,
            certificate_authority: data.certificate_authority
        }

        const result = await db(table).insert(data_for_insertion)
        return result

    } catch (error) {
        throw error
    }
}

export {
    insert_cluster_credentials
}