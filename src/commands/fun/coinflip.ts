import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../../types/commandTypes.js";

const chances = { "on heads": 50, "on tails": 50, "balanced upright": 0.1 };

function getRandom(): string {
    const cumulativeWeights: number[] = [];
    Object.values(chances).forEach((v, i) => {
        cumulativeWeights[i] = v + (cumulativeWeights[i - 1] ?? 0);
    });

    const random = Math.random() * cumulativeWeights.at(-1)!;
    const index = cumulativeWeights.findIndex((v) => v >= random);

    console.log(index, random, cumulativeWeights);

    return Object.keys(chances)[index] ?? "Unknown";
}

const coinflip: SlashCommand = {
    data: new SlashCommandBuilder().setName("coinflip").setDescription("Flip a coin"),
    execute: async (interaction) => {
        await interaction.reply(`The coin has landed ${getRandom()}`);
    },
};

export default coinflip;
