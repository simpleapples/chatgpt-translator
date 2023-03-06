import '@arco-design/web-react/dist/css/arco.css';
import { useState } from 'react';
import {
    Grid,
    Input,
    Select,
    Drawer,
    Form,
    Switch,
} from '@arco-design/web-react';
import { useTranslation } from 'react-i18next';

const { Row } = Grid;
const FormItem = Form.Item;

/* eslint-disable import/prefer-default-export */
export function Settings(props) {
    const [model, setModel] = useState();
    // const [autoStart, setAutoStart] = useState(false);
    const [apiKey, setAPIKey] = useState<string>();
    const [shortcut, setShortcut] = useState<string>();
    const [runInBackground, setRunInBackground] = useState(false);
    const { t } = useTranslation();

    return (
        <div>
            <Drawer
                width={500}
                title={<span>{t('settings.title')}</span>}
                footer
                visible={props.showSettings}
                onCancel={props.onCancel}
                afterOpen={() => {
                    window.electron.ipcRenderer.once('settings', (arg) => {
                        // setAutoStart(arg[0]);
                        // setRunInBackground(arg[1]);
                        // setModel(arg[2]);
                        // setAPIKey(arg[3]);
                        // setShortcut(arg[4]);
                        setModel(arg[0] || 'gpt-3.5-turbo-0301');
                        setAPIKey(arg[1]);
                        setShortcut(arg[2] || 'alt+q');
                    });
                    window.electron.ipcRenderer.sendMessage('settings', [
                        'get',
                        [
                            // 'auto_start',
                            // 'run_in_background',
                            'model',
                            'api_key',
                            'shortcut',
                        ],
                    ]);
                }}
                afterClose={() => {
                    // window.electron.ipcRenderer.sendMessage('settings', [
                    //     'set',
                    //     ['auto_start', autoStart],
                    // ]);
                    // window.electron.ipcRenderer.sendMessage('settings', [
                    //     'set',
                    //     ['run_in_background', runInBackground],
                    // ]);
                    window.electron.ipcRenderer.sendMessage('settings', [
                        'set',
                        ['model', model],
                    ]);
                    window.electron.ipcRenderer.sendMessage('settings', [
                        'set',
                        ['api_key', apiKey],
                    ]);
                    window.electron.ipcRenderer.sendMessage('settings', [
                        'set',
                        ['shortcut', shortcut],
                    ]);
                }}
            >
                <Row>
                    <Form
                        layout="vertical"
                        style={{ width: 450 }}
                        autoComplete="off"
                    >
                        {/* <FormItem
                            label={t('settings.auto_start')}
                            field="autostart"
                            triggerPropName="checked"
                            rules={[{ type: 'boolean' }]}
                        >
                            <Switch
                                checked={autoStart}
                                onChange={(value) => {
                                    setAutoStart(value);
                                }}
                            />
                        </FormItem> */}
                        {/* <FormItem
                            label={t('settings.run_in_background')}
                            field="runInBackground"
                            triggerPropName="checked"
                            rules={[{ type: 'boolean' }]}
                        >
                            <Switch
                                checked={runInBackground}
                                onChange={(value) => {
                                    setRunInBackground(value);
                                }}
                            />
                        </FormItem> */}
                        <FormItem
                            label={t('settings.shortcut')}
                            extra={t('settings.need_restart_app')}
                        >
                            <Input
                                value={shortcut}
                                onChange={(value) => {
                                    setShortcut(value);
                                }}
                            />
                        </FormItem>
                        <FormItem
                            label={t('settings.api_key')}
                            extra={
                                <div>
                                    <a href="https://platform.openai.com/account/api-keys">
                                        {t('settings.click_here')}
                                    </a>
                                    {t('settings.generate_api_key')}
                                </div>
                            }
                        >
                            <Input.Password
                                placeholder={t<string>(
                                    'settings.api_key_placeholder'
                                )}
                                defaultVisibility={false}
                                value={apiKey}
                                onChange={(value) => {
                                    setAPIKey(value);
                                }}
                            />
                        </FormItem>
                        <FormItem label={t('settings.model')}>
                            <Select
                                value={model}
                                options={[
                                    {
                                        label: 'gpt-3.5-turbo-0301',
                                        value: 'gpt-3.5-turbo-0301',
                                    },
                                    {
                                        label: 'gpt-3.5-turbo',
                                        value: 'gpt-3.5-turbo',
                                    },
                                ]}
                                allowClear
                                onChange={(value) => {
                                    setModel(value);
                                }}
                            />
                        </FormItem>
                    </Form>
                </Row>
            </Drawer>
        </div>
    );
}
