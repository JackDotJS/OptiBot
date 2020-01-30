let sm_i = 0;
let agg = 4;
let sm_alt = {
    now: 0,
    count: 0,
};

module.exports = {
    interval: 250,
    fn: (bot, log) => {
        /**
         * FORMAT:
         * 
         * 0000000000000000: {
                past: [],
                now: 0,
                mps: 0.0,
                manual: false,
                i: 0,
                until: null,
            }
            */

        let channels = Object.keys(bot.memory.sm);
        if(channels.length > 0) {
            channels.forEach((id, i) => {
                let tc = bot.memory.sm[id];
                tc.past.push(tc.now);
                tc.now = 0;

                if(tc.past.length > 10) {
                    tc.past.shift();
                }

                if(sm_alt.now === 0) {
                    tc.mps = tc.past.reduce((a, b) => a + b) / tc.past.length;
                }

                if(tc.mps !== 0) log(`${id}: ${tc.mps} mps`);

                if(tc.until !== null) {
                    if(new Date().getTime() >= tc.until) {
                        // disable slowmode
                        tc.until = null;
                        tc.i = 0;

                        this.guilds.get(cfg.guilds.optibot).channels.get(id).setRateLimitPerUser(tc.i).then((chn) => {
                            log(`Slowmode disabled in ${chn.id}`, 'info');
                            agg = 4;
                        });
                    }
                }

                if(sm_i === 0 && tc.mps > 0.5) {
                    // check time
                    let expiration = new Date().getTime() + (1000 * 60 * 10); // 10 minutes
                    let ratelimit = 3;

                    if(tc.mps > 2) {
                        ratelimit = 10;
                    } else
                    if(tc.mps > 3) {
                        ratelimit = 30;
                    }

                    tc.until = expiration;
                    if(tc.i === ratelimit) {
                        tc.i += tc.i;
                    } else 
                    if(tc.i < ratelimit) {
                        tc.i = ratelimit;

                        this.guilds.get(cfg.guilds.optibot).channels.get(id).setRateLimitPerUser(tc.i).then((chn) => {
                            if(agg !== 3) {
                                agg--
                            }
                            log(`Slowmode set to ${tc.i} seconds in ${chn.id}`, 'info');
                        });
                    }
                }

                if(parseInt(i)+1 >= channels.length) {
                    if(sm_i === agg) {
                        sm_i = 0;   
                    } else {
                        sm_i++;
                    }

                    if(sm_alt.count === 3) {
                        if (tc.mps !== 0) log('invert');
                        if(sm_alt.now === 0) {
                            sm_alt.now = 1;
                        } else {
                            sm_alt.now = 0;
                        }
                        sm_alt.count = 0;
                    } else {
                        sm_alt.count++;
                    }

                }
            });
        }
    }
}