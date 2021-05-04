# Contributing Guidelines
Here you'll find some very basic rules that if followed, will make development on this bot a lot more streamlined.

1. First and foremost, don't push massive amounts of work in a single commit. Work on bits a pieces at a time, and commit them separately.
    * This helps with keeping track of what new features were added or changed, as well as helping to find bugs if they appear.
2. Make sure your commit messages are clear and concise.
    * ✅ **DO:** `jarfix: updated the link` 
    * ❌ **DON'T** `someBODY once TOLD ME`
    * ✅ **DO:** `owo: fixed guild setting synchronization`
    * ❌ **DON'T:** `fixed that fucking owo bug`
3. If there is a massive and breaking change, **don't commit it to master.** Instead, create a new branch with the new change and open a PR.
    * This is so that we're all aware of what the change is and we can update our own codebases accordingly
    * This also helps with feedback; if there's something you may have missed, or a new bug may have been introduced, a new pair of eyes is never a bad thing.
4. Comment your code like your life depends on it.
    * If you think future you might not be able to read it, it needs to be commented.
    * If you used a clever one-liner, comment the process.
    * If you used some obscure variable name, comment what it means.
    * If your logic is convoluted, comment each step.
    * Check out the [index.js](./index.js) file for some good examples on how to comment your code.