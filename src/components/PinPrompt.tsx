import React, { useState } from 'react';

interface PinPromptProps {
  correctPin: string;
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

export const PinPrompt: React.FC<PinPromptProps> = ({
  correctPin,
  onSuccess,
  onCancel,
  title = 'Se requiere PIN de Administrador',
  message = 'Esta operación está protegida. Ingrese el PIN de 4 dígitos para continuar.'
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleKeyPress = (num: string) => {
    setError('');
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      
      // Auto-submit if reaches 4 digits
      if (newPin.length === 4) {
        if (newPin === correctPin) {
          onSuccess();
        } else {
          setError('PIN incorrecto. Intente de nuevo.');
          setPin('');
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="modal-content" style={{
        maxWidth: '320px',
        padding: '24px',
        textAlign: 'center',
        borderRadius: '24px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.1)',
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--glass-border)'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔒</div>
        <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: '700', marginBottom: '8px' }}>{title}</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>{message}</p>

        {error && (
          <div style={{
            fontSize: '12px',
            color: 'var(--color-danger)',
            marginBottom: '14px',
            fontWeight: '600'
          }}>
            {error}
          </div>
        )}

        {/* Dots represent entered digits */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                border: '2px solid var(--color-accent)',
                backgroundColor: pin.length > index ? 'var(--color-accent)' : 'transparent',
                transition: 'all 0.1s ease'
              }}
            />
          ))}
        </div>

        {/* Numerical Keypad grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginBottom: '20px'
        }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              style={{
                height: '50px',
                fontSize: '18px',
                fontWeight: '700',
                borderRadius: '50%',
                border: '1px solid var(--glass-border)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition)'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.9)';
                e.currentTarget.style.background = 'rgba(0,128,96,0.1)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = 'var(--bg-tertiary)';
              }}
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={onCancel}
            style={{
              height: '50px',
              fontSize: '11px',
              fontWeight: '700',
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              color: 'var(--color-danger)',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            style={{
              height: '50px',
              fontSize: '18px',
              fontWeight: '700',
              borderRadius: '50%',
              border: '1px solid var(--glass-border)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            style={{
              height: '50px',
              fontSize: '18px',
              fontWeight: '700',
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinPrompt;
