import {
    AttachmentBuilder,
    ChatInputCommandInteraction,
    ContainerBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";
import type { SlashCommand } from "../../types/commandTypes.js";
import words from "../../resources/hangman/words.json" with { type: "json" };
import path from "node:path";

type Difficulty = "easy" | "medium" | "hard";

const hangmanPath = path.join(import.meta.dirname, "..", "..", "resources", "hangman");

// Tbf I guess I could get all these with fs package but it seems overkill for just these 7 pngs
const images = [
    new AttachmentBuilder(path.join(hangmanPath, "guesses0.png"), { name: "guesses0.png" }),
    new AttachmentBuilder(path.join(hangmanPath, "guesses1.png"), { name: "guesses1.png" }),
    new AttachmentBuilder(path.join(hangmanPath, "guesses2.png"), { name: "guesses2.png" }),
    new AttachmentBuilder(path.join(hangmanPath, "guesses3.png"), { name: "guesses3.png" }),
    new AttachmentBuilder(path.join(hangmanPath, "guesses4.png"), { name: "guesses4.png" }),
    new AttachmentBuilder(path.join(hangmanPath, "guesses5.png"), { name: "guesses5.png" }),
    new AttachmentBuilder(path.join(hangmanPath, "guesses6.png"), { name: "guesses6.png" }),
];

function displayGame(
    interaction: ChatInputCommandInteraction,
    guessesLeft: number,
    wrongGuesses: string[],
    currentGuess: (null | string)[],
    initialReply?: boolean,
) {
    const display = new ContainerBuilder()
        .addTextDisplayComponents(
            (td) => td.setContent("### Hangman"),
            (td) => td.setContent(`Incorrect guesses: ${wrongGuesses.join(", ") || "None"}`),
            (td) => td.setContent(`Guesses left: ${guessesLeft}`),
            (td) => td.setContent(`Current guess: \`${currentGuess.map((v) => (v = v === null ? "_" : v)).join("")}\``),
        )
        .addMediaGalleryComponents((mg) =>
            mg.addItems(new MediaGalleryItemBuilder().setURL(`attachment://guesses${guessesLeft}.png`)),
        );

    const payload = {
        components: [display],
        files: [images[guessesLeft]] as AttachmentBuilder[],
        flags: MessageFlags.IsComponentsV2 as const,
    };

    return initialReply ? interaction.reply(payload) : interaction.followUp(payload);
}

// Used for both win and lose display
function displayEnd(interaction: ChatInputCommandInteraction, won: boolean, guessesLeft: number, word: string) {
    const display = new ContainerBuilder()
        .addTextDisplayComponents(
            (td) => td.setContent("### Hangman"),
            (td) => td.setContent(`You ${won ? "won" : "lose"}. The word was ${word}`),
        )
        .addMediaGalleryComponents((mg) =>
            mg.addItems(new MediaGalleryItemBuilder().setURL(`attachment://guesses${guessesLeft}.png`)),
        );

    return interaction.followUp({
        components: [display],
        files: [images[guessesLeft]] as AttachmentBuilder[],
        flags: MessageFlags.IsComponentsV2,
    });
}

function displayTimeRanOut(interaction: ChatInputCommandInteraction) {
    const display = new ContainerBuilder().addTextDisplayComponents(
        (td) => td.setContent("### Hangman"),
        (td) => td.setContent(`You have ran out of time`),
    );

    return interaction.followUp({
        components: [display],
        flags: MessageFlags.IsComponentsV2,
    });
}

async function playGame(interaction: ChatInputCommandInteraction, word: string) {
    if (!interaction.channel?.isSendable()) {
        await interaction.reply({ content: "Cannot play hangman in this channel", flags: MessageFlags.Ephemeral });
        return;
    }

    const wrongGuesses: string[] = [];
    const guess: (null | string)[] = Array(word.length).fill(null);
    let guessesLeft = 6;

    await displayGame(interaction, guessesLeft, wrongGuesses, guess, true);

    const collector = interaction.channel.createMessageCollector({
        time: 120_000,
        filter: (message) => message.content.length === 1 && /[a-z]/i.test(message.content.toLowerCase()),
    });

    collector.on("end", async (_, reason) => {
        if (reason === "time") {
            await displayTimeRanOut(interaction);
        }
    });

    collector.on("collect", async (message) => {
        // Try/catch block might not be necessary
        try {
            const letter = message.content.toLowerCase();
            const alreadyFound = guess.find((l) => l === letter); // Letter is correct and already guessed

            // Letter is correct and not already found
            if (word.includes(letter) && !alreadyFound) {
                // Word could have multiple letters that are the same
                const letterIndexes: number[] = [];
                word.split("").forEach((l, i) => {
                    if (l === letter) {
                        letterIndexes.push(i);
                    }
                });

                letterIndexes.forEach((v) => (guess[v] = letter));
            } else {
                // Letter is either incorrect or correct but already found
                if (!alreadyFound) wrongGuesses.push(letter);
                guessesLeft -= 1;
            }

            // Check game state (word is correct, no guesses left, or to continue playing)
            if (guess.join("") === word) {
                // Game won
                collector.stop();
                await displayEnd(interaction, true, guessesLeft, word);
            } else if (guessesLeft <= 0) {
                // Game lost
                collector.stop();
                await displayEnd(interaction, false, guessesLeft, word);
            } else {
                // Update display
                await displayGame(interaction, guessesLeft, wrongGuesses, guess);
            }
        } catch (error) {
            console.log(error);
        }
    });
}

const hangman: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName("hangman")
        .setDescription("Play hangman")
        .addStringOption((sc) =>
            sc
                .setChoices(
                    { name: "easy", value: "easy" },
                    { name: "medium", value: "medium" },
                    { name: "hard", value: "hard" },
                )
                .setName("difficulty")
                .setDescription("Word difficulty")
                .setRequired(true),
        ),
    execute: async (interaction) => {
        const difficulty = interaction.options.getString("difficulty", true) as Difficulty;
        const randomWord = words[difficulty][Math.floor(Math.random() * words[difficulty].length)];
        if (!randomWord) {
            await interaction.reply({ content: "Unable to get a random word", flags: MessageFlags.Ephemeral });
            return;
        }

        await playGame(interaction, randomWord);
    },
};

export default hangman;
