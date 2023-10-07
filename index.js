const {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  Partials,
} = require("discord.js");
const dotenv = require("dotenv");
const express = require("express");
const http = require("http");

const app = express();
const server = http.createServer(app);

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log(`연결 완료 : ${socket.request.url}`);
});

server.listen(3001, () => {
  console.log("server start");
});

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
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
const channels_Alert = process.env.CHANNEL_ALERT;

console.log(channels_Alert);

client.on(Events.GuildMemberRemove, (member) => {
  const roles = member.roles.cache
    .filter((roles) => roles.id !== member.guild.id)
    .map((role) => role.name.toString())
    .join(" | ");

  let embed;
  if (roles.length > 0) {
    embed = new EmbedBuilder()
      .setTitle("퇴장 안내")
      .setDescription(`<@${member.id}>님이 퇴장하셨습니다.`)
      .addFields({
        name: "역할",
        value: `<@${member.id}>님이 가지고 계셨던 역할은\n ${roles} 입니다`,
        inline: false,
      });
  } else {
    embed = new EmbedBuilder()
      .setTitle("퇴장 안내")
      .setDescription(`<@${member.id}>님이 퇴장하셨습니다.`)
      .addFields({
        name: "역할",
        value: `<@${member.id}>님이 가지고 계셨던 역할이 없습니다.`,
        inline: false,
      });
  }

  client.channels.cache.get(channels_Alert).send({
    embeds: [embed],
  });
});

client.on(Events.ThreadUpdate, async (oldThread, newThread) => {
  if (oldThread.locked === newThread.locked) {
    return;
  }

  if (!oldThread.locked && newThread.locked) {
    const guild = client.guilds.cache.get(process.env.GUILD_ID);

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
  const guild = client.guilds.cache.get(process.env.GUILD_ID);

  if (message.guildId === guild.id) {
    if (message.content.startsWith("암살아")) {
      if (
        message.content.includes("스벨트") ||
        message.content.includes("리액트")
      ) {
        message.reply({ content: "리액트가 짱이지 ㅇㅇ" });
        return;
      }

      if (
        message.content.includes("애플") ||
        message.content.includes("맥") ||
        message.content.includes("윈도우") ||
        message.content.includes("사과") ||
        message.content.includes("마이크로소프트") ||
        message.content.includes("apple") ||
        message.content.includes("ms")
      ) {
        message.reply({ content: "지존 애플" });
        return;
      }

      if (message.content.includes("vs")) {
        const arr = message.content.split("vs");
        arr[0] = arr[0].split("암살아")[1].trim();
        for (i = 1; i < arr.length; i++) {
          arr[i] = arr[i].trim();
        }

        const randomValue = arr[Math.floor(Math.random() * arr.length)];
        message.reply({ content: `"${randomValue}" 이쪽!` });
        return;
      }

      if (message.content.includes("박을게")) {
        message.reply({ content: "헤으응.. 박아주세요.. 주인님.." });
        return;
      }

      if (message.content.includes("좋아")) {
        message.reply({ content: "ㄸ..딱히 좋아하는 건.. 아..아니거든!" });
        return;
      }

      if (
        message.content.includes("죽어") ||
        message.content.includes("뒤져") ||
        message.content.includes("나가")
      ) {
        message.reply({ content: "너나 죽어.." });
        return;
      }

      const strArray = [
        "뭐",
        "왜",
        "나가 뒤져",
        "잘 안들려..",
        "시발련이 뭔 소릴 하는거야",
        "사형!!!",
        "야메떼..",
        "마따끄..",
        "ㅗ",
        "ㅗㅗ",
        "헤으응",
        "박을게",
        "넣을게",
        "사릴게..",
        "하..",
        "뭣",
        "섹스!!",
        "ㅎ..흥!",
        "갈!!!!!!!",
      ];
      const randomValue = strArray[Math.floor(Math.random() * strArray.length)];
      message.reply({ content: randomValue });
    }
    if (message.channelId === "1102195345527676968") {
      io.emit("data", {
        username: message.member.nickname
          ? message.member.nickname
          : message.member.user.username,
        content: message.content,
      });
    }
  }
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

  const guild = client.guilds.cache.get(process.env.GUILD_ID);

  let res = await guild.members.fetch();

  setInterval(() => {
    res.forEach((member) => {
      if (member.user.bot === true) {
        return;
      }

      if (
        member.roles.cache.some((role) => role.id === "1144269909405225021") ||
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
