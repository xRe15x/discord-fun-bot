import { ContainerBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/commandTypes.js";

type commandList = Record<string, string[]>;

function displayPage(commands: commandList) {
    const flattened = Object.entries(commands).flat().flat();
    return new ContainerBuilder().addTextDisplayComponents(
        (td) => td.setContent("## Commands"),
        (td) => td.setContent(flattened.join("")),
        (td) => td.setContent("**Remind me to add page functionality if this eventually gets a lot of commands**"),
    );
}

const commands: SlashCommand = {
    data: new SlashCommandBuilder().setName("commands").setDescription("List all commands"),
    execute: async (interaction) => {
        let commands: commandList = {};
        interaction.client.commands.values().forEach((v) => {
            (commands[`### ${v.category}\n`] ??= []).push(
                `/${v.data.name} - ${v.data.description || "No description"}\n`,
            );
        });

        await interaction.reply({ components: [displayPage(commands)], flags: MessageFlags.IsComponentsV2 });
    },
};

export default commands;
