import '@arco-design/web-react/dist/css/arco.css';
import { IconSwap, IconSettings } from '@arco-design/web-react/icon';
import { useState } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import {
    Grid,
    PageHeader,
    Button,
    Input,
    Select,
    Typography,
    Drawer,
    Form,
    Switch,
} from '@arco-design/web-react';

const LanguageDetect = require('languagedetect');

const { Row, Col } = Grid;
const { Option } = Select;
const { TextArea } = Input;
const FormItem = Form.Item;

const sourceLanguageList = ['English', 'Chinese'];
const targetLanguageList = ['English', 'Chinese'];

function Main() {
    let executionTimeout = window.setTimeout(() => {}, 100);
    const [textHeight, setTextHeight] = useState(window.innerHeight);
    const [translatedContent, setTranslatedContent] = useState();
    const [showSettings, setShowSettings] = useState(false);
    const [sourceLanguage, setSourceLanguage] = useState();
    const [targetLanguage, setTargetLanguage] = useState();

    const [settingModel, setSettingModel] = useState();
    const [settingAutoStart, setSettingAutoStart] = useState(false);
    const [settingKey, setSettingKey] = useState();
    const [settingShortcut, setSettingShortcut] = useState();

    window.onresize = () => {
        setTextHeight(window.innerHeight - 150);
    };
    return (
        <div
            className="main-wrapper"
            style={{ paddingLeft: 12, paddingRight: 12 }}
        >
            <PageHeader
                // title="GPT Translator"
                style={{ paddingLeft: 0, paddingRight: 0, marginRight: 0 }}
                extra={
                    <Button
                        shape="circle"
                        type="outline"
                        icon={<IconSettings />}
                        onClick={() => setShowSettings(true)}
                    />
                }
            />
            <Drawer
                width={500}
                title={<span>Settings</span>}
                visible={showSettings}
                footer
                onOk={() => {
                    setShowSettings(false);
                }}
                onCancel={() => {
                    setShowSettings(false);
                }}
                afterOpen={() => {
                    window.electron.ipcRenderer.once('settings', (arg) => {
                        setSettingAutoStart(arg[0]);
                        setSettingModel(arg[1]);
                        setSettingKey(arg[2]);
                        setSettingShortcut(arg[3]);
                    });
                    window.electron.ipcRenderer.sendMessage('settings', [
                        'get',
                        ['auto_start', 'model', 'api_key', 'shortcut'],
                    ]);
                }}
                afterClose={() => {
                    window.electron.ipcRenderer.sendMessage('settings', [
                        'set',
                        ['auto_start', settingAutoStart],
                    ]);
                    window.electron.ipcRenderer.sendMessage('settings', [
                        'set',
                        ['model', settingModel],
                    ]);
                    window.electron.ipcRenderer.sendMessage('settings', [
                        'set',
                        ['api_key', settingKey],
                    ]);
                    window.electron.ipcRenderer.sendMessage('settings', [
                        'set',
                        ['shortcut', settingShortcut],
                    ]);
                }}
            >
                <Row>
                    <Form style={{ width: 450 }} autoComplete="off">
                        <FormItem
                            label="Autostart"
                            field="autostart"
                            triggerPropName="checked"
                            rules={[{ type: 'boolean' }]}
                        >
                            <Switch
                                checked={settingAutoStart}
                                onChange={(value) => {
                                    setSettingAutoStart(value);
                                }}
                            />
                        </FormItem>
                        <FormItem label="Shortcut">
                            <Input
                                placeholder="please enter your API_KEY"
                                value={settingShortcut}
                                onChange={(value) => {
                                    setSettingShortcut(value);
                                }}
                            />
                        </FormItem>
                        <FormItem label="API KEY">
                            <Input
                                placeholder="please enter your API_KEY"
                                value={settingKey}
                                onChange={(value) => {
                                    setSettingKey(value);
                                }}
                            />
                        </FormItem>
                        <FormItem label="Model">
                            <Select
                                value={settingModel}
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
                                    setSettingModel(value);
                                }}
                            />
                        </FormItem>
                    </Form>
                </Row>
            </Drawer>
            <Typography.Paragraph
                style={{
                    fontSize: 14,
                    fontWeight: 600,
                    marginTop: 0,
                    marginBottom: 20,
                    marginLeft: 20,
                    marginRight: 20,
                }}
            >
                <Row
                    className="main-container"
                    style={{ marginBottom: 16 }}
                    gutter={[12, 12]}
                >
                    <Col span={12}>
                        <Typography.Paragraph
                            style={{
                                width: 300,
                            }}
                        >
                            Translate from:
                            <Select
                                popupVisible={false}
                                placeholder="Auto detect"
                                style={{ width: 160 }}
                                bordered={false}
                                value={sourceLanguage}
                                onChange={(option) => {
                                    setSourceLanguage(option);
                                }}
                            >
                                {sourceLanguageList.map((option) => (
                                    <Option key={option} value={option}>
                                        {option}
                                    </Option>
                                ))}
                            </Select>
                        </Typography.Paragraph>
                    </Col>
                    {/* <Col span={1}>
                        <Button
                            shape="circle"
                            type="outline"
                            icon={<IconSwap />}
                        />
                    </Col> */}
                    <Col span={12}>
                        <Typography.Paragraph
                            style={{
                                width: 300,
                            }}
                        >
                            Translate into:
                            <Select
                                popupVisible={false}
                                placeholder="Auto detect"
                                style={{ width: 160 }}
                                bordered={false}
                                value={targetLanguage}
                                onChange={(option) => {
                                    setTargetLanguage(option);
                                }}
                            >
                                {targetLanguageList.map((option) => (
                                    <Option key={option} value={option}>
                                        {option}
                                    </Option>
                                ))}
                            </Select>
                        </Typography.Paragraph>
                    </Col>
                </Row>
                <Row
                    className="main-container"
                    style={{ marginBottom: 16 }}
                    gutter={[12, 0]}
                >
                    <Col span={12}>
                        <TextArea
                            allowClear
                            placeholder="Input or paste your text here"
                            style={{
                                minHeight: textHeight,
                                maxHeight: textHeight,
                                fontSize: 20,
                            }}
                            onChange={(value) => {
                                try {
                                    window.clearTimeout(executionTimeout);
                                } catch (e) {
                                    console.log(e);
                                }
                                try {
                                    const langDetector = new LanguageDetect();
                                    const sourceLang =
                                        langDetector.detect(value)[0][0];
                                    if (sourceLang === 'english') {
                                        setSourceLanguage(
                                            sourceLang.charAt(0).toUpperCase() +
                                                sourceLang.slice(1)
                                        );
                                        setTargetLanguage('Chinese');
                                    }
                                } catch (e) {
                                    setSourceLanguage('Chinese');
                                    setTargetLanguage('English');
                                }
                                executionTimeout = window.setTimeout(() => {
                                    if (value.length > 0) {
                                        window.electron.ipcRenderer.once(
                                            'translate',
                                            (arg) => {
                                                // eslint-disable-next-line no-console
                                                setTranslatedContent(arg);
                                            }
                                        );
                                        window.electron.ipcRenderer.sendMessage(
                                            'translate',
                                            [
                                                value,
                                                sourceLanguage,
                                                targetLanguage,
                                            ]
                                        );
                                    }
                                }, 1000);
                            }}
                            onPressEnter={(e) => {
                                window.electron.ipcRenderer.once(
                                    'translate',
                                    (arg) => {
                                        // eslint-disable-next-line no-console
                                        setTranslatedContent(arg);
                                    }
                                );
                                window.electron.ipcRenderer.sendMessage(
                                    'translate',
                                    [
                                        e.target.value,
                                        sourceLanguage,
                                        targetLanguage,
                                    ]
                                );
                            }}
                        />
                    </Col>

                    <Col span={12}>
                        <TextArea
                            // disabled
                            style={{
                                minHeight: textHeight,
                                maxHeight: textHeight,
                                fontSize: 20,
                            }}
                            value={translatedContent}
                        />
                    </Col>
                </Row>
            </Typography.Paragraph>
        </div>
    );
}

export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Main />} />
            </Routes>
        </Router>
    );
}
