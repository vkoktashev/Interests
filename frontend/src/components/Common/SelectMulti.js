import React from "react";
import Select from "react-select";

function SelectMulti({ placeholder, options, onChange, hidden }) {
	return hidden ? "" : <Select className='react-select-container' classNamePrefix={"multiselect"} isMulti={true} placeholder={placeholder} onChange={onChange} options={options} hidden={hidden} />;
}

export default SelectMulti;
