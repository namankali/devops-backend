import yaml from "js-yaml"

export class GeneralHelper {
    constructor() { }

    static parseYamlFile(data: any) {

        const file_content = data.buffer.toString()
        const kubeconfig = yaml.load(file_content)
        return kubeconfig as any
    }
}