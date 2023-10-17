const {SlashCommandBuilder, REST, Routes, PermissionFlagsBits} = require("discord.js")

const commands = [
    new SlashCommandBuilder()
        .setName('미자')
        .setDescription('미자 검사를 진행합니다.')
        .addUserOption(option => 
            option
            .setName('검사대상')
            .setDescription('미자를 검사할 대상을 선택하세요.')
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
].map(command => command.toJSON());

module.exports = {
    registerCommands : (token, clientId, guildId) => {
        const rest = new REST({version: '10'}).setToken(token);
    
        rest.put(Routes.applicationGuildCommands(clientId, guildId), {body: commands})
            .then(() => console.log('Successfully registered application commands.'))
            .catch(console.error);
    }
}