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
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    new SlashCommandBuilder()
        .setName('폭파')
        .setDescription('링크를 재생성합니다')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName("바보")
        .setDescription("랜덤으로 바보를 지정합니다")
        .addIntegerOption(option => 
            option
            .setName('지정')
            .setDescription('바보를 몇 명 지정할까요? ( 2 ~ 100 )')
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(command => command.toJSON());

module.exports = {
    registerCommands : (token, clientId, guildId) => {
        const rest = new REST({version: '10'}).setToken(token);
    
        rest.put(Routes.applicationGuildCommands(clientId, guildId), {body: commands})
            .then(() => console.log('Successfully registered application commands.'))
            .catch(console.error);
    }
}