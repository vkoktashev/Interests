import React, { useEffect, useState } from "react";
import { CSVLink } from "react-csv";
import InputNumber from "../../../Common/InputNumber/InputNumber";
import SelectMulti from "../../../Common/SelectMulti/SelectMulti";
import ItemRow from "../ItemRow/ItemRow";
import { MDBIcon } from "mdbreact";
import Pagination from "rc-pagination";
import useWindowDimensions from "../../../../hooks/useWindowDimensions";
import "./item-block.sass";

function ItemBlock({ items, statuses, fields, name }) {
	const [query, setQuery] = useState("");
	const [pageSize, setPageSize] = useState(10);
	const [page, setPage] = useState(1);
	const [filteredItems, setFilteresItems] = useState([]);
	const [sortIsAsc, setSortIsAsc] = useState(false);
	const [statusFilters, setStatusFilters] = useState([]);
	const [collapse, setCollapse] = useState(true);
	const { width } = useWindowDimensions();

	const toggleCollapse = () => {
		setCollapse(!collapse);
	};

	useEffect(
		() => {
			setFilteresItems(items?.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()) && (statusFilters.includes(item.status) || statusFilters.length < 1)));
		},
		// eslint-disable-next-line
		[items, page, pageSize, query, statusFilters]
	);

	function sortItems(field, isNumber) {
		let newItems = items
			?.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()) && (statusFilters.includes(item.status) || statusFilters.length < 1))
			.sort((a, b) => {
				if (isNumber ? parseFloat(a[field]) > parseFloat(b[field]) : a[field] > b[field]) {
					return sortIsAsc ? 1 : -1;
				}
				if (isNumber ? parseFloat(a[field]) < parseFloat(b[field]) : a[field] < b[field]) {
					return sortIsAsc ? -1 : 1;
				}
				return 0;
			});
		setFilteresItems(newItems);
	}

	return (
		<div className='item-block'>
			<div className='item-block__header'>
				<div className='item-block__header-left'>
					<div className='item-block__header-first-row'>
						<input
							type='text'
							placeholder='Поиск'
							aria-label='Поиск'
							className='item-block__search-input'
							value={query}
							onChange={(event) => {
								setQuery(event.target.value);
							}}
						/>
						<button className='item-block__mobile-expand' onClick={toggleCollapse}>
							{collapse ? <MDBIcon icon='angle-down' /> : <MDBIcon icon='angle-up' />}
						</button>
					</div>
					<div className='item-block__sort-buttons' hidden={collapse && width <= 515}>
						<button
							className='item-block__sort-button'
							hidden={fields.find((field) => field.key === "score") === undefined}
							onClick={() => {
								sortItems("score", true);
								setSortIsAsc(!sortIsAsc);
							}}>
							<MDBIcon icon='star' /> <MDBIcon icon='arrows-alt-v' />
						</button>
						<button
							className='item-block__sort-button'
							hidden={fields.find((field) => field.key === "spent_time") === undefined}
							onClick={() => {
								sortItems("spent_time", true);
								setSortIsAsc(!sortIsAsc);
							}}>
							<MDBIcon icon='clock' /> <MDBIcon icon='arrows-alt-v' />
						</button>
					</div>
					<SelectMulti
						hidden={collapse && width <= 515}
						placeholder={"Cтатус"}
						onChange={(e) => {
							setStatusFilters(e.map((obj) => obj.value));
						}}
						options={statuses}
					/>
				</div>

				<div className='item-block__header-right' hidden={collapse && width <= 515}>
					<label className='item-block__label'>Записей на странице</label>
					<InputNumber value={pageSize} max={100} min={1} onChange={(value) => setPageSize(value)} dataList={[5, 10, 25, 50, 100]} />
				</div>
			</div>
			<div className='item-block__rows'>
				{filteredItems?.slice((page - 1) * pageSize, page * pageSize).map((item, counter) => (
					<ItemRow data={item} fields={fields} key={counter} />
				))}
			</div>
			<div className='item-block__footer'>
				<Pagination
					total={filteredItems?.length}
					pageSize={pageSize}
					onChange={(e) => {
						setPage(e);
					}}
					current={page}
				/>
				<CSVLink data={items ? items : []} headers={fields} separator={";"} filename={`interests ${name}.csv`}>
					Скачать CSV
				</CSVLink>
			</div>
		</div>
	);
}

export default ItemBlock;
