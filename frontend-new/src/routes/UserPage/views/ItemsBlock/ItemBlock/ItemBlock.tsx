import React, {useMemo, useRef, useState} from "react";
import { CSVLink } from "react-csv";
import { FaAngleDown, FaAngleUp, FaStar, FaClock, FaArrowsAltV, FaArrowDown, FaArrowUp } from "react-icons/fa";
import { LuLetterText } from "react-icons/lu";
import {useBem} from '@steroidsjs/core/hooks';
import Pagination from '@steroidsjs/core/ui/list/Pagination/Pagination';
import {useQueryParams} from 'use-query-params';

import ItemRow from "../ItemRow/ItemRow";
import useWindowDimensions from '../../../../../hooks/useWindowDimensions';
import {DEFAULT_PAGE_SIZE, LIST_QUERY_PARAMS, PAGE_SIZES} from '../listQuery';

import "./item-block.scss";
import {DropDownField, InputField} from '@steroidsjs/core/ui/form';

const SORT_OPTIONS = [
	{field: 'score', type: 'number', isDescFirst: true, icon: <FaStar/>, title: 'Сортировать по оценке'},
	{field: 'spent_time', type: 'number', isDescFirst: true, icon: <FaClock/>, title: 'Сортировать по времени'},
	{field: 'name', type: 'string', isDescFirst: false, icon: <LuLetterText/>, title: 'Сортировать по названию'},
];

function ItemBlock({ items, statuses, fields, name }) {
	const bem = useBem('item-block');
	const rowsRef = useRef<HTMLDivElement | null>(null);
	const [collapse, setCollapse] = useState(true);
	const { width } = useWindowDimensions();
	const [urlQuery, setUrlQuery] = useQueryParams(LIST_QUERY_PARAMS);

	const statusFilters = useMemo(
		() => (urlQuery.status || []).filter(status => statuses.some(item => item.id === status)),
		[urlQuery.status, statuses],
	);
	const query = urlQuery.q || '';
	const pageSize = PAGE_SIZES.includes(urlQuery.size) ? urlQuery.size : DEFAULT_PAGE_SIZE;
	const page = urlQuery.page > 0 ? urlQuery.page : 1;
	const sortOptions = SORT_OPTIONS.filter(option => fields.some(field => field.key === option.field));
	const sortField = urlQuery.sort?.replace(/^-/, '');
	const sortOption = sortOptions.find(option => option.field === sortField);
	const sort = sortOption
		? {field: sortOption.field, type: sortOption.type, isAsc: !urlQuery.sort.startsWith('-')}
		: null;

	const toggleCollapse = () => {
		setCollapse(!collapse);
	};

	const filteredItems = useMemo(() => {
		const statusLabels = statuses
			.filter(status => statusFilters.includes(status.id))
			.map(status => status.label);
		const normalizedQuery = query.toLowerCase();

		return (items || [])
			.filter(item => item.name.toLowerCase().includes(normalizedQuery)
				&& (!statusLabels.length || statusLabels.includes(item.status)))
			.sort((a, b) => {
				if (!sort) {
					return 0;
				}
				let field1, field2;
				if (sort.type === "number") {
					field1 = parseFloat(a[sort.field]);
					field2 = parseFloat(b[sort.field]);
				} else {
					field1 = a[sort.field];
					field2 = b[sort.field];
				}

				if (field1 > field2) return sort.isAsc ? 1 : -1;
				if (field1 < field2) return sort.isAsc ? -1 : 1;
				return 0;
			});
	}, [items, statuses, statusFilters, query, sort?.field, sort?.type, sort?.isAsc]);

	const toggleSort = (option: typeof SORT_OPTIONS[number]) => {
		const firstSort = option.isDescFirst ? `-${option.field}` : option.field;
		const secondSort = option.isDescFirst ? option.field : `-${option.field}`;
		let nextSort = firstSort;
		if (sort?.field === option.field) {
			nextSort = urlQuery.sort === firstSort ? secondSort : undefined;
		}
		setUrlQuery({sort: nextSort}, 'replaceIn');
	};

	const renderSortIcon = (field: string) => {
		if (sort?.field !== field) {
			return <FaArrowsAltV/>;
		}
		return sort.isAsc ? <FaArrowUp/> : <FaArrowDown/>;
	};

	return (
		<div className={bem.block()}>
			<div>
				<div className='item-block__header'>
					<div className={bem.element('row')}>
						<div className={bem.element('row')}>
							<InputField
								value={query}
								onChange={value => setUrlQuery({q: value || undefined, page: undefined}, 'replaceIn')}
								placeholder="Поиск"
								label={__('Поиск')}
								className={bem.element('input')}
							/>
							<button className="item-block__mobile-expand" onClick={toggleCollapse}>
								{collapse ? <FaAngleDown/> : <FaAngleUp/>}
							</button>
						</div>
						<DropDownField
							value={statusFilters}
							onChange={value => setUrlQuery({
								status: Array.isArray(value) ? value : [],
								page: undefined,
							}, 'replaceIn')}
							label={__('Статус')}
							items={statuses}
							multiple
							showReset
							className={bem.element('dropdown')}
							fieldLayoutClassName={bem.element('field-layout', {hidden: collapse && width <= 540})}
						/>
						<div className={bem.element('sort-buttons', {hidden: collapse && width <= 540})}>
							{sortOptions.map(option => (
								<button
									key={option.field}
									type='button'
									className={bem.element('sort-button', {active: sort?.field === option.field})}
									title={option.title}
									aria-pressed={sort?.field === option.field}
									onClick={() => toggleSort(option)}
								>
									{option.icon} {renderSortIcon(option.field)}
								</button>
							))}
						</div>
					</div>
					<div className={bem.element('row', {hidden: collapse && width <= 515})}>
						<DropDownField
							value={pageSize}
							onChange={value => setUrlQuery({
								size: value && value !== DEFAULT_PAGE_SIZE ? value : undefined,
								page: undefined,
							}, 'replaceIn')}
							label={__('Записей на странице')}
							items={PAGE_SIZES.map(item => ({id: item, label: item}))}
						/>
					</div>
				</div>
			</div>
			<div ref={rowsRef} className="item-block__rows">
				{
					filteredItems.slice(
						(page - 1) * pageSize,
						page * pageSize,
					).map(item => (
						<ItemRow data={item} fields={fields} key={item.key}/>
					))
				}
			</div>
			<div className="item-block__footer">
				<Pagination
					showSteps
					aroundCount={3}
					list={{
						total: filteredItems.length,
						page,
						pageSize,
					}}
					onChange={nextPage => {
						setUrlQuery({page: nextPage > 1 ? nextPage : undefined}, 'pushIn');
						rowsRef.current?.scrollIntoView({
							behavior: 'smooth',
							block: 'start',
						});
					}}
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
