import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/commandTypes.js";

const ping: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription('Check if the bot is online, should reply with "Pong"'),
    execute: async (interaction) => {
        const reply = await interaction.reply("Pong!");
        await interaction.editReply(`Pong! (${reply.createdTimestamp - interaction.createdTimestamp}ms)`);
    },
};

export default ping;
