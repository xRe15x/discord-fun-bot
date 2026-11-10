import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/commandTypes.js";
import facts from "../../resources/fact/facts.json" with { type: "json" };

// Might change this later to use components
const fact: SlashCommand = {
    data: new SlashCommandBuilder().setName("fact").setDescription("Get a random fact"),
    execute: async (interaction) => {
        const randomFact = facts[Math.floor(Math.random() * facts.length)];
        if (!randomFact) {
            await interaction.reply({ content: "Unable to get random fact", flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.reply(randomFact);
    },
};

export default fact;
