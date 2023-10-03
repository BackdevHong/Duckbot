const {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
} = require("discord.js");
const dotenv = require("dotenv");

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
  ],
});

// 역할
const rules_Babo = process.env.RULES_BABO;
const rules_NoAdult = process.env.RULES_NOADULT;
const rules_Default = process.env.RULES_DEFAULT;
const rules_BlueAdmin = process.env.RULES_BLUEADMIN;
const rules_OrangeAdmin = process.env.RULES_ORANGEADMIN;
const rules_Danger = process.env.RULES_DANGER;
const rules_Fight = process.env.RULES_FIGHT;

// 채널
const channels_Babo = process.env.CHANNEL_BABO;
const channels_NoAdult = process.env.CHANNEL_NOADULT;
const channels_Danger = process.env.CHANNEL_DANGER;

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
      member.roles.add(rules_Babo);
      client.channels.cache.get(channels_Babo).send({
        content: `<@${member.user.id}> 님이 바보 판정을 받았습니다. 사유 : <#${newThread.id}>`,
      });
    });
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
});
client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
  const oldRules = oldMember.roles;
  const newRules = newMember.roles;

  // 미자
  if (!oldRules.cache.has(rules_NoAdult) && newRules.cache.has(rules_NoAdult)) {
    if (oldRules.cache.has(rules_Default)) {
      oldRules.remove(rules_Default);
      client.channels.cache.get(channels_NoAdult).send({
        content: `<@${newMember.user.id}> 님이 미자 판정을 받았습니다.`,
      });
    }
  }

  // 바보
  if (!oldRules.cache.has(rules_Babo) && newRules.cache.has(rules_Babo)) {
    if (oldRules.cache.has(rules_Default)) {
      oldRules.remove(rules_Default);
    }

    if (oldRules.cache.has(rules_NoAdult)) {
      oldRules.remove(rules_NoAdult);
    }
  }

  // 경고 해제
  if (oldRules.cache.has(rules_Danger) && !newRules.cache.has(rules_Danger)) {
    client.channels.cache.get(channels_Danger).send({
      content: `<@${oldMember.user.id}> 님의 경고가 해제되었습니다.`,
    });
  }

  // 바보 or 미짜 있는데 시청자를 받은 경우 해제
  if (!oldRules.cache.has(rules_Default) && newRules.cache.has(rules_Default)) {
    if (oldRules.cache.has(rules_NoAdult) || oldRules.cache.has(rules_Babo)) {
      oldRules.remove(rules_Default);
    }
  }

  // 바보가 있는데 미짜를 받은 경우 해제
  if (!oldRules.cache.has(rules_NoAdult) && newRules.cache.has(rules_NoAdult)) {
    if (oldRules.cache.has(rules_Babo)) {
      oldRules.remove(rules_NoAdult);
    }
  }

  // 투견 감지
  if (!oldRules.cache.has(rules_Fight) && newRules.cache.has(rules_Fight)) {
    oldRules.remove(rules_Babo);
    oldRules.remove(rules_Default);
    oldRules.remove(rules_NoAdult);
    oldRules.remove(rules_BlueAdmin);
    oldRules.remove(rules_OrangeAdmin);
  }

  // 투견 제거
  if (oldRules.cache.has(rules_Fight) && !newRules.cache.has(rules_Fight)) {
    oldRules.add(rules_Default);
  }

  // 투견 중 감지
  if (
    (!oldRules.cache.has(rules_Default) && newRules.cache.has(rules_Default)) ||
    (!oldRules.cache.has(rules_Babo) && newRules.cache.has(rules_Babo)) ||
    (!oldRules.cache.has(rules_NoAdult) && newRules.cache.has(rules_NoAdult)) ||
    (!oldRules.cache.has(rules_BlueAdmin) &&
      newRules.cache.has(rules_BlueAdmin)) ||
    (!oldRules.cache.has(rules_OrangeAdmin) &&
      newRules.cache.has(rules_OrangeAdmin))
  ) {
    if (oldRules.cache.has(rules_Fight)) {
      oldRules.remove(rules_Babo);
      oldRules.remove(rules_Default);
      oldRules.remove(rules_NoAdult);
      oldRules.remove(rules_BlueAdmin);
      oldRules.remove(rules_OrangeAdmin);
    }
  }
});

client.on(Events.ClientReady, async (client) => {
  console.log("Client ready");
});

client.login(process.env.TOKEN);
