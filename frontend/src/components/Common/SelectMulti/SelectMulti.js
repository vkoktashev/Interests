import React from "react";
import Select from "react-select";
import "./select-multi.sass";

function SelectMulti({ placeholder, options, onChange, hidden }) {
	if (hidden) return "";
	else return <Select className='react-select-container' classNamePrefix={"multiselect"} isMulti={true} placeholder={placeholder} onChange={onChange} options={options} hidden={hidden} />;
}

export default SelectMulti;
