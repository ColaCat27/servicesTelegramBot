require('dotenv').config()

const { Telegraf, session, Scenes: { WizardScene, Stage } } = require('telegraf')
const mongoose = require('mongoose')

require('./plan.model')

mongoose.connect('mongodb://localhost:27017/beryslav')
.then(() => console.log('MongoDB has started...'))
.catch(e => console.log(e))

const Plan = mongoose.model('plan')

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
            //mongoose.disconnect();
     
            if(err) return console.log(err);
             
            if(docs.length > 0) {
                for(let i = 0; i < docs.length; i++) {
                    await ctx.reply(`Описание: ${docs[i].description}\nАдрес: ${docs[i].location}\nДата: ${docs[i].date}\nВремя: ${docs[i].time}`);
                }
                await ctx.reply('Это все услуги доступные сегодня')
            } else {
                await ctx.reply('Сегодня еще никто не добавил услуги. Для добавления нажмите /start и "Добавить услугу"')
            }
        })
    },
    (ctx) => {
        ctx.scene.leave();
    }
)


const sendData = new WizardScene('send_data',
    (ctx) => {
        try {
            ctx.reply('Добавьте описание для своей услуги.\nСтарайтесь максимально понятно описать то что вы хотите предоставить.')
            return ctx.wizard.next();
        } catch(e) {
            return ctx.scene.reenter();
        }
    },
    (ctx) => {
        try {
            if(ctx.message.text.length < 5) {
                throw new Error('Введите более подробное описание');
            }
            ctx.wizard.state.description = ctx.message.text;
            ctx.reply('Укажите адрес где вы будете предоставлять услугу')
            return ctx.wizard.next();
        } catch(e) {
            return ctx.scene.reenter();
        }
    },
    async (ctx) => {
        try {
            if(ctx.message.text.length < 0) {
                throw new Error();
            }
            ctx.wizard.state.location = ctx.message.text;
            ctx.reply(`Укажите дату когда вы будете предоставлять услугу.\nПример: ${await getDate()}`)
            return ctx.wizard.next();
        } catch(e) {
            console.error(e);
            ctx.wizard.selectStep(ctx.wizard.cursor);
            return;
        }
    },
    (ctx) => {
        try {
            if(ctx.message.text.length < 5) {
                throw new Error('Введите дату в правильном формате');
            } else if(!/\d+\.\d+\.\d+/.test(ctx.message.text)) {
                throw new Error('Введите дату в правильном формате');
            }
            ctx.wizard.state.date = ctx.message.text;
            ctx.reply('Укажите время когда ваша услуга будет доступна.\nПример: с 10-00 до 12-00');
            return ctx.wizard.next();
        } catch(e) {
            ctx.reply(e.message)
            ctx.wizard.selectStep(ctx.wizard.cursor);
            return;
        }
    },
    (ctx) => {
        try {
            if(ctx.message.text.length < 0) {
                throw new Error();
            }
            ctx.wizard.state.time = ctx.message.text;
            const plan = new Plan({
                description: ctx.wizard.state.description,
                location: ctx.wizard.state.location,
                date: ctx.wizard.state.date,
                time: ctx.wizard.state.time
            })
    
            plan.save().then(user => {
                ctx.reply('Услуга успешно добавлена')
            }).catch(e => console.log(e))
    
            ctx.scene.leave();
        } catch(e) {
            console.error(e)
            ctx.wizard.selectStep(ctx.wizard.cursor);
            return;
        }
    }
)

bot.help((ctx) => ctx.reply('С помощью бота можно узнать какие услуги сейчас есть в нашем городе 🏪'))
bot.on('sticker', (ctx) => ctx.reply('🌎💙💛'))

const stage = new Stage([sendData, getData]);

bot.use(session());
bot.use(stage.middleware());

bot.start(async (ctx) => { 
    await ctx.reply('Привет!🌎💙💛\nРабота этого чат-бота основана исключительно на вашей порядочности.\nПостарайтесь вносить максимально корректные данные.',
    {
        reply_markup: {
            keyboard: [
                ['Список услуг', 'Добавить услугу'],
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        },
    })
})

bot.hears('Список услуг', async (ctx) => {
    await ctx.scene.enter('get_data')
    await ctx.scene.leave();
});

bot.hears('Добавить услугу', async (ctx) => {
    await ctx.scene.enter('send_data')
})

bot.launch()