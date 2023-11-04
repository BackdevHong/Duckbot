const {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  Partials,
  AuditLogEvent,
  Message,
  AttachmentBuilder,
  ChannelType,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const dotenv = require("dotenv");
const express = require("express");
const http = require("http");
const { registerCommands } = require("./deploy-commands");
const { PrismaClient } = require("@prisma/client");
const clientDB = new PrismaClient();
const books = require('./book.json')
const schedule = require('node-schedule')

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

app.get('/', (req, res) => {
  res.send('<h1>Bot Online :)</h1>')
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
    if (message.channelId === "1102195345527676968") {
      io.emit("data", {
        username: message.member.nickname
          ? message.member.nickname
          : message.member.user.username,
        content: message.content,
      });
    }
    if (message.channelId === adultchannel.id) {
      if (message.attachments.size <= 0) {
        await message.delete()
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

// /**
//  * 
//  * @param {import("discord.js").Interaction} interaction 
//  * @param {import('discord.js').Client} client 
//  * @param {import('discord.js').User} user
//  */
// async function makeRoom(interaction, client, channelId, user) {
//   const reply = await interaction.deferReply({ephemeral: true})
//   const guild = client.guilds.cache.get(process.env.GUILD_ID)
//   const category = guild.channels.cache.get(channelId)

//   if (!category) {
//     await interaction.editReply({content: `카테고리가 존재하지 않습니다. 오류가 났습니다.`, ephemeral: true})
//   }
//   await guild.channels.create({
//     name: `${user.displayName}님의 티켓`,
//     type: ChannelType.GuildText,
//   }).then(async (channel) => {
//     channel.setParent(category)
//     channel.permissionOverwrites.set([
//       {
//         id: user.id,
//         allow: [PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
//       },
//       {
//         id: guild.roles.everyone,
//         deny: [PermissionFlagsBits.ViewChannel]
//       }
//     ])
//     let message;
//     switch (interaction.values[0]) {
//       case "봇 단건 외주 플랜":
//         message = `1. 닉네임 : \n2. 제작하려는 봇의 이름 : \n3. 제작하려는 봇의 상세정보 : (상세히 적어주세요) \n4. 봇의 사용 목적 : (해킹, 범죄, 악용 가능성이 있는 목적은 받아들이지 않습니다.)`
//         break;
//       case "봇 호스팅 외주 플랜" :
//         message = `1. 닉네임 : \n2. 제작하려는 봇의 이름 : \n3. 제작하려는 봇의 상세정보 : (상세히 적어주세요) \n4. 봇의 사용 목적 : (해킹, 범죄, 악용 가능성이 있는 목적은 받아들이지 않습니다.)`
//         break;
//       case "봇 호스팅 + DB 외주 플랜" :
//         message = `1. 닉네임 : \n2. 제작하려는 봇의 이름 : \n3. 제작하려는 봇의 상세정보 : (상세히 적어주세요) \n4. 봇의 사용 목적 : (해킹, 범죄, 악용 가능성이 있는 목적은 받아들이지 않습니다.)`
//         break;
//       case "봇 호스팅 플랜" :
//         message = `1. 닉네임 : \n2. 봇 파일 소유 여부 : (Y/N)`
//         break;
//       case "서버 제작 플랜" :
//         message = `1. 닉네임 : \n2. 제작하고 싶은 서버의 타입: (일반/커뮤니티) \n3. 제작하고 싶은 서버에 목적: (게임, 커뮤니티 등 여러가지 가능 단, 범죄 목적은 사용 불가)`
//         break
//     }
//     const embed = new EmbedBuilder()
//       .setTitle(`${interaction.values[0]} 주문 티켓`)
//       .setDescription(`[${interaction.values[0]}]을 주문하기 위해 문의주셔서 감사합니다. 아래 양식을 적고 기다려주세요.`)
//       .addFields({
//         name: "양식",
//         value: `${message}`
//       })
//       .setTimestamp()
    
//     const button = new ButtonBuilder()
//       .setCustomId('closed')
//       .setLabel('삭제')
//       .setStyle(ButtonStyle.Danger)
//       .setEmoji('🗑️')

//     const row = new ActionRowBuilder()
//       .addComponents(button)
//     await channel.send({content: `<@${user.id}>, <@670174423071850526>`, embeds: [embed], components: [row]})
//   })
//   await interaction.editReply({content: `방이 생성되었습니다.`, ephemeral: true})
// }


client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isCommand()) {
    return
  }

  if (interaction.commandName === "미자") {
    await interaction.deferReply({ephemeral: true})
    const member = interaction.options.getMember('검사대상')
    if (!member) {
      await interaction.editReply({content: "대상 플레이어를 적어주세요!", ephemeral: true})
      return;
    } else {
      const bookCount = books.books.length
      const randomBook = books.books[Math.floor(Math.random() * bookCount)]
      const userAlready = await clientDB.checkAdultList.findFirst({
        where: {
          userId: member.id
        }
      })

      if (userAlready) {
        if (userAlready.isPass === undefined || userAlready.isPass === null) {
          await interaction.editReply({content: `<@${member.id}>님은 이미 미자 검사를 받고있는 중입니다.`, ephemeral: true});
          return;
        } else {
          const isPassed = userAlready.isPass ? "인증됨" : "인증안됨"
          await interaction.editReply({content: `<@${member.id}>님은 이미 미자 검사를 받으셨습니다. 결과 : ${isPassed}`, ephemeral: true});
          return;
        }
      } else {
        try {
          let id;
          clientDB.checkAdultList.create({
            data: {
              userId: member.id,
              bookISBN: String(randomBook.isbn)
            }
          }).then((e) => {
            id = e.id
          })

          const image = new AttachmentBuilder('./assets/desc.png', {name: 'desc.png'});

          const embed = new EmbedBuilder()
            .setTitle("미성년자 인증 안내")
            .setDescription(`오 이런! 당신은 미성년자 인증을 받아야 합니다!`)
            .addFields(
              {name: "인증은 어떻게 받나요?", value: `교보문고 사이트로 들어가 회원가입 및 로그인을 한 후, 아래 링크로 들어가 isbn 코드를 찾아 암살봇 DM으로 보내주시면 됩니다. ${randomBook.url}`, inline: true},
              {name: "인증 제한 시간은요?", value: "인증 제한시간은 하루입니다. 하루가 지나면 자동으로 인증 실패 처리됩니다.", inline: true},
              {name: "isbn 코드는 어디서 얻나요?", value: "isbn 코드는 아래 이미지처럼, 링크를 타고 스크롤을 조금 내리면 보이는 '기본정보'란에 적혀있습니다.", inline: true},
              {name: "엥.. 안보이는데요?", value: "해당 링크는 성인인증을 한 계정이 아니면 책 정보를 볼 수 없게 되어있습니다. 그냥.. 아무 채팅이나 쳐서 빠르게 미자를 받아보세요!"}
            )
            .setImage('attachment://desc.png')
            .setFooter({
              text: '※ isbn 코드 이외의 다른 채팅을 치시면, 미자 처리되니 주의해주세요.'
            })
            

          const guild = client.guilds.cache.get(process.env.GUILD_ID);

          const msg = member.user.send({embeds: [embed], files: [image]}).then(async (v) => {
            await interaction.editReply({content: "성공적으로 메시지를 보냈습니다.", ephemeral: true});

            v.channel.awaitMessages({max: 1, time: 1000 * 60 * 60 * 24, errors: ['time']}).then(async (c) => {
              const result = c.first().content
              if (result === String(randomBook.isbn)) {
                await clientDB.checkAdultList.update({
                  where: {
                    id
                  },
                  data: {
                    isPass: true
                  },
                })
                await guild.members.cache.get(member.id).roles.add('1149002129147703316')
                await member.user.send("인증되었습니다. 감사합니다.")
                await client.channels.cache.get(channels_log).send({
                  content: `<@${member.id}>님의 미자검사 결과, 성인입니다.`,
                });
                return
              } else {
                await clientDB.checkAdultList.update({
                  where: {
                    id
                  },
                  data: {
                    isPass: false
                  },
                })
                await guild.members.cache.get(member.id).roles.add(rules_NoAdult)
                await member.user.send("isbn 코드가 달라 인증에 실패하였습니다.")
                await client.channels.cache.get(channels_log).send({
                  content: `<@${member.id}>님의 미자검사 결과, 미자입니다. ( 사유 : isbn 코드 불일치 )`,
                });
                return
              }
            }).catch(async (e) => {
              const userCheck = guild.members.cache.get(member.id)
              if (userCheck !== undefined) {
                await clientDB.checkAdultList.update({
                  where: {
                    id
                  },
                  data: {
                    isPass: false
                  },
                })
                await userCheck.roles.add(rules_NoAdult).then(async (event) => {
                  member.user.send("시간 초과로 인해 인증이 실패하였습니다.").catch((error) => {
                    return;
                  })
                  await client.channels.cache.get(channels_log).send({
                    content: `<@${member.id}>님의 미자검사 결과, 미자입니다. ( 사유 : 시간 초과 )`,
                  });
                  return
                })
              } else {
                return
              }
            })
          }).catch(async (e) => {
            await interaction.editReply({content: `<@${member.id}>님은 개인DM을 허용하고 있지 않습니다. 티켓인증을 실행합니다.`, ephemeral: true})
            const ticket = guild.channels.cache.get("1163812106014040126")
            if (!ticket) {
              console.log("에러 발생, 카테고리 존재하지 않음")
              return;
            }

            guild.channels.create({
              name: `${member.displayName}님의 인증방`,
              type: ChannelType.GuildText,
              permissionOverwrites: [

              ]
            }).then(async (channel) => {
              channel.setParent(ticket)
              channel.permissionOverwrites.set([
                {
                  id: member.id,
                  allow: [PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
                },
                {
                  id: guild.roles.everyone,
                  deny: [PermissionFlagsBits.ViewChannel]
                }
              ])
              const msg = await channel.send({embeds: [embed], files: [image]})
              const mention = await channel.send({content: `<@${member.id}>`})
              mention.channel.awaitMessages({max: 1, time: 1000 * 60 * 60 * 24, errors: ['time']}).then(async (c) => {
                const result = c.first().content
                if (result === String(randomBook.isbn)) {
                  await clientDB.checkAdultList.update({
                    where: {
                      id
                    },
                    data: {
                      isPass: true
                    },
                  })
                  guild.members.cache.get(member.id).roles.add('1149002129147703316').then(async (e) => {
                    await msg.channel.send("인증되었습니다. 감사합니다.")
                    await client.channels.cache.get(channels_log).send({
                      content: `<@${member.id}>님의 미자검사 결과, 성인입니다.`,
                    });
                    channel.delete().catch((e) => {
                      return
                    })
                  }).catch(async (error) => {
                    await client.channels.cache.get(channels_log).send({
                      content: `알 수 없는 오류가 발생했습니다. 오류 : ${error.message}`,
                    });
                    return
                  })
                  return
                } else {
                  await clientDB.checkAdultList.update({
                    where: {
                      id
                    },
                    data: {
                      isPass: false
                    },
                  })
                  guild.members.cache.get(member.id).roles.add(rules_NoAdult).then(async (event) => {
                    await msg.channel.send("isbn 코드가 달라 인증에 실패하였습니다.")
                    await client.channels.cache.get(channels_log).send({
                      content: `<@${member.id}>님의 미자검사 결과, 미자입니다. ( 사유 : isbn 코드 불일치 )`,
                    });
                    channel.delete().catch((e) => {
                      return
                    })
                  }).catch(async (error) => {
                    await client.channels.cache.get(channels_log).send({
                      content: `알 수 없는 오류가 발생했습니다. 오류 : ${error.message}`,
                    });
                    return
                  })
                  return
                }
              }).catch(async (e) => {
                const userCheck = guild.members.cache.get(member.id)
                
                if (userCheck !== undefined) {
                  await clientDB.checkAdultList.update({
                    where: {
                      id
                    },
                    data: {
                      isPass: false
                    },
                  })
                  await userCheck.roles.add(rules_NoAdult).then(async (e) => {
                    await client.channels.cache.get(channels_log).send({
                      content: `<@${member.id}>님의 미자검사 결과, 미자입니다. ( 사유 : 시간 초과 )`,
                    });
                    await channel.delete()
                    return
                  })
                } else {
                  await channel.delete()
                  return
                }
                return
              })
            })
          });
          await client.channels.cache.get(channels_log).send({
            content: `<@${member.id}>님의 미자검사를 진행합니다. 요청자 : <@${interaction.member.id}>`,
          });
          return;
        } catch (error) {
          await client.channels.cache.get(channels_log).send({
            content: `모종의 오류가 발생했습니다. 오류 내용 : ${error.message}`
          })
        }
        
      }
    }
  }
})

setInterval(async () => {
  const guild = client.guilds.cache.get(process.env.GUILD_ID)
  const cate = guild.channels.cache.get("1031135343853965362")
  const channel = client.channels.cache.filter((channel, idx) => {
    if (channel.name === "🔞야짤방" && channel.parentId === cate.id) {
      return true
    }
  }).first()

  if (!channel) {
    console.log('error')
  }

  guild.channels.create({
    name: `🔞야짤방`,
    type: ChannelType.GuildText,
    nsfw: true

  }).then(async (channel) => {
    channel.setParent(cate)
  })
  
  channel.delete("2주에 1번 초기화")
}, 1209600000)

client.login(process.env.TOKEN);
