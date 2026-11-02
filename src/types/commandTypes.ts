import type {
    BaseInteraction,
    ChatInputCommandInteraction,
    Collection,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export interface BaseCommand {
    data: SlashCommandBuilder;
    execute: (interaction: BaseInteraction) => Promise<void> | void;
}

export interface SlashCommand {
    data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void> | void;
}

declare module "discord.js" {
    interface Client {
        commands: Collection<string, BaseCommand>;
    }
}
