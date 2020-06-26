const util = require(`util`);

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
        }

        Object.defineProperty(this, 'data', {
            get: () => {
                return data;
            }
        });
    }

    setDate(date) {
        if(this.data.date) {
            throw new Error(`Cannot update entry date.`)
        } else
        if(date.constructor === Date) {
            this.data.date = date.getTime();
        } else
        if(Number.isInteger(date)) {
            this.data.date = date;
        } else {
            throw new Error('Invalid date.')
        }
        
        return this;
    }

    setMod(id) {
        if(this.data.moderator) {
            throw new Error(`Cannot update entry moderator.`)
        } else
        if(!Number.isInteger(Number(id))) {
            throw new Error('Moderator ID must resolve as a complete integer.')
        } else
        if (parseInt(id) <= 1420070400000) {
            throw new Error('Invalid moderator ID.')
        } else {
            this.data.moderator = String(id);
            return this;
        }
    }

    setURL(url) {
        if(this.data.moderator) {
            throw new Error(`Cannot update entry URL.`)
        }

        new URL(url);

        this.data.url = url;
        return this;
    }

    setAction(type) {
        if(this.data.action) {
            throw new Error(`Cannot update entry action.`)
        }

        switch(type.toLowerCase()) {
            case 'note': 
                this.data.action = 0;
                break;
            case 'warn': 
                this.data.action = 1;
                break;
            case 'mute': 
                this.data.action = 2;
                break;
            case 'kick': 
                this.data.action = 3;
                break;
            case 'ban': 
                this.data.action = 4;
                break;
            case 'points': 
                this.data.action = 5;
                break;
            default:
                throw new Error('Unknown action.');
        }
        return this;
    }

    setActionType(type) {
        if(this.data.actionType) {
            throw new Error(`Cannot update entry actionType.`)
        }

        switch(type.toLowerCase()) {
            case 'remove': 
                this.data.actionType = -1;
                break;
            case 'update': 
                this.data.actionType = 0;
                break;
            case 'add': 
                this.data.actionType = 1;
                break;
            default:
                throw new Error('Unknown action type.');
        }
        return this;
    }

    setReason(m, text) {
        if(this.data.reason) {
            this.addUpdate('reason', String(text), m)
        } else {
            this.data.reason = String(text);
        }
        
        return this;
    }

    setDetails(m, text) {
        if(this.data.reason) {
            this.addUpdate('details', String(text), m)
        } else {
            this.data.details = String(text);
        }

        return this;
    }

    setParent(m, caseID) {
        if(!Number.isInteger(Number(caseID))) {
            throw new Error('Case ID must be a complete integer.')
        } else
        if(this.data.reason) {
            this.addUpdate('parent', parseInt(caseID), m)
        } else {
            this.data.parent = parseInt(caseID);
        }

        return this;
    }

    pardon(m, reason) {
        if(!reason) {
            throw new Error(`Missing reason for pardon.`)
        } else
        if(this.data.reason) {
            this.addUpdate('pardon', String(reason), m)
        } else {
            this.data.pardon = {
                date: new Date().getTime(),
                admin: m.author.id,
                url: m.url,
                reason: String(reason)
            }
        }

        return this;
    }

    addUpdate(key, value, m) {
        // todo
    }
}