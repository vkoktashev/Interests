import React, { useEffect, useState } from "react";
import InputNumber from "../../Common/InputNumber";
import SelectMulti from "../../Common/SelectMulti";
import ItemRow from "./ItemRow";
import { MDBIcon } from "mdbreact";
import Pagination from "rc-pagination";
import useWindowDimensions from "../../../hooks/useWindowDimensions";

function ItemBlock({ items, statuses, fields }) {
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
		<div>
			<div className='itemRowsHeader'>
				<div className='itemRowsHeaderLeft'>
					<div>
						<input
							type='text'
							placeholder='Поиск'
							aria-label='Поиск'
							id='searchUserItemsInput'
							value={query}
							onChange={(event) => {
								setQuery(event.target.value);
							}}
						/>
						<button className='mobileOpenButton' onClick={toggleCollapse}>
							{collapse ? <MDBIcon icon='angle-down' /> : <MDBIcon icon='angle-up' />}
						</button>
					</div>
					<div className='sortButtons' hidden={collapse && width <= 515}>
						<button
							className='sortRowsButton'
							hidden={!fields.includes("score")}
							onClick={() => {
								sortItems("score", true);
								setSortIsAsc(!sortIsAsc);
							}}>
							<MDBIcon icon='star' /> <MDBIcon icon='arrows-alt-v' />
						</button>
						<button
							className='sortRowsButton'
							hidden={!fields.includes("spent_time")}
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

				<div className='itemRowsHeaderRight' hidden={collapse && width <= 515}>
					Записей на странице
					<InputNumber value={pageSize} max={100} min={1} onChange={(value) => setPageSize(value)} />
				</div>
			</div>
			<div className='itemRows'>
				{filteredItems?.slice((page - 1) * pageSize, page * pageSize).map((item) => (
					<ItemRow data={item} fields={fields} />
				))}
			</div>
			<div className='itemRowsFooter'>
				<Pagination
					total={filteredItems?.length}
					pageSize={pageSize}
					onChange={(e) => {
						setPage(e);
					}}
					defaultCurrent={1}
				/>
				<div></div>
			</div>
		</div>
	);
}

export default ItemBlock;
