import { useEffect, useState } from 'react';
import { Table, Typography } from 'antd';

import { request } from '@/request';

const { Title } = Typography;

const describe = (row) => {
  if (!row.diff?.length) return row.action;
  return row.diff
    .map((change) => {
      const from = change.from == null || change.from === '' ? 'empty' : JSON.stringify(change.from);
      const to = change.to == null || change.to === '' ? 'empty' : JSON.stringify(change.to);
      return `${change.field}: ${from} → ${to}`;
    })
    .join('; ');
};

/** History tab data: who changed this record, and the old and new values. */
export default function RecordHistory({ entity, id }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    request.get({ entity: `audit?entity=${entity}&entityId=${id}` }).then((data) => {
      if (!cancelled && data?.success) setRows(data.result || []);
    });
    return () => {
      cancelled = true;
    };
  }, [entity, id]);

  if (!id) return null;

  return (
    <div style={{ marginTop: 28 }}>
      <Title level={5}>History</Title>
      <Table
        rowKey="id"
        size="small"
        pagination={false}
        dataSource={rows}
        locale={{ emptyText: 'No history yet' }}
        columns={[
          {
            title: 'When',
            dataIndex: 'created',
            width: 190,
            render: (value) => (value ? new Date(value).toLocaleString() : ''),
          },
          {
            title: 'Who',
            width: 180,
            render: (_, row) => row.user?.name || row.user?.email || '—',
          },
          { title: 'Change', render: (_, row) => describe(row) },
        ]}
      />
    </div>
  );
}
