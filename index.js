const {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  Partials,
  AuditLogEvent,
  AttachmentBuilder,
  blockQuote,
  inlineCode,
  bold,
  MessageType
} = require("discord.js");
const dotenv = require("dotenv");
const express = require("express");
const http = require("http");
const { registerCommands } = require("./deploy-commands");
const { PrismaClient } = require("@prisma/client");
const clientDB = new PrismaClient();
const { checkAge } = require("./event/checkAuth");
const { Type } = require("./enums/Type");
const config = require("./config.json")
const app = express();
const server = http.createServer(app);
const fs = require("fs")

server.listen(3001, () => {
  console.log("server start");
});

app.get('/', (req, res) => {
  res.send('<h1>Bot Online :)</h1>')
})

app.get('/discord', (req, res) => {
  res.send(`<script type="text/javascript">
    location.href="${config.Link}";
  </script>`)
})

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
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
const channels_log = process.env.CHANNEL_LOG;
const channels_ticket = process.env.CHANNEL_TICKET


registerCommands(process.env.TOKEN, process.env.CLIENT_ID, process.env.GUILD_ID)


client.on(Events.GuildMemberRemove, (member) => {
  const noAdultCheck = clientDB.checkAdultList.findFirst({
    where: {
      userId: member.id
    }
  }).then(async (event) => {
    if (!event) {
      return;
    } else {
      if (event.isPass === true || event.isPass === false) {
        return;
      } else if (event.isPass === null || event.isPass === undefined ) {
        await clientDB.checkAdultList.update({
          where: {
            id: event.id
          },
          data: {
            isPass: false
          },
        })
        await member.ban({reason: "미자 검사 회피"}).then(() => {
          client.channels.cache.get(channels_log).send({
            content: `<@${member.id}>님의 미자검사 결과, 미자입니다. ( 사유 : 미자 검사 회피 (나감) )`,
          });
        })
      }
    }
  }).catch((e) => {
    console.log(e)
  })
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

client.on('roleUpdate', async (oldRoles, newRoles) => {
  const guild = client.guilds.cache.get(process.env.GUILD_ID)
  newRoles.guild.fetchAuditLogs({
    type: AuditLogEvent.RoleUpdate
  }).then(async audit => {
    const {executor} = audit.entries.first()
    const user = await guild.members.cache.get(executor.id)

    if (!user.permissions.has("Administrator")) {
      newRoles.edit(oldRoles)
    }
  })
})

client.on('roleCreate', async (roles) => {
  const guild = client.guilds.cache.get(process.env.GUILD_ID)
  roles.guild.fetchAuditLogs({
    type: AuditLogEvent.RoleCreate
  }).then(async audit => {
    const {executor} = audit.entries.first()
    const user = await guild.members.cache.get(executor.id)

    if (!user.permissions.has("Administrator")) {
      roles.delete("어드민이 아니어서")
    }
  })
})

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
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  const cate = guild.channels.cache.get("1031135343853965362")

  const adultchannel = client.channels.cache.filter((channel, idx) => {
    if (channel.name === "🔞야짤방" && channel.parentId === cate.id) {
      return true
    }
  }).first()

  if (message.guildId === guild.id) {
    if (message.content.includes("<@")){
      if (message.author.bot) {
        return;
      }
      
      const guild = client.guilds.cache.get(process.env.GUILD_ID);

      let res = await guild.members.fetch(message.author.id);

      if (
        res.roles.cache.has("1015160481528430602") || 
        res.roles.cache.has("1027637768878305332") ||
        res.roles.cache.has("980760999453933568")) {
          return;
        }

      const mention = new AttachmentBuilder('./assets/mention.png')
      const content = `이 ${inlineCode("멘션")}은 ${bold("서버 경고 사항")}입니다. 이미지 참고해주세요.` 
      + `\n${inlineCode("원숭이도 이해할 수 있는 이미지 설명")}`
      return message.reply({
        content: content,
        files: [mention]
      })
    }

    if (message.content.includes("멘션")) {
      if (message.author.bot) return;
      const mention = new AttachmentBuilder('./assets/mention.png')
      const content = `이미지에 있는 ${bold("답장 멘션")}은 ${bold("서버 경고 사항입니다!")} 조심해주세요` 
      + `\n${inlineCode("원숭이도 이해할 수 있는 이미지 설명")}`
      return message.reply({
        content: content,
        files: [mention]
      })
    }

    if (message.content.startsWith("암살아")) {
      if (message.channel.id === adultchannel.id) {
        await message.delete();
        return;
      }
      if (message.author.bot) return;
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
    if (message.channelId === adultchannel.id) {
      if (message.attachments.size <= 0) {
        message.delete().catch(async (error) => {
          await client.channels.cache.get("1171357457147232346").send({
            content: `오류가 발생하여 야짤방의 메시지를 삭제할 수 없습니다. 에러내용 : ${error.message}`,
          });
        })
      } else {
        if (message.content.length > 0) {
          message.delete().catch(async (error) => {
            await client.channels.cache.get("1171357457147232346").send({
              content: `오류가 발생하여 야짤방의 메시지를 삭제할 수 없습니다. 에러내용 : ${error.message}`,
            });
          })
        }
      }
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

    client.channels.cache.get(channels_Babo).send({
      content: `<@${newMember.user.id}> 님이 바보 판정을 받았습니다.`,
    });
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

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isCommand()) {
    if (interaction.commandName === "폭파") {
      await interaction.deferReply({ephemeral: true})

      const inviteLink = await interaction.channel.createInvite({
        maxAge: 0,
        maxUses: 0
      }).catch((e) => {
        console.log(e)
      })

      const prevC = config
      config.Link = `https://discord.gg/${inviteLink.code}`
      fs.writeFileSync("./config.json", JSON.stringify(prevC))
      await interaction.editReply({
        content: "링크 재생성이 성공적으로 완료되었습니다."
      })
    }
    
    if (interaction.commandName === "미자") {
      await interaction.deferReply({ephemeral: true})
      const member = interaction.options.getMember('검사대상')
      if (!member) {
        await interaction.editReply({content: "대상 플레이어를 적어주세요!", ephemeral: true})
        return;
      } else {
        const userRetry = await clientDB.checkAdultList.findFirst({
          where: {
            userId: member.id
          }
        })
        
        try {
          if (!userRetry) {
            checkAge(member, interaction, client, Type.CHECK_FIRST)
          } else if (userRetry.retry === true || userRetry.retry === undefined || userRetry.retry === null) {
            checkAge(member, interaction, client, Type.CHECK_RETRY)
          } else {
            interaction.editReply({
              content: "해당 사용자는 이미 미자 검사를 2번 진행했습니다."
            })
          }
        } catch (error) {
          interaction.editReply({
            content: `오류가 발생했습니다. 오류 내용 : ${error.message}`
          })
        }   
    
      }
    }
    if (interaction.commandName === "바보") {
      await interaction.deferReply()
      
      const role = interaction.guild.roles.cache.find((v) => v.id === "1216348648066256966")

      const amount = interaction.options.getInteger("지정")
      
      if (amount <= 1) {
        return interaction.editReply({
          content: "지정 인원은 1보다 커야 합니다."
        })
      }
      const memberpick = interaction.guild.members.cache.random(amount)

      for(let ele of memberpick) {
        interaction.channel.send({
          content: `<@${ele.id}>`
        })
        ele.roles.add(role)
      }

      return interaction.editReply({
        content: `😥바보-해제에서 죄를 참회하지 않으면 영원히 바보라고 ♥` + "\n" + blockQuote("최대한 웃기게 쓰지 않으면 영원히 바보")
      })
    }
  }
})


client.login(process.env.TOKEN);
