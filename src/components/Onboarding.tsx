import React, { useState } from 'react';
import { store } from '../db/store';

export const Onboarding: React.FC = () => {
  const [name, setName] = useState('');
  const [rnc, setRnc] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const validateRnc = (rncStr: string) => {
    // Dominican RNC validation (normally 9 digits for business, or 11 for personal ID/cédula)
    const clean = rncStr.replace(/[^0-9]/g, '');
    return clean.length === 9 || clean.length === 11;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !rnc.trim() || !phone.trim() || !address.trim() || !adminPin) {
      setError('Por favor, complete todos los campos.');
      return;
    }

    if (!validateRnc(rnc)) {
      setError('El RNC dominicano debe tener 9 o 11 dígitos numéricos.');
      return;
    }

    if (adminPin.length !== 4 || isNaN(Number(adminPin))) {
      setError('El PIN de Administrador debe ser de 4 dígitos numéricos.');
      return;
    }

    if (adminPin !== confirmPin) {
      setError('Los PIN ingresados no coinciden.');
      return;
    }

    // Save Colmado Settings
    store.saveColmadoSettings({
      isRegistered: true,
      name,
      rnc,
      phone,
      address,
      adminPin
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundColor: '#F4F6F8'
    }}>
      <div className="glass-card" style={{
        maxWidth: '480px',
        width: '100%',
        padding: '40px 32px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid var(--glass-border)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            background: 'var(--color-accent)',
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            color: '#FFFFFF',
            fontWeight: 800,
            boxShadow: 'var(--shadow-accent)',
            marginBottom: '16px'
          }}>
            C2
          </div>
          <h1 style={{ fontSize: '28px', color: 'var(--text-primary)', fontWeight: 800 }}>¡Bienvenido a Colma2!</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>
            Registra tu colmado en segundos para comenzar a facturar de forma inteligente.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--color-danger)',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '20px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            fontWeight: '600'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label style={{ fontWeight: '700', fontSize: '13px' }}>Nombre del Colmado:</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="Ej: Colmado El Primo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label style={{ fontWeight: '700', fontSize: '13px' }}>RNC Dominicano:</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="Ej: 1-31-12345-6 o Cédula"
              value={rnc}
              onChange={(e) => setRnc(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label style={{ fontWeight: '700', fontSize: '13px' }}>Celular / Teléfono:</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="Ej: 809-555-0101"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label style={{ fontWeight: '700', fontSize: '13px' }}>Dirección Completa:</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="Ej: Av. Winston Churchill #105, Ens. Paraíso"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label style={{ fontWeight: '700', fontSize: '13px' }}>PIN Admin (4 dígitos):</label>
              <input
                type="password"
                required
                maxLength={4}
                className="form-control"
                placeholder="****"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: '700', fontSize: '13px' }}>Confirmar PIN:</label>
              <input
                type="password"
                required
                maxLength={4}
                className="form-control"
                placeholder="****"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', height: '48px', fontSize: '16px', marginTop: '12px' }}
          >
            Registrar y Abrir Colmado 🚀
          </button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
