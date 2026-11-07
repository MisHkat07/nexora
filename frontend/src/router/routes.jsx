import { lazy } from 'react';

import { Navigate } from 'react-router-dom';

import RequirePermission from '@/components/RequirePermission';

const Logout = lazy(() => import('@/pages/Logout.jsx'));
const NotFound = lazy(() => import('@/pages/NotFound.jsx'));

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Customer = lazy(() => import('@/pages/Customer'));
const Invoice = lazy(() => import('@/pages/Invoice'));
const InvoiceCreate = lazy(() => import('@/pages/Invoice/InvoiceCreate'));

const InvoiceRead = lazy(() => import('@/pages/Invoice/InvoiceRead'));
const InvoiceUpdate = lazy(() => import('@/pages/Invoice/InvoiceUpdate'));
const InvoiceRecordPayment = lazy(() => import('@/pages/Invoice/InvoiceRecordPayment'));
const Quote = lazy(() => import('@/pages/Quote/index'));
const QuoteCreate = lazy(() => import('@/pages/Quote/QuoteCreate'));
const QuoteRead = lazy(() => import('@/pages/Quote/QuoteRead'));
const QuoteUpdate = lazy(() => import('@/pages/Quote/QuoteUpdate'));
const Payment = lazy(() => import('@/pages/Payment/index'));
const PaymentRead = lazy(() => import('@/pages/Payment/PaymentRead'));
const PaymentUpdate = lazy(() => import('@/pages/Payment/PaymentUpdate'));

const Settings = lazy(() => import('@/pages/Settings/Settings'));
const PaymentMode = lazy(() => import('@/pages/PaymentMode'));
const Taxes = lazy(() => import('@/pages/Taxes'));

const Profile = lazy(() => import('@/pages/Profile'));
const VerifyEmail = lazy(() => import('@/pages/VerifyEmail'));
const Team = lazy(() => import('@/pages/Team'));
const AcceptInvite = lazy(() => import('@/pages/AcceptInvite'));
const ResourcePage = lazy(() => import('@/pages/ResourcePage'));
const Pipeline = lazy(() => import('@/pages/Pipeline'));
const Portal = lazy(() => import('@/pages/Portal'));
const Billing = lazy(() => import('@/pages/Billing'));
const Docs = lazy(() => import('@/pages/Docs'));
const Legal = lazy(() => import('@/pages/Legal'));

let routes = {
  expense: [],
  default: [
    {
      path: '/login',
      element: <Navigate to="/" />,
    },
    {
      path: '/register',
      element: <Navigate to="/" />,
    },
    {
      // The signup email link can be opened while already logged in
      path: '/verify-email/:userId/:token',
      element: <VerifyEmail />,
    },
    {
      path: '/logout',
      element: <Logout />,
    },
    {
      path: '/',
      element: <Dashboard />,
    },
    {
      path: '/customer',
      element: <Customer />,
    },

    {
      path: '/invoice',
      element: <Invoice />,
    },
    {
      path: '/invoice/create',
      element: (
        <RequirePermission entity="invoice" action="create">
          <InvoiceCreate />
        </RequirePermission>
      ),
    },
    {
      path: '/invoice/read/:id',
      element: <InvoiceRead />,
    },
    {
      path: '/invoice/update/:id',
      element: (
        <RequirePermission entity="invoice" action="update">
          <InvoiceUpdate />
        </RequirePermission>
      ),
    },
    {
      path: '/invoice/pay/:id',
      element: (
        <RequirePermission entity="payment" action="create">
          <InvoiceRecordPayment />
        </RequirePermission>
      ),
    },
    {
      path: '/quote',
      element: <Quote />,
    },
    {
      path: '/quote/create',
      element: (
        <RequirePermission entity="quote" action="create">
          <QuoteCreate />
        </RequirePermission>
      ),
    },
    {
      path: '/quote/read/:id',
      element: <QuoteRead />,
    },
    {
      path: '/quote/update/:id',
      element: (
        <RequirePermission entity="quote" action="update">
          <QuoteUpdate />
        </RequirePermission>
      ),
    },
    {
      path: '/payment',
      element: <Payment />,
    },
    {
      path: '/payment/read/:id',
      element: <PaymentRead />,
    },
    {
      path: '/payment/update/:id',
      element: (
        <RequirePermission entity="payment" action="update">
          <PaymentUpdate />
        </RequirePermission>
      ),
    },

    {
      path: '/settings',
      element: (
        <RequirePermission entity="setting" action="update">
          <Settings />
        </RequirePermission>
      ),
    },
    {
      path: '/settings/edit/:settingsKey',
      element: (
        <RequirePermission entity="setting" action="update">
          <Settings />
        </RequirePermission>
      ),
    },
    {
      path: '/payment/mode',
      element: <PaymentMode />,
    },
    {
      path: '/taxes',
      element: <Taxes />,
    },

    {
      path: '/team',
      element: <Team />,
    },
    {
      // An invitation link opened while already logged in
      path: '/accept-invite/:userId/:token',
      element: <AcceptInvite />,
    },
    {
      path: '/profile',
      element: <Profile />,
    },
    { path: '/pipeline', element: <Pipeline /> },
    { path: '/contact', element: <ResourcePage /> },
    { path: '/lead', element: <ResourcePage /> },
    { path: '/activity', element: <ResourcePage /> },
    { path: '/tag', element: <ResourcePage /> },
    { path: '/product', element: <ResourcePage /> },
    { path: '/vendor', element: <ResourcePage /> },
    { path: '/expense', element: <ResourcePage /> },
    { path: '/purchaseorder', element: <ResourcePage /> },
    { path: '/warehouse', element: <ResourcePage /> },
    { path: '/billing', element: <Billing /> },
    { path: '/docs', element: <Docs /> },
    { path: '/privacy', element: <Legal /> },
    { path: '/terms', element: <Legal /> },
    { path: '/p/:token', element: <Portal /> },
    {
      path: '*',
      element: <NotFound />,
    },
  ],
};

export default routes;
