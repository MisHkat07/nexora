import { Routes, Route, Navigate } from 'react-router-dom';

import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';

import ForgetPassword from '@/pages/ForgetPassword';
import ResetPassword from '@/pages/ResetPassword';
import Register from '@/pages/Register';
import VerifyEmail from '@/pages/VerifyEmail';
import AcceptInvite from '@/pages/AcceptInvite';


export default function AuthRouter() {

  return (
    <Routes>
      <Route element={<Login />} path="/" />
      <Route element={<Login />} path="/login" />
      <Route element={<Navigate to="/login" replace />} path="/logout" />
      <Route element={<ForgetPassword />} path="/forgetpassword" />
      <Route element={<ResetPassword />} path="/resetpassword/:userId/:resetToken" />
      <Route element={<Register />} path="/register" />
      <Route element={<VerifyEmail />} path="/verify-email/:userId/:token" />
      <Route element={<AcceptInvite />} path="/accept-invite/:userId/:token" />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
