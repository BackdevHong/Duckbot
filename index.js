const {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
} = require("discord.js");
const dotenv = require("dotenv");

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.GuildMembers, GatewayIntentBits.Guilds],
});
client.on(Events.ThreadUpdate, async (oldThread, newThread) => {
  if (oldThread.locked == newThread.locked) {
    return;
  }

  const guild = client.guilds.cache.get(process.env.GUILD_ID);

  if (!oldThread.locked && newThread.locked) {
    let res = guild.members.cache.filter(
      (member) => member.id === newThread.ownerId
    );

    res.forEach((member) => {
      member.roles.remove("980761785147748373");
      member.roles.add("1140989896220233920");
      client.channels.cache.get("1141779502704361624").send({
        content: `<@${member.user.id}> 님이 바보 판정을 받았습니다. 사유 : <#${newThread.id}>`,
      });
    });
  }
});
client.on(Events.ClientReady, async (client) => {
  console.log("Client ready");
  const guild = client.guilds.cache.get(process.env.GUILD_ID);

  let res = await guild.members.fetch();

  setInterval(() => {
    res.forEach((member) => {
      if (member.user.bot == true) {
        return;
      }
      if (
        member.roles.cache.some((role) => role.id === "1144269909405225021")
      ) {
        if (
          member.roles.cache.some((role) => role.id === "980761785147748373")
        ) {
          member.roles.remove("980761785147748373");
          client.channels.cache.get("1143484641718837318").send({
            content: `<@${member.user.id}> 님이 미자 판정을 받았습니다.`,
          });
        }
      } else if (
        member.roles.cache.some((role) => role.id === "1140989896220233920")
      ) {
        if (
          member.roles.cache.some((role) => role.id === "980761785147748373")
        ) {
          member.roles.remove("980761785147748373");
        }
      }
    });
  }, 1000);
});

client.login(process.env.TOKEN);
