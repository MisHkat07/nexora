import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Input, List, Modal } from 'antd';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open || query.trim().length < 1) {
      setHits([]);
      return undefined;
    }
    const handle = setTimeout(() => {
      axios
        .get('search', { params: { q: query.trim() } })
        .then((response) => setHits(response.data.result || []))
        .catch(() => setHits([]));
    }, 200);
    return () => clearTimeout(handle);
  }, [open, query]);

  return (
    <Modal title="Search" open={open} footer={null} onCancel={() => setOpen(false)}>
      <Input
        autoFocus
        placeholder="Customers, invoices, products"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <List
        dataSource={hits}
        renderItem={(item) => (
          <List.Item
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setOpen(false);
              navigate(item.href);
            }}
          >
            {item.type}: {item.label}
          </List.Item>
        )}
      />
    </Modal>
  );
}
