import '@arco-design/web-react/dist/css/arco.css';
import { IconSettings } from '@arco-design/web-react/icon';
import { useState, useRef, useEffect } from 'react';
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

const { Row, Col } = Grid;
const { Option } = Select;
const { TextArea } = Input;

const targetLanguageList = [
    'Bulgarian',
    'Chinese (Simplified)',
    'Chinese (Traditional)',
    'Czech',
    'Dutch',
    'Danish',
    'English (American)',
    'English (British)',
    'Estonian',
    'Finnish',
    'French',
    'German',
    'Greek',
    'Hungarian',
    'Indonesian',
    'Italian',
    'Japanese',
    'Korean',
    'Latvian',
    'Lithuanian',
    'Norwegian',
    'Portuguese',
    'Portuguese (Brazil)',
    'Polish',
    'Romanian',
    'Russian',
    'Slovak',
    'Slovenian',
    'Spanish',
    'Swedish',
    'Turkish',
    'Ukrainian',
    'Vietnamese',
];

function Main() {
    const [textHeight, setTextHeight] = useState(window.innerHeight - 150);
    const [translatedContent, setTranslatedContent] = useState<string>();
    const [showSettings, setShowSettings] = useState(false);
    const [targetLanguage, setTargetLanguage] = useState<string>(
        targetLanguageList[0]
    );
    const [sourceText, setSourceText] = useState('');
    const [loading, setLoading] = useState(false);
    const { t } = useTranslation();

    const timeoutRef = useRef();

    useEffect(() => {
        try {
            window.clearTimeout(timeoutRef.current);
        } catch (e) {
            // Ignore
        }

        const executionTimeout = window.setTimeout(() => {
            if (sourceText.length > 0) {
                setLoading(true);
                window.electron.ipcRenderer.once('translate', (arg) => {
                    const status = arg[0];
                    const message = arg[1];
                    setLoading(false);

                    if (status === 'success') {
                        setTranslatedContent(message);
                    } else if (status === 'need_api_key') {
                        Notification.warning({
                            id: 'main_warn',
                            title: t('notification.warning'),
                            content: t('notification.need_api_key'),
                        });
                    } else if (status === 'network_error') {
                        Notification.warning({
                            id: 'main_warn',
                            title: t('notification.warning'),
                            content: t('notification.network_error'),
                        });
                    } else if (status === 'error') {
                        Notification.warning({
                            id: 'main_warn',
                            title: t('notification.warning'),
                            content: t(message),
                        });
                    }
                });
                window.electron.ipcRenderer.sendMessage('translate', [
                    sourceText,
                    targetLanguage,
                ]);
            } else {
                setTranslatedContent('');
            }
        }, 1000);
        timeoutRef.current = executionTimeout;
    }, [sourceText, targetLanguage]);

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
                    <Col span={11} />
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
                                style={{ width: 200 }}
                                bordered={false}
                                value={targetLanguage}
                                onChange={(value) => {
                                    setTargetLanguage(value);
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
                                setSourceText(value);
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
