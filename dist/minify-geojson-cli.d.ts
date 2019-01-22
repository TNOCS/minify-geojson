import { OptionDefinition } from 'command-line-args';
export interface FixedOptionDefinition extends OptionDefinition {
    description: string;
    typeLabel: string;
}
export declare class CommandLineInterface {
    static optionDefinitions: FixedOptionDefinition[];
    static sections: ({
        header: string;
        content: string;
        optionList?: undefined;
    } | {
        header: string;
        optionList: FixedOptionDefinition[];
        content?: undefined;
    } | {
        header: string;
        content: {
            desc: string;
            example: string;
        }[];
        optionList?: undefined;
    })[];
}
