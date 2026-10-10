import React, { useState, useEffect } from 'react';
import {
  X, Receipt, Plus, Trash2, Download, CheckCircle2,
  Calendar, Clock, Tag, FileText, ChevronRight, BarChart3,
  AlertCircle, Sparkles, Fuel, Candy, Zap, Wrench, ShieldAlert
} from 'lucide-react';

const CATEGORIES = [
  { id: 'fuel', label: '⛽ Vehicle Fuel & Towing', short: 'Fuel', color: '#f59e0b', icon: '⛽' },
  { id: 'sweets', label: '🍬 Sweets & Children\'s Treats', short: 'Sweets', color: '#ec4899', icon: '🍬' },
  { id: 'sound', label: '⚡ Generator & Sound / PA', short: 'Sound', color: '#eab308', icon: '⚡' },
  { id: 'maintenance', label: '🛠️ Sleigh Maintenance & Lights', short: 'Maintenance', color: '#3b82f6', icon: '🛠️' },
  { id: 'safety', label: '🦺 Safety Kit, Hi-Vis & PPE', short: 'Safety', color: '#10b981', icon: '🦺' },
  { id: 'licences', label: '📋 Permits, Licences & Ins.', short: 'Permits', color: '#8b5cf6', icon: '📋' },
  { id: 'other', label: '📦 Other / Miscellaneous', short: 'Other', color: '#6b7280', icon: '📦' }
];

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

  const [activeView, setActiveView] = useState('log'); // 'log' | 'breakdown'
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');

  // Quick Add Receipt State
  const [newCategory, setNewCategory] = useState('fuel');
  const [newAmount, setNewAmount] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newLoggedBy, setNewLoggedBy] = useState('');
  const [formError, setFormError] = useState('');

  // Initial Data Loading & Backward Compatibility
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
      setNotes(parsed.notes || '');

      // Check if itemised array exists
      if (Array.isArray(parsed.items) && parsed.items.length > 0) {
        setItems(parsed.items);
      } else {
        // Synthesise items from legacy category totals if items array is absent
        const legacyItems = [];
        const nowStr = new Date().toISOString();
        const dateStr = nowStr.slice(0, 10);

        CATEGORIES.forEach(cat => {
          const val = Number(parsed[cat.id] || 0);
          if (val > 0) {
            legacyItems.push({
              id: `rec_legacy_${cat.id}_${Date.now()}`,
              timestamp: nowStr,
              date: dateStr,
              category: cat.id,
              amount: val,
              description: `Initial ${cat.short} Season Allocation`,
              loggedBy: 'Committee'
            });
          }
        });

        // If only lump sum initialExpenses existed without category keys
        if (legacyItems.length === 0 && Number(initialExpenses || 0) > 0) {
          legacyItems.push({
            id: `rec_legacy_initial_${Date.now()}`,
            timestamp: nowStr,
            date: dateStr,
            category: 'fuel',
            amount: Number(initialExpenses),
            description: 'Carried Forward Season Operating Costs',
            loggedBy: 'Committee'
          });
        }

        setItems(legacyItems);
      }
    } else if (Number(initialExpenses || 0) > 0) {
      // Lump sum without JSON breakdown
      setItems([{
        id: `rec_legacy_${Date.now()}`,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().slice(0, 10),
        category: 'fuel',
        amount: Number(initialExpenses),
        description: 'Carried Forward Operating Costs',
        loggedBy: 'Committee'
      }]);
    } else {
      setItems([]);
      setNotes('');
    }
  }, [initialExpenses, initialExpensesJson, isOpen]);

  // Aggregate Category Totals & Grand Total from items
  const categoryTotals = CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = 0;
    return acc;
  }, {});

  items.forEach(item => {
    const cat = item.category || 'other';
    const amt = parseFloat(item.amount) || 0;
    if (categoryTotals[cat] !== undefined) {
      categoryTotals[cat] += amt;
    } else {
      categoryTotals.other = (categoryTotals.other || 0) + amt;
    }
  });

  const totalExpenses = Number(items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toFixed(2));
  const netImpact = Math.max(0, Number(((Number(grossRaised || 0) + Number(giftAid || 0)) - totalExpenses).toFixed(2)));
  const expenseRatio = grossRaised > 0 ? ((totalExpenses / grossRaised) * 100).toFixed(1) : '0.0';
  const averageReceipt = items.length > 0 ? (totalExpenses / items.length).toFixed(2) : '0.00';

  // Add a New Itemised Receipt
  const handleAddReceipt = (e) => {
    e.preventDefault();
    setFormError('');

    const parsedAmount = parseFloat(newAmount);
    if (!parsedAmount || parsedAmount <= 0 || isNaN(parsedAmount)) {
      setFormError('Please enter a valid amount (e.g. 25.50)');
      return;
    }

    const now = new Date();
    const timePart = now.toTimeString().slice(0, 5); // HH:MM
    const newItem = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: `${newDate}T${timePart}:00.000Z`,
      date: newDate || now.toISOString().slice(0, 10),
      time: timePart,
      category: newCategory,
      amount: Number(parsedAmount.toFixed(2)),
      description: newDesc.trim() || `${CATEGORIES.find(c => c.id === newCategory)?.short || 'Expense'} receipt`,
      loggedBy: newLoggedBy.trim() || 'Admin'
    };

    setItems(prev => [newItem, ...prev]);
    setNewAmount('');
    setNewDesc('');
    setNewLoggedBy('');
  };

  // Remove Receipt Item
  const handleDeleteItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Export Receipts to CSV
  const handleExportCsv = () => {
    if (items.length === 0) return;

    const headers = ['Receipt ID', 'Date', 'Time', 'Category', 'Amount (GBP)', 'Description', 'Logged By'];
    const rows = items.map(item => {
      const catObj = CATEGORIES.find(c => c.id === item.category);
      const timeStr = item.time || (item.timestamp ? item.timestamp.slice(11, 16) : '');
      return [
        `"${item.id}"`,
        `"${item.date}"`,
        `"${timeStr}"`,
        `"${catObj?.short || item.category}"`,
        item.amount.toFixed(2),
        `"${(item.description || '').replace(/"/g, '""')}"`,
        `"${(item.loggedBy || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sleigh_Operating_Receipts_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save State back to D1 Database
  const handleSaveAll = () => {
    const payload = {
      items,
      fuel: Number((categoryTotals.fuel || 0).toFixed(2)),
      sweets: Number((categoryTotals.sweets || 0).toFixed(2)),
      sound: Number((categoryTotals.sound || 0).toFixed(2)),
      maintenance: Number((categoryTotals.maintenance || 0).toFixed(2)),
      safety: Number((categoryTotals.safety || 0).toFixed(2)),
      licences: Number((categoryTotals.licences || 0).toFixed(2)),
      other: Number((categoryTotals.other || 0).toFixed(2)),
      total: totalExpenses,
      notes: notes.trim(),
      updated_at: new Date().toISOString()
    };

    if (onSave) {
      onSave(totalExpenses, payload);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
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
          maxWidth: '740px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.95)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
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
              <h2 className="brand-font" style={{ fontSize: '19px', margin: 0, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Itemised Receipts & Operating Costs Ledger
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                Timestamped receipt tracking to calculate True Net Community Impact
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

        {/* Live Impact & Averages Banner */}
        <div
          style={{
            background: '#0d0d0b',
            borderBottom: '1px solid var(--border)',
            padding: '14px 24px',
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
            <div className="brand-font" style={{ fontSize: '18px', color: '#fff', marginTop: '2px' }}>
              £{Number(grossRaised || 0).toFixed(2)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#f87171', fontWeight: 700 }}>
              - Operating Costs
            </div>
            <div className="brand-font" style={{ fontSize: '18px', color: totalExpenses > 0 ? '#ef4444' : 'var(--text-muted)', marginTop: '2px' }}>
              -£{totalExpenses.toFixed(2)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--primary)', fontWeight: 700 }}>
              ★ True Net Impact
            </div>
            <div className="brand-font" style={{ fontSize: '20px', color: 'var(--primary)', marginTop: '2px' }}>
              £{netImpact.toFixed(2)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {expenseRatio}% overhead
            </div>
          </div>

          <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '14px' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#38bdf8', fontWeight: 700 }}>
              Average Cost Tally
            </div>
            <div className="brand-font" style={{ fontSize: '18px', color: '#38bdf8', marginTop: '2px' }}>
              £{averageReceipt} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>/ receipt</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {items.length} {items.length === 1 ? 'receipt' : 'receipts'} logged
            </div>
          </div>
        </div>

        {/* Tab Toggle Navigation */}
        <div style={{ padding: '12px 24px 0', display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={() => setActiveView('log')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeView === 'log' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeView === 'log' ? 'var(--primary)' : 'var(--text-muted)',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Receipt size={15} />
            <span>Itemised Receipt Log ({items.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('breakdown')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeView === 'breakdown' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeView === 'breakdown' ? 'var(--primary)' : 'var(--text-muted)',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <BarChart3 size={15} />
            <span>Category Totals & Audit Notes</span>
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}
        >
          {activeView === 'log' && (
            <>
              {/* Quick Add Receipt Card */}
              <form
                onSubmit={handleAddReceipt}
                style={{
                  background: '#0d0d0b',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
                    <Plus size={16} color="var(--primary)" />
                    <span>Log New Sleigh Receipt</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Standard categories ensure fleet comparisons
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  {/* Category Selector */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                      Category Selector
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#161614',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        color: '#fff',
                        fontSize: '13px',
                        boxSizing: 'border-box'
                      }}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount (£) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                      Amount (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="e.g. 35.50"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#161614',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 700,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                      Receipt Date
                    </label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#161614',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        color: '#fff',
                        fontSize: '13px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Free Type Details / Vendor */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                      Description / Store / Free-Type Note
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BP Garage diesel fill-up night 2, Costco candy canes, replacement horn wire"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#161614',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        color: '#fff',
                        fontSize: '13px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                      Logged By / Ref (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tow Driver, Receipt #12"
                      value={newLoggedBy}
                      onChange={(e) => setNewLoggedBy(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#161614',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        padding: '8px 10px',
                        color: '#fff',
                        fontSize: '13px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {formError && (
                  <div style={{ fontSize: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={14} />
                    <span>{formError}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{
                      padding: '8px 18px',
                      fontSize: '13px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Plus size={15} />
                    <span>Add to Receipt Log</span>
                  </button>
                </div>
              </form>

              {/* Receipt Table Header & Export */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Logged Receipts ({items.length})
                </span>
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--text-muted)',
                      padding: '5px 10px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Download size={13} />
                    <span>Export CSV</span>
                  </button>
                )}
              </div>

              {/* Receipt List */}
              {items.length === 0 ? (
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed var(--border)',
                    borderRadius: '10px',
                    padding: '36px 20px',
                    textAlign: 'center',
                    color: 'var(--text-muted)'
                  }}
                >
                  <Receipt size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <div style={{ fontSize: '14px', color: '#fff', fontWeight: 600 }}>No receipts logged yet for this campaign</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    Select a category above (Fuel, Sweets, etc.), enter the amount, and click <strong>Add to Receipt Log</strong>.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {items.map((item) => {
                    const catObj = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[6];
                    return (
                      <div
                        key={item.id}
                        style={{
                          background: '#0d0d0b',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: `${catObj.color}22`,
                              color: catObj.color,
                              border: `1px solid ${catObj.color}44`,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {catObj.icon} {catObj.short}
                          </span>

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '13px', color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.description}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '1px' }}>
                              <span>📅 {item.date}</span>
                              {item.time && <span>⏰ {item.time}</span>}
                              {item.loggedBy && <span>👤 {item.loggedBy}</span>}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className="brand-font" style={{ fontSize: '16px', color: '#f87171', fontWeight: 700 }}>
                            -£{item.amount.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              display: 'flex'
                            }}
                            title="Delete receipt"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeView === 'breakdown' && (
            <>
              {/* Category Breakdown Progress Bars */}
              <div
                style={{
                  background: '#0d0d0b',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Campaign Category Breakdown
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {CATEGORIES.map(cat => {
                    const amt = categoryTotals[cat.id] || 0;
                    const pct = totalExpenses > 0 ? ((amt / totalExpenses) * 100).toFixed(0) : 0;
                    return (
                      <div key={cat.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span>{cat.icon}</span>
                            <strong>{cat.short}:</strong>
                            <span style={{ color: 'var(--text-muted)' }}>{cat.label.replace(/^.*? /, '')}</span>
                          </span>
                          <span style={{ color: amt > 0 ? '#fff' : 'var(--text-muted)', fontWeight: 700 }}>
                            £{amt.toFixed(2)} ({pct}%)
                          </span>
                        </div>
                        <div style={{ height: '6px', background: '#1c1c1a', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: cat.color,
                              borderRadius: '3px',
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Committee Audit Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  Committee Audit Notes & Treasurer File References
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Sleigh fuel receipts stored in Treasurer drive; sweets discounted by local sponsor; PA horn repaired under guarantee."
                  style={{
                    width: '100%',
                    background: '#0d0d0b',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#fff',
                    fontSize: '13px',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </>
          )}
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
              if (window.confirm('Reset all operating expenses and logged receipts for this campaign to £0?')) {
                setItems([]);
                setNotes('');
              }
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ef4444',
              fontSize: '13px',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Clear All Receipts
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
              onClick={handleSaveAll}
              className="btn-primary"
              style={{
                padding: '9px 22px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CheckCircle2 size={16} />
              <span>Save & Tally (£{totalExpenses.toFixed(2)})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
