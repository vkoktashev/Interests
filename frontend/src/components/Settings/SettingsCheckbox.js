import React from "react";

function SettingsCheckbox({ text, checked, onChange }) {
	return (
		<div className='settingsRow' onClick={() => onChange(!checked)}>
			<input type='checkbox' className='settingsCheckbox' checked={checked} onChange={(event) => onChange(event.target.checked)} />
			{text}
		</div>
	);
}

export default SettingsCheckbox;
