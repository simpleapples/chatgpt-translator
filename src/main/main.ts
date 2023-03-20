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

const os = require('os');
const { globalShortcut } = require('electron');
const Store = require('electron-store');

const store = new Store({
    schema: {
        shortcut: {
            type: 'string',
            default: 'q',
        },
        shortcut_prefix: {
            type: 'string',
            default: os.platform() === 'darwin' ? 'option' : 'alt',
        },
        model: {
            type: 'string',
            default: 'gpt-3.5-turbo-0301',
        },
        keep_in_background: {
            type: 'boolean',
            default: true,
        },

        auto_start: {
            type: 'boolean',
            default: false,
        },
        api_domain: {
            type: 'string',
            default: '',
        },
    },
});

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
    const text = arg[0];
    const targetLang = arg[1];
    const payload = generatePayload(
        `I want you to act as an ${targetLang} translator. I will speak to you in any language and you translate it and answer in the corrected and improved version of my sentence/phrase/word in ${targetLang}. I want you to only reply the translated sentence/phrase/word and nothing else, do not write explanations. You do not need to reply a complete sentence.`,
        `The text or word is: ${text}`
    );

    let status = '';
    let message = '';
    const apiPath = store.get('api_domain') || 'https://api.openai.com';
    console.log(apiPath);
    const response = (await fetch(
        `${apiPath}/v1/chat/completions`,
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
            try {
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
    const type = arg[0];
    if (type === 'get') {
        const items = arg[1];
        const res: any[] = [];
        items.map((item: any) => res.push(store.get(item)));
        event.reply('settings', res);
    } else if (type === 'set') {
        const key = arg[1][0];
        const value = arg[1][1];
        if (value !== undefined) {
            store.set(key, value);
        }
        if (key === 'shortcut' || key === 'shortcut_prefix') {
            // eslint-disable-next-line no-use-before-define
            registerShortcut();
        } else if (key === 'auto_start') {
            // eslint-disable-next-line no-use-before-define
            updateAutoStart();
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
    const trayIcon = nativeImage.createFromPath(icon);
    tray = new Tray(trayIcon.resize({ width: 16 }));
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
        webPreferences: {
            devTools: !app.isPackaged,
            preload: app.isPackaged
                ? path.join(__dirname, 'preload.js')
                : path.join(__dirname, '../../.erb/dll/preload.js'),
        },
    });
    mainWindow.setMenu(null);
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

    mainWindow.webContents.on('dom-ready', () => {
        mainWindow?.setSize(defaultW, defaultH);
    });

    mainWindow.on('close', (event) => {
        console.log(store.get('run_in_background'));
        if (store.get('run_in_background') === true) {
            event.preventDefault();
            mainWindow?.hide();
        }
    });

    mainWindow.webContents.on('will-navigate', (e, url) => {
        e.preventDefault();
        shell.openExternal(url);
    });

    // Remove this if your app does not use auto updates
    // eslint-disable-next-line
    new AppUpdater();
};

function updateAutoStart() {
    app.setLoginItemSettings({
        openAtLogin: store.get('auto_start'),
        path: app.getPath('exe'),
    });
}

function registerShortcut() {
    try {
        const shortcut = store.get('shortcut');
        const shortcutPrefix = store.get('shortcut_prefix');
        globalShortcut.register(`${shortcutPrefix}+${shortcut}`, () => {
            if (mainWindow === null) {
                createWindow();
            } else if (!mainWindow?.isVisible()) {
                mainWindow.show();
            } else {
                mainWindow.hide();
            }
        });
    } catch (e) {
        // Ignore
    }
}

/**
 * Add event listeners...
 */
app.whenReady()
    .then(() => {
        if (os.platform() === 'darwin') {
            store.set('shortcut_prefix', 'option');
        }
        registerShortcut();
        createWindow();
        app.on('activate', () => {
            // On macOS it's common to re-create a window in the app when the
            // dock icon is clicked and there are no other windows open.
            if (mainWindow === null) createWindow();
        });
    })
    .catch(console.log);

app.on('ready', () => {
    updateAutoStart();
});

app.on('before-quit', () => {
    mainWindow?.removeAllListeners('close');
    mainWindow = null;
});
