const util = require(`util`);
const djs = require(`discord.js`);

module.exports = class RecordEntry {
    constructor(raw) {
        const data = {
            date: null,
            moderator: null,
            url: null,
            action: null,
            actionType: null,
            reason: null,
            details: null,
            parent: null,
            children: [],
            display: {
                icon: null,
                action: null,
            },
            pardon: null,
            edits: null
        }

        if(raw) {
            if(raw.date) data.date = raw.date;
            if(raw.moderator) data.moderator = raw.moderator;
            if(raw.url) data.url = raw.url;
            if(raw.action) data.action = raw.action;
            if(raw.actionType) data.actionType = raw.actionType;
            if(raw.reason) data.reason = raw.reason;
            if(raw.details) data.details = raw.details;
            if(raw.parent) data.parent = raw.parent;
            if(raw.pardon) data.pardon = raw.pardon;
            if(raw.edits) data.edits = raw.edits;
        }

        this.raw = data;
        this.date = data.date;
        this.moderator = data.moderator;
        this.url = data.url;
        this.action = data.action;
        this.actionType = data.actionType;
        this.reason = data.reason;
        this.details = data.details;
        this.parent = data.parent;
        this.children = data.children;
        this.display = data.display;
        this.pardon = data.pardon;
        this.edits = data.edits;
        

        this._def();
    }

    _def() {
        let action = null;
        let type = null;

        switch(this.action) {
            case 0:
                this.display.icon = `<:ICO_docs:657535756746620948>`;
                action = `Note`;
                break;
            case 1:
                this.display.icon = `<:ICO_warn:672291115369627678>`;
                action = `Warning`;
                break;
            case 2:
                this.display.icon = `<:ICO_mute:671593152221544450>`;
                action = `Mute`;
                break;
            case 3:
                this.display.icon = `<:ICO_kick:671964834988032001>`;
                action = `Kick`;
                break;
            case 4:
                this.display.icon = `<:ICO_ban:671964834887106562>`;
                action = `Ban`;
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
                if ([3, 4].indexOf(entry.action) < 0) type = `Add`;
                break;
        }

        if(action !== null && type !== null) {
            this.display.action = `${type} ${action}`;
        }

        return this;
    }

    _addUpdate(key, value, m) {
        if(this.edits === null) this.edits = {
            original: {},
            history: []
        }

        
        if(this.edits.original[key] === undefined) {
            if(key === 'pardon') {
                this.edits.original.pardon = this.pardon.reason;
            } else {
                this.edits.original[key] = this.raw[key];
            }
        }

        this.edits.history.push({
            date: new Date().getTime(),
            author: m.author.id,
            property: key,
            change: value
        });

        if(key === 'pardon') {
            this.pardon.reason = value;
        } else {
            this.raw[key] = value;
        }

        return this;
    }

    setDate(date) {
        if(this.date) {
            throw new Error(`Cannot update entry date.`)
        } else
        if(date.constructor === Date) {
            this.date = date.getTime();
        } else
        if(Number.isInteger(date)) {
            this.date = date;
        } else {
            throw new Error('Invalid date.')
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
        if(this.moderator) {
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

    setReason(m, text) {
        if(this.reason) {
            this._addUpdate('reason', String(text), m)
        } else {
            this.reason = String(text);
        }
        
        return this;
    }

    setDetails(m, text) {
        if(this.details) {
            this._addUpdate('details', String(text), m)
        } else {
            this.details = String(text);
        }

        return this;
    }

    setParent(m, caseID) {
        if(!Number.isInteger(Number(caseID))) {
            throw new Error('Case ID must be a complete integer.')
        } else
        if(this.parent) {
            this._addUpdate('parent', parseInt(caseID), m)
        } else {
            this.parent = parseInt(caseID);
        }

        return this;
    }

    pardon(m, reason) {
        if(!reason) {
            throw new Error(`Missing reason for pardon.`)
        } else
        if(this.reason) {
            this._addUpdate('pardon', String(reason), m)
        } else {
            this.pardon = {
                date: new Date().getTime(),
                admin: m.author.id,
                url: m.url,
                reason: String(reason)
            }
        }

        return this;
    }

    getRaw() {
        if(this.moderator instanceof djs.User) {
            this.moderator = this.moderator.id;
        }

        if(this.pardon && this.pardon.admin instanceof djs.User) {
            this.pardon.admin = this.pardon.admin.id;
        }

        delete this.children;
        delete this.display;

        return this.raw;
    }
}