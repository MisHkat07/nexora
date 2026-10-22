import { useProfileContext } from '@/context/profileContext';
import { EditOutlined, LockOutlined, LogoutOutlined } from '@ant-design/icons';
import { Avatar, Button, Col, Descriptions, Divider, Row, Space } from 'antd';
import { PageHeader } from '@ant-design/pro-layout';
import { useSelector } from 'react-redux';

import { useNavigate } from 'react-router-dom';

import { selectCurrentAdmin } from '@/redux/auth/selectors';

import useLanguage from '@/locale/useLanguage';
import { FILE_BASE_URL } from '@/config/serverApiConfig';

const AdminInfo = ({ config }) => {
  const translate = useLanguage();
  const navigate = useNavigate();
  const { profileContextAction } = useProfileContext();
  const { modal, updatePanel } = profileContextAction;
  const { ENTITY_NAME } = config;
  const currentAdmin = useSelector(selectCurrentAdmin);

  return (
    <div className="profile-panel">
      <PageHeader
        className="data-table-toolbar"
        onBack={() => window.history.back()}
        title={ENTITY_NAME}
        ghost={false}
        extra={[
          <Button
            key="edit"
            onClick={() => {
              updatePanel.open();
            }}
            type="primary"
            icon={<EditOutlined />}
          >
            {translate('Edit')}
          </Button>,
          <Button
            key="update-password"
            icon={<LockOutlined />}
            onClick={() => {
              modal.open();
            }}
          >
            {translate('Update Password')}
          </Button>,
        ]}
        style={{
          padding: '12px 0 20px',
        }}
      ></PageHeader>
      <Row align="middle" gutter={[24, 24]}>
        <Col xs={{ span: 24 }} sm={{ span: 7 }} md={{ span: 5 }}>
          <Avatar
            className="last left"
            src={currentAdmin?.photo ? FILE_BASE_URL + currentAdmin?.photo : undefined}
            size={96}
            style={{
              color: '#12263F',
              backgroundColor: currentAdmin?.photo ? 'transparent' : '#E8F0FF',
              boxShadow: 'rgba(0, 97, 255, 0.18) 0px 0px 12px 2px',
              fontSize: '48px',
            }}
            alt={`${currentAdmin?.name}`}
          >
            {currentAdmin?.name.charAt(0).toUpperCase()}
          </Avatar>
        </Col>
        <Col xs={{ span: 24 }} sm={{ span: 18 }}>
          <Descriptions column={1} size="middle">
            <Descriptions.Item label={translate('first name')}>
              {currentAdmin?.name}
            </Descriptions.Item>
            <Descriptions.Item label={translate('last name')}>
              {currentAdmin?.surname}
            </Descriptions.Item>
            <Descriptions.Item label={translate('email')}>{currentAdmin?.email}</Descriptions.Item>
            <Descriptions.Item label={translate('role')}>{currentAdmin?.role}</Descriptions.Item>
          </Descriptions>
        </Col>
      </Row>
      <Divider />
      <Space>
        <Button
          key="logout"
          icon={<LogoutOutlined />}
          onClick={() => navigate('/logout')}
        >
          {translate('Logout')}
        </Button>
      </Space>
    </div>
  );
};
export default AdminInfo;
