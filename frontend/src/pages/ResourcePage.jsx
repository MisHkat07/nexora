import { useLocation } from 'react-router-dom';

import CrudModule from '@/modules/CrudModule/CrudModule';
import DynamicForm from '@/forms/DynamicForm';

const PAGES = {
  '/contact': {
    entity: 'contact',
    title: 'Contacts',
    search: 'name',
    fields: {
      name: { type: 'string' },
      email: { type: 'email' },
      phone: { type: 'string' },
      title: { type: 'string' },
      client: { type: 'string' },
    },
  },
  '/lead': {
    entity: 'lead',
    title: 'Leads',
    search: 'name',
    fields: {
      name: { type: 'string' },
      email: { type: 'email' },
      phone: { type: 'string' },
      source: { type: 'string' },
      status: { type: 'string' },
    },
  },
  '/activity': {
    entity: 'activity',
    title: 'Activities',
    search: 'summary',
    fields: {
      summary: { type: 'string' },
      type: { type: 'string' },
      dueAt: { type: 'date' },
    },
  },
  '/tag': {
    entity: 'tag',
    title: 'Tags',
    search: 'name',
    fields: { name: { type: 'string' }, color: { type: 'string' } },
  },
  '/product': {
    entity: 'product',
    title: 'Products',
    search: 'name',
    fields: {
      name: { type: 'string' },
      sku: { type: 'string' },
      type: { type: 'string' },
      price: { type: 'number' },
      cost: { type: 'number' },
      quantity: { type: 'number' },
    },
  },
  '/vendor': {
    entity: 'vendor',
    title: 'Vendors',
    search: 'name',
    fields: { name: { type: 'string' }, email: { type: 'email' }, phone: { type: 'string' } },
  },
  '/expense': {
    entity: 'expense',
    title: 'Expenses',
    search: 'category',
    fields: {
      amount: { type: 'number' },
      category: { type: 'string' },
      notes: { type: 'string' },
      date: { type: 'date' },
    },
  },
  '/purchaseorder': {
    entity: 'purchaseorder',
    title: 'Purchase orders',
    search: 'notes',
    fields: { vendor: { type: 'string' }, status: { type: 'string' }, total: { type: 'number' }, notes: { type: 'string' } },
  },
  '/warehouse': {
    entity: 'warehouse',
    title: 'Warehouses',
    search: 'name',
    fields: { name: { type: 'string' }, address: { type: 'string' } },
  },
};

export default function ResourcePage() {
  const { pathname } = useLocation();
  const page = PAGES[pathname] || PAGES['/product'];
  const config = {
    entity: page.entity,
    PANEL_TITLE: page.title,
    DATATABLE_TITLE: page.title,
    ADD_NEW_ENTITY: `Add ${page.title}`,
    ENTITY_NAME: page.title,
    fields: page.fields,
    searchConfig: { displayLabels: [page.search], searchFields: page.search },
    deleteModalLabels: [page.search],
  };
  return (
    <CrudModule
      createForm={<DynamicForm fields={page.fields} />}
      updateForm={<DynamicForm fields={page.fields} />}
      config={config}
    />
  );
}
