const util = require(`util`);

module.exports = class RecordEntry {
    constructor() {
        const data = {
            date: new Date().getTime(),
            moderator: null,
            url: null,
            action: null,
            actionType: null,
            reason: null,
            details: null,
            parent: null,
            pardon: {
                state: false
            },
        }

        Object.defineProperty(this, 'data', {
            get: () => {
                return data;
            }
        });
    }

    setDate(date) {
        this.data.date = date;
        return this;
    }

    setMod(id) {
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
        new URL(url);

        this.data.url = url;
        return this;
    }

    setAction(type) {
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
            default:
                throw new Error('Unknown action.');
        }
        return this;
    }

    setActionType(type) {
        switch(type.toLowerCase()) {
            case 'remove': 
                this.data.actionType = -1;
                break;
            case 'edit': 
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

    setReason(text) {
        this.data.reason = String(text);
        return this;
    }

    setDetails(text) {
        this.data.details = String(text);
        return this;
    }

    setParent(caseID) {
        if(!Number.isInteger(Number(caseID))) {
            throw new Error('Case ID must be a complete integer.')
        } else {
            this.data.parent = parseInt(caseID);
            return this;
        }
    }
}