import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/commandTypes.js";

const ping: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription('Check if the bot is online, should reply with "Pong"'),
    execute: async (interaction) => {
        const response = await interaction.reply({ content: "Pong!", withResponse: true });
        const roundtripLatency = response.resource?.message?.createdTimestamp
            ? response.resource?.message?.createdTimestamp - interaction.createdTimestamp
            : "?";
        const websocketLatency = interaction.client.ws.ping;
        await interaction.editReply(`Pong! (Roundtrip: ${roundtripLatency}ms, Websocket: ${websocketLatency}ms)`);
    },
};

export default ping;
