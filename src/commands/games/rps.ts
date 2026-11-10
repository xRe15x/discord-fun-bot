import {
    AttachmentBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    ContainerBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    SlashCommandBuilder,
    User,
} from "discord.js";
import type { SlashCommand } from "../../types/commandTypes.js";
import { loadImage, createCanvas, Image } from "@napi-rs/canvas";
import path from "node:path";

const rpsPath = path.join(import.meta.dirname, "..", "..", "resources", "rps");

const rockImage = await loadImage(path.join(rpsPath, "rock.png"));
const paperImage = await loadImage(path.join(rpsPath, "paper.png"));
const scissorsImage = await loadImage(path.join(rpsPath, "scissors.png"));
const images = { rock: rockImage, paper: paperImage, scissors: scissorsImage };

const choosingImage = await loadImage(path.join(rpsPath, "notChosen.png"));
const chosenImage = await loadImage(path.join(rpsPath, "chosen.png"));

type Choice = "rock" | "paper" | "scissors";
type WinResult = "user1" | "user2" | "tie";
const beats: Record<Choice, Choice> = {
    rock: "scissors",
    paper: "rock",
    scissors: "paper",
};

async function createImage(image1: Image, image2: Image, invertLeft?: boolean): Promise<AttachmentBuilder> {
    const canvas = createCanvas(250, 100);
    const ctx = canvas.getContext("2d");

    if (invertLeft) {
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(image1, canvas.width * 0.6, 0, canvas.height, canvas.height);
        ctx.restore();
    } else {
        ctx.drawImage(image1, canvas.width * 0.05, 0, canvas.height, canvas.height);
    }

    ctx.drawImage(image2, canvas.width * 0.6, 0, canvas.height, canvas.height);

    return new AttachmentBuilder(await canvas.encode("png"), { name: "image.png" });
}

async function displayResults(
    interaction: ButtonInteraction,
    user1: User,
    user2: User,
    user1Choice: Choice,
    user2Choice: Choice,
) {
    const resultsImage = await createImage(images[user1Choice], images[user2Choice], true);
    const winner = getWinner(user1Choice, user2Choice);
    const winnerId = winner === "tie" ? null : winner === "user1" ? user1.id : user2.id;

    const display = new ContainerBuilder()
        .addTextDisplayComponents(
            (td) => td.setContent("## Rock Paper Scissors"),
            (td) => td.setContent(`### ${user1.username} vs ${user2.username}`),
            (td) => td.setContent(winnerId ? `<@${winnerId}> has won` : "It's a tie"),
        )
        .addMediaGalleryComponents((mg) =>
            mg.addItems(
                new MediaGalleryItemBuilder()
                    .setURL("attachment://image.png")
                    .setDescription(`${user1.username}: ${user1Choice} ${user2.username}: ${user2Choice}`),
            ),
        );

    return interaction.update({
        components: [display],
        files: [resultsImage],
        attachments: [],
    });
}

async function displayGame(
    interaction: ButtonInteraction | ChatInputCommandInteraction,
    user1: User,
    user2: User,
    user1Choice: Choice | null,
    user2Choice: Choice | null,
) {
    const gameImage = await createImage(
        user1Choice ? chosenImage : choosingImage,
        user2Choice ? chosenImage : choosingImage,
    );

    const display = new ContainerBuilder()
        .addTextDisplayComponents(
            (td) => td.setContent("## Rock Paper Scissors"),
            (td) => td.setContent(`### ${user1.username} vs ${user2.username}`),
        )
        .addMediaGalleryComponents((mg) =>
            mg.addItems(
                new MediaGalleryItemBuilder()
                    .setURL("attachment://image.png")
                    .setDescription(
                        `${user1.username}: has ${Boolean(user1Choice) ? "" : "not "}chosen, ${user2.username}: has ${Boolean(user2Choice) ? "" : "not "}chosen`,
                    ),
            ),
        )
        .addActionRowComponents((ar) =>
            ar.setComponents(
                new ButtonBuilder().setLabel("Rock").setCustomId("rock").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setLabel("Paper").setCustomId("paper").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setLabel("Scissors").setCustomId("scissors").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setLabel("Forfeit").setCustomId("forfeit").setStyle(ButtonStyle.Danger),
            ),
        );

    const payload = {
        components: [display],
        files: [gameImage],
        flags: MessageFlags.IsComponentsV2 as const,
        withResponse: true as const,
    };

    if (interaction instanceof ButtonInteraction) {
        return interaction.update({ ...payload, attachments: [] });
    } else {
        return interaction.reply(payload);
    }
}

function getDisplayInviteUser(inviterId: string, inviteeId: string) {
    return new ContainerBuilder()
        .addTextDisplayComponents(
            (td) => td.setContent("### Rock Paper Scissors"),
            (td) => td.setContent(`<@${inviterId}> is inviting <@${inviteeId}> to play Rock Paper Scissors with them`),
            (td) => td.setContent("Do you accept?"),
        )
        .addActionRowComponents((ar) =>
            ar.setComponents(
                new ButtonBuilder().setLabel("Accept").setCustomId("accept").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setLabel("Decline").setCustomId("decline").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setLabel("Cancel").setCustomId("cancel").setStyle(ButtonStyle.Danger),
            ),
        );
}

function getDisplayInviteAnyone(inviterId: string) {
    return new ContainerBuilder()
        .addTextDisplayComponents(
            (td) => td.setContent("### Rock Paper Scissors"),
            (td) => td.setContent(`<@${inviterId}> is inviting anyone to play Rock Paper Scissors with them`),
            (td) => td.setContent("Does someone accept?"),
        )
        .addActionRowComponents((ar) =>
            ar.setComponents(
                new ButtonBuilder().setLabel("Accept").setCustomId("accept").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setLabel("Cancel").setCustomId("cancel").setStyle(ButtonStyle.Danger),
            ),
        );
}

// Send any message relevant to rps
function sendMessage(message: string) {
    return new ContainerBuilder().addTextDisplayComponents(
        (td) => td.setContent("### Rock Paper Scissors"),
        (td) => td.setContent(message),
    );
}

// Get random choice for the AI
const choices = Object.keys(beats) as Choice[];
const getRandomChoice = () => choices[Math.floor(Math.random() * choices.length)] as Choice;

// Get winner by checking against beats
function getWinner(user1Choice: Choice, user2Choice: Choice): WinResult {
    if (user1Choice === user2Choice) return "tie";
    if (beats[user1Choice] === user2Choice) return "user1";
    else return "user2";
}

async function playGame(interaction: ButtonInteraction | ChatInputCommandInteraction, user1: User, user2: User) {
    let user1Choice: Choice | null = null;
    let user2Choice: Choice | null = user2.id === interaction.client.user.id ? getRandomChoice() : null;
    // ^^ if user2 is the bot then user1 is playing against the AI so get random choice

    const response = await displayGame(interaction, user1, user2, user1Choice, user2Choice);

    const collector = response.resource?.message?.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60_000, // Should be long enough for both users to select a choice
    });

    collector?.on("end", async (_, reason) => {
        if (reason === "time") {
            await response.resource?.message?.edit({
                components: [sendMessage(`The game between <@${user1.id}> and <@${user2.id}> has timed out`)],
                attachments: [],
            });
        }
    });

    collector?.on("collect", async (i) => {
        try {
            // Only allow both users to interact
            if (i.user.id !== user1.id && i.user.id !== user2.id) {
                await i.reply({ content: "You cannot do this", flags: MessageFlags.Ephemeral });
                return;
            }

            const user1Clicked = i.user.id === user1.id;
            const clickedButton = i.customId as Choice | "forfeit";

            // Handle forfeit
            if (clickedButton === "forfeit") {
                await i.update({
                    components: [
                        sendMessage(`<@${i.user.id}> has forfeited and <@${user1Clicked ? user2.id : user1.id}> wins`),
                    ],
                    attachments: [],
                });
                collector.stop();
                return;
            }

            // Clicked a choice button
            if (user1Clicked && !user1Choice) {
                user1Choice = clickedButton;
            } else if (!user1Clicked && !user2Choice) {
                user2Choice = clickedButton;
            } else {
                await i.reply({ content: "You have already chosen", flags: MessageFlags.Ephemeral });
                return;
            }

            // Display winner when both users have chosen
            if (user1Choice && user2Choice) {
                await displayResults(i, user1, user2, user1Choice, user2Choice);
                collector.stop();
            } else {
                await displayGame(i, user1, user2, user1Choice, user2Choice);
            }
        } catch (error) {
            console.log(error);
        }
    });
}

async function sendInvite(interaction: ChatInputCommandInteraction, opponent?: User) {
    const user = interaction.user;

    // Send the appropriate invite to a certain user or for anyone to accept if not specified
    const response = await interaction.reply({
        components: [opponent ? getDisplayInviteUser(user.id, opponent.id) : getDisplayInviteAnyone(user.id)],
        flags: MessageFlags.IsComponentsV2,
        withResponse: true,
    });

    const collector = response.resource?.message?.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120_000, // 2 minutes until timeout
    });

    collector?.on("end", async (_, reason) => {
        if (reason === "time") {
            await response.resource?.message?.edit({ components: [sendMessage("This invite has timed out")] });
        }
    });

    collector?.on("collect", async (i) => {
        try {
            const clickedButton = i.customId;
            const senderClicked = i.user.id === user.id;

            // The slight repetition is irking me, not sure if I can do anything about it without making my code unnecessarily complicated + unreadable though
            // If the opponent is specified then only they can accept the invite, otherwise anyone except the sender can
            if (clickedButton === "accept" && (!opponent || i.user.id === opponent.id) && !senderClicked) {
                collector.stop();
                await playGame(i, user, i.user); // The user clicking accept should always be the opponent so i.user should work
            } else if (clickedButton === "decline" && i.user.id === opponent?.id) {
                // Can only be declined by the potential opponent
                collector.stop();
                await i.update({
                    components: [sendMessage(`<@${user.id}>, Your invite has been declined`)],
                    attachments: [],
                });
            } else if (clickedButton === "cancel" && senderClicked) {
                // Only the sender can cancel the invite
                collector.stop();
                await i.update({
                    components: [sendMessage("This invite has been cancelled")],
                    attachments: [],
                });
            } else {
                // Not allowed to do something, like the sender trying to accept the invite or invitee cancelling the invite
                await i.reply({ content: "You cannot do this", flags: MessageFlags.Ephemeral });
            }
        } catch (error) {
            console.log(error);
        }
    });
}

const rps: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName("rps")
        .setDescription("Play rock paper scissors")
        .addSubcommand((sc) =>
            sc
                .setName("invite")
                .setDescription("Invite a user")
                .addUserOption((u) => u.setName("user").setDescription("User to invite").setRequired(true)),
        )
        .addSubcommand((sc) => sc.setName("ai").setDescription("Play against the AI"))
        .addSubcommand((sc) => sc.setName("any").setDescription("Send out a rps request anyone can accept")),
    execute: async (interaction) => {
        const option = interaction.options.getSubcommand(true);

        if (option === "invite") {
            const user = interaction.options.getUser("user", true);
            if (user.id === interaction.user.id) {
                // Cannot invite self
                await interaction.reply({ content: "You cannot invite yourself", flags: MessageFlags.Ephemeral });
            } else if (user.bot) {
                // Cannot invite a bot
                await playGame(interaction, interaction.user, interaction.client.user);
            } else {
                await sendInvite(interaction, user);
            }
        } else if (option === "ai") {
            await playGame(interaction, interaction.user, interaction.client.user);
        } else if (option === "any") {
            await sendInvite(interaction);
        }
    },
};

export default rps;
