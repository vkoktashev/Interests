import React, { useEffect, useState } from "react";
import { CSVLink } from "react-csv";
import { FaAngleDown, FaAngleUp, FaStar, FaClock, FaArrowsAltV } from "react-icons/fa";
import { LuLetterText } from "react-icons/lu";
import Pagination from "rc-pagination";
import {useBem, useDispatch} from '@steroidsjs/core/hooks';

import ItemRow from "../ItemRow/ItemRow";
import useWindowDimensions from '../../../../../hooks/useWindowDimensions';

import "./item-block.scss";
import {DropDownField, Form, InputField} from '@steroidsjs/core/ui/form';
import {formChange} from '@steroidsjs/core/actions/form';

function ItemBlock({ items, statuses, fields, name, formId }) {
	const dispatch = useDispatch();
	const bem = useBem('item-block');
	const [formValues, setFormValues] = useState<any>({
		page: 1,
		pageSize: 25,
		query: '',
	});
	const [filteredItems, setFilteredItems] = useState([]);
	const [collapse, setCollapse] = useState(true);
	const { width } = useWindowDimensions();

	const toggleCollapse = () => {
		setCollapse(!collapse);
	};

	useEffect(
		() => {
			setFilteredItems(
				items
					?.filter((item) => item.name
						.toLowerCase()
						.includes(formValues.query?.toLowerCase()
						) && (formValues.statusFilters?.includes(item.status) || !formValues.statusFilters?.length))
					.sort((a, b) => {
						let field1, field2;
						if (formValues.sort?.type === "number") {
							field1 = parseFloat(a[formValues.sort?.field]);
							field2 = parseFloat(b[formValues.sort?.field]);
						} else {
							field1 = a[formValues.sort?.field];
							field2 = b[formValues.sort?.field];
						}

						if (field1 > field2) return formValues.sort.isAsc ? 1 : -1;
						if (field1 < field2) return formValues.sort.isAsc ? -1 : 1;
						return 0;
					})
			);
		},
		// eslint-disable-next-line
		[items, formValues]
	);

	return (
		<div className={bem.block()}>
			<Form
				formId={formId}
				onChange={setFormValues}
				onBeforeSubmit={() => false}
				initialValues={formValues}
				useRedux
			>
				<div className='item-block__header'>
					<div className={bem.element('row')}>
						<div className={bem.element('row')}>
							<InputField
								attribute="query"
								placeholder="Поиск"
								label={__('Поиск')}
								className={bem.element('input')}
							/>
							<button className="item-block__mobile-expand" onClick={toggleCollapse}>
								{collapse ? <FaAngleDown/> : <FaAngleUp/>}
							</button>
						</div>
						<DropDownField
							attribute="statusFilters"
							label={__('Статус')}
							items={statuses}
							multiple
							showReset
							className={bem.element('dropdown')}
							fieldLayoutClassName={bem.element('field-layout', {hidden: collapse && width <= 540})}
						/>
						<div className={bem.element('sort-buttons', {hidden: collapse && width <= 540})}>
							<button
								className="item-block__sort-button"
								hidden={!fields.some((field) => field.key === 'score')}
								onClick={() => {
									dispatch(formChange(formId, 'sort', {
										field: 'score',
										type: 'number',
										isAsc: !formValues.sort?.isAsc
									}));
								}}
							>
								<FaStar/> <FaArrowsAltV/>
							</button>
							<button
								className="item-block__sort-button"
								hidden={!fields.some((field) => field.key === 'spent_time')}
								onClick={() => {
									dispatch(formChange(formId, 'sort', {
										field: 'spent_time',
										type: 'number',
										isAsc: !formValues.sort?.isAsc
									}));
								}}>
								<FaClock/> <FaArrowsAltV/>
							</button>
							<button
								className="item-block__sort-button"
								hidden={!fields.some((field) => field.key === 'name')}
								onClick={() => {
									dispatch(formChange(formId, 'sort', {
										field: 'name',
										type: 'string',
										isAsc: !formValues.sort?.isAsc
									}));
								}}>
								<LuLetterText/> <FaArrowsAltV/>
							</button>
						</div>
					</div>
					<div className={bem.element('row', {hidden: collapse && width <= 515})}>
						<DropDownField
							attribute="pageSize"
							label={__('Записей на странице')}
							items={[5, 10, 25, 50, 100].map(item => ({id: item, label: item}))}
						/>
					</div>
				</div>
			</Form>
			<div className="item-block__rows">
				{
					filteredItems?.slice(
						(formValues.page - 1) * formValues.pageSize,
						formValues.page * formValues.pageSize,
					).map((item, counter) => (
						<ItemRow data={item} fields={fields} key={counter}/>
					))
				}
			</div>
			<div className="item-block__footer">
				<Pagination
					total={filteredItems?.length}
					pageSize={formValues.pageSize}
					onChange={(e) => {
						dispatch(formChange(formId, 'page', e));
					}}
					current={formValues.page}
				/>
				<CSVLink
					data={items ? items : []}
					headers={fields}
					separator=';'
					filename={`interests ${name}.csv`}
				>
					Скачать CSV
				</CSVLink>
			</div>
		</div>
	);
}

export default ItemBlock;
