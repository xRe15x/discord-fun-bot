import {
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    ContainerBuilder,
    InteractionCallbackResponse,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";
import type { SlashCommand } from "../../types/commandTypes.js";
import responses from "../../resources/truthOrDare/responses.json" with { type: "json" };

type Choice = "truth" | "dare";

function getDisplay(choice: Choice, text: string) {
    return new ContainerBuilder()
        .addTextDisplayComponents(
            (td) => td.setContent(`# Truth or Dare (${choice})`),
            (td) => td.setContent(`## ${text}`),
            (td) => td.setContent("**Only** do truths and dares you are comfortable with"),
        )
        .addActionRowComponents((ar) =>
            ar.setComponents(
                new ButtonBuilder().setLabel(`Next ${choice}`).setCustomId("next").setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setLabel(`Switch to ${choice === "dare" ? "truth" : "dare"}`)
                    .setCustomId("switch")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setLabel("Cancel").setCustomId("cancel").setStyle(ButtonStyle.Danger),
            ),
        );
}

async function displayGame(interaction: ChatInputCommandInteraction | ButtonInteraction, choice: Choice) {
    const random = getRandomResponse(choice); // I don't know what else to name this variable
    const payload = {
        components: [getDisplay(choice, random || "Unable to get text")],
        flags: MessageFlags.IsComponentsV2 as const,
    };

    return interaction instanceof ButtonInteraction
        ? interaction.update(payload)
        : interaction.reply({ ...payload, withResponse: true });
}

function getRandomResponse(choice: Choice) {
    return responses[choice][Math.floor(Math.random() * responses[choice].length)];
}

function getMessageDisplay(message: string) {
    return new ContainerBuilder().addTextDisplayComponents(
        (td) => td.setContent("## Truth or Dare"),
        (td) => td.setContent(message),
    );
}

async function playGame(choice: Choice, interaction: ChatInputCommandInteraction) {
    const response = (await displayGame(interaction, choice)) as InteractionCallbackResponse<boolean>;
    const collector = response.resource?.message?.createMessageComponentCollector({
        time: 300_000, // 5 minutes might be too long
    });

    collector?.on("end", async (_, reason) => {
        if (reason === "time") {
            response.resource?.message?.edit({
                components: [getMessageDisplay("Time has ran out")],
            });
        }
    });

    collector?.on("collect", async (i) => {
        try {
            if (!(i instanceof ButtonInteraction)) return;
            const button = i.customId;

            if (button === "next") {
                await displayGame(i, choice);
            } else if (button === "switch") {
                await displayGame(i, choice === "truth" ? "dare" : "truth");
            } else if (button === "cancel") {
                collector.stop();
                await i.update({ components: [getMessageDisplay("You have cancelled")] });
            }
        } catch (error) {
            console.error(error);
        }
    });
}

const truthOrDare: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName("truth_or_dare")
        .setDescription("Get a random question to answer truthfully or dare to do")
        .addStringOption((so) =>
            so
                .setName("choice")
                .setDescription("Truth or dare")
                .setChoices({ name: "truth", value: "truth" }, { name: "dare", value: "dare" })
                .setRequired(true),
        ),
    execute: async (interaction) => {
        const choice = interaction.options.getString("choice", true) as Choice;
        console.log("A");
        await playGame(choice, interaction);
    },
};

export default truthOrDare;
