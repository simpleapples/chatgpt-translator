/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import {
    app,
    BrowserWindow,
    shell,
    ipcMain,
    Menu,
    Tray,
    nativeImage,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

const Store = require('electron-store');
const { globalShortcut } = require('electron');

const store = new Store('settings');

class AppUpdater {
    constructor() {
        log.transports.file.level = 'info';
        autoUpdater.logger = log;
        autoUpdater.checkForUpdatesAndNotify();
    }
}

let mainWindow: BrowserWindow | null = null;
let tray = null;

function generatePayload(prompt, content) {
    const apiKey = store.get('api_key');
    return {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        method: 'POST',
        body: JSON.stringify({
            model: store.get('model'),
            messages: [
                { role: 'system', content: prompt },
                {
                    role: 'user',
                    content,
                },
            ],
            temperature: 0.6,
        }),
    };
}

ipcMain.on('translate', async (event, arg) => {
    const payload = generatePayload(
        `translate from ${arg[1]} to ${arg[2]}`,
        arg[0]
    );
    const response = (await fetch(
        'https://api.openai.com/v1/chat/completions',
        payload
    )) as Response;

    response.text().then((res) => {
        const respJSON = JSON.parse(res);
        event.reply('translate', respJSON.choices[0].message.content);
    });
});

ipcMain.on('settings', async (event, arg) => {
    if (arg[0] === 'get') {
        const res = [];
        arg[1].map((item) => {
            res.push(store.get(item));
        });
        event.reply('settings', res);
    } else if (arg[0] === 'set') {
        if (arg[1][1] !== undefined) {
            store.set(arg[1][0], arg[1][1]);
        }
    }
});

if (process.env.NODE_ENV === 'production') {
    const sourceMapSupport = require('source-map-support');
    sourceMapSupport.install();
}

const isDebug =
    process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
    require('electron-debug')();
}

const installExtensions = async () => {
    const installer = require('electron-devtools-installer');
    const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
    const extensions = ['REACT_DEVELOPER_TOOLS'];

    return installer
        .default(
            extensions.map((name) => installer[name]),
            forceDownload
        )
        .catch(console.log);
};

const getAssetPath = (...paths: string[]): string => {
    const RESOURCES_PATH = app.isPackaged
        ? path.join(process.resourcesPath, 'assets')
        : path.join(__dirname, '../../assets');
    return path.join(RESOURCES_PATH, ...paths);
};

const createWindow = async () => {
    if (isDebug) {
        await installExtensions();
    }

    if (!tray) {
        // if tray hasn't been created already.
        createTray();
    }
    mainWindow = new BrowserWindow({
        show: false,
        width: 1024,
        height: 728,
        icon: getAssetPath('icon.png'),
        skipTaskbar: true,
        webPreferences: {
            preload: app.isPackaged
                ? path.join(__dirname, 'preload.js')
                : path.join(__dirname, '../../.erb/dll/preload.js'),
        },
    });

    mainWindow.loadURL(resolveHtmlPath('index.html'));

    mainWindow.on('ready-to-show', () => {
        if (!mainWindow) {
            throw new Error('"mainWindow" is not defined');
        }
        if (process.env.START_MINIMIZED) {
            mainWindow.minimize();
        } else {
            mainWindow.show();
        }
    });

    mainWindow.on('close', (event) => {
        event.preventDefault();
        mainWindow?.minimize();
        // app..hide();
    });

    const menuBuilder = new MenuBuilder(mainWindow);
    menuBuilder.buildMenu();

    // Open urls in the user's browser
    mainWindow.webContents.setWindowOpenHandler((edata) => {
        shell.openExternal(edata.url);
        return { action: 'deny' };
    });

    // Remove this if your app does not use auto updates
    // eslint-disable-next-line
    new AppUpdater();
};

function createTray() {
    const icon = getAssetPath('icon.png'); // required.
    const trayicon = nativeImage.createFromPath(icon);
    tray = new Tray(trayicon.resize({ width: 16 }));
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show',
            click: () => {
                mainWindow?.show();
            },
        },
        {
            label: 'Quit',
            click: () => {
                app.quit(); // actually quit the app.
            },
        },
    ]);

    tray.setContextMenu(contextMenu);
}

/**
 * Add event listeners...
 */
app.on('window-all-closed', (event) => {
    // Respect the OSX convention of having the application in memory even
    // after all windows have been closed
    // if (process.platform !== 'darwin') {
    //     app.quit();
    // }
});

app.whenReady()
    .then(() => {
        try {
            const shortcut = store.get('shortcut');
            globalShortcut.register(shortcut, () => {
                console.log(
                    '---------global shortcut',
                    mainWindow == null,
                    mainWindow?.isHiddenInMissionControl
                );
                if (!mainWindow) {
                    createWindow();
                } else if (mainWindow.isMinimized()) {
                    mainWindow.show();
                } else {
                    mainWindow.close();
                }
            });
        } catch (e) {}
        createWindow();
        app.on('activate', () => {
            // On macOS it's common to re-create a window in the app when the
            // dock icon is clicked and there are no other windows open.
            if (mainWindow === null) createWindow();
        });
    })
    .catch(console.log);
