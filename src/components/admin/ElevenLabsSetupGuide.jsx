import React from 'react';

export default function ElevenLabsSetupGuide({
  townName,
  currentSlug,
  sampleFirstMsg,
  samplePrompt,
  sampleKb,
  copiedGuideField,
  copyText
}) {
  return (
    <div style={{
      marginTop: '16px',
      padding: '16px',
      background: '#0f0f0e',
      borderRadius: '8px',
      border: '1px solid rgba(251, 175, 51, 0.3)',
      color: '#e5e7eb',
      fontSize: '12px',
      lineHeight: 1.6
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '16px' }}>🎄</span>
        <strong style={{ fontSize: '14px', color: '#fff' }}>How to Replicate TurboSanta in ElevenLabs for {townName}</strong>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
        Follow these simple steps in your ElevenLabs account (<a href="https://elevenlabs.io/app/conversational-ai" target="_blank" rel="noreferrer" style={{ color: '#FBAF33' }}>elevenlabs.io/app/conversational-ai</a>) to create a matching Santa Claus AI agent for {townName}.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ background: '#191917', padding: '12px', borderRadius: '6px', border: '1px solid #27272a' }}>
          <strong style={{ color: '#FBAF33' }}>Step 1: Create a New Agent</strong>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)' }}>
            Click <strong>Create Agent</strong> in ElevenLabs. Set the name to <code>TurboSanta ({townName})</code>.
          </p>
        </div>

        <div style={{ background: '#191917', padding: '12px', borderRadius: '6px', border: '1px solid #27272a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <strong style={{ color: '#FBAF33' }}>Step 2: Upload Santa Face Icon</strong>
            <a
              href="/icons/santa-avatar.png"
              download="santa-avatar.png"
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: '11px',
                color: '#FBAF33',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(251, 175, 51, 0.15)',
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(251, 175, 51, 0.4)'
              }}
            >
              <i className="fa-solid fa-download"></i> Download Santa Face Image
            </a>
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)' }}>
            Click on the round avatar circle on top of the agent settings and upload the Santa face icon.
          </p>
        </div>

        <div style={{ background: '#191917', padding: '12px', borderRadius: '6px', border: '1px solid #27272a' }}>
          <strong style={{ color: '#FBAF33' }}>Step 3: Voice & Model Settings</strong>
          <ul style={{ margin: '6px 0 0 16px', padding: 0, color: 'var(--text-muted)' }}>
            <li><strong>Voice Mode:</strong> <code>Realtime</code></li>
            <li><strong>Voice:</strong> Search Voice Library for <code>Father Christmas - Magical & Deep</code> (Voice ID: <code>1wg2wOjdEWKA7yQD8Kca</code>)</li>
            <li><strong>Language:</strong> <code>English</code> (Default)</li>
            <li><strong>Model:</strong> <code>Eleven Realtime v1 Max</code></li>
          </ul>
        </div>

        <div style={{ background: '#191917', padding: '12px', borderRadius: '6px', border: '1px solid #27272a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <strong style={{ color: '#FBAF33' }}>Step 4: First Message</strong>
            <button
              type="button"
              onClick={() => copyText(sampleFirstMsg, 'firstMsg')}
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                background: copiedGuideField === 'firstMsg' ? '#16a34a' : '#27272a',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {copiedGuideField === 'firstMsg' ? '✓ Copied!' : 'Copy First Message'}
            </button>
          </div>
          <div style={{ background: '#000', padding: '8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px', color: '#93c5fd' }}>
            {sampleFirstMsg}
          </div>
        </div>

        <div style={{ background: '#191917', padding: '12px', borderRadius: '6px', border: '1px solid #27272a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <strong style={{ color: '#FBAF33' }}>Step 5: System Prompt</strong>
            <button
              type="button"
              onClick={() => copyText(samplePrompt, 'prompt')}
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                background: copiedGuideField === 'prompt' ? '#16a34a' : '#27272a',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {copiedGuideField === 'prompt' ? '✓ Copied Prompt!' : 'Copy System Prompt'}
            </button>
          </div>
          <textarea
            readOnly
            value={samplePrompt}
            rows={6}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: '#000',
              border: '1px solid #27272a',
              borderRadius: '4px',
              padding: '8px',
              color: '#cbd5e1',
              fontSize: '11px',
              fontFamily: 'monospace'
            }}
          />
          <p style={{ margin: '8px 0 0 0', color: 'var(--text-muted)', fontSize: '11px' }}>
            <strong style={{ color: '#93c5fd' }}>Important:</strong> In ElevenLabs, right below the System Prompt, open <strong>Dynamic Variables</strong> and click <strong>+ Add Variable</strong>. Name it <code>route_info</code> with a blank default value. The tracker automatically passes your full route schedule and streets directly into this variable during every call.
          </p>
        </div>

        <div style={{ background: '#191917', padding: '12px', borderRadius: '6px', border: '1px solid #27272a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <strong style={{ color: '#FBAF33' }}>Step 6: Knowledge Base</strong>
            <button
              type="button"
              onClick={() => copyText(sampleKb, 'kb')}
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                background: copiedGuideField === 'kb' ? '#16a34a' : '#27272a',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {copiedGuideField === 'kb' ? '✓ Copied Knowledge!' : 'Copy Knowledge Base'}
            </button>
          </div>
          <p style={{ margin: '0 0 6px 0', color: 'var(--text-muted)' }}>
            In ElevenLabs, click <strong>Knowledge Base</strong>, create a new document named <code>Santa Knowledge</code> with Text Content, and paste this text:
          </p>
          <textarea
            readOnly
            value={sampleKb}
            rows={4}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: '#000',
              border: '1px solid #27272a',
              borderRadius: '4px',
              padding: '8px',
              color: '#cbd5e1',
              fontSize: '11px',
              fontFamily: 'monospace'
            }}
          />
        </div>

        <div style={{ background: '#191917', padding: '12px', borderRadius: '6px', border: '1px solid #27272a' }}>
          <strong style={{ color: '#FBAF33' }}>Step 7: Conversational Behavior & Timeouts</strong>
          <p style={{ margin: '4px 0 6px 0', color: 'var(--text-muted)' }}>
            Go to <strong>Settings → Advanced</strong> in your agent:
          </p>
          <ul style={{ margin: '0 0 0 16px', padding: 0, color: 'var(--text-muted)' }}>
            <li><strong>Turn model:</strong> <code>Turn V3</code></li>
            <li><strong>Take turn after silence:</strong> <code>7</code> Seconds</li>
            <li><strong>End conversation after silence:</strong> <code>15</code> Seconds</li>
            <li><strong>Max conversation duration:</strong> <code>180</code> Seconds (3 minutes)</li>
            <li><strong>Speculative turn:</strong> <code>ON</code></li>
            <li><strong>Store Call Audio:</strong> <code>OFF</code> (keeps children&apos;s privacy protected)</li>
          </ul>
        </div>

        <div style={{ background: '#191917', padding: '12px', borderRadius: '6px', border: '1px solid #27272a' }}>
          <strong style={{ color: '#FBAF33' }}>Step 8: Security Allowlist (Crucial!)</strong>
          <p style={{ margin: '4px 0 6px 0', color: 'var(--text-muted)' }}>
            Go to <strong>Settings → Security</strong> in your agent. Under <strong>Allowlist</strong>, add these hostnames:
          </p>
          <div style={{ background: '#000', padding: '8px 12px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px', color: '#86efac' }}>
            roundtablesantasleigh.co.uk<br />
            {currentSlug}.roundtablesantasleigh.co.uk<br />
            turbosanta-app.pages.dev
          </div>
          <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)' }}>
            Enable <strong>Fail when Origin header is missing</strong>: <code>ON</code>. Under Overrides, enable <strong>Text only</strong>: <code>ON</code>.
          </p>
        </div>

        <div style={{ background: '#191917', padding: '12px', borderRadius: '6px', border: '1px solid #27272a' }}>
          <strong style={{ color: '#FBAF33' }}>Step 9: Copy Agent ID & Save</strong>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)' }}>
            Look at the top of your agent page or URL in ElevenLabs to find your <strong>Agent ID</strong> (e.g. <code>agent_...</code>). Copy it, paste it into the <strong>ElevenLabs Agent ID</strong> box above, and click <strong>Save Sleigh Settings</strong>!
          </p>
        </div>
      </div>
    </div>
  );
}
