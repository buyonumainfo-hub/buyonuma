import { useState, useMemo } from 'react';
import { NIGERIA_STATES, NIGERIA_CITIES_BY_STATE, WORLDWIDE } from '../../utils/nigeriaLocations';

/**
 * Paired state + city/town selector for Nigeria.
 *
 * - State is a fixed dropdown (validated on the backend against the same
 *   list) — includes a "Worldwide" option for sellers who ship/serve
 *   everywhere rather than one location (e.g. digital products,
 *   nationwide/international shipping). Their products always show up in
 *   buyer searches for a matching category regardless of the buyer's
 *   location filter — see the backend search routes for that logic.
 * - City is a datalist-backed text input: it suggests known
 *   towns/LGAs for the selected state, but still lets the seller type a
 *   town that isn't in our (necessarily incomplete) list, since Nigeria
 *   has thousands of towns/wards we can't fully enumerate. Hidden
 *   entirely when Worldwide is selected, since there's no single city to
 *   name.
 *
 * Props: state, city (current values), onChange(field, value)
 */
const LocationSelect = ({ state, city, onChange, required = true }) => {
  const cityOptions = useMemo(() => NIGERIA_CITIES_BY_STATE[state] || [], [state]);
  const datalistId = 'buyonuma-city-suggestions';
  const isWorldwide = state === WORLDWIDE;

  return (
    <div className="grid-2">
      <div className="form-group">
        <label className="form-label">State {required && '*'}</label>
        <select
        style={{background: 'white'}}
          className="form-control"
          required={required}
          value={state}
          onChange={(e) => {
            onChange('state', e.target.value);
            onChange('city', ''); // reset city when state changes — old city likely doesn't belong to new state
          }}
        >
          <option value="">Select your state</option>
          <option value={WORLDWIDE}>🌍 Nationwide (I ship/sell everywhere)</option>
          {NIGERIA_STATES.filter((s) => s !== WORLDWIDE).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
          
        </select>
      </div>
      {isWorldwide ? (
        <div className="form-group">

          <label className="form-label">City / Town</label>
          <div className="form-control" style={{ display: 'flex', alignItems: 'center', color: 'var(--ink-muted)', background: 'var(--cream)' }}>
            Not needed — your store ships/sells everywhere
          </div>
        </div>
      ) : (
        <div className="form-group">
          <label className="form-label">City / Town {required && '*'}</label>
         <select
         
        value={city}
        onChange={(e) => onChange('city', e.target.value)}
        className="form-control"
        style={{ width: 'auto' , background: 'white'}}
        disabled={!state}
      >
        <option value="">{state ? 'All LGAs / Cities' : 'Select a state first'}</option>
        {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
        </div>
      )}
    </div>
  );
};

export default LocationSelect;
