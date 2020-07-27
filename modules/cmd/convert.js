const path = require(`path`);
const util = require(`util`);
const djs = require(`discord.js`);
const { Command, OBUtil, Memory, RecordEntry, LogEntry, Assets } = require(`../core/OptiBot.js`);

const bot = Memory.core.client;
const log = bot.log;

const metadata = {
    name: path.parse(__filename).name,
    short_desc: `Short description. Shows in \`${bot.prefix}list\``,
    long_desc: `Long description. Shows in \`${bot.prefix}help\` and tooltips in \`${bot.prefix}list\``,
    args: `[args]`,
    image: 'IMG_args',
    authlvl: 5,
    flags: ['DM_OPTIONAL', 'NO_TYPER', 'HIDDEN'],
    run: null
}

metadata.run = (m, args, data) => {
    Memory.db.cprofiles.find({}, (err, docs) => {
        if(err) return OBUtil.err(err, {m:m});
        
        let timeStart = new Date().getTime();

        let i = 0;
        (function doNext() {
            let profile = docs[i];

            let pd = {
                id: profile.member_id,
                format: 3,
                ndata: {},
                edata: {
                    lastSeen: timeStart
                }
            };

            if(profile.violations) {
                pd.edata.record = [];
                for(let violation of profile.violations) {
                    let entry = {
                        date: violation.date,
                        moderator: violation.moderator,
                        url: null,
                        action: null,
                        actionType: 1,
                        reason: violation.reason,
                        details: null,
                        parent: null,
                        pardon: null,
                        edits: null
                    }

                    if(violation.action.match(/note/i)) {
                        entry.action = 0
                    } else
                    if(violation.action.match(/warn/i)) {
                        entry.action = 1
                    } else
                    if(violation.action.match(/mute/i)) {
                        entry.action = 2
                    }

                    if(violation.misc) {
                        entry.details = violation.misc;
                    }

                    pd.edata.record.push(entry);
                }

                if(profile.mute) {
                    pd.edata.mute = {
                        caseID: profile.mute.start,
                        end: profile.mute.end
                    }
                }
            }

            if(profile.cape) {
                pd.ndata.cape = {
                    uuid: profile.cape.uuid
                }
            }

            OBUtil.updateProfile(pd).then(() => {
                i++;
                if(i === docs.length) {
                    let timeTaken = new Date().getTime() - timeStart;
                    m.channel.send(`converted ${i} profiles in ${timeTaken / 1000} seconds`);
                } else {
                    doNext();
                }
            })

        })();
    })
}

module.exports = new Command(metadata);