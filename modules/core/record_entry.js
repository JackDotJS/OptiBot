const util = require('util');
const djs = require('discord.js');

const Memory = require('./memory.js');

module.exports = class RecordEntry {
  constructor(raw = {}) {
    try {
      Memory.core.client.log(util.inspect(raw));

      // please kill me
      this.date = (raw.date != null) ? raw.date : new Date().getTime();
      this.moderator = (raw.moderator != null) ? raw.moderator : null;
      this.url = (raw.url != null) ? raw.url : null;
      this.action = (raw.action != null) ? raw.action : null;
      this.actionType = (raw.actionType != null) ? raw.actionType : null;
      this.reason = (raw.reason != null) ? raw.reason : null;
      this.details = (raw.details != null) ? raw.details : null;
      this.parent = (raw.parent != null) ? raw.parent : null;
      this.children = [];
      this.display = {
        id: null,
        parent: null,
        children: null,
        icon: null,
        action: null,
        pointsTotal: null,
        pointsNow: null
      };
      this.pardon = (raw.pardon) ? raw.pardon : null;
      this.edits = (raw.edits) ? raw.edits : null;
      this.index = (raw.index) ? raw.index : null;

      if (this.date.constructor === Date) this.date = this.date.getTime();

      Object.defineProperty(this, 'raw', {
        get: () => {

          const pardonTemp = this.pardon;

          if (pardonTemp && pardonTemp.admin.constructor === djs.User) {
            pardonTemp.admin = pardonTemp.admin.id;
          }

          const rawData = {
            date: this.date,
            moderator: (this.moderator.constructor === djs.User) ? this.moderator.id : this.moderator,
            url: this.url,
            action: this.action,
            actionType: this.actionType,
            reason: this.reason,
            details: this.details,
            parent: this.parent,
            pardon: pardonTemp,
            edits: this.edits
          };

          return rawData;
        }
      });

      this._def();
    }
    catch (err) {
      Memory.core.client.log(err);
      Memory.core.client.log('WHAT THE FUCK');
    }
  }

  _def() {
    const Assets = require('./OptiBotAssetsManager.js');
    const OBUtil = require('./OptiBotUtil.js');
    const bot = Memory.core.client;

    let action = '';
    let type = '';

    this.display.id = this.date.toString(36).toUpperCase();

    switch (this.action) {
      case 0:
        this.display.icon = `${Assets.getEmoji('ICO_docs')}`;
        action = 'Note';
        break;
      case 1:
        this.display.icon = `${Assets.getEmoji('ICO_warn')}`;
        action = 'Warning';
        break;
      case 2:
        this.display.icon = `${Assets.getEmoji('ICO_mute')}`;
        action = 'Mute';
        break;
      case 3:
        this.display.icon = `${Assets.getEmoji('ICO_kick')}`;
        action = 'Kick';
        break;
      case 4:
        this.display.icon = `${Assets.getEmoji('ICO_ban')}`;
        action = 'Ban';
        break;
      case 5:
        this.display.icon = `${Assets.getEmoji('ICO_points')}`;
        action = 'Marks';
        break;
    }

    switch (this.actionType) {
      case -1:
        type = (this.action === 4) ? 'Revoke' : 'Remove';
        break;
      case 0:
        type = 'Update';
        break;
      case 1:
        if (![3, 4].includes(this.action)) type = 'Add';
        break;
    }

    this.display.action = `${type} ${action}`.trim();

    if (this.parent) {
      this.display.parent = this.parent.toString(36).toUpperCase();
    }

    if (this.action === 5 && this.actionType === 1 && this.details !== null) {
      this.display.pointsTotal = parseInt(this.details.match(/(?<=\[)\d+(?=\])/));
      this.display.pointsNow = OBUtil.calculatePoints(this.date, this.display.pointsTotal);
    }

    if (this.children.length > 0) {
      this.display.children = [];
      for (const child of this.children) {
        this.display.children.push(child.toString(36).toUpperCase());
      }
      return this;
    } else {
      return this;
    }
  }

  _addUpdate(key, value, author) {
    if (this.edits === null) this.edits = {
      original: {},
      history: []
    };


    if (this.edits.original[key] === undefined) {
      if (key === 'pardon') {
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

    if (key === 'pardon') {
      this.pardon.reason = value;
    } else {
      this[key] = value;
    }

    return this;
  }

  setMod(id) {
    if (this.moderator) {
      throw new Error('Cannot update entry moderator.');
    } else
    if (!Number.isInteger(Number(id))) {
      throw new Error('Moderator ID must resolve as a complete integer.');
    } else
    if (parseInt(id) <= 1420070400000) {
      throw new Error('Invalid moderator ID.');
    } else {
      this.moderator = String(id);
      return this;
    }
  }

  setURL(url) {
    if (this.url) {
      throw new Error('Cannot update entry URL.');
    }

    new URL(url);

    this.url = url;
    return this;
  }

  setAction(type) {
    if (this.action) {
      throw new Error('Cannot update entry action.');
    }

    switch (type.toLowerCase()) {
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
    if (this.actionType) {
      throw new Error('Cannot update entry actionType.');
    }

    switch (type.toLowerCase()) {
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
    if (text.length === 0) {
      throw new Error('Invalid reason string.');
    }

    if (this.reason) {
      this._addUpdate('reason', String(text), author);
    } else {
      this.reason = String(text);
    }

    return this;
  }

  setDetails(author, text) {
    if (text.length === 0) {
      throw new Error('Invalid details string.');
    }

    if (this.details) {
      this._addUpdate('details', String(text), author);
    } else {
      this.details = String(text);
    }

    return this;
  }

  setParent(author, caseID) {
    let target = caseID;

    if (!Number.isInteger(parseInt(caseID))) {
      target = parseInt(caseID, 36);
    }

    if (isNaN(target) || caseID < 1420070400000 || caseID > new Date().getTime()) {
      throw new Error('Invalid case ID.');
    } else
    if (this.parent) {
      this._addUpdate('parent', parseInt(caseID), author);
    } else {
      this.parent = parseInt(caseID);
    }

    return this;
  }

  setPardon(m, reason) {
    if (!reason) {
      throw new Error('Missing reason for pardon.');
    }

    if (reason.length === 0) {
      throw new Error('Invalid pardon reason string.');
    }

    if (this.pardon) {
      this._addUpdate('pardon', String(reason), m.author);
    } else {
      this.pardon = {
        date: new Date().getTime(),
        admin: m.author.id,
        url: m.url,
        reason: String(reason)
      };
    }

    return this;
  }
};