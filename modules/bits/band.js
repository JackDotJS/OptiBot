const path = require('path');
const util = require('util');
const djs = require('discord.js');
const { OptiBit, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: 'Band Emojis',
    description: 'todo',
    usage: 'Just say "band". Not case-sensitive. Does not work if your message contains any more text.',
    priority: 0,
    concurrent: true,
    authlvl: 1,
    flags: ['DM_OPTIONAL'],
    validator: null,
    run: null
};

metadata.validator = (m, member, authlvl) => {
    return (m.content.toLowerCase() === 'band');
};

metadata.executable = (m, member, authlvl) => {
    m.react('🎺').then(()=>{
        m.react('🎸').then(()=>{
            m.react('🥁').then(()=>{
                m.react('🎤').catch(err => OBUtil.err(err));
            }).catch(err => OBUtil.err(err));
        }).catch(err => OBUtil.err(err));
    }).catch(err => OBUtil.err(err));
};

module.exports = new OptiBit(metadata);