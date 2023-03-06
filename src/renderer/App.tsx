import '@arco-design/web-react/dist/css/arco.css';
import { IconSettings } from '@arco-design/web-react/icon';
import { useState } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import {
    Grid,
    PageHeader,
    Button,
    Input,
    Select,
    Typography,
    Spin,
    Notification,
} from '@arco-design/web-react';
import { useTranslation } from 'react-i18next';
import { Settings } from './Settings';

const LanguageDetect = require('languagedetect');

const { Row, Col } = Grid;
const { Option } = Select;
const { TextArea } = Input;

const sourceLanguageList = ['English', 'Chinese'];
const targetLanguageList = ['English', 'Chinese'];

function Main() {
    let executionTimeout = window.setTimeout(() => {}, 100);
    const [textHeight, setTextHeight] = useState(window.innerHeight - 150);
    const [translatedContent, setTranslatedContent] = useState<string>();
    const [showSettings, setShowSettings] = useState(false);
    const [sourceLanguage, setSourceLanguage] = useState<string>();
    const [targetLanguage, setTargetLanguage] = useState<string>();
    const [loading, setLoading] = useState(false);
    const { t } = useTranslation();

    let sourceLang = '';
    let targetLang = '';

    window.onresize = () => {
        setTextHeight(window.innerHeight - 150);
    };

    return (
        <div style={{ paddingLeft: 12, paddingRight: 12 }}>
            <PageHeader
                style={{
                    paddingLeft: 0,
                    paddingRight: 0,
                    marginRight: 0,
                }}
                extra={
                    <Button
                        shape="circle"
                        type="outline"
                        icon={<IconSettings />}
                        onClick={() => setShowSettings(true)}
                    />
                }
            />
            <Settings
                showSettings={showSettings}
                onCancel={() => {
                    setShowSettings(false);
                }}
            />
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
                    <Col span={11}>
                        <Typography.Paragraph
                            style={{
                                width: 300,
                            }}
                        >
                            {t('main.translate_from')}
                            <Select
                                popupVisible={false}
                                placeholder={t<string>('main.auto_detect')}
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
                    <Col span={1}>
                        <Spin
                            block
                            size={22}
                            style={{
                                display: loading ? 'block' : 'none',
                            }}
                        />
                    </Col>
                    <Col span={12}>
                        <Typography.Paragraph
                            style={{
                                width: 300,
                            }}
                        >
                            {t('main.translate_into')}
                            <Select
                                popupVisible={false}
                                placeholder={t<string>('main.auto_detect')}
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
                            placeholder={t<string>('main.input_placeholder')}
                            style={{
                                minHeight: textHeight,
                                maxHeight: textHeight,
                                fontSize: 20,
                            }}
                            onChange={(value) => {
                                try {
                                    window.clearTimeout(executionTimeout);
                                } catch (e) {
                                    // Ignore
                                }
                                try {
                                    const langDetector = new LanguageDetect();

                                    if (langDetector.detect(value)[0][0]) {
                                        sourceLang = 'English';
                                        targetLang = 'Chinese';
                                        setSourceLanguage(sourceLang);
                                        setTargetLanguage(targetLang);
                                    }
                                } catch (e) {
                                    sourceLang = 'Chinese';
                                    targetLang = 'English';
                                    setSourceLanguage(sourceLang);
                                    setTargetLanguage(targetLang);
                                }
                                executionTimeout = window.setTimeout(() => {
                                    if (value.length > 0) {
                                        setLoading(true);
                                        window.electron.ipcRenderer.once(
                                            'translate',
                                            (arg) => {
                                                const status = arg[0];
                                                const message = arg[1];
                                                setLoading(false);

                                                if (status === 'success') {
                                                    setTranslatedContent(
                                                        message
                                                    );
                                                } else if (
                                                    status === 'need_api_key'
                                                ) {
                                                    Notification.warning({
                                                        id: 'main_warn',
                                                        title: t(
                                                            'notification.warning'
                                                        ),
                                                        content: t(
                                                            'notification.need_api_key'
                                                        ),
                                                    });
                                                } else if (
                                                    status === 'network_error'
                                                ) {
                                                    Notification.warning({
                                                        id: 'main_warn',
                                                        title: t(
                                                            'notification.warning'
                                                        ),
                                                        content: t(
                                                            'notification.network_error'
                                                        ),
                                                    });
                                                } else if (status === 'error') {
                                                    Notification.warning({
                                                        id: 'main_warn',
                                                        title: t(
                                                            'notification.warning'
                                                        ),
                                                        content: t(message),
                                                    });
                                                }
                                            }
                                        );
                                        window.electron.ipcRenderer.sendMessage(
                                            'translate',
                                            [value, sourceLang, targetLang]
                                        );
                                    } else {
                                        setTranslatedContent('');
                                    }
                                }, 1000);
                            }}
                            onPressEnter={(e) => {
                                setLoading(true);
                                window.electron.ipcRenderer.once(
                                    'translate',
                                    (arg) => {
                                        setLoading(false);
                                        setTranslatedContent(arg);
                                    }
                                );
                                window.electron.ipcRenderer.sendMessage(
                                    'translate',
                                    [e.target.value, sourceLang, targetLang]
                                );
                            }}
                        />
                    </Col>

                    <Col span={12}>
                        <TextArea
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
