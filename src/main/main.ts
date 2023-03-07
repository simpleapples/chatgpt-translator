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
import { resolveHtmlPath } from './util';

const { globalShortcut } = require('electron');
const Store = require('electron-store');

const store = new Store();

class AppUpdater {
    constructor() {
        log.transports.file.level = 'info';
        autoUpdater.logger = log;
        autoUpdater.checkForUpdatesAndNotify();
    }
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function generatePayload(prompt: string, content: string) {
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
            temperature: 0,
            max_tokens: 1000,
            top_p: 1,
            frequency_penalty: 1,
            presence_penalty: 1,
        }),
    };
}

ipcMain.on('translate', async (event, arg) => {
    const payload = generatePayload(
        `you are a translation bot that can only reply translated content without doing anything else`,
        `translate from ${arg[1]} to ${arg[2]}\n\n${arg[0]}`
    );
    console.log(payload);

    let status = '';
    let message = '';
    const response = (await fetch(
        'https://api.openai.com/v1/chat/completions',
        payload
    ).catch(() => {
        message = 'Network error';
        status = 'network_error';
        event.reply('translate', [status, message]);
    })) as Response;
    response
        .text()
        .then((res) => {
            const respJSON = JSON.parse(res);
            console.log(respJSON);

            try {
                console.log(respJSON.choices[0].message);
                message = respJSON.choices[0].message.content;
                status = 'success';
            } catch (e) {
                message = respJSON.error.message;
                if (!store.get('api_key')) {
                    status = 'need_api_key';
                } else {
                    status = 'error';
                }
            }
            event.reply('translate', [status, message]);
        })
        .catch(() => null);
});

ipcMain.on('settings', async (event, arg) => {
    if (arg[0] === 'get') {
        const res: any[] = [];
        arg[1].map((item: any) => res.push(store.get(item)));
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

function createTray() {
    const icon = getAssetPath('icon.png'); // required.
    const trayicon = nativeImage.createFromPath(icon);
    tray = new Tray(trayicon.resize({ width: 16 }));
    const contextMenu = Menu.buildFromTemplate([
        {
            label: '显示窗口 | Show',
            click: () => {
                mainWindow?.show();
            },
        },
        {
            label: '退出 | Quit',
            click: () => {
                mainWindow?.removeAllListeners();
                app.quit();
            },
        },
    ]);

    tray.setContextMenu(contextMenu);
}

const createWindow = async () => {
    if (isDebug) {
        await installExtensions();
    }

    if (!tray) {
        createTray();
    }
    const defaultW = 1024;
    const defaultH = 800;
    mainWindow = new BrowserWindow({
        show: false,
        width: defaultW,
        height: defaultH,
        icon: getAssetPath('icon.png'),
        autoHideMenuBar: true,
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

    mainWindow.on('dom-ready', () => {
        mainWindow?.setSize(defaultW, defaultH);
    });

    mainWindow.on('close', (event) => {
        event.preventDefault();
        mainWindow?.hide();
    });

    mainWindow.webContents.on('will-navigate', (e, url) => {
        e.preventDefault();
        shell.openExternal(url);
    });

    // Remove this if your app does not use auto updates
    // eslint-disable-next-line
    new AppUpdater();
};

/**
 * Add event listeners...
 */
app.whenReady()
    .then(() => {
        try {
            const shortcut = store.get('shortcut');
            globalShortcut.register(shortcut, () => {
                if (mainWindow === null) {
                    createWindow();
                } else if (!mainWindow?.isVisible()) {
                    mainWindow.show();
                } else {
                    mainWindow.close();
                }
            });
        } catch (e) {
            // Ignore
        }
        createWindow();
        app.on('activate', () => {
            // On macOS it's common to re-create a window in the app when the
            // dock icon is clicked and there are no other windows open.
            if (mainWindow === null) createWindow();
        });
    })
    .catch(console.log);
