import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/commandTypes.js";

// Might change this later to use components
const higherOrLower: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName("higher_or_lower")
        .setDescription("Play the number guessing game.")
        .addIntegerOption((no) =>
            no
                .setName("max_number")
                .setDescription("Maximum number that can be guessed")
                .setMinValue(0)
                .setMaxValue(10_000),
        ),
    execute: async (interaction) => {
        if (!interaction.channel?.isSendable()) {
            await interaction.reply({
                content: "Cannot play higher or lower in this channel",
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const maxNumber = interaction.options.getInteger("max_number") || 100;
        const randomNumber = Math.floor(Math.random() * maxNumber);

        await interaction.reply({ content: `Guess the number between 0-${maxNumber}` });

        const collector = interaction.channel.createMessageCollector({
            filter: (m) => m.author.id === interaction.user.id,
            time: 30_000,
        });

        collector.on("end", async (_, reason) => {
            if (reason === "time") {
                await interaction.followUp({ content: "You have ran out of time for this game of Higher or Lower" });
            }
        });

        collector.on("collect", async (message) => {
            const guessed = Number(message.content);
            if (!guessed) return;

            if (guessed === randomNumber) {
                collector.stop();
                await interaction.followUp({ content: `Correct! the number is ${randomNumber}` });
                return;
            }

            await interaction.followUp({ content: guessed > randomNumber ? "Lower" : "Higher" });
        });
    },
};

export default higherOrLower;
