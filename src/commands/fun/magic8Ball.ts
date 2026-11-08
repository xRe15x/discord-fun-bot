import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/commandTypes.js";
import responses from "../../resources/magic8ball/responses.json" with { type: "json" };

const magic8Ball: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName("8ball")
        .setDescription("Ask the magic 8 ball a question")
        .addStringOption((i) => i.setName("question").setDescription("Question to ask").setRequired(true)),
    execute: async (interaction) => {
        await interaction.reply(responses[Math.floor(Math.random() * responses.length)] ?? "Unable to get response");
    },
};

export default magic8Ball;
