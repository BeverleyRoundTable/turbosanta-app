import React, { useState, useEffect } from 'react';
import { X, Receipt, Fuel, Candy, Zap, Wrench, ShieldAlert, FileText, CheckCircle2, TrendingDown, DollarSign } from 'lucide-react';

export default function ExpensesModal({
  isOpen,
  onClose,
  initialExpenses = 0,
  initialExpensesJson = null,
  onSave,
  grossRaised = 0,
  giftAid = 0
}) {
  if (!isOpen) return null;

  const [form, setForm] = useState({
    fuel: 0,
    sweets: 0,
    sound: 0,
    maintenance: 0,
    safety: 0,
    licences: 0,
    other: 0,
    notes: ''
  });

  // Populate from initial props
  useEffect(() => {
    let parsed = null;
    try {
      if (initialExpensesJson) {
        parsed = typeof initialExpensesJson === 'string' ? JSON.parse(initialExpensesJson) : initialExpensesJson;
      }
    } catch (e) {
      parsed = null;
    }

    if (parsed && typeof parsed === 'object') {
      setForm({
        fuel: Number(parsed.fuel || 0),
        sweets: Number(parsed.sweets || 0),
        sound: Number(parsed.sound || 0),
        maintenance: Number(parsed.maintenance || 0),
        safety: Number(parsed.safety || 0),
        licences: Number(parsed.licences || 0),
        other: Number(parsed.other || 0),
        notes: parsed.notes || ''
      });
    } else {
      // If there's an existing lump sum but no breakdown yet, place it into other/fuel
      setForm({
        fuel: Number(initialExpenses || 0),
        sweets: 0,
        sound: 0,
        maintenance: 0,
        safety: 0,
        licences: 0,
        other: 0,
        notes: ''
      });
    }
  }, [initialExpenses, initialExpensesJson, isOpen]);

  const totalExpenses = Number((
    Number(form.fuel || 0) +
    Number(form.sweets || 0) +
    Number(form.sound || 0) +
    Number(form.maintenance || 0) +
    Number(form.safety || 0) +
    Number(form.licences || 0) +
    Number(form.other || 0)
  ).toFixed(2));

  const netImpact = Math.max(0, Number(((Number(grossRaised || 0) + Number(giftAid || 0)) - totalExpenses).toFixed(2)));
  const expenseRatio = grossRaised > 0 ? ((totalExpenses / grossRaised) * 100).toFixed(1) : '0.0';

  const handleChange = (field, val) => {
    setForm(prev => ({
      ...prev,
      [field]: field === 'notes' ? val : (val === '' ? '' : parseFloat(val) || 0)
    }));
  };

  const handleSave = () => {
    if (onSave) {
      onSave(totalExpenses, form);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#151513',
          border: '1px solid var(--border)',
          borderRadius: '18px',
          width: '100%',
          maxWidth: '660px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.9)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(251, 175, 51, 0.08) 0%, rgba(21, 21, 19, 0) 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(251, 175, 51, 0.15)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Receipt size={22} />
            </div>
            <div>
              <h2 className="brand-font" style={{ fontSize: '20px', margin: 0, color: '#fff' }}>
                Campaign Operating Expenses & Receipts
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                Itemise committee costs to calculate True Net Charitable Impact
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {/* Live Impact Preview Banner */}
          <div
            style={{
              background: '#0d0d0b',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '16px 20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px',
              alignItems: 'center'
            }}
          >
            <div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', fontWeight: 700 }}>
                Gross Raised
              </div>
              <div className="brand-font" style={{ fontSize: '20px', color: '#fff', marginTop: '3px' }}>
                £{Number(grossRaised || 0).toFixed(2)}
              </div>
            </div>

            {giftAid > 0 && (
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#86efac', fontWeight: 700 }}>
                  + HMRC Gift Aid
                </div>
                <div className="brand-font" style={{ fontSize: '20px', color: '#22c55e', marginTop: '3px' }}>
                  +£{Number(giftAid || 0).toFixed(2)}
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#f87171', fontWeight: 700 }}>
                - Total Expenses
              </div>
              <div className="brand-font" style={{ fontSize: '20px', color: totalExpenses > 0 ? '#ef4444' : 'var(--text-muted)', marginTop: '3px' }}>
                -£{totalExpenses.toFixed(2)}
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '14px' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--primary)', fontWeight: 700 }}>
                ★ True Net Impact
              </div>
              <div className="brand-font" style={{ fontSize: '24px', color: 'var(--primary)', marginTop: '3px' }}>
                £{netImpact.toFixed(2)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {expenseRatio}% operating overhead
              </div>
            </div>
          </div>

          {/* Form Breakdown Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* 1. Vehicle Fuel */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#fff', marginBottom: '6px', fontWeight: 600 }}>
                <span>⛽ Vehicle Fuel & Towing (£)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.fuel === 0 ? '' : form.fuel}
                placeholder="0.00"
                onChange={(e) => handleChange('fuel', e.target.value)}
                style={{
                  width: '100%',
                  background: '#0d0d0b',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Diesel/petrol for sleigh tow vehicle or tractor hire
              </div>
            </div>

            {/* 2. Sweets & Treats */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#fff', marginBottom: '6px', fontWeight: 600 }}>
                <span>🍬 Sweets & Children's Treats (£)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.sweets === 0 ? '' : form.sweets}
                placeholder="0.00"
                onChange={(e) => handleChange('sweets', e.target.value)}
                style={{
                  width: '100%',
                  background: '#0d0d0b',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Candy canes, chocolates, stickers for children
              </div>
            </div>

            {/* 3. Generator & Sound */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#fff', marginBottom: '6px', fontWeight: 600 }}>
                <span>⚡ Generator & Sound / PA (£)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.sound === 0 ? '' : form.sound}
                placeholder="0.00"
                onChange={(e) => handleChange('sound', e.target.value)}
                style={{
                  width: '100%',
                  background: '#0d0d0b',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Generator unleaded petrol, PA cables, batteries
              </div>
            </div>

            {/* 4. Sleigh Maintenance & Lights */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#fff', marginBottom: '6px', fontWeight: 600 }}>
                <span>🛠️ Sleigh Maintenance & Lights (£)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.maintenance === 0 ? '' : form.maintenance}
                placeholder="0.00"
                onChange={(e) => handleChange('maintenance', e.target.value)}
                style={{
                  width: '100%',
                  background: '#0d0d0b',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                LED strings, replacement bulbs, paint, timber/chassis
              </div>
            </div>

            {/* 5. Safety Kit & Hi-Vis */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#fff', marginBottom: '6px', fontWeight: 600 }}>
                <span>🦺 Safety Kit, Hi-Vis & PPE (£)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.safety === 0 ? '' : form.safety}
                placeholder="0.00"
                onChange={(e) => handleChange('safety', e.target.value)}
                style={{
                  width: '100%',
                  background: '#0d0d0b',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                High-visibility vests for bucket walkers, glowing batons
              </div>
            </div>

            {/* 6. Licences, Insurance & Sundries */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#fff', marginBottom: '6px', fontWeight: 600 }}>
                <span>📋 Permits, Licences & Ins. (£)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.licences === 0 ? '' : form.licences}
                placeholder="0.00"
                onChange={(e) => handleChange('licences', e.target.value)}
                style={{
                  width: '100%',
                  background: '#0d0d0b',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '9px 12px',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Street collection council permits, coin bags, flyers
              </div>
            </div>
          </div>

          {/* 7. Other / Misc */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#fff', marginBottom: '6px', fontWeight: 600 }}>
              <span>📦 Other Miscellaneous Expenses (£)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.other === 0 ? '' : form.other}
              placeholder="0.00"
              onChange={(e) => handleChange('other', e.target.value)}
              style={{
                width: '100%',
                background: '#0d0d0b',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '9px 12px',
                color: '#fff',
                fontSize: '14px'
              }}
            />
          </div>

          {/* 8. Committee / Auditor Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Committee Audit Notes & Receipt References (Optional)
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="e.g. Fuel receipts logged in treasurer folder; sweets donated at discount by local sponsor."
              style={{
                width: '100%',
                background: '#0d0d0b',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#fff',
                fontSize: '13px',
                resize: 'vertical'
              }}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            background: '#0d0d0b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <button
            type="button"
            onClick={() => {
              setForm({
                fuel: 0,
                sweets: 0,
                sound: 0,
                maintenance: 0,
                safety: 0,
                licences: 0,
                other: 0,
                notes: ''
              });
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '13px',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Clear All
          </button>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ padding: '9px 18px', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn-primary"
              style={{ padding: '9px 22px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <CheckCircle2 size={16} />
              <span>Save Expenses (£{totalExpenses.toFixed(2)})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
