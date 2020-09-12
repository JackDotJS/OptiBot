const path = require('path');
const util = require('util');
const djs = require('discord.js');
const { OptiBit, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require('../core/OptiBot.js');

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: 'Mojang JIRA Issue Detector',
    description: 'todo',
    usage: 'Type ` MC- ` immediately followed by a series of numbers, like so: ` MC-123456 `. Does not work if the overall number is NOT surrounded by empty space, periods, or any other word-ending characters (e.g, brackets ` [] ` and parenthesis ` () `).',
    priority: 2,
    concurrent: true,
    authlvl: 50,
    flags: ['DM_OPTIONAL', 'HIDDEN'],
    validator: null,
    run: null
};

metadata.validator = (m, member, authlvl) => {
    //todo
};

metadata.executable = (m, member, authlvl) => {
    //todo
};

module.exports = new OptiBit(metadata);