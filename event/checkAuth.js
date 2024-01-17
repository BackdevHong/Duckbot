const { PrismaClient } = require("@prisma/client");
const clientDB = new PrismaClient();
const books = require('../book.json');
const {
  EmbedBuilder,
  AttachmentBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js");
const { Type } = require("../enums/Type");

const rules_NoAdult = process.env.RULES_NOADULT;

const channels_log = process.env.CHANNEL_LOG;

module.exports = {
  checkAge : async (user, interaction, client, type) => {
    const bookCount = books.books.length
    const randomBook = books.books[Math.floor(Math.random() * bookCount)]
    const userAlready = await clientDB.checkAdultList.findFirst({
      where: {
        userId: user.id
      }
    })

    if (userAlready) {
      if (userAlready.isPass === undefined || userAlready.isPass === null) {
        await interaction.editReply({content: `<@${user.id}>님은 이미 미자 검사를 받고있는 중입니다.`, ephemeral: true});
        return;
      }
    }

    if (type === Type.CHECK_FIRST) {
      try {
        let id;
        clientDB.checkAdultList.create({
          data: {
            userId: user.id,
            bookISBN: String(randomBook.isbn),
            retry: null
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

        const msg = user.user.send({embeds: [embed], files: [image]}).then(async (v) => {
          await interaction.editReply({content: "성공적으로 메시지를 보냈습니다.", ephemeral: true});

          v.channel.awaitMessages({max: 1, time: 1000 * 60 * 60 * 24, errors: ['time']}).then(async (c) => {
            const result = c.first().content
            if (result === String(randomBook.isbn)) {
              await clientDB.checkAdultList.update({
                where: {
                  id
                },
                data: {
                  isPass: true,
                  retry: false
                },
              })
              await guild.members.cache.get(user.id).roles.add('1149002129147703316')
              await user.user.send("인증되었습니다. 감사합니다.")
              await client.channels.cache.get(channels_log).send({
                content: `<@${user.id}>님의 미자검사 결과, 성인입니다.`,
              });
              return
            } else {
              await clientDB.checkAdultList.update({
                where: {
                  id
                },
                data: {
                  isPass: false,
                  retry: true
                },
              })
              await guild.members.cache.get(user.id).roles.add(rules_NoAdult)
              await user.user.send("isbn 코드가 달라 인증에 실패하였습니다.")
              await client.channels.cache.get(channels_log).send({
                content: `<@${user.id}>님의 미자검사 결과, 미자입니다. ( 사유 : isbn 코드 불일치 )`,
              });
              return
            }
          }).catch(async (e) => {
            const userCheck = guild.members.cache.get(user.id)
            if (userCheck !== undefined) {
              await clientDB.checkAdultList.update({
                where: {
                  id
                },
                data: {
                  isPass: false,
                  retry: true
                },
              })
              await userCheck.roles.add(rules_NoAdult).then(async (event) => {
                user.user.send("시간 초과로 인해 인증이 실패하였습니다.").catch((error) => {
                  return;
                })
                await client.channels.cache.get(channels_log).send({
                  content: `<@${user.id}>님의 미자검사 결과, 미자입니다. ( 사유 : 시간 초과 )`,
                });
                return
              })
            } else {
              return
            }
          })
        }).catch(async (e) => {
          await interaction.editReply({content: `<@${user.id}>님은 개인DM을 허용하고 있지 않습니다. 티켓인증을 실행합니다.`, ephemeral: true})
          const ticket = guild.channels.cache.get("1163812106014040126")
          if (!ticket) {
            console.log("에러 발생, 카테고리 존재하지 않음")
            return;
          }

          guild.channels.create({
            name: `${user.displayName}님의 인증방`,
            type: ChannelType.GuildText,
            permissionOverwrites: [

            ]
          }).then(async (channel) => {
            channel.setParent(ticket)
            channel.permissionOverwrites.set([
              {
                id: user.id,
                allow: [PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
              },
              {
                id: guild.roles.everyone,
                deny: [PermissionFlagsBits.ViewChannel]
              }
            ])
            const msg = await channel.send({embeds: [embed], files: [image]})
            const mention = await channel.send({content: `<@${user.id}>`})
            mention.channel.awaitMessages({max: 1, time: 1000 * 60 * 60 * 24, errors: ['time']}).then(async (c) => {
              const result = c.first().content
              if (result === String(randomBook.isbn)) {
                await clientDB.checkAdultList.update({
                  where: {
                    id
                  },
                  data: {
                    isPass: true,
                    retry: false
                  },
                })
                guild.members.cache.get(user.id).roles.add('1149002129147703316').then(async (e) => {
                  await msg.channel.send("인증되었습니다. 감사합니다.")
                  await client.channels.cache.get(channels_log).send({
                    content: `<@${user.id}>님의 미자검사 결과, 성인입니다.`,
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
                    isPass: false,
                    retry: true
                  },
                })
                guild.members.cache.get(user.id).roles.add(rules_NoAdult).then(async (event) => {
                  await msg.channel.send("isbn 코드가 달라 인증에 실패하였습니다.")
                  await client.channels.cache.get(channels_log).send({
                    content: `<@${user.id}>님의 미자검사 결과, 미자입니다. ( 사유 : isbn 코드 불일치 )`,
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
              const userCheck = guild.members.cache.get(user.id)
              
              if (userCheck !== undefined) {
                await clientDB.checkAdultList.update({
                  where: {
                    id
                  },
                  data: {
                    isPass: false,
                    retry: true
                  },
                })
                await userCheck.roles.add(rules_NoAdult).then(async (e) => {
                  await client.channels.cache.get(channels_log).send({
                    content: `<@${user.id}>님의 미자검사 결과, 미자입니다. ( 사유 : 시간 초과 )`,
                  });
                  await channel.delete().catch(async (error) => {
                    await client.channels.cache.get(channels_log).send({
                      content: `알 수 없는 오류가 발생했습니다. 오류 : ${error.message}`,
                    });
                    return
                  })
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
          content: `<@${user.id}>님의 미자검사 인증을 진행합니다. 요청자 : <@${interaction.user.id}>`,
        });
        return;
      } catch (error) {
        await client.channels.cache.get("1171357457147232346").send({
          content: `모종의 오류가 발생했습니다. 오류 내용 : ${error.message}`
        })
      }
    } else if (type === Type.CHECK_RETRY) {
      try {
        let id;

        await clientDB.checkAdultList.findFirst({
          where: {
            userId : user.id
          }
        }).then((v) => {
          id = v.id
        })

        await clientDB.checkAdultList.update({
          where: {
            id
          },
          data: {
            isPass: null
          }
        })

        const image = new AttachmentBuilder('./assets/desc.png', {name: 'desc.png'});

        const embed = new EmbedBuilder()
          .setTitle("미성년자 재인증 안내")
          .setDescription(`당신은 미성년자 재인증 대상입니다`)
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

        const msg = user.user.send({embeds: [embed], files: [image]}).then(async (v) => {
          await interaction.editReply({content: "성공적으로 재인증 메시지를 보냈습니다.", ephemeral: true});

          v.channel.awaitMessages({max: 1, time: 1000 * 60 * 60 * 24, errors: ['time']}).then(async (c) => {
            const result = c.first().content
            if (result === String(randomBook.isbn)) {
              await clientDB.checkAdultList.update({
                where: {
                  id
                },
                data: {
                  isPass: true,
                  retry: false
                },
              })
              await guild.members.cache.get(user.id).roles.remove('1144269909405225021')
              await guild.members.cache.get(user.id).roles.add('1149002129147703316')
              await guild.members.cache.get(user.id).roles.add('980761785147748373')
              await user.user.send("인증되었습니다. 감사합니다.")
              await client.channels.cache.get(channels_log).send({
                content: `<@${user.id}>님의 미자검사 재인증 결과, 성인입니다.`,
              });
              return
            } else {
              await clientDB.checkAdultList.update({
                where: {
                  id
                },
                data: {
                  isPass: false,
                  retry: false
                },
              })
              await user.user.send("isbn 코드가 달라 인증에 실패하였습니다.")
              await client.channels.cache.get(channels_log).send({
                content: `<@${user.id}>님의 미자검사 재인증 결과, 미자입니다. ( 사유 : isbn 코드 불일치 )`,
              });
              return
            }
          }).catch(async (e) => {
            const userCheck = guild.members.cache.get(user.id)
            if (userCheck !== undefined) {
              await clientDB.checkAdultList.update({
                where: {
                  id
                },
                data: {
                  isPass: false,
                  retry: false
                },
              })
              await user.user.send("시간 초과로 인해 재인증이 실패하였습니다.")

              await client.channels.cache.get(channels_log).send({
                content: `<@${user.id}>님의 미자검사 재인증 결과, 미자입니다. ( 사유 : 시간 초과 )`,
              });
            } else {
              return
            }
          })
        }).catch(async (e) => {
          await interaction.editReply({content: `<@${user.id}>님은 개인DM을 허용하고 있지 않습니다. 티켓인증을 실행합니다.`, ephemeral: true})
          const ticket = guild.channels.cache.get("1163812106014040126")
          if (!ticket) {
            console.log("에러 발생, 카테고리 존재하지 않음")
            return;
          }

          guild.channels.create({
            name: `${user.displayName}님의 재인증방`,
            type: ChannelType.GuildText,
            permissionOverwrites: [

            ]
          }).then(async (channel) => {
            channel.setParent(ticket)
            channel.permissionOverwrites.set([
              {
                id: user.id,
                allow: [PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
              },
              {
                id: guild.roles.everyone,
                deny: [PermissionFlagsBits.ViewChannel]
              }
            ])
            const msg = await channel.send({embeds: [embed], files: [image]})
            const mention = await channel.send({content: `<@${user.id}>`})
            mention.channel.awaitMessages({max: 1, time: 1000 * 60 * 60 * 24, errors: ['time']}).then(async (c) => {
              const result = c.first().content
              if (result === String(randomBook.isbn)) {
                await clientDB.checkAdultList.update({
                  where: {
                    id
                  },
                  data: {
                    isPass: true,
                    retry: false
                  },
                })
                await guild.members.cache.get(user.id).roles.remove('1144269909405225021')
                await guild.members.cache.get(user.id).roles.add('1149002129147703316')
                await guild.members.cache.get(user.id).roles.add('980761785147748373')
                await msg.channel.send("인증되었습니다. 감사합니다.")
                await client.channels.cache.get(channels_log).send({
                  content: `<@${user.id}>님의 미자검사 재인증 결과, 성인입니다.`,
                });

                c.delete().catch(async (error) => {
                  await client.channels.cache.get(channels_log).send({
                    content: `채널 삭제에 오류가 발생했습니다. 오류 : ${error.message}`,
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
                    isPass: false,
                    retry: false
                  },
                })
                await msg.channel.send("isbn 코드가 달라 재인증에 실패하였습니다.")
                await client.channels.cache.get(channels_log).send({
                  content: `<@${user.id}>님의 미자검사 재인증 결과, 미자입니다. ( 사유 : isbn 코드 불일치 )`,
                });
                channel.delete().catch(async (error) => {
                  await client.channels.cache.get(channels_log).send({
                    content: `알 수 없는 오류가 발생했습니다. 오류 : ${error.message}`,
                  });
                  return
                })
                return
              }
            }).catch(async (e) => {
              const userCheck = guild.members.cache.get(user.id)
              
              if (userCheck !== undefined) {
                await clientDB.checkAdultList.update({
                  where: {
                    id
                  },
                  data: {
                    isPass: false,
                    retry: false
                  },
                })
                await client.channels.cache.get(channels_log).send({
                  content: `<@${user.id}>님의 미자검사 재인증 결과, 미자입니다. ( 사유 : 시간 초과 )`,
                });
                await channel.delete().catch(async (error) => {
                  await client.channels.cache.get(channels_log).send({
                    content: `알 수 없는 오류가 발생했습니다. 오류 : ${error.message}`,
                  });
                  return
                })
                return
              } else {
                await c.delete()
                return
              }
            })
          })
        });
        await client.channels.cache.get(channels_log).send({
          content: `<@${user.id}>님의 미자검사 재인증를 진행합니다. 요청자 : <@${interaction.user.id}>`,
        });
      } catch (error) {
        await client.channels.cache.get("1171357457147232346").send({
          content: `모종의 오류가 발생했습니다. 오류 내용 : ${error.message}`
        })
      }
    }
  }
}