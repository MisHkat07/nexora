import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Badge, Button, List, Popover } from 'antd';
import { BellOutlined } from '@ant-design/icons';

export default function NotificationsBell() {
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  const load = async () => {
    const response = await axios.get('notification/list', { params: { items: 8 } });
    setItems(response.data?.result || []);
  };

  useEffect(() => {
    load().catch(() => setItems([]));
    const timer = setInterval(() => load().catch(() => {}), 30000);
    return () => clearInterval(timer);
  }, []);

  const unread = items.filter((item) => !item.read).length;

  return (
    <div style={{ position: 'fixed', top: 16, right: 280, zIndex: 20 }}>
      <Popover
        trigger="click"
        content={
          <List
            style={{ width: 280 }}
            dataSource={items}
            locale={{ emptyText: 'No notifications' }}
            renderItem={(item) => (
              <List.Item
                style={{ cursor: item.link ? 'pointer' : 'default' }}
                onClick={async () => {
                  await axios.post('notification/read-all').catch(() => {});
                  if (item.link) navigate(item.link);
                }}
              >
                <List.Item.Meta title={item.title} description={item.body} />
              </List.Item>
            )}
          />
        }
      >
        <Badge count={unread}>
          <Button aria-label="Notifications" icon={<BellOutlined />} />
        </Badge>
      </Popover>
    </div>
  );
}
