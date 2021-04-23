import React from "react";
import Select from "react-select";

function SelectMulti({ placeholder, options, onChange, hidden }) {
	/*const customStyles = {
		container: (provided, state) => ({
			...provided,
			width: "200px",
			color: "#F1F1FB",
			background: "#3F4041",
		}),
		menu: (provided, state) => ({
			...provided,
			width: "100%",
			borderBottom: "1px dotted pink",
			color: state.selectProps.menuColor,
			background: state.selectProps.menuBackground,
		}),
		control: (provided, state) => ({
			...provided,
			color: state.isSelected ? "red" : "blue",
		}),
	};*/

	return hidden ? (
		""
	) : (
		<Select
			className='react-select-container'
			classNamePrefix={"multiselect"}
			isMulti={true}
			placeholder={placeholder}
			onChange={onChange}
			options={options.map((option) => {
				return { value: option, label: option };
			})}
			hidden={hidden}
		/>
	);
}

export default SelectMulti;
