import QRCode from 'react-qr-code';

const QRCodeDisplay = ({ token, label = 'Ваш QR-код', size = 160 }) => {
  const hasToken = Boolean(token);

  return (
    <div className="qr-code-block">
      <p className="qr-code-block__title">{label}</p>

      <div className="qr-code-frame">
        {hasToken ? (
          <QRCode value={token} size={size} bgColor="#FFFFFF" fgColor="#000000" level="M" />
        ) : (
          <span className="muted">QR-токен отсутствует</span>
        )}
      </div>

      <p className="qr-code-block__subtitle">QR-токен</p>
      <code className="qr-code-token">{token || '-'}</code>
    </div>
  );
};

export default QRCodeDisplay;
