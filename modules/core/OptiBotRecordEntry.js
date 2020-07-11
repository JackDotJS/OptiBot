const util = require(`util`);
const djs = require(`discord.js`);

const Memory = require(`./OptiBotMemory.js`);

module.exports = class RecordEntry {
    constructor(raw = {}) {
        this.date = (raw.date) ? raw.date : new Date().getTime();
        this.moderator = (raw.moderator) ? raw.moderator : null;
        this.url = (raw.url) ? raw.url : null;
        this.action = (raw.action) ? raw.action : null;
        this.actionType = (raw.actionType) ? raw.actionType : null;
        this.reason = (raw.reason) ? raw.reason : null;
        this.details = (raw.details) ? raw.details : null;
        this.parent = (raw.parent) ? raw.parent : null;
        this.children = [];
        this.display = {
            icon: null,
            action: null,
        };
        this.pardon = (raw.pardon) ? raw.pardon : null;
        this.edits = (raw.edits) ? raw.edits : null;

        Object.defineProperty(this, 'raw', {
            get: () => {
                if(this.moderator instanceof djs.User) {
                    this.moderator = this.moderator.id;
                }
        
                if(this.pardon && this.pardon.admin instanceof djs.User) {
                    this.pardon.admin = this.pardon.admin.id;
                }
        
                return {
                    date: this.date,
                    moderator: this.moderator,
                    url: this.url,
                    action: this.action,
                    actionType: this.actionType,
                    reason: this.reason,
                    details: this.details,
                    parent: this.parent,
                    pardon: this.pardon,
                    edits: this.edits
                };
            }
        })

        this._def();
    }

    _def() {
        const OBUtil = require(`./OptiBotUtil.js`);

        let action = null;
        let type = null;

        switch(this.action) {
            case 0:
                this.display.icon = `${OBUtil.getEmoji('ICO_docs')}`;
                action = `Note`;
                break;
            case 1:
                this.display.icon = `${OBUtil.getEmoji('ICO_warn')}`;
                action = `Warning`;
                break;
            case 2:
                this.display.icon = `${OBUtil.getEmoji('ICO_mute')}`;
                action = `Mute`;
                break;
            case 3:
                this.display.icon = `${OBUtil.getEmoji('ICO_kick')}`;
                action = `Kick`;
                break;
            case 4:
                this.display.icon = `${OBUtil.getEmoji('ICO_ban')}`;
                action = `Ban`;
                break;
            case 5:
                this.display.icon = `${OBUtil.getEmoji('ICO_points')}`;
                action = `Points`;
                break;
        }

        switch(this.actionType) {
            case -1:
                type = `Remove`;
                break;
            case 0:
                type = `Update`;
                break;
            case 1:
                if (![3, 4].includes(this.action)) type = `Add`;
                break;
        }

        if(action !== null && type !== null) {
            this.display.action = `${type} ${action}`;
        }

        return this;
    }

    _addUpdate(key, value, author) {
        if(this.edits === null) this.edits = {
            original: {},
            history: []
        }

        
        if(this.edits.original[key] === undefined) {
            if(key === 'pardon') {
                this.edits.original.pardon = this.pardon.reason;
            } else {
                this.edits.original[key] = this[key];
            }
        }

        this.edits.history.push({
            date: new Date().getTime(),
            author: author.id,
            property: key,
            change: value
        });

        if(key === 'pardon') {
            this.pardon.reason = value;
        } else {
            this[key] = value;
        }

        return this;
    }

    setMod(id) {
        if(this.moderator) {
            throw new Error(`Cannot update entry moderator.`)
        } else
        if(!Number.isInteger(Number(id))) {
            throw new Error('Moderator ID must resolve as a complete integer.')
        } else
        if (parseInt(id) <= 1420070400000) {
            throw new Error('Invalid moderator ID.')
        } else {
            this.moderator = String(id);
            return this;
        }
    }

    setURL(url) {
        if(this.url) {
            throw new Error(`Cannot update entry URL.`)
        }

        new URL(url);

        this.url = url;
        return this;
    }

    setAction(type) {
        if(this.action) {
            throw new Error(`Cannot update entry action.`)
        }

        switch(type.toLowerCase()) {
            case 'note': 
                this.action = 0;
                break;
            case 'warn': 
                this.action = 1;
                break;
            case 'mute': 
                this.action = 2;
                break;
            case 'kick': 
                this.action = 3;
                break;
            case 'ban': 
                this.action = 4;
                break;
            case 'points': 
                this.action = 5;
                break;
            default:
                throw new Error('Unknown action.');
        }

        return this._def();
    }

    setActionType(type) {
        if(this.actionType) {
            throw new Error(`Cannot update entry actionType.`)
        }

        switch(type.toLowerCase()) {
            case 'remove': 
                this.actionType = -1;
                break;
            case 'update': 
                this.actionType = 0;
                break;
            case 'add': 
                this.actionType = 1;
                break;
            default:
                throw new Error('Unknown action type.');
        }
        return this._def();
    }

    setReason(author, text) {
        if(text.length === 0) {
            throw new Error('Invalid reason string.')
        }

        if(this.reason) {
            this._addUpdate('reason', String(text), author)
        } else {
            this.reason = String(text);
        }
        
        return this;
    }

    setDetails(author, text) {
        if(text.length === 0) {
            throw new Error('Invalid details string.')
        }

        if(this.details) {
            this._addUpdate('details', String(text), author)
        } else {
            this.details = String(text);
        }

        return this;
    }

    setParent(author, caseID) {
        if(!Number.isInteger(Number(caseID))) {
            throw new Error('Case ID must be a complete integer.')
        } else
        if(this.parent) {
            this._addUpdate('parent', parseInt(caseID), author)
        } else {
            this.parent = parseInt(caseID);
        }

        return this;
    }

    pardon(author, reason) {
        if(!reason) {
            throw new Error(`Missing reason for pardon.`)
        }

        if(text.length === 0) {
            throw new Error('Invalid pardon reason string.')
        }

        if(this.reason) {
            this._addUpdate('pardon', String(reason), author)
        } else {
            this.pardon = {
                date: new Date().getTime(),
                admin: author.id,
                url: m.url,
                reason: String(reason)
            }
        }

        return this;
    }
}