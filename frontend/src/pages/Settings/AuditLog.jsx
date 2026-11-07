import { useEffect, useState } from 'react';
import { Select, Table } from 'antd';

import { request } from '@/request';

const describe = (row) => {
  if (!row.diff?.length) return row.action;
  return row.diff
    .map((change) => `${change.field}: ${JSON.stringify(change.from)} → ${JSON.stringify(change.to)}`)
    .join('; ');
};

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [entity, setEntity] = useState();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const query = entity ? `audit?entity=${entity}` : 'audit';
    request.get({ entity: query }).then((data) => {
      if (cancelled) return;
      setLoading(false);
      if (data?.success) setRows(data.result || []);
    });
    return () => {
      cancelled = true;
    };
  }, [entity]);

  return (
    <div>
      <Select
        allowClear
        placeholder="All records"
        style={{ width: 200, marginBottom: 16 }}
        value={entity}
        onChange={setEntity}
        options={[
          { value: 'invoice', label: 'Invoices' },
          { value: 'quote', label: 'Quotes' },
          { value: 'client', label: 'Customers' },
          { value: 'auth', label: 'Sign-in' },
          { value: 'admin', label: 'Team' },
        ]}
      />
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        pagination={false}
        columns={[
          {
            title: 'When',
            dataIndex: 'created',
            width: 190,
            render: (value) => (value ? new Date(value).toLocaleString() : ''),
          },
          { title: 'Who', width: 180, render: (_, row) => row.user?.name || row.user?.email || '—' },
          { title: 'Record', width: 140, render: (_, row) => `${row.entity}` },
          { title: 'Change', render: (_, row) => describe(row) },
        ]}
      />
    </div>
  );
}
