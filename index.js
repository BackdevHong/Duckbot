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
      member.roles.add("1140989896220233920");
      client.channels.cache.get("1141779502704361624").send({
        content: `<@${member.user.id}> 님이 바보 판정을 받았습니다. 사유 : <#${newThread.id}>`,
      });
    });
  }
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  // 미자
  if (
    !oldMember.roles.cache.has("1144269909405225021") &&
    newMember.roles.cache.has("1144269909405225021")
  ) {
    if (newMember.roles.cache.has("980761785147748373")) {
      newMember.roles.remove("980761785147748373");
      client.channels.cache.get("1143484641718837318").send({
        content: `<@${member.user.id}> 님이 미자 판정을 받았습니다.`,
      });
    }
  }

  // 바보
  if (
    !oldMember.roles.cache.has("1140989896220233920") &&
    newMember.roles.cache.has("1140989896220233920")
  ) {
    if (newMember.roles.cache.has("980761785147748373")) {
      newMember.roles.remove("980761785147748373");
    }
  }

  // 경고 해제
  if (
    oldMember.roles.cache.has("1104721596515627058") &&
    !newMember.roles.cache.has("1104721596515627058")
  ) {
    client.channels.cache.get("1141779502704361624").send({
      content: `<@${member.user.id}> 님의 경고가 해제되었습니다.`,
    });
  }
});

client.on(Events.ClientReady, async (client) => {
  console.log("Client ready");
});

client.login(process.env.TOKEN);
