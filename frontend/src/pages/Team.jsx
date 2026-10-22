import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Button, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { PageHeader } from '@ant-design/pro-layout';
import { UserAddOutlined } from '@ant-design/icons';

import { request } from '@/request';
import usePermission from '@/hooks/usePermission';
import { selectCurrentAdmin } from '@/redux/auth/selectors';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin — everything, including settings and team' },
  { value: 'accountant', label: 'Accountant — invoices, payments, taxes' },
  { value: 'sales', label: 'Sales — customers and quotes' },
  { value: 'viewer', label: 'Viewer — read only' },
];
const ROLE_NAMES = ['admin', 'accountant', 'sales', 'viewer'];
const STATUS_COLORS = { active: 'green', invited: 'blue', disabled: 'default' };

// Team members of the organization: everyone can see it, owners and admins manage it
export default function Team() {
  const { can } = usePermission();
  const me = useSelector(selectCurrentAdmin);
  const canManage = can('team', 'manage');

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [shareLink, setShareLink] = useState(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    const data = await request.get({ entity: 'team' });
    if (data?.success) setMembers(data.result);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const afterInviteSent = (data) => {
    if (data?.result?.inviteLink) setShareLink(data.result.inviteLink);
    else if (data?.success) message.success(data.message);
  };

  const invite = async (values) => {
    setInviting(true);
    const data = await request.post({ entity: 'team/invite', jsonData: values });
    setInviting(false);
    if (data?.success) {
      setInviteOpen(false);
      form.resetFields();
      afterInviteSent(data);
      load();
    }
  };

  const update = async (member, changes) => {
    const data = await request.patch({ entity: `team/${member._id}`, jsonData: changes });
    if (data?.success) load();
  };

  const resend = async (member) =>
    afterInviteSent(await request.post({ entity: `team/${member._id}/resend-invite` }));

  const cancelInvite = (member) =>
    Modal.confirm({
      title: `Cancel the invitation for ${member.email}?`,
      okText: 'Cancel invitation',
      okButtonProps: { danger: true },
      onOk: async () => {
        const data = await request.remove({ entity: `team/${member._id}` });
        if (data?.success) load();
      },
    });

  // Rules mirrored from the server: the owner and your own account can't be changed here
  const editable = (member) => canManage && member.role !== 'owner' && member._id !== me?._id;

  const columns = [
    {
      title: 'Name',
      key: 'name',
      render: (_, member) => [member.name, member.surname].filter(Boolean).join(' '),
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Role',
      key: 'role',
      render: (_, member) =>
        editable(member) && member.status !== 'disabled' ? (
          <Select
            size="small"
            value={member.role}
            style={{ width: 130 }}
            options={ROLE_NAMES.map((role) => ({ value: role, label: role }))}
            onChange={(role) => update(member, { role })}
          />
        ) : (
          <Tag>{member.role}</Tag>
        ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, member) => <Tag color={STATUS_COLORS[member.status]}>{member.status}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      align: 'right',
      render: (_, member) => {
        if (!editable(member)) return null;
        if (member.status === 'invited') {
          return (
            <Space>
              <Button size="small" onClick={() => resend(member)}>
                Resend invite
              </Button>
              <Button size="small" danger onClick={() => cancelInvite(member)}>
                Cancel
              </Button>
            </Space>
          );
        }
        return member.status === 'active' ? (
          <Button size="small" danger onClick={() => update(member, { enabled: false })}>
            Deactivate
          </Button>
        ) : (
          <Button size="small" onClick={() => update(member, { enabled: true })}>
            Reactivate
          </Button>
        );
      },
    },
  ];

  return (
    <div className="page-module">
      <PageHeader
        title="Team"
        subTitle={`${members.filter((m) => m.status !== 'disabled').length} members`}
        ghost
        extra={
          canManage && [
            <Button
              key="invite"
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => setInviteOpen(true)}
            >
              Invite member
            </Button>,
          ]
        }
      />
      <Table
        rowKey="_id"
        columns={columns}
        dataSource={members}
        loading={loading}
        pagination={false}
      />

      <Modal
        title="Invite a team member"
        open={inviteOpen}
        onCancel={() => setInviteOpen(false)}
        onOk={() => form.submit()}
        okText="Send invitation"
        confirmLoading={inviting}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          name="invite"
          onFinish={invite}
          initialValues={{ role: 'viewer' }}
        >
          <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Name (optional)">
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Share this invitation link"
        open={Boolean(shareLink)}
        onCancel={() => setShareLink(null)}
        footer={null}
      >
        <Typography.Paragraph>
          The invitation email couldn&apos;t be sent. Send this link to the person yourself; it works for
          7 days.
        </Typography.Paragraph>
        <Typography.Paragraph copyable code>
          {shareLink}
        </Typography.Paragraph>
      </Modal>
    </div>
  );
}
