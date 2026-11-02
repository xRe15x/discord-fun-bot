import { Client, Collection, CommandInteraction, Events, GatewayIntentBits, MessageFlags } from "discord.js";
import fs from "node:fs";
import path from "node:path";
import type { BaseCommand } from "./types/commandTypes.js";
import { pathToFileURL } from "node:url";

if (!process.env.TOKEN) throw new Error("Bot token is missing");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Add all commands to client.commands
const commandsFolder = path.join(import.meta.dirname, "commands");
for (const folder of fs.readdirSync(commandsFolder)) {
    const files = fs
        .readdirSync(path.join(commandsFolder, folder))
        .filter((f) => f.endsWith(".js") || f.endsWith(".ts"));
    for (const file of files) {
        const filePath = path.join(commandsFolder, folder, file);
        const importedFile: BaseCommand | undefined = (await import(pathToFileURL(filePath).href)).default;
        if (importedFile && "data" in importedFile && "execute" in importedFile) {
            client.commands.set(importedFile.data.name, importedFile);
        } else {
            throw new Error(`Command ${file} is missing data/execute`);
        }
    }
}

client.once(Events.ClientReady, (interaction) => {
    console.log(`Client is ready as "${interaction.user.tag}"`);
});

client.on(Events.InteractionCreate, async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            await client.commands.get(interaction.commandName)?.execute(interaction);
        }
    } catch (error) {
        console.error(error);
        if (!(interaction instanceof CommandInteraction)) return;

        if (interaction.replied || interaction.deferred) {
            interaction.followUp({
                content: "Something went wrong while executing this command",
                flags: MessageFlags.Ephemeral,
            });
        } else {
            interaction.reply({
                content: "Something went wrong while executing this command",
                flags: MessageFlags.Ephemeral,
            });
        }
    }
});

client.login(process.env.TOKEN);
