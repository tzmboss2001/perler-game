import { useState } from 'react';
import { useUserStore } from '@/store/userStore';
import './LoginModal.css';

interface LoginModalProps {
  onClose: () => void;
  onSuccess?: (isNewUser: boolean) => void;
}

export default function LoginModal({ onClose, onSuccess }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { smartLogin, loading } = useUserStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('请填写邮箱和密码');
      return;
    }

    try {
      const isNewUser = await smartLogin(email, password);
      onSuccess?.(isNewUser);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登录失败');
    }
  };

  return (
    <div className="login-overlay" onClick={onClose}>
      <div className="login-modal" onClick={(e) => e.stopPropagation()}>
        <button className="login-close" onClick={onClose}>
          &times;
        </button>

        <h2 className="login-title">登录 / 注册</h2>
        <p className="login-hint">邮箱未注册将自动创建账号</p>

        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="email"
            placeholder="邮箱地址"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
            autoFocus
          />
          <input
            type="password"
            placeholder="密码（至少6位）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
          />

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? '登录中...' : '智能登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
