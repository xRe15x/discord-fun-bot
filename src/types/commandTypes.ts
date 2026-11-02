import type {
    BaseInteraction,
    ChatInputCommandInteraction,
    Collection,
    RESTPostAPIApplicationCommandsJSONBody,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

interface BaseCommand<
    TData extends { name: string; toJSON: () => RESTPostAPIApplicationCommandsJSONBody },
    TInteraction extends BaseInteraction,
> {
    data: TData;
    execute: (interaction: TInteraction) => Promise<void> | void;
}

export type SlashCommand = BaseCommand<
    SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder,
    ChatInputCommandInteraction
>;

export type AnyCommand = SlashCommand & { category: string };

declare module "discord.js" {
    interface Client {
        commands: Collection<string, AnyCommand>;
    }
}
