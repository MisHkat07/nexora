import { Dropdown, Table } from 'antd';

import { request, downloadPdf } from '@/request';
import usePermission from '@/hooks/usePermission';
import { withoutForbidden } from '@/utils/menuPermissions';
import useFetch from '@/hooks/useFetch';

import { EllipsisOutlined, EyeOutlined, EditOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import { erp } from '@/redux/erp/actions';
import useLanguage from '@/locale/useLanguage';
import { useNavigate } from 'react-router-dom';

export default function RecentTable({ ...props }) {
  const translate = useLanguage();
  let { entity, dataTableColumns } = props;
  const { can } = usePermission();

  const items = withoutForbidden(
    [
      {
        label: translate('Show'),
        key: 'read',
        icon: <EyeOutlined />,
      },
      {
        label: translate('Edit'),
        key: 'edit',
        icon: <EditOutlined />,
      },
      {
        label: translate('Download'),
        key: 'download',
        icon: <FilePdfOutlined />,
      },
    ],
    { edit: can(entity, 'update') }
  );

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleRead = (record) => {
    dispatch(erp.currentItem({ data: record }));
    navigate(`/${entity}/read/${record._id}`);
  };
  const handleEdit = (record) => {
    dispatch(erp.currentAction({ actionType: 'update', data: record }));
    navigate(`/${entity}/update/${record._id}`);
  };
  const handleDownload = (record) => {
    downloadPdf({ entity, id: record._id });
  };

  dataTableColumns = [
    ...dataTableColumns,
    {
      title: '',
      key: 'action',
      render: (_, record) => (
        // stop clicks (including portal menu clicks) from reaching the row's onClick
        <span onClick={(e) => e.stopPropagation()}>
          <Dropdown
            menu={{
              items,
              onClick: ({ key }) => {
                switch (key) {
                  case 'read':
                    handleRead(record);
                    break;
                  case 'edit':
                    handleEdit(record);
                    break;
                  case 'download':
                    handleDownload(record);
                    break;

                  default:
                    break;
                }
              },
            }}
            trigger={['click']}
          >
            <EllipsisOutlined
              className="table-action-trigger"
              style={{ cursor: 'pointer', fontSize: '20px' }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
          </Dropdown>
        </span>
      ),
    },
  ];

  const asyncList = () => {
    return request.list({ entity });
  };
  const { result, isLoading, isSuccess } = useFetch(asyncList);
  const firstFiveItems = () => {
    if (isSuccess && result) return result.slice(0, 5);
    return [];
  };

  return (
    <Table
      columns={dataTableColumns}
      rowKey={(item) => item._id}
      dataSource={isSuccess && firstFiveItems()}
      pagination={false}
      loading={isLoading}
      size="middle"
      rowClassName="clickable-row"
      onRow={(record) => ({ onClick: () => handleRead(record) })}
      scroll={{ x: true }}
    />
  );
}
