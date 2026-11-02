import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import type { AnyCommand } from "./types/commandTypes.js";
import { REST, Routes } from "discord.js";
import { parseArgs } from "node:util";

if (!process.env.TOKEN) throw new Error("Bot token is missing");
if (!process.env.APPLICATION_ID) throw new Error("Application id is missing");
if (!process.env.DEV_GUILD_ID) throw new Error("Dev guild id is missing");
const { values } = parseArgs({ options: { global: { type: "boolean", short: "g" } } });

const commands = [];
const commandsFolder = path.join(import.meta.dirname, "commands");
for (const folder of fs.readdirSync(commandsFolder)) {
    const files = fs
        .readdirSync(path.join(commandsFolder, folder))
        .filter((f) => f.endsWith(".js") || f.endsWith(".ts"));
    for (const file of files) {
        const filePath = path.join(commandsFolder, folder, file);
        const importedFile: AnyCommand | undefined = (await import(pathToFileURL(filePath).href)).default;
        if (importedFile && "data" in importedFile && "execute" in importedFile) {
            commands.push(importedFile.data.toJSON());
        } else {
            throw new Error(`Command ${file} is missing data/execute`);
        }
    }
}

const rest = new REST().setToken(process.env.TOKEN);
try {
    await rest.put(
        values.global
            ? Routes.applicationCommands(process.env.APPLICATION_ID)
            : Routes.applicationGuildCommands(process.env.APPLICATION_ID, process.env.DEV_GUILD_ID),
        {
            body: commands,
        },
    );

    console.log(`Successfully registered all commands ${values.global ? "globally" : ""}`);
    console.log("Commands:");
    commands.forEach((v) => console.log(v.name));
} catch (error) {
    console.error(error);
}
