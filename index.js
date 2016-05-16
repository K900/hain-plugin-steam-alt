'use strict';

module.exports = (pluginContext) => {
    const fs = require('fs');
    const vdf = require('vdf');
    const opn = require('opn');

    const app = pluginContext.app;
    const logger = pluginContext.logger;
    const matchutil = pluginContext.matchutil;
    const prefs = pluginContext.preferences;
    const shell = pluginContext.shell;

    var index = {};

    function isValidDirectory(dir) {
        return fs.statSync(dir).isDirectory();
    }

    function isAppManifest(file) {
        return file.startsWith('appmanifest_') && file.endsWith('.acf')
    }

    function processFile(file) {
        fs.readFile(file, 'utf8', (err, data) => {
            const parsed = vdf.parse(data);
            const appID = parsed['AppState']['appID'];
            const gameName = parsed['AppState']['name'];
            index[gameName] = appID;
        });
    }

    function processDirectory(dir) {
        fs.readdir(dir, (err, items) => {
            items.filter(isAppManifest).map(file => dir + '/' + file).forEach(processFile);
        });
    }

    function rebuildIndex() {
        prefs.get('appDirs').filter(isValidDirectory).forEach(processDirectory);
    }

    function startup() {
        prefs.on('update', rebuildIndex);
        rebuildIndex();
    }

    function search(query, res) {
        const query_trim = query.replace(' ', '');
        matchutil.fuzzy(Object.keys(index), query_trim, x => x).forEach(x => {
            const name = x.elem;
            const nameBold = matchutil.makeStringBoldHtml(name, x.matches);
            const appID = index[name];
            res.add({
                group: 'Steam',
                id: appID,
                title: name,
                desc: 'Run ' + nameBold + ' from Steam (appID ' + appID + ')'
            });
        });
    }

    function execute(id, payload) {
        opn('steam://rungameid/' + id);
        app.close();
    }

    return {
        startup,
        search,
        execute
    };
};
