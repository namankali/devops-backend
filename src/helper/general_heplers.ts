import yaml from "js-yaml"

export class GeneralHelper {
    constructor() { }

    static parseYamlFile(data: any) {
        console.log("File received!!!")

        const file_content = data.buffer.toString()
        const kubeconfig = yaml.load(file_content)
        return kubeconfig as any
    }
}