require('dotenv').config()

const { Telegraf, session, Scenes: { WizardScene, Stage } } = require('telegraf')
const mongoose = require('mongoose')

require('./plan.model')

mongoose.connect('mongodb://localhost:27017/beryslav')
.then(() => console.log('MongoDB has started...'))
.catch(e => console.log(e))

const Plan = mongoose.model('plan')

const PASSWORD = process.env.PASSWORD;
const TOKEN = process.env.TOKEN

const bot = new Telegraf(TOKEN)
async function getDate() {
    let date = new Date().toISOString().split('T')[0].replaceAll('-', '.');
    let dateArray = date.split('.');
    date = `${dateArray[2]}.${dateArray[1]}.${dateArray[0]}`;
    return date;
}

const getData = new WizardScene('get_data', 
    async (ctx) => {
        date = await getDate();
        Plan.find({date: date}, async (err, docs) => {
            mongoose.disconnect();
     
            if(err) return console.log(err);
             
            for(let i = 0; i < docs.length; i++) {
                await ctx.reply(`Описание: ${docs[i].description}\nАдрес: ${docs[i].location}\nДата: ${docs[i].date}`);
            }
            await ctx.reply('Это все услуги доступные сегодня')
        })
    },
    (ctx) => {
        ctx.scene.leave();
    }
)


const sendData = new WizardScene('send_data',
    (ctx) => {
        ctx.reply('Добавьте описание для своей услуги.')
        ctx.wizard.next();
    },
    (ctx) => {
        ctx.wizard.state.description = ctx.message.text;
        ctx.reply('Укажите адрес где вы будете предоставлять услугу')
        ctx.wizard.next();
    },
    async (ctx) => {
        ctx.wizard.state.location = ctx.message.text;
        ctx.reply(`Укажите дату когда вы будете предоставлять услугу.\nПример: ${await getDate()}`)
        ctx.wizard.next();
    },
    (ctx) => {
        ctx.wizard.state.date = ctx.message.text;
        const plan = new Plan({
            description: ctx.wizard.state.description,
            location: ctx.wizard.state.location,
            date: ctx.wizard.state.date
        })

        plan.save().then(user => {
            ctx.reply('Услуга успешно добавлена')
        }).catch(e => console.log(e))

        ctx.scene.leave();
    }
)

bot.help((ctx) => ctx.reply('С помощью бота можно узнать какие услуги сейчас есть в нашем городе 🏪'))
bot.on('sticker', (ctx) => ctx.reply('🌎💙💛'))

const stage = new Stage([sendData, getData]);

bot.use(session());
bot.use(stage.middleware());

bot.start(async (ctx) => { 
    await ctx.reply('Привет!🌎💙💛',
    {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Список услуг', callback_data: 'get'}],
                [{ text: 'Добавить услугу', callback_data: 'share'}],
            ],
        },
    })
})

bot.on('callback_query', (ctx) => {
    if(ctx.update.callback_query.data == 'get') {
        ctx.scene.enter('get_data')
    } else {
        ctx.scene.enter('send_data')
    }
})


bot.launch()