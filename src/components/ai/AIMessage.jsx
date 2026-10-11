function tokenFields(data) {
  const wrapper = data?.token?.token ? data.token : null;
  const details = wrapper?.token || data?.token;
  const metrics = wrapper || data;
  if (!details) return null;
  return {
    token: details.tokenCode || details.token_code || details.token_number,
    status: details.status,
    department: details.department || details.department_name,
    doctor: details.doctor || details.doctor_name,
    area: details.area || details.area_name,
    floor: details.floor || details.area_floor,
    counter: details.counter || details.counter_name,
    position: details.position ?? metrics.position,
    ahead: details.peopleAhead ?? metrics.peopleAhead,
    wait: details.estimatedWaitMinutes ?? metrics.estimatedWaitMinutes,
  };
}

export default function AIMessage({ item, onAction }) {
  const user = item.role === 'user';
  const fields = tokenFields(item);
  const messageText = item.text ?? item.message ?? '';
  return (
    <div className={`flex ${user ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[92%] rounded-2xl px-3.5 py-3 text-sm leading-relaxed ${
          user ? 'rounded-br-md text-white' : 'rounded-bl-md border bg-white'
        }`}
        style={user
          ? { backgroundColor: '#075A9F' }
          : { borderColor: '#E1EAF2', color: '#102A43' }}
      >
        {!user && <p className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#1599C5' }}>KIMS AI</p>}
        <p className="whitespace-pre-wrap break-words">{messageText}</p>

        {item.confirmation && (
          <div className="mt-3 rounded-xl border bg-slate-50 p-3 text-xs" style={{ borderColor: '#E1EAF2' }}>
            <p className="mb-2 font-bold text-sm" style={{ color: '#102A43' }}>Confirm token details</p>
            {[
              ['Department', item.confirmation.department],
              ['Service area', item.confirmation.area],
              ['Doctor', item.confirmation.doctor],
              ['Patient', item.confirmation.patientName],
              ['Mobile', item.confirmation.phoneMasked],
            ].map(([label, value]) => (
              <p key={label} className="flex justify-between gap-3 py-0.5">
                <span className="text-slate-500">{label}</span>
                <span className="text-right font-semibold text-slate-800">{value || '—'}</span>
              </p>
            ))}
            {item.confirmation.estimatedWaitMinutes != null && (
              <p className="mt-1 border-t pt-1 font-semibold" style={{ borderColor: '#E1EAF2' }}>
                Estimated wait: about {item.confirmation.estimatedWaitMinutes} minutes
              </p>
            )}
          </div>
        )}

        {fields && (
          <div className="mt-3 rounded-xl border bg-[#F5F9FC] p-3 text-xs" style={{ borderColor: '#E1EAF2' }}>
            <p className="mb-2 text-base font-extrabold" style={{ color: '#075A9F' }}>
              {fields.token ? `Token ${fields.token}` : 'Token details'}
            </p>
            {[
              ['Status', fields.status],
              ['Department', fields.department],
              ['Doctor', fields.doctor],
              ['Service area', [fields.area, fields.floor].filter(Boolean).join(' · ')],
              ['Counter', fields.counter],
              ['Queue position', fields.position],
              ['People ahead', fields.ahead],
              ['Estimated wait', fields.wait == null ? null : `~${fields.wait} min`],
            ].filter(([, value]) => value !== undefined && value !== null && value !== '')
              .map(([label, value]) => (
                <p key={label} className="flex justify-between gap-3 py-0.5">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-right font-semibold text-slate-800">{value}</span>
                </p>
              ))}
          </div>
        )}

        {item.whatsappNotification?.attempted && (
          <p className={`mt-2 text-xs font-semibold ${item.whatsappNotification.accepted ? 'text-emerald-700' : 'text-amber-700'}`}>
            {item.whatsappNotification.accepted
              ? `WhatsApp notification accepted (${item.whatsappNotification.status || 'queued'}).`
              : 'Your token is valid, but the WhatsApp notification was not accepted.'}
          </p>
        )}

        {!!item.actions?.length && (
          <div className="mt-3 flex flex-wrap gap-2">
            {item.actions.map((action, index) => action.type === 'CALL_EMERGENCY' ? (
              <a
                key={`${action.type}-${index}`}
                className="btn-emergency !px-3 !py-2 text-xs"
                href={`tel:${String(action.data?.phone || '108').replace(/[^\d+]/g, '')}`}
              >
                {action.label}
              </a>
            ) : (
              <button
                key={`${action.type}-${index}`}
                type="button"
                onClick={() => onAction(action)}
                className={action.type === 'CONFIRM_BOOKING'
                  ? 'btn-primary !px-3 !py-2 text-xs'
                  : 'btn-secondary !px-3 !py-2 text-xs'}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
        {item.error && <p className="mt-2 text-xs font-semibold text-rose-600">Your request was not submitted.</p>}
      </div>
    </div>
  );
}
